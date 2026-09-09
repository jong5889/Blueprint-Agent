# Code — U2 extract (AS-BUILT)

## 구현 파일
| 파일 | 역할 |
|---|---|
| `src/stages/extract.ts` | `runExtract(input)` — 대화→두 문서, 마커 분할 |
| `src/prompts/extract.ts` | EXTRACT_SYSTEM, REQ/CON_MARKER, `numberedTranscript`, `extractUser` |

## 핵심 함수 / 근거
- `runExtract(ExtractInput)→ExtractResult` — §3 POST /extract. 빈 대화 폴백, `callLLM` 1회.
- `splitDocs(text)` — REQ/CON 마커 기준 2분할. 마커 없으면 requirements 폴백(§3.2 대칭 문서화).
- `numberedTranscript` — `parseTranscript` 결과에 u-NNN 라벨(공유; coverage도 재사용).
- 서버 배선(server.ts): 202 → `runExtract` → `store.setDraft(id, req, con)` → SSE `extract`.

## 검증 상태
- 전용 자동 테스트 없음(코드에서 확인). 서버 골든패스에서 App.generate()가 /extract를 첫 단계로 호출(코드 확인).
- LLM 응답 의존 로직(마커 분할·폴백)은 순수함수 — 단, self-test 없음.
