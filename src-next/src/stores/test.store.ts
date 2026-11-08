"use client";

import { create } from "zustand";
import { ITest, IQuestionWithStatus, ITestStatus, QuestionStatus, IAnswerEntry, MatrixAnswer } from "@/types";
import { api, auth } from "@/lib/api";
import {
  acknowledgeAnswerLog,
  acknowledgeFullscreenEvents,
  answerValue,
  clearExamLog,
  logAnswerEntry,
  pendingAnswerLog,
  pendingFullscreenEvents,
} from "@/lib/exam-log";
import { parseExamTemplate } from "@/lib/exam-template";
import { clearRoughSheets } from "@/lib/rough-sheet";
import { PENDING_SUBMIT_KEY, type PendingSubmit } from "@/lib/submit-handoff";
import { errorCode, gateUrl, REENTRY_CODES, sittingFields } from "@/lib/reentry";
import { fetchPreviewStart, previewActive } from "@/lib/exam-preview";
import type { StudentExamTemplate } from "@/types/m6";

// Attempt info from backend
export interface ITestAttempt {
  startedAt: string;
  expiresAt: string;
  remainingTimeInSeconds: number;
  durationInMinutes: number;
  /** M6: extra time given by staff (save-progress answers the new expiry) */
  extraMinutes?: number;
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
  /** M6: the test's exam template (wording, instructions, tools); null = the frozen NTA screen */
  template: StudentExamTemplate | null;

  // Actions
  fetchTest: (testId: string) => Promise<void>;
  setCurrentQuestion: (index: number) => void;
  goToQuestion: (index: number, timeTaken?: number) => void;
  nextQuestion: (timeTaken?: number) => void;
  previousQuestion: (timeTaken?: number) => void;
  selectOption: (optionId: string) => void;
  setIntegerAnswer: (answer: string) => void;
  /** M6 matrix grid: tick or untick one cell (row of List I, column of List II) */
  toggleMatrixCell: (rowId: string, columnId: string) => void;
  clearSelection: () => void;
  saveAndNext: (timeTaken?: number) => void;
  markForReview: (timeTaken?: number) => void;
  saveAndMarkForReview: (timeTaken?: number) => void;
  saveProgress: (options?: { keepalive?: boolean }) => Promise<void>;
  submitTest: (userId: string, userType: string, instituteId?: string, options?: SubmitOptions) => Promise<void>;
  updateTimeTaken: (questionId: string, time: number) => void;
  reset: () => void;
}

/** isAutoSubmitted + why (M6 autoSubmitReason: the timer reached 0, or the fullscreen exit limit) */
export interface SubmitOptions {
  isAutoSubmitted?: boolean;
  autoSubmitReason?: "timeUp" | "exitLimit";
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
          // M6: the question's own type wins (paragraph sets of mixed children, matrix)
          type: (q as { type?: IQuestionWithStatus["type"] }).type ?? subSection.type,
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
          matrixAnswer: {},
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

const testIdOf = (test: ITest | null) => (test ? (test as { id?: string; _id?: string }).id || (test as { id?: string; _id?: string })._id || null : null);

/** Has the student given an answer (matrix: any row ticked) */
function hasAnswerOf(q: IQuestionWithStatus): boolean {
  if (q.type === "matrix") return Object.values(q.matrixAnswer ?? {}).some((cols) => cols.length > 0);
  if (q.type === "integer") return !!q.enteredAnswer && q.enteredAnswer.length > 0;
  return q.selectedOptions.length > 0;
}

/** The answers in the save-progress / submit shape: sections[].subSections[].questions[questionId] */
function answerSections(test: ITest, questions: IQuestionWithStatus[]) {
  return test.sections.map((section) => ({
    id: section.id,
    subSections: section.subSections.map((subSection) => {
      const questionsRecord: Record<string, IAnswerEntry> = {};
      questions
        .filter((q) => q.sectionId === section.id && q.subSectionId === subSection.id)
        .forEach((q) => {
          const entry: IAnswerEntry = {
            selectedOptions: q.type === "matrix" ? [] : q.selectedOptions,
            enteredAnswer: q.enteredAnswer !== undefined && q.enteredAnswer !== "" ? parseFloat(q.enteredAnswer) : undefined,
            timeTakenInSeconds: q.status.timeTakenInSeconds,
            status: q.status.status,
          };
          if (q.type === "matrix") entry.matrix = q.matrixAnswer ?? {};
          questionsRecord[q.id] = entry;
        });
      return { id: subSection.id, questions: questionsRecord };
    }),
  }));
}

const initialStatus: ITestStatus = {
  notVisited: [],
  notAnswered: [],
  answered: [],
  markedForReview: [],
  answeredAndMarkedForReview: [],
};

// Re-entry (api-tests docs/reentry-api.md): the server refused this tab's write (the test moved to another device or
// tab, the student signed out, or staff must let them back in). Nothing more is saved from here: the gate says why.
let leftForGate: string | null = null;
function toGate(testId: string, code: string | null) {
  if (leftForGate === testId || typeof window === "undefined") return;
  leftForGate = testId;
  window.location.assign(gateUrl(testId, code === "SITTING_CLOSED"));
}

// The submit running now and the last test submitted from this page (see submitTest)
let submitInFlight: { testId: string; promise: Promise<void> } | null = null;
let submittedTestId: string | null = null;

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
  template: null,
  serverFullscreenExits: 0,

  fetchTest: async (testId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Backend returns { success: true, data: test, attempt: {...} }, axios wraps in { data: ... }.
      // "Preview as student" (batch 7) reads the staff preview route instead, mapped to the same shape.
      const responseData = previewActive() ? await fetchPreviewStart(testId) : (await api.tests.getForStudent(testId)).data;
      const test = responseData?.data || responseData;
      const attempt = responseData?.attempt || null;
      const progress = (responseData?.progress || null) as Array<{
        id: string;
        subSections?: Array<{ id: string; questions?: Record<string, IAnswerEntry> }>;
      }> | null;

      if (test) {
        const questions = flattenQuestions(test);

        // Resume: apply the student's last saved answers (refresh, crash, new device)
        if (progress) {
          const saved = new Map<string, IAnswerEntry>();
          for (const sec of progress) for (const ss of sec.subSections || []) for (const [qid, r] of Object.entries(ss.questions || {})) saved.set(qid, r);
          for (const q of questions) {
            const r = saved.get(q.id);
            if (!r) continue;
            if (Array.isArray(r.selectedOptions)) q.selectedOptions = r.selectedOptions;
            if (r.enteredAnswer !== undefined && r.enteredAnswer !== null) q.enteredAnswer = String(r.enteredAnswer);
            if (r.matrix && typeof r.matrix === "object") q.matrixAnswer = r.matrix as MatrixAnswer;
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
        if (questions[current]) logAnswerEntry(testIdOf(test), { questionId: questions[current].id, kind: "visit" });
        const ids = (st: string) => questions.filter((q) => q.status.status === st).map((q) => q.id);

        set({
          // The API sends durationInMinutes; the frozen NTA instructions read the legacy `duration` (else 180).
          test: { ...test, duration: test.duration ?? test.durationInMinutes },
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
          template: parseExamTemplate(responseData?.template),
          serverFullscreenExits: Number(responseData?.fullscreenExits) || 0,
          isLoading: false,
        });
      }
    } catch (error) {
      // re-entry: coming back needs staff (or the test moved on): the gate shows the waiting page
      const code = errorCode(error);
      if (code && REENTRY_CODES.has(code)) {
        set({ isLoading: false });
        toGate(testId, code);
        return;
      }
      console.error("Failed to fetch test:", error);
      const serverMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      set({ error: serverMessage || "Failed to load test", isLoading: false });
    }
  },

  setCurrentQuestion: (index: number) => {
    const { questions, currentQuestion, test } = get();
    if (index !== currentQuestion && questions[index]) logAnswerEntry(testIdOf(test), { questionId: questions[index].id, kind: "visit" });
    set({ currentQuestion: index });
  },

  goToQuestion: (index: number, timeTaken = 0) => {
    const { questions, status, currentQuestion, test } = get();
    if (index < 0 || index >= questions.length) return;

    const targetQuestion = questions[index];
    if (index !== currentQuestion) logAnswerEntry(testIdOf(test), { questionId: targetQuestion.id, kind: "visit" });
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
    logAnswerEntry(testIdOf(get().test), { questionId: question.id, kind: "answer", value: answerValue(updatedQuestions[currentQuestion]) });

    set({ questions: updatedQuestions });
  },

  setIntegerAnswer: (answer: string) => {
    const { questions, currentQuestion } = get();
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion] = {
      ...updatedQuestions[currentQuestion],
      enteredAnswer: answer,
    };
    if (updatedQuestions[currentQuestion]) {
      logAnswerEntry(testIdOf(get().test), { questionId: updatedQuestions[currentQuestion].id, kind: "answer", value: answerValue(updatedQuestions[currentQuestion]) });
    }
    set({ questions: updatedQuestions });
  },

  toggleMatrixCell: (rowId: string, columnId: string) => {
    const { questions, currentQuestion, test } = get();
    const question = questions[currentQuestion];
    if (!question || question.type !== "matrix") return;
    const current = question.matrixAnswer ?? {};
    const row = current[rowId] ?? [];
    const nextRow = row.includes(columnId) ? row.filter((c) => c !== columnId) : [...row, columnId];
    const matrixAnswer: MatrixAnswer = { ...current };
    if (nextRow.length) matrixAnswer[rowId] = nextRow;
    else delete matrixAnswer[rowId];
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion] = { ...question, matrixAnswer };
    logAnswerEntry(testIdOf(test), { questionId: question.id, kind: "answer", value: answerValue(updatedQuestions[currentQuestion]) });
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
      matrixAnswer: {},
      status: {
        ...question.status,
        status: "notAnswered",
      },
    };
    logAnswerEntry(testIdOf(get().test), { questionId: question.id, kind: "clear" });

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
    const hasAnswer = hasAnswerOf(question);

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
    logAnswerEntry(testIdOf(get().test), { questionId: question.id, kind: "markReview" });

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

    const hasAnswer = hasAnswerOf(question);

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
    logAnswerEntry(testIdOf(get().test), { questionId: question.id, kind: "markReview" });

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
    const { test, questions, isSubmitted } = get();
    if (previewActive()) return; // "Preview as student": nothing is saved
    // Nothing to save once submitted. /result is in the other root layout, so leaving /test after a
    // submit is a full page load: pending autosave timers and beforeunload can still fire meanwhile.
    if (!test || isSubmitted) return;

    const testId = testIdOf(test);
    if (!testId) return;
    // A submit is on its way (or done): the server would refuse the save (409), and the submit carries the answers
    if (submitInFlight?.testId === testId || submittedTestId === testId) return;
    if (leftForGate === testId) return;

    const sections = answerSections(test, questions);

    let fullscreenExits = 0;
    try {
      fullscreenExits = Math.max(0, parseInt(localStorage.getItem(`IITP_FULLSCREEN_EXITS_${testId}`) || "0", 10) || 0);
    } catch {
      // storage blocked: the server keeps the last count it had
    }
    // M6: fullscreen exits with durations and the answer history since the last acknowledged save
    const events = pendingFullscreenEvents(testId);
    const answerLog = pendingAnswerLog(testId);
    const body = { testId, sections, fullscreenExits, events, answerLog, ...sittingFields(testId) };
    try {
      if (options?.keepalive) {
        // Page is unloading: a keepalive fetch is allowed to finish after the page is gone
        const token = auth.getToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000"}/tests/test/save-progress`, {
          method: "POST",
          keepalive: true,
          headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          acknowledgeFullscreenEvents(testId, events);
          acknowledgeAnswerLog(testId, answerLog);
        } else if (res.status === 409) {
          const code = ((await res.json().catch(() => null)) as { code?: string } | null)?.code ?? null;
          if (code && REENTRY_CODES.has(code)) leftForGate = testId;
        }
      } else {
        const response = await api.tests.saveProgress(body);
        acknowledgeFullscreenEvents(testId, events);
        acknowledgeAnswerLog(testId, answerLog);
        // M6 extra time: the answer carries the student's own expiry; the /test timer follows attempt.expiresAt
        const payload = response?.data as { attempt?: { expiresAt?: string; extraMinutes?: number }; data?: { attempt?: { expiresAt?: string; extraMinutes?: number } } } | undefined;
        const next = payload?.attempt ?? payload?.data?.attempt;
        const current = get().attempt;
        if (current && next?.expiresAt && !Number.isNaN(Date.parse(next.expiresAt)) && Date.parse(next.expiresAt) !== Date.parse(current.expiresAt)) {
          set({ attempt: { ...current, expiresAt: next.expiresAt, ...(typeof next.extraMinutes === "number" ? { extraMinutes: next.extraMinutes } : {}) } });
        }
      }
    } catch (error) {
      const code = errorCode(error);
      if (code && REENTRY_CODES.has(code)) return toGate(testId, code);
      // Silent fail - auto-save should not interrupt user
      console.warn("Failed to save progress:", error);
    }
  },

  submitTest: async (_userId: string, _userType: string, _instituteId?: string, options?: SubmitOptions) => {
    // M6 submit rules: the device's clock when Submit was pressed (or the timer hit 0); the server records it when it is
    // not after the deadline
    if (previewActive()) throw new Error("Submitting is turned off in preview.");
    const submittedAtDevice = new Date().toISOString();
    const { test, questions } = get();
    if (!test) throw new Error("No test loaded");

    const testId = testIdOf(test);
    if (!testId) throw new Error("Test ID not found");

    // One submit per test: the exam timer keeps ticking at 00:00:00 and can ask again while the first request is
    // still out (a slow network answered the second one "already submitted"). A repeat joins the running submit,
    // or resolves at once when this test was already submitted from this page.
    if (submittedTestId === testId) return;
    if (submitInFlight?.testId === testId) return submitInFlight.promise;
    const promise = (async () => {
      const sections = answerSections(test, questions);

      // Integrity (M5): the fullscreen-exit count since the last autosave goes with the submit; the server keeps the
      // higher of this and the saved one on the submission
      let fullscreenExits = 0;
      try {
        fullscreenExits = Math.min(1000, Math.max(0, parseInt(localStorage.getItem(`IITP_FULLSCREEN_EXITS_${testId}`) || "0", 10) || 0));
      } catch {
        // storage blocked: the server still has the last saved count
      }
      // M6: the answer history not yet acknowledged (the server grades the last value logged before the deadline) and
      // the fullscreen events not yet sent
      const answerLog = pendingAnswerLog(testId);
      const events = pendingFullscreenEvents(testId);
      const isAutoSubmitted = options?.isAutoSubmitted === true;
      const autoSubmitReason = isAutoSubmitted ? (options?.autoSubmitReason ?? "timeUp") : undefined;
      const submitBody = { testId, sections, isAutoSubmitted, ...(autoSubmitReason ? { autoSubmitReason } : {}), fullscreenExits, submittedAtDevice, answerLog, events, ...sittingFields(testId) };

      try {
        const response = await api.tests.submit(submitBody);

        const outcome = response.data?.data || {};
        const totalMarks = outcome.totalMarks ?? 0;
        clearExamLog(testId);
        // The rough sheet stays on this device for this attempt only: cleared on submit
        clearRoughSheets(testId);
        try {
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
              // why the exam submitted by itself (the server's answer; this device's trigger as a fallback)
              autoSubmitted: outcome.autoSubmitted ?? (autoSubmitReason ? { reason: autoSubmitReason } : null),
            })
          );
        } catch {
          // storage blocked: the result page falls back to the API
        }

        set({ isSubmitted: true, totalMarks });
        submittedTestId = testId;
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        const status = axiosError?.response?.status;
        // re-entry: this tab no longer holds the test (moved, signed out): the gate says where it went
        const refused = errorCode(error);
        if (status === 409 && refused && REENTRY_CODES.has(refused)) {
          toGate(testId, refused);
          // the gate is loading: never resolve, so the page neither opens /result nor shows an error meanwhile
          return new Promise<never>(() => {});
        }
        // Offline or a server failure: hand the exact submit to /result (lib/submit-handoff.ts), which sends it, retries
        // and shows "Your answers are safe on this device" / "We couldn't submit yet". The server's submit rules keep a
        // late arrival fair (submittedAtDevice). A refusal (4xx) is not retried: the page shows its message.
        if (status === undefined || status >= 500) {
          const answered = questions.filter((q) => q.status.status === "answered" || q.status.status === "answeredAndMarkedForReview").length;
          const pending: PendingSubmit & { autoSubmitReason?: "timeUp" | "exitLimit" } = {
            testId,
            testName: test.name ?? "",
            answered,
            total: questions.length,
            submittedAtDevice,
            body: submitBody,
            ...(autoSubmitReason ? { autoSubmitReason } : {}),
          };
          let handedOff = false;
          try {
            localStorage.setItem(PENDING_SUBMIT_KEY, JSON.stringify(pending));
            // a reload of /test goes on to /result, which sends the hand-off
            localStorage.setItem("IITP_TEST_SUBMITTED_KEY", "true");
            handedOff = true;
          } catch {
            // storage blocked: nothing can wait on this device, so the page shows the error and Submit stays available
          }
          if (handedOff) {
            clearExamLog(testId);
            clearRoughSheets(testId);
            set({ isSubmitted: true });
            submittedTestId = testId;
            return; // the page opens /result as after a submit
          }
        }
        const message = axiosError?.response?.data?.message ||
          (error instanceof Error ? error.message : "Failed to submit test");
        throw new Error(message);
      }
    })();
    submitInFlight = { testId, promise };
    try {
      await promise;
    } finally {
      if (submitInFlight?.promise === promise) submitInFlight = null;
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
      template: null,
    });
  },
}));
