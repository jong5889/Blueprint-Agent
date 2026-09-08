// SSE bus — jd owns. Typed server→client push (contract §4). Read-only for workers.
import type { FastifyReply } from 'fastify';

export type SseEvent =
  | 'brief' | 'mockup' | 'contract' | 'spec' | 'code' | 'error' | 'stt-line' | 'job';

const clients = new Set<FastifyReply>();

export function addClient(reply: FastifyReply): void {
  clients.add(reply);
  reply.raw.on('close', () => clients.delete(reply));
}

export function broadcast(event: SseEvent, data: unknown): void {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) {
    try { c.raw.write(frame); } catch { clients.delete(c); }
  }
}
