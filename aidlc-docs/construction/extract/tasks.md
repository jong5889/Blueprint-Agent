# Tasks — U2 extract

## 작업 체크리스트
- [x] `src/stages/extract.ts` — `runExtract(input)→{requirementsMd,constraintsMd}` (§3 POST /extract)
- [x] REQ/CON 마커 기준 2문서 분할(`splitDocs`), 마커 없으면 requirements 폴백
- [x] 빈 대화 시 두 문서 모두 "(발언에서 확인되지 않음)" 폴백(모델 미호출)
- [x] `src/prompts/extract.ts` — EXTRACT_SYSTEM(무근거 금지 C-3 + `[근거]` 강제), `numberedTranscript`(u-NNN 라벨), `extractUser`
- [x] 서버 배선: 202 → runExtract → `store.setDraft` → SSE `extract`

## 검증
- [x] tsc 통과 · 골든패스 라이브에서 첫 스테이지로 동작(conformance T3 근거·무환각)
- [ ] extract 전용 유닛 테스트 없음(마커 분할/폴백은 순수함수)
