# Tasks — U1 foundation

## 작업 체크리스트
- [x] `src/shared/types.ts` — 전 계약 인터페이스(§2): Utterance·DocPair·Version·Meeting·VisualContract·ExportManifest·ExportTrace·Job·스테이지 I/O
- [x] `src/shared/ids.ts` — `parseTranscript`·`groundingIdsOf`·R/C 번호 헬퍼(결정적, §6 원칙6)
- [x] `src/shared/store.ts` — node:sqlite 인덱스(`data/index.db`) + 파일 산출물(mockups/exports) (constraints §5 완화)
- [x] `src/shared/llm.ts` — env-driven(Anthropic Messages / Bedrock bearer 자동선택). contract.ts는 미import(C-1)
- [x] `src/shared/mockup-meta.ts` — `data-bp-*` 이음새 스키마(mockup↔contract 공유)
- [x] `src/server/server.ts` — Fastify 라우트·잡러너(202 비동기)·정적·전역 에러핸들러
- [x] `src/server/sse.ts` — 세션 스코프 SSE 버스(`broadcast(event,data,sid)`)
- [x] (rev2) `Version.frozen/major` 제거·`Meeting.activeJob` 추가·`store` 삭제/버전단위 export/`setActiveJob` (배리어 3ae2b06)

## 검증
- [x] `tsc --noEmit` 0 errors
- [x] 부팅 스모크(회의 생성·activeJob null·DELETE 404·/export 400)
- [ ] 유닛 자동 테스트 없음 — 결정성은 contract self-test가 간접 커버
