# Code — U7 console (AS-BUILT)

## 구현 파일
| 파일 | 역할 |
|---|---|
| `dashboard/src/App.tsx` | 단일 콘솔 SPA 전체(상태·API 헬퍼·골든패스·뷰) |
| `dashboard/src/main.tsx` | React 마운트 |
| `dashboard/src/style.css` | Tailwind 진입 |

## 핵심 함수 / 근거
- `generate` — §4 골든패스 체인(extract→mockup). `runAsync` 잡 폴링(§3 비동기 계약).
- `checkCoverage`/`resolveCoverage` — §6 C-5 휴먼 게이트 UI.
- `freeze`/`doExport` — §3 /freeze·/export.
- `toggleMic` — §4/C-6 STT 어댑터 소비(U8).
- `useEffect(EventSource '/events?sid=')` — §4 세션 스코프 SSE(진행 칩·오류만, 결과는 폴링).
- `genSessionId` 폴백 — 부록 D LAN http secure-context gotcha.
- 내장 SAMPLES 2건(비정본 데모 녹취).

## 검증 상태
- 서버 정적 서빙(`dashboard/dist`) 배선됨(server.ts). 데모 가동 이력(auto-memory).
- 자동 테스트 없음(SPA, 코드에서 확인). a11y focus ring·aria-label은 클래스 레벨로 전반 적용(코드 확인).
- 미구현: 단축키·maximize 오버레이(spec 대비 축소).
