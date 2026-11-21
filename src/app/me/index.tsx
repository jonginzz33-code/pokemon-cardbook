import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CardFace } from '@/components/CardFace';
import { EDITIONS, editionLabel } from '@/data/labels';
import { BADGES } from '@/store/badges';
import { useCollection } from '@/store/collection';
import { computeStats } from '@/store/stats';
import { useWishlist } from '@/store/wishlist';
import { colors } from '@/theme';

// 📊 내 컬렉션: 통계(16) · 배지(18) · 중복 카드(14) · 찾는 카드(15) · 백업(12)
export default function MeScreen() {
  const col = useCollection();
  const wish = useWishlist();
  const s = useMemo(() => computeStats(col.all), [col.all]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  useEffect(() => {
    AsyncStorage.getItem('cardbook.badges.v1')
      .then((raw) => setUnlocked(new Set(raw ? (JSON.parse(raw) as string[]) : [])))
      .catch(() => {});
  }, [col.all]);
  const earned = BADGES.filter((b) => unlocked.has(b.id) || b.test(s));
  const topSets = [...s.sets].sort((a, b) => b.owned - a.owned).slice(0, 5);
  const bestSets = [...s.sets]
    .filter((x) => x.owned >= 3)
    .sort((a, b) => b.owned / b.total - a.owned / a.total)
    .slice(0, 5);

  return (
    <>
      <Stack.Screen options={{ title: '내 컬렉션' }} />
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.tiles}>
          <Tile num={s.unique} label="카드 종류" />
          <Tile num={s.copies} label="전체 장수" />
          <Tile num={s.completeSets} label="완성한 세트" />
        </View>

        <View style={styles.box}>
          <Text style={styles.h}>판별</Text>
          {EDITIONS.map((e) => (
            <View key={e.id} style={styles.line}>
              <Text style={styles.k}>
                {e.flag} {e.label}
              </Text>
              <Text style={styles.v}>
                {s.byEdition[e.id].unique}종 · {s.byEdition[e.id].copies}장
              </Text>
            </View>
          ))}
          <View style={styles.sep} />
          <Text style={styles.h}>레어도</Text>
          <View style={styles.line}>
            <Text style={styles.k}>보통</Text>
            <Text style={styles.v}>{s.byLevel[0]}종</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.k}>✨ 레어</Text>
            <Text style={styles.v}>{s.byLevel[1]}종</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.k}>👑 초레어</Text>
            <Text style={styles.v}>{s.byLevel[2]}종</Text>
          </View>
        </View>

        <View style={styles.links}>
          <LinkRow
            icon="🔁"
            title="중복 카드 (교환용)"
            sub={`${s.dupes.length}종`}
            onPress={() => router.push('/me/dupes')}
          />
          <LinkRow
            icon="⭐"
            title="찾는 카드"
            sub={`${Object.keys(wish.all).length}장`}
            onPress={() => router.push('/me/wishlist')}
          />
          <LinkRow icon="💾" title="백업 · 복원" sub="사진과 기록 지키기" onPress={() => router.push('/me/backup')} />
        </View>

        <View style={styles.box}>
          <Text style={styles.h}>
            🏅 배지 {earned.length} / {BADGES.length}
          </Text>
          <View style={styles.badges}>
            {BADGES.map((b) => {
              const on = earned.includes(b);
              return (
                <View key={b.id} style={[styles.badge, !on && { opacity: 0.35 }]}>
                  <Text style={styles.badgeEmoji}>{on ? b.emoji : '🔒'}</Text>
                  <Text style={styles.badgeTitle} numberOfLines={1}>
                    {b.title}
                  </Text>
                  <Text style={styles.badgeDesc} numberOfLines={2}>
                    {b.desc}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {s.recent.length ? (
          <View style={styles.box}>
            <Text style={styles.h}>최근 넣은 카드</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {s.recent.map((it) => (
                <Pressable
                  key={`${it.edition}|${it.card.id}|${it.variant}`}
                  onPress={() =>
                    router.push({
                      pathname: '/[edition]/card/[cardId]',
                      params: { edition: it.edition, cardId: it.card.id },
                    })
                  }
                  style={{ width: 72, gap: 4 }}
                >
                  <CardFace card={it.card} width={72} owned photo={it.photo} />
                  <Text style={styles.small} numberOfLines={1}>
                    {it.card.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {topSets.length ? (
          <View style={styles.box}>
            <Text style={styles.h}>가장 많이 모은 세트</Text>
            {topSets.map((x) => (
              <SetLine key={`${x.edition}${x.set.id}`} x={x} />
            ))}
            {bestSets.length ? (
              <>
                <View style={styles.sep} />
                <Text style={styles.h}>완성에 가까운 세트</Text>
                {bestSets.map((x) => (
                  <SetLine key={`b${x.edition}${x.set.id}`} x={x} />
                ))}
              </>
            ) : null}
          </View>
        ) : (
          <Text style={styles.empty}>아직 넣은 카드가 없어요. 카드를 찍어서 넣어 보세요!</Text>
        )}
      </ScrollView>
    </>
  );
}

function Tile({ num, label }: { num: number; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileNum}>{num.toLocaleString()}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function LinkRow({ icon, title, sub, onPress }: { icon: string; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}>
      <Text style={styles.linkIcon}>{icon}</Text>
      <Text style={styles.linkTitle}>{title}</Text>
      <Text style={styles.linkSub}>{sub}</Text>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

function SetLine({ x }: { x: ReturnType<typeof computeStats>['sets'][number] }) {
  const pct = Math.round((x.owned / x.total) * 100);
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/[edition]/set/[setId]', params: { edition: x.edition, setId: x.set.id } })
      }
      style={styles.setLine}
    >
      <Text style={styles.k} numberOfLines={1}>
        {editionLabel(x.edition).slice(0, 2)} · {x.set.code ? `${x.set.code} ` : ''}
        {x.set.name}
      </Text>
      <Text style={styles.v}>
        {x.owned}/{x.total} ({pct}%)
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 40 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', gap: 2 },
  tileNum: { fontSize: 24, fontWeight: '900', color: colors.accent, fontVariant: ['tabular-nums'] },
  tileLabel: { fontSize: 12, color: colors.sub },
  box: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 8 },
  h: { fontSize: 14, fontWeight: '800', color: colors.text },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  setLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 2 },
  k: { fontSize: 13, color: colors.sub, flex: 1 },
  v: { fontSize: 13, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  sep: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
  links: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  linkIcon: { fontSize: 20 },
  linkTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  linkSub: { fontSize: 13, color: colors.sub },
  chev: { fontSize: 22, color: colors.sub },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { width: '31%', backgroundColor: colors.bg, borderRadius: 12, padding: 8, alignItems: 'center', gap: 2 },
  badgeEmoji: { fontSize: 26 },
  badgeTitle: { fontSize: 12, fontWeight: '800', color: colors.text },
  badgeDesc: { fontSize: 10, color: colors.sub, textAlign: 'center' },
  small: { fontSize: 11, color: colors.text },
  empty: { color: colors.sub, textAlign: 'center', marginTop: 10 },
});
