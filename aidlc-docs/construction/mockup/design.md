# Functional Design — U3 mockup (AS-BUILT)

> 코드: `src/stages/mockup.ts`, `src/prompts/mockup.ts`, `src/shared/mockup-meta.ts`(이음새). 계약: §2·§3(POST /mockup)·§6.

## 목적
draft requirements+constraints → **단일 HTML 목업**(data-bp-* 부착) + 버전 저장. 신규(create)/델타 수정(edit) 두 모드. 골든패스 ★.

## 입출력 계약
- 입력 `MockupInput { requirementsMd, constraintsMd, prior?{html,deltaLines} }`.
- 출력 `MockupResult { html }`.
- API: `POST /mockup {meetingId}` → 202 job → `store.saveVersion` → `{webPath,version,mode}`, SSE `mockup`.

## 핵심 로직
1. draft가 비면 400(먼저 /extract). 직전 버전(`latestVersion`) 있으면 편집 모드.
2. **델타 산출**(server.ts `deltaLines`): 직전 스냅샷에 없던 발언 라인만 = 델타. 델타 0이면 `throw`(수정 차단).
3. 프롬프트: create=`mockupUser`, edit=`mockupEditUser`(직전 HTML + 델타). `callLLM(maxTokens 8192)`.
4. `stripToHtml`: 코드펜스 제거, `<!doctype html>`부터만 남김.
5. groundingIds: create=draft 전체의 u-NNN, edit=델타 라인의 u-NNN.

## 불변원칙 준수 지점
- **원칙2/C-3**: MOCKUP_SYSTEM "requirements·constraints에 명시된 요소만, 임의 추가 금지".
- **원칙3/C-4(무근거 변경 금지)**: 편집 입력 = 직전 버전 + 델타 발언. **델타 0 ⇒ 수정 차단**(server.ts에서 명시 throw).
- **이음새(C-1 전제)**: BP_META_SPEC를 프롬프트에 삽입 → 생성 HTML이 data-bp-* 규약 준수 → contract가 결정적으로 읽음.
- **Samsung 토큰·a11y 4.5:1·focus ring**: SAMSUNG_TOKENS로 프롬프트 강제.

## 코드에서 확인 안 됨
- 생성 HTML의 data-bp-* 실제 준수·a11y 대비는 LLM 출력 의존(프롬프트 강제만).
