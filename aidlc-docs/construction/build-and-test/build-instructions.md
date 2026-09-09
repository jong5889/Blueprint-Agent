# Build Instructions (rev, AS-BUILT)

> 코드: package.json scripts · src/** · dashboard/**. 저장: node:sqlite(내장) + 파일.

## 사전요건
- **Node 22+** (구조화 인덱스에 `node:sqlite` 사용). 이 저장소 검증 환경 = Node 26.
  - (jd mac 함정: `node`가 Bun 심링크 → 실제 노드는 `/opt/homebrew/bin`. `export PATH=/opt/homebrew/bin:$PATH`)
- 의존성: `npm install` (playwright chromium 포함; 프론트 전용 워커는 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` 가능)

## 환경변수 (.env.example)
- LLM: `AWS_BEARER_TOKEN_BEDROCK` + `AWS_REGION=ap-northeast-2` + `LLM_MODEL=global.anthropic.claude-opus-4-8`
  (대체: `ANTHROPIC_API_KEY`/`ANTHROPIC_BASE_URL`)
- STT(선택): `STT_API_KEY`(OpenRouter, `microsoft/mai-transcribe-2`) 또는 `OPENAI_API_KEY`(whisper-1)

## 빌드·실행
- 개발: `npm run dev:server` (:3000) + `npm run dev:dashboard` (:5173, API 프록시)
- 프로덕션(단일 포트): `npm run build:dashboard` → `PORT=<port> npm start` (dist를 서버가 정적 서빙)
- 타입: `npm run typecheck` (= tsc --noEmit)
