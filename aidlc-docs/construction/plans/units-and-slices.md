# Units & Slices — AS-BUILT (rev, 로컬 개발)

> 정본 계약: `../../inception/application-design/application-design.md` (rev) §7.
> **이 문서는 소급(BF) 갱신본**이다. 이전 v1 플릿 4-slice 분해(suman/mingu/gyu/yudo, reverse/generate)는 폐기됐다.
> rev는 **로컬 단독 개발**(플릿 미사용)이며, reverse/generate 스테이지는 제거·visual-contract.json으로 대체됐다.

## 실제 구현 유닛 (8) — 각 유닛 문서: `../construction/<folder>/{functional-design,code}.md`

| U | 폴더 | 범위 | 골든패스 | 주요 파일 |
|---|---|---|---|---|
| U1 | `foundation` | types + ids + store(node:sqlite+파일) + server 스켈레톤 + sse | 전제 | `src/shared/{types,ids,store,llm,mockup-meta}.ts`, `src/server/{server,sse}.ts` |
| U2 | `extract` | 대화 → req+constraints 대칭(근거) | ★ | `src/stages/extract.ts`, `src/prompts/extract.ts` |
| U3 | `mockup` | req+constraints → HTML(data-bp-*) + 델타 + 버전 | ★ | `src/stages/mockup.ts`, `src/prompts/mockup.ts` |
| U4 | `contract` | 목업 → VisualContract (결정적, Playwright, NO LLM) | ★ | `src/stages/contract.ts`, `contract.selftest.ts` |
| U4/U6 | `export-reimport` | freeze + export 6파일 세트 + import 왕복 | ★/core | `src/stages/{export,reimport}.ts` |
| U5 | `coverage` | 누락 후보 flag + 휴먼게이트 resolve (C-5) | core | `src/stages/coverage.ts`, `src/prompts/coverage.ts` |
| U7 | `console` | 단일 통합 콘솔 SPA | ★ | `dashboard/src/App.tsx` |
| U8 | `stt` | STT 얇은 어댑터 (OpenRouter mai-transcribe-2) | non-core | `src/stages/stt.ts` |

> contract(U4)와 export-reimport는 §7에서 같은 U4(계약+freeze+export)로 묶였으나, AS-BUILT 파일 경계가 분리돼 두 폴더로 기록한다.

## 로컬 병렬 슬라이스 (개발 실행 방식, 계약은 위 §7 고정)
- **S-A (모델 스테이지)**: extract · mockup · coverage + 프롬프트.
- **S-B (결정적 스테이지)**: contract · export · reimport (llm 미import).
- **S-C (프론트)**: console SPA.
- **S-D / 기반**: jd가 foundation(shared+server+sse) 선(先)구축, 나머지 슬라이스가 계약에 맞춰 병렬.
- **U8 STT**: 후순위 얇은 어댑터, 나머지와 독립.

## 골든패스 앵커 (★)
U1 → U2(extract) → U3(mockup) → U4(contract)/export → U7 콘솔 뷰. + U5 coverage 휴먼게이트, U6 왕복은 core.

## AS-BUILT 잔여 (functional-design 문서 참조)
- export의 `trace.decisions`·`importantDecisions`가 아직 `[]`(coverage resolutions 전달 미배선).
- console에 spec의 단축키·maximize 오버레이 미구현.
- coverage/resolve는 §3 재량 중 **결정적 편입**(모델 미사용) 채택.
