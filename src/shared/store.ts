// File-based persistence — jd owns (constraints §6: no RDBMS). Workers use these helpers, don't reinvent.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VersionEntry } from './types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA_DIR = path.join(ROOT, 'data');
export const MOCKUP_DIR = path.join(DATA_DIR, 'mockups');
const VERSIONS_FILE = path.join(DATA_DIR, 'versions.json');
const SEED_TRANSCRIPT = path.join(ROOT, 'fixtures', 'seed-transcript.txt');

async function ensureDirs() {
  await fs.mkdir(MOCKUP_DIR, { recursive: true });
}

/** Initial transcript (GET /transcript). Falls back to a tiny built-in if no seed fixture yet. */
export async function readTranscript(): Promise<string> {
  try { return await fs.readFile(SEED_TRANSCRIPT, 'utf8'); }
  catch { return '사용자: (회의 녹취를 붙여넣거나 템플릿을 선택하세요)'; }
}

export async function listVersions(): Promise<VersionEntry[]> {
  try { return JSON.parse(await fs.readFile(VERSIONS_FILE, 'utf8')); }
  catch { return []; }
}

async function writeVersions(v: VersionEntry[]): Promise<void> {
  await ensureDirs();
  await fs.writeFile(VERSIONS_FILE, JSON.stringify(v, null, 2));
}

export async function nextVersion(project: string): Promise<number> {
  const all = await listVersions();
  const max = all.filter(v => v.project === project).reduce((m, v) => Math.max(m, v.version), 0);
  return max + 1;
}

export async function latestVersion(project: string): Promise<VersionEntry | undefined> {
  const all = await listVersions();
  return all.filter(v => v.project === project).sort((a, b) => b.version - a.version)[0];
}

/** Persist a generated mockup HTML and record its version entry. Returns the web path + version. */
export async function saveMockup(
  project: string,
  html: string,
  meta: Partial<Pick<VersionEntry, 'mode' | 'baseVersion' | 'transcriptSnapshot' | 'groundingIds' | 'usage'>> = {},
): Promise<{ webPath: string; version: number }> {
  await ensureDirs();
  const version = await nextVersion(project);
  const safe = project.replace(/[^\w가-힣-]/g, '_');
  const file = `${safe}-v${version}.html`;
  await fs.writeFile(path.join(MOCKUP_DIR, file), html);
  const webPath = `/mockups/${file}`;
  const entry: VersionEntry = {
    project, version, createdAt: new Date().toISOString(), webPath,
    bytes: Buffer.byteLength(html), mode: meta.mode ?? 'create', ...meta,
  };
  const all = await listVersions();
  all.push(entry);
  await writeVersions(all);
  return { webPath, version };
}

/** Absolute path of a mockup given its /mockups/<file> web path (used by freeze.ts). */
export function mockupFsPath(webPath: string): string {
  return path.join(MOCKUP_DIR, path.basename(webPath));
}
