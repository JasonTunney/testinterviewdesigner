export interface InterviewStage {
  id: string;
  name: string;
  description: string;
  duration: string;
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
