import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';
import { useUpdate } from '@/update/UpdateContext';
import { currentBuild, currentVersion } from '@/update/updater';

/** 화면 왼쪽 맨 위 🔄 버튼. 새 버전이 있으면 빨간 점, 누르면 확인하거나 바로 업데이트. */
export function UpdateButton() {
  const { enabled, status, install } = useUpdate();
  if (!enabled) return null;
  const busy = status.s === 'checking' || status.s === 'downloading';
  const hasNew = status.s === 'available' || status.s === 'downloading';
  return (
    <Pressable
      onPress={() => void install()}
      disabled={busy}
      hitSlop={10}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}
      accessibilityLabel={hasNew ? '새 버전 업데이트' : '업데이트 확인'}
    >
      {busy ? <ActivityIndicator size="small" color={colors.accent} /> : <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
          <Path d="M4 3v5h5" />
          <Path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
          <Path d="M20 21v-5h-5" />
        </Svg>}
      {hasNew ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

/** 홈 화면 맨 위: 새 버전이 있으면 알려주고 바로 받아 설치. */
export function UpdateBanner() {
  const { enabled, status, install, cancel } = useUpdate();
  if (!enabled || (status.s !== 'available' && status.s !== 'downloading')) return null;
  const { info } = status;
  return (
    <View style={styles.banner}>
      <Text style={styles.title}>🆕 새 버전이 있어요</Text>
      <Text style={styles.sub}>
        {info.name}
        {info.sizeMB ? ` · ${info.sizeMB}MB` : ''} (지금 빌드 {currentBuild})
      </Text>
      {status.s === 'downloading' ? (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(status.ratio * 100)}%` }]} />
          </View>
          <View style={styles.row}>
            <Text style={styles.sub}>
              받는 중 {Math.round(status.ratio * 100)}% ({status.mb.toFixed(1)}MB)
            </Text>
            <Pressable onPress={cancel}>
              <Text style={styles.link}>취소</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Pressable style={({ pressed }) => [styles.cta, pressed && { opacity: 0.7 }]} onPress={() => void install()}>
          <Text style={styles.ctaText}>지금 업데이트</Text>
        </Pressable>
      )}
    </View>
  );
}

/** 홈 화면 아래: 지금 버전 */
export function VersionLine() {
  const { enabled, check } = useUpdate();
  return (
    <Pressable onPress={() => void check(true)} disabled={!enabled}>
      <Text style={styles.version}>
        버전 {currentVersion} (빌드 {currentBuild}){enabled ? ' · 업데이트 확인' : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.shadow,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  btnIcon: { fontSize: 22 },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  banner: {
    backgroundColor: colors.okSoft,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.okLine,
  },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.sub },
  cta: { backgroundColor: colors.owned, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: colors.onAccent, fontSize: 15, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.okLine, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.owned },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.danger, fontWeight: '700' },
  version: { fontSize: 12, color: colors.sub, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
