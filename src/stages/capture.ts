// STAGE: Capture (transcript → Brief). SLICE OWNER: mingu.
// parseTranscript(→u-NNN, 결정적) 로 발언 id 부여 후 callLLM으로 요구 브리프 도출.
// 브리프 항목은 [근거: u-NNN] 태그를 달고, 발언에 없는 내용은 추가하지 않는다 (C-3). §3.1.4 / §7b(C-3).
import type { CaptureInput, CaptureResult } from '../shared/types.js';
import { parseTranscript } from '../shared/ids.js';
import { callLLM } from '../shared/llm.js';
import { CAPTURE_SYSTEM } from '../prompts/capture.js';

/** transcript → 요구 브리프(Markdown). 발언마다 u-NNN을 붙여 LLM에 주고 근거 태그가 달린 브리프를 받는다. */
export async function runCapture(input: CaptureInput): Promise<CaptureResult> {
  const utterances = parseTranscript(input.transcript);
  const numbered = utterances
    .map(u => `${u.id} ${u.who ? u.who + ': ' : ''}${u.text}`)
    .join('\n');
  const { text } = await callLLM({
    system: CAPTURE_SYSTEM,
    user: `다음 회의 발언(각 줄 앞의 u-NNN이 발언 id)에서 단일 화면의 요구사항 정의서를 작성하라.\n\n${numbered}`,
    maxTokens: 2048,
  });
  return { brief: text.trim() };
}
