// SLICE OWNER: S-C — 단일 통합 콘솔(모드 분리 없음).
// 계약: application-design.md(rev) §3(API)·§4(SSE)·골든패스, requirements(rev) §3.9, samsung-design-guidelines.
// 골든패스: 대화 → /extract → /mockup → (/coverage→휴먼게이트→델타)⟳ → /freeze → /export.
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ── 최소 API 타입 (shared/types.ts 계약의 사용분) ──
interface Version { n: number; createdAt: string; mode: 'create' | 'edit'; parent?: number; webPath: string; frozen?: boolean; major?: number }
interface Meeting { id: string; project: string; title: string; transcript: string; draftRequirementsMd: string; draftConstraintsMd: string; currentVersion: number; versions: Version[] }
interface ProjectSummary { project: string; meetings: { id: string; title: string }[] }
interface CoverageItem { text: string; groundingIds: string[] }
type Action = 'adopt-req' | 'adopt-constraint' | 'exclude';
type View = 'requirements' | 'constraints' | 'mockup' | 'coverage';

// gotcha(부록 D): crypto.randomUUID 는 secure context 전용 — LAN http 접속 시 부재. 폴백 필수.
const genSessionId = (): string =>
  (globalThis.crypto as any)?.randomUUID?.() ?? `sid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const TKEY = 'bp-transcript';
const MKEY = 'bp-meeting';
const loadTranscripts = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(TKEY) || '{}'); } catch { return {}; } };
const saveTranscript = (mid: string, t: string) => { const m = loadTranscripts(); m[mid] = t; localStorage.setItem(TKEY, JSON.stringify(m)); };

// 발언 파싱 — ids.ts.parseTranscript 규칙 미러(발언자 라벨은 앞 15자 + 콜론).
const parseLines = (text: string) =>
  (text || '').split(/\r?\n/).map(r => r.trim()).filter(Boolean).map((line, i) => {
    const m = line.match(/^(.{1,15}?)\s*[:：]\s*(.*)$/);
    return { id: `u-${String(i + 1).padStart(3, '0')}`, who: m ? m[1].trim() : '', text: m ? m[2].trim() : line };
  });

// 데모용 내장 예시 녹취 (외부 의존 없이 골든패스 시연) — 비정본.
const SAMPLES: { title: string; transcript: string }[] = [
  {
    title: '태스크 상세 화면 킥오프',
    transcript: [
      '기획자: 태스크 상세 화면이 필요해요. 제목, 담당자, 마감일, 상태를 보여주고요.',
      'PO: 상태는 드롭다운으로 바꾸게 하고, 댓글도 달 수 있어야 해요.',
      '개발자: 첨부파일은요?',
      'PO: 이번 버전엔 없어도 됩니다. 나중에.',
    ].join('\n'),
  },
  {
    title: '알림 설정 화면 논의',
    transcript: [
      '기획자: 사용자별 알림 설정 화면을 만들죠. 이메일/푸시 토글이 필요해요.',
      '개발자: 알림 종류는 몇 개인가요?',
      '기획자: 댓글, 멘션, 마감임박 세 가지요.',
      'PO: 야간 방해금지 시간대 설정도 있으면 좋겠네요.',
    ].join('\n'),
  },
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function App() {
  const sid = useRef(genSessionId()).current;
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState('');
  const [input, setInput] = useState('');
  const [req, setReq] = useState('');
  const [con, setCon] = useState('');
  const [mockup, setMockup] = useState<{ webPath: string; version: number; mode: string } | null>(null);
  const [latestVersion, setLatestVersion] = useState<number>(0);
  const [missing, setMissing] = useState<CoverageItem[]>([]);
  const [resolutions, setResolutions] = useState<Record<number, Action | ''>>({});
  const [coverageRan, setCoverageRan] = useState(false);
  const [view, setView] = useState<View>('requirements');
  const [busy, setBusy] = useState<string | null>(null);
  const [step, setStep] = useState<{ kind: string; status: string } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [major, setMajor] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);          // STT 얇은 어댑터(§4)
  const micRef = useRef<MediaRecorder | null>(null);

  // 새 회의체 폼
  const [showNew, setShowNew] = useState(false);
  const [npProject, setNpProject] = useState('');
  const [npTitle, setNpTitle] = useState('');

  // ── SSE (세션 스코프) — 진행 칩 + 오류 배너. 결과는 잡 폴링이 정본. ──
  useEffect(() => {
    const es = new EventSource('/events?sid=' + encodeURIComponent(sid));
    es.addEventListener('job', (e: MessageEvent) => { try { setStep(JSON.parse(e.data)); } catch { /* ignore */ } });
    es.addEventListener('error', (e: MessageEvent) => { try { const d = JSON.parse(e.data); if (d?.message) setError(d.message); } catch { /* connection blip */ } });
    return () => es.close();
  }, [sid]);

  // ── 부팅: 프로젝트 목록 + 마지막 회의체 복원 ──
  useEffect(() => { refreshProjects(); const last = localStorage.getItem(MKEY); if (last) openMeeting(last); }, []); // eslint-disable-line

  async function refreshProjects() {
    try { const d = await fetch('/projects').then(r => r.json()); setProjects(d.projects ?? []); } catch { /* 서버 미가동 */ }
  }

  async function openMeeting(id: string) {
    try {
      const m: Meeting = await fetch('/meetings/' + id).then(r => { if (!r.ok) throw new Error('회의체를 찾을 수 없습니다'); return r.json(); });
      applyMeeting(m);
    } catch (e: any) { setError(String(e?.message ?? e)); }
  }

  function applyMeeting(m: Meeting) {
    setMeeting(m); localStorage.setItem(MKEY, m.id);
    const localT = loadTranscripts()[m.id];
    setTranscript(localT ?? m.transcript ?? '');           // 로컬 영속 우선(새로고침 유지)
    setReq(m.draftRequirementsMd ?? ''); setCon(m.draftConstraintsMd ?? '');
    const latest = m.versions?.[m.versions.length - 1];
    setLatestVersion(latest?.n ?? m.currentVersion ?? 0);
    setMockup(latest ? { webPath: latest.webPath, version: latest.n, mode: latest.mode } : null);
    const frozen = m.versions?.find(v => v.frozen)?.major;
    setMajor(frozen ?? null);
    setMissing([]); setResolutions({}); setCoverageRan(false); setError(''); setNotice('');
    setView('requirements');
  }

  async function refreshMeeting() { if (meeting) { const m: Meeting = await fetch('/meetings/' + meeting.id).then(r => r.json()); setMeeting(m); const latest = m.versions?.[m.versions.length - 1]; if (latest) setLatestVersion(latest.n); } }

  async function createMeeting() {
    if (!npProject.trim() || !npTitle.trim()) { setError('프로젝트명과 회의체 제목을 입력하세요.'); return; }
    try {
      const m: Meeting = await postJson('/meetings', { project: npProject.trim(), title: npTitle.trim() });
      setShowNew(false); setNpProject(''); setNpTitle(''); applyMeeting(m); await refreshProjects();
    } catch (e: any) { setError(String(e?.message ?? e)); }
  }

  // ── API 헬퍼 ──
  async function postJson(path: string, body: unknown) {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const e = await r.json().catch(() => ({} as any)); throw new Error(e.error || `HTTP ${r.status}`); }
    return r.json();
  }
  async function runAsync(path: string, body: unknown): Promise<any> {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': sid }, body: JSON.stringify(body) });
    if (!r.ok) { const e = await r.json().catch(() => ({} as any)); throw new Error(e.error || `HTTP ${r.status}`); }
    const { jobId } = await r.json();
    for (let i = 0; i < 120; i++) {               // 2s 폴링, 최대 4분
      await sleep(2000);
      const j = await fetch('/jobs/' + jobId).then(x => x.json());
      if (j.status === 'done') return j.result;
      if (j.status === 'error') throw new Error(j.error || '작업 실패');
    }
    throw new Error('작업 시간 초과');
  }
  async function putTranscript(text: string) { if (meeting) await fetch('/meetings/' + meeting.id + '/transcript', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ transcript: text }) }); }

  // ── 대화 입력 ──
  function send() {
    const t = input.trim(); if (!t || !meeting) return;
    const line = /^.{1,15}?\s*[:：]/.test(t) ? t : `사용자: ${t}`;
    const next = transcript ? transcript + '\n' + line : line;
    setTranscript(next); saveTranscript(meeting.id, next); setInput('');
    putTranscript(next).catch(e => setError(String(e?.message ?? e)));
  }
  function loadSample(s: { transcript: string }) {
    if (!meeting) { setError('먼저 회의체를 선택하거나 생성하세요.'); return; }
    setTranscript(s.transcript); saveTranscript(meeting.id, s.transcript);
    putTranscript(s.transcript).catch(e => setError(String(e?.message ?? e)));
  }

  // ── STT 얇은 어댑터(§4/C-6): 마이크 녹음 → /stt 전사 → 입력창에 삽입(사용자 검토 후 보내기). 미설정 시 이 기능만 실패. ──
  async function toggleMic() {
    if (recording) { micRef.current?.stop(); return; }
    if (!meeting) { setError('먼저 회의체를 선택하세요.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecording(false); micRef.current = null;
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        if (!blob.size) return;
        try {
          setBusy('/stt');
          const r = await fetch('/stt', { method: 'POST', headers: { 'content-type': blob.type }, body: blob });
          if (!r.ok) { const e = await r.json().catch(() => ({} as any)); throw new Error(e.error || `HTTP ${r.status}`); }
          const { text } = await r.json();
          if (text) setInput(prev => (prev ? prev + ' ' : '') + text);
        } catch (e: any) { setError('음성 인식 실패: ' + (e?.message ?? e)); }
        finally { setBusy(null); }
      };
      mr.start(); micRef.current = mr; setRecording(true); setError('');
    } catch { setError('마이크를 사용할 수 없습니다.'); }
  }

  // ── 골든패스: 🪄 생성 (extract → mockup 자동 체인) ──
  async function generate() {
    if (!meeting) { setError('먼저 회의체를 선택하세요.'); return; }
    if (!transcript.trim()) { setError('대화가 비어 있습니다. 발언을 입력하거나 예시를 불러오세요.'); return; }
    setError(''); setNotice(''); setBusy('extract');
    try {
      await putTranscript(transcript);
      const ex = await runAsync('/extract', { meetingId: meeting.id });
      setReq(ex.requirementsMd ?? ''); setCon(ex.constraintsMd ?? ''); setView('requirements');
      setBusy('mockup');
      const mk = await runAsync('/mockup', { meetingId: meeting.id });
      setMockup({ webPath: mk.webPath, version: mk.version, mode: mk.mode }); setLatestVersion(mk.version);
      setView('mockup'); setNotice(`목업 v${mk.version} 생성 (${mk.mode === 'edit' ? '델타 수정' : '신규'})`);
      await refreshMeeting();
    } catch (e: any) { setError(String(e?.message ?? e)); }
    finally { setBusy(null); }                    // gotcha: busy 해제는 호출부 finally
  }

  async function checkCoverage() {
    if (!meeting) return;
    setError(''); setNotice(''); setBusy('coverage');
    try {
      const r = await runAsync('/coverage', { meetingId: meeting.id });
      setMissing(r.missing ?? []); setResolutions({}); setCoverageRan(true); setView('coverage');
    } catch (e: any) { setError(String(e?.message ?? e)); }
    finally { setBusy(null); }
  }

  async function resolveCoverage() {
    if (!meeting) return;
    const chosen = missing.map((item, i) => ({ item, action: resolutions[i] })).filter(x => x.action) as { item: CoverageItem; action: Action }[];
    if (!chosen.length) { setError('처리할 항목을 하나 이상 선택하세요.'); return; }
    setError(''); setBusy('coverage');
    try {
      const d = await postJson('/coverage/resolve', { meetingId: meeting.id, resolutions: chosen });
      setReq(d.requirementsMd ?? req); setCon(d.constraintsMd ?? con);
      setMissing([]); setResolutions({}); setCoverageRan(false); setView('requirements');
      setNotice('휴먼 게이트 반영 완료 — 🪄 생성으로 목업을 갱신하세요.');
    } catch (e: any) { setError(String(e?.message ?? e)); }
    finally { setBusy(null); }
  }

  async function freeze() {
    if (!meeting || !latestVersion) { setError('먼저 목업을 생성하세요.'); return; }
    setError(''); setBusy('freeze');
    try { const d = await postJson('/freeze', { meetingId: meeting.id, version: latestVersion }); setMajor(d.major ?? null); await refreshMeeting(); setNotice(`v${latestVersion} → major ${d.major} 고정`); }
    catch (e: any) { setError(String(e?.message ?? e)); }
    finally { setBusy(null); }
  }

  async function doExport() {
    if (!meeting) return;
    if (major == null) { setError('먼저 Freeze로 major 버전을 만드세요.'); return; }
    setError(''); setBusy('export');
    try { const d = await postJson('/export', { meetingId: meeting.id, major }); setNotice(`Export 완료 → ${d.dir ?? '세트 기록됨'}`); }
    catch (e: any) { setError(String(e?.message ?? e)); }
    finally { setBusy(null); }
  }

  // iframe onLoad: 같은-오리진이면 keydown 을 부모로 포워딩(iframe 키 삼킴 방지, 부록 D).
  function onFrameLoad(e: React.SyntheticEvent<HTMLIFrameElement>) {
    try {
      const doc = e.currentTarget.contentDocument;
      if (doc) doc.addEventListener('keydown', ev => window.dispatchEvent(new KeyboardEvent('keydown', { key: (ev as KeyboardEvent).key, bubbles: true })));
    } catch { /* cross-origin: 무시 */ }
  }

  // ── 렌더 ──
  const btn = 'rounded-full px-4 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1428A0] disabled:opacity-50';
  const chips: { k: string; label: string; done: boolean }[] = [
    { k: 'extract', label: '① 대화 정리', done: !!(req || con) },
    { k: 'mockup', label: '② 목업 생성', done: !!mockup },
    { k: 'coverage', label: '③ 확인·고도화', done: !!major },
  ];
  const allMeetings = projects.flatMap(p => p.meetings.map(mm => ({ ...mm, project: p.project })));

  return (
    <div className="h-screen flex flex-col gap-2 p-3 bg-[#F4F4F6] text-[#111111] text-sm" style={{ fontFamily: "'SamsungOne', -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      {/* 헤더 */}
      <header className="shrink-0 flex flex-wrap items-center gap-2">
        <span className="font-bold text-base text-[#1428A0]">Blueprint Agent</span>
        <select aria-label="회의체 선택" value={meeting?.id ?? ''} onChange={e => e.target.value && openMeeting(e.target.value)}
          className="rounded-xl border border-[#E0E0E5] bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1428A0]">
          <option value="">회의체 선택…</option>
          {allMeetings.map(mm => <option key={mm.id} value={mm.id}>{mm.project} · {mm.title}</option>)}
        </select>
        <button onClick={() => setShowNew(v => !v)} className={`${btn} border border-[#1428A0] text-[#1428A0] bg-white`}>+ 새 회의체</button>

        <div className="flex gap-2 items-center ml-auto flex-wrap">
          {chips.map(c => (
            <span key={c.k} aria-label={c.label} className={`text-[11px] rounded-full px-3 py-1 border ${busy === c.k ? 'bg-[#1428A0] text-white border-[#1428A0] animate-pulse' : c.done ? 'bg-[#00C853] text-white border-[#00C853]' : 'bg-white text-[#707078] border-[#E0E0E5]'}`}>
              {c.label}{c.done ? ' ✓' : ''}
            </span>
          ))}
        </div>
      </header>

      {/* 새 회의체 폼 */}
      {showNew && (
        <div className="shrink-0 flex flex-wrap gap-2 items-center rounded-xl border border-[#E0E0E5] bg-white p-3">
          <input aria-label="프로젝트명" value={npProject} onChange={e => setNpProject(e.target.value)} placeholder="프로젝트명" className="border border-[#E0E0E5] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1428A0]" />
          <input aria-label="회의체 제목" value={npTitle} onChange={e => setNpTitle(e.target.value)} placeholder="회의체 제목" className="border border-[#E0E0E5] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1428A0]" />
          <button onClick={createMeeting} className={`${btn} bg-[#1428A0] text-white`}>생성</button>
        </div>
      )}

      {/* 실행 바 */}
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <button onClick={generate} disabled={!!busy || !meeting} className={`${btn} bg-[#1428A0] text-white`}>🪄 생성 (정리·목업)</button>
        <button onClick={checkCoverage} disabled={!!busy || !meeting} className={`${btn} border border-[#1428A0] text-[#1428A0] bg-white`}>✅ 누락 체크</button>
        <button onClick={freeze} disabled={!!busy || !meeting} className={`${btn} ${major != null ? 'bg-[#00C853] text-white' : 'border border-[#E0E0E5] text-[#111111] bg-white'}`}>❄ Freeze</button>
        <button onClick={doExport} disabled={!!busy || !meeting} className={`${btn} border border-[#1428A0] text-[#1428A0] bg-white`}>⬇ Export</button>
        {busy && <span className="text-[11px] text-[#707078]">처리 중… {step ? `(${step.kind}:${step.status})` : ''}</span>}
        {major != null && <span className="text-[11px] rounded-full px-2 py-0.5 bg-[#00C853] text-white">major {major} frozen</span>}
      </div>

      {/* 상태 배너 */}
      {error && <div role="alert" className="shrink-0 text-xs rounded-xl border border-[#E53935] bg-[#FDECEA] text-[#B71C1C] px-3 py-2">⚠ {error}</div>}
      {notice && <div className="shrink-0 text-xs rounded-xl border border-[#00C853] bg-[#E8F8EF] text-[#0B6B33] px-3 py-2">✓ {notice}</div>}

      {/* 본문: 좌 대화 · 우 뷰 */}
      <div className="flex-1 flex flex-col md:flex-row gap-2 min-h-0">
        {/* 좌: 대화 */}
        <aside className="md:w-96 shrink-0 flex flex-col rounded-2xl border border-[#E0E0E5] bg-white p-3 min-h-0">
          <div className="font-bold shrink-0 mb-2 flex items-center gap-2">대화 (회의 녹취)
            <span className="ml-auto text-[10px] font-normal text-[#707078]">예시:</span>
            {SAMPLES.map((s, i) => <button key={i} onClick={() => loadSample(s)} className="text-[10px] rounded-full px-2 py-0.5 bg-[#F4F4F6] border border-[#E0E0E5] hover:bg-[#E0E0E5] focus:outline-none focus:ring-2 focus:ring-[#1428A0]">{i + 1}</button>)}
          </div>
          <div className="flex-1 overflow-auto rounded-xl border border-[#E0E0E5] bg-[#FBFBFC] p-3 min-h-0">
            {!transcript.trim()
              ? <p className="text-xs text-[#707078]">회의 대화를 입력하거나 상단의 예시(1/2)를 불러오세요.</p>
              : parseLines(transcript).map(u => {
                const mine = u.who === '사용자';
                return (
                  <div key={u.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'} mb-2`}>
                    <span className="text-[10px] text-[#707078]">{u.who || '발언'} · {u.id}</span>
                    <div className={`max-w-[85%] rounded-xl px-3 py-1.5 ${mine ? 'bg-[#1428A0] text-white' : 'bg-[#F4F4F6] text-[#111111]'}`}>{u.text}</div>
                  </div>
                );
              })}
          </div>
          <div className="flex gap-2 mt-2 shrink-0">
            <input aria-label="발언 입력" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder="발언 입력 (예: 기획자: … / Enter)" className="flex-1 border border-[#E0E0E5] rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1428A0]" />
            <button onClick={toggleMic} disabled={!meeting || (!!busy && busy !== '/stt')} aria-label={recording ? '녹음 중지' : '녹음 시작(음성 입력)'}
              className={`${btn} focus:outline-none focus:ring-2 focus:ring-[#1428A0] ${recording ? 'bg-[#E53935] text-white animate-pulse' : 'bg-[#F4F4F6] text-[#111]'}`}>{recording ? '⏹' : '🎤'}</button>
            <button onClick={send} disabled={!meeting} className={`${btn} bg-[#1428A0] text-white`}>보내기</button>
          </div>
        </aside>

        {/* 우: 뷰 전환 */}
        <main className="flex-1 flex flex-col bg-white rounded-2xl border border-[#E0E0E5] min-h-0">
          <div className="shrink-0 flex flex-wrap gap-2 p-3 border-b border-[#E0E0E5]">
            {([['requirements', '📋 requirements'], ['constraints', '🚫 constraints'], ['mockup', '🖼 목업'], ['coverage', '✅ 누락 체크']] as [View, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setView(k)} className={`rounded-full px-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1428A0] ${view === k ? 'bg-[#1428A0] text-white' : 'bg-[#F4F4F6] text-[#111111] hover:bg-[#E0E0E5]'}`}>{label}</button>
            ))}
            {meeting && meeting.versions?.length > 0 && (
              <div className="ml-auto flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-[#707078]">버전:</span>
                {meeting.versions.map(v => (
                  <button key={v.n} onClick={() => { setMockup({ webPath: v.webPath, version: v.n, mode: v.mode }); setView('mockup'); }}
                    className={`text-[10px] rounded-full px-2 py-0.5 border focus:outline-none focus:ring-2 focus:ring-[#1428A0] ${v.frozen ? 'bg-[#00C853] text-white border-[#00C853]' : mockup?.version === v.n ? 'bg-[#1428A0] text-white border-[#1428A0]' : 'bg-white text-[#707078] border-[#E0E0E5]'}`}
                    aria-label={`버전 ${v.n}${v.frozen ? ' major' : ''}`}>v{v.n}{v.frozen ? `·M${v.major}` : ''}</button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-5 min-h-0">
            {!meeting ? (
              <div className="text-[#707078]">회의체를 선택하거나 <b>+ 새 회의체</b>로 시작하세요.</div>
            ) : busy && (view === 'mockup' || view === 'requirements' || view === 'constraints') && !mockup && !req && !con ? (
              <div className="text-[#707078] animate-pulse">생성 중…</div>
            ) : view === 'requirements' ? (
              req ? <MD src={req} /> : <div className="text-[#707078]">아직 추출 전입니다. <b>🪄 생성</b>을 눌러 대화에서 requirements를 추출하세요.</div>
            ) : view === 'constraints' ? (
              con ? <MD src={con} /> : <div className="text-[#707078]">아직 추출 전입니다. <b>🪄 생성</b>을 눌러 constraints를 추출하세요.</div>
            ) : view === 'mockup' ? (
              mockup ? <iframe title="목업 프리뷰" src={mockup.webPath} onLoad={onFrameLoad} className="w-full h-full min-h-[480px] rounded-xl border border-[#E0E0E5]" />
                : <div className="text-[#707078]">목업이 아직 없습니다. <b>🪄 생성</b>으로 만들어 보세요.</div>
            ) : (
              // 누락 체크
              !coverageRan ? <div className="text-[#707078]"><b>✅ 누락 체크</b>를 눌러 대화 대비 미반영 요청을 확인하세요.</div>
                : missing.length === 0 ? <div className="text-[#0B6B33]">누락된 요청이 없습니다. 대화의 요청이 모두 요구·제약에 반영되었습니다.</div>
                  : (
                    <div className="space-y-3">
                      <p className="text-xs text-[#707078]">대화에 등장했으나 요구·제약에 반영되지 않은 항목입니다. 각 항목을 <b>채택</b>하거나 <b>명시적으로 제외</b>해야 하며, 그냥 사라지지 않습니다 (C-5, 휴먼 게이트).</p>
                      {missing.map((it, i) => (
                        <div key={i} className="rounded-xl border border-[#E0E0E5] bg-white px-4 py-3">
                          <div className="font-medium">{it.text}</div>
                          <div className="text-[10px] text-[#707078] mt-0.5">근거 {it.groundingIds.join(', ') || '—'}</div>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {([['adopt-req', '채택 → 요구'], ['adopt-constraint', '채택 → 제약'], ['exclude', '의도적 제외']] as [Action, string][]).map(([a, label]) => (
                              <label key={a} className={`text-xs rounded-full px-3 py-1 border cursor-pointer focus-within:ring-2 focus-within:ring-[#1428A0] ${resolutions[i] === a ? 'bg-[#1428A0] text-white border-[#1428A0]' : 'bg-white text-[#111111] border-[#E0E0E5]'}`}>
                                <input type="radio" name={`cov-${i}`} className="sr-only" checked={resolutions[i] === a} onChange={() => setResolutions(r => ({ ...r, [i]: a }))} />{label}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button onClick={resolveCoverage} disabled={!!busy} className={`${btn} bg-[#1428A0] text-white`}>선택 확정 (휴먼 게이트)</button>
                    </div>
                  )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function MD({ src }: { src: string }) {
  return <article className="prose prose-sm max-w-none prose-headings:text-[#111111]"><ReactMarkdown remarkPlugins={[remarkGfm]}>{src}</ReactMarkdown></article>;
}
