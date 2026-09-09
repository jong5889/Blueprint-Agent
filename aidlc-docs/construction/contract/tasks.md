# Tasks — U4 contract (결정적, C-1)

## 작업 체크리스트
- [x] `src/stages/contract.ts` — `extractContract({webPath})→VisualContract`, Playwright 렌더 기하 추출
- [x] **NO LLM** — llm.ts 미import(C-1 무모델·무비용). conformance T2a 정적 검증
- [x] viewport 1440×900 고정 + box round → 결정성(동일 목업 = 동일 계약)
- [x] `data-bp-id` `a-`/`data-bp-action` ⇒ actions[], 그 외 ⇒ components[] (mockup-meta 규약)
- [x] `__name` addInitScript 심(tsx/esbuild page.evaluate 크래시 방지)
- [x] `src/stages/contract.selftest.ts` — 분류 + 2회 실행 deepEqual(결정성) assert

## 검증
- [x] contract self-test PASS(분류·결정성) · conformance T4b(export 2회 계약 동일)
