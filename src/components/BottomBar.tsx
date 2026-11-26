import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, fonts } from '@/theme';

// 아래 메뉴 (홈 · 검색 · 가운데 큰 카메라 · 찾는 카드 · 컬렉션)
type Tab = 'home' | 'search' | 'wish' | 'me';

export const BOTTOM_BAR_SPACE = 110;

function Icon({ name, on }: { name: Tab; on: boolean }) {
  const c = on ? colors.accent : colors.sub;
  if (name === 'home')
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill={on ? c : 'none'} stroke={c} strokeWidth={on ? 0 : 2.2} strokeLinejoin="round" />
      </Svg>
    );
  if (name === 'search')
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round">
        <Circle cx="11" cy="11" r="6.5" />
        <Path d="M16 16l4.5 4.5" />
      </Svg>
    );
  if (name === 'wish')
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6L12 16.3 6.6 19.3l1.3-6L3.3 9.2l6.1-.6z" fill={on ? c : 'none'} stroke={c} strokeWidth={2.2} strokeLinejoin="round" />
      </Svg>
    );
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5h6v14H4z" />
      <Path d="M10 5h5v14h-5z" />
      <Path d="M15.5 6l4-1 3 13-4 1z" />
    </Svg>
  );
}

export function CameraIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx="12" cy="13" r="3.5" />
    </Svg>
  );
}

export function BottomBar({ active, edition }: { active?: Tab; edition?: string }) {
  const insets = useSafeAreaInsets();
  const item = (tab: Tab, label: string, go: () => void) => (
    <Pressable onPress={go} style={styles.item} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={tab} on={active === tab} />
      <Text style={[styles.label, active === tab && { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.wrap, { bottom: 14 + insets.bottom }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {item('home', '홈', () => router.dismissTo('/'))}
        {item('search', '검색', () => router.push({ pathname: '/search', params: edition ? { edition } : {} }))}
        <View style={styles.item}>
          <Pressable
            onPress={() => router.push({ pathname: '/scan', params: edition ? { edition } : {} })}
            style={({ pressed }) => [styles.camera, pressed && { transform: [{ translateY: 2 }] }]}
            accessibilityRole="button"
            accessibilityLabel="카드 찍기"
          >
            <CameraIcon color={colors.onAccent} />
          </Pressable>
        </View>
        {item('wish', '찾는 카드', () => router.push('/me/wishlist'))}
        {item('me', '컬렉션', () => router.push('/me'))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14 },
  bar: {
    height: 66,
    backgroundColor: colors.surface,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#5B4BD6',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, height: '100%' },
  label: { fontSize: 11, color: colors.sub, fontFamily: fonts.title },
  camera: {
    width: 62,
    height: 62,
    marginTop: -30,
    borderRadius: 31,
    backgroundColor: colors.accent,
    borderWidth: 5,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 8,
    borderBottomColor: colors.accentDeep,
  },
});
