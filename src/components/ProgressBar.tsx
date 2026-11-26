import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, fonts } from '@/theme';

/** 둥근 막대 진행률 */
export function ProgressBar({
  owned,
  total,
  compact,
  color,
}: {
  owned: number;
  total: number;
  compact?: boolean;
  color?: string;
}) {
  const pct = total > 0 ? owned / total : 0;
  const done = total > 0 && owned === total;
  return (
    <View style={styles.row}>
      <View style={[styles.track, compact && styles.trackCompact]}>
        <View
          style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: done ? colors.owned : (color ?? colors.accent) }]}
        />
      </View>
      <Text style={[styles.label, compact && styles.labelCompact]}>
        {owned.toLocaleString()} / {total.toLocaleString()}
        {done ? ' 완성!' : ''}
      </Text>
    </View>
  );
}

/** 동그라미 진행률 (가운데 글자) */
export function ProgressRing({
  owned,
  total,
  size = 52,
  stroke = 6,
  color = colors.accent,
  label,
  labelSize = 11,
}: {
  owned: number;
  total: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  labelSize?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, owned / total) : 0;
  const done = total > 0 && owned >= total;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.line} strokeWidth={stroke} />
        {pct > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={done ? colors.owned : color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${pct * c} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>
        <Text style={[styles.ringText, { fontSize: labelSize }]} numberOfLines={1}>
          {label ?? `${owned}/${total}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden' },
  trackCompact: { height: 8 },
  fill: { height: '100%', borderRadius: 5 },
  label: { fontSize: 13, fontFamily: fonts.title, color: colors.text, minWidth: 64, textAlign: 'right' },
  labelCompact: { fontSize: 12, color: colors.sub },
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  ringText: { fontFamily: fonts.title, color: colors.text },
});
