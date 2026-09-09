# U-console3 rev3 — Functional Design

> 슬라이스 S-C(단일 통합 콘솔). 담당 파일 `dashboard/**` 만. 계약은 jd 동결(shared/server 수정 금지).
> 근거: `application-design.md` "rev3 계약 델타" §계약변경, `requirements/improvements-rev3.md` R1~R3, `src/shared/types.ts`(Version.group/variant), 실경로 `src/server/server.ts`.

## 계약 근거 (읽기만, 수정 금지)

- `Version` = `{n, group, variant, createdAt, mode, parent?, transcriptSnapshot, groundingIds, requirementsMd, constraintsMd, webPath}`. `n`=전역 고유·조작 키(load/export/delete/revert). 표시 라벨 = 그룹 변형>1 → `v{group}-{variant}`, else `v{group}`.
- `POST /mockup {meetingId, variants?}` — **async(202+jobId)**, 폴링 결과 `{webPath, version, mode, group, variants:[{version, webPath, variant}]}`. 대표값(첫 변형)이 `version`. variants 1~4로 서버가 clamp (server.ts:110).
- `POST /meetings/:id/revert {toVersion, force?}` — **sync**. 성공 `{currentVersion, transcript}`(transcript=되감긴 스냅샷). export 이후 이력 있으면 `409 {error:'exported', exported:true, message}` (server.ts:206). force=body true 또는 `?force=1`.
- `GET /meetings/:id` → 전체 Meeting(versions에 group/variant 포함, transcript는 revert 후 되감긴 값).

## 개선별 설계

### R1 버전 revert (경계선 클릭)
- 대화 패널의 근거 경계선(`── vN 근거 경계 ──`)을 `<button>`으로 만들어 클릭 가능. 클릭 → native confirm("이후 버전·대화가 삭제됩니다") → `revert(toVersion)`.
- **toVersion 선택**: 한 경계에 여러 버전(같은 group의 변형들)이 걸릴 수 있음 → `Math.max(...bound)`로 되감아 그 그룹 전체(형제 변형)를 보존하고 이후 그룹만 삭제.
- **409 방어**: `revert` 응답 409 `{exported}` → confirm 경고 → 재확인 시 `{force:true}` 재요청 (rev2 H 삭제 방어와 동일 패턴).
- **성공 후**: 서버 transcript가 되감겨 로컬 localStorage(더 긴 옛 값)보다 짧음 → 반드시 `saveTranscript(id, r.transcript)`로 로컬을 서버값으로 덮어써 R3 reconcile이 옛 로컬을 되살리지 않게 함. 그 뒤 `GET /meetings/:id` → `applyMeeting` (대화·버전·draft 되감김 반영).

### R2 다중 변형 생성 (v{group}-{variant} 그룹)
- **개수 선택 UI**: 실행 바에 `variantCount`(1~4) select. 기본 1.
- `generate()`가 `/mockup {meetingId, variants: variantCount}` 전송. 응답 대표 `version`으로 `loadVersion`. 알림에 변형 개수 표기.
- **그룹 표시**: 버전 칩·경계 라벨을 group으로 묶어 표시. `groupSize(group)>1`이면 각 변형 칩 `v{group}-{variant}`, 아니면 `v{group}`. 조작 키는 `v.n` 유지(클릭=loadVersion(n), 우클릭=deleteVersion(n)).
- `vlabel(n)` 헬퍼: n→Version→group/variant 라벨. 경계선·칩·알림·Export·삭제 메뉴에서 공통 사용(더 이상 `v{n}` 노출 안 함). 편집(델타) 생성은 현재 selectedVersion 기준(기존 loadVersion 유지).

### R3 다중 입력 동기화
- **발언자 필드**: 입력창 옆 `speaker` 텍스트 입력. 초기값·변경값을 localStorage `bp-speaker`에 유지. `send()`에서 입력에 라벨(`이름:`)이 없으면 `${speaker||'사용자'}: ${text}` 부착, 있으면 그대로.
- **await 전송**: `send()`를 async로, `await putTranscript(next)` — fire-and-forget 경쟁 제거.
- **로드 reconcile**: `applyMeeting`에서 무조건 로컬 우선 제거. 서버 transcript vs localStorage 중 **더 긴 쪽 채택**(동률→서버). 채택값이 로컬과 다르면 로컬도 동기화(saveTranscript). revert 시 로컬을 서버값으로 미리 덮으므로 되감김이 유지됨.

## 유지 (rev2)
진행 오버레이·activeJob 복원(resumeJob)·버전동기 loadVersion·근거 경계선·freeze 없는 Export·폼 닫기·실명 크게+u-NNN 병기·우클릭 삭제(409 force)·SSE 세션 스코프·a11y(aria-label, focus ring)·상태 배너(error/notice).

## 자체확인
`export PATH=/opt/homebrew/bin:$PATH && npm run build:dashboard` 성공.
