<!-- 출처: blueprint-ssh/.claude/skills/samsung-design/SKILL.md (2026-09-07)
     스킬 본문과 동일 내용. 한쪽을 고치면 다른 쪽도 함께 고칠 것. -->

# Samsung Web Design System Guidelines

이 레포의 **모든 웹 산출물**(페이지, 컴포넌트, 대시보드, HTML 목업)은 이 규격을 따른다.
새 UI를 만들 때뿐 아니라 기존 스타일을 고칠 때도 여기 토큰을 쓴다. 임의 색·임의 반경·임의 폰트 크기를 만들지 않는다.

## Core Identity & Brand Principles
- **Design Philosophy**: Bold, Premium, Minimalist, Data-Focused.
- **Visual Tone**: Clean white/black backdrop with vibrant accent blue, crisp typography, high contrast.
- **Layout Approach**: Fluid responsive grid, generous padding (breathing room), edge-to-edge container flow.

---

## Color System (Samsung Palette Rules)

### Primary
| 역할 | 값 | 용도 |
|---|---|---|
| Samsung Blue | `#1428A0` | 메인 액센트, 프라이머리 버튼, 활성 상태 |
| Samsung Dark Navy | `#000000` / `#0A0A0C` | 본문 텍스트, 다크모드 캔버스, 스티키 헤더 |
| Samsung White | `#FFFFFF` | 라이트모드 기본 캔버스 |

### Neutral & Surface
| 역할 | 값 | 용도 |
|---|---|---|
| Gray 100 (Background) | `#F4F4F6` | 데이터 카드 배경, 필터 패널 |
| Gray 300 (Borders) | `#E0E0E5` | 구분선 |
| Gray 600 (Secondary Text) | `#707078` | 부제목, 메타데이터, 비활성 라벨 |
| Gray 900 (Body Text) | `#111111` | 본문 |

### Status & Data Visualization
- **Success / Positive**: `#00C853` 또는 `#0D9488`
- **Warning / Alert**: `#FF9800`
- **Error / Danger**: `#E53935`
- **Chart 다색 액센트 (순서 고정)**: `#1428A0` → `#00A3E0` → `#7B2CBF` → `#00C853` → `#FFB703`

---

## Typography & Hierarchy

### Font Family
- Primary: `'SamsungOne', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Display/Headings: `'Samsung Sharp Sans', 'SamsungOne', sans-serif` (시스템 볼드로 폴백)

### Scale
| 레벨 | 크기 | 웨이트 | 비고 |
|---|---|---|---|
| Hero / Page Title | `32px`–`48px` | 700 Bold | line-height `1.1` (타이트) |
| Section Header | `20px`–`28px` | 600 Semi-Bold | |
| Body | `14px`–`16px` | 400 Regular | line-height `1.5` |
| Data Label / Microcopy | `11px`–`13px` | 500 | 필요 시 대문자 + 자간 |

---

## Component UI Standards

### 1. Cards & Containers
- Border Radius: `12px` 또는 `16px`
- Shadow: 부드럽고 은은한 elevation만 — `0 4px 20px rgba(0,0,0,0.05)`. **무거운 드롭섀도 금지.**
- Border: `1px solid #E0E0E5` (라이트) / `1px solid #282830` (다크)

### 2. Buttons
- **Primary**: solid `#1428A0`, pill (`border-radius: 9999px`), 흰 텍스트, hover는 살짝 뜨거나 어둡게(`#0F1E78`)
- **Secondary**: outlined (`1px solid #1428A0`), 투명 배경, Samsung Blue 텍스트
- **Action/Filter Chip**: `border-radius: 20px`, 배경 `#F4F4F6`, 어두운 텍스트. 활성 시 solid black 또는 Samsung Blue

### 3. Data Visualization & Analytics
- **Filter Bar**: 상단 고정 또는 좌측 사이드바. 깔끔한 세그먼티드 컨트롤 + 인라인 드롭다운
- **KPI Card**: 지표 숫자를 아주 크게(`28px+`, bold), 옆에 작은 컬러 트렌드 배지(`+12.4%`)
- **Charts**: 얇은 선(`2px`), 라인 차트 하단에 은은한 그라디언트 area fill, 고대비 툴팁 카드

---

## Code Generation Constraints (Frontend)

1. **Framework Alignment**: JSX/TSX 작성 시 위 토큰에 대응하는 **Tailwind 유틸리티 클래스**를 쓴다.
2. **Spacing Grid**: **8px 배수로 표준화** — `gap-4`, `p-6`, `my-8`. 홀수 픽셀 여백을 만들지 않는다.
3. **Accessibility (a11y)**:
   - 텍스트와 배경의 명도 대비 **최소 4.5:1**을 항상 보장한다.
   - 인터랙티브 데이터 요소에는 `aria-label` 또는 포커스 링 `focus:ring-2 focus:ring-[#1428A0]`을 반드시 넣는다.

---

## 적용 체크 (UI 산출물을 내기 전에)
- [ ] 팔레트 밖의 색을 만들지 않았다 (액센트는 `#1428A0` 계열, 차트는 지정 5색 순서대로)
- [ ] 반경은 `12/16px`(카드) · `9999px`(버튼) · `20px`(칩) 중 하나다
- [ ] 여백이 8px 배수다
- [ ] 대비 4.5:1을 넘고, 인터랙티브 요소에 focus ring 또는 aria-label이 있다
- [ ] 섀도가 `0 4px 20px rgba(0,0,0,0.05)` 수준을 넘지 않는다

> a11y와 대비 규칙은 **간소화 대상이 아니다.** ponytail 모드에서도 이 4.5:1과 focus ring은 반드시 남긴다.
