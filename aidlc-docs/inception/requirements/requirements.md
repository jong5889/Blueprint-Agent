> ⚠️ **SUPERSEDED (v2 이력).** 현행 요구 정본은 `requirements/blueprint-agent-requirements.md`(rev + rev2 델타)이며, 계약은 `aidlc-docs/inception/application-design/application-design.md`(rev/rev2)다. 이 문서는 단일-고객모드 diet(v2) 시절 기록으로 남긴다.

# Requirements Analysis — Blueprint Agent (Minimal Depth)

## Intent Analysis
- **User request**: Build the Blueprint Agent service (Requirement-to-Architecture system) via the AI-DLC workflow, under a 5-hour hackathon deadline with a working, demo-able result.
- **Request type**: New Project (Greenfield)
- **Scope**: System-wide (full pipeline + web console)
- **Complexity**: Complex — but **requirements are exceptionally complete**, so depth is Minimal (no clarifying-questions round needed).

## Source-of-Truth Documents (inputs, not duplicated here)
| Doc | Authority |
|---|---|
| `requirements/blueprint-agent-requirements.md` | Functional + work-method scope (final authority) |
| `requirements/constraints.md` | Excluded features + design invariants C-1..C-4 |
| `requirements/redev-screen-spec.yaml` | **Console contract** (layout/views/state/SSE/endpoints/types) — canonical |
| `requirements/samsung-design-guidelines.md` | Visual spec for all web output — canonical |

## Key Functional Requirements (traceable to source §)
- FR-CAP  Capture: transcript → structured Brief; deterministic utterance IDs `u-NNN`; `[근거: u-…]` tags (§3.1)
- FR-MOCK Mockup: Brief → single HTML screen with author-intent metadata; delta edit; version history (§3.2)
- FR-FRZ  Freeze/Contract: **deterministic, no LLM**; fuse geometry + structure + intent → Visual Contract (§3.3, C-1)
- FR-REV  Reverse: Visual Contract → SRS(FR-NN) + ERD + OpenAPI; **contract-only input** (§3.4, C-2)
- FR-GEN  Generate: spec → FE/BE/DB representative code with FR-ref comments (§3.5)
- FR-CON  Console: stakeholder (one-click chain) + developer (6 views) modes; async jobs; SSE streaming (§3.7)
- FR-TRC  Traceability: utterance → brief → version → contract → spec → code chain preserved (§3.6)

## Non-Functional / Invariants (must not violate — §1.4, C-1..C-4)
1. LLM never consumes raw screen markup; touched once at the defined conversion point only (원칙1).
2. Freeze/contract step is deterministic, zero model cost (원칙2, C-1).
3. No ungrounded generation — brief adds nothing not in utterances; screen adds nothing not in brief (원칙3, C-3).
4. Every artifact preserves its parent + grounding (원칙4).
5. Reverse input limited to Visual Contract; never raw markup/transcript (C-2).
6. Edits require delta utterances (C-4).

## NFR (hackathon-scoped)
- Security-baseline extension **ENABLED**: no hardcoded secrets (env-driven LLM creds), input validation at HTTP boundary.
- Error handling on main paths + global handler (§3.7.3), errors surfaced to user, prior state preserved.
- File-based persistence (no RDBMS — constraints §6).

## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| security-baseline | Yes | Requirements Analysis |
| resiliency-baseline | No | Requirements Analysis (hackathon; inline error handling suffices) |
| property-based-testing | No | Requirements Analysis (constraints exclude auto test-gen) |
