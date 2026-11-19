import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { DownloadTask, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

// 앱 안 업데이트 (화장실 앱과 같은 방식)
// GitHub Releases 'latest' 의 본문에 적힌 versionCode=N 과 내 앱 빌드 번호를 비교해서,
// 새 버전이면 cardbook.apk 를 받아 안드로이드 설치 화면을 띄웁니다.
// 플레이 스토어용 빌드(STORE_BUILD=1)에서는 꺼집니다 — 스토어가 업데이트를 맡아요.

const REPO = 'jonginzz33-code/pokemon-cardbook';
const FIXED_APK = `https://github.com/${REPO}/releases/latest/download/cardbook.apk`;

export const selfUpdateEnabled =
  Platform.OS === 'android' &&
  (Constants.expoConfig?.extra as { selfUpdate?: boolean } | undefined)?.selfUpdate === true;

/** 지금 설치된 앱의 빌드 번호 (versionCode) */
export const currentBuild = Number(Application.nativeBuildVersion) || 0;
export const currentVersion = Application.nativeApplicationVersion ?? '';

export interface LatestInfo {
  build: number;
  name: string;
  apkUrl: string;
  sizeMB?: number;
}

export async function checkLatest(): Promise<LatestInfo | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`업데이트 확인 실패 (${res.status})`);
  const o = (await res.json()) as {
    name?: string;
    body?: string;
    assets?: { name: string; browser_download_url: string; size: number }[];
  };
  const build = Number(/versionCode=(\d+)/.exec(o.body ?? '')?.[1] ?? 0);
  if (!build) return null;
  const apk = o.assets?.find((a) => a.name === 'cardbook.apk');
  return {
    build,
    name: o.name ?? `빌드 ${build}`,
    apkUrl: apk?.browser_download_url ?? FIXED_APK,
    sizeMB: apk ? Math.round(apk.size / 1048576) : undefined,
  };
}

export const isNewer = (info: LatestInfo | null) => !!info && info.build > currentBuild;

let running: DownloadTask | null = null;

/** 새 APK 를 받고 설치 화면을 엽니다. onProgress(0~1, 받은 MB) */
export async function downloadAndInstall(info: LatestInfo, onProgress: (ratio: number, mb: number) => void) {
  const dest = new File(Paths.cache, 'cardbook-update.apk');
  if (dest.exists) dest.delete();

  const task = new DownloadTask(info.apkUrl, dest);
  running = task;
  const sub = task.addListener('progress', (p) => {
    onProgress(p.totalBytes > 0 ? p.bytesWritten / p.totalBytes : 0, p.bytesWritten / 1048576);
  });
  try {
    const file = await task.downloadAsync();
    if (!file) throw new Error('받기를 취소했어요');
    // 안드로이드 설치 화면. 처음이면 '이 출처의 앱 허용'을 켜라는 화면이 먼저 나와요.
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: file.contentUri,
      type: 'application/vnd.android.package-archive',
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    });
  } finally {
    sub.remove();
    running = null;
  }
}

export function cancelDownload() {
  running?.cancel();
}
