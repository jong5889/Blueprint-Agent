# U2 콘솔 rev2 — Functional Design

> 슬라이스 S-C(단일 통합 콘솔). 담당 파일 `dashboard/**` 만. 계약은 jd 동결(shared/server).
> 근거: `application-design.md` "rev2 계약 델타" §변경요지·계약변경, `requirements/improvements-rev2.md` A~H, `src/shared/types.ts`.

## 계약 근거 (읽기만, 수정 금지)

- `Meeting.activeJob?: {id;kind;status}` — 진행 중 job 영속. `GET /meetings/:id` 응답에 포함(server.ts `getMeeting` 전체 반환).
- `Version` = `{n, createdAt, mode, parent?, transcriptSnapshot, groundingIds, requirementsMd, constraintsMd, webPath}` — **frozen/major 제거됨**. 버전이 req/con/목업을 함께 보존 → B의 근거.
- `POST /export {meetingId, version}` → `{manifest, dir}` (server.ts:161). major 아님.
- `DELETE /meetings/:id/versions/:n[?force=1]` → 정상 시 store.deleteVersion 결과, export 이력 있으면 `409 {error:'exported', exported:true, message}` (server.ts:185).
- job 시작 시 `store.setActiveJob`, 완료·에러 시 clear(server.ts:33/47). job은 in-memory(`/jobs/:id`), activeJob은 회의체에 영속 → 서버 재시작 시 job 404 가능.

## 개선별 설계

### A 진행표시 + 복원 (#1, #7)
- **진행 표시**: 우측 메인 패널에 `busy`일 때 반투명 오버레이 + 스피너 + 현재 단계(step) 문구. 실행 버튼은 기존대로 `disabled={!!busy}`.
- **복원**: `applyMeeting` 시 `m.activeJob?.status==='running'`이면 `resumeJob(id, activeJob)` 호출 → `busy=kind`로 오버레이 켜고 `/jobs/:id` 폴링 이어감. job이 404(서버 재시작)면 `/meetings/:id`의 `activeJob`이 null이 될 때까지 폴링. 종료 후 회의체 재로드 + 최신 버전 로드.
- 새 세션(genSessionId)이라 SSE는 새 job만 받으므로, 복원은 폴링으로만 처리(중복 없음).

### B 버전 동기화 (#2)
- `loadVersion(m, n)`: n=버전이면 그 Version의 `requirementsMd/constraintsMd/webPath`를 req·con·mockup에 로드하고 `selectedVersion=n`. n=null이면 draft(req/con) + mockup 없음.
- 버전 칩 클릭 → `loadVersion(meeting, v.n)`. `applyMeeting`·`generate` 후에도 최신 버전으로 loadVersion → req/con/목업 항상 한 세트.

### C 근거 경계선 (#3)
- 각 버전의 `transcriptSnapshot` 발언 수 = 그 버전이 근거로 삼은 경계. 대화 타임라인에서 그 수만큼의 발언 뒤에 `──── vN 근거 경계 ────` 가로 구분선 삽입(같은 경계 공유 시 병기).

### D Freeze 제거·Export 통합 (#4)
- Freeze 버튼·`freeze()`·`major` 상태 전부 제거. Export = `POST /export {meetingId, version: selectedVersion ?? latestVersion}` → 응답 `{manifest, dir}` 표시.

### F 폼 닫기 (#6)
- 새 회의체 폼에 취소/닫기 버튼(폼 토글 off). 헤더 토글 버튼과 폼 내부 취소 둘 다.

### G 실명 표시 (#8)
- 채팅 버블: 발언자 이름 크게(text-sm font-medium) + `u-NNN` 작게 옆 병기. 근거 태그: `idToName` 맵으로 이름 + id 병기. `u-NNN`은 식별자로 그대로 유지(파싱 규칙 불변).

### H 삭제 + 방어 (#9)
- 버전 칩 우클릭 → 컨텍스트 메뉴 "삭제". `DELETE .../versions/:n`. `409 {exported:true}`면 native confirm으로 "export 이력 있음" 경고 → 재확인 시 `?force=1` 재요청. 삭제 후 회의체 재로드, 선택 포인터 최신으로 재계산.

## 유지 불변
세션스코프 SSE(`/events?sid=`), 잡 폴링, 대화 localStorage 영속, genSessionId 폴백, a11y(focus ring·aria), 빈/로딩/성공/오류 피드백.
