# Application Design + Frozen Contract

> This document IS the §5 shared interface. jd owns it. Workers consume, never modify (propose only).
> Derived from `redev-screen-spec.yaml` (canonical console spec) + requirements §3. Legacy source NOT referenced (Q2).

## 1. Module boundaries (component map)

```
Blueprint-Agent/
  src/
    server/
      server.ts        [jd] Fastify app, static serve, route wiring, job runner, /events SSE, global error handler
      sse.ts           [jd] SSE bus (broadcast typed events)
    shared/
      types.ts         [jd] ALL shared types (the data contract) — read-only for workers
      store.ts         [jd] file-based persistence (runs/, versions.json, contracts) helpers
      llm.ts           [jd] LLM client: env-driven (ANTHROPIC_API_KEY/BASE_URL/MODEL). callLLM(system,user)->text
      ids.ts           [jd] deterministic utterance IDs (u-NNN), FR-NN helpers
    stages/
      capture.ts       [mingu] transcript -> Brief (LLM). exports runCapture(job)
      mockup.ts        [mingu] Brief(+prev) -> HTML mockup w/ intent metadata (LLM). exports runMockup(job)
      freeze.ts        [jd]    Visual Contract extraction (DETERMINISTIC, Playwright geometry). exports freeze(webPath)->VisualContract
      reverse.ts       [gyu]   VisualContract -> {specMd} (SRS/ERD/OpenAPI, LLM). exports runReverse(job)
      generate.ts      [gyu]   spec -> {codeMd, files} (LLM). exports runGenerate(job)
    prompts/           [mingu: capture,mockup] [gyu: reverse,generate]  system prompts per stage
  dashboard/           [suman] React+TS+Tailwind SPA (index.html, src/App.tsx, main.tsx, sse.ts, mic.ts, style.css)
  fixtures/            [yudo] fixture.html (initial preview), seed transcript(s)
  data/                (runtime) runs/, versions.json, mockups/  — created by store.ts
  README.md            [yudo] setup/run/usage + demo runbook
  screenshots/         [jd at demo] running-app screenshots (scoring)
```

**Atomicity**: after jd freezes scaffold on `main`, the 4 slices touch DISJOINT files:
suman=`dashboard/**`; mingu=`src/stages/{capture,mockup}.ts` + their prompts; gyu=`src/stages/{reverse,generate}.ts` + their prompts; yudo=`fixtures/**` + `README.md`. Shared `src/shared/**` + `src/server/**` are jd-frozen (read-only).

## 2. Data contract — `src/shared/types.ts` (authoritative shapes)

```ts
export interface ChatMsg { who: string; text: string }
export interface Utterance { id: string; who: string; text: string }        // id = u-NNN (deterministic doc order)
export interface Brief { md: string }                                        // human-readable brief w/ [근거: u-NNN] tags
export interface VersionEntry {
  project: string; version: number; createdAt: string; webPath: string; bytes: number;
  mode?: 'create' | 'edit'; baseVersion?: number;
  transcriptSnapshot?: string; groundingIds?: string[];                      // §3.2.3 preserved metadata
  usage?: { in: number; out: number };
}
export interface Template { id: string; emoji: string; title: string; desc: string; category: string; project: string; transcript: string }
// Visual Contract (freeze output) — machine + human readable
export interface VContractComponent { id: string; role: string; box: {x:number;y:number;w:number;h:number}; bind?: {object:string;field:string} }
export interface VContractAction { id: string; role: string; label: string; box: {x:number;y:number;w:number;h:number}; verb?: string; target?: string; fields?: string[]; result?: string }
export interface VisualContract {
  page: { title: string; viewport: {w:number;h:number} };
  dataObjects: { id: string; fields: {name:string;type:string;display?:string}[] }[];
  components: VContractComponent[];
  actions: VContractAction[];
  stateFlow: { action: string; from?: string; to?: string }[];
}
export type JobKind = 'capture' | 'mockup' | 'reverse' | 'generate';
export interface Job { id: string; kind: JobKind; status: 'running'|'done'|'error'; result?: any; error?: string }
```

## 3. HTTP API (frozen — matches redev-screen-spec.yaml §5)
| Method Path | Request | Response / job.result |
|---|---|---|
| GET  /transcript | — | `{ transcript: string }` |
| GET  /templates  | — | `{ templates: Template[] }` |
| GET  /versions   | — | `{ versions: VersionEntry[] }` |
| POST /capture (async) | `{ transcript }` | `202 {ok,jobId,status:'running'}` → job.result `{ brief }` |
| POST /mockup  (async) | `{ project, transcript }` | `202 {…jobId…}` → job.result `{ webPath, version, mode }` (server decides create/delta) |
| POST /freeze  (**sync**) | `{ webPath }` | `{ contract }` (VisualContract; view stringifies to YAML) |
| POST /reverse (async) | `{ contract }` | `202` → job.result `{ specMd }` |
| POST /generate(async) | `{ specMd }` | `202` → job.result `{ codeMd, files: string[] }` |
| GET  /jobs/:id | — | `Job` (poll 2s, timeout 480s) |
| GET  /events   | — | SSE stream (§4) |
| GET  /fixture.html, /mockups/* | — | static |

Async job protocol: `POST → 202 {ok,jobId,status:'running'}`; client polls `GET /jobs/:id` until `done|error`. `busy` cleared by client `finally`, not SSE.

## 4. SSE events — `GET /events` (frozen — redev-spec §6)
`brief` (→brief, tab=brief) · `mockup` (→iframe webPath, refresh versions) · `contract` (→contract, tab=contract) · `spec` (→spec, tab=spec, custView=spec) · `code` (→code+files) · `error` (→message) · `stt-line` `{who,text}` (STT, optional) · `job` `{jobId,kind,status}`.

## 5. LLM access contract — `src/shared/llm.ts`
`callLLM({system, user, maxTokens?}) : Promise<{text:string; usage:{in:number;out:number}}>`. Env: `ANTHROPIC_API_KEY`, optional `ANTHROPIC_BASE_URL` (Bedrock-proxy/z.ai compatible), `LLM_MODEL`. **No hardcoded keys** (security-baseline). If env missing → throw `"LLM 환경 미설정"` (client shows, no retry). Stages use ONLY callLLM; they never see raw markup except mockup.ts (the one authorized generation point, §1.4 원칙1) and freeze.ts which uses NO LLM.

## 6. Component interaction (one-click stakeholder flow)
```
transcript --/mockup--> [capture: LLM -> Brief] --> [mockup: LLM -> HTML+intent] --SSE mockup-->
  --/freeze(sync)--> [freeze: DETERMINISTIC Playwright -> VisualContract] --SSE contract-->
  --/reverse--> [reverse: LLM -> SRS/ERD/OpenAPI] --SSE spec--> (--/generate--> [generate: LLM -> code] --SSE code-->)
```

## 7. Invariant enforcement points
- C-1 (freeze deterministic): `freeze.ts` imports NO llm.ts; pure geometry+structure+intent fusion. jd-owned.
- C-2 (reverse contract-only): `runReverse` signature takes `{contract}` only; never transcript/markup.
- C-3 (no ungrounded gen): capture/mockup prompts forbid adding unstated elements; brief carries `[근거]` tags.
- C-4 (delta edits): mockup delta path requires prior version + delta utterances.
