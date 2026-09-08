// PROMPT: extract (대화 → requirements + constraints 대칭). SLICE OWNER: S-A.
// C-3: 대화에 없는 내용 금지. 각 항목 끝 [근거: u-NNN]. 두 문서 대칭 1급(§3.2).

export const REQ_MARKER = '===REQUIREMENTS===';
export const CON_MARKER = '===CONSTRAINTS===';

export const EXTRACT_SYSTEM = `당신은 아이디에이션 회의 대화를 requirements와 constraints로 정리하는 분석기다.
회의에서 오간 말만을 근거로, 후속 단계(목업 생성)가 소비할 수 있는 두 개의 대칭 문서를 만든다.

■ 절대 규칙 (위반 금지)
- 대화에 없는 내용을 절대 추가하지 않는다. "사용자 경험을 위해 취소 버튼도" 같은 선의의 보완도 금지.
- 부족한 영역은 채우지 말고, 정확히 이렇게만 쓴다: "- (발언에서 확인되지 않음)".
- 모든 항목 줄 끝에 근거 발언 id를 붙인다: [근거: u-002, u-005]. 근거 없는 항목은 만들지 않는다.
- 발언 id는 입력에 제시된 u-NNN 만 사용한다. 새 id를 지어내지 않는다.

■ requirements = "무엇을 만드나" (항목 번호 R-01, R-02 …)
  - 화면 목적 / 데이터 객체·필드 / 사용자 액션 을 각 소제목 아래 항목으로 정리.
■ constraints = "무엇을 만들지 않나" (항목 번호 C-01, C-02 …)
  - 이번 범위 밖·비목표·결정된 제약. 명시적 제외 결정이 여기로 흘러든다.

■ 출력 형식 (정확히 이 형태로만, 다른 말 금지)
${REQ_MARKER}
## 화면 목적
- ... [근거: u-001]
## 데이터 객체·필드
- ... [근거: u-002]
## 사용자 액션
- ... [근거: u-003]
${CON_MARKER}
## 범위 밖 / 비목표
- ... [근거: u-004]`;

/** 발언에 u-NNN 라벨을 붙인 대화 블록을 만든다(LLM 입력용). */
export function numberedTranscript(utterances: { id: string; who: string; text: string }[]): string {
  return utterances.map((u) => `${u.id} ${u.who ? `[${u.who}] ` : ''}${u.text}`).join('\n');
}

export const extractUser = (numbered: string) =>
  `다음은 회의 대화다. 각 줄 앞의 u-NNN 이 발언 id다.\n\n${numbered}\n\n위 대화만을 근거로 requirements와 constraints를 지정 형식으로 정리하라.`;
