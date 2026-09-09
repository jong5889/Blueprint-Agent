# Code — U4/U6 export-reimport (AS-BUILT)

## 구현 파일
| 파일 | 역할 |
|---|---|
| `src/stages/export.ts` | `buildExportSet(input)` — 6파일 세트 기록, ExportManifest 반환 |
| `src/stages/reimport.ts` | `readExportSet({dir})` — 세트 읽어 시드 데이터 반환 |
| `src/server/server.ts` | `/freeze`·`/export`(계약 추출 포함)·`/import` 오케스트레이션 |
| `src/shared/store.ts` | `freezeVersion`·`versionByMajor`·`exportDir`·`createMeeting` |

## 핵심 함수 / 근거
- `buildExportSet(ExportSetInput)→ExportManifest` — §5 파일 세트 계약(schema `bp-export/1`). 6파일 `Promise.all` 병렬 기록.
- `readExportSet(ReimportInput)→ReimportResult` — §5 왕복 최소 정보(manifest+req/constraints+trace).
- `store.exportDir` 경로 안전화 `[^\w가-힣.-]→_`(§5 디렉토리 규약).
- server `/export`: freeze 버전 로드→`extractContract`→trace 조립→세트 기록(§4 골든패스 마지막).

## 검증 상태
- 전용 자동 테스트 없음(코드에서 확인). export→import 왕복은 UI(App.doExport)와 라우트로 배선(코드 확인).
- 알려진 잔여: `trace.decisions`/`importantDecisions` 현재 빈 배열 하드코딩(functional-design 참조). 파일 세트 골격·왕복 경로는 완성.
