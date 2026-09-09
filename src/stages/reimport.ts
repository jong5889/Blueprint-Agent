// STAGE: Re-import (export 세트 → 새 회의체 시드). SLICE OWNER: S-B.
// input.dir 의 manifest.json + requirements/constraints.md + trace.json 을 읽어(왕복, §3.7.3)
// 새 회의체 시드용 데이터를 반환한다. NO LLM. 이 앱이 낸 export 를 이 앱이 다시 읽는다.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ReimportInput, ReimportResult, ExportManifest, ExportTrace } from '../shared/types.js';

export async function readExportSet({ dir }: ReimportInput): Promise<ReimportResult> {
  const readJson = async <T>(name: string): Promise<T> => JSON.parse(await fs.readFile(path.join(dir, name), 'utf8')) as T;
  const readText = (name: string) => fs.readFile(path.join(dir, name), 'utf8');

  const manifest = await readJson<ExportManifest>('manifest.json');
  const [requirementsMd, constraintsMd, trace] = await Promise.all([
    readText(manifest.files.requirements),
    readText(manifest.files.constraints),
    readJson<ExportTrace>(manifest.files.trace),
  ]);

  return {
    project: manifest.project,
    title: `${manifest.meeting} v${manifest.version}`,
    requirementsMd,
    constraintsMd,
    decisions: trace.decisions,
  };
}
