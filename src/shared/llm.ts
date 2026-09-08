// LLM access — jd owns. Env-driven, Anthropic-compatible. security-baseline: NO hardcoded keys.
// Two providers, auto-selected by env (stages call callLLM() only; signature is stable):
//   1) Anthropic Messages API — set ANTHROPIC_API_KEY (works with Anthropic direct / z.ai / proxies).
//   2) Amazon Bedrock (bearer token) — set AWS_BEARER_TOKEN_BEDROCK + AWS_REGION + LLM_MODEL
//      (e.g. LLM_MODEL=global.anthropic.claude-opus-4-8).
// freeze.ts must NOT import this (C-1: deterministic, zero model cost).

export interface LLMRequest { system: string; user: string; maxTokens?: number }
export interface LLMResponse { text: string; usage: { in: number; out: number } }

export class LLMConfigError extends Error {}

function parseAnthropicBody(data: any): LLMResponse {
  const text = (data.content ?? [])
    .filter((b: any) => b?.type === 'text')
    .map((b: any) => b.text)
    .join('');
  return { text, usage: { in: data.usage?.input_tokens ?? 0, out: data.usage?.output_tokens ?? 0 } };
}

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const maxTokens = req.maxTokens ?? 4096;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const bedrockToken = process.env.AWS_BEARER_TOKEN_BEDROCK;

  // Provider 1: Anthropic Messages API
  if (apiKey) {
    const baseUrl = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
    const model = process.env.LLM_MODEL || 'claude-opus-4-8';
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system: req.system, messages: [{ role: 'user', content: req.user }] }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
    return parseAnthropicBody(await res.json());
  }

  // Provider 2: Amazon Bedrock (bearer token)
  if (bedrockToken) {
    const region = process.env.AWS_REGION || 'ap-northeast-2';
    const model = process.env.LLM_MODEL || 'global.anthropic.claude-opus-4-8';
    const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/invoke`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${bedrockToken}` },
      body: JSON.stringify({ anthropic_version: 'bedrock-2023-05-31', max_tokens: maxTokens, system: req.system, messages: [{ role: 'user', content: req.user }] }),
    });
    if (!res.ok) throw new Error(`LLM(Bedrock) ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
    return parseAnthropicBody(await res.json());
  }

  throw new LLMConfigError('LLM 환경 미설정: ANTHROPIC_API_KEY 또는 AWS_BEARER_TOKEN_BEDROCK 없음');
}
