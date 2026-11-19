import type { Card, CardSet, EditionData, EditionId, Series, VariantId } from './types';

// 앱에 함께 들어가는 카드 목록. scripts/ 의 수집 스크립트가 이 파일들을 새로 만듭니다.
// 판마다 수만 장이라, 그 판을 처음 쓸 때 불러옵니다.
const LOADERS: Record<EditionId, () => EditionData> = {
  ko: () => require('./editions/ko.json') as EditionData,
  ja: () => require('./editions/ja.json') as EditionData,
  en: () => require('./editions/en.json') as EditionData,
};
const cache: Partial<Record<EditionId, EditionData>> = {};

export const getEdition = (id: EditionId): EditionData => (cache[id] ??= LOADERS[id]());

type Located = { series: Series; set: CardSet };
const setIndex: Partial<Record<EditionId, Map<string, Located>>> = {};
const cardIndex: Partial<Record<EditionId, Map<string, Located & { card: Card }>>> = {};

function buildIndex(edition: EditionId) {
  const sets = new Map<string, Located>();
  const cards = new Map<string, Located & { card: Card }>();
  for (const series of getEdition(edition).series) {
    for (const set of series.sets) {
      sets.set(set.id, { series, set });
      for (const card of set.cards) cards.set(card.id, { series, set, card });
    }
  }
  setIndex[edition] = sets;
  cardIndex[edition] = cards;
}

export const isEditionId = (v: unknown): v is EditionId => v === 'ko' || v === 'ja' || v === 'en';

export function findSet(edition: EditionId, setId: string): Located | null {
  if (!setIndex[edition]) buildIndex(edition);
  return setIndex[edition]!.get(setId) ?? null;
}

export function findCard(edition: EditionId, cardId: string): (Located & { card: Card }) | null {
  if (!cardIndex[edition]) buildIndex(edition);
  return cardIndex[edition]!.get(cardId) ?? null;
}

export const cardVariants = (card: Card): VariantId[] =>
  card.variants && card.variants.length > 0 ? card.variants : ['normal'];

export function allCards(edition: EditionId): Card[] {
  return getEdition(edition).series.flatMap((s) => s.sets.flatMap((set) => set.cards));
}
