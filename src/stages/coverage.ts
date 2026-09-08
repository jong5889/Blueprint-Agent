// STAGE: Coverage (대화 vs 현재 req·constraints → 누락 후보). SLICE OWNER: S-A.
// callLLM으로 "요청·언급됐으나 반영 안 된 항목"을 뽑는다. 자동 추가 금지 — 후보만(C-5).
// 각 후보는 근거 발언 u-NNN 을 포함한다.
import type { CoverageInput, CoverageResult } from '../shared/types.js';

export async function runCoverage(_input: CoverageInput): Promise<CoverageResult> {
  throw new Error('NOT_IMPLEMENTED: coverage (S-A)');
}
