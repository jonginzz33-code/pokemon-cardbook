import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { UpdateBanner, VersionLine } from '@/components/UpdateBanner';
import { getEdition } from '@/data';
import { EDITIONS } from '@/data/labels';
import { lastBackupAt } from '@/store/backup';
import { useCollection } from '@/store/collection';
import { colors } from '@/theme';

export default function Home() {
  const col = useCollection();
  // 💾 백업 알림: 카드가 10개 넘게 쌓였는데 2주 넘게 백업을 안 했으면
  const recordCount = useMemo(() => Object.values(col.all).filter((e) => e.count > 0).length, [col.all]);
  const [lastBackup, setLastBackup] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    void lastBackupAt().then(setLastBackup);
  }, [recordCount]);
  const needBackup =
    lastBackup !== undefined && recordCount >= 10 && (lastBackup === null || Date.now() - lastBackup > 14 * 86400000);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <UpdateBanner />

      <Pressable onPress={() => router.push('/scan')} style={({ pressed }) => [styles.scan, pressed && styles.pressed]}>
        <Text style={styles.scanTitle}>📷 카드 찍어서 넣기</Text>
        <Text style={styles.scanSub}>사진을 찍으면 번호를 읽어 알맞은 칸에 자동으로 넣어요</Text>
      </Pressable>

      <View style={styles.quick}>
        <Pressable
          onPress={() => router.push('/search')}
          style={({ pressed }) => [styles.quickBtn, pressed && styles.pressed]}
        >
          <Text style={styles.quickText}>🔍 카드 검색</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/me')}
          style={({ pressed }) => [styles.quickBtn, pressed && styles.pressed]}
        >
          <Text style={styles.quickText}>📚 내 컬렉션</Text>
        </Pressable>
      </View>

      {needBackup ? (
        <Pressable
          onPress={() => router.push('/me/backup')}
          style={({ pressed }) => [styles.backup, pressed && styles.pressed]}
        >
          <Text style={styles.backupText}>
            💾 {lastBackup === null ? '아직 백업한 적이 없어요' : '백업한 지 2주가 넘었어요'} — 사진과 기록을 지키려면
            눌러서 백업하세요
          </Text>
        </Pressable>
      ) : null}

      <Text style={styles.lead}>어떤 판을 모으고 있나요?</Text>

      {EDITIONS.map((ed) => {
        const data = getEdition(ed.id);
        const sets = data.series.flatMap((s) => s.sets);
        let owned = 0;
        let total = 0;
        for (const set of sets) {
          const p = col.setProgress(ed.id, set);
          owned += p.owned;
          total += p.total;
        }
        return (
          <Pressable
            key={ed.id}
            onPress={() => router.push({ pathname: '/[edition]', params: { edition: ed.id } })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardHead}>
              <Text style={styles.flag}>{ed.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{ed.label}</Text>
                <Text style={styles.sub}>
                  {ed.sub} · 시리즈 {data.series.length}개 · 세트 {sets.length}개
                </Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </View>
            <ProgressBar owned={owned} total={total} />
          </Pressable>
        );
      })}

      <Text style={styles.disclaimer}>
        이 앱은 개인 수집 기록용 비공식 팬 앱이며, 포켓몬 카드 게임의 제작사·유통사와 관련이 없습니다. 카드 사진은 직접
        찍은 사진만 이 폰에 저장됩니다.
      </Text>
      <VersionLine />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  scan: { backgroundColor: colors.accent, borderRadius: 14, padding: 18, gap: 4 },
  scanTitle: { fontSize: 18, fontWeight: '800', color: colors.onAccent },
  scanSub: { fontSize: 13, color: colors.onAccentSub },
  quick: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  quickText: { fontSize: 15, fontWeight: '700', color: colors.text },
  backup: { backgroundColor: colors.warnSoft, borderRadius: 12, padding: 12 },
  backupText: { fontSize: 13, color: colors.warnText, lineHeight: 19 },
  lead: { fontSize: 15, color: colors.sub, marginBottom: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 12 },
  pressed: { opacity: 0.7 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flag: { fontSize: 30 },
  title: { fontSize: 19, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.sub, marginTop: 2 },
  chev: { fontSize: 28, color: colors.sub },
  disclaimer: { fontSize: 12, color: colors.sub, lineHeight: 18, marginTop: 12 },
});
