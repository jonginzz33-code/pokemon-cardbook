import { Appearance } from 'react-native';

// 폰 테마(밝게/어둡게)를 따라요. 앱을 쓰는 중에 폰 테마를 바꾸면 앱을 한 번 다시 불러와서 맞춰요 (_layout.tsx).
const light = {
  bg: '#F4F2EE',
  surface: '#FFFFFF',
  text: '#1F1D2B',
  sub: '#6B6878',
  line: '#E4E0D8',
  accent: '#4B3FD1',
  accentSoft: '#E9E6FF',
  onAccent: '#FFFFFF',
  onAccentSub: '#E3E0FF',
  owned: '#1F9D6B',
  okSoft: '#E6F6EE',
  okLine: '#BFE6D2',
  danger: '#D2483A',
  warnSoft: '#FFF4D6',
  warnText: '#7A5B00',
  // 카드 뒷면 · 연출
  backDeep: '#1E1A4D',
  backMid: '#3A2F8F',
  backGold: '#E8C25A',
  overlay: 'rgba(20,16,48,0.82)',
};

const dark: typeof light = {
  bg: '#14121C',
  surface: '#201D2C',
  text: '#F1EFF8',
  sub: '#A5A1B8',
  line: '#34304A',
  accent: '#7C70F5',
  accentSoft: '#2C2752',
  onAccent: '#FFFFFF',
  onAccentSub: '#DDD9FF',
  owned: '#3CC48D',
  okSoft: '#16362A',
  okLine: '#245A44',
  danger: '#FF6B5C',
  warnSoft: '#3A3015',
  warnText: '#F0D28A',
  backDeep: '#1E1A4D',
  backMid: '#3A2F8F',
  backGold: '#E8C25A',
  overlay: 'rgba(8,6,20,0.86)',
};

export const isDark = Appearance.getColorScheme() === 'dark';
export const colors = isDark ? dark : light;

/** 카드 비율 63 × 88 */
export const CARD_RATIO = 88 / 63;
