"use client";

import { create } from "zustand";
import { ITest, IQuestionWithStatus, ITestStatus, QuestionStatus } from "@/types";
import { api, auth } from "@/lib/api";

// Attempt info from backend
export interface ITestAttempt {
  startedAt: string;
  expiresAt: string;
  remainingTimeInSeconds: number;
  durationInMinutes: number;
}

interface TestState {
  serverFullscreenExits: number;
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
  saveProgress: (options?: { keepalive?: boolean }) => Promise<void>;
  submitTest: (userId: string, userType: string, instituteId?: string, options?: { isAutoSubmitted?: boolean }) => Promise<void>;
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
        const rawQ = q as unknown as Record<string, unknown>;
        const questionId = (rawQ.id || rawQ._id || `Q_${section.id}_${subSection.id}_${questionIndex}`) as string;
        questionIndex++;

        questions.push({
          ...q,
          id: questionId,
          sectionId: section.id,
          subSectionId: subSection.id,
          type: subSection.type,
          // Section info for display
          sectionName: section.name,
          sectionSubject: section.subject,
          subSectionName: subSection.name,
          subSectionDescription: (subSection as { description?: string }).description,
          // toBeAttempted limit
          toBeAttempted: subSection.toBeAttempted,
          totalQuestionsInSubSection: subSection.totalQuestions || questionsArray.length,
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
  serverFullscreenExits: 0,

  fetchTest: async (testId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.tests.getForStudent(testId);
      // Backend returns { success: true, data: test, attempt: {...} }, axios wraps in { data: ... }
      const responseData = response.data;
      const test = responseData?.data || responseData;
      const attempt = responseData?.attempt || null;
      const progress = (responseData?.progress || null) as Array<{
        id: string;
        subSections?: Array<{ id: string; questions?: Record<string, { selectedOptions?: string[]; enteredAnswer?: number; timeTakenInSeconds?: number; status?: string }> }>;
      }> | null;

      if (test) {
        const questions = flattenQuestions(test);

        // Resume: apply the student's last saved answers (refresh, crash, new device)
        if (progress) {
          const saved = new Map<string, { selectedOptions?: string[]; enteredAnswer?: number; timeTakenInSeconds?: number; status?: string }>();
          for (const sec of progress) for (const ss of sec.subSections || []) for (const [qid, r] of Object.entries(ss.questions || {})) saved.set(qid, r);
          for (const q of questions) {
            const r = saved.get(q.id);
            if (!r) continue;
            if (Array.isArray(r.selectedOptions)) q.selectedOptions = r.selectedOptions;
            if (r.enteredAnswer !== undefined && r.enteredAnswer !== null) q.enteredAnswer = String(r.enteredAnswer);
            if (typeof r.timeTakenInSeconds === "number") q.status.timeTakenInSeconds = r.timeTakenInSeconds;
            if (r.status) q.status.status = r.status as QuestionStatus;
          }
        }

        // Land on the first question not answered yet, and mark it visited
        let current = questions.findIndex((q) => q.status.status === "notVisited" || q.status.status === "notAnswered");
        if (current < 0) current = 0;
        if (questions[current] && questions[current].status.status === "notVisited") {
          questions[current].status.status = "notAnswered";
          questions[current].status.visitedAt = new Date().toISOString();
        }
        const ids = (st: string) => questions.filter((q) => q.status.status === st).map((q) => q.id);

        set({
          test,
          questions,
          currentQuestion: current,
          status: {
            notVisited: ids("notVisited"),
            notAnswered: ids("notAnswered"),
            answered: ids("answered"),
            markedForReview: ids("markedForReview"),
            answeredAndMarkedForReview: ids("answeredAndMarkedForReview"),
          },
          attempt,
          serverFullscreenExits: Number(responseData?.fullscreenExits) || 0,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch test:", error);
      const serverMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      set({ error: serverMessage || "Failed to load test", isLoading: false });
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

  saveProgress: async (options?: { keepalive?: boolean }) => {
    const { test, questions } = get();
    if (!test) return;

    const testId = (test as { id?: string; _id?: string }).id ||
                   (test as { id?: string; _id?: string })._id;
    if (!testId) return;

    // Reconstruct sections with current answers
    const sections = test.sections.map((section) => ({
      id: section.id,
      subSections: section.subSections.map((subSection) => {
        const questionsRecord: Record<string, {
          selectedOptions?: string[];
          enteredAnswer?: number;
          timeTakenInSeconds?: number;
          status?: string;
        }> = {};

        questions
          .filter((q) => q.sectionId === section.id && q.subSectionId === subSection.id)
          .forEach((q) => {
            questionsRecord[q.id] = {
              selectedOptions: q.selectedOptions,
              enteredAnswer: q.enteredAnswer !== undefined && q.enteredAnswer !== "" ? parseFloat(q.enteredAnswer) : undefined,
              timeTakenInSeconds: q.status.timeTakenInSeconds,
              status: q.status.status,
            };
          });

        return {
          id: subSection.id,
          questions: questionsRecord,
        };
      }),
    }));

    const fullscreenExits = Math.max(0, parseInt((typeof window !== "undefined" && localStorage.getItem(`IITP_FULLSCREEN_EXITS_${testId}`)) || "0", 10) || 0);
    try {
      if (options?.keepalive) {
        // Page is unloading: a keepalive fetch is allowed to finish after the page is gone
        const token = auth.getToken();
        await fetch(`${process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000"}/tests/test/save-progress`, {
          method: "POST",
          keepalive: true,
          headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ testId, sections, fullscreenExits }),
        });
      } else {
        await api.tests.saveProgress({ testId, sections, fullscreenExits });
      }
    } catch (error) {
      // Silent fail - auto-save should not interrupt user
      console.warn("Failed to save progress:", error);
    }
  },

  submitTest: async (_userId: string, _userType: string, _instituteId?: string, options?: { isAutoSubmitted?: boolean }) => {
    const { test, questions } = get();
    if (!test) throw new Error("No test loaded");

    // Get testId from test object - handle both 'id' and '_id' formats
    const testId = (test as { id?: string; _id?: string }).id ||
                   (test as { id?: string; _id?: string })._id;
    if (!testId) throw new Error("Test ID not found");

    // Reconstruct sections with question responses in the format expected by backend
    const sections = test.sections.map((section) => ({
      id: section.id,
      subSections: section.subSections.map((subSection) => {
        // Build questions object with responses
        const questionsRecord: Record<string, {
          selectedOptions?: string[];
          enteredAnswer?: number;
          timeTakenInSeconds?: number;
          status?: string;
        }> = {};

        questions
          .filter((q) => q.sectionId === section.id && q.subSectionId === subSection.id)
          .forEach((q) => {
            questionsRecord[q.id] = {
              selectedOptions: q.selectedOptions,
              enteredAnswer: q.enteredAnswer !== undefined && q.enteredAnswer !== "" ? parseFloat(q.enteredAnswer) : undefined,
              timeTakenInSeconds: q.status.timeTakenInSeconds,
              status: q.status.status,
            };
          });

        return {
          id: subSection.id,
          questions: questionsRecord,
        };
      }),
    }));

    try {
      const response = await api.tests.submit({ testId, sections, isAutoSubmitted: options?.isAutoSubmitted === true });

      const outcome = response.data?.data || {};
      const totalMarks = outcome.totalMarks ?? 0;
      localStorage.setItem("IITP_TEST_SUBMITTED_KEY", "true");
      // What the result screen shows: score only when the test's publish setting allows it now
      localStorage.setItem(
        "result",
        JSON.stringify({
          testId,
          totalMarks: outcome.totalMarks,
          resultVisible: outcome.resultVisible !== false,
          resultReason: outcome.resultReason,
          resultAvailableAt: outcome.resultAvailableAt,
        })
      );

      set({ isSubmitted: true, totalMarks });
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError?.response?.data?.message ||
        (error instanceof Error ? error.message : "Failed to submit test");
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
