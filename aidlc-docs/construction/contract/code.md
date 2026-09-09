# Code — U4 contract (AS-BUILT)

## 구현 파일
| 파일 | 역할 |
|---|---|
| `src/stages/contract.ts` | `extractContract({webPath})` — Playwright 결정적 추출, NO LLM |
| `src/stages/contract.selftest.ts` | data-bp-* 샘플 → 분류·결정성 self-test |
| `src/shared/mockup-meta.ts` | 읽는 대상 상수(BP_ATTR, BP_OBJECTS_SCRIPT_TYPE) |

## 핵심 함수 / 근거
- `extractContract(ContractInput)→VisualContract` — §5 visual-contract.json 원천, §6 C-1.
  - viewport 1440×900 고정, box round → 결정성.
  - id `a-`/`data-bp-action` ⇒ actions[], 그 외 ⇒ components[](§6 분류 규약, mockup-meta 명세대로).
- llm.ts 미import — C-1 무모델·무비용(코드 확인: import 목록에 llm 없음).
- 호출부: server.ts `/export`가 `frozenAt`·html 로드 후 동기 실행.

## 검증 상태
- `contract.selftest.ts` 설계상 PASS(2회 실행 deepEqual로 결정성 assert). 실행 커맨드는 파일 주석에 명시. 실측 실행 로그는 코드에서 확인 안 됨.
- 실행: `node_modules/.bin/tsx src/stages/contract.selftest.ts`(PATH에 playwright chromium 필요).
