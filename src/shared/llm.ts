// LLM access — jd owns. Env-driven, Anthropic-compatible Messages API.
// security-baseline: NO hardcoded keys. Works with Anthropic direct, z.ai, or a Bedrock-compatible proxy.
// Stages call ONLY callLLM(); freeze.ts must NOT import this (C-1: deterministic, zero model cost).

export interface LLMRequest { system: string; user: string; maxTokens?: number }
export interface LLMResponse { text: string; usage: { in: number; out: number } }

export class LLMConfigError extends Error {}

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new LLMConfigError('LLM 환경 미설정: ANTHROPIC_API_KEY 없음');
  const baseUrl = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
  const model = process.env.LLM_MODEL || 'claude-opus-4-8';

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 4096,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LLM ${res.status}: ${body.slice(0, 300)}`);
  }
  const data: any = await res.json();
  const text = (data.content ?? [])
    .filter((b: any) => b?.type === 'text')
    .map((b: any) => b.text)
    .join('');
  const usage = { in: data.usage?.input_tokens ?? 0, out: data.usage?.output_tokens ?? 0 };
  return { text, usage };
}
