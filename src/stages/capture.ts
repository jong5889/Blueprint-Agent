// STAGE: Capture (transcript → Brief). SLICE OWNER: mingu.
// Fill this against the frozen contract. Use ../shared/ids.ts (parseTranscript, u-NNN),
// ../shared/llm.ts (callLLM). MUST NOT add content not present in utterances (C-3).
// Brief items MUST carry [근거: u-NNN] tags. See application-design.md §7 (C-3), §3.1.4.
import type { CaptureInput, CaptureResult } from '../shared/types.js';

export async function runCapture(_input: CaptureInput): Promise<CaptureResult> {
  throw new Error('NOT_IMPLEMENTED: capture (mingu slice)');
}
