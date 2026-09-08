// PLACEHOLDER — SLICE OWNER: suman. Replace with the full console per requirements/redev-screen-spec.yaml
// (customer+developer modes, 6 views, useSse, job polling, shortcuts, maximize, version chips, chat, mic).
// Samsung tokens (requirements/samsung-design-guidelines.md); a11y 4.5:1 + focus ring are non-negotiable.
// This stub only proves the scaffold serves; it is NOT the deliverable.
import React, { useEffect, useState } from 'react';

export default function App() {
  const [transcript, setTranscript] = useState('(로딩…)');
  useEffect(() => {
    fetch('/transcript').then(r => r.json()).then(d => setTranscript(d.transcript)).catch(() => {});
  }, []);
  return (
    <div style={{ font: '14px sans-serif', padding: 16, color: '#111' }}>
      <h1 style={{ fontWeight: 700 }}>Blueprint Agent (scaffold)</h1>
      <p style={{ color: '#707078' }}>suman 슬라이스가 이 화면을 redev-screen-spec.yaml대로 교체합니다.</p>
      <pre style={{ background: '#F4F4F6', padding: 12, borderRadius: 12 }}>{transcript}</pre>
      <iframe src="/fixture.html" style={{ width: '100%', height: 400, border: '1px solid #E0E0E5', borderRadius: 12 }} />
    </div>
  );
}
