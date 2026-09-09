# Tasks — U3 mockup

## 작업 체크리스트
- [x] `src/stages/mockup.ts` — `runMockup(input)→{html}`, create/edit 분기
- [x] `stripToHtml` — 코드펜스·서두 제거, `<!doctype html>` 정규화
- [x] `data-bp-*` 의도 메타데이터 부착(BP_META_SPEC 삽입) — freeze 이음새(원칙5)
- [x] 델타 편집(C-4): prior HTML + 델타 발언 최소 수정. 델타 0 ⇒ server.ts에서 throw(수정 차단)
- [x] Samsung 토큰·요구/제약 명시 요소만(C-3)
- [x] `store.saveVersion` — mode·parent·transcriptSnapshot·groundingIds 보존(원칙6)

## 검증
- [x] 골든패스 라이브 create v1 + 델타 edit v2 · conformance T5(델타/차단)
- [ ] mockup 전용 유닛 테스트 없음(LLM 의존)
