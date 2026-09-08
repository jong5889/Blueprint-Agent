// STAGE: Reverse (VisualContract → SRS + ERD + OpenAPI markdown). SLICE OWNER: gyu.
// INPUT IS THE VISUAL CONTRACT ONLY — never transcript/markup (C-2). SRS items numbered FR-NN
// (../shared/ids.ts frNumber) for cross-reference. Output a single Markdown string (GFM tables ok).
// Use ../shared/llm.ts (callLLM). See application-design.md §3.4.
import type { ReverseInput, ReverseResult } from '../shared/types.js';

export async function runReverse(_input: ReverseInput): Promise<ReverseResult> {
  throw new Error('NOT_IMPLEMENTED: reverse (gyu slice)');
}
