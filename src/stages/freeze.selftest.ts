// Runnable check for the deterministic freeze extractor: tsx src/stages/freeze.selftest.ts
// Verifies data-bp-* → VisualContract mapping (application-design.md §7b). No LLM, no network.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { MOCKUP_DIR } from '../shared/store.js';
import { freeze } from './freeze.js';

const HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>태스크 상세</title></head>
<body>
  <h1 data-bp-id="c-title" data-bp-role="title" data-bp-bind="task.title">제목</h1>
  <span data-bp-id="c-status" data-bp-role="badge" data-bp-bind="task.status">진행중</span>
  <button data-bp-id="a-save" data-bp-role="button" data-bp-action="update;task;status;done">완료 처리</button>
  <script type="application/bp-objects">
    [{"id":"task","fields":[{"name":"title","type":"string","display":"text"},{"name":"status","type":"enum","display":"badge"}]}]
  </script>
</body></html>`;

async function main() {
  await fs.mkdir(MOCKUP_DIR, { recursive: true });
  await fs.writeFile(path.join(MOCKUP_DIR, 'selftest.html'), HTML);

  const c = await freeze({ webPath: '/mockups/selftest.html' });

  assert.equal(c.page.title, '태스크 상세');
  assert.equal(c.page.viewport.w, 1440);
  assert.equal(c.components.length, 2, 'expected 2 components');
  assert.equal(c.actions.length, 1, 'expected 1 action');

  const title = c.components.find(x => x.id === 'c-title')!;
  assert.deepEqual(title.bind, { object: 'task', field: 'title' });
  assert.ok(title.box.w > 0 && title.box.h > 0, 'geometry computed');

  const save = c.actions[0];
  assert.equal(save.verb, 'update');
  assert.equal(save.target, 'task');
  assert.deepEqual(save.fields, ['status']);
  assert.equal(save.result, 'done');

  assert.equal(c.dataObjects[0].id, 'task');
  assert.deepEqual(c.stateFlow, [{ action: 'a-save', to: 'done' }]);

  // determinism: same HTML ⇒ identical contract
  const c2 = await freeze({ webPath: '/mockups/selftest.html' });
  assert.deepEqual(c2, c, 'freeze must be deterministic');

  console.log('✅ freeze self-test passed');
}
main().catch((e) => { console.error('❌ freeze self-test FAILED\n', e); process.exit(1); });
