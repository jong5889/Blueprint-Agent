// FROZEN SEAM — 목업 저자 의도 메타데이터 스키마 (S-A mockup 생성 ↔ S-B contract 추출 공유).
// S-A: mockup 프롬프트에 BP_META_SPEC 를 그대로 삽입해 생성 HTML이 이 규약을 지키게 한다.
// S-B: contract.ts 가 아래 속성명을 읽어 VisualContract 를 만든다.
// 어느 쪽도 이 파일을 임의로 바꾸지 않는다(계약 변경은 jd 제안 경유).

export const BP_ATTR = {
  id: 'data-bp-id',        // 안정 kebab id. 컴포넌트 c-…, 액션 a-…
  role: 'data-bp-role',    // title|subtitle|badge|button|input|select|text|image|list|listitem|field|container
  bind: 'data-bp-bind',    // "<object>.<field>" (데이터 표시 요소)
  action: 'data-bp-action',// 액션 요소: "verb;target;fields;result" (fields 콤마)
} as const;

export const BP_OBJECTS_SCRIPT_TYPE = 'application/bp-objects'; // 루트 <script> 에 데이터 객체 선언(JSON)

/** mockup 프롬프트에 삽입할 사람이 읽는 규약 명세(한국어). */
export const BP_META_SPEC = `■ 저작 의도 메타데이터 (freeze가 읽는 계약 이음새 — 정확히 지킬 것)
의미 있는 각 요소에 다음 속성을 부착한다:
- ${BP_ATTR.id}   : 안정적 kebab id. 컴포넌트는 c-…, 액션은 a-… (예: c-title, a-save)
- ${BP_ATTR.role} : title|subtitle|badge|button|input|select|text|image|list|listitem|field|container 중 하나
- ${BP_ATTR.bind} : 데이터 바인딩 "<object>.<field>" (예: task.title) — 데이터 표시 요소에만, 선택
- ${BP_ATTR.action} : 동작 요소에 "verb;target;fields;result" (예: update;task;status;done). 세미콜론 구분, fields는 콤마 연결.
문서 루트에 데이터 객체를 한 번 선언한다:
<script type="${BP_OBJECTS_SCRIPT_TYPE}">
[{"id":"task","fields":[{"name":"title","type":"string","display":"text"}]}]
</script>
- ${BP_ATTR.id} 가 a-… 이거나 ${BP_ATTR.action} 보유 요소는 freeze에서 actions[]로, 나머지는 components[]로 분류된다.`;
