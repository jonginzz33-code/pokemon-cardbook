import type { Stats } from './stats';

// 🏅 도전 과제 · 배지. 조건은 통계(stats.ts)로 판단해요.
export interface Badge {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  test: (s: Stats) => boolean;
}

export const BADGES: Badge[] = [
  { id: 'first', emoji: '🌱', title: '첫 카드', desc: '도감에 첫 카드를 넣었어요', test: (s) => s.unique >= 1 },
  { id: 'u10', emoji: '🃏', title: '카드 10종', desc: '서로 다른 카드 10종', test: (s) => s.unique >= 10 },
  { id: 'u50', emoji: '📚', title: '카드 50종', desc: '서로 다른 카드 50종', test: (s) => s.unique >= 50 },
  { id: 'u100', emoji: '💯', title: '카드 100종', desc: '서로 다른 카드 100종', test: (s) => s.unique >= 100 },
  { id: 'u500', emoji: '🏛️', title: '카드 500종', desc: '서로 다른 카드 500종', test: (s) => s.unique >= 500 },
  {
    id: 'rare',
    emoji: '✨',
    title: '첫 레어',
    desc: 'ex · V · RR 같은 레어 카드를 넣었어요',
    test: (s) => s.byLevel[1] + s.byLevel[2] >= 1,
  },
  {
    id: 'top',
    emoji: '👑',
    title: '첫 초레어',
    desc: 'SR · SAR · UR 같은 초레어 카드를 넣었어요',
    test: (s) => s.byLevel[2] >= 1,
  },
  { id: 'top10', emoji: '💎', title: '초레어 10장', desc: '초레어 카드 10종', test: (s) => s.byLevel[2] >= 10 },
  { id: 'set1', emoji: '🏆', title: '세트 완성', desc: '세트 하나를 다 모았어요', test: (s) => s.completeSets >= 1 },
  { id: 'set3', emoji: '🥉', title: '세트 3개 완성', desc: '세트 3개를 다 모았어요', test: (s) => s.completeSets >= 3 },
  {
    id: 'set10',
    emoji: '🥇',
    title: '세트 10개 완성',
    desc: '세트 10개를 다 모았어요',
    test: (s) => s.completeSets >= 10,
  },
  {
    id: 'world',
    emoji: '🌏',
    title: '세 판 모두',
    desc: '한국판 · 일본판 · 영문판을 다 모으기 시작했어요',
    test: (s) => s.byEdition.ko.unique > 0 && s.byEdition.ja.unique > 0 && s.byEdition.en.unique > 0,
  },
  { id: 'photo50', emoji: '📸', title: '사진 50장', desc: '직접 찍은 카드 사진 50장', test: (s) => s.photos >= 50 },
  {
    id: 'trade',
    emoji: '🔁',
    title: '교환 준비',
    desc: '같은 카드를 3장 이상 가졌어요',
    test: (s) => s.dupes.some((d) => d.count >= 3),
  },
];
