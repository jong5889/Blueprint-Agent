// STAGE: Freeze / Visual Contract extraction. SLICE OWNER: jd (contract boundary).
// DETERMINISTIC — NO LLM (C-1 / 원칙2). Fuses geometry (rendered rects) + structure (roles) +
// intent (data-bp-* metadata, application-design.md §7b) into a VisualContract.
// Same HTML ⇒ identical output. MUST NOT import ../shared/llm.ts.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mockupFsPath } from '../shared/store.js';
import type {
  FreezeInput, VisualContract, VContractComponent, VContractAction, VDataObject,
} from '../shared/types.js';

const VIEWPORT = { w: 1440, h: 900 };

export async function freeze(input: FreezeInput): Promise<VisualContract> {
  const url = pathToFileURL(mockupFsPath(input.webPath)).href;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: VIEWPORT.w, height: VIEWPORT.h } });
    // esbuild/tsx injects a __name helper into serialized page functions; define it in-page.
    await page.addInitScript(() => { (window as any).__name ??= (f: any) => f; });
    await page.goto(url, { waitUntil: 'networkidle' });

    const data = await page.evaluate(() => {
      const round = (n: number) => Math.round(n);
      const parseAction = (raw: string | null) => {
        if (!raw) return {};
        const [verb, target, fields, result] = raw.split(';');
        return {
          verb: verb?.trim() || undefined,
          target: target?.trim() || undefined,
          fields: fields ? fields.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          result: result?.trim() || undefined,
        };
      };

      const components: any[] = [];
      const actions: any[] = [];
      const els = Array.from(document.querySelectorAll('[data-bp-id]'));
      for (const el of els) {
        const id = el.getAttribute('data-bp-id') || '';
        const role = el.getAttribute('data-bp-role') || 'text';
        const r = el.getBoundingClientRect();
        const box = { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) };
        const actionRaw = el.getAttribute('data-bp-action');
        if (id.startsWith('a-') || actionRaw) {
          const a = parseAction(actionRaw);
          actions.push({ id, role, label: (el.textContent || '').trim().slice(0, 80), box, ...a });
        } else {
          const bindRaw = el.getAttribute('data-bp-bind');
          const bind = bindRaw && bindRaw.includes('.')
            ? { object: bindRaw.split('.')[0], field: bindRaw.split('.').slice(1).join('.') }
            : undefined;
          components.push({ id, role, box, bind });
        }
      }

      let dataObjects: any[] = [];
      const objScript = document.querySelector('script[type="application/bp-objects"]');
      if (objScript?.textContent) {
        try { dataObjects = JSON.parse(objScript.textContent); } catch { dataObjects = []; }
      }

      const titleEl = document.querySelector('[data-bp-role="title"]');
      const title = document.title || (titleEl?.textContent || '').trim() || 'Untitled';
      return { title, components, actions, dataObjects };
    });

    const stateFlow = (data.actions as VContractAction[])
      .filter(a => a.result)
      .map(a => ({ action: a.id, to: a.result }));

    return {
      page: { title: data.title, viewport: VIEWPORT },
      dataObjects: data.dataObjects as VDataObject[],
      components: data.components as VContractComponent[],
      actions: data.actions as VContractAction[],
      stateFlow,
    };
  } finally {
    await browser.close();
  }
}
