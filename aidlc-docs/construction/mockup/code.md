# Code — U3 mockup (AS-BUILT)

## 구현 파일
| 파일 | 역할 |
|---|---|
| `src/stages/mockup.ts` | `runMockup(input)` — create/edit 분기, `stripToHtml` |
| `src/prompts/mockup.ts` | MOCKUP_SYSTEM(+SAMSUNG_TOKENS+BP_META_SPEC), `mockupUser`, `mockupEditUser` |
| `src/shared/mockup-meta.ts` | BP_ATTR / BP_OBJECTS_SCRIPT_TYPE / BP_META_SPEC (contract와 공유) |

## 핵심 함수 / 근거
- `runMockup(MockupInput)→MockupResult` — §3 POST /mockup. prior 유무로 create/edit(§6 C-4).
- `stripToHtml` — 코드펜스·서두 제거, `<!doctype html>` 정규화.
- `deltaLines(prior,current)`(server.ts) — §6 C-4 델타 정의. 델타 0 ⇒ 에러.
- `store.saveVersion` — mode·parent·transcriptSnapshot·groundingIds 보존(§2·원칙6).
- BP_META_SPEC 삽입 — §6 원칙5 이음새(mockup↔contract).

## 검증 상태
- 전용 자동 테스트 없음. C-4 델타 차단은 server.ts에서 명시 throw로 구현(코드 확인).
- 골든패스에서 /mockup이 /extract 직후 자동 체인(App.generate, 코드 확인).
