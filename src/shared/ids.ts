// Deterministic identifiers — jd owns. No model calls (§3.1.3: same transcript ⇒ same ids).
import type { Utterance } from './types.js';

/** Parse "발언자: 내용" transcript into utterances with stable u-NNN ids (document order). */
export function parseTranscript(text: string): Utterance[] {
  const lines = text.split(/\r?\n/);
  const out: Utterance[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue; // blank lines are not utterances
    // speaker label = 1..15 chars before the first colon, else whole line is anonymous
    const m = line.match(/^(.{1,15}?):\s*(.*)$/);
    const who = m ? m[1].trim() : '';
    const textPart = m ? m[2].trim() : line;
    const id = `u-${String(out.length + 1).padStart(3, '0')}`;
    out.push({ id, who, text: textPart });
  }
  return out;
}

/** FR-NN numbering helper for SRS derivation (§3.4). */
export function frNumber(n: number): string {
  return `FR-${String(n).padStart(2, '0')}`;
}
