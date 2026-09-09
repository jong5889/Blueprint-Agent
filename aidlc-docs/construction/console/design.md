# Functional Design — U7 console (AS-BUILT)

> 코드: `dashboard/src/App.tsx`(+main.tsx·style.css). 계약: §3(API)·§4(SSE)·§6, 골든패스 ★.

## 목적
모드 분리 없는 **단일 통합 콘솔**: 대화 입력 · requirements/constraints 뷰 · 목업 프리뷰(iframe) · 누락 체크(휴먼 게이트) · freeze/export · 회의체·버전 내비 · 상태 피드백.

## 입출력 계약 (프론트→API)
- 읽기: `GET /projects`, `GET /meetings/:id`. 대화 영속: `PUT /meetings/:id/transcript`.
- 비동기 스테이지: `runAsync`가 202→`GET /jobs/:id` 2초 폴링(최대 4분). extract/mockup/coverage.
- 동기: `/coverage/resolve`·`/freeze`·`/export`. SSE `/events?sid=`로 진행 칩·오류 배너(결과 정본은 잡 폴링).

## 핵심 로직 / 프론트 상태
- `generate()` — 골든패스 체인: putTranscript → /extract → /mockup, view 자동 전환·notice.
- `checkCoverage()`→`resolveCoverage()` — 후보 라디오(채택 요구/채택 제약/의도적 제외) + "선택 확정".
- `freeze()` / `doExport()` — major 고정 후 세트 산출.
- `toggleMic()` — STT 어댑터(U8) 소비: 녹음→/stt→입력창 삽입(사용자 검토 후 전송).
- 세션 id: `genSessionId`가 `crypto.randomUUID` 부재(비-secure LAN) 폴백. transcript/meeting localStorage 영속.
- 대화·버전 파싱: `parseLines`가 ids.ts `parseTranscript` 규칙 미러(앞 15자 화자+콜론).

## 불변원칙 준수 지점
- **원칙1/C-2**: 목업 직접 편집 UI 없음(iframe은 프리뷰 read-only). 피드백은 대화→생성으로만.
- **원칙4/C-5**: 누락 항목은 채택/제외를 명시 선택해야 하며 그냥 사라지지 않음(UI 문구·라디오 강제).
- **a11y(간소화 금지)**: 모든 인터랙티브 요소 `focus:ring-2 #1428A0`, `aria-label`, `role="alert"` 배너. Samsung 토큰(#1428A0 등).

## 코드에서 확인 안 됨
- redev-screen-spec.yaml의 단축키(F/C/T/R/M/A/D/Esc)·maximize 오버레이는 AS-BUILT App.tsx에 없음(iframe keydown 포워딩만 존재).
