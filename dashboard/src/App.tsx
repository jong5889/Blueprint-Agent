// Blueprint Agent 콘솔 — requirements/redev-screen-spec.yaml 1:1 구현 (suman 슬라이스).
// customer/developer 2모드 · 6뷰 · SSE · 잡폴링 · 단축키 · 최대화 · 버전칩 · 채팅 · 마이크.
// 시각 규격: requirements/samsung-design-guidelines.md (팔레트/반경/8px 그리드, a11y 4.5:1 + focus ring).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { stringify as yamlStringify } from 'yaml';
import type { VersionEntry, Template, VisualContract } from '../../src/shared/types';

// ── 함정: crypto.randomUUID는 보안 컨텍스트에만 존재. LAN http 접속 시 없어 크래시 → 폴백 필수 (§9) ──
function genSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* not a secure context */ }
  return 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── parseTranscript: '발언자: 내용' → 발언자 1~15자만 매칭, 아니면 who='' 순수 텍스트 (§9) ──
interface Bubble { who: string; text: string }
function parseTranscript(t: string): Bubble[] {
  if (!t) return [];
  return t.split('\n').filter(l => l.trim() !== '').map(line => {
    const m = line.match(/^\s*([^:：]{1,15})\s*[:：]\s*(.*)$/);
    return m ? { who: m[1].trim(), text: m[2] } : { who: '', text: line };
  });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// 즉시 throw(재시도 금지) 판정: 4xx / 'first' / 'LLM 환경' 메시지 (§5, §9)
function isFatal(status: number, msg: string): boolean {
  if (status >= 400 && status < 500) return true;
  return /first|LLM 환경/i.test(msg);
}

type CustView = 'brief' | 'mockup' | 'spec';
type Tab = 'mockup' | 'brief' | 'contract' | 'spec' | 'code' | 'versions';
type Phase = 'capture' | 'mockup' | 'reverse' | 'done' | null;

const PHASES: { key: Exclude<Phase, 'done' | null>; label: string }[] = [
  { key: 'capture', label: '① 요구정리' },
  { key: 'mockup', label: '② 목업생성' },
  { key: 'reverse', label: '③ API명세' },
];

// ── Samsung 토큰 기반 공용 클래스 (팔레트/반경/focus ring 고정) ──
const RING = 'focus:outline-none focus:ring-2 focus:ring-[#1428A0]';
const BTN_PRIMARY = `rounded-full bg-[#1428A0] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#0F1E78] disabled:opacity-50 ${RING}`;
const BTN_SECONDARY = `rounded-full border border-[#1428A0] px-3 py-1.5 text-sm font-medium text-[#1428A0] hover:bg-[#1428A0]/5 disabled:opacity-50 ${RING}`;

function Md({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-slate">
      <Markdown remarkPlugins={[remarkGfm]}>{children}</Markdown>
    </div>
  );
}

export default function App() {
  const sessionId = useMemo(genSessionId, []);

  // ── state (§4) ──
  const [transcript, setTranscript] = useState('');
  const [draft, setDraft] = useState('');
  const [project, setProject] = useState(() => localStorage.getItem('bp-project') || '태스크-상세');
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [brief, setBrief] = useState('');
  const [contract, setContract] = useState('');
  const [contractObj, setContractObj] = useState<VisualContract | null>(null); // reverse 입력용 원본
  const [spec, setSpec] = useState('');
  const [code, setCode] = useState('');
  const [codeFiles, setCodeFiles] = useState<string[]>([]);
  const [iframeSrc, setIframeSrc] = useState('/fixture.html');
  const [iframeUserSet, setIframeUserSet] = useState(false);
  const [custView, setCustView] = useState<CustView>('mockup');
  const [tab, setTab] = useState<Tab>('mockup');
  const [devMode, setDevMode] = useState(() => {
    const p = new URLSearchParams(location.search);
    return p.get('dev') === '1' || localStorage.getItem('bp-dev') === '1';
  });
  const [busy, setBusy] = useState('');            // '' = 유휴
  const [autoPhase, setAutoPhase] = useState<Phase>(null);
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplOpen, setTplOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  const micRef = useRef<MediaRecorder | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  // 단축키/이벤트 핸들러가 최신 값을 보도록 ref로 유지 (§9: runAuto는 매 렌더 캡처) ──
  const latest = useRef({ project, transcript, busy, devMode, maximized, iframeUserSet, contractObj, spec });
  latest.current = { project, transcript, busy, devMode, maximized, iframeUserSet, contractObj, spec };

  // 지속성
  useEffect(() => { localStorage.setItem('bp-project', project); }, [project]);
  useEffect(() => { localStorage.setItem('bp-dev', devMode ? '1' : '0'); }, [devMode]);

  const fetchVersions = useCallback(async () => {
    try {
      const r = await fetch('/versions');
      const d = await r.json();
      setVersions(Array.isArray(d.versions) ? d.versions : []);
    } catch { /* ignore */ }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetch('/transcript').then(r => r.json()).then(d => setTranscript(d.transcript || '')).catch(() => {});
    fetch('/templates').then(r => r.json()).then(d => setTemplates(d.templates || [])).catch(() => {});
    fetchVersions();
  }, [fetchVersions]);

  // 채팅 자동 스크롤
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  // 경과초 타이머 (busy 동안)
  useEffect(() => {
    if (!busy) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  // 고객 모드 진입 시 fixture면 현재 프로젝트 최신 목업으로 자동 전환(사용자가 직접 안 골랐을 때만) (§3.mockup)
  useEffect(() => {
    if (!devMode && iframeSrc === '/fixture.html' && !iframeUserSet) {
      const pv = versions.filter(v => v.project === project).sort((a, b) => b.version - a.version);
      if (pv[0]) setIframeSrc(pv[0].webPath);
    }
  }, [devMode, versions, project, iframeSrc, iframeUserSet]);

  // ── 잡 프로토콜 (§5) : postJob(3회 재시도) → pollJob(2s, 480s, miss 5) ──
  const postJob = useCallback(async (path: string, body: unknown): Promise<string> => {
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(path, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-session-id': sessionId },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try { const j = await res.json(); msg = j.error || j.message || msg; } catch { /* no body */ }
          if (isFatal(res.status, msg)) throw new Error(msg);   // 즉시 throw, 재시도 안 함
          lastErr = new Error(msg);
          continue;                                             // 5xx → 재시도
        }
        const j = await res.json();
        return j.jobId;
      } catch (e: any) {
        if (isFatal(0, e?.message || '')) throw e;              // fatal 메시지면 즉시 throw
        lastErr = e instanceof Error ? e : new Error(String(e));
      }
    }
    throw lastErr || new Error('요청 실패');
  }, [sessionId]);

  const pollJob = useCallback(async (jobId: string): Promise<any> => {
    const start = Date.now();
    let misses = 0;
    for (;;) {
      await sleep(2000);
      if (Date.now() - start > 480000) throw new Error('시간 초과');
      let job: any;
      try {
        const res = await fetch(`/jobs/${jobId}`);
        job = await res.json();
        misses = 0;
      } catch {
        misses++;                                               // 네트워크 미스만 카운트
        if (misses > 5) throw new Error('잡 응답 없음');
        continue;
      }
      if (job.status === 'done') return job.result;
      if (job.status === 'error') throw new Error(job.error || '잡 실패');
    }
  }, []);

  // 비동기 엔드포인트 공통 실행: busy 세팅 → postJob → pollJob → apply. busy 해제는 finally (§9)
  const call = useCallback(async (path: string, body: unknown, apply: (r: any) => void) => {
    if (latest.current.busy) return;
    setErr(null);
    setBusy(path);
    try {
      const jobId = await postJob(path, body);
      const result = await pollJob(jobId);
      apply(result || {});
    } catch (e: any) {
      setErr(e?.message || '오류');
    } finally {
      setBusy('');                                              // ← SSE가 아니라 여기서만 해제
    }
  }, [postJob, pollJob]);

  // Freeze는 동기 (§5)
  const freeze = useCallback(async (webPath: string): Promise<VisualContract> => {
    const res = await fetch('/freeze', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-session-id': sessionId },
      body: JSON.stringify({ webPath }),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = j.error || j.message || msg; } catch { /* */ }
      throw new Error(msg);
    }
    const j = await res.json();
    return j.contract as VisualContract;
  }, [sessionId]);

  // ── 고객 원클릭 흐름 (§1) : /mockup(캡처+목업) → /freeze → /reverse ──
  const runAuto = useCallback(async () => {
    const s = latest.current;
    if (s.busy || s.devMode) return;                            // 고객 모드 & 유휴일 때만 (C)
    setErr(null);
    setAutoPhase('capture');
    setBusy('/mockup');
    try {
      const mkId = await postJob('/mockup', { project: s.project, transcript: s.transcript });
      const mk = await pollJob(mkId);                           // { webPath, version, mode }
      if (mk?.webPath && !latest.current.iframeUserSet) setIframeSrc(mk.webPath);
      await fetchVersions();

      setAutoPhase('reverse');
      setBusy('/freeze');
      const c = await freeze(mk.webPath);
      setContractObj(c);
      setContract(typeof c === 'string' ? c : yamlStringify(c));

      setBusy('/reverse');
      const rvId = await postJob('/reverse', { contract: c });
      const rv = await pollJob(rvId);                           // { specMd }
      if (rv?.specMd) { setSpec(rv.specMd); setCustView('spec'); }

      setAutoPhase('done');
    } catch (e: any) {
      setErr(e?.message || '오류');
      setAutoPhase(null);
    } finally {
      setBusy('');
    }
  }, [postJob, pollJob, freeze, fetchVersions]);

  // ── 개발자 수동 단계 ──
  const doCapture = () => call('/capture', { transcript }, (r) => { setBrief(r.brief || ''); setTab('brief'); });
  const doMockup = () => call('/mockup', { project, transcript }, (r) => {
    if (r.webPath && !latest.current.iframeUserSet) setIframeSrc(r.webPath);
    setTab('mockup'); fetchVersions();
  });
  const doFreeze = async () => {
    if (busy) return;
    if (iframeSrc === '/fixture.html') { setErr('먼저 목업을 생성하세요'); return; }
    setErr(null); setBusy('/freeze');
    try {
      const c = await freeze(iframeSrc);
      setContractObj(c);
      setContract(typeof c === 'string' ? c : yamlStringify(c));
      setTab('contract');
    } catch (e: any) { setErr(e?.message || '오류'); }
    finally { setBusy(''); }
  };
  const doReverse = () => {
    if (!contractObj) { setErr('먼저 Freeze를 실행하세요'); return; }
    call('/reverse', { contract: contractObj }, (r) => { setSpec(r.specMd || ''); setTab('spec'); setCustView('spec'); });
  };
  const doGenerate = () => {
    if (!spec) { setErr('먼저 역도출로 명세를 만드세요'); return; }
    call('/generate', { specMd: spec }, (r) => { setCode(r.codeMd || ''); setCodeFiles(r.files || []); setTab('code'); });
  };

  // ── SSE 구독 (§6). busy 해제는 하지 않음 ──
  useEffect(() => {
    const es = new EventSource('/events');
    const on = (type: string, fn: (d: any) => void) => {
      es.addEventListener(type, (ev: Event) => {
        const me = ev as MessageEvent;
        let d: any;
        try { d = JSON.parse(me.data); } catch { d = me.data; }
        fn(d);
      });
    };
    on('brief', (d) => {
      setBrief(typeof d === 'string' ? d : (d.brief ?? d.md ?? ''));
      setTab('brief');
      // 원클릭 중이면 요구정리 → 목업생성 단계로 진행
      setAutoPhase(p => (p === 'capture' ? 'mockup' : p));
    });
    on('mockup', (d) => {
      const wp = typeof d === 'string' ? d : d.webPath;
      if (wp) { setIframeSrc(wp); setIframeUserSet(false); }
      fetchVersions();
    });
    on('contract', (d) => {
      const c = d?.contract ?? d;
      setContractObj(typeof c === 'object' ? c : null);
      setContract(typeof c === 'string' ? c : yamlStringify(c));
      setTab('contract');
    });
    on('spec', (d) => {
      setSpec(typeof d === 'string' ? d : (d.specMd ?? d.spec ?? ''));
      setTab('spec'); setCustView('spec');
    });
    on('code', (d) => {
      setCode(typeof d === 'string' ? d : (d.codeMd ?? ''));
      if (d && Array.isArray(d.files)) setCodeFiles(d.files);
      setTab('code');
    });
    on('error', (d) => setErr(typeof d === 'string' ? d : (d.message ?? '오류')));
    on('stt-line', (d) => {
      if (d && (d.text || d.who)) setTranscript(t => (t ? t + '\n' : '') + `${d.who || ''}: ${d.text || ''}`);
    });
    on('job', () => { /* 폴링 보조 — busy는 finally가 관리 */ });
    return () => es.close();
  }, [fetchVersions]);

  // ── 마이크(STT) — /stt/chunk 업로드, 서버가 stt-line SSE 방출 (§5) ──
  const toggleMic = async () => {
    if (recording) {
      micRef.current?.stop();
      micRef.current?.stream.getTracks().forEach(t => t.stop());
      micRef.current = null;
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = async (ev) => {
        if (!ev.data || ev.data.size === 0) return;
        try {
          await fetch('/stt/chunk', { method: 'POST', headers: { 'x-session-id': sessionId }, body: ev.data });
        } catch { /* ignore chunk error */ }
      };
      mr.start(3000);                                           // 3s 청크
      micRef.current = mr;
      setRecording(true);
    } catch {
      setErr('마이크를 사용할 수 없습니다');
    }
  };

  const sendDraft = () => {
    const text = draft.trim();
    if (!text) return;
    setTranscript(t => (t ? t + '\n' : '') + `사용자: ${text}`);
    setDraft('');
  };

  // ── 최대화 프리뷰 스케일 (§2) ──
  useEffect(() => {
    if (!maximized) return;
    const calc = () => setPreviewScale(Math.min(window.innerWidth / 1440, (window.innerHeight - 44) / 900));
    calc();
    window.addEventListener('resize', calc);
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => window.removeEventListener('resize', calc);
  }, [maximized]);

  // ── 단축키 (§7) — INPUT/TEXTAREA/편집중 무시. latest ref로 최신 클로저 ──
  const handleKey = useCallback((e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const s = latest.current;
    switch (e.key) {
      case 'f': case 'F': setMaximized(m => !m); break;
      case 'c': case 'C': if (!s.devMode && !s.busy) runAuto(); break;
      case 't': case 'T': setTplOpen(o => !o); break;
      case 'r': case 'R': setCustView('brief'); break;
      case 'm': case 'M': setCustView('mockup'); break;
      case 'a': case 'A': setCustView('spec'); break;
      case 'd': case 'D': setDevMode(m => !m); break;
      case 'Escape': if (s.maximized) setMaximized(false); break;
      default: return;
    }
  }, [runAuto]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // iframe 로드 시 같은-오리진이면 keydown 핸들러 주입(iframe이 F/ESC 삼키는 것 방지) (§9)
  const onIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const doc = e.currentTarget.contentDocument;
      if (doc) doc.addEventListener('keydown', handleKey as any);
    } catch { /* cross-origin — 무시 */ }
  };

  const selectVersion = (v: VersionEntry) => {
    setIframeSrc(v.webPath);
    setIframeUserSet(true);
    if (devMode) setTab('mockup'); else setCustView('mockup');
  };

  const applyTemplate = (t: Template) => {
    setProject(t.project);
    setTranscript(t.transcript);
    setTplOpen(false);
  };

  const bubbles = useMemo(() => parseTranscript(transcript), [transcript]);
  const projectVersions = useMemo(
    () => versions.filter(v => v.project === project).sort((a, b) => b.version - a.version),
    [versions, project],
  );

  // ── 렌더 ──
  return (
    <div className="h-screen flex flex-col gap-2 p-2 bg-slate-100 text-slate-800">
      {/* 헤더 */}
      <header className="shrink-0 flex flex-wrap items-center gap-2">
        <span className="font-bold text-sm text-[#111]">Blueprint Agent</span>

        {devMode ? (
          <>
            <input
              aria-label="프로젝트명"
              value={project}
              onChange={e => setProject(e.target.value)}
              placeholder="프로젝트명"
              className={`rounded-lg border border-[#E0E0E5] px-2 py-1 text-sm ${RING}`}
            />
            <button className={BTN_SECONDARY} onClick={doCapture} disabled={!!busy}>⓪ 캡처</button>
            <button className={BTN_SECONDARY} onClick={doMockup} disabled={!!busy}>① 목업</button>
            <button className={BTN_SECONDARY} onClick={doFreeze} disabled={!!busy}>② Freeze</button>
            <button className={BTN_SECONDARY} onClick={doReverse} disabled={!!busy}>③ 역도출</button>
            <button className={BTN_SECONDARY} onClick={doGenerate} disabled={!!busy}>④ 코드생성</button>
            <button className={BTN_SECONDARY} onClick={() => setTplOpen(o => !o)}>🗂 템플릿 (T)</button>
          </>
        ) : (
          <>
            <button className={BTN_PRIMARY} onClick={runAuto} disabled={!!busy}>🪄 목업 생성 (C)</button>
            <button className={BTN_SECONDARY} onClick={() => setTplOpen(o => !o)}>🗂 템플릿 (T)</button>
            {/* 진행단계 칩 */}
            <div className="flex items-center gap-1" aria-label="진행 단계">
              {PHASES.map((ph, i) => {
                const order = autoPhase === 'done' ? 99 : PHASES.findIndex(p => p.key === autoPhase);
                const active = autoPhase !== null && autoPhase !== 'done' && ph.key === autoPhase;
                const done = autoPhase === 'done' || (order > i && order !== -1);
                return (
                  <span
                    key={ph.key}
                    className={`rounded-[20px] px-3 py-1 text-xs font-medium ${
                      active ? 'bg-[#1428A0] text-white animate-pulse'
                        : done ? 'bg-[#00C853]/15 text-[#0D9488]'
                          : 'bg-[#F4F4F6] text-[#707078]'
                    }`}
                  >
                    {done ? '✓ ' : ''}{ph.label}
                  </span>
                );
              })}
            </div>
          </>
        )}

        {busy && (
          <span className="text-xs text-[#707078]">진행 중… {elapsed}s</span>
        )}

        {/* 모드 토글 (ml-auto) */}
        <button
          className={`ml-auto ${BTN_SECONDARY}`}
          onClick={() => setDevMode(m => !m)}
          aria-label={devMode ? '고객 모드로 전환' : '개발자 모드로 전환'}
        >
          {devMode ? '✕ 고객 모드로' : '⚙ 개발자 모드'}
        </button>
      </header>

      {/* 에러 배너 */}
      {err && <div className="shrink-0 text-red-600 text-sm">⚠ {err}</div>}

      {/* 본문 */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2">
        {/* 좌측: 채팅 + (고객)버전칩 */}
        <aside className="w-full md:w-80 shrink-0 flex flex-col gap-2 min-h-0">
          <section className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-[#E0E0E5]">
            <h2 className="shrink-0 px-3 py-2 text-sm font-semibold text-[#111] border-b border-[#E0E0E5]">
              대화 (회의 녹취)
            </h2>
            <div ref={chatRef} className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
              {bubbles.length === 0 ? (
                <p className="text-sm text-[#707078]">(녹취 로딩…)</p>
              ) : bubbles.map((b, i) => {
                const isUser = b.who === '사용자';
                return (
                  <div key={i} className={`flex flex-col max-w-[85%] ${isUser ? 'self-end items-end' : 'self-start items-start'}`}>
                    {b.who && <span className="text-[11px] text-[#707078]">{b.who}</span>}
                    <div className={`rounded-xl px-3 py-1.5 text-sm ${isUser ? 'bg-blue-100 text-[#111]' : 'bg-slate-100 text-[#111]'}`}>
                      {b.text}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="shrink-0 flex items-center gap-1 p-2 border-t border-[#E0E0E5]">
              <input
                aria-label="발언 입력"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendDraft(); }}
                placeholder="발언을 입력…"
                className={`flex-1 rounded-lg border border-[#E0E0E5] px-2 py-1 text-sm ${RING}`}
              />
              <button
                onClick={toggleMic}
                aria-label={recording ? '녹음 중지' : '녹음 시작'}
                className={`rounded-full px-3 py-1.5 text-sm ${RING} ${recording ? 'bg-[#E53935] text-white animate-pulse' : 'bg-[#F4F4F6] text-[#111]'}`}
              >
                {recording ? '⏹' : '🎤'}
              </button>
              <button className={BTN_PRIMARY} onClick={sendDraft}>보내기</button>
            </div>
          </section>

          {!devMode && (
            <section className="shrink-0 bg-white rounded-xl border border-[#E0E0E5] p-3">
              <h3 className="text-xs font-semibold text-[#707078] mb-2">이전 버전 · {project}</h3>
              {projectVersions.length === 0 ? (
                <p className="text-xs text-[#707078]">(없음)</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {projectVersions.map(v => {
                    const isCurrent = v.webPath === iframeSrc;
                    const isEdit = v.mode === 'edit';
                    const cls = isCurrent
                      ? 'bg-[#00A3E0] text-white'
                      : isEdit ? 'bg-[#FF9800] text-white' : 'bg-[#F4F4F6] text-[#111]';
                    const kb = Math.max(1, Math.round(v.bytes / 1024));
                    const tip = `${new Date(v.createdAt).toLocaleString()} · ${v.project} · ${kb}KB · ${isEdit ? `v${v.baseVersion ?? '?'}에서 수정` : '신규 생성'}`;
                    return (
                      <button
                        key={`${v.project}-${v.version}`}
                        title={tip}
                        onClick={() => selectVersion(v)}
                        className={`rounded-[20px] px-3 py-1 text-xs font-medium ${cls} ${RING}`}
                      >
                        v{v.version}{isEdit ? ' ✏' : ''}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </aside>

        {/* 우측: 탭바 + 뷰 */}
        <main className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-[#E0E0E5]">
          <nav className="shrink-0 flex flex-wrap gap-1 p-2 border-b border-[#E0E0E5]">
            {devMode
              ? (['mockup', 'brief', 'contract', 'spec', 'code', 'versions'] as Tab[]).map(k => (
                <TabBtn key={k} active={tab === k} onClick={() => setTab(k)}>{tabLabel(k)}</TabBtn>
              ))
              : (['brief', 'mockup', 'spec'] as CustView[]).map(k => (
                <TabBtn key={k} active={custView === k} onClick={() => setCustView(k)}>{tabLabel(k)}</TabBtn>
              ))}
          </nav>

          <div className="flex-1 min-h-0 overflow-auto">
            {renderView(devMode ? tab : custView)}
          </div>
        </main>
      </div>

      {/* 템플릿 팝업 */}
      {tplOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setTplOpen(false)}>
          <div className="bg-white rounded-2xl border border-[#E0E0E5] max-w-lg w-full max-h-[80vh] overflow-auto p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-[#111]">예시 템플릿</h2>
              <button className={BTN_SECONDARY} onClick={() => setTplOpen(false)} aria-label="닫기">✕</button>
            </div>
            {templates.length === 0 ? (
              <p className="text-sm text-[#707078]">(템플릿 없음)</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {templates.map(t => (
                  <li key={t.id}>
                    <button
                      onClick={() => applyTemplate(t)}
                      className={`w-full text-left rounded-xl border border-[#E0E0E5] p-3 hover:bg-[#F4F4F6] ${RING}`}
                    >
                      <div className="text-sm font-medium text-[#111]">{t.emoji} {t.title}</div>
                      <div className="text-xs text-[#707078]">{t.desc}</div>
                      <div className="text-[11px] text-[#707078] mt-1">{t.category} · {t.project}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 최대화 오버레이 */}
      {maximized && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center">
          <button
            className={`absolute top-2 right-2 rounded-full bg-white/90 px-3 py-1.5 text-sm text-[#111] ${RING}`}
            onClick={() => setMaximized(false)}
          >
            ✕ 닫기 (ESC)
          </button>
          <div style={{ width: 1440, height: 900, transform: `scale(${previewScale})`, transformOrigin: 'center' }}>
            <iframe title="목업 최대화" src={iframeSrc} onLoad={onIframeLoad} className="w-full h-full bg-white border-0" />
          </div>
        </div>
      )}
    </div>
  );

  // ── 뷰 렌더 (§3) ──
  function renderView(view: Tab | CustView) {
    switch (view) {
      case 'mockup':
        return (
          <div className="h-full flex flex-col">
            <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-[#E0E0E5] text-xs text-[#707078]">
              <span className="truncate">{iframeSrc}</span>
              <button className={`ml-auto ${BTN_SECONDARY}`} onClick={() => setMaximized(true)}>⛶ 최대화 (F)</button>
            </div>
            <iframe title="목업 프리뷰" src={iframeSrc} onLoad={onIframeLoad} className="flex-1 w-full bg-white border-0" />
          </div>
        );
      case 'brief':
        return brief
          ? <div className="p-4"><Md>{brief}</Md></div>
          : <Empty>{devMode ? '(캡처 대기)' : '목업 생성 시 회의 발언에서 요구사항을 먼저 정리합니다 …'}</Empty>;
      case 'spec':
        return spec
          ? <div className="p-4"><Md>{spec}</Md></div>
          : <Empty>{devMode ? '(역도출 대기)' : '목업 생성이 완료되면 자동으로 명세를 도출합니다 — SRS · ERD · OpenAPI'}</Empty>;
      case 'contract':
        return contract
          ? <pre className="p-4 text-xs whitespace-pre-wrap text-[#111]">{contract}</pre>
          : <Empty>(Freeze 대기)</Empty>;
      case 'code':
        return code
          ? (
            <div className="p-4">
              {codeFiles.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {codeFiles.map(f => (
                    <span key={f} className="rounded-[20px] bg-[#FF9800]/15 text-[#B25E00] px-3 py-1 text-xs font-medium">{f}</span>
                  ))}
                </div>
              )}
              <Md>{code}</Md>
            </div>
          )
          : <Empty>(코드 생성 대기)</Empty>;
      case 'versions':
        return versions.length === 0
          ? <Empty>(버전 없음 — ① 목업을 실행하면 이력이 쌓입니다)</Empty>
          : (
            <ul className="p-3 flex flex-col gap-2">
              {versions.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(v => {
                const kb = Math.max(1, Math.round(v.bytes / 1024));
                const isCurrent = v.webPath === iframeSrc;
                return (
                  <li key={`${v.project}-${v.version}`} className="flex items-center gap-2 rounded-xl border border-[#E0E0E5] p-2 text-sm">
                    <span className="font-medium text-[#111]">v{v.version}</span>
                    <span className="text-xs text-[#707078]">
                      {v.mode === 'edit' ? `✏ v${v.baseVersion ?? '?'} 수정` : '✨ 신규'}
                    </span>
                    <span className="text-xs text-[#707078]">{new Date(v.createdAt).toLocaleString()}</span>
                    <span className="text-xs text-[#707078]">{v.project} · {kb}KB</span>
                    <button
                      className={`ml-auto ${isCurrent ? 'text-[#00A3E0] text-xs' : BTN_SECONDARY}`}
                      disabled={isCurrent}
                      onClick={() => selectVersion(v)}
                    >
                      {isCurrent ? '보는 중' : '보기'}
                    </button>
                  </li>
                );
              })}
            </ul>
          );
      default:
        return null;
    }
  }
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[20px] px-3 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1428A0] ${
        active ? 'bg-[#1428A0] text-white' : 'bg-[#F4F4F6] text-[#111] hover:bg-[#E0E0E5]'
      }`}
    >
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-6 text-sm text-[#707078]">{children}</div>;
}

function tabLabel(k: Tab | CustView): string {
  switch (k) {
    case 'mockup': return '🖼 목업';
    case 'brief': return '📋 요구사항';
    case 'spec': return '📄 SRS';
    case 'contract': return 'Contract';
    case 'code': return '코드';
    case 'versions': return '버전';
    default: return k;
  }
}
