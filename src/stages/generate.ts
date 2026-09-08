// STAGE: Generate (spec → representative FE/BE/DB code). SLICE OWNER: gyu.
// Reference the FR-NN numbers from the spec in code comments (§3.5 traceability).
// Representative file set (not a full app). Return codeMd (Markdown with code fences) + files[] (names).
// Use ../shared/llm.ts (callLLM). See application-design.md §3.5.
import type { GenerateInput, GenerateResult } from '../shared/types.js';
import { callLLM } from '../shared/llm.js';
import { GENERATE_SYSTEM } from '../prompts/generate.js';

// Filenames come from the enforced heading pattern: ### `path/file.ext`
const FILE_HEADING = /^#{2,4}\s+`([^`]+\.[A-Za-z0-9]+)`\s*$/gm;

export async function runGenerate(input: GenerateInput): Promise<GenerateResult> {
  const user = `다음 사양(SRS/ERD/OpenAPI)으로부터 대표 3계층 코드를 생성하라.\n\n${input.specMd}`;
  const { text } = await callLLM({ system: GENERATE_SYSTEM, user, maxTokens: 8000 });

  const files: string[] = [];
  for (const m of text.matchAll(FILE_HEADING)) files.push(m[1]);
  return { codeMd: text, files };
}
