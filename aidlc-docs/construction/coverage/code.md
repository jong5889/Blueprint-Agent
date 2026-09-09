# Code — U5 coverage (AS-BUILT)

## 구현 파일
| 파일 | 역할 |
|---|---|
| `src/stages/coverage.ts` | `runCoverage(input)`, `parseItems`(견고 JSON 파싱) |
| `src/prompts/coverage.ts` | COVERAGE_SYSTEM, `coverageUser` |
| `src/server/server.ts` | `POST /coverage`(async), `POST /coverage/resolve`(sync 결정적 편입) |

## 핵심 함수 / 근거
- `runCoverage(CoverageInput)→CoverageResult` — §3 POST /coverage. 빈 대화 `{missing:[]}`.
- `parseItems` — LLM 텍스트에서 첫 배열 파싱, `text` 필수 + groundingIds `^u-\d{3}$` 필터(§6 원칙6, C-5).
- `/coverage/resolve` 핸들러 — 3 action(adopt-req/adopt-constraint/exclude)을 draft에 append 후 `store.setDraft`(§6 C-5 휴먼 게이트).

## 검증 상태
- 전용 자동 테스트 없음(코드에서 확인).
- resolve의 결정적 편입·근거 태그 부착은 순수 문자열 로직으로 구현(코드 확인).
- UI 휴먼 게이트(채택/제외 라디오 + "선택 확정")는 U7 console에 존재.
