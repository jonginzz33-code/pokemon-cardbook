import { extractTextFromImage, isSupported } from 'expo-text-extractor';

import { getEdition } from '@/data';
import type { Card, CardSet, EditionId, Series } from '@/data/types';

export const ocrSupported = isSupported;

/** 사진에서 글자를 읽습니다 (폰 안에서 Google ML Kit으로, 인터넷 없이). */
export async function readText(uri: string): Promise<string[]> {
  // 모듈이 file:// 없는 경로를 기대해요.
  const path = uri.startsWith('file://') ? decodeURI(uri.slice('file://'.length)) : uri;
  return extractTextFromImage(path);
}

export interface ReadInfo {
  /** 카드 번호 (예: 25) — "025/165" 의 앞쪽 */
  number?: number;
  /** 세트 공식 장수 (예: 165) — "025/165" 의 뒤쪽 */
  total?: number;
  /** 읽은 글자 전체 (한 줄로) */
  text: string;
}

export interface Candidate {
  series: Series;
  set: CardSet;
  card: Card;
  score: number;
  /** 왜 이 카드로 봤는지 */
  reasons: string[];
}

// OCR이 숫자를 글자로 잘못 읽는 흔한 경우를 고칩니다.
const fixDigits = (s: string) =>
  s.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1').replace(/[Ss]/g, '5').replace(/B/g, '8');

/** 읽은 글자에서 "번호/총장수" 를 찾습니다. 카드 아래쪽에 있는 경우가 많아 뒤에서부터 봅니다. */
export function parseNumber(lines: string[]): ReadInfo {
  const text = lines.join(' ').replace(/\s+/g, ' ').trim();
  const re = /(?<![0-9A-Za-z])([0-9OoIl|SB]{1,3})\s*\/\s*([0-9OoIl|SB]{2,3})(?![0-9])/g;
  let best: { number: number; total: number } | undefined;
  for (const m of text.matchAll(re)) {
    const number = parseInt(fixDigits(m[1]), 10);
    const total = parseInt(fixDigits(m[2]), 10);
    if (!Number.isFinite(number) || !Number.isFinite(total) || total < 10) continue;
    // 체력 "HP 120/..." 같은 건 드물지만, 번호가 총장수보다 크게 벗어나면 거름 (시크릿은 조금 더 클 수 있음)
    if (number === 0 || number > total * 2) continue;
    best = { number, total };
  }
  return { text, ...best };
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\-·・'’.]/g, '');

/** 읽은 내용으로 그 판의 카드 후보를 점수순으로 찾습니다. */
export function findCandidates(edition: EditionId, lines: string[]): { info: ReadInfo; candidates: Candidate[] } {
  const info = parseNumber(lines);
  const textNorm = norm(info.text);
  const tokens = new Set(info.text.split(/[^0-9A-Za-z]+/).map((t) => t.toLowerCase()));

  const out: Candidate[] = [];
  for (const series of getEdition(edition).series) {
    for (const set of series.sets) {
      const codeHit = !!set.code && tokens.has(set.code.toLowerCase());
      const totalHit = info.total !== undefined && set.officialCount === info.total;
      for (const card of set.cards) {
        const reasons: string[] = [];
        let score = 0;
        const numHit = info.number !== undefined && parseInt(card.number, 10) === info.number;
        if (numHit) {
          score += 2;
          reasons.push(`번호 ${info.number}`);
          if (totalHit) {
            score += 2;
            reasons.push(`총 ${info.total}장`);
          }
          if (codeHit) {
            score += 3;
            reasons.push(`세트 ${set.code}`);
          }
        }
        const name = norm(card.name);
        if (name.length >= 3 && textNorm.includes(name)) {
          score += 3;
          reasons.push('이름');
        }
        if (score >= 2) out.push({ series, set, card, score, reasons });
      }
    }
  }
  out.sort((a, b) => b.score - a.score);
  return { info, candidates: out.slice(0, 8) };
}

/** 맨 위 후보 하나로 확실히 정할 수 있는지: 번호 + (총장수 또는 세트 코드 또는 이름)이 맞고, 2등보다 확실히 높을 때 */
export function confidentPick(candidates: Candidate[]): Candidate | null {
  const [a, b] = candidates;
  if (!a || a.score < 4) return null;
  if (b && b.score >= a.score) return null;
  return a;
}
