// STAGE: Mockup (requirements+constraints → 단일 HTML, data-bp-*). SLICE OWNER: S-A.
// mockup-meta.ts 의 BP_META_SPEC 규약대로 data-bp-* 부착(freeze 이음새). Samsung 토큰.
// 요구·제약 명시 요소만(C-3). prior 주어지면(편집) 직전 HTML 기준 델타만 최소 수정(C-4).
import type { MockupInput, MockupResult } from '../shared/types.js';
import { callLLM } from '../shared/llm.js';
import { MOCKUP_SYSTEM, mockupUser, mockupEditUser } from '../prompts/mockup.js';

/** 코드펜스로 감싸 왔으면 벗기고, <!doctype ...> 부터의 순수 HTML 만 남긴다. */
function stripToHtml(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const doc = s.search(/<!doctype html/i);
  if (doc > 0) s = s.slice(doc);
  return s.trim();
}

export async function runMockup(input: MockupInput): Promise<MockupResult> {
  const { requirementsMd, constraintsMd, prior } = input;
  const user = prior
    ? mockupEditUser(requirementsMd, constraintsMd, prior.html, prior.deltaLines)
    : mockupUser(requirementsMd, constraintsMd);
  const { text } = await callLLM({ system: MOCKUP_SYSTEM, user, maxTokens: 8192 });
  return { html: stripToHtml(text) };
}
