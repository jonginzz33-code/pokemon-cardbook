import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { exportBackup, importBackup, lastBackupAt } from '@/store/backup';
import { useCollection } from '@/store/collection';
import { useWishlist } from '@/store/wishlist';
import { colors } from '@/theme';

// 💾 백업 · 복원 (메모 12)
export default function BackupScreen() {
  const col = useCollection();
  const wish = useWishlist();
  const [last, setLast] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    void lastBackupAt().then(setLast);
  }, [done]);

  const doExport = async () => {
    if (busy) return;
    setBusy('백업 파일 만드는 중…');
    setDone(null);
    try {
      const r = await exportBackup(col.all, wish.all, setBusy);
      setDone(`백업했어요: 기록 ${r.cards}개 · 사진 ${r.photos}장 · ${r.sizeMB.toFixed(1)}MB`);
    } catch (e) {
      Alert.alert('백업하지 못했어요', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doImport = () =>
    Alert.alert('백업에서 되살리기', '지금 폰에 있는 기록을 백업 파일 내용으로 바꿔요. 계속할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '되살리기',
        style: 'destructive',
        onPress: async () => {
          setBusy('백업 파일 읽는 중…');
          setDone(null);
          try {
            const r = await importBackup(setBusy);
            if (r) {
              col.replaceAll(r.collection);
              wish.replaceAll(r.wishlist);
              setDone(
                `되살렸어요: ${r.createdAt.slice(0, 10)} 백업 · 기록 ${Object.keys(r.collection).length}개 · 사진 ${r.photos}장`,
              );
            }
          } catch (e) {
            Alert.alert('되살리지 못했어요', e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);

  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;

  return (
    <>
      <Stack.Screen options={{ title: '백업 · 복원' }} />
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.box}>
          <Text style={styles.h}>왜 백업해야 하나요?</Text>
          <Text style={styles.p}>
            카드 사진과 기록은 이 폰 안에만 있어요. 앱을 지우거나 폰을 바꾸면 사라져요. 백업 파일 하나에 사진과 기록을
            모두 담아 구글 드라이브나 카톡 나에게 보내기로 저장해 두세요.
          </Text>
          <Text
            style={[styles.p, { fontWeight: '700', color: days === null || days > 14 ? colors.danger : colors.owned }]}
          >
            {days === null ? '아직 백업한 적이 없어요' : days === 0 ? '오늘 백업했어요' : `마지막 백업: ${days}일 전`}
          </Text>
        </View>

        <Pressable
          onPress={doExport}
          disabled={!!busy}
          style={({ pressed }) => [styles.btn, styles.primary, (pressed || busy) && { opacity: 0.6 }]}
        >
          <Text style={[styles.btnText, { color: colors.onAccent }]}>💾 백업 파일 만들어 저장하기</Text>
        </Pressable>
        <Text style={styles.hint}>만든 뒤 뜨는 창에서 '드라이브'나 '파일에 저장'을 고르세요.</Text>

        <Pressable
          onPress={doImport}
          disabled={!!busy}
          style={({ pressed }) => [styles.btn, (pressed || busy) && { opacity: 0.6 }]}
        >
          <Text style={styles.btnText}>📂 백업 파일에서 되살리기</Text>
        </Pressable>
        <Text style={styles.hint}>.cardbook 으로 끝나는 파일을 고르세요. 지금 기록은 백업 내용으로 바뀌어요.</Text>

        {busy ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.p}>{busy}</Text>
          </View>
        ) : null}
        {done ? <Text style={[styles.p, { color: colors.owned, fontWeight: '700' }]}>✅ {done}</Text> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 10, paddingBottom: 40 },
  box: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 8 },
  h: { fontSize: 15, fontWeight: '800', color: colors.text },
  p: { fontSize: 14, color: colors.sub, lineHeight: 21 },
  btn: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginTop: 6,
  },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  btnText: { fontSize: 16, fontWeight: '800', color: colors.text },
  hint: { fontSize: 12, color: colors.sub, paddingHorizontal: 4 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
});
