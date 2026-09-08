# Application Design + Contract (rev — AI-DLC 앞단 제품 / 로컬 개발)

> 정본: `requirements/blueprint-agent-requirements.md` (rev, f1eeff5) + `constraints.md` (C-1~C-6).
> 개발: **로컬(플릿 미사용)**. 이 문서가 구현 계약. export 파일 세트 포맷을 §5에서 확정한다.

## 1. 모듈 맵 (v1 대비 keep/adapt/remove/add)

```
src/
  shared/
    types.ts     [rewrite] 프로젝트>회의체>버전, req/constraints 항목, VisualContract, ExportSet, Coverage, Job
    ids.ts       [keep+]   u-NNN(발언) 결정적 + R-NN(요구)·C-NN(제약) 번호 헬퍼
    store.ts     [rewrite] 계층형 저장(project>meeting>version): 구조화 인덱스는 SQLite(임베디드) 허용,
                           HTML·export 세트 등 대용량 산출물은 파일. (constraints §5 완화) + export IO + re-import
    llm.ts       [keep]    Bedrock env-driven (global.anthropic.claude-opus-4-8)
  server/
    server.ts    [rewrite] 라우트 재편, 잡 러너, 세션스코프 SSE, 정적, 전역 에러핸들러
    sse.ts       [keep]    세션 스코프(?sid=) — 그대로
  stages/
    extract.ts   [NEW, replaces capture] 대화 → requirements + constraints (대칭, 근거 태그)  [모델]
    mockup.ts    [adapt]   req+constraints → HTML(data-bp-*) + 델타 고도화 + 버전 저장           [모델]
    coverage.ts  [NEW]     대화 vs 현재 req·constraints → 누락 후보[]                            [모델]
    contract.ts  [rename from freeze.ts] 목업 → 시각 계약 (결정적, Playwright) — export 시점 사용  [무모델]
    export.ts    [NEW]     확정본+목업+계약+trace+manifest 세트 조립 (결정적)                     [무모델]
    reimport.ts  [NEW]     export 세트 읽어 새 회의체 시드 (왕복)                                  [무모델]
    ── remove: reverse.ts, generate.ts, prompts/{reverse,generate}.ts
  prompts/       extract·mockup·coverage 시스템 프롬프트
dashboard/       [rewrite] 단일 콘솔(모드 분리 없음): 대화 | req·constraints | 목업 프리뷰 | 누락체크 | freeze/export | 회의체·버전 내비
data/            (런타임) projects/<p>/meetings/<m>/versions/<n>/ · exports/<p>/<m>/v<major>/
tests/conformance.ts  [rewrite] rev 불변원칙(C-1~C-6) + 골든패스 회귀
```

## 2. 데이터 계약 — types.ts

```ts
export interface Utterance { id: string; who: string; text: string }   // u-NNN 결정적
export interface Item { id: string; text: string; groundingIds: string[]; kind: 'req'|'constraint';
  source?: 'extracted'|'exclusion' }                                    // req=R-NN, constraint=C-NN
export interface DocPair { requirementsMd: string; constraintsMd: string } // 사람이 읽는 문서(§3.2) — 항목 줄에 [근거: u-NNN]

export interface Version {
  n: number; createdAt: string; mode: 'create'|'edit'; parent?: number;
  transcriptSnapshot: string; groundingIds: string[];                   // create=전체, edit=델타
  requirementsMd: string; constraintsMd: string; webPath: string;       // webPath = 목업 HTML
  frozen?: boolean; major?: number; usage?: { in: number; out: number };
}
export interface Meeting { id: string; project: string; title: string; transcript: string; currentVersion: number; versions: Version[] }
export interface ProjectIndex { project: string; meetings: {id:string;title:string}[];
  frozenMajors: { meeting:string; major:number; at:string }[]; decisions: { text:string; groundingIds:string[] }[] }

// 커버리지/누락 체크 (§3.5)
export interface CoverageItem { text: string; groundingIds: string[] }  // 요청됐으나 미반영 후보
export interface CoverageResolution { item: CoverageItem; action: 'adopt-req'|'adopt-constraint'|'exclude' }

// 시각 계약 (결정적, export 시점) — v1 스키마 유지
export interface VisualContract { page:{title:string;viewport:{w:number;h:number}};
  dataObjects:{id:string;fields:{name:string;type:string;display?:string}[]}[];
  components:{id:string;role:string;box:{x:number;y:number;w:number;h:number};bind?:{object:string;field:string}}[];
  actions:{id:string;role:string;label:string;box:{x:number;y:number;w:number;h:number};verb?:string;target?:string;fields?:string[];result?:string}[];
  stateFlow:{action:string;from?:string;to?:string}[] }

export type JobKind = 'extract'|'mockup'|'coverage';
export interface Job { id:string; kind:JobKind; status:'running'|'done'|'error'; result?:unknown; error?:string }
```

## 3. HTTP API (jd 확정 계약)

| Method Path | 입력 | 결과 | 모델/실행 |
|---|---|---|---|
| GET /projects | — | ProjectIndex[] | 동기 |
| GET /meetings/:id | — | Meeting (transcript+versions) | 동기 |
| POST /meetings | {project,title,transcript?} | Meeting | 동기 |
| PUT /meetings/:id/transcript | {transcript} | ok | 동기 (대화 영속) |
| POST /extract | {meetingId} | 202→job {requirementsMd,constraintsMd} | 모델/비동기 |
| POST /mockup | {meetingId} | 202→job {webPath,version,mode} | 모델/비동기 |
| POST /coverage | {meetingId} | 202→job {missing:CoverageItem[]} | 모델/비동기 |
| POST /coverage/resolve | {meetingId,resolutions:CoverageResolution[]} | {requirementsMd,constraintsMd} | 모델(편입 문구화)/동기* |
| POST /freeze | {meetingId,version} | {major} | 무모델/동기 |
| POST /export | {meetingId,major} | ExportManifest (+ 파일 세트 기록) | 무모델/동기 (계약 추출 포함) |
| POST /import | {exportRef} 또는 업로드 | Meeting (시드됨) | 무모델/동기 |
| GET /jobs/:id · GET /events?sid= | — | Job · SSE | — |

\* coverage/resolve의 '채택'은 근거가 이미 대화에 있으므로 문구 정리에만 모델을 쓰거나 결정적으로 편입한다(구현 재량).

**SSE(세션 스코프, ?sid=)**: `extract`(requirements·constraints) · `mockup` · `coverage` · `error` · `job` · `stt-line`. 잡은 x-session-id로 태그, 해당 세션에만 전송. busy 해제는 클라 finally.

## 4. 골든패스 흐름 (§1.3 / §6 앵커 ★)

```
대화 입력·저장(PUT transcript)
 → POST /extract         → requirements.md + constraints.md (대칭, [근거:u-NNN])
 → POST /mockup          → HTML 목업(data-bp-*), 프리뷰
 → (반복) 대화 추가 → POST /coverage → 누락 후보 → 휴먼 게이트(채택/제외) → /extract·/mockup 델타 고도화
 → POST /freeze          → major 고정
 → POST /export          → [export 세트] (이때 목업→시각계약 결정적 추출)
 → POST /import (다른 회의체)  → 왕복
```

## 5. Export 파일 세트 — **확정 계약**

freeze된 major마다 `data/exports/<project>/<meeting>/v<major>/` 아래:

| 파일 | 내용 |
|---|---|
| `requirements.md` | 요구 확정본 (항목별 `[근거: u-NNN]`) |
| `constraints.md` | 제약 확정본 (추출 + 의도적 제외 결정, `[근거: u-NNN]`) |
| `mockup.html` | 확정 목업 HTML (의도 메타 포함) |
| `visual-contract.json` | 목업에서 **결정적 추출**한 VisualContract (C-1) |
| `trace.json` | `{ utterances:Utterance[], items:Item[], decisions:CoverageResolution[], lineage:{meeting,major,parents} }` — 근거 추적 정본 |
| `manifest.json` | `{ project, meeting, major, frozenAt, importantDecisions:Item[], files:{...}, schema:'bp-export/1' }` — **re-import 왕복의 최소 정보** |

- **왕복 보장**: `POST /import`는 이 세트의 `manifest.json` + `requirements.md`/`constraints.md` + `trace.json`을 읽어 새 회의체를 시드한다. 전체 대화는 불필요하나 **중요 의결사항+근거(manifest.importantDecisions, trace)** 는 반드시 복원된다(§3.7.3).
- **하류 투입(목적 b)**: 같은 세트를 사람/AI가 SRS·HLD·LLD·ADR 작성 입력으로 사용. 이 제품은 세트 산출까지만 책임.

## 6. 불변원칙 강제 지점 (원칙1~6 / C-1~C-6)

- **원칙1/C-2 (원천=req·constraints)**: 목업 직접 편집 경로 없음. 피드백은 대화→/extract·/mockup 델타로만. 하류 전파는 목업이 아니라 visual-contract.json.
- **원칙2/C-3 (무근거 생성 금지)**: extract 프롬프트가 대화 밖 내용 추가 금지 + `[근거]` 강제. mockup은 req·constraints 요소만.
- **원칙3/C-4 (무근거 변경 금지)**: 델타 고도화 입력 = 직전 버전 + 델타 발언에서 도출된 수정분. 델타 0이면 수정 차단.
- **원칙4/C-5 (무근거 휘발 금지)**: /coverage가 미반영 요청을 flag → 채택 또는 명시적 제외(제외=constraint)로만 귀결. resolve 없이 사라지지 않음.
- **원칙5/C-1 (계약 결정성)**: contract.ts는 llm 미import, Playwright 기하 결정적. export 시 동기. 동일 목업 ⇒ 동일 계약.
- **원칙6 (근거 보존)**: 모든 버전/항목이 groundingIds·parent·snapshot 보존. trace.json이 정본.
- **C-6 (얇은 슬라이스)**: STT는 얇은 어댑터(§8), core 골든패스에 무거운 장치 도입 금지.

## 7. 로컬 구현 계획 (units — 골든패스 우선, 순차/일부 병렬)

| U | 범위 | 골든패스 |
|---|---|---|
| U1 | 기반: types + store(계층) + server 스켈레톤 + ids | 전제 |
| U2 | extract: 대화 → req+constraints 대칭(근거) | ★ |
| U3 | mockup: req+constraints → HTML + 델타 + 버전 | ★ |
| U4 | contract(결정적) + freeze + export 세트 | ★ |
| U5 | coverage 체크 + 휴먼게이트 resolve (C-5) | core |
| U6 | re-import 왕복 | core |
| U7 | 단일 콘솔 UI (대화·문서·프리뷰·누락·freeze/export·회의체/버전 내비, 상태 피드백) | ★ |
| U8 | STT 얇은 어댑터 (non-core, 후순위) | non-core |

- **최소 실증(앵커 ★)**: U1→U2→U3→U4 + U7의 골든패스 뷰. 스크린샷 필수(§6).
- 로컬 병렬화가 유효한 곳(U7 콘솔 ↔ U2~U6 스테이지)은 로컬 서브에이전트로 나눠 진행 가능(실행 세부, 계약은 본 문서 고정).

## 8. STT 얇은 어댑터 (§4, C-6)
마이크 → STT 전사 → `PUT /meetings/:id/transcript`에 `발언자: 내용` 라인 추가. env 키, 사용자 개시. 미동작 시 나머지 정상. 무거운 로컬처리·화자분리 설계 없음.
