// Shared data contract — jd owns. Subagents import, never modify (propose only).
// See aidlc-docs/inception/application-design/application-design.md (rev) §2.

export interface Utterance { id: string; who: string; text: string } // u-NNN 결정적

// req/constraints 는 사람이 읽는 Markdown 문서로 보존(항목 줄에 [근거: u-NNN]).
export interface DocPair { requirementsMd: string; constraintsMd: string }

// 커버리지/누락 체크 (§3.5)
export interface CoverageItem { text: string; groundingIds: string[] }
export interface CoverageResolution { item: CoverageItem; action: 'adopt-req' | 'adopt-constraint' | 'exclude' }

// 버전 (목업 publish 단위) — req/constraints 와 목업을 함께 묶는다
export interface Version {
  n: number;
  createdAt: string;
  mode: 'create' | 'edit';
  parent?: number;
  transcriptSnapshot: string;
  groundingIds: string[];           // create=전체, edit=델타
  requirementsMd: string;
  constraintsMd: string;
  webPath: string;                  // /mockups/<file>.html
  frozen?: boolean;
  major?: number;
  usage?: { in: number; out: number };
}

export interface Meeting {
  id: string;
  project: string;
  title: string;
  transcript: string;               // 현재 대화 전문(영속)
  draftRequirementsMd: string;      // 최신 추출 결과(아직 버전 아님)
  draftConstraintsMd: string;
  currentVersion: number;           // 0 = 아직 없음
  versions: Version[];
}

export interface ProjectSummary {
  project: string;
  meetings: { id: string; title: string }[];
  frozenMajors: { meeting: string; major: number; at: string }[];
}

// 시각 계약 (결정적, export 시점) — 목업 data-bp-* 에서 추출
export interface VBox { x: number; y: number; w: number; h: number }
export interface VisualContract {
  page: { title: string; viewport: { w: number; h: number } };
  dataObjects: { id: string; fields: { name: string; type: string; display?: string }[] }[];
  components: { id: string; role: string; box: VBox; bind?: { object: string; field: string } }[];
  actions: { id: string; role: string; label: string; box: VBox; verb?: string; target?: string; fields?: string[]; result?: string }[];
  stateFlow: { action: string; from?: string; to?: string }[];
}

// export 세트 (§5) — schema 'bp-export/1'
export interface ExportManifest {
  schema: 'bp-export/1';
  project: string;
  meeting: string;
  major: number;
  frozenAt: string;
  files: { requirements: string; constraints: string; mockup: string; contract: string; trace: string };
  importantDecisions: { text: string; groundingIds: string[] }[];
}
export interface ExportTrace {
  utterances: Utterance[];
  decisions: CoverageResolution[];
  lineage: { meeting: string; major: number; parents: number[] };
}

// ── Jobs ──
export type JobKind = 'extract' | 'mockup' | 'coverage';
export interface Job { id: string; kind: JobKind; status: 'running' | 'done' | 'error'; result?: unknown; error?: string }

// ── Stage I/O 계약 (subagent 구현 시그니처) ──
// S-A (LLM 스테이지)
export interface ExtractInput { transcript: string }
export interface ExtractResult { requirementsMd: string; constraintsMd: string }

export interface MockupInput {
  requirementsMd: string;
  constraintsMd: string;
  prior?: { html: string; deltaLines: string };   // 편집 모드: 직전 HTML + 델타 발언 요약
}
export interface MockupResult { html: string }

export interface CoverageInput { transcript: string; requirementsMd: string; constraintsMd: string }
export interface CoverageResult { missing: CoverageItem[] }

// S-B (결정적 스테이지)
export interface ContractInput { webPath: string }
export interface ExportSetInput {
  dir: string;                       // store.exportDir 로 산출된 절대경로
  project: string; meeting: string; major: number; frozenAt: string;
  requirementsMd: string; constraintsMd: string; html: string;
  contract: VisualContract; trace: ExportTrace;
  importantDecisions: { text: string; groundingIds: string[] }[];
}
export interface ReimportInput { dir: string }
export interface ReimportResult { project: string; title: string; requirementsMd: string; constraintsMd: string; decisions: CoverageResolution[] }
