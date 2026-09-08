// STAGE: Contract 추출 (목업 → VisualContract). SLICE OWNER: S-B.
// DETERMINISTIC — NO LLM (C-1/원칙5). Playwright로 1440×900 렌더 후 mockup-meta.ts BP_ATTR 읽어 추출.
// 동일 목업 ⇒ 동일 계약. 이 파일은 ../shared/llm.ts 를 import 하지 않는다.
import type { ContractInput, VisualContract } from '../shared/types.js';

export async function extractContract(_input: ContractInput): Promise<VisualContract> {
  throw new Error('NOT_IMPLEMENTED: contract (S-B)');
}
