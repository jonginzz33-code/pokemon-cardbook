import { findCard, findSet, isEditionId } from '@/data';
import { rarityLevel, type RarityLevel } from '@/data/rarity';
import type { Card, CardSet, EditionId, Series, VariantId } from '@/data/types';
import type { Collection } from './collection';

export interface OwnedItem {
  edition: EditionId;
  series: Series;
  set: CardSet;
  card: Card;
  variant: VariantId;
  count: number;
  photo?: string;
  updatedAt: number;
}

/** 기록을 카드 정보와 묶어서 펼치기 (수량 0 은 뺌) */
export function ownedItems(all: Collection): OwnedItem[] {
  const out: OwnedItem[] = [];
  for (const [key, entry] of Object.entries(all)) {
    if (!entry || entry.count <= 0) continue;
    const [edition, cardId, variant] = key.split('|');
    if (!isEditionId(edition)) continue;
    const found = findCard(edition, cardId);
    if (!found) continue;
    out.push({
      edition,
      ...found,
      variant: variant as VariantId,
      count: entry.count,
      photo: entry.photo,
      updatedAt: entry.updatedAt,
    });
  }
  return out;
}

export interface Stats {
  copies: number;
  unique: number;
  photos: number;
  byEdition: Record<EditionId, { unique: number; copies: number }>;
  byLevel: Record<RarityLevel, number>;
  recent: OwnedItem[];
  /** 내 카드가 있는 세트: 가진 종류 수 · 전체 */
  sets: { edition: EditionId; set: CardSet; series: Series; owned: number; total: number }[];
  completeSets: number;
  dupes: OwnedItem[];
}

export function computeStats(all: Collection): Stats {
  const items = ownedItems(all);
  const byEdition = { ko: { unique: 0, copies: 0 }, ja: { unique: 0, copies: 0 }, en: { unique: 0, copies: 0 } };
  const byLevel: Record<RarityLevel, number> = { 0: 0, 1: 0, 2: 0 };
  const uniqueCards = new Map<string, OwnedItem>();
  let copies = 0;
  let photos = 0;
  for (const it of items) {
    copies += it.count;
    if (it.photo) photos++;
    byEdition[it.edition].copies += it.count;
    const k = `${it.edition}|${it.card.id}`;
    if (!uniqueCards.has(k)) {
      uniqueCards.set(k, it);
      byEdition[it.edition].unique++;
      byLevel[rarityLevel(it.card)]++;
    }
  }
  const setMap = new Map<string, Stats['sets'][number]>();
  for (const it of uniqueCards.values()) {
    const k = `${it.edition}|${it.set.id}`;
    const cur = setMap.get(k);
    if (cur) cur.owned++;
    else setMap.set(k, { edition: it.edition, set: it.set, series: it.series, owned: 1, total: it.set.cards.length });
  }
  const sets = [...setMap.values()];
  return {
    copies,
    unique: uniqueCards.size,
    photos,
    byEdition,
    byLevel,
    recent: [...items].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12),
    sets,
    completeSets: sets.filter((s) => s.owned >= s.total).length,
    dupes: items.filter((it) => it.count >= 2).sort((a, b) => b.count - a.count),
  };
}

/** 세트 진행: 이 카드를 막 가지기 전/후 */
export function setOwnedCount(all: Collection, edition: EditionId, setId: string): number {
  const found = findSet(edition, setId);
  if (!found) return 0;
  let n = 0;
  for (const c of found.set.cards) {
    for (const v of c.variants?.length ? c.variants : (['normal'] as VariantId[])) {
      if ((all[`${edition}|${c.id}|${v}`]?.count ?? 0) > 0) {
        n++;
        break;
      }
    }
  }
  return n;
}
