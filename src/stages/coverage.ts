// STAGE: Coverage (대화 vs 현재 req·constraints → 누락 후보). SLICE OWNER: S-A.
// callLLM으로 "요청·언급됐으나 반영 안 된 항목"을 뽑는다. 자동 추가 금지 — 후보만(C-5).
// 각 후보는 근거 발언 u-NNN 을 포함한다.
import type { CoverageInput, CoverageResult, CoverageItem } from '../shared/types.js';
import { parseTranscript } from '../shared/ids.js';
import { callLLM } from '../shared/llm.js';
import { COVERAGE_SYSTEM, coverageUser } from '../prompts/coverage.js';
import { numberedTranscript } from '../prompts/extract.js';

/** LLM 텍스트에서 첫 JSON 배열을 견고하게 파싱해 유효한 CoverageItem 만 남긴다. */
function parseItems(text: string): CoverageItem[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: CoverageItem[] = [];
  for (const el of arr) {
    const text = typeof (el as any)?.text === 'string' ? (el as any).text.trim() : '';
    if (!text) continue;
    const ids = Array.isArray((el as any)?.groundingIds)
      ? (el as any).groundingIds.filter((x: unknown) => typeof x === 'string' && /^u-\d{3}$/.test(x))
      : [];
    out.push({ text, groundingIds: ids });
  }
  return out;
}

export async function runCoverage(input: CoverageInput): Promise<CoverageResult> {
  const utterances = parseTranscript(input.transcript);
  if (utterances.length === 0) return { missing: [] };
  const { text } = await callLLM({
    system: COVERAGE_SYSTEM,
    user: coverageUser(numberedTranscript(utterances), input.requirementsMd, input.constraintsMd),
  });
  return { missing: parseItems(text) };
}
