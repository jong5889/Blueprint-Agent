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
  n: number;                        // 전역 고유·조작 키(export/삭제/revert)
  group: number;                    // rev3 R2: 논리 단계(1-based). 표시 라벨 v{group}[-{variant}]
  variant: number;                  // rev3 R2: 그룹 내 변형(1-based)
  createdAt: string;
  mode: 'create' | 'edit';
  parent?: number;
  transcriptSnapshot: string;
  groundingIds: string[];           // create=전체, edit=델타
  requirementsMd: string;
  constraintsMd: string;
  webPath: string;                  // /mockups/<file>.html
  usage?: { in: number; out: number };
}

// rev2: 진행 중 작업 영속(새로고침 복원, 개선 A/#7)
export interface ActiveJob { id: string; kind: JobKind; status: 'running' | 'done' | 'error' }

export interface Meeting {
  id: string;
  project: string;
  title: string;
  transcript: string;               // 현재 대화 전문(영속)
  draftRequirementsMd: string;      // 최신 추출 결과(아직 버전 아님)
  draftConstraintsMd: string;
  currentVersion: number;           // 0 = 아직 없음
  versions: Version[];
  activeJob?: ActiveJob | null;     // rev2: 진행 중이면 해당 작업, 아니면 null
}

export interface ProjectSummary {
  project: string;
  meetings: { id: string; title: string }[];
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

// export 세트 (§5, rev2) — schema 'bp-export/2' (버전 단위, freeze 제거, yaml 추가)
export interface ExportManifest {
  schema: 'bp-export/2';
  project: string;
  meeting: string;
  version: number;                  // rev2: major → 버전 단위
  exportedAt: string;
  files: { requirements: string; constraints: string; mockup: string; contract: string; contractYaml: string; trace: string };
  importantDecisions: { text: string; groundingIds: string[] }[];
}
export interface ExportTrace {
  utterances: Utterance[];
  decisions: CoverageResolution[];
  lineage: { meeting: string; version: number; parents: number[] };
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
  project: string; meeting: string; version: number; exportedAt: string;
  requirementsMd: string; constraintsMd: string; html: string;
  contract: VisualContract; trace: ExportTrace;
  importantDecisions: { text: string; groundingIds: string[] }[];
}
export interface ReimportInput { dir: string }
export interface ReimportResult { project: string; title: string; requirementsMd: string; constraintsMd: string; decisions: CoverageResolution[] }
