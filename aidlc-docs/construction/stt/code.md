# Code — U8 stt (AS-BUILT)

## 구현 파일
| 파일 | 역할 |
|---|---|
| `src/stages/stt.ts` | `transcribe(audio,filename)` — env 프로바이더 선택, OpenAI 호환 전사 |
| `src/server/server.ts` | `POST /stt` + `audio/*` raw buffer content-type parser, 확장자 매핑 |
| `dashboard/src/App.tsx` | `toggleMic` — MediaRecorder→/stt→입력창 삽입 |

## 핵심 함수 / 근거
- `transcribe` — §8 얇은 어댑터. 프로바이더 우선순위 OpenRouter mai-transcribe-2 → OpenAI whisper-1, 전부 env(§8 env 키).
- server 오디오 파서 `addContentTypeParser(/^audio\//, parseAs:'buffer')` — 원시 바이트 버퍼링.
- `toggleMic` — 녹음 blob→POST /stt→text 입력창 삽입(사용자 검토 게이트).

## 검증 상태
- 자동 테스트 없음(외부 API 의존, C-6 취지상 생략). 미설정 시 /stt만 500, core 라우트 무영향(코드 확인).
- 실제 전사는 env 키·네트워크 필요 — 실행 로그는 코드에서 확인 안 됨.
