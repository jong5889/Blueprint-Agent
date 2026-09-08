// STAGE: Mockup (Brief[+prev] → single HTML screen with author-intent metadata). SLICE OWNER: mingu.
// data-bp-* 의도 메타데이터를 application-design.md §7b 규약대로 부착(freeze 이음새). Samsung 토큰, 브리프 명시 요소만(C-3).
// 델타 수정(§3.2.2/C-4): 직전 버전이 있으면 mode='edit'+baseVersion+델타 발언, 없으면 'create'. 저장은 store.saveMockup.
import { promises as fs } from 'node:fs';
import type { MockupInput, MockupResult } from '../shared/types.js';
import { callLLM } from '../shared/llm.js';
import { latestVersion, saveMockup, mockupFsPath } from '../shared/store.js';
import { runCapture } from './capture.js';
import { MOCKUP_SYSTEM } from '../prompts/mockup.js';

/** 브리프에서 근거로 쓰인 발언 id(u-NNN)를 유일·정렬하여 추출. */
const groundingIdsOf = (md: string): string[] =>
  [...new Set(md.match(/u-\d{3}/g) ?? [])].sort();

/** 모델이 코드펜스로 감싸 반환한 경우 벗겨 순수 HTML만 남긴다. */
const stripFence = (s: string): string =>
  s.trim().replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

/** cur 에만 있는(직전 스냅샷에 없던) 발언 줄 = 델타 발언 (C-4). */
const deltaLines = (prior: string, cur: string): string => {
  const seen = new Set(prior.split(/\r?\n/).map(l => l.trim()));
  return cur.split(/\r?\n/).map(l => l.trim()).filter(l => l && !seen.has(l)).join('\n');
};

export async function runMockup(input: MockupInput): Promise<MockupResult> {
  const { project, transcript } = input;
  const { brief } = await runCapture({ transcript });

  const prev = await latestVersion(project);
  const mode: 'create' | 'edit' = prev ? 'edit' : 'create';

  let user =
    `요구사항 정의서:\n\n${brief}\n\n` +
    `위 브리프에 명시된 요소만으로 단일 화면 HTML을 생성하라.`;
  if (prev) {
    const priorHtml = await fs.readFile(mockupFsPath(prev.webPath), 'utf8').catch(() => '');
    const delta = deltaLines(prev.transcriptSnapshot ?? '', transcript);
    user =
      `기존 화면 HTML (v${prev.version}):\n\n${priorHtml}\n\n` +
      `추가/변경된 발언(델타):\n${delta || '(없음)'}\n\n` +
      `최신 요구사항 정의서:\n\n${brief}\n\n` +
      `기존 HTML을 기준으로 델타·브리프에 해당하는 부분만 최소 수정하여 완전한 단일 화면 HTML 전체를 다시 출력하라.`;
  }

  const { text, usage } = await callLLM({ system: MOCKUP_SYSTEM, user, maxTokens: 8000 });
  const html = stripFence(text);

  const { webPath, version } = await saveMockup(project, html, {
    mode,
    baseVersion: prev?.version,
    transcriptSnapshot: transcript,
    groundingIds: groundingIdsOf(brief),
    usage,
  });
  return { webPath, version, mode };
}
