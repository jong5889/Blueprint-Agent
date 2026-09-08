// SSE bus — jd owns. Typed server→client push (contract §4). Read-only for workers.
// Session-scoped: each client registers with its session id (?sid=), and job events are
// delivered ONLY to the originating session — so one user's generation never flips another
// client's view (fixes cross-session iframe/version jumps). sid omitted → broadcast to all.
import type { FastifyReply } from 'fastify';

export type SseEvent =
  | 'extract' | 'mockup' | 'coverage' | 'error' | 'stt-line' | 'job';

const clients = new Set<{ reply: FastifyReply; sid: string }>();

export function addClient(reply: FastifyReply, sid: string): void {
  const entry = { reply, sid };
  clients.add(entry);
  reply.raw.on('close', () => clients.delete(entry));
}

/** Send to clients of `sid` only. If `sid` is undefined, broadcast to every client. */
export function broadcast(event: SseEvent, data: unknown, sid?: string): void {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) {
    if (sid && c.sid !== sid) continue;
    try { c.reply.raw.write(frame); } catch { clients.delete(c); }
  }
}
