// HTTP server — jd owns (route wiring, job runner, SSE, static, error handling). Read-only for workers.
// Contract: application-design.md §3 (HTTP API), §4 (SSE). Workers implement src/stages/*.
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { randomUUID } from 'node:crypto';
import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { addClient, broadcast, type SseEvent } from './sse.js';
import { readTranscript, listVersions, MOCKUP_DIR } from '../shared/store.js';
import type { Job, JobKind } from '../shared/types.js';

import { runCapture } from '../stages/capture.js';
import { runMockup } from '../stages/mockup.js';
import { freeze } from '../stages/freeze.js';
import { runReverse } from '../stages/reverse.js';
import { runGenerate } from '../stages/generate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const app = Fastify({ logger: { level: 'info' } });

// ── in-memory job registry ──
const jobs = new Map<string, Job>();

/** Start an async job; broadcast its SSE event on completion. Returns the job id immediately. */
function startJob(kind: JobKind, sseEvent: SseEvent, fn: () => Promise<unknown>): string {
  const id = randomUUID();
  const job: Job = { id, kind, status: 'running' };
  jobs.set(id, job);
  broadcast('job', { jobId: id, kind, status: 'running' });
  (async () => {
    try {
      const result = await fn();
      job.result = result; job.status = 'done';
      broadcast(sseEvent, result);
      broadcast('job', { jobId: id, kind, status: 'done' });
    } catch (e: any) {
      job.status = 'error'; job.error = e?.message ?? String(e);
      app.log.error(e);
      broadcast('error', { message: job.error });
      broadcast('job', { jobId: id, kind, status: 'error' });
    }
  })();
  return id;
}

const accepted = (jobId: string) => ({ ok: true, jobId, status: 'running' as const });
function need<T extends object>(body: any, keys: (keyof T)[]): body is T {
  return body && typeof body === 'object' && keys.every(k => body[k] != null);
}

// ── SSE ──
app.get('/events', (req, reply) => {
  reply.raw.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });
  reply.raw.write(': connected\n\n');
  addClient(reply);
});

// ── reads ──
app.get('/transcript', async () => ({ transcript: await readTranscript() }));
app.get('/versions', async () => ({ versions: await listVersions() }));
app.get('/templates', async () => {
  try { return { templates: JSON.parse(await fs.readFile(path.join(ROOT, 'fixtures', 'templates.json'), 'utf8')) }; }
  catch { return { templates: [] }; }
});
app.get('/jobs/:id', async (req, reply) => {
  const job = jobs.get((req.params as any).id);
  if (!job) return reply.code(404).send({ error: 'job not found' });
  return job;
});
app.get('/fixture.html', async (req, reply) => {
  try { return reply.type('text/html').send(await fs.readFile(path.join(ROOT, 'fixtures', 'fixture.html'), 'utf8')); }
  catch { return reply.type('text/html').send('<!doctype html><meta charset=utf8><body style="font:16px sans-serif;padding:2rem;color:#707078">목업 생성 대기 중…</body>'); }
});

// ── async pipeline stages ──
app.post('/capture', async (req, reply) => {
  if (!need<{ transcript: string }>(req.body, ['transcript'])) return reply.code(400).send({ error: 'transcript required' });
  const b = req.body as { transcript: string };
  return reply.code(202).send(accepted(startJob('capture', 'brief', () => runCapture({ transcript: b.transcript }))));
});
app.post('/mockup', async (req, reply) => {
  if (!need<{ project: string; transcript: string }>(req.body, ['project', 'transcript'])) return reply.code(400).send({ error: 'project, transcript required' });
  const b = req.body as { project: string; transcript: string };
  return reply.code(202).send(accepted(startJob('mockup', 'mockup', () => runMockup({ project: b.project, transcript: b.transcript }))));
});
app.post('/reverse', async (req, reply) => {
  if (!need<{ contract: unknown }>(req.body, ['contract'])) return reply.code(400).send({ error: 'contract required' });
  const b = req.body as { contract: any };
  return reply.code(202).send(accepted(startJob('reverse', 'spec', () => runReverse({ contract: b.contract }))));
});
app.post('/generate', async (req, reply) => {
  if (!need<{ specMd: string }>(req.body, ['specMd'])) return reply.code(400).send({ error: 'specMd required' });
  const b = req.body as { specMd: string };
  return reply.code(202).send(accepted(startJob('generate', 'code', () => runGenerate({ specMd: b.specMd }))));
});

// ── freeze: SYNCHRONOUS, deterministic (C-1) ──
app.post('/freeze', async (req, reply) => {
  if (!need<{ webPath: string }>(req.body, ['webPath'])) return reply.code(400).send({ error: 'webPath required' });
  const b = req.body as { webPath: string };
  const contract = await freeze({ webPath: b.webPath });
  broadcast('contract', { contract });
  return { contract };
});

// ── static (mockups always; built dashboard if present) ──
app.register(fastifyStatic, { root: MOCKUP_DIR, prefix: '/mockups/', decorateReply: true });
const DIST = path.join(ROOT, 'dashboard', 'dist');
if (existsSync(DIST)) {
  app.register(fastifyStatic, { root: DIST, prefix: '/', decorateReply: false });
}

// ── global error handler (§3.7.3: surface error, preserve prior state) ──
app.setErrorHandler((err, req, reply) => {
  req.log.error(err);
  broadcast('error', { message: err.message });
  reply.code(err.statusCode ?? 500).send({ error: err.message });
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`Blueprint Agent server on :${PORT}`))
  .catch((e) => { app.log.error(e); process.exit(1); });
