# Functional Design — U1 foundation (AS-BUILT)

> 소급 기록(BF). 정본 계약: `../../inception/application-design/application-design.md` §1~3.
> 코드: `src/shared/{types,ids,store,llm,mockup-meta}.ts`, `src/server/{server,sse}.ts`.

## 목적
모든 스테이지가 공유하는 데이터 계약·결정적 id·저장 계층·LLM 접근·HTTP 배선을 제공한다. 그 자체는 골든패스 로직이 아니라 전제(§7 U1).

## 입출력 계약
- **types.ts** — Utterance / DocPair / Version / Meeting / ProjectSummary / VisualContract / ExportManifest·ExportTrace / Job / 스테이지 I/O 인터페이스(ExtractInput 등). 하류 전파의 단일 스키마.
- **ids.ts** — `parseTranscript(text)→Utterance[]`(u-NNN 문서순), `reqNumber`/`constraintNumber`, `groundingIdsOf(md)→u-NNN[]`(유일·정렬).
- **store.ts** — 회의체/버전 CRUD, 버전 저장(HTML은 파일, 인덱스는 SQLite), freeze, export 경로.
- **llm.ts** — `callLLM({system,user,maxTokens})→{text,usage}`. env로 프로바이더 자동 선택.
- **server.ts** — §3 API 라우트, 잡 러너, 세션 SSE, 정적, 전역 에러핸들러.

## 핵심 로직
- `parseTranscript`: `발언자: 내용` 정규식(앞 15자 화자), 빈 줄 skip, 인덱스+1로 u-NNN 부여 → **동일 대화 ⇒ 동일 id**(원칙6/C-1 결정성 전제).
- store: `saveVersion`이 `currentVersion+1`을 n으로, HTML을 `data/mockups/<id>-v<n>.html`에 기록, 인덱스는 `index.db`.
- 잡 러너 `startJob`: 202 즉시 반환 후 비동기 실행, 결과를 SSE로 세션(sid)에만 push.

## 불변원칙 준수 지점
- **원칙6(근거 보존)**: Version에 `groundingIds`·`parent`·`transcriptSnapshot` 필드 강제. trace의 원천.
- **C-1(결정성 전제)**: id 부여·grounding 추출이 무모델·순수함수.
- **C-2/원칙1**: types에 목업 직접편집 필드 없음. 원천은 req/constraints 문서(DocPair)뿐.
- **보안(security-baseline)**: llm.ts·stt는 키 하드코딩 없음, 전부 env.

## 코드에서 확인 안 됨
- mockup-meta.ts는 "이음새" 계약이라 이 유닛과 contract 유닛에 걸침 — 여기선 shared 자산으로만 계상.
