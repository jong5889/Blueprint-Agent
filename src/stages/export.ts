// STAGE: Export 세트 조립 (결정적, rev2). SLICE OWNER: jd(계약 얽힘).
// input.dir 아래에 requirements.md·constraints.md·mockup.html·visual-contract.json·**visual-contract.yaml**·trace.json·manifest.json
// (application-design.md §5 + rev2 델타 E)을 기록하고 ExportManifest 를 반환한다. NO LLM.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { stringify as yamlStringify } from 'yaml';
import type { ExportSetInput, ExportManifest } from '../shared/types.js';

export async function buildExportSet(input: ExportSetInput): Promise<ExportManifest> {
  const files = {
    requirements: 'requirements.md',
    constraints: 'constraints.md',
    mockup: 'mockup.html',
    contract: 'visual-contract.json',
    contractYaml: 'visual-contract.yaml',   // rev2 E: 계약 YAML 동시 산출
    trace: 'trace.json',
  } as const;

  const manifest: ExportManifest = {
    schema: 'bp-export/2',
    project: input.project,
    meeting: input.meeting,
    version: input.version,
    exportedAt: input.exportedAt,
    files,
    importantDecisions: input.importantDecisions,
  };

  const write = (name: string, data: string) => fs.writeFile(path.join(input.dir, name), data);
  await Promise.all([
    write(files.requirements, input.requirementsMd),
    write(files.constraints, input.constraintsMd),
    write(files.mockup, input.html),
    write(files.contract, JSON.stringify(input.contract, null, 2)),
    write(files.contractYaml, yamlStringify(input.contract)),
    write(files.trace, JSON.stringify(input.trace, null, 2)),
    write('manifest.json', JSON.stringify(manifest, null, 2)),
  ]);

  return manifest;
}
