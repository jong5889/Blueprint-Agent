// STAGE: Generate (spec → representative FE/BE/DB code). SLICE OWNER: gyu.
// Reference the FR-NN numbers from the spec in code comments (§3.5 traceability).
// Representative file set (not a full app). Return codeMd (Markdown with code fences) + files[] (names).
// Use ../shared/llm.ts (callLLM). See application-design.md §3.5.
import type { GenerateInput, GenerateResult } from '../shared/types.js';

export async function runGenerate(_input: GenerateInput): Promise<GenerateResult> {
  throw new Error('NOT_IMPLEMENTED: generate (gyu slice)');
}
