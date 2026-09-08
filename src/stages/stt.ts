// STAGE: STT 얇은 어댑터 (음성 → 전사 텍스트). 부수 기능(§4, C-6) — core 골든패스와 독립.
// env-driven(OPENAI_API_KEY, 하드코딩 금지). 화자분리·로컬처리 없음. 원음 저장 안 함(전사 텍스트만 반환).
// 미설정 시 이 기능만 비활성(나머지 정상).
export async function transcribe(audio: Buffer, filename = 'audio.webm'): Promise<{ text: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('STT 미설정: OPENAI_API_KEY 없음');
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, '');
  const model = process.env.STT_MODEL || 'whisper-1';
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)]), filename);
  form.append('model', model);
  const res = await fetch(`${base}/v1/audio/transcriptions`, {
    method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form,
  });
  if (!res.ok) throw new Error(`STT ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const d: any = await res.json();
  return { text: (d.text || '').trim() };
}
