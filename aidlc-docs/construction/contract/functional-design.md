# Functional Design — U4 contract (AS-BUILT)

> 코드: `src/stages/contract.ts`, `src/stages/contract.selftest.ts`, `src/shared/mockup-meta.ts`. 계약: §2·§5·§6(C-1/원칙5).

## 목적
목업 HTML → **VisualContract**(결정적 시각 계약). export 시점에만 실행. 하류 전파의 정본(목업 자체가 아니라 이 계약).

## 입출력 계약
- 입력 `ContractInput { webPath }`.
- 출력 `VisualContract { page, dataObjects, components, actions, stateFlow }`.
- 호출: `POST /export`가 동기로 `extractContract` 실행(별도 라우트 없음).

## 핵심 로직 (무모델)
1. Playwright chromium, viewport 고정 **1440×900**, `waitUntil:'networkidle'`.
2. `page.evaluate`로 DOM 순회:
   - `<script type=application/bp-objects>` JSON → `dataObjects`.
   - `[data-bp-id]` 요소마다: id가 `a-`로 시작하거나 `data-bp-action` 보유 ⇒ **action**(verb;target;fields;result 파싱, result 있으면 stateFlow), 아니면 **component**(`data-bp-bind`의 `object.field` 파싱).
   - box는 `getBoundingClientRect`를 `Math.round`.
3. tsx/esbuild `__name` 미정의 크래시 방지 initScript(goto 전).

## 불변원칙 준수 지점
- **원칙5/C-1(계약 결정성)**: `../shared/llm.ts` **미import**. 기하·분류 전부 결정적. 고정 viewport + round ⇒ **동일 목업 ⇒ 동일 계약**(self-test가 2회 실행 deepEqual로 증명).
- **원칙1/C-2(원천)**: 하류 전파 산출물이 목업이 아니라 visual-contract.json임을 이 스테이지가 실현.
- 이음새: mockup-meta.ts의 BP_ATTR을 그대로 읽음(mockup 생성측과 동일 상수).

## 검증 상태
- `contract.selftest.ts`: 샘플 data-bp-* HTML로 page.title/viewport/dataObjects/components(bind)/actions(verb·target·fields·result·label)/stateFlow + **2회 실행 결정성** 전부 assert. 주석·구조상 PASS 설계(실행 로그는 코드에서 확인 안 됨).
