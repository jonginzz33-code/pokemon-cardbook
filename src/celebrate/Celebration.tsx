import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CardBack } from '@/components/CardBack';
import type { RarityLevel } from '@/data/rarity';
import type { Card, EditionId } from '@/data/types';
import { BADGES, type Badge } from '@/store/badges';
import { useCollection } from '@/store/collection';
import { computeStats } from '@/store/stats';
import { CARD_RATIO, colors } from '@/theme';

// 🎉 새 카드 등록 연출 (메모 10) + 🏅 배지 받기 (메모 18)
// 미리보기: https://claude.ai/artifact/A7ebHAAHkmgDdCkddFtsx9

export type CelebrateEvent =
  | {
      kind: 'card';
      edition: EditionId;
      card: Card;
      /** 화면에 보여 줄 사진 주소 (없으면 이름이 적힌 카드) */
      photoUri?: string;
      level: RarityLevel;
      setLabel: string;
      before: number;
      after: number;
      total: number;
      /** ⭐ 찾던 카드였는지 */
      wished?: boolean;
    }
  | { kind: 'badge'; badge: Badge };

interface Api {
  /** 연출을 보여 주고, 사용자가 닫으면 끝나요 */
  celebrate: (ev: CelebrateEvent) => Promise<void>;
}

const Ctx = createContext<Api | null>(null);
const BADGE_KEY = 'cardbook.badges.v1';

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<{ id: number; ev: CelebrateEvent; done: () => void }[]>([]);
  const nextId = useRef(1);
  const current = queue[0];

  const celebrate = useCallback(
    (ev: CelebrateEvent) =>
      new Promise<void>((resolve) => {
        const id = nextId.current++;
        setQueue((q) => [...q, { id, ev, done: resolve }]);
      }),
    [],
  );
  const close = useCallback(() => {
    setQueue((q) => {
      q[0]?.done();
      return q.slice(1);
    });
  }, []);

  // 🏅 배지: 기록이 바뀔 때마다 새로 받은 배지가 있는지 확인 (처음 켤 때는 조용히 기억만)
  const col = useCollection();
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(BADGE_KEY)
      .then((raw) => {
        known.current = raw ? new Set(JSON.parse(raw) as string[]) : null;
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!col.ready) return;
    const t = setTimeout(() => {
      const stats = computeStats(col.all);
      const have = BADGES.filter((b) => b.test(stats)).map((b) => b.id);
      if (known.current === null) {
        known.current = new Set(have); // 처음: 이미 가진 배지는 축하 없이
      } else {
        for (const id of have) {
          if (!known.current.has(id)) {
            known.current.add(id);
            const badge = BADGES.find((b) => b.id === id);
            if (badge) void celebrate({ kind: 'badge', badge });
          }
        }
      }
      AsyncStorage.setItem(BADGE_KEY, JSON.stringify([...known.current])).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [col.all, col.ready, celebrate]);

  const api = useMemo(() => ({ celebrate }), [celebrate]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <Modal visible={!!current} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        {current ? <Overlay key={current.id} ev={current.ev} onClose={close} /> : null}
      </Modal>
    </Ctx.Provider>
  );
}

export function useCelebrate() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCelebrate must be used inside CelebrationProvider');
  return v.celebrate;
}

// ───────────────────────── 화면 ─────────────────────────

const CONFETTI = {
  0: ['#4B3FD1', '#E5533D', '#3CC48D', '#E8C25A', '#7C70F5'],
  1: ['#8B80FF', '#E8C25A', '#E5533D', '#3CC48D', '#FFFFFF'],
  2: ['#E8C25A', '#FFE9A6', '#F7B733', '#FFFFFF', '#F3C969'],
} as const;

function Overlay({ ev, onClose }: { ev: CelebrateEvent; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const level: RarityLevel = ev.kind === 'card' ? ev.level : 1;
  const complete = ev.kind === 'card' && ev.after >= ev.total && ev.total > 0;
  const cardW = Math.min(width * 0.52, 230);

  const flip = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(ev.kind === 'card' && ev.total ? ev.before / ev.total : 0)).current;
  const trophy = useRef(new Animated.Value(0)).current;
  const [showTrophy, setShowTrophy] = useState(false);

  const particles = useMemo(() => {
    const n = complete ? 110 : [45, 70, 100][level];
    const palette = CONFETTI[complete ? 2 : level];
    return Array.from({ length: n }, (_, i) => {
      const a = Math.random() * Math.PI * 2;
      const sp = 110 + Math.random() * (150 + level * 70);
      return {
        dx: Math.cos(a) * sp,
        dy: Math.sin(a) * sp - 120,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 5,
        spin: (Math.random() - 0.5) * 900,
        color: palette[i % palette.length],
        round: i % 4 === 0,
      };
    });
  }, [level, complete]);

  useEffect(() => {
    const isCard = ev.kind === 'card';
    Animated.sequence([
      Animated.delay(isCard ? 250 : 0),
      Animated.timing(flip, {
        toValue: 1,
        duration: isCard ? 750 : 1,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (level === 2) setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 220);
      Animated.parallel([
        Animated.spring(pop, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 1, duration: 1900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      if (ev.kind === 'card' && ev.total) {
        Animated.timing(bar, { toValue: ev.after / ev.total, duration: 900, useNativeDriver: false }).start();
      }
      if (complete) {
        setTimeout(() => {
          setShowTrophy(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          Animated.spring(trophy, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
        }, 1100);
      }
    });
    if (level >= 1) {
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }),
      ).start();
    }
  }, [ev, flip, pop, burst, spin, bar, trophy, level, complete]);

  const backRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const frontRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const rays = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      {/* 금색 빛줄기 (레어 이상) */}
      {level >= 1 ? (
        <Animated.View style={[styles.rays, { opacity: pop, transform: [{ rotate: rays }] }]} pointerEvents="none">
          <Svg width={520} height={520} viewBox="-100 -100 200 200">
            {Array.from({ length: 14 }, (_, i) => {
              const a1 = (i / 14) * Math.PI * 2;
              const a2 = a1 + 0.13;
              return (
                <Path
                  key={i}
                  d={`M0 0 L${Math.cos(a1) * 100} ${Math.sin(a1) * 100} L${Math.cos(a2) * 100} ${Math.sin(a2) * 100} Z`}
                  fill={level === 2 ? '#F3C969' : '#E8C25A'}
                  opacity={level === 2 ? 0.42 : 0.26}
                />
              );
            })}
          </Svg>
        </Animated.View>
      ) : null}

      <View style={styles.center} pointerEvents="box-none">
        {ev.kind === 'card' ? (
          <>
            <View style={{ width: cardW, height: cardW * CARD_RATIO }}>
              <Animated.View style={[styles.face, { transform: [{ perspective: 1000 }, { rotateY: backRot }] }]}>
                <CardBack width={cardW} />
              </Animated.View>
              <Animated.View
                style={[
                  styles.face,
                  styles.front,
                  { borderColor: level === 2 ? colors.backGold : level === 1 ? '#B8AEFF' : 'transparent' },
                  { transform: [{ perspective: 1000 }, { rotateY: frontRot }] },
                ]}
              >
                {ev.photoUri ? (
                  <Image source={{ uri: ev.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <View style={styles.noPhoto}>
                    <Text style={styles.noPhotoName}>{ev.card.name}</Text>
                  </View>
                )}
              </Animated.View>
              <Animated.View style={[styles.newBadge, { transform: [{ scale: pop }, { rotate: '-8deg' }] }]}>
                <Text style={styles.newText}>{ev.wished ? '찾던 카드!' : 'NEW!'}</Text>
              </Animated.View>
            </View>

            <Animated.View style={[styles.info, { opacity: pop }]}>
              <Text style={styles.title}>
                {ev.card.name}
                {ev.card.rarity ? <Text style={styles.rarity}> {ev.card.rarity}</Text> : null}
              </Text>
              <Text style={styles.sub}>
                {ev.wished ? '⭐ 찾던 카드를 드디어 넣었어요!' : '새 카드! 도감에 넣었어요'}
              </Text>
              {ev.total ? (
                <View style={styles.progress}>
                  <View style={styles.progressRow}>
                    <Text style={styles.setLabel} numberOfLines={1}>
                      {ev.setLabel}
                    </Text>
                    <Text style={styles.count}>
                      {ev.before} → {ev.after} / {ev.total}
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <Animated.View
                      style={[
                        styles.fill,
                        {
                          backgroundColor: complete ? '#3CC48D' : colors.backGold,
                          width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        },
                      ]}
                    />
                  </View>
                </View>
              ) : null}
            </Animated.View>

            {showTrophy ? (
              <Animated.View style={[styles.trophyBox, { transform: [{ scale: trophy }] }]}>
                <Text style={styles.trophy}>🏆</Text>
                <Text style={styles.trophyTitle}>세트 완성!</Text>
                <Text style={styles.sub}>
                  {ev.setLabel} {ev.total}장을 모두 모았어요
                </Text>
              </Animated.View>
            ) : null}
          </>
        ) : (
          <Animated.View style={[styles.badgeBox, { transform: [{ scale: pop }] }]}>
            <Text style={styles.badgeEmoji}>{ev.badge.emoji}</Text>
            <Text style={styles.badgeKicker}>배지를 받았어요</Text>
            <Text style={styles.trophyTitle}>{ev.badge.title}</Text>
            <Text style={styles.sub}>{ev.badge.desc}</Text>
          </Animated.View>
        )}

        <Pressable style={({ pressed }) => [styles.ok, pressed && { opacity: 0.7 }]} onPress={onClose}>
          <Text style={styles.okText}>좋아요!</Text>
        </Pressable>
      </View>

      {/* 종이꽃 */}
      <View style={styles.confettiOrigin} pointerEvents="none">
        {particles.map((p, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: p.w,
              height: p.round ? p.w : p.h,
              borderRadius: p.round ? p.w / 2 : 1.5,
              backgroundColor: p.color,
              opacity: burst.interpolate({ inputRange: [0, 0.05, 0.75, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
                {
                  translateY: burst.interpolate({
                    inputRange: [0, 0.3, 0.6, 1],
                    outputRange: [0, p.dy * 0.6, p.dy * 0.8 + 90, p.dy + 320],
                  }),
                },
                { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
              ],
            }}
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  rays: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 16, paddingHorizontal: 24, width: '100%' },
  face: { position: 'absolute', inset: 0, backfaceVisibility: 'hidden', borderRadius: 12, overflow: 'hidden' },
  front: { borderWidth: 3, backgroundColor: '#FBFAF5' },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  noPhotoName: { fontSize: 20, fontWeight: '800', color: '#1F1D2B', textAlign: 'center' },
  newBadge: {
    position: 'absolute',
    top: -14,
    right: -18,
    backgroundColor: '#E5533D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  newText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  info: { alignItems: 'center', gap: 6, width: '100%', maxWidth: 360 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  rarity: { color: colors.backGold, fontSize: 16, fontWeight: '800' },
  sub: { color: '#E6E3F5', fontSize: 14, textAlign: 'center' },
  progress: { width: '100%', gap: 6, marginTop: 6 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  setLabel: { color: '#CFCBE6', fontSize: 12, flex: 1 },
  count: { color: '#fff', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  trophyBox: { alignItems: 'center', gap: 4 },
  trophy: { fontSize: 56 },
  trophyTitle: { color: colors.backGold, fontSize: 30, fontWeight: '900' },
  badgeBox: { alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 28 },
  badgeEmoji: { fontSize: 72 },
  badgeKicker: { color: '#CFCBE6', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  ok: { marginTop: 8, backgroundColor: colors.backGold, paddingHorizontal: 34, paddingVertical: 13, borderRadius: 999 },
  okText: { color: '#1E1A4D', fontWeight: '900', fontSize: 16 },
  confettiOrigin: { position: 'absolute', top: '38%', left: '50%', width: 0, height: 0 },
});
