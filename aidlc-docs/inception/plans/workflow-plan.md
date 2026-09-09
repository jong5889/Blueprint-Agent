# Workflow Plan

> ⚠️ **SUPERSEDED (v1/v2 이력).** 현행은 로컬 개발(플릿 미사용). rev 구현 분해는 `aidlc-docs/construction/plans/units-and-slices.md`, rev2 계획은 application-design "rev2 계약 델타" 참조.

**Constraint**: 5-hour hackathon. Fresh fleet re-development from frozen contract (Q2). Orchestrated from `blueprint-ssh` via `fleet.sh`.

## Stage decisions
| Stage | Run? | Depth | Note |
|---|---|---|---|
| Workspace Detection | ✅ done | — | Greenfield |
| Reverse Engineering | ⛔ skip | — | Greenfield (legacy not referenced per Q2) |
| Requirements Analysis | ✅ done | Minimal | Requirements exceptionally complete |
| User Stories | ⛔ skip | — | Personas/flows fully implied by §3.7 + redev-spec; time-boxed |
| Workflow Planning | ✅ this doc | — | |
| Application Design | ✅ | Standard | Module boundaries + frozen contract (the §5 shared interface) |
| Units Generation | ✅ | Standard | Exactly 4 atomic slices (§5.4) + jd-owned scaffold |
| Construction (per-unit) | ✅ | Code Gen | Fleet parallel; jd integrates |
| Build & Test | ✅ | Standard | jd runs gate after integration; screenshots for demo |

## Parallel-dev method (§5)
- **jd (local, `jd`→`main`)**: owns contract; builds shared scaffold + deterministic Freeze module; freezes; decomposes; dispatches; integrates; gates.
- **Barrier**: workers start only after contract ACK on frozen `main` (§5.4 [2]).
- **4 workers** on `feat/<worker>` from frozen `main`; consume contract, never modify it (propose only).
- Global pause on `CONTRACT-BLOCKED[id]`; jd revises on `jd`, re-freezes, resumes.

## Time budget (target)
1. Inception + scaffold + freeze module + push/freeze `main` — jd, ~60–75 min.
2. Dispatch + parallel impl (4 workers) — ~120–150 min wall (parallel).
3. Integration + gate + fixes — jd, ~45 min.
4. Demo run + screenshots + README polish — ~30 min.
