# Units Generation — 4 Atomic Slices (§5.4)

Contract frozen in `../../inception/application-design/application-design.md`. jd builds scaffold+freeze first, then dispatches these 4 to the fleet. Each is independently completable after contract freeze (atomicity).

## jd (pre-dispatch, `jd`→`main`) — SCAFFOLD + CONTRACT + FREEZE
package.json/tsconfig/vite/tailwind · `src/server/{server,sse}.ts` (routes wired, job runner, SSE, global error handler, all stage stubs importable) · `src/shared/{types,store,llm,ids}.ts` · `src/stages/freeze.ts` (deterministic Playwright extraction, §3.3/C-1) · minimal `fixtures/fixture.html` placeholder · `data/` bootstrap. Merge to `main`, tag freeze. **Barrier**: workers ACK before impl.

## Slice → worker mapping (blue-agents weight order)
| Slice | Worker | Files (disjoint) | Deliverable |
|---|---|---|---|
| **FE — Console SPA** | **suman** (heaviest, builds) | `dashboard/**` | Full React+TS+Tailwind SPA per `redev-screen-spec.yaml`: customer+developer modes, 6 views, SSE hook (`useSse`), job polling, shortcuts (F/C/T/R/M/A/D/Esc), maximize overlay, version chips, chat panel, mic toggle stub. Samsung design tokens. a11y 4.5:1 + focus ring (non-negotiable). |
| **CAP — Capture+Mockup** | **mingu** | `src/stages/{capture,mockup}.ts`, `src/prompts/{capture,mockup}.*` | `/capture`: transcript→Brief, deterministic `u-NNN` ids, `[근거: u-…]` tags, no ungrounded content (C-3). `/mockup`: Brief→HTML w/ `data-*` intent metadata (role/bind/action, §3.2.1), Samsung tokens, delta edit (C-4), version persist via store. |
| **REV — Reverse+Generate** | **gyu** (light, md) | `src/stages/{reverse,generate}.ts`, `src/prompts/{reverse,generate}.*` | `/reverse`: VisualContract→SRS(FR-NN)+ERD+OpenAPI markdown, contract-only input (C-2). `/generate`: spec→FE/BE/DB representative code w/ FR-ref comments (§3.5). No Playwright/heavy deps. |
| **CONTENT — fixtures+docs** | **yudo** (lightest, md only) | `fixtures/**`, `README.md`, `docs/demo-runbook.md` | `GET /templates` seed data (≥3 example meeting transcripts as Template[]), `fixture.html` initial preview (Samsung-styled sample screen), seed `/transcript`. README: setup/env/run/usage/troubleshooting (사용성 scoring). Demo runbook. |

## Dispatch rules
- Prompts (temp files) MUST include: 담당 파일(only), contract doc path to read, output format, done marker `<SLICE>-DONE`, `ponytail 모드`, **"레거시 저장소 참조 금지 (Q2)"**, "shared/** server/** 수정 금지 — 제안만".
- Workers read: `requirements/redev-screen-spec.yaml`, `requirements/samsung-design-guidelines.md`, `aidlc-docs/inception/application-design/application-design.md`. NOT the whole codebase (token budget).
- Integration: jd merges `feat/<worker>`→`main` in dep order (scaffold already there; slices independent) + `gate.sh`.
- STT (§3.1.2) deferred (post-priority); mic is a UI stub only in FE slice.
