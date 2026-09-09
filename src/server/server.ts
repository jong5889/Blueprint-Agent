// HTTP server — jd owns (라우트 배선·잡러너·세션SSE·정적·에러핸들러·오케스트레이션). 스테이지는 subagent.
// 계약: application-design.md (rev) §3(API)·§4(골든패스)·§5(export). 스테이지는 순수 변환, store/오케스트레이션은 여기.
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { randomUUID } from 'node:crypto';
import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { addClient, broadcast, type SseEvent } from './sse.js';
import * as store from '../shared/store.js';
import { parseTranscript, groundingIdsOf } from '../shared/ids.js';
import type { Job, JobKind, ExportTrace } from '../shared/types.js';

import { runExtract } from '../stages/extract.js';
import { runMockup } from '../stages/mockup.js';
import { runCoverage } from '../stages/coverage.js';
import { extractContract } from '../stages/contract.js';
import { buildExportSet } from '../stages/export.js';
import { readExportSet } from '../stages/reimport.js';
import { transcribe } from '../stages/stt.js';

// .env 자동 로드(Node 내장, 의존성 0). 시크릿은 .env(gitignore)에만 — 코드 하드코딩 금지.
try { (process as any).loadEnvFile?.(path.join(process.cwd(), '.env')); } catch { /* .env 없음 */ }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const app = Fastify({ logger: { level: 'info' }, bodyLimit: 25 * 1024 * 1024 });
// 오디오 청크(STT)는 원시 바이트로 버퍼링
app.addContentTypeParser(/^audio\//, { parseAs: 'buffer' }, (_req, body, done) => done(null, body));
const jobs = new Map<string, Job>();

function startJob(kind: JobKind, sseEvent: SseEvent, sid: string, meetingId: string, fn: () => Promise<unknown>): string {
  const id = randomUUID();
  const job: Job = { id, kind, status: 'running' };
  jobs.set(id, job);
  store.setActiveJob(meetingId, { id, kind, status: 'running' }); // rev2 A/#7: 새로고침 복원용 영속
  broadcast('job', { jobId: id, kind, status: 'running' }, sid);
  (async () => {
    try {
      const result = await fn();
      job.result = result; job.status = 'done';
      broadcast(sseEvent, result, sid);
      broadcast('job', { jobId: id, kind, status: 'done' }, sid);
    } catch (e: any) {
      job.status = 'error'; job.error = e?.message ?? String(e);
      app.log.error(e);
      broadcast('error', { message: job.error }, sid);
      broadcast('job', { jobId: id, kind, status: 'error' }, sid);
    } finally {
      store.setActiveJob(meetingId, null); // 완료·에러 시 진행상태 해제
    }
  })();
  return id;
}
const accepted = (jobId: string) => ({ ok: true, jobId, status: 'running' as const });
const sidOf = (req: { headers: Record<string, any> }): string => String(req.headers['x-session-id'] || '');
function has(body: any, keys: string[]): boolean { return body && typeof body === 'object' && keys.every(k => body[k] != null); }

/** 직전 스냅샷에 없던(=추가된) 발언 라인 = 델타 (C-4). */
function deltaLines(prior: string, current: string): string {
  const seen = new Set(parseTranscript(prior).map(u => `${u.who} ${u.text}`));
  return parseTranscript(current).filter(u => !seen.has(`${u.who} ${u.text}`)).map(u => `${u.id} ${u.who ? u.who + ': ' : ''}${u.text}`).join('\n');
}

// ── SSE (세션 스코프) ──
app.get('/events', (req, reply) => {
  reply.raw.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  reply.raw.write(': connected\n\n');
  addClient(reply, String((req.query as any)?.sid || ''));
});

// ── reads / meetings ──
app.get('/projects', async () => ({ projects: store.listProjects() }));
app.get('/meetings/:id', async (req, reply) => {
  const m = store.getMeeting((req.params as any).id);
  return m ? m : reply.code(404).send({ error: 'meeting not found' });
});
app.post('/meetings', async (req, reply) => {
  if (!has(req.body, ['project', 'title'])) return reply.code(400).send({ error: 'project, title required' });
  const b = req.body as any;
  return store.createMeeting({ project: b.project, title: b.title, transcript: b.transcript });
});
app.put('/meetings/:id/transcript', async (req, reply) => {
  if (!has(req.body, ['transcript'])) return reply.code(400).send({ error: 'transcript required' });
  store.setTranscript((req.params as any).id, (req.body as any).transcript);
  return { ok: true };
});
app.get('/jobs/:id', async (req, reply) => {
  const job = jobs.get((req.params as any).id);
  return job ? job : reply.code(404).send({ error: 'job not found' });
});

// ── extract (async): 대화 → req+constraints (draft 갱신) ──
app.post('/extract', async (req, reply) => {
  if (!has(req.body, ['meetingId'])) return reply.code(400).send({ error: 'meetingId required' });
  const id = (req.body as any).meetingId as string;
  const m = store.getMeeting(id);
  if (!m) return reply.code(404).send({ error: 'meeting not found' });
  return reply.code(202).send(accepted(startJob('extract', 'extract', sidOf(req), id, async () => {
    const r = await runExtract({ transcript: m.transcript });
    store.setDraft(id, r.requirementsMd, r.constraintsMd);
    return r;
  })));
});

// ── mockup (async): draft req/constraints → HTML 버전(신규/델타) ──
app.post('/mockup', async (req, reply) => {
  if (!has(req.body, ['meetingId'])) return reply.code(400).send({ error: 'meetingId required' });
  const id = (req.body as any).meetingId as string;
  const m = store.getMeeting(id);
  if (!m) return reply.code(404).send({ error: 'meeting not found' });
  if (!m.draftRequirementsMd && !m.draftConstraintsMd) return reply.code(400).send({ error: '먼저 requirements를 추출하세요 (/extract)' });
  const variants = Math.max(1, Math.min(4, Number((req.body as any).variants) || 1)); // rev3 R2: 1~4 변형
  return reply.code(202).send(accepted(startJob('mockup', 'mockup', sidOf(req), id, async () => {
    const prevV = store.latestVersion(id);
    let prior: { html: string; deltaLines: string } | undefined;
    let mode: 'create' | 'edit' = 'create';
    let groundingIds = groundingIdsOf(m.draftRequirementsMd + '\n' + m.draftConstraintsMd);
    if (prevV) {
      const dl = deltaLines(prevV.transcriptSnapshot, m.transcript);
      if (!dl.trim()) throw new Error('변경된 발언이 없어 수정할 내용이 없습니다. 새 발언을 추가하세요. (C-4)');
      const priorHtml = await fs.readFile(store.mockupFsPath(prevV.webPath), 'utf8').catch(() => '');
      prior = { html: priorHtml, deltaLines: dl };
      mode = 'edit';
      groundingIds = [...new Set(dl.match(/u-\d{3}/g) ?? [])].sort();
    }
    const group = store.nextGroup(id);   // rev3 R2: 이번 생성의 논리 단계
    const out: { version: number; webPath: string; variant: number }[] = [];
    for (let i = 1; i <= variants; i++) {
      const { html } = await runMockup({ requirementsMd: m.draftRequirementsMd, constraintsMd: m.draftConstraintsMd, prior });
      const sv = await store.saveVersion(id, {
        mode, parent: prevV?.n, transcriptSnapshot: m.transcript, groundingIds,
        requirementsMd: m.draftRequirementsMd, constraintsMd: m.draftConstraintsMd, html, group, variant: i,
      });
      out.push({ version: sv.version, webPath: sv.webPath, variant: i });
    }
    // 첫 변형을 대표로 반환(호환) + 그룹/변형 목록
    return { webPath: out[0].webPath, version: out[0].version, mode, group, variants: out };
  })));
});

// ── coverage (async): 누락 후보 flag (자동 추가 안 함, C-5) ──
app.post('/coverage', async (req, reply) => {
  if (!has(req.body, ['meetingId'])) return reply.code(400).send({ error: 'meetingId required' });
  const id = (req.body as any).meetingId as string;
  const m = store.getMeeting(id);
  if (!m) return reply.code(404).send({ error: 'meeting not found' });
  return reply.code(202).send(accepted(startJob('coverage', 'coverage', sidOf(req), id, () =>
    runCoverage({ transcript: m.transcript, requirementsMd: m.draftRequirementsMd, constraintsMd: m.draftConstraintsMd }))));
});

// ── coverage/resolve (sync): 휴먼 게이트 — 채택/제외를 draft에 결정적으로 편입 (C-5) ──
app.post('/coverage/resolve', async (req, reply) => {
  if (!has(req.body, ['meetingId', 'resolutions'])) return reply.code(400).send({ error: 'meetingId, resolutions required' });
  const b = req.body as any;
  const m = store.getMeeting(b.meetingId);
  if (!m) return reply.code(404).send({ error: 'meeting not found' });
  let req_ = m.draftRequirementsMd, con = m.draftConstraintsMd;
  const tag = (ids: string[]) => ids?.length ? ` [근거: ${ids.join(', ')}]` : '';
  for (const r of b.resolutions as any[]) {
    const line = `- ${r.item.text}${tag(r.item.groundingIds)}`;
    if (r.action === 'adopt-req') req_ += `\n${line}`;
    else if (r.action === 'adopt-constraint') con += `\n${line}`;
    else if (r.action === 'exclude') con += `\n- (의도적 제외) ${r.item.text}${tag(r.item.groundingIds)}`;
  }
  store.setDraft(b.meetingId, req_, con);
  return { requirementsMd: req_, constraintsMd: con };
});

// ── export (sync, rev2): 버전 단위 확정. 결정적 계약 추출 + 세트 조립(yaml 포함) (§5·D·E) ──
app.post('/export', async (req, reply) => {
  if (!has(req.body, ['meetingId', 'version'])) return reply.code(400).send({ error: 'meetingId, version required' });
  const b = req.body as any;
  const m = store.getMeeting(b.meetingId);
  if (!m) return reply.code(404).send({ error: 'meeting not found' });
  const v = store.getVersion(b.meetingId, b.version);
  if (!v) return reply.code(404).send({ error: 'version not found' });
  const html = await fs.readFile(store.mockupFsPath(v.webPath), 'utf8');
  const contract = await extractContract({ webPath: v.webPath });
  const trace: ExportTrace = {
    utterances: parseTranscript(v.transcriptSnapshot),
    decisions: [],
    lineage: { meeting: b.meetingId, version: b.version, parents: v.parent != null ? [v.parent] : [] },
  };
  const dir = store.exportDir(m.project, b.meetingId, b.version);
  const manifest = await buildExportSet({
    dir, project: m.project, meeting: b.meetingId, version: b.version, exportedAt: new Date().toISOString(),
    requirementsMd: v.requirementsMd, constraintsMd: v.constraintsMd, html, contract, trace,
    importantDecisions: [],
  });
  return { manifest, dir };
});

// ── 버전 삭제 (rev2 H): export 이력 있으면 경고(409), ?force=1 로 강행 ──
app.delete('/meetings/:id/versions/:n', async (req, reply) => {
  const { id, n } = req.params as any;
  const vn = Number(n);
  const m = store.getMeeting(id);
  if (!m) return reply.code(404).send({ error: 'meeting not found' });
  if (!store.getVersion(id, vn)) return reply.code(404).send({ error: 'version not found' });
  const force = String((req.query as any)?.force || '') === '1';
  if (!force && store.hasExport(m.project, id, vn)) {
    return reply.code(409).send({ error: 'exported', exported: true, message: `v${vn}은 export 이력이 있습니다. 그래도 삭제하려면 force=1.` });
  }
  return store.deleteVersion(id, vn);
});

// ── 버전 revert (rev3 R1): toVersion 이후 삭제 + 대화/draft 되감기. export 이력 있으면 409(force로 강행) ──
app.post('/meetings/:id/revert', async (req, reply) => {
  const { id } = req.params as any;
  const b = req.body as any;
  const toVersion = Number(b?.toVersion);
  const m = store.getMeeting(id);
  if (!m) return reply.code(404).send({ error: 'meeting not found' });
  const target = store.getVersion(id, toVersion);
  if (!target) return reply.code(404).send({ error: 'toVersion not found' });
  const force = b?.force === true || String((req.query as any)?.force || '') === '1';
  if (!force && store.hasExportAfter(m.project, id, toVersion)) {
    return reply.code(409).send({ error: 'exported', exported: true, message: `v${toVersion} 이후에 export된 버전이 있습니다. 그래도 되감으려면 force.` });
  }
  const r = store.revertTo(id, toVersion);              // 이후 버전 삭제 + currentVersion 재계산
  store.setTranscript(id, target.transcriptSnapshot);   // 대화를 그 버전 시점으로 되감기
  store.setDraft(id, target.requirementsMd, target.constraintsMd); // draft 복원
  return { currentVersion: r.currentVersion, transcript: target.transcriptSnapshot };
});

// ── import (sync): export 세트 → 새 회의체 시드 (왕복, §3.7.3) ──
app.post('/import', async (req, reply) => {
  if (!has(req.body, ['dir'])) return reply.code(400).send({ error: 'dir required' });
  const r = await readExportSet({ dir: (req.body as any).dir });
  const m = store.createMeeting({ project: r.project, title: `${r.title} (재개)`, requirementsMd: r.requirementsMd, constraintsMd: r.constraintsMd });
  return m;
});

// ── STT 얇은 어댑터 (§4/C-6): 오디오 → 전사 텍스트. 미설정 시 이 라우트만 실패, 나머지 정상 ──
const EXT: Record<string, string> = { 'audio/webm': 'webm', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg' };
app.post('/stt', async (req, reply) => {
  const audio = req.body as Buffer;
  if (!Buffer.isBuffer(audio) || audio.length === 0) return reply.code(400).send({ error: 'audio body required' });
  const ct = String(req.headers['content-type'] || '').split(';')[0].trim();
  const { text } = await transcribe(audio, `audio.${EXT[ct] || 'webm'}`);
  return { text };
});

// ── static + error handler ──
app.register(fastifyStatic, { root: store.MOCKUP_DIR, prefix: '/mockups/', decorateReply: true });
const DIST = path.join(ROOT, 'dashboard', 'dist');
if (existsSync(DIST)) app.register(fastifyStatic, { root: DIST, prefix: '/', decorateReply: false });
app.get('/fixture.html', async (_req, reply) => {
  try { return reply.type('text/html').send(await fs.readFile(path.join(ROOT, 'fixtures', 'fixture.html'), 'utf8')); }
  catch { return reply.type('text/html').send('<!doctype html><meta charset=utf8><body style="font:16px sans-serif;padding:2rem;color:#707078">목업 생성 대기 중…</body>'); }
});
app.setErrorHandler((err, req, reply) => {
  req.log.error(err);
  broadcast('error', { message: err.message }, sidOf(req));
  reply.code((err as any).statusCode ?? 500).send({ error: err.message });
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`Blueprint Agent (rev) on :${PORT}`))
  .catch((e) => { app.log.error(e); process.exit(1); });
