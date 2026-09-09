# Code — U1 foundation (AS-BUILT)

## 구현 파일
| 파일 | 역할 |
|---|---|
| `src/shared/types.ts` | 전 계약 인터페이스(§2) — Utterance·DocPair·Version·Meeting·VisualContract·ExportManifest·ExportTrace·Job·스테이지 I/O |
| `src/shared/ids.ts` | 결정적 id·번호·grounding 추출 |
| `src/shared/store.ts` | node:sqlite 인덱스(`data/index.db`) + 파일 산출물(mockups/exports) |
| `src/shared/llm.ts` | env-driven LLM 클라이언트 |
| `src/shared/mockup-meta.ts` | data-bp-* 이음새 스키마(mockup↔contract 공유) |
| `src/server/server.ts` | Fastify 라우트·잡러너·정적·에러핸들러 |
| `src/server/sse.ts` | 세션 스코프 SSE 버스 |

## 핵심 함수 / 근거(application-design 절)
- `parseTranscript` / `groundingIdsOf` (ids.ts) — §2 Utterance, §6 원칙6.
- `store.saveVersion / freezeVersion / versionByMajor / exportDir` — §2 Version, §5 export 경로.
- `store` 이중 저장(SQLite 인덱스 + HTML/export 파일) — §1 "구조화 인덱스는 SQLite 허용, 대용량 산출물은 파일"(constraints §5 완화).
- `callLLM` (llm.ts) — §1 llm.ts. Provider 1 Anthropic Messages / Provider 2 Bedrock bearer, env로 선택. contract.ts는 이 파일 미import(C-1).
- `startJob` + `broadcast(event,data,sid)` — §3 SSE 세션 스코프, 202 비동기 계약.

## 검증 상태
- 서버 `:3000` 가동 이력 있음(auto-memory). 라우트 전부 배선됨(코드 확인).
- 단위 자동 테스트는 이 유닛엔 없음(코드에서 확인). 결정성은 contract self-test가 parseTranscript 경유 간접 커버.
