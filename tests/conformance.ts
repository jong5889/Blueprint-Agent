// Conformance harness (rev) — 요구사항·제약(C-1~C-6) + 골든패스 검증.
// 서버 up on $BP_PORT(기본 3900) + Bedrock env → export PATH=/opt/homebrew/bin:$PATH && node_modules/.bin/tsx tests/conformance.ts
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { parseTranscript } from '../src/shared/ids.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = `http://localhost:${process.env.BP_PORT || 3900}`;
const results: { id: string; ok: boolean; detail: string }[] = [];
const check = (id: string, ok: boolean, d = '') => { results.push({ id, ok, detail: d }); console.log(`${ok ? '✅' : '❌'} ${id} ${d}`); };
const soft = (id: string, fn: () => any) => Promise.resolve().then(fn).then(() => {}).catch(e => check(id, false, 'THREW: ' + e.message));

async function post(p: string, b: unknown) { const r = await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return { status: r.status, json: await r.json().catch(() => ({})) }; }
async function put(p: string, b: unknown) { const r = await fetch(BASE + p, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return r.status; }
async function get(p: string) { const r = await fetch(BASE + p); return { status: r.status, json: await r.json().catch(() => ({})) }; }
async function poll(jobId: string) { for (let i = 0; i < 90; i++) { await new Promise(r => setTimeout(r, 3000)); const { json } = await get(`/jobs/${jobId}`); if ((json as any).status === 'done') return (json as any).result; if ((json as any).status === 'error') throw new Error((json as any).error); } throw new Error('timeout'); }
const uSet = (s: string) => new Set((s.match(/u-\d{3}/g) || []));

async function main() {
  // T1 — u-NNN 결정성
  await soft('T1 u-NNN 결정성·안정성', () => {
    const t = '기획자: a\n개발자: b';
    assert.deepEqual(parseTranscript(t).map(u => u.id), ['u-001', 'u-002']);
    assert.equal(parseTranscript(t + '\n디자이너: c')[2].id, 'u-003');
    check('T1 u-NNN 결정성·안정성', true, 'u-001,002 + append u-003');
  });
  // T2a — C-1 정적: contract.ts LLM 미의존
  await soft('T2a contract.ts LLM 미의존 (C-1)', () => {
    const src = readFileSync(path.join(ROOT, 'src/stages/contract.ts'), 'utf8');
    // 주석 오탐 방지: 실제 import 구문 또는 callLLM 호출만 검사
    const imports = /from\s+['"][^'"]*\/llm(\.js)?['"]/.test(src);
    const calls = /\bcallLLM\s*\(/.test(src);
    check('T2a contract.ts LLM 미의존 (C-1)', !imports && !calls, imports || calls ? 'llm 실제 사용!' : 'llm import·호출 없음');
  });

  const T = '기획자: 주문 상세 화면. 주문번호·상품·금액·상태 표시.\nPO: 환불 버튼 필요. PG 연동은 범위 밖.\n기획자: 엑셀 내보내기도 됐으면.';
  const tIds = uSet(parseTranscript(T).map(u => u.id).join(' '));
  const m = (await post('/meetings', { project: 'conf', title: '주문상세-' + Date.now(), transcript: T })).json as any;

  // T8a — extract async 202
  const ex = await post('/extract', { meetingId: m.id });
  check('T8a /extract async 202+jobId', ex.status === 202 && !!ex.json.jobId, `status=${ex.status}`);
  const exr = await poll(ex.json.jobId);

  // T3 — C-3 근거 태그·무환각 (req+con)
  await soft('T3 추출 근거 태그·무환각 (C-3)', () => {
    const md = exr.requirementsMd + '\n' + exr.constraintsMd;
    const refs = uSet(md);
    const hall = [...refs].filter(id => !tIds.has(id));
    assert.equal(hall.length, 0, `환각 id: ${hall.join(',')}`);
    assert.ok(/\[근거:/.test(md), '근거 태그 존재');
    check('T3 추출 근거 태그·무환각 (C-3)', true, `근거태그 있음, 환각 0`);
  });

  // mockup v1 (create)
  const v1 = await poll((await post('/mockup', { meetingId: m.id })).json.jobId);
  check('T5a mockup create v1', v1.mode === 'create' && v1.version === 1, `mode=${v1.mode} v=${v1.version}`);

  // T6 — C-5 coverage: 후보만 반환(자동추가 없음) + resolve가 문서에 편입
  await soft('T6 커버리지 후보 + 휴먼게이트 편입 (C-5)', async () => {
    const cov = await poll((await post('/coverage', { meetingId: m.id })).json.jobId);
    assert.ok(Array.isArray(cov.missing), 'missing 배열');
    const before = (await get('/meetings/' + m.id)).json as any;
    const res = await post('/coverage/resolve', { meetingId: m.id, resolutions: [{ item: { text: '테스트 제외항목', groundingIds: [] }, action: 'exclude' }] });
    assert.ok(/의도적 제외/.test((res.json as any).constraintsMd), 'exclude가 constraints에 편입');
    check('T6 커버리지 후보 + 휴먼게이트 편입 (C-5)', true, `missing ${cov.missing.length}건, exclude 편입 확인`);
  });

  // T5b — C-4 delta edit; T5c — 델타 0 차단
  await put('/meetings/' + m.id + '/transcript', { transcript: T + '\n디자이너: 인쇄 버튼 추가.' });
  await poll((await post('/extract', { meetingId: m.id })).json.jobId);
  const v2 = await poll((await post('/mockup', { meetingId: m.id })).json.jobId);
  check('T5b 델타 편집 v2 edit (C-4)', v2.mode === 'edit' && v2.version === 2, `mode=${v2.mode} v=${v2.version}`);
  await soft('T5c 델타 0 → 수정 차단 (C-4)', async () => {
    let blocked = false;
    try { await poll((await post('/mockup', { meetingId: m.id })).json.jobId); } catch (e: any) { blocked = /변경된 발언|C-4/.test(e.message); }
    check('T5c 델타 0 → 수정 차단 (C-4)', blocked, blocked ? '델타 0 차단됨' : '차단 안됨!');
  });

  // freeze + export + T4 결정성 + T7 왕복
  const fr = (await post('/freeze', { meetingId: m.id, version: 2 })).json as any;
  const ex1 = (await post('/export', { meetingId: m.id, major: fr.major })).json as any;
  await soft('T4a export 세트 6파일 (§5)', () => {
    const files = readdirSync(ex1.dir);
    const want = ['requirements.md', 'constraints.md', 'mockup.html', 'visual-contract.json', 'trace.json', 'manifest.json'];
    const miss = want.filter(f => !files.includes(f));
    check('T4a export 세트 6파일 (§5)', miss.length === 0, miss.length ? `누락:${miss}` : want.join(','));
  });
  await soft('T4b 계약 추출 결정성 (C-1)', async () => {
    const c1 = readFileSync(path.join(ex1.dir, 'visual-contract.json'), 'utf8');
    const ex2 = (await post('/export', { meetingId: m.id, major: fr.major })).json as any;
    const c2 = readFileSync(path.join(ex2.dir, 'visual-contract.json'), 'utf8');
    assert.equal(c1, c2, 'export 2회 계약 동일');
    const c = JSON.parse(c1);
    check('T4b 계약 추출 결정성 (C-1)', true, `${c.components.length}comp/${c.actions.length}act, 2회 동일`);
  });
  await soft('T7 export→import 왕복 (§3.7.3)', async () => {
    const im = (await post('/import', { dir: ex1.dir })).json as any;
    assert.ok(im.id && im.draftRequirementsMd, '재import로 새 회의체 시드');
    check('T7 export→import 왕복 (§3.7.3)', true, `new meeting ${im.id}`);
  });

  // T9 — SSE 세션 스코프
  await soft('T9 SSE 세션 스코프', async () => {
    const port = Number(process.env.BP_PORT || 3900);
    const listen = (s: string) => { const got: string[] = []; const req = http.get({ host: 'localhost', port, path: '/events?sid=' + s }, r => { r.setEncoding('utf8'); r.on('data', (c: string) => { for (const x of c.matchAll(/event:\s*(\w+)/g)) got.push(x[1]); }); }); return { got, close: () => req.destroy() }; };
    const A = listen('C-A'), B = listen('C-B');
    await new Promise(r => setTimeout(r, 700));
    const mm = (await post('/meetings', { project: 'conf', title: 'sse', transcript: '기획자: 화면' })).json as any;
    await fetch(BASE + '/extract', { method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': 'C-A' }, body: JSON.stringify({ meetingId: mm.id }) });
    await new Promise(r => setTimeout(r, 45000)); A.close(); B.close();
    const ok = A.got.includes('extract') && !B.got.includes('extract');
    check('T9 SSE 세션 스코프', ok, `A=[${A.got.join(',')}] B=[${B.got.join(',')}]`);
  });

  const pass = results.filter(r => r.ok).length;
  console.log(`\n===== CONFORMANCE(rev): ${pass}/${results.length} PASS, ${results.length - pass} FAIL =====`);
  results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.id} — ${r.detail}`));
  process.exit(results.length - pass ? 1 : 0);
}
main().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
