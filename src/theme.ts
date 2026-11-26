import { Appearance } from 'react-native';

import type { EditionId } from '@/data/types';

// 🎨 아기자기 화면 (메모 21) · 시안: https://claude.ai/artifact/3d2AcQRWwF1w5CnVg2H3E7
// 밝게 = A안 말랑 스티커북(연보라) · 어둡게 = B안 밤하늘(남색 + 금색)
// 폰 테마를 따라요. 쓰는 중에 폰 테마를 바꾸면 앱을 한 번 다시 불러와서 맞춰요 (_layout.tsx).
const light = {
  bg: '#F7F4FF',
  surface: '#FFFFFF',
  text: '#2B2545',
  sub: '#7A7491',
  line: '#E6E0FA',
  /** 둥근 카드 아래 살짝 깔리는 그림자 색 */
  shadow: '#ECE7FB',
  accent: '#7C6CF2',
  accentDeep: '#5E4FD0',
  accentSoft: '#EDE9FF',
  onAccent: '#FFFFFF',
  onAccentSub: '#E7E3FF',
  owned: '#2E9E72',
  okSoft: '#CFF3E4',
  okLine: '#A8E3CB',
  danger: '#E5533D',
  warnSoft: '#FFF1C2',
  warnText: '#8A6508',
  star: '#E8B31B',
  // 바로가기 칸
  skySoft: '#DDEBFF',
  skyInk: '#2D5BB8',
  peachSoft: '#FFE9D6',
  peachInk: '#A8521B',
  // 연출 (항상 어두운 막 위)
  backDeep: '#1E1A4D',
  backMid: '#3A2F8F',
  backGold: '#E8C25A',
  overlay: 'rgba(20,16,48,0.82)',
};

const dark: typeof light = {
  bg: '#1B1744',
  surface: '#262066',
  text: '#F4F1FF',
  sub: '#B9B3E6',
  line: '#3A3480',
  shadow: '#15123A',
  accent: '#F2C94C',
  accentDeep: '#C9A132',
  accentSoft: '#2E2780',
  onAccent: '#1B1744',
  onAccentSub: '#3A3062',
  owned: '#3CC48D',
  okSoft: '#16362A',
  okLine: '#245A44',
  danger: '#FF7A6B',
  warnSoft: '#3A3015',
  warnText: '#F0D28A',
  star: '#F2C94C',
  skySoft: '#2E2780',
  skyInk: '#DDEBFF',
  peachSoft: '#2E2780',
  peachInk: '#FFE9D6',
  backDeep: '#1E1A4D',
  backMid: '#3A2F8F',
  backGold: '#E8C25A',
  overlay: 'rgba(8,6,20,0.86)',
};

export const isDark = Appearance.getColorScheme() === 'dark';
export const colors = isDark ? dark : light;

/** 글꼴: 제목 · 버튼 = 주아(동글동글), 본문 = 고운돋움 */
export const fonts = {
  title: 'Jua_400Regular',
  body: 'GowunDodum_400Regular',
};

/** 판별 스티커 색 (한 = 복숭아 · 日 = 분홍 · EN = 하늘) */
export const editionTint: Record<EditionId, { soft: string; ink: string; bar: string; mark: string }> = {
  ko: { soft: isDark ? '#FF8A73' : '#FFE3E0', ink: isDark ? '#1B1744' : '#D9503C', bar: '#FF8A73', mark: '한' },
  ja: { soft: isDark ? '#F27AAA' : '#FFE4EF', ink: isDark ? '#1B1744' : '#C93D74', bar: '#F27AAA', mark: '日' },
  en: { soft: isDark ? '#6FA0F2' : '#DDEBFF', ink: isDark ? '#1B1744' : '#3F73D9', bar: '#6FA0F2', mark: 'EN' },
};

/** 세트 코드 도장 색 (세트마다 돌아가며) */
export const stampTints = [
  { soft: '#EDE9FF', ink: '#5B4BD6', ring: '#7C6CF2' },
  { soft: '#FFE3E0', ink: '#D9503C', ring: '#FF8A73' },
  { soft: '#CFF3E4', ink: '#1F7A55', ring: '#3CC48D' },
  { soft: '#FFF1C2', ink: '#8A6508', ring: '#E8B31B' },
  { soft: '#DDEBFF', ink: '#2D5BB8', ring: '#6FA0F2' },
  { soft: '#FFE4EF', ink: '#C93D74', ring: '#F27AAA' },
];

/** 둥근 카드 공통: 모서리 + 아래 그림자 한 줄 */
export const softCard = {
  backgroundColor: colors.surface,
  borderRadius: 22,
  borderBottomWidth: 3,
  borderBottomColor: colors.shadow,
} as const;

/** 카드 비율 63 × 88 */
export const CARD_RATIO = 88 / 63;
