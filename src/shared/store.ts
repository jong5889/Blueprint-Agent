// 저장 계층 — jd owns. 구조화 인덱스=node:sqlite(임베디드), 산출물(HTML·export)=파일 (constraints §5 완화).
import { DatabaseSync } from 'node:sqlite';
import { promises as fs, mkdirSync } from 'node:fs';
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
    draftReq TEXT DEFAULT '', draftCon TEXT DEFAULT '', currentVersion INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS versions (
    meetingId TEXT, n INTEGER, createdAt TEXT, mode TEXT, parent INTEGER,
    transcriptSnapshot TEXT, groundingIds TEXT, requirementsMd TEXT, constraintsMd TEXT,
    webPath TEXT, frozen INTEGER DEFAULT 0, major INTEGER, usage TEXT,
    PRIMARY KEY (meetingId, n)
  );
`);

const rowToVersion = (r: any): Version => ({
  n: r.n, createdAt: r.createdAt, mode: r.mode, parent: r.parent ?? undefined,
  transcriptSnapshot: r.transcriptSnapshot, groundingIds: JSON.parse(r.groundingIds || '[]'),
  requirementsMd: r.requirementsMd, constraintsMd: r.constraintsMd, webPath: r.webPath,
  frozen: !!r.frozen, major: r.major ?? undefined, usage: r.usage ? JSON.parse(r.usage) : undefined,
});

export function getMeeting(id: string): Meeting | undefined {
  const m: any = db.prepare('SELECT * FROM meetings WHERE id=?').get(id);
  if (!m) return undefined;
  const versions = (db.prepare('SELECT * FROM versions WHERE meetingId=? ORDER BY n').all(id) as any[]).map(rowToVersion);
  return {
    id: m.id, project: m.project, title: m.title, transcript: m.transcript,
    draftRequirementsMd: m.draftReq, draftConstraintsMd: m.draftCon,
    currentVersion: m.currentVersion, versions,
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

export async function saveVersion(
  id: string,
  v: { mode: 'create' | 'edit'; parent?: number; transcriptSnapshot: string; groundingIds: string[];
       requirementsMd: string; constraintsMd: string; html: string; usage?: { in: number; out: number } },
): Promise<{ version: number; webPath: string }> {
  const meeting = getMeeting(id);
  if (!meeting) throw new Error('meeting not found');
  const n = meeting.currentVersion + 1;
  const file = `${id}-v${n}.html`;
  await fs.writeFile(path.join(MOCKUP_DIR, file), v.html);
  const webPath = `/mockups/${file}`;
  db.prepare(`INSERT INTO versions (meetingId,n,createdAt,mode,parent,transcriptSnapshot,groundingIds,requirementsMd,constraintsMd,webPath,frozen,major,usage)
              VALUES (?,?,?,?,?,?,?,?,?,?,0,NULL,?)`)
    .run(id, n, new Date().toISOString(), v.mode, v.parent ?? null, v.transcriptSnapshot,
         JSON.stringify(v.groundingIds), v.requirementsMd, v.constraintsMd, webPath, v.usage ? JSON.stringify(v.usage) : null);
  db.prepare('UPDATE meetings SET currentVersion=? WHERE id=?').run(n, id);
  return { version: n, webPath };
}

export function freezeVersion(id: string, n: number): { major: number } {
  const majors = db.prepare('SELECT MAX(major) AS m FROM versions WHERE meetingId=? AND frozen=1').get(id) as any;
  const major = (majors?.m ?? 0) + 1;
  db.prepare('UPDATE versions SET frozen=1, major=? WHERE meetingId=? AND n=?').run(major, id, n);
  return { major };
}

export function versionByMajor(id: string, major: number): Version | undefined {
  const r: any = db.prepare('SELECT * FROM versions WHERE meetingId=? AND major=? AND frozen=1').get(id, major);
  return r ? rowToVersion(r) : undefined;
}

export function listProjects(): ProjectSummary[] {
  const rows = db.prepare('SELECT DISTINCT project FROM meetings').all() as any[];
  return rows.map(({ project }) => {
    const meetings = (db.prepare('SELECT id,title FROM meetings WHERE project=?').all(project) as any[]);
    const frozen = (db.prepare(`SELECT v.meetingId AS meeting, v.major, v.createdAt AS at
      FROM versions v JOIN meetings m ON m.id=v.meetingId WHERE m.project=? AND v.frozen=1`).all(project) as any[]);
    return { project, meetings, frozenMajors: frozen.map(f => ({ meeting: f.meeting, major: f.major, at: f.at })) };
  });
}

export const mockupFsPath = (webPath: string) => path.join(MOCKUP_DIR, path.basename(webPath));
export function exportDir(project: string, meeting: string, major: number): string {
  const safe = (s: string) => s.replace(/[^\w가-힣.-]/g, '_');
  const dir = path.join(EXPORT_DIR, safe(project), safe(meeting), `v${major}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}
