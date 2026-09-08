// STAGE: Contract 추출 (목업 → VisualContract). SLICE OWNER: S-B.
// DETERMINISTIC — NO LLM (C-1/원칙5). Playwright로 1440×900 렌더 후 mockup-meta.ts BP_ATTR 읽어 추출.
// 동일 목업 ⇒ 동일 계약. 이 파일은 ../shared/llm.ts 를 import 하지 않는다.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mockupFsPath } from '../shared/store.js';
import { BP_ATTR, BP_OBJECTS_SCRIPT_TYPE } from '../shared/mockup-meta.js';
import type { ContractInput, VisualContract } from '../shared/types.js';

export async function extractContract({ webPath }: ContractInput): Promise<VisualContract> {
  const url = pathToFileURL(mockupFsPath(webPath)).href;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    // tsx/esbuild가 evaluate 함수에 주입하는 __name 미정의 크래시 방지 (goto 전 필수)
    await page.addInitScript(() => { (window as any).__name ??= (f: any) => f; });
    await page.goto(url, { waitUntil: 'networkidle' });

    const contract = await page.evaluate(({ ATTR, OBJ_TYPE }) => {
      const round = (n: number) => Math.round(n);
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) };
      };

      const dataObjects: VisualContract['dataObjects'] = [];
      const objScript = document.querySelector(`script[type="${OBJ_TYPE}"]`);
      if (objScript?.textContent) {
        try { const parsed = JSON.parse(objScript.textContent); if (Array.isArray(parsed)) dataObjects.push(...parsed); }
        catch { /* 실패 시 [] */ }
      }

      const components: VisualContract['components'] = [];
      const actions: VisualContract['actions'] = [];
      const stateFlow: VisualContract['stateFlow'] = [];

      document.querySelectorAll(`[${ATTR.id}]`).forEach((el) => {
        const id = el.getAttribute(ATTR.id)!;
        const role = el.getAttribute(ATTR.role) || '';
        const actionSpec = el.getAttribute(ATTR.action);
        const isAction = id.startsWith('a-') || actionSpec != null;

        if (isAction) {
          const [verb, target, fieldsRaw, result] = (actionSpec || '').split(';');
          const fields = fieldsRaw ? fieldsRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
          const label = (el.textContent || '').trim().split('\n')[0].trim();
          actions.push({
            id, role, label, box: box(el),
            verb: verb?.trim() || undefined,
            target: target?.trim() || undefined,
            fields: fields && fields.length ? fields : undefined,
            result: result?.trim() || undefined,
          });
          if (result?.trim()) stateFlow.push({ action: id, to: result.trim() });
        } else {
          const bindRaw = el.getAttribute(ATTR.bind);
          let bind: { object: string; field: string } | undefined;
          if (bindRaw && bindRaw.includes('.')) {
            const dot = bindRaw.indexOf('.');
            bind = { object: bindRaw.slice(0, dot), field: bindRaw.slice(dot + 1) };
          }
          components.push({ id, role, box: box(el), bind });
        }
      });

      const titleEl = document.querySelector(`[${ATTR.role}="title"]`);
      const title = document.title || (titleEl?.textContent || '').trim();

      return {
        page: { title, viewport: { w: 1440, h: 900 } },
        dataObjects, components, actions, stateFlow,
      } as VisualContract;
    }, { ATTR: BP_ATTR, OBJ_TYPE: BP_OBJECTS_SCRIPT_TYPE });

    return contract;
  } finally {
    await browser.close();
  }
}
