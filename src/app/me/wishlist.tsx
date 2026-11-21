import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CardFace } from '@/components/CardFace';
import { findCard, isEditionId } from '@/data';
import { editionLabel } from '@/data/labels';
import { useWishlist } from '@/store/wishlist';
import { colors } from '@/theme';

// ⭐ 찾는 카드 (메모 15): 카드 상세에서 ⭐ 누른 카드들. 가지게 되면 자동으로 빠져요.
export default function WishlistScreen() {
  const wish = useWishlist();
  const items = useMemo(
    () =>
      Object.entries(wish.all)
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => {
          const [edition, cardId] = key.split('|');
          if (!isEditionId(edition)) return null;
          const f = findCard(edition, cardId);
          return f ? { edition, ...f } : null;
        })
        .filter((x): x is NonNullable<typeof x> => !!x),
    [wish.all],
  );

  return (
    <>
      <Stack.Screen options={{ title: '찾는 카드' }} />
      <FlatList
        data={items}
        keyExtractor={(it) => `${it.edition}|${it.card.id}`}
        contentContainerStyle={styles.wrap}
        ListEmptyComponent={
          <Text style={styles.empty}>
            카드 화면에서 ☆ 찾는 카드를 누르면 여기에 모여요. 찍어서 넣으면 자동으로 빠져요.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/[edition]/card/[cardId]',
                params: { edition: item.edition, cardId: item.card.id },
              })
            }
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <CardFace card={item.card} width={44} owned={false} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.card.name}
                {item.card.rarity ? <Text style={styles.rarity}> {item.card.rarity}</Text> : null}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {editionLabel(item.edition)} · {item.set.code ? `${item.set.code} ` : ''}
                {item.card.number} · {item.set.name}
              </Text>
            </View>
            <Pressable onPress={() => wish.remove(item.edition, item.card.id)} hitSlop={10}>
              <Text style={styles.remove}>빼기</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 8, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  rarity: { fontSize: 12, color: colors.accent, fontWeight: '800' },
  sub: { fontSize: 12, color: colors.sub },
  remove: { fontSize: 13, color: colors.danger, fontWeight: '700' },
  empty: { color: colors.sub, textAlign: 'center', marginTop: 30, lineHeight: 20 },
});
