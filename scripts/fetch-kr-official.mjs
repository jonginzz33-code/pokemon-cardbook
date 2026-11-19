#!/usr/bin/env node
// 포켓몬코리아 공식 카드 검색(pokemoncard.co.kr)의 카드 상세 페이지를 읽어
// src/data/editions/ko.json (한국판 전체 목록)을 만듭니다.
//
// - 상세 주소: /cards/detail/BS{연도}{세트 3자리}{카드 3자리}  예) BS2026006013
//   없는 번호는 500 이 와요. 세트 안에서 연속으로 비면 그 세트 끝, 세트가 연속으로 비면 그 연도 끝.
// - 사이트에 부담을 주지 않도록 천천히 받아요 (동시에 WORKERS 개, 요청마다 DELAY_MS 쉼).
// - 받은 세트는 .cache/kr-official/ 에 저장해서, 다시 돌리면 이어서 받아요 (최근 2년 세트는 새 카드가 있을 수 있어 다시 받음).
// - 카드 이미지는 받지 않아요. 이름 · 번호 · 세트 · 타입 · 종류만.
//
// 사용법: node scripts/fetch-kr-official.mjs [시작연도] [끝연도]
// (이 작업 환경에서는 NODE_USE_ENV_PROXY=1 로 실행)

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'data', 'editions', 'ko.json');
const CACHE = join(ROOT, '.cache', 'kr-official');
const BASE = 'https://pokemoncard.co.kr/cards/detail/';
const WORKERS = Number(process.env.WORKERS) || 6;
const DELAY_MS = 250;
const NOW_YEAR = new Date().getFullYear();
const FROM = Number(process.argv[2]) || 2010;
const TO = Number(process.argv[3]) || NOW_YEAR + 1;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pad3 = (n) => String(n).padStart(3, '0');

const decode1 = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
const decode = (s) => decode1(decode1(s));

const TYPE_KO = {
  풀: 'grass',
  불꽃: 'fire',
  물: 'water',
  번개: 'lightning',
  초: 'psychic',
  격투: 'fighting',
  악: 'darkness',
  강철: 'metal',
  드래곤: 'dragon',
  페어리: 'fairy',
  무색: 'colorless',
};

/** 상세 페이지 하나 → 카드 정보 (없으면 null) */
async function fetchCard(id) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(BASE + id, { headers: { 'User-Agent': 'Mozilla/5.0 (cardbook data builder)' } });
      if (res.status === 500 || res.status === 404) return null;
      if (!res.ok) throw new Error(String(res.status));
      return parse(id, await res.text());
    } catch (e) {
      if (i === 3) throw new Error(`${id}: ${e.message}`);
      await sleep(1500 * 2 ** i);
    }
  }
}

function parse(id, html) {
  const pnum = /class="p_num">\s*([^<]*)/.exec(html)?.[1]?.trim();
  const name = /card-hp title">([^<]*)/.exec(html)?.[1];
  if (!pnum && !name) return null;
  const pre = /pre_info_wrap">([\s\S]*?)<span/.exec(html)?.[1] ?? '';
  const symbols = [...pre.matchAll(/symbol\/([^".\/]+)\.png/g)].map((m) => m[1]);
  const product = /class="search_href">([^<]*)</.exec(html)?.[1];
  const kind = /카드 종류\s*:\s*([^<]*)/.exec(html)?.[1]?.trim() ?? '';
  const typeName = /hp_num[\s\S]{0,400}?class="type_b"[^>]*title="([^"]+)"/.exec(html)?.[1];

  const [number, total] = (pnum ?? '').split('/').map((s) => s.trim());
  const card = { id, number: number || id.slice(-3), name: decode(name ?? '') };
  if (/포켓몬/.test(kind) && !/도구/.test(kind)) card.category = 'pokemon';
  else if (/에너지/.test(kind)) card.category = 'energy';
  else if (kind) card.category = 'trainer';
  if (typeName && TYPE_KO[typeName]) card.type = TYPE_KO[typeName];
  return {
    card,
    total: total && /^\d+$/.test(total) ? Number(total) : undefined,
    code: symbols[0],
    product: product ? decode(product) : undefined,
  };
}

/** 세트 하나 (연도 + 세트 번호) 전부 받기 */
async function fetchSet(year, seq) {
  const key = `${year}${pad3(seq)}`;
  const cacheFile = join(CACHE, `${key}.json`);
  // 이미 받은 세트는 캐시에서. 최근 2년 세트는 하루 지나면 새 카드가 있을 수 있어 다시 받음.
  try {
    const st = await stat(cacheFile);
    if (year < NOW_YEAR - 1 || Date.now() - st.mtimeMs < 86400000) return JSON.parse(await readFile(cacheFile, 'utf8'));
  } catch {}
  const items = [];
  let miss = 0;
  for (let n = 1; n <= 999 && miss < 6; n++) {
    const r = await fetchCard(`BS${key}${pad3(n)}`);
    await sleep(DELAY_MS);
    if (!r) {
      miss++;
      continue;
    }
    miss = 0;
    items.push(r);
  }
  const set = items.length ? summarize(key, items) : null;
  await writeFile(cacheFile, JSON.stringify(set));
  return set;
}

const mostCommon = (arr) => {
  const m = new Map();
  for (const v of arr) if (v !== undefined) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
};

function summarize(key, items) {
  const code = mostCommon(items.map((i) => i.code));
  const set = {
    id: `kr${key}`,
    name: mostCommon(items.map((i) => i.product)) ?? `세트 ${key}`,
    ...(code && !/^[A-Z]$/.test(code) ? { code } : {}),
    ...(mostCommon(items.map((i) => i.total)) ? { officialCount: mostCommon(items.map((i) => i.total)) } : {}),
    year: Number(key.slice(0, 4)),
    cards: items.map((i) => i.card),
  };
  return set;
}

/** 세트 코드 · 이름으로 시리즈 정하기 */
function seriesOf(set) {
  const c = set.code ?? '';
  const n = set.name;
  if (/프로모/.test(n)) return ['promo', '프로모'];
  if (/MEGA/.test(n) || /^M(\d|C|E|[A-Z]?$)/.test(c)) return ['mega', 'MEGA'];
  if (/스칼렛|바이올렛/.test(n) || /^SV/i.test(c)) return ['sv', '스칼렛&바이올렛'];
  if (/소드|실드/.test(n) || /^S(\d|[A-Z])/.test(c)) return ['swsh', '소드&실드'];
  if (/썬&문|썬 & 문/.test(n) || /^sm/i.test(c)) return ['sm', '썬&문'];
  if (/XY BREAK/.test(n)) return ['xyb', 'XY BREAK'];
  if (/XY/.test(n) || /^xy/i.test(c)) return ['xy', 'XY'];
  if (/BW/.test(n) || /^bw/i.test(c)) return ['bw', 'BW'];
  if (/DP/.test(n)) return ['dp', 'DP'];
  return ['etc', '기타'];
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  const years = [];
  for (let y = TO; y >= FROM; y--) years.push(y);

  const sets = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      while (next < years.length) {
        const year = years[next++];
        let emptyRun = 0;
        for (let seq = 1; seq <= 999 && emptyRun < 6; seq++) {
          const set = await fetchSet(year, seq);
          if (!set) {
            emptyRun++;
            continue;
          }
          emptyRun = 0;
          sets.push(set);
          console.log(`  ${year}-${pad3(seq)} ${set.code ?? ''} ${set.name} (${set.cards.length}장)`);
        }
        console.log(`[${year}] 끝`);
      }
    }),
  );

  // 시리즈로 묶기 · 최신순
  sets.sort((a, b) => b.id.localeCompare(a.id));
  const byId = new Map();
  for (const set of sets) {
    const [sid, sname] = seriesOf(set);
    if (!byId.has(sid)) byId.set(sid, { id: sid, name: sname, sets: [] });
    byId.get(sid).sets.push(set);
  }
  const series = [...byId.values()].sort((a, b) => b.sets[0].id.localeCompare(a.sets[0].id));
  // 프로모는 맨 뒤로
  series.sort((a, b) => (a.id === 'promo') - (b.id === 'promo'));

  const data = {
    edition: 'ko',
    updatedAt: new Date().toISOString().slice(0, 10),
    source: '포켓몬코리아 공식 카드 검색 (pokemoncard.co.kr)',
    series,
  };
  await writeFile(OUT, JSON.stringify(data) + '\n');
  const total = sets.reduce((n, s) => n + s.cards.length, 0);
  console.log(`완료: 세트 ${sets.length}개, 카드 ${total}장 → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
