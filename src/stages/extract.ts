// STAGE: Extract (대화 → requirements + constraints, 대칭). SLICE OWNER: S-A.
// callLLM만 사용. 대화에 없는 내용 추가 금지(C-3), 각 항목 [근거: u-NNN]. 두 문서 대칭 1급(§3.2).
// requirements=화면목적·데이터·액션(R-NN), constraints=제외/비목표(C-NN).
import type { ExtractInput, ExtractResult } from '../shared/types.js';

export async function runExtract(_input: ExtractInput): Promise<ExtractResult> {
  throw new Error('NOT_IMPLEMENTED: extract (S-A)');
}
