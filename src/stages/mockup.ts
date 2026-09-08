// STAGE: Mockup (Brief[+prev] → single HTML screen with author-intent metadata). SLICE OWNER: mingu.
// Emit data-bp-* intent metadata EXACTLY per application-design.md §7b (mingu↔jd freeze seam).
// Samsung design tokens (requirements/samsung-design-guidelines.md). Only brief-stated elements (C-3).
// Delta edit: requires prior version + delta utterances (C-4). Persist via ../shared/store.ts (saveMockup).
import type { MockupInput, MockupResult } from '../shared/types.js';

export async function runMockup(_input: MockupInput): Promise<MockupResult> {
  throw new Error('NOT_IMPLEMENTED: mockup (mingu slice)');
}
