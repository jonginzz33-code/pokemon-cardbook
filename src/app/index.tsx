import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { BottomBar, BOTTOM_BAR_SPACE, CameraIcon } from '@/components/BottomBar';
import { CardBack } from '@/components/CardBack';
import { UpdateBanner, UpdateButton, VersionLine } from '@/components/UpdateBanner';
import { getEdition } from '@/data';
import { EDITIONS } from '@/data/labels';
import { lastBackupAt } from '@/store/backup';
import { useCollection } from '@/store/collection';
import { colors, editionTint, fonts, isDark, softCard } from '@/theme';

const STAR = 'M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z';

// 🎨 홈 (메모 21 · A안 말랑 스티커북)
export default function Home() {
  const col = useCollection();
  const insets = useSafeAreaInsets();

  // 💾 백업 알림: 카드가 10개 넘게 쌓였는데 2주 넘게 백업을 안 했으면
  const recordCount = useMemo(() => Object.values(col.all).filter((e) => e.count > 0).length, [col.all]);
  const [lastBackup, setLastBackup] = useState<number | null | undefined>(undefined);
  const [badgeCount, setBadgeCount] = useState(0);
  useEffect(() => {
    void lastBackupAt().then(setLastBackup);
    AsyncStorage.getItem('cardbook.badges.v1')
      .then((raw) => setBadgeCount(raw ? (JSON.parse(raw) as string[]).length : 0))
      .catch(() => {});
  }, [recordCount]);
  const needBackup =
    lastBackup !== undefined && recordCount >= 10 && (lastBackup === null || Date.now() - lastBackup > 14 * 86400000);

  const editions = EDITIONS.map((ed) => {
    const data = getEdition(ed.id);
    const sets = data.series.flatMap((s) => s.sets);
    let owned = 0;
    let total = 0;
    for (const set of sets) {
      const p = col.setProgress(ed.id, set);
      owned += p.owned;
      total += p.total;
    }
    return { ed, sets: sets.length, owned, total };
  });
  const grand = editions.reduce((n, e) => n + e.total, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 12, paddingBottom: BOTTOM_BAR_SPACE + insets.bottom }]}
      >
        {/* 위쪽 줄 */}
        <View style={styles.top}>
          <UpdateButton />
          <Text style={styles.appTitle}>카드 도감</Text>
          <Pressable onPress={() => router.push('/me')} style={styles.badgeChip} accessibilityLabel="배지 보기">
            <Svg width={15} height={15} viewBox="0 0 24 24">
              <Path d={STAR} fill={colors.star} />
            </Svg>
            <Text style={styles.badgeText}>배지 {badgeCount}</Text>
          </Pressable>
        </View>
        <Text style={styles.hello}>안녕! 오늘은 어떤 카드를 넣어 볼까?</Text>

        <UpdateBanner />

        {/* 카드 찍기 */}
        <Pressable onPress={() => router.push('/scan')} style={({ pressed }) => [styles.hero, pressed && styles.heroPressed]}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.heroTitle}>카드 찍어서 넣기</Text>
            <Text style={styles.heroSub}>찰칵 찍으면 번호를 읽어서{'\n'}빈칸에 쏙 넣어 줘요</Text>
            <View style={styles.heroPill}>
              <CameraIcon color={isDark ? '#1B1744' : colors.accent} size={16} />
              <Text style={styles.heroPillText}>찍으러 가기</Text>
            </View>
          </View>
          <View style={styles.heroArt} pointerEvents="none">
            <View style={[styles.heroCard, { left: 2, top: 18, transform: [{ rotate: '-12deg' }] }]}>
              <CardBack width={60} />
            </View>
            <View style={[styles.heroCard, styles.heroCardFront, { left: 40, top: 6, transform: [{ rotate: '9deg' }] }]}>
              <Svg width={32} height={32} viewBox="0 0 24 24">
                <Path d={STAR} fill="#FFB86B" />
              </Svg>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24" style={{ position: 'absolute', right: 0, top: 0 }}>
              <Path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="#FFF1C2" />
            </Svg>
          </View>
        </Pressable>

        {/* 바로가기 */}
        <View style={styles.quick}>
          <Pressable
            onPress={() => router.push('/search')}
            style={({ pressed }) => [styles.quickBtn, { backgroundColor: colors.skySoft }, pressed && styles.pressed]}
          >
            <View style={styles.quickIcon}>
              <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="#3F73D9" strokeWidth={2.4} strokeLinecap="round">
                <Circle cx="11" cy="11" r="6.5" />
                <Path d="M16 16l4.5 4.5" />
              </Svg>
            </View>
            <Text style={[styles.quickText, { color: colors.skyInk }]}>카드 검색</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/me')}
            style={({ pressed }) => [styles.quickBtn, { backgroundColor: colors.peachSoft }, pressed && styles.pressed]}
          >
            <View style={styles.quickIcon}>
              <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="#E07A35" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 5h6v14H4z" />
                <Path d="M10 5h5v14h-5z" />
                <Path d="M15.5 6l4-1 3 13-4 1z" />
              </Svg>
            </View>
            <Text style={[styles.quickText, { color: colors.peachInk }]}>내 컬렉션</Text>
          </Pressable>
        </View>

        {needBackup ? (
          <Pressable onPress={() => router.push('/me/backup')} style={({ pressed }) => [styles.backup, pressed && styles.pressed]}>
            <Text style={styles.backupText}>
              💾 {lastBackup === null ? '아직 백업한 적이 없어요' : '백업한 지 2주가 넘었어요'} · 눌러서 사진과 기록을 지켜요
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.sectionRow}>
          <Text style={styles.section}>모으는 판</Text>
          <Text style={styles.sectionSub}>전체 {grand.toLocaleString()}장</Text>
        </View>

        {editions.map(({ ed, sets, owned, total }) => {
          const t = editionTint[ed.id];
          const pct = total ? owned / total : 0;
          return (
            <Pressable
              key={ed.id}
              onPress={() => router.push({ pathname: '/[edition]', params: { edition: ed.id } })}
              style={({ pressed }) => [styles.edition, pressed && styles.pressed]}
            >
              <View style={[styles.sticker, { backgroundColor: t.soft }]}>
                <Text style={[styles.stickerText, { color: t.ink, fontSize: t.mark.length > 1 ? 19 : 23 }]}>{t.mark}</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.edHead}>
                  <Text style={styles.edTitle}>{ed.label}</Text>
                  <Text style={styles.edMeta}>세트 {sets}개</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.min(100, pct * 100)}%`, backgroundColor: t.bar }]} />
                </View>
                <Text style={styles.edMeta}>
                  {owned === 0
                    ? `${total.toLocaleString()}장 · 첫 카드를 넣어 보세요`
                    : `${owned.toLocaleString()} / ${total.toLocaleString()}장 모았어요`}
                </Text>
              </View>
            </Pressable>
          );
        })}

        <Text style={styles.disclaimer}>
          이 앱은 개인 수집 기록용 비공식 팬 앱이며, 포켓몬 카드 게임의 제작사·유통사와 관련이 없습니다. 카드 사진은 직접
          찍은 사진만 이 폰에 저장됩니다.
        </Text>
        <VersionLine />
      </ScrollView>
      <BottomBar active="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 18, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appTitle: { flex: 1, fontFamily: fonts.title, fontSize: 27, color: colors.text },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.warnSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: { fontFamily: fonts.title, fontSize: 13, color: colors.warnText },
  hello: { fontFamily: fonts.body, fontSize: 15, color: colors.sub, marginTop: -6, marginLeft: 4 },
  hero: {
    backgroundColor: colors.accent,
    borderRadius: 28,
    padding: 20,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 6,
    borderBottomColor: colors.accentDeep,
  },
  heroPressed: { transform: [{ translateY: 3 }], borderBottomWidth: 3 },
  heroTitle: { fontFamily: fonts.title, fontSize: 24, color: colors.onAccent },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: colors.onAccentSub, lineHeight: 19 },
  heroPill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  heroPillText: { fontFamily: fonts.title, fontSize: 13, color: isDark ? '#1B1744' : '#5B4BD6' },
  heroArt: { width: 106, height: 118 },
  heroCard: { position: 'absolute' },
  heroCardFront: {
    width: 62,
    height: 86,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FFD8EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quick: { flexDirection: 'row', gap: 10 },
  quickBtn: { flex: 1, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { fontFamily: fonts.title, fontSize: 17 },
  pressed: { opacity: 0.75 },
  backup: { backgroundColor: colors.warnSoft, borderRadius: 18, padding: 12 },
  backupText: { fontFamily: fonts.body, fontSize: 13, color: colors.warnText, lineHeight: 19 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2, paddingHorizontal: 4 },
  section: { fontFamily: fonts.title, fontSize: 19, color: colors.text },
  sectionSub: { fontFamily: fonts.body, fontSize: 12, color: colors.sub },
  edition: { ...softCard, padding: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sticker: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  stickerText: { fontFamily: fonts.title },
  edHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  edTitle: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
  edMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.sub },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  disclaimer: { fontFamily: fonts.body, fontSize: 12, color: colors.sub, lineHeight: 18, marginTop: 10 },
});
