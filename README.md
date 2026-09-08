# Blueprint Agent

**회의 녹취 한 장을, 화면 → 계약 → 명세 → 코드로.**

회의에서 나온 이야기(녹취)를 붙여넣으면 Blueprint Agent가 이를 **요구사항 정의서**로 정리하고,
그 요구로부터 **화면 목업(HTML)**을 만들고, 목업에서 **Visual Contract(확정 계약)**를 추출한 뒤,
계약으로부터 **명세(SRS·ERD·OpenAPI)**와 **코드**까지 역으로 도출합니다.

```
회의 녹취 ──▶ 요구사항 정의서 ──▶ 화면 목업(HTML) ──▶ Visual Contract ──▶ 명세(SRS/ERD/OpenAPI) ──▶ 코드
   transcript      (capture)          (mockup)          (freeze)              (reverse)             (generate)
```

각 단계의 산출물은 앞 단계에 **근거로 묶여 있습니다**(근거 사슬). 요구서의 모든 항목에는
`[근거: u-NNN]` 태그로 어느 발언에서 나왔는지가 붙고, 계약·명세·코드는 그 위에서만 만들어집니다.
"화면에 없는 것은 명세에 없고, 명세에 없는 것은 코드에 없다."

## 한 눈에 보는 아키텍처

```
Blueprint-Agent/
  src/
    server/    Fastify 앱 · 정적 서빙 · 잡 러너 · /events SSE      (동결)
    shared/    types · 파일 저장소 · LLM 클라이언트 · id 생성       (동결)
    stages/    capture → mockup → freeze → reverse → generate      (파이프라인)
    prompts/   단계별 시스템 프롬프트
  dashboard/   React + TS + Tailwind 단일 페이지 대시보드
  fixtures/    시드 녹취 · 예시 템플릿 · 초기 프리뷰 화면
```

- **백엔드** Fastify(:3000) — HTTP API + SSE(`/events`). 비동기 잡은 `POST → 202 → GET /jobs/:id` 폴링.
- **프론트** Vite 대시보드(:5173) — 고객 원클릭 모드 / 개발자 6뷰 모드.
- **LLM** `src/shared/llm.ts`의 `callLLM({system,user})` 단일 진입점. 키는 환경변수로만.

## 불변 원칙 4가지

| # | 원칙 | 뜻 |
|---|---|---|
| **C-1** | freeze는 결정적이다 | `freeze.ts`는 LLM을 쓰지 않는다. Playwright로 기하·구조만 읽어 계약을 만든다. 같은 HTML ⇒ 항상 같은 계약. |
| **C-2** | reverse는 계약만 본다 | 명세 도출은 Visual Contract만 입력으로 받는다. 녹취·마크업을 다시 보지 않는다. |
| **C-3** | 근거 없는 생성 금지 | capture·mockup은 발언에 없는 요소를 만들지 않는다. 요구서는 `[근거: u-NNN]` 태그를 단다. |
| **C-4** | 편집은 델타로 | 목업 수정은 이전 버전 + 변경 발언에만 기반한다(전면 재생성 아님). |

## 시작하기

### 사전 요건
- **Node.js 20+** (ESM · `tsx` 사용)
- LLM 호출용 Anthropic 호환 API 키 — 키 없이도 빌드·타입체크는 됩니다. 실제 파이프라인 실행에만 필요합니다.

### 설치
```bash
npm install          # postinstall이 Playwright Chromium도 내려받습니다(freeze용)
```

### 환경변수 (`.env.example` 참고)
```bash
ANTHROPIC_API_KEY=your-key-here
ANTHROPIC_BASE_URL=https://api.anthropic.com   # z.ai / Bedrock 프록시도 가능
LLM_MODEL=claude-opus-4-8
PORT=3000
```
> 키를 하드코딩하지 않습니다. 환경변수가 없으면 LLM 단계에서 `"LLM 환경 미설정"` 에러를 반환합니다.

### 실행 (터미널 2개)
```bash
npm run dev:server      # 백엔드 → http://localhost:3000
npm run dev:dashboard   # 대시보드 → http://localhost:5173  (API·SSE는 :3000으로 프록시)
```
브라우저에서 **http://localhost:5173** 접속.

## 사용 매뉴얼

### 고객 모드 (원클릭)
비개발자용 기본 모드입니다. `brief · mockup · spec` 3뷰만 보입니다.
1. 좌측 **대화 패널**에 회의 녹취를 붙여넣거나, 헤더의 **🗂 템플릿(T)**에서 예시 회의를 고릅니다.
2. **🪄 목업 생성(C)** 버튼(또는 `C` 키)을 누릅니다.
3. 상단 진행 칩이 **①요구정리 → ②목업생성 → ③API명세** 순으로 진행됩니다.
4. 완료되면 자동으로 명세 뷰가 뜹니다. `R`(요구서) · `M`(목업) · `A`(명세) 키로 뷰를 전환합니다.
5. 프리뷰는 **⛶ 최대화(F)**로 1440×900 전체 화면 확인이 가능합니다.

### 개발자 모드 (6뷰 · 수동 단계 실행)
우상단 **⚙** 버튼(또는 `D` 키, `?dev=1`)으로 진입. `mockup · brief · contract · spec · code · versions` 6뷰.
헤더에서 각 단계를 순서대로 눌러 실행하고 원본 산출물을 확인합니다.

| 버튼 | 단계 | 산출물 뷰 |
|---|---|---|
| ⓪ 캡처 | 녹취 → 요구사항 정의서 | **brief** |
| ① 목업 | 요구서 → HTML 목업 | **mockup**(iframe 프리뷰) |
| ② Freeze | 목업 → Visual Contract | **contract**(YAML 원문) |
| ③ 역도출 | 계약 → SRS·ERD·OpenAPI | **spec** |
| ④ 코드생성 | 명세 → 코드 3파일 | **code**(파일명 칩 + 코드펜스) |

**versions** 뷰에는 전 프로젝트의 목업 버전 이력이 쌓입니다(신규 ✨ / 수정 ✏).

### 스크린샷
실행 화면 캡처는 `screenshots/` 에 있습니다(심사 시 jd가 추가). 없으면 위 두 URL로 직접 확인하세요.

### 트러블슈팅
| 증상 | 원인 · 해결 |
|---|---|
| LLM 단계에서 `"LLM 환경 미설정"` | `.env`에 `ANTHROPIC_API_KEY` 설정. 키 없이 UI는 뜨지만 파이프라인은 실행 불가. |
| 대시보드는 뜨는데 데이터가 안 옴 | `dev:server`가 :3000에서 떠 있는지 확인. 대시보드는 :3000으로 프록시함. |
| Freeze(②)가 실패 | Playwright Chromium 필요. `npx playwright install chromium` 재실행. |
| LAN(http) 접속 시 마운트 크래시 | `crypto.randomUUID`가 보안 컨텍스트 전용이라 폴백 처리됨 — 최신 코드로 갱신하세요. |
| 잡이 안 끝남 | 폴링 타임아웃 480초. LLM 응답 지연이면 대기, 반복되면 서버 로그 확인. |
