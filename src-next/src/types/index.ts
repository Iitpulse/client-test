// User Types
export interface ICurrentUser {
  id: string;
  email: string;
  userType: string;
  instituteId?: string;
  name?: string;
}

// Test Types
export type QuestionStatus =
  | "notVisited"
  | "notAnswered"
  | "answered"
  | "markedForReview"
  | "answeredAndMarkedForReview";

export interface IOption {
  id: string;
  value: string;
}

export interface IQuestionContent {
  question: string;
  options?: IOption[];
}

/** M6: how the exam app answers a question (paragraph children arrive flattened as their own type) */
export type ExamQuestionType = "single" | "multiple" | "integer" | "matrix";

/** Ticked cells per row: { A: ["P"], B: ["Q", "R"] } */
export type MatrixAnswer = Record<string, string[]>;

export interface IMatrixGrid {
  rows: Array<{ id: string; en: string; hi: string | null }>;
  columns: Array<{ id: string; en: string; hi: string | null }>;
}

export interface IParagraphSet {
  setId: string;
  index: number;
  count: number;
  passage: { en: string; hi: string | null };
}

export interface IQuestion {
  id: string;
  type: ExamQuestionType;
  /** M6: original bank type (paragraph for a set's child) */
  sourceType?: "single" | "multiple" | "integer" | "paragraph" | "matrix";
  /** M6: paragraph children */
  set?: IParagraphSet | null;
  /** M6: matrix grid rows (List I) and columns (List II) */
  matrix?: IMatrixGrid | null;
  en: IQuestionContent;
  hi?: IQuestionContent;
  sectionId: string;
  subSectionId: string;
  // Section info for display
  sectionName?: string;
  sectionSubject?: string;
  subSectionName?: string;
  subSectionDescription?: string;
  // toBeAttempted limit for the subsection
  toBeAttempted?: number;
  totalQuestionsInSubSection?: number;
  markingScheme?: {
    correct: number[];
    incorrect: number;
  };
}

export interface IQuestionWithStatus extends IQuestion {
  status: {
    status: QuestionStatus;
    visitedAt?: string;
    timeTakenInSeconds: number;
  };
  selectedOptions: string[];
  enteredAnswer?: string;
  /** M6: matrix questions only */
  matrixAnswer?: MatrixAnswer;
}

/** One question's entry in save-progress / submit / resume */
export interface IAnswerEntry {
  selectedOptions?: string[];
  enteredAnswer?: number;
  matrix?: MatrixAnswer;
  timeTakenInSeconds?: number;
  status?: string;
}

/** M6 answer history (store-only; sent as `answerLog` with save-progress and submit) */
export type AnswerLogValue = { selectedOptions?: string[]; enteredAnswer?: number; matrix?: MatrixAnswer } | null;
export interface AnswerLogEntry {
  questionId: string;
  at: string;
  kind: "visit" | "answer" | "clear" | "markReview";
  value?: AnswerLogValue;
}

/** M6 fullscreen exits with durations (sent as `events` with save-progress) */
export interface FullscreenEvent {
  kind: "fullscreenExit";
  at: string;
  durationSeconds: number | null;
}

export interface ISubSection {
  id: string;
  name: string;
  type: ExamQuestionType;
  totalQuestions: number;
  toBeAttempted: number;
  description?: string;
  // Backend returns array, but submission format uses Record
  questions: IQuestion[] | Record<string, IQuestion>;
}

export interface ISection {
  id: string;
  name: string;
  subject: string;
  subSections: ISubSection[];
}

export interface ITest {
  id: string;
  name: string;
  description?: string;
  duration?: number; // Legacy field
  durationInMinutes?: number; // Backend field name
  sections: ISection[];
  exam?: string;
  status: string;
  validity: {
    from: string;
    to: string;
  };
  createdAt: string;
  modifiedAt: string;
}

export interface ITestStatus {
  notVisited: string[];
  notAnswered: string[];
  answered: string[];
  markedForReview: string[];
  answeredAndMarkedForReview: string[];
}

// Instruction Types
export interface InstructionContent {
  en: string | React.ReactNode;
  hi?: string | React.ReactNode;
}

export interface InstructionType {
  type: "text" | "rich";
  content: InstructionContent;
  children?: InstructionType[];
}
