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

export interface IQuestion {
  id: string;
  type: "single" | "multiple" | "integer";
  en: IQuestionContent;
  hi?: IQuestionContent;
  sectionId: string;
  subSectionId: string;
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
}

export interface ISubSection {
  id: string;
  name: string;
  type: "single" | "multiple" | "integer";
  totalQuestions: number;
  toBeAttempted: number;
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
