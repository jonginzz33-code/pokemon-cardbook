import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

import { CARD_RATIO } from '@/theme';

/**
 * 아직 없는 카드 자리 = '말랑 물음표' (메모 21, 시안 6번).
 * 살구 바탕 + 물방울 점 + 가운데 흰 말랑 덩어리 위 큰 '?'. 칸이 크면 아래에 '누굴까?'.
 * 공식 카드 뒷면이 아닌 이 앱만의 그림이에요.
 */
export function CardBack({ width }: { width: number }) {
  const height = width * CARD_RATIO;
  const big = width >= 140;
  return (
    <Svg width={width} height={height} viewBox="0 0 63 88">
      {/* 바탕 + 흰 테두리 + 아래 그림자 */}
      <Rect x="0" y="1.2" width="63" height="86.8" rx="6" fill="#F7D3B5" />
      <Rect x="0" y="0" width="63" height="86.6" rx="6" fill="#FFFFFF" />
      <Rect x="1.3" y="1.3" width="60.4" height="84" rx="5" fill="#FFE9D6" />
      {/* 물방울 점 */}
      <Circle cx="10" cy="12" r="2.4" fill="#FFD3B0" />
      <Circle cx="53" cy="10" r="1.6" fill="#FFD3B0" />
      <Circle cx="7.5" cy="50" r="1.6" fill="#FFD3B0" />
      <Circle cx="56" cy="62" r="2.8" fill="#FFD3B0" />
      <Circle cx="16" cy="78" r="2" fill="#FFD3B0" />
      <Circle cx="48" cy="80" r="1.6" fill="#FFD3B0" />
      {/* 말랑 덩어리 */}
      <Path
        d="M31.5 21.5 C46 21.5 49.5 32.5 47 43.5 C44.5 55 37.8 62.5 31.5 62.5 C21.8 62.5 14.3 55 15.1 42.6 C15.9 30.8 20.1 21.5 31.5 21.5 Z"
        fill="#FFFFFF"
      />
      <SvgText x="31.5" y="51" fontSize="24" fontWeight="bold" fill="#FF9A5C" textAnchor="middle">
        ?
      </SvgText>
      {big ? (
        <SvgText x="31.5" y="78" fontSize="6.2" fontWeight="bold" fill="#C66A2C" textAnchor="middle">
          누굴까?
        </SvgText>
      ) : null}
    </Svg>
  );
}
