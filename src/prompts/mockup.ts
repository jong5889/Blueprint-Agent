// PROMPT: mockup (requirements+constraints → 단일 HTML, data-bp-*). SLICE OWNER: S-A.
// BP_META_SPEC 를 그대로 삽입(freeze 이음새). Samsung 토큰. C-3 명시 요소만. C-4 델타 최소수정.
import { BP_META_SPEC } from '../shared/mockup-meta.js';

// samsung-design-guidelines.md 핵심 토큰 요약(정본은 그 문서). a11y 4.5:1·focus ring 은 필수.
const SAMSUNG_TOKENS = `■ 시각 규격 (Samsung Web Design System — 임의 색·반경·폰트 금지)
- 색: 액센트 #1428A0, 본문 #111111, 부제 #707078, 카드배경 #F4F4F6, 구분선 #E0E0E5, 캔버스 #FFFFFF.
      상태색 성공 #00C853 / 경고 #FF9800 / 오류 #E53935.
- 폰트: 'SamsungOne', -apple-system, 'Segoe UI', Roboto, sans-serif. 제목 700, 본문 400/1.5.
- 반경: 카드 12/16px, 버튼 pill 9999px, 칩 20px. 섀도는 0 4px 20px rgba(0,0,0,0.05) 이하.
- 여백: 8px 배수만.
- 버튼 Primary: solid #1428A0 흰 텍스트 pill. Secondary: 1px solid #1428A0 투명배경.
- a11y (간소화 금지): 텍스트/배경 대비 최소 4.5:1. 인터랙티브 요소에 aria-label 또는 :focus 시 2px #1428A0 focus ring.`;

export const MOCKUP_SYSTEM = `당신은 확정된 requirements·constraints 를 이해관계자가 즉시 볼 수 있는 단일 HTML 목업으로 렌더한다.

■ 절대 규칙
- requirements·constraints 에 명시된 요소만 만든다. 명시되지 않은 요소를 임의로 추가하지 않는다(C-3).
- 출력은 <!doctype html> 로 시작하는 완결된 HTML 문서 하나뿐. 설명·주석·코드펜스 금지.
- 인라인 <style> 로 스타일을 담아 단일 파일로 완결한다. 외부 리소스·CDN 금지.

${SAMSUNG_TOKENS}

${BP_META_SPEC}`;

export const mockupUser = (requirementsMd: string, constraintsMd: string) =>
  `# requirements\n${requirementsMd}\n\n# constraints\n${constraintsMd}\n\n위 요구·제약에 명시된 요소만으로 단일 HTML 목업을 생성하라. 지정된 data-bp-* 메타데이터를 정확히 부착하라.`;

// 편집 모드(C-4): 직전 HTML 기준으로 델타 발언에 해당하는 부분만 최소 수정, 나머지 보존.
export const mockupEditUser = (
  requirementsMd: string,
  constraintsMd: string,
  priorHtml: string,
  deltaLines: string,
) =>
  `아래는 직전 버전의 목업 HTML 이다. 이번 델타(피드백)에 해당하는 부분만 최소 수정하고, 나머지 구조·기존 data-bp-id 는 그대로 보존하라. 델타에 근거 없는 변경은 하지 않는다(C-4).

# 이번 델타(반영할 피드백)
${deltaLines}

# 갱신된 requirements
${requirementsMd}

# 갱신된 constraints
${constraintsMd}

# 직전 목업 HTML
${priorHtml}

수정된 완전한 HTML 문서 전체를 다시 출력하라(부분 출력 금지).`;
