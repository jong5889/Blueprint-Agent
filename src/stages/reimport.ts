// STAGE: Re-import (export 세트 → 새 회의체 시드). SLICE OWNER: S-B.
// input.dir 의 manifest.json + requirements/constraints.md + trace.json 을 읽어(왕복, §3.7.3)
// 새 회의체 시드용 데이터를 반환한다. NO LLM. 이 앱이 낸 export 를 이 앱이 다시 읽는다.
import type { ReimportInput, ReimportResult } from '../shared/types.js';

export async function readExportSet(_input: ReimportInput): Promise<ReimportResult> {
  throw new Error('NOT_IMPLEMENTED: reimport (S-B)');
}
