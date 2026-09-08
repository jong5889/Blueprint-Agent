// STAGE: STT 얇은 어댑터 (음성 → 전사 텍스트). 부수 기능(§4, C-6) — core 골든패스와 독립.
// 기본 프로바이더: OpenRouter microsoft/mai-transcribe-2 (OpenAI 호환 /audio/transcriptions).
// env-driven(키 하드코딩 금지). 미설정 시 이 기능만 비활성(나머지 정상). 화자분리·로컬처리 없음, 원음 미저장.
//   STT_API_KEY (또는 OPENROUTER_API_KEY / OPENAI_API_KEY) · STT_BASE_URL · STT_MODEL 로 오버라이드.
export async function transcribe(audio: Buffer, filename = 'audio.webm'): Promise<{ text: string }> {
  // 프로바이더 선택: OpenRouter(mai-transcribe-2) 우선, 없으면 OpenAI(whisper-1)를 올바른 base와 짝지어 사용.
  let key = process.env.STT_API_KEY || process.env.OPENROUTER_API_KEY;
  let defBase = 'https://openrouter.ai/api/v1';
  let defModel = 'microsoft/mai-transcribe-2';
  if (!key && process.env.OPENAI_API_KEY) { key = process.env.OPENAI_API_KEY; defBase = 'https://api.openai.com/v1'; defModel = 'whisper-1'; }
  if (!key) throw new Error('STT 미설정: STT_API_KEY(OpenRouter) 또는 OPENAI_API_KEY 없음');
  const base = (process.env.STT_BASE_URL || defBase).replace(/\/$/, '');
  const model = process.env.STT_MODEL || defModel;

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)]), filename);
  form.append('model', model);

  const res = await fetch(`${base}/audio/transcriptions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'X-Title': 'Blueprint Agent' },
    body: form,
  });
  if (!res.ok) throw new Error(`STT ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const d: any = await res.json();
  // transcription 응답은 { text } (또는 verbose_json). 문자열 폴백까지 방어.
  const text = typeof d === 'string' ? d : (d.text ?? d.transcript ?? '');
  return { text: String(text).trim() };
}
