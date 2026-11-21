import type { Card } from './types';

/** 연출 세기: 0 = 보통, 1 = 레어, 2 = 초레어 (금색) */
export type RarityLevel = 0 | 1 | 2;

const TOP = new Set([
  'SAR',
  'SSR',
  'UR',
  'HR',
  'SR',
  'AR',
  'CHR',
  'CSR',
  'ACE',
  'MUR',
  'BWR',
  'S',
  'SECRET',
  'ILLUSTRATION',
  'HYPER',
  'SPECIAL',
  'ULTRA',
  'SHINY',
  'AMAZING',
  'RAINBOW',
  'GOLD',
]);
const RARE = new Set(['RRR', 'RR', 'R', 'PR', 'K', 'DOUBLE', 'HOLO', 'RARE', 'PRISM', 'STAR', 'LEGEND']);

export function rarityLevel(card: Card): RarityLevel {
  const words = (card.rarity ?? '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);
  if (words.some((w) => TOP.has(w))) return 2;
  if (words.some((w) => RARE.has(w))) return 1;
  // 레어도 정보가 없는 카드(한국판 등)는 이름으로 짐작
  if (/(ex|EX|GX|VMAX|VSTAR|V-UNION|BREAK|LEGEND|프리즘|☆|\sV$)/.test(card.name)) return 1;
  return 0;
}
