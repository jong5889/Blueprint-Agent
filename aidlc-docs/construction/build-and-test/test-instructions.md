# Test Instructions (rev, AS-BUILT)

## 1. 타입체크
`export PATH=/opt/homebrew/bin:$PATH && npx tsc --noEmit`

## 2. 결정적 계약 자체검증 (C-1)
`node_modules/.bin/tsx src/stages/contract.selftest.ts` — data-bp-* 샘플 → 계약 분류 + 2회 동일(결정성) assert.

## 3. 적합성 하네스 (요구·제약 C-1~C-6 + 골든패스)
- 서버 기동(Bedrock env) 후: `BP_PORT=3900 node_modules/.bin/tsx tests/conformance.ts`
- 커버: T1 u-NNN 결정성 · T2 계약 무LLM/결정성 · T3 근거/무환각(C-3) · T4 export 6파일·결정성 · T5 델타(C-4) · T6 커버리지 게이트(C-5) · T7 export→import 왕복 · T9 SSE 세션스코프.

## 4. 골든패스 라이브 (수동/스크립트)
회의생성 → /extract → /mockup → /coverage → 델타 → freeze → /export(6파일) → /import 왕복.
