import { findCard } from '@/data';
import { rarityLevel } from '@/data/rarity';
import type { EditionId } from '@/data/types';
import { useCollection } from '@/store/collection';
import { photoUri } from '@/store/photos';
import { setOwnedCount } from '@/store/stats';
import { useWishlist } from '@/store/wishlist';
import { useCelebrate } from './Celebration';

export interface NewCardSnapshot {
  edition: EditionId;
  cardId: string;
  wasOwned: boolean;
  before: number;
}

/**
 * 처음 가진 카드면 등록 연출을 보여 줘요.
 * 쓰는 법: 저장하기 **전에** snapshot() → 저장 → announce(snapshot, 사진 파일)
 */
export function useNewCard() {
  const col = useCollection();
  const wish = useWishlist();
  const celebrate = useCelebrate();

  const snapshot = (edition: EditionId, cardId: string): NewCardSnapshot | null => {
    const found = findCard(edition, cardId);
    if (!found) return null;
    return {
      edition,
      cardId,
      wasOwned: col.isOwned(edition, found.card),
      before: setOwnedCount(col.all, edition, found.set.id),
    };
  };

  /** 새 카드였으면 연출을 보여 주고 닫힐 때까지 기다려요. 이미 있던 카드면 바로 끝나요. */
  const announce = async (snap: NewCardSnapshot | null, photoFile?: string) => {
    if (!snap || snap.wasOwned) return false;
    const found = findCard(snap.edition, snap.cardId);
    if (!found) return false;
    const { set, card } = found;
    const wished = wish.has(snap.edition, card.id);
    if (wished) wish.remove(snap.edition, card.id);
    await celebrate({
      kind: 'card',
      edition: snap.edition,
      card,
      photoUri: photoFile ? photoUri(photoFile) : undefined,
      level: rarityLevel(card),
      setLabel: set.code ? `${set.code} ${set.name}` : set.name,
      before: snap.before,
      after: Math.min(set.cards.length, snap.before + 1),
      total: set.cards.length,
      wished,
    });
    return true;
  };

  return { snapshot, announce };
}
