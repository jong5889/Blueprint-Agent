// STAGE: Export 세트 조립 (결정적). SLICE OWNER: S-B.
// input.dir 아래에 requirements.md·constraints.md·mockup.html·visual-contract.json·trace.json·manifest.json
// (application-design.md §5 계약)을 기록하고 ExportManifest 를 반환한다. NO LLM.
import type { ExportSetInput, ExportManifest } from '../shared/types.js';

export async function buildExportSet(_input: ExportSetInput): Promise<ExportManifest> {
  throw new Error('NOT_IMPLEMENTED: export (S-B)');
}
