import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Collection } from './collection';
import type { Wishlist } from './wishlist';

// 💾 백업 · 복원 (메모 12)
// 파일 하나(.cardbook)에 보유 기록 + 찾는 카드 + 사진을 모두 담아요.
// 모양: "CARDBOOK1\n" + 목록 길이(숫자) + "\n" + 목록(JSON) + 사진1 바이트 + 사진2 바이트 …
// 사진을 하나씩 쓰고 읽어서, 사진이 수백 장이어도 메모리를 많이 쓰지 않아요.

const MAGIC = 'CARDBOOK1\n';
const LAST_KEY = 'cardbook.lastBackup';
const photoDir = () => new Directory(Paths.document, 'card-photos');

interface Manifest {
  app: 'cardbook';
  version: 1;
  createdAt: string;
  collection: Collection;
  wishlist: Wishlist;
  photos: { name: string; size: number }[];
}

// Hermes 에 TextEncoder/Decoder 가 없을 수도 있어 직접 (UTF-8)
function utf8Encode(s: string): Uint8Array {
  const out: number[] = [];
  for (const ch of s) {
    let c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else {
      c = Math.min(c, 0x10ffff);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return Uint8Array.from(out);
}
function utf8Decode(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; ) {
    const c = b[i++];
    let cp: number;
    if (c < 0x80) cp = c;
    else if (c < 0xe0) cp = ((c & 31) << 6) | (b[i++] & 63);
    else if (c < 0xf0) cp = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else cp = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    s += String.fromCodePoint(cp);
  }
  return s;
}

export async function lastBackupAt(): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(LAST_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

/** 백업 파일을 만들고 공유 창(드라이브 · 카톡 · 파일 저장)을 열어요. 사진 장수를 돌려줘요. */
export async function exportBackup(collection: Collection, wishlist: Wishlist, onProgress?: (msg: string) => void) {
  const dir = photoDir();
  const names = [
    ...new Set(
      Object.values(collection)
        .map((e) => e.photo)
        .filter((p): p is string => !!p),
    ),
  ];
  const photos: { name: string; size: number; file: File }[] = [];
  for (const name of names) {
    const f = new File(dir, name);
    if (f.exists) photos.push({ name, size: f.size, file: f });
  }
  const manifest: Manifest = {
    app: 'cardbook',
    version: 1,
    createdAt: new Date().toISOString(),
    collection,
    wishlist,
    photos: photos.map(({ name, size }) => ({ name, size })),
  };
  const body = utf8Encode(JSON.stringify(manifest));
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const out = new File(Paths.cache, `카드도감-백업-${stamp}.cardbook`);
  if (out.exists) out.delete();
  out.create();
  const h = out.open(FileMode.WriteOnly);
  try {
    h.writeBytesSync(utf8Encode(`${MAGIC}${body.length}\n`));
    h.writeBytesSync(body);
    for (let i = 0; i < photos.length; i++) {
      onProgress?.(`사진 담는 중 ${i + 1} / ${photos.length}`);
      h.writeBytesSync(await photos[i].file.bytes());
    }
  } finally {
    h.close();
  }
  await Sharing.shareAsync(out.uri, { dialogTitle: '카드 도감 백업 파일 저장', mimeType: 'application/octet-stream' });
  await AsyncStorage.setItem(LAST_KEY, String(Date.now())).catch(() => {});
  return { photos: photos.length, cards: Object.keys(collection).length, sizeMB: out.size / 1048576 };
}

export interface RestoreData {
  collection: Collection;
  wishlist: Wishlist;
  createdAt: string;
  photos: number;
}

/** 백업 파일을 골라 읽고 사진을 앱 폴더에 되살려요. 취소하면 null. (기록 바꾸기는 부르는 쪽에서) */
export async function importBackup(onProgress?: (msg: string) => void): Promise<RestoreData | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.length) return null;
  const file = new File(res.assets[0].uri);
  const h = file.open(FileMode.ReadOnly);
  try {
    const magic = utf8Decode(h.readBytesSync(MAGIC.length));
    if (magic !== MAGIC) throw new Error('카드 도감 백업 파일이 아니에요 (.cardbook 파일을 골라 주세요)');
    let lenStr = '';
    for (let i = 0; i < 20; i++) {
      const b = h.readBytesSync(1)[0];
      if (b === 10) break;
      lenStr += String.fromCharCode(b);
    }
    const manifest = JSON.parse(utf8Decode(h.readBytesSync(Number(lenStr)))) as Manifest;
    if (manifest.app !== 'cardbook') throw new Error('카드 도감 백업 파일이 아니에요');
    const dir = photoDir();
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    for (let i = 0; i < manifest.photos.length; i++) {
      const p = manifest.photos[i];
      onProgress?.(`사진 되살리는 중 ${i + 1} / ${manifest.photos.length}`);
      const bytes = h.readBytesSync(p.size);
      const dest = new File(dir, p.name);
      if (dest.exists) dest.delete();
      dest.create();
      dest.write(bytes);
    }
    return {
      collection: manifest.collection ?? {},
      wishlist: manifest.wishlist ?? {},
      createdAt: manifest.createdAt,
      photos: manifest.photos.length,
    };
  } finally {
    h.close();
  }
}
