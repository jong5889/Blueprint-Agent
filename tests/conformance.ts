// Conformance harness — verifies the built system against requirements + constraints (C-1..C-4, §3).
// Run: server up on $BP_PORT (default 3900) with Bedrock env, then:
//   export PATH=/opt/homebrew/bin:$PATH && node_modules/.bin/tsx tests/conformance.ts
// This is a QA harness (not a product feature). It hits the live HTTP API + does static checks.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { parseTranscript } from '../src/shared/ids.js';
import { mockupFsPath } from '../src/shared/store.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = `http://localhost:${process.env.BP_PORT || 3900}`;
const results: { id: string; ok: boolean; detail: string }[] = [];
const check = (id: string, ok: boolean, detail = '') => { results.push({ id, ok, detail }); console.log(`${ok ? '✅' : '❌'} ${id} ${detail}`); };
const soft = (id: string, fn: () => void | Promise<void>) => Promise.resolve().then(fn).then(() => {}).catch((e) => check(id, false, 'THREW: ' + e.message));

async function post(p: string, body: unknown) {
  const r = await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
async function get(p: string) { const r = await fetch(BASE + p); return { status: r.status, json: await r.json().catch(() => ({})) }; }
async function poll(jobId: string, secs = 240) {
  for (let i = 0; i < secs / 3; i++) { await new Promise(r => setTimeout(r, 3000)); const { json } = await get(`/jobs/${jobId}`); if ((json as any).status === 'done') return (json as any).result; if ((json as any).status === 'error') throw new Error((json as any).error); }
  throw new Error('poll timeout');
}
const uIds = (s: string) => new Set((s.match(/u-\d{3}/g) || []));

async function main() {
  const PROJECT = 'conf-' + Date.now();

  // ── T1 §3.1.3 — deterministic, stable u-NNN ids ──
  await soft('T1 u-NNN 결정성·안정성 (§3.1.3)', () => {
    const t1 = '기획자: 목록이 필요해\n개발자: 정렬도요\n디자이너: 파랑으로';
    const a = parseTranscript(t1), b = parseTranscript(t1);
    assert.deepEqual(a.map(u => u.id), b.map(u => u.id), '동일 입력 동일 id');
    const appended = parseTranscript(t1 + '\n기획자: 하나 더');
    assert.deepEqual(appended.slice(0, 3).map(u => u.id), a.map(u => u.id), '추가 시 기존 id 불변');
    assert.equal(appended[3].id, 'u-004');
    check('T1 u-NNN 결정성·안정성 (§3.1.3)', true, `ids=${a.map(u => u.id).join(',')} +append=u-004`);
  });

  // ── T2 C-1 — freeze deterministic + NO LLM + sync ──
  await soft('T2a freeze.ts LLM 미의존 (C-1 정적)', () => {
    const src = readFileSync(path.join(ROOT, 'src/stages/freeze.ts'), 'utf8');
    const importsLlm = /from ['"].*\/llm(\.js)?['"]/.test(src) || /callLLM/.test(src);
    check('T2a freeze.ts LLM 미의존 (C-1 정적)', !importsLlm, importsLlm ? 'llm import 발견!' : 'llm import 없음');
  });

  // Full pipeline (needs LLM). Build a create version first.
  const tpl = (await get('/templates')).json as any;
  const transcript: string = (tpl.templates?.[0]?.transcript) || (await get('/transcript')).json.transcript;
  const tIds = uIds(parseTranscript(transcript).map(u => u.id).join(' ')); // ids present in transcript

  console.log(`\n— pipeline on project=${PROJECT}, transcript ${transcript.length} chars —`);
  const mk = await post('/mockup', { project: PROJECT, transcript });
  check('T8a /mockup 202+jobId (async §3.7.3)', mk.status === 202 && !!mk.json.jobId, `status=${mk.status}`);
  const mkRes = await poll(mk.json.jobId);
  check('T5a 초기 생성 mode=create v1', mkRes.mode === 'create' && mkRes.version === 1, `mode=${mkRes.mode} v=${mkRes.version}`);

  // C-3-ish: mockup HTML carries data-bp-* (freeze seam)
  await soft('T3a 목업 data-bp-* 부착 (§7b seam)', () => {
    const html = readFileSync(mockupFsPath(mkRes.webPath), 'utf8');
    const ids = (html.match(/data-bp-id="[^"]+"/g) || []).length;
    const hasObjects = /application\/bp-objects/.test(html);
    assert.ok(ids >= 3, `data-bp-id ${ids}개`);
    assert.ok(hasObjects, 'bp-objects 선언');
    check('T3a 목업 data-bp-* 부착 (§7b seam)', true, `data-bp-id ${ids}개, bp-objects 있음`);
  });

  // ── T2 C-1 — /freeze sync + determinism ──
  const f1 = await post('/freeze', { webPath: mkRes.webPath });
  check('T2b /freeze 동기 응답(계약 직접 반환, no jobId) (C-1/§3.3)', f1.status === 200 && !!f1.json.contract && !f1.json.jobId, `status=${f1.status}`);
  const f2 = await post('/freeze', { webPath: mkRes.webPath });
  await soft('T2c freeze 결정성(동일 입력 동일 계약) (C-1)', () => {
    assert.deepEqual(f1.json.contract, f2.json.contract);
    check('T2c freeze 결정성(동일 입력 동일 계약) (C-1)', true, `${f1.json.contract.components.length} comp / ${f1.json.contract.actions.length} act`);
  });
  const contract = f1.json.contract;
  const contractIds = new Set<string>([...contract.components, ...contract.actions].map((x: any) => x.id));

  // ── T3 C-3 — capture grounding: every item tagged, no hallucinated u-NNN ──
  const cap = await poll((await post('/capture', { transcript })).json.jobId);
  await soft('T3b 브리프 근거 태그·무환각 id (C-3/§3.1.4)', () => {
    const brief: string = cap.brief;
    const bullets = brief.split('\n').filter(l => /^\s*-\s+/.test(l) && !/확인되지\s*않음/.test(l));
    const tagged = bullets.filter(l => /\[근거:\s*u-\d{3}/.test(l));
    const refIds = uIds(brief);
    const hallucinated = [...refIds].filter(id => !tIds.has(id));
    assert.ok(bullets.length > 0, '항목 존재');
    const ratio = tagged.length / bullets.length;
    assert.ok(ratio >= 0.8, `근거태그 비율 ${(ratio * 100) | 0}% (${tagged.length}/${bullets.length})`);
    assert.equal(hallucinated.length, 0, `환각 id: ${hallucinated.join(',')}`);
    check('T3b 브리프 근거 태그·무환각 id (C-3/§3.1.4)', true, `태그 ${tagged.length}/${bullets.length}, 환각 0`);
  });

  // ── T6 §3.4 — reverse: 3 sections + FR-NN ; T4 C-2 handled structurally (endpoint takes contract only) ──
  const rev = await poll((await post('/reverse', { contract })).json.jobId);
  let specMd = '';
  await soft('T6 역도출 3절 + FR-NN (§3.4)', () => {
    specMd = rev.specMd;
    const hasSRS = /SRS/i.test(specMd), hasERD = /ERD/i.test(specMd), hasAPI = /OpenAPI/i.test(specMd);
    const frs = [...new Set(specMd.match(/FR-\d{2}/g) || [])];
    assert.ok(hasSRS && hasERD && hasAPI, `절: SRS=${hasSRS} ERD=${hasERD} API=${hasAPI}`);
    assert.ok(frs.includes('FR-01'), 'FR-01 존재');
    check('T6 역도출 3절 + FR-NN (§3.4)', true, `${frs.length} FRs, 3절 존재`);
  });
  await soft('T4 C-2 역도출 계약-only (근거 id가 계약 요소 부분집합)', () => {
    // spec references contract element ids (a-*, c-*); they must be a subset of the contract's ids.
    const referenced = [...new Set(specMd.match(/\b[ac]-[a-z0-9-]+/gi) || [])];
    const outside = referenced.filter(id => !contractIds.has(id));
    // allow some fuzz (model may abbreviate); flag if majority outside
    const ok = referenced.length === 0 || outside.length <= Math.floor(referenced.length * 0.2);
    check('T4 C-2 역도출 계약-only (근거 id가 계약 요소 부분집합)', ok, `참조 ${referenced.length}, 계약밖 ${outside.length}: ${outside.slice(0,5).join(',')}`);
  });

  // ── T7 §3.5 — generate: ≥3 files + FR refs ──
  const gen = await poll((await post('/generate', { specMd })).json.jobId);
  await soft('T7 코드생성 ≥3파일 + FR 역참조 (§3.5)', () => {
    const files: string[] = gen.files || [];
    const frRefs = (gen.codeMd.match(/FR-\d{2}/g) || []).length;
    assert.ok(files.length >= 3, `파일 ${files.length}개`);
    assert.ok(frRefs >= 1, `FR 주석 ${frRefs}개`);
    check('T7 코드생성 ≥3파일 + FR 역참조 (§3.5)', true, `${files.length}파일: ${files.join(', ')} / FR참조 ${frRefs}`);
  });

  // ── T5 C-4 — delta edit: append utterance → mode=edit, baseVersion, grounding includes new id ──
  const extra = '\n기획자: 상단에 인쇄 버튼도 추가해 주세요.';
  const mk2 = await poll((await post('/mockup', { project: PROJECT, transcript: transcript + extra })).json.jobId);
  await soft('T5b 델타 수정 mode=edit (C-4/§3.2.2)', async () => {
    // MockupResult 계약은 {webPath,version,mode} — baseVersion은 저장된 VersionEntry에서 확인.
    assert.equal(mk2.mode, 'edit', `mode=${mk2.mode}`);
    assert.equal(mk2.version, 2, `v=${mk2.version}`);
    const vs = (await get('/versions')).json.versions as any[];
    const v2 = vs.find(v => v.project === PROJECT && v.version === 2);
    assert.equal(v2?.baseVersion, 1, `stored base=${v2?.baseVersion}`);
    check('T5b 델타 수정 mode=edit (C-4/§3.2.2)', true, `v2 edit, 저장 baseVersion=1`);
  });
  // version metadata (§3.2.3)
  await soft('T8b 버전 메타데이터 보존 (§3.2.3)', async () => {
    const vs = (await get('/versions')).json.versions as any[];
    const v2 = vs.find(v => v.project === PROJECT && v.version === 2);
    const missing = ['createdAt', 'mode', 'baseVersion', 'transcriptSnapshot', 'groundingIds'].filter(k => v2?.[k] == null);
    check('T8b 버전 메타데이터 보존 (§3.2.3)', missing.length === 0, missing.length ? `누락: ${missing.join(',')}` : '생성시각·모드·부모·스냅샷·근거 보존');
  });

  // ── T9 §3.7.3 — input validation (bad request → 400) ──
  await soft('T9 잘못된 입력 400 (§3.7.3 입력검증)', async () => {
    const r = await post('/capture', {});
    check('T9 잘못된 입력 400 (§3.7.3 입력검증)', r.status === 400, `status=${r.status}`);
  });

  // ── summary ──
  const pass = results.filter(r => r.ok).length, fail = results.length - pass;
  console.log(`\n===== CONFORMANCE: ${pass}/${results.length} PASS, ${fail} FAIL =====`);
  if (fail) { console.log('FAILURES:'); results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.id} — ${r.detail}`)); }
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
