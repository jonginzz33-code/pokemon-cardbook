import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';

import {
  cancelDownload,
  checkLatest,
  currentBuild,
  downloadAndInstall,
  isNewer,
  selfUpdateEnabled,
  type LatestInfo,
} from './updater';

// 앱 안 업데이트 상태를 화면 여러 곳(왼쪽 위 버튼 · 홈 배너)이 같이 씁니다.
// 앱을 켤 때, 그리고 다른 앱에 갔다가 돌아올 때마다(1분에 한 번까지) 새 버전을 확인해요.

type Status =
  | { s: 'idle' }
  | { s: 'checking' }
  | { s: 'latest' }
  | { s: 'available'; info: LatestInfo }
  | { s: 'downloading'; info: LatestInfo; ratio: number; mb: number };

interface UpdateApi {
  enabled: boolean;
  status: Status;
  /** 새 버전 확인. manual 이면 결과를 알림창으로 알려 줘요 */
  check: (manual?: boolean) => Promise<void>;
  /** 새 버전 받고 설치 화면 열기 */
  install: () => Promise<void>;
  cancel: () => void;
}

const Ctx = createContext<UpdateApi | null>(null);
const RECHECK_MS = 60_000;

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>({ s: 'idle' });
  const statusRef = useRef(status);
  statusRef.current = status;
  const lastCheck = useRef(0);

  const check = useCallback(async (manual = false) => {
    if (!selfUpdateEnabled) return;
    const cur = statusRef.current;
    if (cur.s === 'downloading' || cur.s === 'checking') return;
    lastCheck.current = Date.now();
    setStatus({ s: 'checking' });
    try {
      const info = await checkLatest();
      if (info && isNewer(info)) {
        setStatus({ s: 'available', info });
        if (manual) {
          Alert.alert('새 버전이 있어요', `${info.name}\n(지금 빌드 ${currentBuild})`, [
            { text: '나중에', style: 'cancel' },
            { text: '지금 업데이트', onPress: () => void installInfo(info) },
          ]);
        }
      } else {
        setStatus({ s: 'latest' });
        if (manual) Alert.alert('최신 버전이에요', `지금 빌드 ${currentBuild}`);
      }
    } catch (e) {
      setStatus(cur.s === 'available' ? cur : { s: 'idle' });
      if (manual) Alert.alert('업데이트 확인 실패', e instanceof Error ? e.message : '인터넷 연결을 확인해 주세요.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const installInfo = useCallback(async (info: LatestInfo) => {
    setStatus({ s: 'downloading', info, ratio: 0, mb: 0 });
    try {
      await downloadAndInstall(info, (ratio, mb) => setStatus({ s: 'downloading', info, ratio, mb }));
      setStatus({ s: 'available', info });
    } catch (e) {
      setStatus({ s: 'available', info });
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('취소')) Alert.alert('업데이트를 받지 못했어요', msg);
    }
  }, []);

  const install = useCallback(async () => {
    const cur = statusRef.current;
    if (cur.s === 'available') await installInfo(cur.info);
    else await check(true);
  }, [check, installInfo]);

  // 앱을 켤 때 + 앱으로 돌아올 때
  useEffect(() => {
    if (!selfUpdateEnabled) return;
    check(false);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && Date.now() - lastCheck.current > RECHECK_MS) check(false);
    });
    return () => sub.remove();
  }, [check]);

  return (
    <Ctx.Provider value={{ enabled: selfUpdateEnabled, status, check, install, cancel: cancelDownload }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUpdate() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUpdate must be used inside UpdateProvider');
  return v;
}
