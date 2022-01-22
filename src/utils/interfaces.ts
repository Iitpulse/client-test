export interface IStatus {
  status: string;
  visitedAt: string | null;
  answeredAt: string | null;
  answeredAndMarkedForReviewAt: string | null;
  markedForReviewAt: string | null;
}

export interface IOption {
  id: string | number;
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
  status: "ongoing" | "active" | "inactive" | "expired";
  validity: IValidity;
  attemptedBy: {
    studentsCount: number;
    locations: [string];
  };
  result: IResult;
  createdBy: ICreatedByUser;
  createdAt: Date;
  modifiedAt: Date;
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
  type: "single";
  totalQuestions: number;
  toBeAttempted: number;
  questions: [];
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
