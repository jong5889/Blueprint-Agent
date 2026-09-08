// Shared data contract — jd owns this file. Workers import, never modify (propose only).
// See aidlc-docs/inception/application-design/application-design.md §2.

export interface ChatMsg { who: string; text: string }
export interface Utterance { id: string; who: string; text: string } // id = u-NNN (deterministic doc order)
export interface Brief { md: string }                                 // human-readable brief with [근거: u-NNN] tags

export interface VersionEntry {
  project: string;
  version: number;
  createdAt: string;      // ISO
  webPath: string;        // e.g. /mockups/task-detail-v2.html
  bytes: number;
  mode?: 'create' | 'edit';
  baseVersion?: number;
  transcriptSnapshot?: string; // §3.2.3 grounding
  groundingIds?: string[];     // §3.2.3: create = all utterances, edit = delta-only
  briefSummary?: string;       // §3.2.3: the requirement brief this version was built from
  usage?: { in: number; out: number };
}

export interface Template {
  id: string; emoji: string; title: string; desc: string;
  category: string; project: string; transcript: string;
}

// ── Visual Contract (deterministic freeze output) ──
export interface VBox { x: number; y: number; w: number; h: number }
export interface VContractComponent {
  id: string; role: string; box: VBox;
  bind?: { object: string; field: string };
}
export interface VContractAction {
  id: string; role: string; label: string; box: VBox;
  verb?: string; target?: string; fields?: string[]; result?: string;
}
export interface VDataObject {
  id: string;
  fields: { name: string; type: string; display?: string }[];
}
export interface VisualContract {
  page: { title: string; viewport: { w: number; h: number } };
  dataObjects: VDataObject[];
  components: VContractComponent[];
  actions: VContractAction[];
  stateFlow: { action: string; from?: string; to?: string }[];
}

// ── Jobs ──
export type JobKind = 'capture' | 'mockup' | 'reverse' | 'generate';
export interface Job {
  id: string;
  kind: JobKind;
  status: 'running' | 'done' | 'error';
  result?: unknown;
  error?: string;
}

// ── Stage I/O contracts (workers implement these signatures) ──
export interface CaptureInput { transcript: string }
export interface CaptureResult { brief: string }

export interface MockupInput { project: string; transcript: string }
export interface MockupResult { webPath: string; version: number; mode: 'create' | 'edit'; brief: string }

export interface FreezeInput { webPath: string }

export interface ReverseInput { contract: VisualContract }
export interface ReverseResult { specMd: string }

export interface GenerateInput { specMd: string }
export interface GenerateResult { codeMd: string; files: string[] }
