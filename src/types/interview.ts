export interface PresentationBrief {
  /** The core question or task the candidate is asked to present on. */
  brief: string;
  /** What the presentation is assessing for. */
  assessing: string[];
  /** Optional timing/format, e.g. "15 min presentation + 10 min Q&A". */
  format?: string;
}

export interface InterviewStage {
  id: string;
  name: string;
  description: string;
  duration: string;
  competencies?: string[];
  presentation?: PresentationBrief;
  panelists: Panelist[];
  questions: InterviewQuestion[];
  rationale: string;
}

export interface Panelist {
  role: string;
  reason: string;
  person_id?: string;
  name?: string;
}

export interface InterviewQuestion {
  question: string;
  category: string;
  scoringCriteria: ScoringLevel[];
}

export interface ScoringLevel {
  score: number;
  label: string;
  description: string;
}

export interface InterviewPlan {
  jobTitle: string;
  department: string;
  summary: string;
  stages: InterviewStage[];
}
