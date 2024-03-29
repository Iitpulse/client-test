export interface IStatus {
  status: string;
  timeTakenInSeconds: number;
}

export interface IOption {
  id: string;
  value: string;
}

interface IValidity {
  from: string;
  to: string;
}

interface ICreatedByUser {
  id: string;
  name: string;
  userType: string;
}

export interface ITest {
  id: string; //TT_AB123
  name: string;
  description: string;
  sections: Array<ISection>;
  exam: string;
  status: string; // "ongoing" | "active" | "inactive" | "expired";
  validity: IValidity;
  createdAt: string;
  modifiedAt: string;
}

export interface ISection {
  id: string; // PT_SE_PHY123
  name: string;
  exam: string;
  subject: string;
  subSections: Array<ISubSection>; // Nesting toBeAttempted
  totalQuestions: number;
  toBeAttempted: number;
}

export interface ISubSection {
  id: string; // PT_SS_MCQ123
  name: string;
  description?: string; // (optional) this will be used as a placeholder for describing the subsection and will be replaced by the actual description later on
  type: string;
  totalQuestions: number;
  toBeAttempted: number;
  questions: Array<IQuestionObjective>;
}

interface IStudentResult {
  name: string;
  id: string;
  marks: number;
}

export interface IResult {
  maxMarks: number;
  averageMarks: number;
  averageCompletionTime: number; // minutes
  students: Array<IStudentResult>;
}

interface IMarkingScheme {
  correct: Array<number>; // index-wise marks (index+1 = no. of correct options)
  incorrect: number; // -1
}

interface IQuestionCore {
  id: string; // QT_MCQ123
  en: {
    question: string;
    solution: string;
  };
  hi: {
    question: string;
    solution: string;
  };
  markingScheme: IMarkingScheme;
  type: string;
}

export interface IQuestionObjective extends IQuestionCore {
  id: string; // QT_MCQ123
  en: {
    question: string;
    options: Array<IOption>;
    solution: string;
  };
  hi: {
    question: string;
    options: Array<IOption>;
    solution: string;
  };
  markingScheme: IMarkingScheme;
  selectedOptions: Array<string>;
  type: "single" | "multiple";
}

export interface IQuestionInteger {
  id: string; // QT_MCQ123
  en: {
    question: string;
    solution: string;
  };
  hi: {
    question: string;
    solution: string;
  };
  userAnswer: number;
  type: "integer";
}

export interface IQuestionWithID extends IQuestionCore {
  sectionId: string;
  subSectionId: string;
  status: IStatus;
}

export interface ITestStatus {
  notVisited: Array<string>;
  notAnswered: Array<string>;
  answered: Array<string>;
  markedForReview: Array<string>;
  answeredAndMarkedForReview: Array<string>;
}

export interface ICurrentUser {
  id: string;
  email: string;
  userType: string;
  instituteId: string;
}

export interface IAuthContext {
  currentUser: ICurrentUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<ICurrentUser | null>>;
  keyRequiredForTest: boolean;
  setKeyRequiredForTest: React.Dispatch<React.SetStateAction<boolean>>;
}

type ContentType = {
  en: string | React.ReactNode;
  hi?: string | React.ReactNode;
};

export interface InstructionType {
  type: "text" | "rich";
  children?: Array<InstructionType>;
  content: ContentType | any;
}
