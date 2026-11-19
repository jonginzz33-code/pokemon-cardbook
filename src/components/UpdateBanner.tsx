import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';
import {
  cancelDownload,
  checkLatest,
  currentBuild,
  currentVersion,
  downloadAndInstall,
  isNewer,
  selfUpdateEnabled,
  type LatestInfo,
} from '@/update/updater';

type State =
  | { s: 'idle' }
  | { s: 'checking' }
  | { s: 'latest' }
  | { s: 'available'; info: LatestInfo }
  | { s: 'downloading'; info: LatestInfo; ratio: number; mb: number };

/** 홈 화면 맨 위: 새 버전이 있으면 알려주고 바로 받아 설치. 앱을 켤 때마다 한 번 확인합니다. */
export function UpdateBanner() {
  const [st, setSt] = useState<State>({ s: 'idle' });

  const check = useCallback(async (manual: boolean) => {
    setSt({ s: 'checking' });
    try {
      const info = await checkLatest();
      if (info && isNewer(info)) setSt({ s: 'available', info });
      else setSt({ s: 'latest' });
    } catch (e) {
      setSt({ s: 'idle' });
      if (manual) Alert.alert('업데이트 확인 실패', e instanceof Error ? e.message : '인터넷 연결을 확인해 주세요.');
    }
  }, []);

  useEffect(() => {
    if (selfUpdateEnabled) check(false);
  }, [check]);

  const install = async (info: LatestInfo) => {
    setSt({ s: 'downloading', info, ratio: 0, mb: 0 });
    try {
      await downloadAndInstall(info, (ratio, mb) => setSt({ s: 'downloading', info, ratio, mb }));
      setSt({ s: 'available', info });
    } catch (e) {
      setSt({ s: 'available', info });
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('취소')) Alert.alert('업데이트를 받지 못했어요', msg);
    }
  };

  if (!selfUpdateEnabled) return null;

  if (st.s === 'available' || st.s === 'downloading') {
    const { info } = st;
    return (
      <View style={styles.banner}>
        <Text style={styles.title}>🆕 새 버전이 있어요</Text>
        <Text style={styles.sub}>
          {info.name}
          {info.sizeMB ? ` · ${info.sizeMB}MB` : ''} (지금 빌드 {currentBuild})
        </Text>
        {st.s === 'downloading' ? (
          <>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(st.ratio * 100)}%` }]} />
            </View>
            <View style={styles.row}>
              <Text style={styles.sub}>
                받는 중 {Math.round(st.ratio * 100)}% ({st.mb.toFixed(1)}MB)
              </Text>
              <Pressable onPress={cancelDownload}>
                <Text style={styles.link}>취소</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]} onPress={() => install(info)}>
            <Text style={styles.btnText}>지금 업데이트</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return null;
}

/** 홈 화면 아래: 지금 버전 + 손으로 업데이트 확인 */
export function VersionLine() {
  const [msg, setMsg] = useState('');
  const onPress = async () => {
    if (!selfUpdateEnabled) return;
    setMsg('확인 중…');
    try {
      const info = await checkLatest();
      setMsg(
        isNewer(info)
          ? `새 버전 빌드 ${info!.build} 있음 — 앱을 다시 켜면 위에 업데이트 버튼이 나와요`
          : '최신 버전이에요',
      );
    } catch {
      setMsg('확인 실패 — 인터넷 연결을 확인해 주세요');
    }
  };
  return (
    <Pressable onPress={onPress} disabled={!selfUpdateEnabled}>
      <Text style={styles.version}>
        버전 {currentVersion} (빌드 {currentBuild}){selfUpdateEnabled ? ' · 업데이트 확인' : ''}
        {msg ? `\n${msg}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#E6F6EE', borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: '#BFE6D2' },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.sub },
  btn: { backgroundColor: colors.owned, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#CDE9DA', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.owned },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.danger, fontWeight: '700' },
  version: { fontSize: 12, color: colors.sub, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
