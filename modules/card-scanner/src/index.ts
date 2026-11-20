import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type Script = 'korean' | 'japanese' | 'latin';

interface CardScannerNative {
  /** 카드 촬영 (모서리 자동 인식 · 반듯하게 펴서 자르기). 취소하면 null */
  scanCard(): Promise<string | null>;
  /** 사진 속 글자를 줄 단위로 읽기 */
  recognizeText(uri: string, script: Script): Promise<string[]>;
}

const native = Platform.OS === 'android' ? requireOptionalNativeModule<CardScannerNative>('CardScanner') : null;

export const cardScannerAvailable = !!native;

export function scanCard(): Promise<string | null> {
  if (!native) return Promise.reject(new Error('카드 촬영은 안드로이드 앱에서만 돼요'));
  return native.scanCard();
}

export function recognizeText(uri: string, script: Script): Promise<string[]> {
  if (!native) return Promise.reject(new Error('글자 인식은 안드로이드 앱에서만 돼요'));
  return native.recognizeText(uri, script);
}
