# Functional Design — U2 extract (AS-BUILT)

> 코드: `src/stages/extract.ts`, `src/prompts/extract.ts`. 계약: application-design §2·§3(POST /extract)·§6.

## 목적
회의 대화(transcript) → **requirements.md + constraints.md 두 대칭 문서**로 정리. 골든패스 ★ 첫 모델 스테이지.

## 입출력 계약
- 입력 `ExtractInput { transcript }`.
- 출력 `ExtractResult { requirementsMd, constraintsMd }`.
- API: `POST /extract {meetingId}` → 202 job → 결과를 `store.setDraft`로 회의체 draft에 반영, SSE `extract` push.

## 핵심 로직
1. `parseTranscript`로 u-NNN 부여, 발언 0개면 두 문서 모두 `"- (발언에서 확인되지 않음)"` 폴백(모델 호출 안 함).
2. `numberedTranscript`로 u-NNN 라벨 붙인 대화를 프롬프트에 삽입, `callLLM`.
3. `splitDocs`: LLM 출력을 `===REQUIREMENTS===`/`===CONSTRAINTS===` 마커로 2분할. 마커 누락 시 전체를 requirements로, constraints는 폴백 문구.

## 불변원칙 준수 지점
- **원칙2/C-3(무근거 생성 금지)**: EXTRACT_SYSTEM이 "대화에 없는 내용 절대 추가 금지", 선의의 보완도 금지, 부족 영역은 정확히 `"- (발언에서 확인되지 않음)"`만 쓰도록 강제.
- **원칙6(근거)**: 모든 항목 줄 끝 `[근거: u-NNN]` 강제, 입력에 제시된 u-NNN만 사용.
- **대칭 1급(§3.2)**: requirements="무엇을 만드나"(R-NN), constraints="무엇을 만들지 않나"(C-NN) 두 문서를 한 번에 산출.

## 코드에서 확인 안 됨
- 근거 태그 실제 부착 여부는 LLM 출력 의존 — 프롬프트로만 강제, 후처리 검증 없음.
