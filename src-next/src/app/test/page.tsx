"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore, useTestStore } from "@/stores";
import { QuestionObjective } from "@/components/question-objective";
import { QuestionInteger } from "@/components/question-integer";
import { Legend } from "@/components/legend";
import { cn } from "@/lib/utils";
import {
  GENERAL_INSTRUCTIONS,
  NAVIGATING_INSTRUCTIONS,
  ANSWERING_INSTRUCTIONS,
  SECTION_INSTRUCTIONS,
} from "@/lib/constants";
import { RenderLatex } from "@/components/render-latex";

export default function TestPage() {
  const router = useRouter();
  const { checkAuth, isAuthenticated, currentUser, testId } = useAuthStore();
  const {
    test,
    questions,
    currentQuestion,
    status,
    isLoading,
    fetchTest,
    selectOption,
    setIntegerAnswer,
    clearSelection,
    saveAndNext,
    markForReview,
    saveAndMarkForReview,
    saveProgress,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    submitTest,
    attempt,
  } = useTestStore();

  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [questionPaperModal, setQuestionPaperModal] = useState(false);
  const [instructionsModal, setInstructionsModal] = useState(false);
  const [exitFullscreenModal, setExitFullscreenModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });
  const [timer, setTimer] = useState<{ hours: string; minutes: string; seconds: string }>({
    hours: "00",
    minutes: "00",
    seconds: "00",
  });
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);

  const timeTakenRef = useRef<Record<string, number>>({});
  const timerEndTimeRef = useRef<number | null>(null);
  const autoSubmitTriggeredRef = useRef(false);

  // Get fullscreen policy from test
  const fullscreenPolicy = (test as { fullscreenPolicy?: { enabled: boolean; maxExits: number; action: "warn" | "submit" } })?.fullscreenPolicy || {
    enabled: false,
    maxExits: 3,
    action: "warn" as const,
  };

  // Auto-submit when max exits reached with submit action
  useEffect(() => {
    if (
      fullscreenPolicy.enabled &&
      fullscreenPolicy.action === "submit" &&
      fullscreenExitCount >= fullscreenPolicy.maxExits &&
      currentUser &&
      testId &&
      !isSubmitting
    ) {
      // Auto-submit after max exits
      setIsSubmitting(true);
      (async () => {
        try {
          await submitTest(currentUser.id, currentUser.userType, currentUser.instituteId);
          localStorage.removeItem(`IITP_TEST_END_TIME_${testId}`);
          localStorage.removeItem(`IITP_FULLSCREEN_EXITS_${testId}`);
          localStorage.setItem("IITP_TEST_SUBMITTED_KEY", "true");
          router.push("/result");
        } catch (error) {
          console.error("Auto-submit on max exits failed:", error);
          setIsSubmitting(false);
        }
      })();
    }
  }, [fullscreenPolicy, fullscreenExitCount, currentUser, testId, isSubmitting, submitTest, router]);

  // Check if test was already submitted
  useEffect(() => {
    const isSubmitted = localStorage.getItem("IITP_TEST_SUBMITTED_KEY") === "true";
    if (isSubmitted) {
      router.push("/result");
    }
  }, [router]);

  // Auth check and load test
  useEffect(() => {
    if (!checkAuth() || !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (testId && !test) {
      fetchTest(testId);
    }
  }, [checkAuth, isAuthenticated, testId, test, fetchTest, router]);

  // Initialize time tracking
  useEffect(() => {
    if (questions.length > 0) {
      questions.forEach((q) => {
        if (timeTakenRef.current[q.id] === undefined) {
          timeTakenRef.current[q.id] = q.status.timeTakenInSeconds;
        }
      });
    }
  }, [questions]);

  // Timer countdown effect - uses server-provided expiresAt for accuracy
  useEffect(() => {
    // Use server-provided attempt info if available (preferred)
    // Falls back to localStorage for backwards compatibility
    let endTime: number;

    // Debug: Log attempt info
    console.log("[Timer] Attempt data:", attempt);
    console.log("[Timer] Test duration:", test?.durationInMinutes || test?.duration);

    if (attempt?.expiresAt) {
      // Server-provided expiry time - most accurate and secure
      console.log("[Timer] Using server-provided expiresAt:", attempt.expiresAt);
      endTime = new Date(attempt.expiresAt).getTime();
    } else {
      // Fallback: use test duration from test object
      const testDuration = test?.durationInMinutes || test?.duration;
      if (!testDuration) {
        console.warn("No test duration or attempt info found");
        return;
      }

      // Check localStorage as last resort (for backwards compatibility)
      const storageKey = `IITP_TEST_END_TIME_${testId}`;
      const storedEndTime = localStorage.getItem(storageKey);

      if (storedEndTime) {
        endTime = parseInt(storedEndTime, 10);
        // Validate stored time
        const maxPastTime = Date.now() - testDuration * 60 * 1000;
        if (endTime < maxPastTime) {
          endTime = Date.now() + testDuration * 60 * 1000;
          localStorage.setItem(storageKey, endTime.toString());
        }
      } else {
        endTime = Date.now() + testDuration * 60 * 1000;
        localStorage.setItem(storageKey, endTime.toString());
      }
    }

    timerEndTimeRef.current = endTime;

    const updateTimer = () => {
      const now = Date.now();
      const distance = (timerEndTimeRef.current || endTime) - now;

      if (distance <= 0) {
        setTimer({ hours: "00", minutes: "00", seconds: "00" });
        // Set flag for auto-submit (handled separately)
        if (!autoSubmitTriggeredRef.current) {
          autoSubmitTriggeredRef.current = true;
        }
        return;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimer({
        hours: hours.toString().padStart(2, "0"),
        minutes: minutes.toString().padStart(2, "0"),
        seconds: seconds.toString().padStart(2, "0"),
      });
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [attempt?.expiresAt, test?.durationInMinutes, test?.duration, testId]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (!test || !questions.length) return;

    const saveInterval = setInterval(() => {
      saveProgress();
    }, 30000); // 30 seconds

    return () => clearInterval(saveInterval);
  }, [test, questions.length, saveProgress]);

  // Auto-submit when timer reaches zero
  useEffect(() => {
    if (autoSubmitTriggeredRef.current && timer.hours === "00" && timer.minutes === "00" && timer.seconds === "00" && currentUser && testId) {
      autoSubmitTriggeredRef.current = false; // Reset to prevent multiple submissions
      // Trigger submission
      (async () => {
        try {
          await submitTest(currentUser.id, currentUser.userType, currentUser.instituteId);
          localStorage.removeItem(`IITP_TEST_END_TIME_${testId}`);
          // Exit fullscreen (with Safari webkit support)
          const doc = document as Document & {
            webkitFullscreenElement?: Element | null;
            webkitExitFullscreen?: () => Promise<void>;
          };
          if (document.fullscreenElement || doc.webkitFullscreenElement) {
            if (document.exitFullscreen) {
              document.exitFullscreen();
            } else if (doc.webkitExitFullscreen) {
              doc.webkitExitFullscreen();
            }
          }
          router.push("/result");
        } catch (error) {
          console.error("Auto-submit failed:", error);
        }
      })();
    }
  }, [timer, currentUser, submitTest, router, testId]);

  // Fullscreen change listener (with Safari webkit support)
  useEffect(() => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
    };

    function handleFullscreenChange() {
      const isFullscreen = document.fullscreenElement || doc.webkitFullscreenElement;
      if (!isFullscreen) {
        // User exited fullscreen - increment counter
        setFullscreenExitCount((prev) => {
          const newCount = prev + 1;
          // Store in localStorage to persist across refreshes
          if (testId) {
            localStorage.setItem(`IITP_FULLSCREEN_EXITS_${testId}`, String(newCount));
          }
          return newCount;
        });
        setExitFullscreenModal(true);
      } else {
        setExitFullscreenModal(false);
      }
    }

    // Check initial state
    const isFullscreen = document.fullscreenElement || doc.webkitFullscreenElement;
    if (!isFullscreen) {
      setExitFullscreenModal(true);
    }

    // Restore exit count from localStorage
    if (testId) {
      const savedCount = localStorage.getItem(`IITP_FULLSCREEN_EXITS_${testId}`);
      if (savedCount) {
        setFullscreenExitCount(parseInt(savedCount, 10) || 0);
      }
    }

    // Listen for both standard and webkit fullscreen events
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [testId]);

  // Prevent back button and context menu
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
      }
    };

    // Save progress when user tries to leave
    const handleBeforeUnload = () => {
      saveProgress();
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveProgress]);

  const handleTimeUpdate = useCallback(
    (time: number) => {
      const questionId = questions[currentQuestion]?.id;
      if (questionId) {
        timeTakenRef.current[questionId] = time;
      }
    },
    [questions, currentQuestion]
  );

  const getCurrentTimeTaken = () => {
    const questionId = questions[currentQuestion]?.id;
    return questionId ? timeTakenRef.current[questionId] || 0 : 0;
  };

  const handleFullscreen = () => {
    const elem = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
    };

    const isFullscreen = document.fullscreenElement || doc.webkitFullscreenElement;

    if (!isFullscreen) {
      // Enter fullscreen - try standard first, then webkit for Safari
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  };

  // Check if saving an answer would exceed toBeAttempted limit
  const checkToBeAttemptedLimit = (q: typeof questions[0]): boolean => {
    const subSectionKey = `${q.sectionId}:${q.subSectionId}`;
    // Count currently answered questions in this subsection
    const answered = questions.filter(
      (x) =>
        x.sectionId === q.sectionId &&
        x.subSectionId === q.subSectionId &&
        (x.status.status === "answered" || x.status.status === "answeredAndMarkedForReview")
    ).length;
    const limit = q.toBeAttempted || 999;
    const total = q.totalQuestionsInSubSection || 999;
    // Only enforce if toBeAttempted is less than total (i.e., there's a limit)
    if (limit < total && answered >= limit) {
      // Check if this question is already answered (then it's okay to re-save)
      if (q.status.status === "answered" || q.status.status === "answeredAndMarkedForReview") {
        return false; // Already answered, can re-save
      }
      return true; // Limit reached
    }
    return false;
  };

  const handleSaveAndNext = () => {
    const question = questions[currentQuestion];
    const hasAnswer =
      question.type === "integer"
        ? question.enteredAnswer && question.enteredAnswer.length > 0
        : question.selectedOptions.length > 0;

    if (!hasAnswer) {
      setAlertModal({
        open: true,
        title: "Warning",
        message:
          question.type === "integer"
            ? "Please enter a valid number!"
            : "Please select an option!",
      });
      return;
    }

    // Check toBeAttempted limit
    if (checkToBeAttemptedLimit(question)) {
      setAlertModal({
        open: true,
        title: "Limit Reached",
        message: `You have already answered the maximum allowed questions (${question.toBeAttempted}) in this section. You cannot answer more questions here.`,
      });
      return;
    }

    saveAndNext(getCurrentTimeTaken());
  };

  const handleSaveAndMarkForReview = () => {
    const question = questions[currentQuestion];
    const hasAnswer =
      question.type === "integer"
        ? question.enteredAnswer && question.enteredAnswer.length > 0
        : question.selectedOptions.length > 0;

    if (!hasAnswer) {
      setAlertModal({
        open: true,
        title: "Warning",
        message:
          question.type === "integer"
            ? "Please enter a valid number!"
            : "Please select an option!",
      });
      return;
    }

    // Check toBeAttempted limit
    if (checkToBeAttemptedLimit(question)) {
      setAlertModal({
        open: true,
        title: "Limit Reached",
        message: `You have already answered the maximum allowed questions (${question.toBeAttempted}) in this section. You cannot answer more questions here.`,
      });
      return;
    }

    saveAndMarkForReview(getCurrentTimeTaken());
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      setAlertModal({
        open: true,
        title: "Error",
        message: "No valid user found",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitTest(currentUser.id, currentUser.userType, currentUser.instituteId);
      // Clear the timer end time from localStorage
      if (testId) {
        localStorage.removeItem(`IITP_TEST_END_TIME_${testId}`);
      }
      handleFullscreen();
      router.push("/result");
    } catch (error) {
      setAlertModal({
        open: true,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to submit test",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToQuestion = (index: number) => {
    goToQuestion(index, getCurrentTimeTaken());
  };

  // Get unique sections from questions
  const sections = questions.reduce((acc, q, idx) => {
    if (!acc.find(s => s.id === q.sectionId)) {
      acc.push({
        id: q.sectionId,
        name: q.sectionName || q.sectionSubject || `Section ${acc.length + 1}`,
        subject: q.sectionSubject || "",
        startIndex: idx,
      });
    }
    return acc;
  }, [] as Array<{ id: string; name: string; subject: string; startIndex: number }>);

  // Get questions for selected section (or all if none selected)
  const filteredQuestions = selectedSection
    ? questions.filter(q => q.sectionId === selectedSection)
    : questions;

  // Get question indices for display in palette
  const getGlobalIndex = (q: typeof questions[0]) => questions.findIndex(x => x.id === q.id);

  // Compute answered questions per subsection for toBeAttempted enforcement
  const answeredPerSubSection = questions.reduce((acc, q) => {
    const key = `${q.sectionId}:${q.subSectionId}`;
    if (!acc[key]) {
      acc[key] = { answered: 0, toBeAttempted: q.toBeAttempted || 999, total: q.totalQuestionsInSubSection || 999 };
    }
    if (q.status.status === "answered" || q.status.status === "answeredAndMarkedForReview") {
      acc[key].answered++;
    }
    return acc;
  }, {} as Record<string, { answered: number; toBeAttempted: number; total: number }>);

  // Check if current question's subsection has reached toBeAttempted limit
  const currentSubSectionKey = question ? `${question.sectionId}:${question.subSectionId}` : "";
  const currentSubSectionStats = currentSubSectionKey ? answeredPerSubSection[currentSubSectionKey] : null;
  const isCurrentQuestionLocked = currentSubSectionStats &&
    currentSubSectionStats.toBeAttempted < currentSubSectionStats.total &&
    currentSubSectionStats.answered >= currentSubSectionStats.toBeAttempted &&
    question?.status.status !== "answered" &&
    question?.status.status !== "answeredAndMarkedForReview";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-gray-500">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500">No questions found</p>
          <button
            type="button"
            onClick={() => router.push("/instructions")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header - Logo Section */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white test-header">
        <div className="flex items-center">
          <div className="h-12 flex items-center">
            <span className="text-2xl font-bold text-blue-600">IIT Pulse</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuestionPaperModal(true)}
            className="flex items-center gap-2 px-4 py-2 btn-header-green rounded text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Question Paper
          </button>
          <button
            type="button"
            onClick={() => setInstructionsModal(true)}
            className="flex items-center gap-2 px-4 py-2 btn-header-blue rounded text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View Instruction
          </button>
        </div>
      </header>

      {/* Test Info Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b test-info-bar">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold">
              {currentUser?.name?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
          <div>
            <div className="font-medium text-sm">
              <span className="text-gray-500">Name : </span>
              {currentUser?.name || "Student"}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Exam : </span>
              {test?.name || "Test"}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Time Remaining : </span>
              <span className="font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {timer.hours} : {timer.minutes} : {timer.seconds}
              </span>
            </div>
          </div>
        </div>
        <select
          title="Select Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as "en" | "hi")}
          className="px-3 py-1 border rounded text-sm"
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </select>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden test-main-container">
        {/* Left Container - Question Area */}
        <main className={cn("flex flex-col", isExpanded ? "w-full" : "w-[60%]")}>
          {/* Section/Subject Info Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border border-blue-200 rounded-t mb-0">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-800">
                {question.sectionSubject || question.sectionName || "Section"}
              </span>
              {question.sectionName && question.sectionSubject && question.sectionName !== question.sectionSubject && (
                <span className="text-sm text-blue-600">
                  {question.sectionName}
                </span>
              )}
              {question.subSectionName && (
                <span className="text-xs text-gray-500">
                  • {question.subSectionName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* toBeAttempted indicator */}
              {currentSubSectionStats && currentSubSectionStats.toBeAttempted < currentSubSectionStats.total && (
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded",
                  currentSubSectionStats.answered >= currentSubSectionStats.toBeAttempted
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                )}>
                  {currentSubSectionStats.answered}/{currentSubSectionStats.toBeAttempted} answered
                </span>
              )}
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded",
                question.type === "single" && "bg-green-100 text-green-700",
                question.type === "multiple" && "bg-purple-100 text-purple-700",
                question.type === "integer" && "bg-orange-100 text-orange-700"
              )}>
                {question.type === "single" && "Single Choice"}
                {question.type === "multiple" && "Multiple Choice"}
                {question.type === "integer" && "Numerical"}
              </span>
            </div>
          </div>

          {/* Warning when toBeAttempted limit reached */}
          {isCurrentQuestionLocked && (
            <div className="px-4 py-2 bg-amber-50 border-x border-amber-200 text-amber-800 text-sm">
              <strong>Note:</strong> You have already answered the maximum allowed questions ({currentSubSectionStats?.toBeAttempted}) in this section.
              You can only view this question but cannot submit an answer.
            </div>
          )}

          {/* Question Display */}
          <div className="flex-1 overflow-auto border border-t-0 rounded-b p-4 mb-4 question-container">
            {/* Subsection Description */}
            {question.subSectionDescription && (
              <div className="mb-4 p-3 bg-gray-50 border-l-4 border-gray-300 text-sm text-gray-600">
                <RenderLatex content={question.subSectionDescription} />
              </div>
            )}
            {(question.type === "single" || question.type === "multiple") && (
              <QuestionObjective
                question={{
                  en: question.en,
                  hi: question.hi,
                }}
                id={question.id}
                index={currentQuestion}
                selectedOptions={question.selectedOptions}
                type={question.type}
                language={language}
                timeTakenInSeconds={question.status.timeTakenInSeconds}
                onClickOption={selectOption}
                onTimeUpdate={handleTimeUpdate}
              />
            )}
            {question.type === "integer" && (
              <QuestionInteger
                question={{
                  en: question.en,
                  hi: question.hi,
                }}
                id={question.id}
                index={currentQuestion}
                enteredAnswer={question.enteredAnswer || ""}
                language={language}
                timeTakenInSeconds={question.status.timeTakenInSeconds}
                onChangeValue={setIntegerAnswer}
                onTimeUpdate={handleTimeUpdate}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-5 mb-4">
            <button
              type="button"
              onClick={handleSaveAndNext}
              className="px-4 py-2 rounded text-sm btn-save-next"
            >
              Save &amp; Next
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-4 py-2 rounded text-sm btn-clear"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSaveAndMarkForReview}
              className="px-4 py-2 rounded text-sm btn-save-mark-review"
            >
              Save &amp; Mark For Review
            </button>
            <button
              type="button"
              onClick={() => markForReview(getCurrentTimeTaken())}
              className="px-4 py-2 rounded text-sm btn-mark-review-next"
            >
              Mark For Review &amp; Next
            </button>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => previousQuestion(getCurrentTimeTaken())}
                disabled={currentQuestion === 0}
                className="px-4 py-2 rounded text-sm btn-nav"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => nextQuestion(getCurrentTimeTaken())}
                disabled={currentQuestion === questions.length - 1}
                className="px-4 py-2 rounded text-sm btn-nav"
              >
                Next
              </button>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </main>

        {/* Right Container - Question Palette */}
        <aside className={cn(
          "flex items-start",
          isExpanded ? "w-[10%]" : "w-[40%]"
        )}>
          <button
            type="button"
            title="Toggle question palette"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "mx-2 p-2 rounded-full border border-gray-400 bg-white hover:bg-gray-100",
              isExpanded && "expand-btn-rotated"
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {!isExpanded && (
            <div className="flex-1 min-w-[250px]">
              {/* Section Tabs */}
              {sections.length > 1 && (
                <div className="mb-3 border-b">
                  <div className="flex flex-wrap gap-1 pb-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSection(null)}
                      className={cn(
                        "px-3 py-1 text-xs rounded-t font-medium transition-colors",
                        selectedSection === null
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      All
                    </button>
                    {sections.map((section) => (
                      <button
                        type="button"
                        key={section.id}
                        onClick={() => setSelectedSection(section.id)}
                        className={cn(
                          "px-3 py-1 text-xs rounded-t font-medium transition-colors",
                          selectedSection === section.id
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {section.subject || section.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Legend */}
              <Legend status={status} />

              {/* Question Buttons */}
              <div className="overflow-y-auto question-buttons-container">
                {filteredQuestions.map((q) => {
                  const globalIdx = getGlobalIndex(q);
                  return (
                    <button
                      type="button"
                      key={`QBTN_${q.id}`}
                      onClick={() => handleGoToQuestion(globalIdx)}
                      className={cn(
                        "question-btn m-[3px]",
                        q.status.status === "notVisited" && "question-btn-not-visited",
                        q.status.status === "notAnswered" && "question-btn-not-answered",
                        q.status.status === "answered" && "question-btn-answered",
                        q.status.status === "markedForReview" && "question-btn-marked-for-review",
                        q.status.status === "answeredAndMarkedForReview" && "question-btn-answered-and-marked",
                        currentQuestion === globalIdx && "ring-2 ring-blue-500"
                      )}
                    >
                      {globalIdx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Instructions Modal */}
      <Dialog open={instructionsModal} onOpenChange={setInstructionsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Instructions</DialogTitle>
            <DialogDescription>Review the test instructions below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <InstructionSection
              title="General Instructions:"
              instructions={GENERAL_INSTRUCTIONS}
              language={language}
            />
            <InstructionSection
              title="Navigating to a Question"
              instructions={NAVIGATING_INSTRUCTIONS}
              language={language}
            />
            <InstructionSection
              title="Answering a Question"
              instructions={ANSWERING_INSTRUCTIONS}
              language={language}
            />
            <InstructionSection
              title="Navigation through sections"
              instructions={SECTION_INSTRUCTIONS}
              language={language}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Paper Modal */}
      <Dialog open={questionPaperModal} onOpenChange={setQuestionPaperModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Question Paper</DialogTitle>
            <DialogDescription>View all questions in this test.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {questions.map((q, i) => (
              <div key={q.id} className="border-b pb-4 last:border-b-0">
                <h4 className="font-medium mb-2">Question {i + 1}</h4>
                <div className="text-sm text-gray-600">
                  <RenderLatex content={q[language]?.question || ""} />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Fullscreen Modal */}
      <Dialog open={exitFullscreenModal} onOpenChange={setExitFullscreenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {fullscreenPolicy.enabled && fullscreenExitCount >= fullscreenPolicy.maxExits
                ? "Maximum fullscreen exits reached!"
                : "Fullscreen Mode Required"}
            </DialogTitle>
            <DialogDescription>
              {fullscreenPolicy.enabled ? (
                fullscreenExitCount >= fullscreenPolicy.maxExits ? (
                  fullscreenPolicy.action === "submit" ? (
                    "You have exited fullscreen mode too many times. Your test will be submitted automatically."
                  ) : (
                    `You have exited fullscreen ${fullscreenExitCount} times (limit: ${fullscreenPolicy.maxExits}). Please continue in fullscreen mode.`
                  )
                ) : (
                  <>
                    <span className="font-medium text-amber-600">
                      Warning {fullscreenExitCount} of {fullscreenPolicy.maxExits}:
                    </span>{" "}
                    You have exited fullscreen mode. This test requires fullscreen mode for integrity.
                    {fullscreenPolicy.action === "submit" && (
                      <span className="block mt-2 text-red-600">
                        Your test will be auto-submitted after {fullscreenPolicy.maxExits} exits.
                      </span>
                    )}
                  </>
                )
              ) : (
                "Please return to fullscreen mode to continue your test."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            {fullscreenPolicy.enabled && fullscreenExitCount >= fullscreenPolicy.maxExits && fullscreenPolicy.action === "submit" ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Submit Test Now
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Submit Test
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleFullscreen();
                    setExitFullscreenModal(false);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Return to Fullscreen
                </button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Modal */}
      <Dialog
        open={alertModal.open}
        onOpenChange={(open) => setAlertModal({ ...alertModal, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{alertModal.title}</DialogTitle>
            <DialogDescription>{alertModal.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAlertModal({ open: false, title: "", message: "" })}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface InstructionSectionProps {
  title: string;
  instructions: Array<{ content: { en: string; hi: string } }>;
  language: "en" | "hi";
}

function InstructionSection({ title, instructions, language }: InstructionSectionProps) {
  return (
    <div className="mb-6">
      <h4 className="text-base font-medium underline mb-3">{title}</h4>
      <ol className="list-decimal space-y-2 pl-6 text-sm text-gray-600">
        {instructions.map((instruction, index) => (
          <li key={index} className="ml-4">{instruction.content[language]}</li>
        ))}
      </ol>
    </div>
  );
}
