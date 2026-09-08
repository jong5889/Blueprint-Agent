// STAGE: Extract (대화 → requirements + constraints, 대칭). SLICE OWNER: S-A.
// callLLM만 사용. 대화에 없는 내용 추가 금지(C-3), 각 항목 [근거: u-NNN]. 두 문서 대칭 1급(§3.2).
// requirements=화면목적·데이터·액션(R-NN), constraints=제외/비목표(C-NN).
import type { ExtractInput, ExtractResult } from '../shared/types.js';
import { parseTranscript } from '../shared/ids.js';
import { callLLM } from '../shared/llm.js';
import {
  EXTRACT_SYSTEM, REQ_MARKER, CON_MARKER, numberedTranscript, extractUser,
} from '../prompts/extract.js';

/** REQ/CON 마커로 LLM 출력을 두 문서로 가른다. 마커 누락 시 전체를 requirements 로 폴백. */
function splitDocs(text: string): ExtractResult {
  const ri = text.indexOf(REQ_MARKER);
  const ci = text.indexOf(CON_MARKER);
  if (ri === -1 || ci === -1 || ci < ri) {
    return { requirementsMd: text.trim(), constraintsMd: '- (발언에서 확인되지 않음)' };
  }
  return {
    requirementsMd: text.slice(ri + REQ_MARKER.length, ci).trim(),
    constraintsMd: text.slice(ci + CON_MARKER.length).trim(),
  };
}

export async function runExtract(input: ExtractInput): Promise<ExtractResult> {
  const utterances = parseTranscript(input.transcript);
  if (utterances.length === 0) {
    return { requirementsMd: '- (발언에서 확인되지 않음)', constraintsMd: '- (발언에서 확인되지 않음)' };
  }
  const { text } = await callLLM({
    system: EXTRACT_SYSTEM,
    user: extractUser(numberedTranscript(utterances)),
  });
  return splitDocs(text);
}
