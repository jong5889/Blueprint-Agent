# U-console3 rev3 — Tasks

> 담당 파일: `dashboard/src/App.tsx` (단일 파일). `src/**`·`requirements/**`·README·git·npm 미수정. build: `npm run build:dashboard` pass.

## R1 버전 revert (경계선 클릭)
- [x] 근거 경계선을 `<button>`으로 전환(클릭 가능, focus ring, aria-label, title)
- [x] 클릭 시 native confirm → `revert(Math.max(...bound))` (그룹 형제 변형 보존, 이후 그룹만 삭제)
- [x] `revert(toVersion, force)` — `POST /meetings/:id/revert {toVersion, force}` 호출
- [x] 409 `{exported}` → 경고 confirm → 재확인 시 `{force:true}` 재요청
- [x] 성공 후 `saveTranscript(id, r.transcript)`로 로컬을 되감긴 값으로 덮음(reconcile 되살림 방지) → `GET /meetings/:id` → `applyMeeting`

## R2 다중 변형 생성 (v{group}-{variant})
- [x] `variantCount`(1~4) state + 실행 바 select UI
- [x] `generate()` → `/mockup {meetingId, variants: variantCount}`, 알림에 변형 개수 표기
- [x] `Version` 로컬 인터페이스에 `group`·`variant` 추가
- [x] `vlabel(n)`·`groupSize`·`vByN` 헬퍼 — 변형>1 → `v{g}-{k}`, else `v{g}`
- [x] 버전 칩을 group 으로 묶어 렌더(칩 클릭=loadVersion(n), 우클릭=deleteVersion(n))
- [x] 경계선·Export 버튼·삭제 메뉴 라벨을 `vlabel`로 통일

## R3 다중 입력 동기화
- [x] 발언자 필드(`speaker` state, localStorage `bp-speaker` 유지) — 입력 옆 배치
- [x] `send()`에서 라벨 없으면 `${speaker||'사용자'}: 내용` 부착
- [x] `send()` async 화 + `await putTranscript` (경쟁 제거)
- [x] `applyMeeting` reconcile — 로컬 vs 서버 더 긴 쪽 채택(동률→서버), 로컬 동기화. 무조건 로컬 우선 제거

## 유지 (rev2) — 회귀 없음
- [x] 진행 오버레이·activeJob 복원(resumeJob)·loadVersion·근거 경계선·freeze 없는 Export·폼 닫기·실명+u-NNN·우클릭 삭제(409 force)·SSE 세션 스코프·a11y·상태 배너

## 자체확인
- [x] `export PATH=/opt/homebrew/bin:$PATH && npm run build:dashboard` → pass (built in ~0.6s)
