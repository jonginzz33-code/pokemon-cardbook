import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { BottomBar, BOTTOM_BAR_SPACE } from '@/components/BottomBar';
import { CardFace } from '@/components/CardFace';
import { ProgressRing } from '@/components/ProgressBar';
import { findSet, isEditionId } from '@/data';
import { useCollection } from '@/store/collection';
import { useWishlist } from '@/store/wishlist';
import { colors, fonts, softCard } from '@/theme';

type OwnFilter = 'all' | 'owned' | 'missing';
const OWN_FILTERS: { id: OwnFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'owned', label: '모은 카드' },
  { id: 'missing', label: '아직 없는 카드' },
];

const COLUMNS = 3;
const PAD = 16;
const GAP = 10;

export default function SetScreen() {
  const { edition, setId } = useLocalSearchParams<{ edition: string; setId: string }>();
  const col = useCollection();
  const wish = useWishlist();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [own, setOwn] = useState<OwnFilter>('all');
  const [rarity, setRarity] = useState<string | null>(null);

  const found = isEditionId(edition) ? findSet(edition, setId) : null;
  if (!found || !isEditionId(edition)) return <Text style={{ padding: 16, color: colors.text }}>세트를 찾을 수 없어요.</Text>;
  const { set } = found;
  const rarities = [...new Set(set.cards.map((c) => c.rarity).filter((r): r is string => !!r))];

  const cards = set.cards.filter((c) => {
    if (rarity && c.rarity !== rarity) return false;
    if (own === 'all') return true;
    const o = col.isOwned(edition, c);
    return own === 'owned' ? o : !o;
  });
  const progress = col.setProgress(edition, set);
  const cardW = (width - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: set.code ? `${set.code} ${set.name}` : set.name }} />
      <FlatList
        data={cards}
        key={COLUMNS}
        numColumns={COLUMNS}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: PAD, paddingTop: 4, gap: GAP, paddingBottom: BOTTOM_BAR_SPACE + insets.bottom }}
        columnWrapperStyle={{ gap: GAP }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.progressCard}>
              <ProgressRing
                owned={progress.owned}
                total={progress.total}
                size={64}
                stroke={8}
                label={`${progress.total ? Math.round((progress.owned / progress.total) * 100) : 0}%`}
                labelSize={15}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.progressBig}>
                  {progress.owned} / {progress.total}장 모았어요
                </Text>
                <Text style={styles.progressSub}>
                  {progress.total > 0 && progress.owned >= progress.total
                    ? '🏆 세트 완성! 대단해요'
                    : progress.owned === 0
                      ? '첫 카드를 찍어서 넣어 보세요'
                      : `${progress.total - progress.owned}장만 더 모으면 완성!`}
                </Text>
              </View>
            </View>
            <View style={styles.chips}>
              {OWN_FILTERS.map((f) => (
                <Chip key={f.id} label={f.label} active={own === f.id} onPress={() => setOwn(f.id)} />
              ))}
            </View>
            {rarities.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                <Chip label="모든 레어도" active={rarity === null} onPress={() => setRarity(null)} />
                {rarities.map((r) => (
                  <Chip key={r} label={r} active={rarity === r} onPress={() => setRarity(r)} />
                ))}
              </ScrollView>
            ) : null}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>조건에 맞는 카드가 없어요.</Text>}
        renderItem={({ item: card }) => {
          const owned = col.isOwned(edition, card);
          return (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/[edition]/card/[cardId]', params: { edition, cardId: card.id } })
              }
              style={({ pressed }) => [{ width: cardW }, pressed && { opacity: 0.7 }]}
            >
              <CardFace card={card} width={cardW} owned={owned} photo={col.coverPhoto(edition, card)} />
              {!owned && wish.has(edition, card.id) ? (
                <View style={styles.wishSticker}>
                  <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill={colors.star} />
                  </Svg>
                </View>
              ) : null}
              <Text style={[styles.caption, !owned && styles.captionMissing]} numberOfLines={1}>
                {card.number} {card.name}
              </Text>
            </Pressable>
          );
        }}
      />
      <BottomBar edition={edition} />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: 10, marginBottom: 4 },
  progressCard: { ...softCard, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  progressBig: { fontFamily: fonts.title, fontSize: 19, color: colors.text },
  progressSub: { fontFamily: fonts.body, fontSize: 13, color: colors.sub },
  chips: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, color: colors.text, fontFamily: fonts.title },
  chipTextActive: { color: colors.onAccent },
  caption: { fontSize: 11, color: colors.text, marginTop: 5, fontFamily: fonts.title, textAlign: 'center' },
  captionMissing: { color: colors.sub, fontFamily: fonts.body },
  wishSticker: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.warnSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { textAlign: 'center', color: colors.sub, marginTop: 40, fontFamily: fonts.body },
});
