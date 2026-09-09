# Functional Design — U4/U6 export-reimport (AS-BUILT)

> 코드: `src/stages/export.ts`, `src/stages/reimport.ts`, server.ts `/freeze`·`/export`·`/import`. 계약: §5(파일 세트)·§6.

## 목적
freeze된 major마다 **6파일 export 세트** 조립(결정적) + 그 세트를 읽어 새 회의체 시드하는 **왕복**. 골든패스 ★ + core.

## 입출력 계약
- **freeze**: `POST /freeze {meetingId,version}` → `{major}`. `store.freezeVersion`이 max(major)+1 부여, frozen=1.
- **export**: `POST /export {meetingId,major}` → `{manifest,dir}`. `ExportSetInput`으로 `buildExportSet`.
- **import**: `POST /import {dir}` → 새 Meeting. `readExportSet`→`store.createMeeting`(title에 "(재개)").

## 핵심 로직 (무모델, 결정적)
1. `/export`: `versionByMajor`로 frozen 버전 로드 → HTML 읽기 → `extractContract`(§U4) → `trace`(utterances=snapshot 파싱, lineage=parent) 조립 → `store.exportDir`(경로 안전화) → `buildExportSet`.
2. `buildExportSet`: `data/exports/<p>/<m>/v<major>/`에 6파일 병렬 기록 — requirements.md·constraints.md·mockup.html·visual-contract.json·trace.json·manifest.json(schema `bp-export/1`).
3. `readExportSet`: manifest.json → files 참조로 req/constraints/trace 읽어 `{project,title,requirementsMd,constraintsMd,decisions}` 반환.

## 불변원칙 준수 지점
- **왕복 보장(§3.7.3)**: import는 전체 대화 없이 manifest+req/constraints+trace로 시드. 중요 의결·근거 복원.
- **원칙5/C-1**: export가 계약을 결정적 추출·동기 기록.
- **원칙6(근거)**: trace.json이 utterances·lineage 정본.

## 코드에서 확인 안 됨
- `trace.decisions`·`manifest.importantDecisions`가 현재 `[]`로 고정(server.ts) — coverage resolutions를 export로 전달하는 배선은 미구현. §5 스키마 필드는 존재하나 값 채움은 TODO.
