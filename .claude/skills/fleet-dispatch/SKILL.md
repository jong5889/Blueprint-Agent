---
name: fleet-dispatch
description: blueprint-ssh 플릿(ardr-dev/yudo/mingu/suman/gyu + 로컬 jd(PM))에 작업을 분할 하달하고 결과를 회수해 취합한다. 작업을 나눠 여러 기기에서 병렬 실행하고 싶을 때, "하달", "분할 작업", "플릿", "기기별로 나눠서", "병렬로 조사" 같은 요청에 사용한다. 기기 성능에 맞춰 몫을 배분하는 규칙과 검증된 tmux 전송 경로를 포함한다.
---

# fleet-dispatch — 플릿 작업 하달

각 기기의 tmux 세션 `cc`에 claude가 상주해 있다. 여기에 프롬프트를 넣고 결과를 긁어온다.

## 0. 하달 전 생사 확인 (필수)

```sh
tailscale status | grep -iE 'ardr-dev|yudo|mingu|suman|gyu'
```
Tailscale의 `active` 표시는 **믿지 않는다.** 슬립 중인 기기도 active로 뜬다.
`ssh <host> 'echo alive'` 성공만이 진짜 판정이다. 죽은 기기는 **결과표에 명시**하고 조용히 빼지 않는다.

## 1. 기기별 성능과 몫 배분 (2026-09-07 실측)

| 기기 | CPU | RAM (가용) | GPU | 디스크 | 전원 | 배분 원칙 |
|---|---|---|---|---|---|---|
| **ardr-dev** | i7-8700K 6C/12T @3.7GHz | 31GB (9GB) | **RTX 5070 Ti** | NVMe, 69GB 여유 | AC | **백업 자원 — 전면 배치 제외.** 승계·GPU·통합빌드 때만 투입 |
| **jd** (로컬·PM) | M3 Pro 11C (5P+6E) | 18GB (51% free) | M3 Pro 14코어 | 87GB 여유 | AC | PM·조율·취합·중간 규모. 병렬 4~6 |
| **suman** | Core Ultra 5 125H 14C/18T | 15.6GB (6.6GB) | Arc iGPU | NVMe, C: 58GB | AC+만충 | 중간 규모. `-j8` 내외 |
| **mingu** | i5-10210U 4C/8T @1.6GHz | 7.8GB (WSL 3.7GB) | MX250 2GB | NVMe, C: 여유 | — | **가벼운 조사/검증.** `-j2~4` |
| **yudo** | Ryzen 5 5500U 6C/12T | **5.8GB (가용 0.3GB)** | Radeon iGPU | NVMe, C: 61GB | **배터리 49% 방전 중** | **가벼운 것만.** `-j2~3`. 메모리 스래싱 위험 |
| **gyu** | Apple M1 8C (4P+4E) | **8GB** (3.5GB) | M1 GPU 7코어 | 50GB 여유 | AC + 배터리 100% | 가벼운 조사·검증. 병렬 2~4. **yudo보다 안정적** |

**배분 규칙**
1. **ardr-dev는 전면에 세우지 않는다.** 유일한 여유 데스크톱이자 knowledge-base 허브라, 전면 배치하면 장애 시 물러설 곳이 없다. 전면 기기 이탈·GPU 필요·통합 빌드 초과일 때만 투입한다.
   전면 자원은 **jd · suman · mingu · yudo** 4대다. 무거운 몫은 suman이 받는다.
2. yudo는 가용 RAM 0.3GB + 배터리 방전 중이다. **긴 빌드를 주지 않는다.** 짧은 조사·단일 파일 검증만.
   같은 급 몫이면 **gyu를 먼저 쓴다** — 8GB/AC로 yudo보다 안정적이다.
3. mingu는 저전력 U시리즈다. 시간이 걸려도 괜찮은 독립 조사에 쓴다.
4. suman은 코어는 많지만 RAM이 병목이다. 중간 규모까지.
5. 로컬 jd는 워커이자 조율자(PM)다. 자기 몫을 반드시 수행하고 결과에 포함한다.
6. 기기 간 의존이 없는 몫으로 쪼갠다. 서로의 결과를 기다려야 하면 분할하지 않는다.

## 2. 전송 경로

| 기기 | 접두사 |
|---|---|
| ardr-dev, yudo | `ssh <host> 'bash -lc "..."'` |
| gyu | `ssh gyu 'zsh -lc "..."'` (macOS/zsh, brew tmux `/opt/homebrew/bin`) |
| mingu | `ssh mingu 'wsl -d Ubuntu -u mingu -- bash -lc "..."'` |
| suman | `ssh suman 'wsl -d Ubuntu -u sumanpark -- bash -lc "..."'` |

## 3. 하달 (검증된 방법)

한글·따옴표가 섞인 프롬프트를 `send-keys`로 직접 보내면 cmd→wsl→bash→tmux 4중 인용 때문에 깨진다.
**파일 → load-buffer → paste-buffer** 만 쓴다.

```sh
# 1) 프롬프트 파일로 (stdin 경로는 인용 문제가 없다)
ssh mingu 'wsl -d Ubuntu -u mingu -- bash -lc "cat > /tmp/p.txt"' < prompt.txt
# 2) 붙여넣고 실행
ssh mingu 'wsl -d Ubuntu -u mingu -- bash -lc "tmux load-buffer /tmp/p.txt; tmux paste-buffer -t cc; sleep 1; tmux send-keys -t cc Enter"'
# 3) 회수
ssh mingu 'wsl -d Ubuntu -u mingu -- bash -lc "tmux capture-pane -t cc -p -S -80"'
```

프롬프트 끝에 **완료 마커**를 요구한다 (`SPEC-DONE`, `GPU-REPORT-DONE` 등). 회수 시점 판별용이다.
출력 정리: `tr -d '\000\r'` + OpenSSH 포스트퀀텀 경고 4줄 grep 제외.

## 4. 회수와 취합

- 하달 직후 바로 긁지 않는다. 작업 규모에 따라 **45~120초** 기다린 뒤 첫 회수.
- 마커가 안 보이면 `esc to interrupt`가 떠 있는지 본다 — 있으면 아직 실행 중이다. 30~60초 더 기다린다.
- 캡처가 잘리면 `-S -80` 처럼 스크롤백을 늘린다.
- 취합 보고에는 **어느 기기가 무엇을 했는지**와 **죽어서 빠진 기기**를 반드시 포함한다.

## 5. 토큰 절약

각 기기에 `ponytail`(과설계 억제) 플러그인과 `graphify` 스킬이 설치돼 있다.
하달 프롬프트에 다음을 넣으면 응답이 짧아진다.
- 출력 형식을 명시한다 ("표 없이 번호 목록", "10줄 이내").
- 코드 작업이면 프롬프트 앞에 `/ponytail` 또는 "ponytail 모드로"를 붙인다.
- 코드베이스 구조 질문이면 `/graphify` 를 쓰게 한다 — 전체 파일을 읽는 것보다 싸다.
- 회수는 `tail -N`으로 필요한 만큼만 긁는다. 전체 스크롤백을 컨텍스트에 넣지 않는다.

## 6. 세션이 없을 때

```sh
# 직결 (yudo, gyu) — ~/.cc-start.sh를 send-keys로 띄운다 (new-session에 인용 중첩하면 claude가 안 뜬다)
ssh <host> 'bash -lc "tmux new-session -d -s cc -x 200 -y 50 -c ~; sleep 1; tmux send-keys -t cc ~/.cc-start.sh Enter"'
# ardr-dev (z.ai 유지)
ssh ardr-dev 'bash -lc "tmux new-session -d -s cc -x 200 -y 50 -c ~ \"bash -lc \\\"cd ~; cz; exec bash\\\"\""'
# WSL (mingu, suman) — keeper 재시작이 정석
ssh <host> 'schtasks /end /tn <host>-cc'
ssh <host> '<wsl접두사> bash -lc "tmux kill-server; pkill -f \"has-sessio[n] -t cc\""'
ssh <host> 'schtasks /run /tn <host>-cc'
```
`ardr-dev`의 `ai-orchestrator` 세션은 **건드리지 않는다.** 우리 몫은 `cc` 뿐이다.
yudo는 keeper가 없고 WSL idle로 tmux가 통째로 사라진다. 하달 전 `tmux ls` 확인.

## 7. 인증

워커 4대(suman·mingu·yudo·gyu)는 **Bedrock**(`claude --dangerously-skip-permissions`). TUI 헤더가 `Opus 4.8 · Amazon Bedrock`이면 정상.
**ardr-dev만 z.ai(`cz`) 유지** — 허브 계정이 따로다. 거기선 `glm-5.3-flash ... API Usage Billing`이 정상.
전환 절차는 `CLAUDE.md` 참조. (2026-09-08 전환 완료)
