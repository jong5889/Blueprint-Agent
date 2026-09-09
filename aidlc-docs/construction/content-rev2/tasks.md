# U3 콘텐츠·문서 rev2 — Code (바꾼 파일·근거)

> 담당 스코프: `fixtures/**` · `README.md` · `docs/**`. src·dashboard·requirements·git·npm 미수정.

## 바꾼 파일

### G — 발언자 실명 (improvements-rev2 §G / #8)
확정 캐스트 **이종덕 · 변규백 · 박유도 · 박민구 · 박수만**을 `이름(역할):` 형식으로 배치.
각 녹취의 **명시적 제외 발언·누락 후보 발언은 텍스트 그대로 유지**, 발언자 라벨만 교체.

- `fixtures/seed-transcripts/01-task-detail.txt` — 기획자→이종덕, 개발자→변규백, 디자이너→박유도, PO→박민구.
- `fixtures/seed-transcripts/02-order-detail.txt` — 운영팀장→박민구, 개발자→변규백, CS리드→박수만, PO→이종덕, 디자이너→박유도. **5인 전원 등장.**
- `fixtures/seed-transcripts/03-clinic-booking.txt` — 원무과장→박민구, 기획자→이종덕, 개발자→변규백, 간호팀장→박수만, 디자이너→박유도. 원문 PO 2줄(로그인·결제 범위 제외)을 도메인 오너 **박민구(원무과장)**의 범위 선언으로 흡수 → 5인 유지, 제외 내용 보존.
- `fixtures/seed-transcript.txt`(레거시 단일 시드, 태스크 상세) — 01과 동일 캐스트 매핑.
- `fixtures/templates.json` — 콘솔 예시 3종의 `transcript` 문자열을 위 매핑으로 갱신. JSON 파싱 검증 통과.
- `fixtures/fixture.html` — 예시 목업의 담당자·댓글 작성자명을 실명으로: 담당자 `박도현→변규백`, 댓글 작성자 `김지원→이종덕`, `박도현→변규백`. (정적 프리뷰, `data-bp-*` 불필요 주석 유지.)

> `u-NNN` 안정 식별자는 서버 파서가 라인 단위로 부여하므로 발언자 라벨 교체는 추적성에 무영향(표시 스코프만 변경). 실명 크게 + `u-NNN` 작게 병기 표시는 대시보드(U1/U2) 담당.

### D — Freeze 제거·Export 통합 (improvements-rev2 §D / #4)
- `README.md`:
  - 골든패스 다이어그램: `freeze(major 고정) → export` → **`버전 선택 → Export(=확정)`**.
  - 개념 구조: 버전 설명에서 freeze/major 제거, "임의 버전을 골라 Export=확정".
  - 결정적 단계 나열에서 `freeze` 제거.
  - export 세트 경로 `v<major>` → **`v<n>`**, 디렉토리 트리 `exports/…/v<major>/` → `v<n>/`.
  - 사용 매뉴얼 5·6단계: freeze 단계 삭제 → "버전 선택 → Export(=확정)" + "버전 정리(우클릭 삭제)".
  - 범위 안 문구: "버전·freeze" → "버전 선택·삭제 · Export(=확정)".
- `docs/demo-runbook.md`:
  - 목표 흐름·마무리 한 줄 정리에서 freeze 제거 → "버전 선택".
  - 파트3 제목 "freeze와 export" → **"버전 선택과 export"**, 본문 freeze 단계 → 버전 선택=확정 서술, 경로 `v<major>`→`v<n>`.

### E — YAML 출력 (improvements-rev2 §E / #5)
- `README.md` export 세트 표: 6→**7파일**, `visual-contract.yaml`(사람 판독) 행 추가, `visual-contract.json`에 "(기계 판독)" 명기.
- `docs/demo-runbook.md` 파트3: 세트 나열에 `visual-contract.yaml` 추가(7파일 명시), json+yaml 병행 시연 문구.

### 부수 (문서 반영만; 코드는 U1/U2)
- **A(#1,#7) 진행상태 복원**: README 사용 매뉴얼 2단계 + runbook 파트1에 "생성 중 새로고침해도 진행 상태가 서버에서 복원" 반영. 실명 크게/`u-NNN` 작게 병기 표시 안내 추가.
- **H(#9) 버전 삭제**: README 사용 매뉴얼 6단계에 "우클릭 삭제, export 이력 있으면 경고 후 재확인" 반영.

## 검증
- `fixtures/templates.json` — `JSON.parse` 통과.
- grep 확인: README·docs·fixtures에 잔존 역할단독 라벨(`기획자:` 등)·익명 예시명(김지원/박도현)·`v<major>` 없음. 남은 "freeze"는 "freeze 단계 없음"이라 명시하는 문장뿐.
- 실행 명령(`npm run dev:server`·`dev:dashboard`·`build:dashboard`·`npm start`)은 실제 `package.json` scripts와 일치 — 미변경.

## 미처리(스코프 밖, 하류)
- 데이터모델 `frozen`/`major` 필드·`/freeze` 엔드포인트·`versionByMajor` 제거, YAML 실제 산출(`yaml.stringify`), 실명/`u-NNN` UI 렌더, 버전 삭제/방어 UI, 진행상태 서버 영속 — 전부 U1/U2(src·dashboard) 담당.
- `requirements/**` 정본 개정 — 재-inception 담당.
