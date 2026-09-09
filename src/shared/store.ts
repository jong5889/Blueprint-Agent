// 저장 계층 — jd owns. 구조화 인덱스=node:sqlite(임베디드), 산출물(HTML·export)=파일 (constraints §5 완화).
import { DatabaseSync } from 'node:sqlite';
import { promises as fs, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { Meeting, Version, ProjectSummary } from './types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA_DIR = path.join(ROOT, 'data');
export const MOCKUP_DIR = path.join(DATA_DIR, 'mockups');
export const EXPORT_DIR = path.join(DATA_DIR, 'exports');
mkdirSync(MOCKUP_DIR, { recursive: true });
mkdirSync(EXPORT_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'index.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY, project TEXT, title TEXT, transcript TEXT,
    draftReq TEXT DEFAULT '', draftCon TEXT DEFAULT '', currentVersion INTEGER DEFAULT 0,
    activeJob TEXT
  );
  CREATE TABLE IF NOT EXISTS versions (
    meetingId TEXT, n INTEGER, createdAt TEXT, mode TEXT, parent INTEGER,
    transcriptSnapshot TEXT, groundingIds TEXT, requirementsMd TEXT, constraintsMd TEXT,
    webPath TEXT, usage TEXT, "group" INTEGER DEFAULT 1, variant INTEGER DEFAULT 1,
    PRIMARY KEY (meetingId, n)
  );
`);
// 기존 DB 호환(컬럼 추가): 이미 있으면 무시
try { db.exec('ALTER TABLE meetings ADD COLUMN activeJob TEXT'); } catch { /* exists */ }
try { db.exec('ALTER TABLE versions ADD COLUMN "group" INTEGER DEFAULT 1'); } catch { /* exists */ }
try { db.exec('ALTER TABLE versions ADD COLUMN variant INTEGER DEFAULT 1'); } catch { /* exists */ }

const rowToVersion = (r: any): Version => ({
  n: r.n, group: r.group ?? 1, variant: r.variant ?? 1,
  createdAt: r.createdAt, mode: r.mode, parent: r.parent ?? undefined,
  transcriptSnapshot: r.transcriptSnapshot, groundingIds: JSON.parse(r.groundingIds || '[]'),
  requirementsMd: r.requirementsMd, constraintsMd: r.constraintsMd, webPath: r.webPath,
  usage: r.usage ? JSON.parse(r.usage) : undefined,
});

export function getMeeting(id: string): Meeting | undefined {
  const m: any = db.prepare('SELECT * FROM meetings WHERE id=?').get(id);
  if (!m) return undefined;
  const versions = (db.prepare('SELECT * FROM versions WHERE meetingId=? ORDER BY n').all(id) as any[]).map(rowToVersion);
  return {
    id: m.id, project: m.project, title: m.title, transcript: m.transcript,
    draftRequirementsMd: m.draftReq, draftConstraintsMd: m.draftCon,
    currentVersion: m.currentVersion, versions,
    activeJob: m.activeJob ? JSON.parse(m.activeJob) : null,
  };
}

export function createMeeting(input: { project: string; title: string; transcript?: string; requirementsMd?: string; constraintsMd?: string }): Meeting {
  const id = randomUUID().slice(0, 8);
  db.prepare('INSERT INTO meetings (id,project,title,transcript,draftReq,draftCon,currentVersion) VALUES (?,?,?,?,?,?,0)')
    .run(id, input.project, input.title, input.transcript ?? '', input.requirementsMd ?? '', input.constraintsMd ?? '');
  return getMeeting(id)!;
}

export function setTranscript(id: string, transcript: string): void {
  db.prepare('UPDATE meetings SET transcript=? WHERE id=?').run(transcript, id);
}

export function setDraft(id: string, requirementsMd: string, constraintsMd: string): void {
  db.prepare('UPDATE meetings SET draftReq=?, draftCon=? WHERE id=?').run(requirementsMd, constraintsMd, id);
}

export function latestVersion(id: string): Version | undefined {
  const r: any = db.prepare('SELECT * FROM versions WHERE meetingId=? ORDER BY n DESC LIMIT 1').get(id);
  return r ? rowToVersion(r) : undefined;
}

/** 다음 논리 그룹 번호(rev3 R2). 새 생성/편집 = maxGroup+1, 변형은 동일 group 재사용. */
export function nextGroup(id: string): number {
  const r = db.prepare('SELECT MAX("group") AS g FROM versions WHERE meetingId=?').get(id) as any;
  return (r?.g ?? 0) + 1;
}

export async function saveVersion(
  id: string,
  v: { mode: 'create' | 'edit'; parent?: number; transcriptSnapshot: string; groundingIds: string[];
       requirementsMd: string; constraintsMd: string; html: string; usage?: { in: number; out: number };
       group: number; variant: number },
): Promise<{ version: number; webPath: string; group: number; variant: number }> {
  const meeting = getMeeting(id);
  if (!meeting) throw new Error('meeting not found');
  const n = meeting.currentVersion + 1;
  const file = `${id}-v${n}.html`;
  await fs.writeFile(path.join(MOCKUP_DIR, file), v.html);
  const webPath = `/mockups/${file}`;
  db.prepare(`INSERT INTO versions (meetingId,n,createdAt,mode,parent,transcriptSnapshot,groundingIds,requirementsMd,constraintsMd,webPath,usage,"group",variant)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, n, new Date().toISOString(), v.mode, v.parent ?? null, v.transcriptSnapshot,
         JSON.stringify(v.groundingIds), v.requirementsMd, v.constraintsMd, webPath, v.usage ? JSON.stringify(v.usage) : null,
         v.group, v.variant);
  db.prepare('UPDATE meetings SET currentVersion=? WHERE id=?').run(n, id);
  return { version: n, webPath, group: v.group, variant: v.variant };
}

/** rev3 R1: 되감기 — toVersion 이후 버전 전부 삭제(목업 파일 포함) + 최신 재계산. */
export function revertTo(id: string, toVersion: number): { currentVersion: number } {
  const after = db.prepare('SELECT n, webPath FROM versions WHERE meetingId=? AND n>?').all(id, toVersion) as any[];
  for (const r of after) { try { unlinkSync(mockupFsPath(r.webPath)); } catch { /* 없음 */ } }
  db.prepare('DELETE FROM versions WHERE meetingId=? AND n>?').run(id, toVersion);
  db.prepare('UPDATE meetings SET currentVersion=? WHERE id=?').run(toVersion, id);
  return { currentVersion: toVersion };
}

/** rev3 R1 방어: toVersion 이후 버전 중 export 이력이 있는가. */
export function hasExportAfter(project: string, meeting: string, toVersion: number): boolean {
  const after = db.prepare('SELECT n FROM versions WHERE meetingId=? AND n>?').all(meeting, toVersion) as any[];
  return after.some(r => existsSync(path.join(exportDir(project, meeting, r.n), 'manifest.json')));
}

/** 특정 버전 조회 (rev2: export/삭제는 버전 단위). */
export function getVersion(id: string, n: number): Version | undefined {
  const r: any = db.prepare('SELECT * FROM versions WHERE meetingId=? AND n=?').get(id, n);
  return r ? rowToVersion(r) : undefined;
}

/** 해당 버전에 export 이력이 있는가 (삭제 방어, 개선 H). */
export function hasExport(project: string, meeting: string, n: number): boolean {
  return existsSync(path.join(exportDir(project, meeting, n), 'manifest.json'));
}

/** 버전 삭제 + 최신 버전 포인터 재계산 (개선 H). 목업 파일도 정리. */
export function deleteVersion(id: string, n: number): { currentVersion: number } {
  const v = getVersion(id, n);
  if (v) { try { unlinkSync(mockupFsPath(v.webPath)); } catch { /* 파일 없음 */ } }
  db.prepare('DELETE FROM versions WHERE meetingId=? AND n=?').run(id, n);
  const max = db.prepare('SELECT MAX(n) AS m FROM versions WHERE meetingId=?').get(id) as any;
  const currentVersion = max?.m ?? 0;
  db.prepare('UPDATE meetings SET currentVersion=? WHERE id=?').run(currentVersion, id);
  return { currentVersion };
}

/** 진행 중 작업 영속 (개선 A/#7: 새로고침 복원). */
export function setActiveJob(id: string, job: { id: string; kind: string; status: string } | null): void {
  db.prepare('UPDATE meetings SET activeJob=? WHERE id=?').run(job ? JSON.stringify(job) : null, id);
}

export function listProjects(): ProjectSummary[] {
  const rows = db.prepare('SELECT DISTINCT project FROM meetings').all() as any[];
  return rows.map(({ project }) => ({
    project,
    meetings: db.prepare('SELECT id,title FROM meetings WHERE project=?').all(project) as any[],
  }));
}

export const mockupFsPath = (webPath: string) => path.join(MOCKUP_DIR, path.basename(webPath));
export function exportDir(project: string, meeting: string, version: number): string {
  const safe = (s: string) => s.replace(/[^\w가-힣.-]/g, '_');
  const dir = path.join(EXPORT_DIR, safe(project), safe(meeting), `v${version}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}
