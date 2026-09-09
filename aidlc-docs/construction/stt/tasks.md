# Tasks — U8 stt (얇은 어댑터, §4/C-6)

## 작업 체크리스트
- [x] `src/stages/stt.ts` — `transcribe(audio,filename)`, env 프로바이더 자동선택
- [x] 프로바이더 우선순위: OpenRouter `microsoft/mai-transcribe-2` → OpenAI `whisper-1`(올바른 base와 짝지음)
- [x] 서버 `POST /stt` + `audio/*` raw buffer content-type parser + content-type→확장자 매핑
- [x] `toggleMic`(App) — MediaRecorder 녹음 → /stt → 입력창 삽입(사용자 검토 게이트)
- [x] 원음 미저장(전사 텍스트만) · 키 하드코딩 없음(env) · 미설정 시 /stt만 실패

## 검증
- [x] 배선 검증: say→wav 실오디오 POST /stt → 전사 API 도달(멀티파트·포맷·인증 정상; 429=계정 크레딧, 코드 무관)
- [ ] 실제 전사 성공은 크레딧 있는 `STT_API_KEY`(OpenRouter) 주입 시(라이브 확인 대기)
