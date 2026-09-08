// Deterministic identifiers — jd owns. No model calls (§3.1: same transcript ⇒ same ids).
import type { Utterance } from './types.js';

/** Parse "발언자: 내용" transcript into utterances with stable u-NNN ids (document order). */
export function parseTranscript(text: string): Utterance[] {
  const out: Utterance[] = [];
  for (const raw of (text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(.{1,15}?)\s*[:：]\s*(.*)$/);
    const who = m ? m[1].trim() : '';
    const textPart = m ? m[2].trim() : line;
    out.push({ id: `u-${String(out.length + 1).padStart(3, '0')}`, who, text: textPart });
  }
  return out;
}

/** 요구 항목 번호 R-NN / 제약 항목 번호 C-NN (문서 내 상호참조·추적용). */
export const reqNumber = (n: number) => `R-${String(n).padStart(2, '0')}`;
export const constraintNumber = (n: number) => `C-${String(n).padStart(2, '0')}`;

/** 마크다운 문서에서 근거 발언 id(u-NNN)를 유일·정렬 추출. */
export const groundingIdsOf = (md: string): string[] =>
  [...new Set((md ?? '').match(/u-\d{3}/g) ?? [])].sort();
