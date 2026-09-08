---
name: blue-agents
description: blueprint-ssh 플릿 오케스트레이션 단일 진입점. `/blue-agents`로 호출한다. 인자에 따라 상태 점검(status), 단발 하달(<작업내용>), AI-DLC 작업자별 브랜치 병렬 개발(aidlc), 세션 복구(fix)를 수행한다. "플릿", "하달", "분산 작업", "기기별로 나눠서", "병렬로 시켜", "blue-agents" 요청에 사용한다.
---

# /blue-agents — 플릿 오케스트레이션 진입점

모든 원격 조작은 `scripts/fleet.sh`로 한다. **직접 ssh 문자열을 조립하지 않는다** — cmd→wsl→bash→tmux 4중 인용이 깨진다. 그 지옥은 스크립트가 이미 풀어놨다.

```sh
./scripts/fleet.sh alive              # 5대 생사 확인
./scripts/fleet.sh status [host...]   # tmux 세션 확인
./scripts/fleet.sh send <host> <파일>  # 프롬프트 파일 하달
./scripts/fleet.sh read <host> [줄수]  # 결과 회수 (기본 20줄)
./scripts/fleet.sh stop <host>        # Escape 전송 (실행 중단)
./scripts/fleet.sh new <host>         # cc 세션 생성/복구
./scripts/worker-check.sh [경로] [host...]        # 환경 점검 11항목 — 하달 전에 돌린다
./scripts/main-sync.sh <워커저장소경로> [host...]   # main 갱신 후 전 기기 fetch + 통보
```

**`exec` 페이로드에 `$(...)`·큰따옴표 금지.** 로컬에서 전개되거나 인용이 깨진다 — `docs/worker-checklist.md` §함정.

## 인자별 동작

### `/blue-agents` (인자 없음) 또는 `status`
`fleet.sh alive` + `fleet.sh status`를 돌리고 표로 보고한다. 그게 전부다. 하달하지 않는다.

### `/blue-agents <작업 내용>` — 단발 분산 하달
1. **생사 확인** — `fleet.sh alive`. DOWN인 기기는 이후 전부 제외하고 **결과표에 명시**한다.
2. **분할** — 작업을 기기 수만큼 독립된 몫으로 쪼갠다. 서로의 결과를 기다려야 하면 쪼개지 않고 한 대에서 한다.
3. **배분** — 아래 §자원 표의 무게순으로 내린다.
4. **프롬프트 작성** — 몫마다 임시 파일. 반드시 포함: 담당 범위 / 건드릴 파일 / 출력 형식(줄 수 제한) / 완료 마커 / `ponytail 모드`.
5. **연속 하달** — `fleet.sh send`를 기기별로 던지고 **기다리지 않는다.**
6. **회수** — 45~120초 후 첫 `fleet.sh read`. 마커 없고 `esc to interrupt`가 있으면 실행 중이니 3~10분 간격으로 다시 본다.
7. **취합 보고** — 어느 기기가 무엇을 했는지 + 죽어서 빠진 기기.

### `/blue-agents aidlc` — AI-DLC 작업자별 브랜치 병렬 개발
BE/FE 고정 트랙이 아니다. **작업 유닛은 AI-DLC inception이 동적으로 정한다** (`.aidlc-rule-details/inception/units-generation.md` 결과). 유닛 수·경계는 고정이 아니며, 그 유닛을 살아있는 워커에 배분한다.

**브랜치 모델**
- `main` — 통합 대상. 동결된 계획·계약의 정본.
- `jd` — **PM(jd) 전용.** inception·계획·계약 수정은 여기서만 한다. 확정되면 `jd` → `main` 머지, 그러면 각 워커가 `main`에서 받아와 이어간다.
- `feat/<worker>` — 작업자별 1개 (예: `feat/suman`). 항상 최신 `main`에서 분기.

**절차**
1. **inception 산출물 확인** — 유닛 목록·의존성·계약(공유 인터페이스). 없거나 바꿔야 하면 jd가 `jd` 브랜치에서 만들고 `main`에 머지한다.
2. **계약 동결** — 유닛이 공유하는 데이터 모델/인터페이스 동결. 쓰기 권한은 jd 한 명, 워커는 제안만 (§0 규칙).
3. **분기** — 워커별 `feat/<worker>`를 동결된 `main`에서 딴다. 유닛↔작업자 매핑은 §자원 표 무게순으로 이 시점에 정한다 (고정 아님).
4. **배리어** — 전 워커 계약 ACK 후에만 구현 시작.
5. **병렬 구현** — 의존 없는 유닛끼리 완전 병렬. 의존 있으면 제공 유닛 먼저.
6. **머지** — 유닛 완료마다 `feat/<worker>` → `main` + `sh scripts/gate.sh standard`. 몰아서 안 한다. 의존 순서(제공자 먼저)대로.
7. **최종** — `sh scripts/gate.sh full` → G1 재승인.

**계획 중간 변경 (jd 주도)**: jd가 `jd` 브랜치에서 inception/계약을 고쳐 `main`에 머지 → 워커들에게 `main-sync.sh`로 통보 → 각 워커가 `feat/<worker>`에서 `git merge origin/main`으로 받아 이어간다.

**유동 대응**: 기기가 죽으면 그 작업자의 `feat/<worker>` 브랜치를 살아있는 기기(승계 gyu→yudo→ardr-dev)가 클론해 이어받는다. 브랜치명은 작업자지만 소유는 유닛이다 — 승계 시 매핑만 갱신하고 결과표에 명시한다.

`CONTRACT-BLOCKED[<계약ID>]`: 정지 범위는 그 계약을 공유하는 유닛들이다. 전 유닛 공유 계약이면 전체 정지, 일부만 쓰는 계약이면 그 워커들만. 정지는 대상 기기에 `Escape`로 건다.
상세 정지-수정-재개 규율은 `parallel-atomic-dev` 스킬, 2트랙 분산 예시는 `docs/aidlc-fleet-scenario.md`(참고용 — 강제 아님).

### `/blue-agents fix [host]` — 세션 복구
`fleet.sh status`로 `cc`가 없는 기기를 찾아 `fleet.sh new <host>`. yudo는 keeper가 없어 WSL idle로 자주 사라진다.

## 자원 (2026-09-07 실측)

| 기기 | 급 | 몫 |
|---|---|---|
| **suman** | 14C/18T · 15.6GB(6.6) · AC | **전면 최대 몫.** 빌드·테스트. `-j8` 상한 |
| **jd** (로컬) | M3 Pro 11C · 18GB · AC | 조율 + 중간 몫. 통합·게이트·판단이 우선 |
| **mingu** | 4C/8T · 7.8GB(WSL 3.7) · 유휴 | 독립 조사. 느려도 되는 몫 |
| **gyu** | M1 8C · 8GB(3.5) · AC 100% | 가벼운 조사·검증. 병렬 2~4 |
| **yudo** | 6C/12T · **5.8GB(가용 0.3)** · **배터리 방전** | 가벼운 조사·검증. 병렬 2~4, 문서·마크다운만 |
| **ardr-dev** | 6C/12T · 31GB · **RTX 5070 Ti** · AC | **백업 — 전면 배치 제외.** §백업 조건에서만 |

**배분 원칙**
1. 무게순: suman → jd → mingu → gyu → (yudo).
2. **빌드는 suman·jd에만.** mingu·gyu·yudo는 조사·문서·단일 파일.
3. 승계 순서 **gyu → yudo → ardr-dev**.
4. 한 유닛은 한 기기. 같은 유닛을 두 기기에 걸치지 않는다.

### ardr-dev 투입 조건 (셋 중 하나일 때만)
① 전면 기기 이탈로 유닛이 멈추고 yudo도 못 받을 때 ② GPU가 필요할 때(RTX 5070 Ti) ③ 통합 빌드가 전면 용량 초과.
투입해도 **`ai-orchestrator` 세션은 건드리지 않는다.** 우리 몫은 `cc` 뿐이다. 승계는 보고에 명시한다.

## 토큰 예산
- 프롬프트에 **읽을 문서를 명시**한다. "알아서 파악해"는 전체 코드베이스를 읽게 만든다.
- 코드 작업엔 `ponytail`, 구조 파악엔 `graphify` (5대 전부 설치 완료).
- 회수는 `read <host> N`으로 필요한 만큼만. 폴링 3~10분.

## 인증
워커 4대(suman·mingu·yudo·gyu)는 **Bedrock** — 헤더 `Opus 4.8 · Amazon Bedrock`이면 정상.
**ardr-dev만 `cz`(z.ai/glm-5.3-flash) 유지** — 허브 계정이 따로다. 거기선 `API Usage Billing`이 정상.
절차는 `CLAUDE.md`. (2026-09-08 전환 완료)

## 참조
- 워커 환경 점검·준비: `docs/worker-checklist.md`
- 상세 하달 문법·함정: `.claude/skills/fleet-dispatch/SKILL.md`
- AI-DLC 분산 시나리오 전문: `docs/aidlc-fleet-scenario.md`
- 플릿 정본·전환 절차: `CLAUDE.md`
