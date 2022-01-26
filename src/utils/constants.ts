export const ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
};

const sections = ["Physics", "Chemistry", "Maths"];

export const SAMPLE_TEST = {
  id: "TT_AB123",
  name: "Sample Test",
  description: "Sample Test Description",
  sections: sections.map((sec, i) => ({
    id: "PT_SE_PHY" + i,
    name: sec,
    exam: "JEE Mains",
    subject: "Physics",
    totalQuestions: 40,
    toBeAttempted: 30,
    subSections: [
      {
        id: "PT_SS_MCQ123",
        name: "MCQ",
        description: "Sample MCQ",
        type: "single",
        totalQuestions: 40,
        toBeAttempted: 30,
        questions: Array(40)
          .fill(null)
          .map((_, idx) => ({
            id: "QT_MCQ" + idx,
            question: "What is the meaning of life? " + idx,
            options: [
              {
                id: "QO_MCQ123_A",
                value: "42",
              },
              {
                id: "QO_MCQ123_B",
                value: "The meaning of life",
              },
              {
                id: "QO_MCQ123_C",
                value: "The meaning of life is 42",
              },
              {
                id: "QO_MCQ123_D",
                value: "The meaning of life is not 42",
              },
            ],
            markingScheme: {
              correct: [4],
              incorrect: -1,
            },
            selectedOption: null,
            type: "mcq",
          })),
      },
    ],
  })),
  exam: "JEE Mains",
  status: "ongoing",
  validity: {
    from: new Date("2022-01-01").toISOString(),
    to: new Date("2022-12-31").toISOString(),
  },
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
};

export const SAMPLE_TEST_FINAL = {
  id: "TT_AB123",
  name: "Sample Test",
  description: "Sample Test Description",
  sections: sections.map((sec) => ({
    id: "PT_SE_PHY123",
    name: sec,
    exam: "JEE Mains",
    subject: "Physics",
    totalQuestions: 40,
    toBeAttempted: 30,
    subSections: [
      {
        id: "PT_SS_MCQ123",
        name: "MCQ",
        description: "Sample MCQ",
        type: "single",
        totalQuestions: 40,
        toBeAttempted: 30,
        questions: [
          {
            id: "QT_MCQ123",
            question: "What is the meaning of life?",
            options: [
              {
                id: "QO_MCQ123_A",
                value: "42",
              },
              {
                id: "QO_MCQ123_B",
                value: "The meaning of life",
              },
              {
                id: "QO_MCQ123_C",
                value: "The meaning of life is 42",
              },
              {
                id: "QO_MCQ123_D",
                value: "The meaning of life is not 42",
              },
            ],
            correctAnswer: "QO_MCQ123_B",
            marks: 1,
          },
        ],
      },
    ],
  })),
  exam: "JEE Mains",
  status: "ongoing",
  validity: {
    from: new Date("2020-01-01").toISOString(),
    to: new Date("2020-12-31").toISOString(),
  },
  attemptedBy: {
    studentsCount: 10,
    locations: ["Bangalore", "Mumbai"],
  },
  result: {
    maxMarks: 1,
    averageMarks: 0.5,
    averageCompletionTime: 30,
    students: [
      {
        name: "John",
        id: "ST_AB123",
        marks: 1,
      },
      {
        name: "Jane",
        id: "ST_AB124",
        marks: 1,
      },
      {
        name: "Jack",
        id: "ST_AB125",
        marks: 1,
      },
      {
        name: "Jill",
        id: "ST_AB126",
        marks: 1,
      },
    ],
  },
  createdBy: {
    id: "IITP_TR_AB123",
    name: "John",
    userType: ROLES.TEACHER,
  },
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
};
