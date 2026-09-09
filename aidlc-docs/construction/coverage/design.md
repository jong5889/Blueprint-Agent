# Functional Design — U5 coverage (AS-BUILT)

> 코드: `src/stages/coverage.ts`, `src/prompts/coverage.ts`, server.ts `/coverage`·`/coverage/resolve`. 계약: §3·§6(C-5).

## 목적
대화 vs 현재 req·constraints를 대조해 **미반영 요청 후보**를 flag. 자동 채택 없음 — 휴먼 게이트(resolve)로만 귀결. core.

## 입출력 계약
- 검출: `CoverageInput {transcript,requirementsMd,constraintsMd}` → `CoverageResult {missing:CoverageItem[]}`. API `POST /coverage {meetingId}` → 202 job(SSE `coverage`).
- 해소: `POST /coverage/resolve {meetingId, resolutions:CoverageResolution[]}`(동기) → 갱신된 `{requirementsMd,constraintsMd}`.

## 핵심 로직
1. `runCoverage`: 발언 0개면 `{missing:[]}`. `callLLM`으로 JSON 배열 요청.
2. `parseItems`: 텍스트에서 첫 `[`~마지막 `]` 슬라이스 파싱, `text`(비어있지 않음) + `groundingIds`(`^u-\d{3}$`만) 유효항목만 통과. 파싱 실패 시 `[]`.
3. `/coverage/resolve`(server.ts, **무모델·결정적 편입**): 각 resolution을 draft 문서에 append —
   - `adopt-req` → requirements에 `- text [근거:…]`
   - `adopt-constraint` → constraints에 동일
   - `exclude` → constraints에 `- (의도적 제외) text [근거:…]`
   그 후 `store.setDraft`.

## 불변원칙 준수 지점
- **원칙4/C-5(무근거 휘발 금지)**: coverage는 후보만 flag(자동 추가 금지, COVERAGE_SYSTEM 명시). resolve 없이 사라지지 않음. 제외는 반드시 constraint로 명시 기록.
- **원칙6(근거)**: 후보·편입 항목 모두 groundingIds 보존, `^u-\d{3}$` 필터로 위조 id 차단.

## 코드에서 확인 안 됨
- application-design §3은 resolve의 '채택' 문구화에 모델 사용을 재량 허용하나, AS-BUILT는 **결정적 append**로만 구현(모델 미사용).
