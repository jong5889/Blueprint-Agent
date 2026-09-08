// STAGE: Capture (transcript → Brief). SLICE OWNER: mingu.
// parseTranscript(→u-NNN, 결정적) 로 발언 id 부여 후 callLLM으로 요구 브리프 도출.
// 브리프 항목은 [근거: u-NNN] 태그를 달고, 발언에 없는 내용은 추가하지 않는다 (C-3). §3.1.4 / §7b(C-3).
import type { CaptureInput, CaptureResult, Utterance } from '../shared/types.js';
import { parseTranscript } from '../shared/ids.js';
import { callLLM } from '../shared/llm.js';
import { CAPTURE_SYSTEM } from '../prompts/capture.js';

/**
 * 주어진 발언 집합(각자 고정 u-NNN id 보유)에서 요구 브리프(Markdown)를 도출한다.
 * 전체 발언을 주면 전체 브리프, 델타 발언만 주면 델타 수정 브리프가 된다 (§3.2.2 / C-4).
 * 발언 id는 호출자가 부여한 것을 그대로 유지하므로 버전 간 근거 id가 안정적이다 (§3.1.3).
 */
export async function briefFromUtterances(utterances: Utterance[]): Promise<string> {
  if (utterances.length === 0) return '';
  const numbered = utterances
    .map(u => `${u.id} ${u.who ? u.who + ': ' : ''}${u.text}`)
    .join('\n');
  const { text } = await callLLM({
    system: CAPTURE_SYSTEM,
    user: `다음 회의 발언(각 줄 앞의 u-NNN이 발언 id)에서 단일 화면의 요구사항 정의서를 작성하라.\n\n${numbered}`,
    maxTokens: 2048,
  });
  return text.trim();
}

/** transcript → 요구 브리프(Markdown). 발언마다 u-NNN을 붙여 LLM에 주고 근거 태그가 달린 브리프를 받는다. */
export async function runCapture(input: CaptureInput): Promise<CaptureResult> {
  const brief = await briefFromUtterances(parseTranscript(input.transcript));
  return { brief };
}
