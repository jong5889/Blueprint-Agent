// PLACEHOLDER — SLICE OWNER: S-C. 단일 통합 콘솔로 전면 재작성한다(모드 분리 없음).
// 계약: application-design.md(rev) §3(API)·§4(골든패스), requirements(rev) §3.9, samsung-design-guidelines.
// 골든패스: 대화 → /extract → /mockup → (/coverage→게이트→델타)⟳ → /freeze → /export.
// 필수: 세션스코프 SSE(/events?sid=), 잡폴링, 대화 localStorage 영속, a11y(4.5:1+focus ring), 상태피드백(빈/로딩/성공/오류).
// 이 스텁은 스캐폴드 컴파일 확인용 — 최종 산출물 아님.
import React, { useEffect, useState } from 'react';

export default function App() {
  const [projects, setProjects] = useState<any[]>([]);
  useEffect(() => { fetch('/projects').then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {}); }, []);
  return (
    <div style={{ font: '14px sans-serif', padding: 16, color: '#111' }}>
      <h1 style={{ fontWeight: 700 }}>Blueprint Agent (rev scaffold)</h1>
      <p style={{ color: '#707078' }}>S-C 슬라이스가 단일 콘솔로 교체합니다.</p>
      <pre style={{ background: '#F4F4F6', padding: 12, borderRadius: 12 }}>{JSON.stringify(projects, null, 2)}</pre>
    </div>
  );
}
