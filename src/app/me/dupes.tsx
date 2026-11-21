import { router, Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { CardFace } from '@/components/CardFace';
import { editionLabel, VARIANT_LABELS } from '@/data/labels';
import { useCollection } from '@/store/collection';
import { computeStats } from '@/store/stats';
import { colors } from '@/theme';

// 🔁 중복 카드 모아보기 (메모 14): 2장 이상 가진 카드 · 교환 목록을 사진 한 장으로 공유
export default function DupesScreen() {
  const col = useCollection();
  const dupes = useMemo(() => computeStats(col.all).dupes, [col.all]);
  const shot = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);

  const text = () =>
    [
      '🔁 교환할 수 있는 카드 (카드 도감)',
      ...dupes.map(
        (d) =>
          `· [${editionLabel(d.edition)}] ${d.set.code ?? d.set.name} ${d.card.number} ${d.card.name} — 여분 ${d.count - 1}장`,
      ),
    ].join('\n');

  const shareImage = async () => {
    if (!shot.current || busy) return;
    setBusy(true);
    try {
      const uri = await captureRef(shot, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '교환 목록 보내기' });
    } catch (e) {
      Alert.alert(
        '사진으로 만들지 못했어요',
        `${e instanceof Error ? e.message : String(e)}\n글로 보내기를 써 주세요.`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '중복 카드' }} />
      <ScrollView contentContainerStyle={styles.wrap}>
        {dupes.length === 0 ? (
          <Text style={styles.empty}>같은 카드를 2장 이상 가진 게 아직 없어요.</Text>
        ) : (
          <>
            <View style={styles.row}>
              <Btn label={busy ? '만드는 중…' : '🖼️ 사진으로 보내기'} primary onPress={shareImage} />
              <Btn label="💬 글로 보내기" onPress={() => Share.share({ message: text() })} />
            </View>
            {/* 이 부분이 사진으로 찍혀요 */}
            <View ref={shot} collapsable={false} style={styles.sheet}>
              <Text style={styles.sheetTitle}>🔁 교환할 수 있는 카드</Text>
              <Text style={styles.sheetSub}>여분 {dupes.reduce((n, d) => n + d.count - 1, 0)}장 · 카드 도감</Text>
              <View style={styles.grid}>
                {dupes.slice(0, 60).map((d) => (
                  <Pressable
                    key={`${d.edition}|${d.card.id}|${d.variant}`}
                    onPress={() =>
                      router.push({
                        pathname: '/[edition]/card/[cardId]',
                        params: { edition: d.edition, cardId: d.card.id },
                      })
                    }
                    style={styles.item}
                  >
                    <CardFace card={d.card} width={96} owned photo={d.photo} />
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>+{d.count - 1}</Text>
                    </View>
                    <Text style={styles.name} numberOfLines={1}>
                      {d.card.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {d.set.code ?? editionLabel(d.edition)} {d.card.number}
                      {d.variant !== 'normal' ? ` · ${VARIANT_LABELS[d.variant]}` : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {dupes.length > 60 ? <Text style={styles.meta}>…외 {dupes.length - 60}종</Text> : null}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

function Btn({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        primary && { backgroundColor: colors.accent, borderColor: colors.accent },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.btnText, primary && { color: colors.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  btnText: { fontSize: 14, fontWeight: '700', color: colors.text },
  sheet: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 6 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  sheetSub: { fontSize: 12, color: colors.sub, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { width: 96, gap: 3 },
  countBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: { color: colors.onAccent, fontWeight: '900', fontSize: 12 },
  name: { fontSize: 12, fontWeight: '700', color: colors.text },
  meta: { fontSize: 10, color: colors.sub },
  empty: { color: colors.sub, textAlign: 'center', marginTop: 30 },
});
