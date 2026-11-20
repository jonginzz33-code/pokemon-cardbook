#!/usr/bin/env node
// 일본 공식 카드 검색(www.pokemon-card.com)으로 src/data/editions/ja.json 을 만듭니다.
//
// 1) 검색 결과 JSON(card-search/resultAPI.php, 모든 레귤레이션)을 끝까지 넘겨 카드 ID · 이름 · 세트 폴더(이미지 경로)를 모아요.
// 2) 카드마다 상세 페이지(card-search/details.php/card/{ID}/regu/all)에서 번호(038/100) · 세트 코드 · 레어도 · 종류 · 타입 · 수록 상품을 읽어요.
// 3) 공식 사이트에 없는 옛날 시리즈(DP 이전: PMCG · neo · VS · web · e · ADV · PCG)는 기존 TCGdex 데이터를 그대로 붙여요.
//
// 천천히 받아요 (동시에 WORKERS 개, 요청마다 DELAY_MS 쉼). 받은 카드는 .cache/jp-official/ 에 남아 다시 돌리면 이어서 받아요.
// 사용법: NODE_USE_ENV_PROXY=1 node scripts/fetch-jp-official.mjs   (목록 새로 받기: --relist)

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'data', 'editions', 'ja.json');
const CACHE = join(ROOT, '.cache', 'jp-official');
const LIST = join(CACHE, 'list.json');
const CARDS = join(CACHE, 'cards');
const BASE = 'https://www.pokemon-card.com/card-search/';
const WORKERS = Number(process.env.WORKERS) || 6;
const DELAY_MS = 250;
const OLD_TCGDEX_SERIES = ['PMCG', 'neo', 'VS', 'web', 'e', 'ADV', 'PCG'];
const UA = { 'User-Agent': 'Mozilla/5.0 (cardbook data builder)' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(String(res.status));
      return await res.text();
    } catch (e) {
      if (i === 3) throw new Error(`${url}: ${e.message}`);
      await sleep(1500 * 2 ** i);
    }
  }
}

async function pool(items, fn) {
  let next = 0;
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
        await sleep(DELAY_MS);
      }
    }),
  );
}

async function getList() {
  if (existsSync(LIST) && !process.argv.includes('--relist')) return JSON.parse(await readFile(LIST, 'utf8'));
  const page = async (p) => JSON.parse(await fetchText(`${BASE}resultAPI.php?regulation_sidebar_form=all&page=${p}`));
  const first = await page(1);
  const pages = [first];
  const rest = Array.from({ length: first.maxPage - 1 }, (_, i) => i + 2);
  await pool(rest, async (p) => pages.push(await page(p)));
  const cards = pages
    .flatMap((d) => d.cardList)
    .map((c) => ({
      cardID: c.cardID,
      name: c.cardNameViewText,
      folder: /\/large\/([^/]+)\//.exec(c.cardThumbFile)?.[1] ?? '',
    }));
  await writeFile(LIST, JSON.stringify(cards));
  console.log(`목록 ${cards.length}장`);
  return cards;
}

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const TYPE = {
  grass: 'grass',
  fire: 'fire',
  water: 'water',
  electric: 'lightning',
  lightning: 'lightning',
  psychic: 'psychic',
  fighting: 'fighting',
  dark: 'darkness',
  darkness: 'darkness',
  steel: 'metal',
  metal: 'metal',
  dragon: 'dragon',
  fairy: 'fairy',
  none: 'colorless',
  colorless: 'colorless',
};

function parse(id, html) {
  const name = /class="Heading1[^"]*">([^<]*)</.exec(html)?.[1];
  const sub = /class="subtext[^"]*">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
  const code = /class="img-regulation" alt="([^"]*)"/.exec(sub)?.[1];
  const num = /(\S+)\s*\/\s*(\S+)/.exec(decode(sub.replace(/<[^>]+>/g, ' ')));
  const rarity = /rarity\/ic_rare_([a-z0-9]+?)(?:_c)?\.gif/i.exec(sub)?.[1]?.toUpperCase();
  const kind = /<span class="type">([^<]*)</.exec(html)?.[1]?.trim() ?? '';
  const type = /hp-type[\s\S]{0,300}?icon-([a-z]+) icon/.exec(html)?.[1];
  const product = /class="List_item"><a [^>]*>([^<]*)</.exec(html)?.[1];
  const card = { id: `J${id}`, number: num ? num[1] : '', name: decode(name ?? '') };
  if (/たね|進化|BREAK|レベルアップ|V-UNION|VMAX|VSTAR|ex|GX|LEGEND|復元/.test(kind)) card.category = 'pokemon';
  else if (/エネルギー/.test(kind)) card.category = 'energy';
  else if (kind) card.category = 'trainer';
  if (card.category === 'pokemon' && type && TYPE[type]) card.type = TYPE[type];
  if (rarity) card.rarity = rarity;
  return {
    card,
    total: num && /^\d+$/.test(num[2]) ? Number(num[2]) : undefined,
    code: code || undefined,
    product: product ? decode(product) : undefined,
  };
}

const mostCommon = (arr) => {
  const m = new Map();
  for (const v of arr) if (v !== undefined && v !== '') m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
};

function seriesOf(code, name) {
  const c = code ?? '';
  if (/プロモ/.test(name) || /(^|-)P$|P$/.test(c)) return ['promo', 'プロモカード'];
  if (/^M/.test(c) || /MEGA/.test(name)) return ['mega', 'MEGA'];
  if (/^SV/i.test(c) || /スカーレット|バイオレット/.test(name)) return ['sv', 'スカーレット&バイオレット'];
  if (/^S/i.test(c) && !/^SM/i.test(c)) return ['swsh', 'ソード&シールド'];
  if (/^SM/i.test(c) || /サン＆ムーン|サン&ムーン/.test(name)) return ['sm', 'サン&ムーン'];
  if (/^XY|^CP/i.test(c) || /XY/.test(name)) return ['xy', 'XY'];
  if (/^BW/i.test(c) || /BW/.test(name)) return ['bw', 'BW'];
  if (/^L\d|^LL/i.test(c)) return ['legend', 'LEGEND'];
  if (/^DP/i.test(c)) return ['dp', 'DP'];
  return ['etc', 'その他'];
}

async function main() {
  await mkdir(CARDS, { recursive: true });
  const list = await getList();

  // 상세 페이지 (캐시 없는 것만)
  const todo = list.filter((c) => !existsSync(join(CARDS, `${c.cardID}.json`)));
  console.log(`상세 페이지: 받을 것 ${todo.length} / 전체 ${list.length}`);
  let done = 0;
  await pool(todo, async (c) => {
    const html = await fetchText(`${BASE}details.php/card/${c.cardID}/regu/all`);
    const r = html ? parse(c.cardID, html) : null;
    await writeFile(join(CARDS, `${c.cardID}.json`), JSON.stringify(r));
    if (++done % 500 === 0) console.log(`  ${done} / ${todo.length}`);
  });

  // 세트로 묶기 (이미지 폴더 = 세트)
  const bySet = new Map();
  for (const c of list) {
    const r = JSON.parse(await readFile(join(CARDS, `${c.cardID}.json`), 'utf8'));
    if (!r) continue;
    if (!r.card.name) r.card.name = c.name;
    const key = c.folder || r.code || 'etc';
    if (!bySet.has(key)) bySet.set(key, []);
    bySet.get(key).push({ ...r, cardID: Number(c.cardID) });
  }
  const sets = [...bySet.entries()].map(([key, items]) => {
    items.sort((a, b) => a.card.number.localeCompare(b.card.number, 'en', { numeric: true }) || a.cardID - b.cardID);
    const code = mostCommon(items.map((i) => i.code)) ?? key;
    const total = mostCommon(items.map((i) => i.total));
    return {
      id: `JP-${key}`,
      name: mostCommon(items.map((i) => i.product)) ?? key,
      code,
      ...(total ? { officialCount: total } : {}),
      newest: Math.max(...items.map((i) => i.cardID)),
      cards: items.map((i) => i.card),
    };
  });
  sets.sort((a, b) => b.newest - a.newest);

  const series = new Map();
  for (const set of sets) {
    const [sid, sname] = seriesOf(set.code, set.name);
    delete set.newest;
    if (!series.has(sid)) series.set(sid, { id: sid, name: sname, sets: [] });
    series.get(sid).sets.push(set);
  }
  const ordered = [...series.values()].sort((a, b) => (a.id === 'promo') - (b.id === 'promo'));

  // 옛날 시리즈는 TCGdex 그대로
  let old = [];
  try {
    const prev = JSON.parse(await readFile(OUT, 'utf8'));
    old = prev.series.filter((s) => OLD_TCGDEX_SERIES.includes(s.id));
  } catch {}

  const data = {
    edition: 'ja',
    updatedAt: new Date().toISOString().slice(0, 10),
    source: 'ポケモンカードゲーム公式 カード検索 (www.pokemon-card.com) + 옛날 시리즈는 TCGdex',
    series: [...ordered, ...old],
  };
  await writeFile(OUT, JSON.stringify(data) + '\n');
  const n = data.series.reduce((t, s) => t + s.sets.reduce((m, x) => m + x.cards.length, 0), 0);
  console.log(`완료: 시리즈 ${data.series.length}개, 세트 ${data.series.reduce((t, s) => t + s.sets.length, 0)}개, 카드 ${n}장 → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
