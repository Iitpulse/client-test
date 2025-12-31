"use client";

import { create } from "zustand";
import { ITest, IQuestionWithStatus, ITestStatus, QuestionStatus } from "@/types";
import { api } from "@/lib/api";

// Attempt info from backend
export interface ITestAttempt {
  startedAt: string;
  expiresAt: string;
  remainingTimeInSeconds: number;
  durationInMinutes: number;
}

interface TestState {
  test: ITest | null;
  questions: IQuestionWithStatus[];
  currentQuestion: number;
  status: ITestStatus;
  isLoading: boolean;
  error: string | null;
  isSubmitted: boolean;
  totalMarks: number | null;
  attempt: ITestAttempt | null;

  // Actions
  fetchTest: (testId: string) => Promise<void>;
  setCurrentQuestion: (index: number) => void;
  goToQuestion: (index: number, timeTaken?: number) => void;
  nextQuestion: (timeTaken?: number) => void;
  previousQuestion: (timeTaken?: number) => void;
  selectOption: (optionId: string) => void;
  setIntegerAnswer: (answer: string) => void;
  clearSelection: () => void;
  saveAndNext: (timeTaken?: number) => void;
  markForReview: (timeTaken?: number) => void;
  saveAndMarkForReview: (timeTaken?: number) => void;
  submitTest: (userId: string, userType: string, instituteId?: string) => Promise<void>;
  updateTimeTaken: (questionId: string, time: number) => void;
  reset: () => void;
}

// Helper to flatten questions from test structure
function flattenQuestions(test: ITest): IQuestionWithStatus[] {
  const questions: IQuestionWithStatus[] = [];

  // Safely handle undefined or empty sections
  if (!test.sections || !Array.isArray(test.sections)) {
    console.warn("Test has no sections or sections is not an array");
    return questions;
  }

  let questionIndex = 0;
  test.sections.forEach((section) => {
    if (!section.subSections || !Array.isArray(section.subSections)) {
      return;
    }

    section.subSections.forEach((subSection) => {
      // Handle both array format (from backend) and Record format
      const questionsArray = Array.isArray(subSection.questions)
        ? subSection.questions
        : Object.values(subSection.questions || {});

      questionsArray.forEach((q) => {
        // Handle both 'id' and '_id' (MongoDB style) and generate fallback if neither exists
        const rawQ = q as Record<string, unknown>;
        const questionId = (rawQ.id || rawQ._id || `Q_${section.id}_${subSection.id}_${questionIndex}`) as string;
        questionIndex++;

        questions.push({
          ...q,
          id: questionId,
          sectionId: section.id,
          subSectionId: subSection.id,
          type: subSection.type,
          status: {
            status: "notVisited",
            timeTakenInSeconds: 0,
          },
          selectedOptions: [],
          enteredAnswer: "",
        });
      });
    });
  });

  return questions;
}

// Helper to get unique values
function uniqueValues<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

const initialStatus: ITestStatus = {
  notVisited: [],
  notAnswered: [],
  answered: [],
  markedForReview: [],
  answeredAndMarkedForReview: [],
};

export const useTestStore = create<TestState>((set, get) => ({
  test: null,
  questions: [],
  currentQuestion: 0,
  status: initialStatus,
  isLoading: false,
  error: null,
  isSubmitted: false,
  totalMarks: null,
  attempt: null,

  fetchTest: async (testId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.tests.getForStudent(testId);
      // Backend returns { success: true, data: test, attempt: {...} }, axios wraps in { data: ... }
      const responseData = response.data;
      const test = responseData?.data || responseData;
      const attempt = responseData?.attempt || null;

      if (test) {
        const questions = flattenQuestions(test);
        // Mark first question as visited
        if (questions.length > 0) {
          questions[0].status.status = "notAnswered";
          questions[0].status.visitedAt = new Date().toISOString();
        }

        set({
          test,
          questions,
          currentQuestion: 0,
          status: {
            notVisited: questions.slice(1).map((q) => q.id),
            notAnswered: questions.length > 0 ? [questions[0].id] : [],
            answered: [],
            markedForReview: [],
            answeredAndMarkedForReview: [],
          },
          attempt,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch test:", error);
      set({ error: "Failed to load test", isLoading: false });
    }
  },

  setCurrentQuestion: (index: number) => {
    set({ currentQuestion: index });
  },

  goToQuestion: (index: number, timeTaken = 0) => {
    const { questions, status, currentQuestion } = get();
    if (index < 0 || index >= questions.length) return;

    const targetQuestion = questions[index];
    const isVisited = targetQuestion.status.status !== "notVisited";

    if (!isVisited) {
      // Mark as not answered (visited but not answered)
      const updatedQuestions = [...questions];
      updatedQuestions[index] = {
        ...targetQuestion,
        status: {
          ...targetQuestion.status,
          status: "notAnswered",
          visitedAt: new Date().toISOString(),
        },
      };

      // Update current question's time if provided
      if (timeTaken > 0 && currentQuestion !== index) {
        updatedQuestions[currentQuestion] = {
          ...updatedQuestions[currentQuestion],
          status: {
            ...updatedQuestions[currentQuestion].status,
            timeTakenInSeconds: timeTaken,
          },
        };
      }

      set({
        questions: updatedQuestions,
        currentQuestion: index,
        status: {
          ...status,
          notVisited: status.notVisited.filter((id) => id !== targetQuestion.id),
          notAnswered: uniqueValues([...status.notAnswered, targetQuestion.id]),
        },
      });
    } else {
      // Just update time and move
      if (timeTaken > 0 && currentQuestion !== index) {
        const updatedQuestions = [...questions];
        updatedQuestions[currentQuestion] = {
          ...updatedQuestions[currentQuestion],
          status: {
            ...updatedQuestions[currentQuestion].status,
            timeTakenInSeconds: timeTaken,
          },
        };
        set({ questions: updatedQuestions, currentQuestion: index });
      } else {
        set({ currentQuestion: index });
      }
    }
  },

  nextQuestion: (timeTaken = 0) => {
    const { currentQuestion, questions } = get();
    if (currentQuestion < questions.length - 1) {
      get().goToQuestion(currentQuestion + 1, timeTaken);
    }
  },

  previousQuestion: (timeTaken = 0) => {
    const { currentQuestion } = get();
    if (currentQuestion > 0) {
      get().goToQuestion(currentQuestion - 1, timeTaken);
    }
  },

  selectOption: (optionId: string) => {
    const { questions, currentQuestion } = get();
    const question = questions[currentQuestion];

    let newSelectedOptions: string[];
    if (question.type === "single") {
      // Single choice - replace selection
      newSelectedOptions = question.selectedOptions.includes(optionId) ? [] : [optionId];
    } else {
      // Multiple choice - toggle selection
      newSelectedOptions = question.selectedOptions.includes(optionId)
        ? question.selectedOptions.filter((id) => id !== optionId)
        : [...question.selectedOptions, optionId];
    }

    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion] = {
      ...question,
      selectedOptions: newSelectedOptions,
    };

    set({ questions: updatedQuestions });
  },

  setIntegerAnswer: (answer: string) => {
    const { questions, currentQuestion } = get();
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion] = {
      ...updatedQuestions[currentQuestion],
      enteredAnswer: answer,
    };
    set({ questions: updatedQuestions });
  },

  clearSelection: () => {
    const { questions, currentQuestion, status } = get();
    const question = questions[currentQuestion];

    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion] = {
      ...question,
      selectedOptions: [],
      enteredAnswer: "",
      status: {
        ...question.status,
        status: "notAnswered",
      },
    };

    set({
      questions: updatedQuestions,
      status: {
        ...status,
        notAnswered: uniqueValues([...status.notAnswered, question.id]),
        answered: status.answered.filter((id) => id !== question.id),
        answeredAndMarkedForReview: status.answeredAndMarkedForReview.filter(
          (id) => id !== question.id
        ),
        markedForReview: status.markedForReview.filter((id) => id !== question.id),
      },
    });
  },

  saveAndNext: (timeTaken = 0) => {
    const { questions, currentQuestion, status } = get();
    const question = questions[currentQuestion];

    // Check if there's an answer
    const hasAnswer =
      question.type === "integer"
        ? question.enteredAnswer && question.enteredAnswer.length > 0
        : question.selectedOptions.length > 0;

    if (!hasAnswer) return;

    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion] = {
      ...question,
      status: {
        ...question.status,
        status: "answered",
        timeTakenInSeconds: timeTaken,
      },
    };

    set({
      questions: updatedQuestions,
      status: {
        ...status,
        notAnswered: status.notAnswered.filter((id) => id !== question.id),
        answered: uniqueValues([...status.answered, question.id]),
        markedForReview: status.markedForReview.filter((id) => id !== question.id),
        answeredAndMarkedForReview: status.answeredAndMarkedForReview.filter(
          (id) => id !== question.id
        ),
      },
    });

    // Move to next question
    get().nextQuestion();
  },

  markForReview: (timeTaken = 0) => {
    const { questions, currentQuestion, status } = get();
    const question = questions[currentQuestion];

    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion] = {
      ...question,
      status: {
        ...question.status,
        status: "markedForReview",
        timeTakenInSeconds: timeTaken,
      },
    };

    set({
      questions: updatedQuestions,
      status: {
        ...status,
        notAnswered: status.notAnswered.filter((id) => id !== question.id),
        answered: status.answered.filter((id) => id !== question.id),
        markedForReview: uniqueValues([...status.markedForReview, question.id]),
      },
    });

    get().nextQuestion();
  },

  saveAndMarkForReview: (timeTaken = 0) => {
    const { questions, currentQuestion, status } = get();
    const question = questions[currentQuestion];

    const hasAnswer =
      question.type === "integer"
        ? question.enteredAnswer && question.enteredAnswer.length > 0
        : question.selectedOptions.length > 0;

    if (!hasAnswer) return;

    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion] = {
      ...question,
      status: {
        ...question.status,
        status: "answeredAndMarkedForReview",
        timeTakenInSeconds: timeTaken,
      },
    };

    set({
      questions: updatedQuestions,
      status: {
        ...status,
        notAnswered: status.notAnswered.filter((id) => id !== question.id),
        answered: status.answered.filter((id) => id !== question.id),
        markedForReview: status.markedForReview.filter((id) => id !== question.id),
        answeredAndMarkedForReview: uniqueValues([
          ...status.answeredAndMarkedForReview,
          question.id,
        ]),
      },
    });

    get().nextQuestion();
  },

  submitTest: async (userId: string, userType: string, instituteId?: string) => {
    const { test, questions } = get();
    if (!test) throw new Error("No test loaded");

    // Reconstruct test with answers
    const finalTest = {
      ...test,
      sections: test.sections.map((section) => ({
        ...section,
        subSections: section.subSections.map((subSection) => {
          const subSectionQuestions: Record<string, IQuestionWithStatus> = {};
          questions
            .filter((q) => q.sectionId === section.id && q.subSectionId === subSection.id)
            .forEach((q) => {
              subSectionQuestions[q.id] = q;
            });
          return {
            ...subSection,
            questions: subSectionQuestions,
          };
        }),
      })),
    };

    try {
      const response = await api.tests.submit({
        user: { id: userId, type: userType, instituteId },
        test: {
          id: test.id,
          sections: finalTest.sections,
          status: "submitted",
          validity: test.validity,
          createdAt: test.createdAt,
          modifiedAt: test.modifiedAt,
        },
      });

      const totalMarks = response.data?.result?.totalMarks || 0;
      localStorage.setItem("IITP_TEST_SUBMITTED_KEY", "true");
      localStorage.setItem("result", String(totalMarks));

      set({ isSubmitted: true, totalMarks });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to submit test";
      throw new Error(message);
    }
  },

  updateTimeTaken: (questionId: string, time: number) => {
    const { questions } = get();
    const updatedQuestions = questions.map((q) =>
      q.id === questionId
        ? { ...q, status: { ...q.status, timeTakenInSeconds: time } }
        : q
    );
    set({ questions: updatedQuestions });
  },

  reset: () => {
    set({
      test: null,
      questions: [],
      currentQuestion: 0,
      status: initialStatus,
      isLoading: false,
      error: null,
      isSubmitted: false,
      totalMarks: null,
      attempt: null,
    });
  },
}));
