# Blueprint Agent 개선 요구 (rev3)

> 팀 검토 freeze(`review-rev2-20260909`) 이후 요구. `blueprint-agent-requirements.md`·`constraints.md` 보완. 결정 확정됨.

## R1. 버전 revert (대화 되감기)
- **UX**: 왼쪽 대화 패널의 **버전 근거 경계선(`── vN 근거 경계 ──`) 클릭 → 그 버전으로 되감기.** v3 생성물이 마음에 안 들 때 v2 경계를 눌러 되돌린 뒤 다음 입력으로 v3를 새로 생성하는 흐름(사용자 주도 버전 관리).
- **동작(결정)**: 되감기 = **선택 버전 이후 버전 전부 삭제** + transcript를 선택 버전의 `transcriptSnapshot`까지 되감음 + draft(req/constraints)를 선택 버전 값으로 복원 + currentVersion 재설정.
- **방어**: 삭제 대상 중 **export 이력이 있는 버전이 있으면 경고** → 사용자가 재확인(force) 시에만 진행 (rev2 H 규칙 일관).
- 계약: `POST /meetings/:id/revert { toVersion, force? }` → 409 {exported} 또는 {currentVersion}.

## R2. 다중 버전(변형) 생성 — v{g}-{k} 형제 그룹
- **UX**: "N개 생성" 요청 시 동일 요구·제약에서 목업 변형 N개를 만들어 **`v1-1 · v1-2` 형태로 나열·선택**. 마음에 드는 변형을 골라 이어감.
- **모델**: `Version`에 `group`(논리 단계, 1-based) + `variant`(그룹 내 1-based) 추가. `n`(전역 고유)은 export/삭제의 조작 키로 유지. 표시 라벨 = 변형>1이면 `v{group}-{variant}`, 아니면 `v{group}`.
- **동작**: `POST /mockup { meetingId, variants? }`(기본 1). 서버가 N회 생성(LLM 비결정성=변형), 같은 group·variant 1..N로 저장. 편집(델타)은 선택된 변형 기준.
- 계약: `/mockup` 응답에 group·variant 포함. UI가 group으로 묶어 표시.

## R3. 다중 입력 동기화 (화자 유지 + 견고 sync)
- **원인(검토됨, `dashboard/src/App.tsx`)**: (1) 수동 입력이 전부 `사용자:`로 고정돼 화자 정보 소실, (2) `putTranscript` fire-and-forget 경쟁, (3) 로드 시 localStorage 우선·서버와 무화해.
- **개선**:
  - **발언자 필드**: 입력 옆에 화자 선택/입력(최근 화자 localStorage 유지) → 수동 입력에 실제 화자명 부착. 라벨 있으면 그대로.
  - **전송 견고화**: `send()`에서 PUT을 **await**(또는 디바운스 후 await)하여 서버 반영 보장.
  - **로드 화해**: `applyMeeting`에서 서버 vs localStorage를 **reconcile**(더 최신/긴 쪽 채택 등), 무조건 로컬 우선 제거.

## 결정 요약 (확정)
- R1: 삭제 + export 이력 경고(force). · R2: 이번에 함께 구현. · R3: 발언자 필드 + await PUT + reconcile.

## 문서/코드 반영 대상
- 계약(jd 배리어): `types`(Version+group,variant), `store`(saveVersion group/variant·revertTo·getVersion), `server`(`/mockup {variants}`·`/meetings/:id/revert`).
- 콘솔(subagent): 경계 클릭 revert UI(R1) · 변형 그룹 표시·다중선택(R2) · 발언자 필드·await·reconcile(R3).
- 문서(subagent): README·demo-runbook rev3.
