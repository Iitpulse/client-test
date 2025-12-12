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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore, useTestStore } from "@/stores";
import { QuestionObjective } from "@/components/question-objective";
import { QuestionInteger } from "@/components/question-integer";
import { QuestionPalette } from "@/components/question-palette";
import {
  FileText,
  Info,
  ChevronLeft,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GENERAL_INSTRUCTIONS,
  NAVIGATING_INSTRUCTIONS,
  ANSWERING_INSTRUCTIONS,
  SECTION_INSTRUCTIONS,
} from "@/lib/constants";

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
    nextQuestion,
    previousQuestion,
    goToQuestion,
    submitTest,
    updateTimeTaken,
  } = useTestStore();

  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaletteExpanded, setIsPaletteExpanded] = useState(true);
  const [questionPaperModal, setQuestionPaperModal] = useState(false);
  const [instructionsModal, setInstructionsModal] = useState(false);
  const [exitFullscreenModal, setExitFullscreenModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });
  const [submitConfirmModal, setSubmitConfirmModal] = useState(false);

  const timeTakenRef = useRef<Record<string, number>>({});

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

  // Fullscreen change listener
  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setExitFullscreenModal(true);
      } else {
        setExitFullscreenModal(false);
      }
    }

    if (!document.fullscreenElement) {
      setExitFullscreenModal(true);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

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
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
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
      setSubmitConfirmModal(false);
    }
  };

  const handleGoToQuestion = (index: number) => {
    goToQuestion(index, getCurrentTimeTaken());
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No questions found</p>
          <Button className="mt-4" onClick={() => router.push("/instructions")}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b bg-white px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">IITP</span>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {test?.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuestionPaperModal(true)}
            className="hidden sm:flex"
          >
            <FileText className="mr-2 h-4 w-4" />
            Question Paper
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInstructionsModal(true)}
          >
            <Info className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Instructions</span>
          </Button>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "hi")}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
          <span className="text-xs text-muted-foreground hidden md:inline">
            {currentUser?.email}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Area */}
        <main
          className={cn(
            "flex-1 flex flex-col overflow-hidden transition-all duration-300",
            isPaletteExpanded ? "mr-0" : "mr-0"
          )}
        >
          {/* Question Display */}
          <div className="flex-1 overflow-auto p-4">
            <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-sm">
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
          </div>

          {/* Action Buttons */}
          <div className="border-t bg-white p-4">
            <div className="mx-auto max-w-3xl">
              {/* Main Actions */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button onClick={handleSaveAndNext} className="bg-green-600 hover:bg-green-700">
                  Save & Next
                </Button>
                <Button variant="outline" onClick={clearSelection}>
                  Clear
                </Button>
                <Button
                  onClick={handleSaveAndMarkForReview}
                  className="bg-purple-700 hover:bg-purple-800"
                >
                  Save & Mark For Review
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => markForReview(getCurrentTimeTaken())}
                >
                  Mark For Review & Next
                </Button>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => previousQuestion(getCurrentTimeTaken())}
                    disabled={currentQuestion === 0}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => nextQuestion(getCurrentTimeTaken())}
                    disabled={currentQuestion === questions.length - 1}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={() => setSubmitConfirmModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Submit Test
                </Button>
              </div>
            </div>
          </div>
        </main>

        {/* Question Palette Sidebar */}
        <aside
          className={cn(
            "border-l bg-white transition-all duration-300 relative",
            isPaletteExpanded ? "w-64" : "w-0"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute -left-10 top-4 z-10"
            onClick={() => setIsPaletteExpanded(!isPaletteExpanded)}
          >
            {isPaletteExpanded ? (
              <PanelRightClose className="h-5 w-5" />
            ) : (
              <PanelRightOpen className="h-5 w-5" />
            )}
          </Button>

          {isPaletteExpanded && (
            <div className="h-full overflow-auto p-4">
              <QuestionPalette
                questions={questions}
                currentQuestion={currentQuestion}
                status={status}
                onQuestionClick={handleGoToQuestion}
              />
            </div>
          )}
        </aside>
      </div>

      {/* Instructions Modal */}
      <Dialog open={instructionsModal} onOpenChange={setInstructionsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Instructions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <InstructionSection
              title="General Instructions"
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
              title="Navigating Through Sections"
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
          </DialogHeader>
          <div className="space-y-6">
            {questions.map((q, i) => (
              <div key={q.id} className="border-b pb-4 last:border-b-0">
                <h4 className="font-medium mb-2">Question {i + 1}</h4>
                <div className="text-sm text-muted-foreground">
                  {q[language]?.question?.substring(0, 200)}...
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Fullscreen Modal */}
      <AlertDialog open={exitFullscreenModal} onOpenChange={setExitFullscreenModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Fullscreen?</AlertDialogTitle>
            <AlertDialogDescription>
              You have exited fullscreen mode. Would you like to submit your test or
              continue in fullscreen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                handleFullscreen();
                setExitFullscreenModal(false);
              }}
            >
              Continue Test
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              className="bg-red-600 hover:bg-red-700"
            >
              Submit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Confirmation Modal */}
      <AlertDialog open={submitConfirmModal} onOpenChange={setSubmitConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your test? This action cannot be undone.
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>Answered: {status.answered.length}</div>
                <div>Not Answered: {status.notAnswered.length}</div>
                <div>Marked for Review: {status.markedForReview.length}</div>
                <div>Not Visited: {status.notVisited.length}</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Submitting..." : "Confirm Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    <div>
      <h3 className="font-medium text-primary mb-2">{title}</h3>
      <ol className="list-decimal space-y-1 pl-6 text-sm text-muted-foreground">
        {instructions.map((instruction, index) => (
          <li key={index}>{instruction.content[language]}</li>
        ))}
      </ol>
    </div>
  );
}
