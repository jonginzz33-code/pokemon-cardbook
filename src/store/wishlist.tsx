import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { EditionId } from '@/data/types';

// ⭐ 갖고 싶은 카드 (위시리스트). 키: 판|카드ID → 추가한 시각
const KEY = 'cardbook.wishlist.v1';
export type Wishlist = Record<string, number>;
const wishKey = (e: EditionId, cardId: string) => `${e}|${cardId}`;

interface WishApi {
  all: Wishlist;
  has: (e: EditionId, cardId: string) => boolean;
  toggle: (e: EditionId, cardId: string) => void;
  remove: (e: EditionId, cardId: string) => void;
  replaceAll: (w: Wishlist) => void;
}

const Ctx = createContext<WishApi | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<Wishlist>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setAll(JSON.parse(raw) as Wishlist))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(all)).catch(() => {});
  }, [all, ready]);

  const api = useMemo<WishApi>(
    () => ({
      all,
      has: (e, id) => !!all[wishKey(e, id)],
      toggle: (e, id) =>
        setAll((prev) => {
          const next = { ...prev };
          const k = wishKey(e, id);
          if (next[k]) delete next[k];
          else next[k] = Date.now();
          return next;
        }),
      remove: (e, id) =>
        setAll((prev) => {
          const k = wishKey(e, id);
          if (!prev[k]) return prev;
          const next = { ...prev };
          delete next[k];
          return next;
        }),
      replaceAll: (w) => setAll({ ...w }),
    }),
    [all],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWishlist must be used inside WishlistProvider');
  return v;
}
