# Tasks — U5 coverage

## 작업 체크리스트
- [x] `src/stages/coverage.ts` — `runCoverage(input)→{missing[]}` (§3 POST /coverage)
- [x] `parseItems` — 견고 JSON 파싱, `text` 필수 + groundingIds `^u-\d{3}$` 필터
- [x] 자동 추가 금지 — 후보만 반환(C-5)
- [x] `POST /coverage/resolve`(sync) — adopt-req/adopt-constraint/exclude를 draft에 결정적 편입 + `[근거]` 태그(휴먼 게이트 C-5)

## 검증
- [x] conformance T6(후보 반환 + exclude가 constraints에 편입 확인)
- [ ] coverage 전용 유닛 테스트 없음(resolve 편입은 순수 문자열 로직)
