# Tasks — U4/U6 export · reimport

## 작업 체크리스트
- [x] `src/stages/export.ts` — `buildExportSet(input)→ExportManifest`, 세트 파일 병렬 기록
- [x] (rev2 E) `visual-contract.yaml` 추가 → 세트 7파일(requirements·constraints·mockup·contract.json·**contract.yaml**·trace·manifest)
- [x] (rev2 D) 버전 단위 export(schema `bp-export/2`, `major`→`version`)
- [x] `src/stages/reimport.ts` — `readExportSet({dir})` 왕복(manifest+req/constraints+trace)
- [x] 서버 `/export`(버전단위, 계약 추출 포함)·`/import` 오케스트레이션
- [ ] `trace.decisions` / `manifest.importantDecisions` 실제 값 연결 — **현재 `[]` 하드코딩(TODO)**. 커버리지 resolve 이력을 export에 주입 필요

## 검증
- [x] conformance T4a(세트 파일)·T7(export→import 왕복) · 골든패스 라이브 export 7파일 확인
- [ ] decisions 채워짐 검증은 위 TODO 완료 후
