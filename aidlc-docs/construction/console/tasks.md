# Tasks — U7 console (rev AS-BUILT)

> rev2 개선(A/B/C/F/G/H)은 `construction/console-rev2/` 에서 추가 진행.

## 작업 체크리스트
- [x] `dashboard/src/App.tsx` — 단일 통합 콘솔(모드 분리 없음)
- [x] `generate` 골든패스 체인(extract→mockup) + `runAsync` 잡 폴링(2s)
- [x] `checkCoverage`/`resolveCoverage` — 휴먼 게이트 UI(C-5)
- [x] freeze/export UI(rev) — ※ rev2에서 freeze 제거·버전선택 export로 대체 예정
- [x] `useEffect(EventSource '/events?sid=')` — 세션 스코프 SSE(진행칩·오류; 결과는 폴링)
- [x] `genSessionId` 폴백(LAN http secure-context) · 대화 localStorage 영속
- [x] a11y focus ring·aria-label 전반 적용 · 내장 SAMPLES 데모 녹취
- [ ] 단축키·maximize 오버레이 미구현(rev 스펙 대비 축소) — rev2에서 필요 시 보강

## 검증
- [x] dashboard build PASS · 데모 스크린샷 rev-01~05 · 정적 서빙 배선(server.ts)
- [ ] SPA 자동 테스트 없음
