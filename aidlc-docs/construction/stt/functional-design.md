# Functional Design — U8 stt (AS-BUILT)

> 코드: `src/stages/stt.ts`, server.ts `/stt`, App.tsx `toggleMic`. 계약: §4·§8·C-6.

## 목적
마이크 오디오 → 전사 텍스트를 대화 입력창에 삽입하는 **얇은 어댑터**. non-core·후순위. 미설정 시 이 기능만 실패, 나머지 정상.

## 입출력 계약
- `transcribe(audio:Buffer, filename)→{text}`.
- API: `POST /stt`(content-type `audio/*` 원시 버퍼) → `{text}`. 프론트는 반환 text를 입력창에 삽입(사용자 검토 후 /transcript로 보냄).

## 핵심 로직 (얇음)
1. 프로바이더 선택(env): `STT_API_KEY`/`OPENROUTER_API_KEY` → OpenRouter `microsoft/mai-transcribe-2`. 없고 `OPENAI_API_KEY`만 있으면 OpenAI `whisper-1`. base/model은 `STT_BASE_URL`/`STT_MODEL`로 오버라이드. 키 전무 시 throw.
2. `FormData`(file+model) → OpenAI 호환 `/audio/transcriptions` POST. 응답 `{text}`(문자열/verbose 폴백 방어).
3. server: content-type→확장자 매핑(webm/wav/m4a/mp3/ogg), 빈 버퍼 400.

## 불변원칙 준수 지점
- **C-6(얇은 슬라이스)**: 화자분리·로컬처리·원음 저장 없음. core 골든패스와 완전 독립(라우트 1개 + 어댑터 1개).
- **보안(security-baseline)**: 키 하드코딩 없음, 전부 env. STT 미설정이 core 기능을 막지 않음.
- **원천(원칙1)**: 전사 결과는 대화(원천)로만 들어가고 사용자 검토를 거침 — 목업 직접 주입 아님.

## 코드에서 확인 안 됨
- 실제 전사 품질·프로바이더 응답은 외부 API 의존. self-test 없음(외부 호출 의존이라 생략, C-6 취지 부합).
