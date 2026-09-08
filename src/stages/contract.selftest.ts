// SELF-TEST (S-B): data-bp-* 샘플 HTML → extractContract 결정성/분류 검증.
// 실행: export PATH=/opt/homebrew/bin:$PATH && node_modules/.bin/tsx src/stages/contract.selftest.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { MOCKUP_DIR } from '../shared/store.js';
import { BP_ATTR, BP_OBJECTS_SCRIPT_TYPE } from '../shared/mockup-meta.js';
import { extractContract } from './contract.js';

const html = `<!doctype html><html><head><title>태스크 상세</title>
<script type="${BP_OBJECTS_SCRIPT_TYPE}">
[{"id":"task","fields":[{"name":"title","type":"string","display":"text"},{"name":"status","type":"string"}]}]
</script></head><body>
  <h1 ${BP_ATTR.id}="c-title" ${BP_ATTR.role}="title" ${BP_ATTR.bind}="task.title">제목</h1>
  <span ${BP_ATTR.id}="c-status" ${BP_ATTR.role}="badge" ${BP_ATTR.bind}="task.status">진행중</span>
  <button ${BP_ATTR.id}="a-save" ${BP_ATTR.role}="button" ${BP_ATTR.action}="update;task;status,title;done">저장</button>
  <button ${BP_ATTR.id}="a-cancel" ${BP_ATTR.role}="button">취소</button>
</body></html>`;

async function main() {
  const file = '__selftest-bp.html';
  await fs.writeFile(path.join(MOCKUP_DIR, file), html);
  const webPath = `/mockups/${file}`;

  const c = await extractContract({ webPath });

  assert.equal(c.page.title, '태스크 상세');
  assert.deepEqual(c.page.viewport, { w: 1440, h: 900 });

  // dataObjects
  assert.equal(c.dataObjects.length, 1);
  assert.equal(c.dataObjects[0].id, 'task');
  assert.equal(c.dataObjects[0].fields.length, 2);

  // components: c-title, c-status (bind 파싱)
  assert.equal(c.components.length, 2);
  const title = c.components.find((x) => x.id === 'c-title')!;
  assert.deepEqual(title.bind, { object: 'task', field: 'title' });

  // actions: a-save (action spec), a-cancel (a- prefix, no spec)
  assert.equal(c.actions.length, 2);
  const save = c.actions.find((x) => x.id === 'a-save')!;
  assert.equal(save.verb, 'update');
  assert.equal(save.target, 'task');
  assert.deepEqual(save.fields, ['status', 'title']);
  assert.equal(save.result, 'done');
  assert.equal(save.label, '저장');

  // stateFlow: result 있는 액션만
  assert.equal(c.stateFlow.length, 1);
  assert.deepEqual(c.stateFlow[0], { action: 'a-save', to: 'done' });

  // 결정성: 동일 목업 ⇒ 동일 계약
  const c2 = await extractContract({ webPath });
  assert.deepEqual(c, c2, '동일 목업이 동일 계약을 내야 함');

  await fs.unlink(path.join(MOCKUP_DIR, file));
  console.log('contract self-test: PASS');
}

main().catch((e) => { console.error('contract self-test: FAIL', e); process.exit(1); });
