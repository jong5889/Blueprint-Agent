// STAGE: Reverse (VisualContract → SRS + ERD + OpenAPI markdown). SLICE OWNER: gyu.
// INPUT IS THE VISUAL CONTRACT ONLY — never transcript/markup (C-2). SRS items numbered FR-NN
// (../shared/ids.ts frNumber) for cross-reference. Output a single Markdown string (GFM tables ok).
// Use ../shared/llm.ts (callLLM). See application-design.md §3.4.
import type { ReverseInput, ReverseResult } from '../shared/types.js';
import { callLLM } from '../shared/llm.js';
import { REVERSE_SYSTEM } from '../prompts/reverse.js';

export async function runReverse(input: ReverseInput): Promise<ReverseResult> {
  // C-2: the only input is the Visual Contract; serialize it as the sole grounding for the LLM.
  const user = `다음은 확정된 Visual Contract(JSON)이다. 이것만을 근거로 SRS/ERD/OpenAPI Markdown 을 작성하라.\n\n\`\`\`json\n${JSON.stringify(input.contract, null, 2)}\n\`\`\``;
  const { text } = await callLLM({ system: REVERSE_SYSTEM, user, maxTokens: 6000 });
  return { specMd: text };
}
