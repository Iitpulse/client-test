"use client";

import { cn } from "@/lib/utils";
import { QuestionStatus, ITestStatus } from "@/types";
import { STATUS_LABELS } from "@/lib/constants";

interface QuestionPaletteProps {
  questions: Array<{ id: string; status: { status: QuestionStatus } }>;
  currentQuestion: number;
  status: ITestStatus;
  onQuestionClick: (index: number) => void;
}

// Map status to custom CSS classes for buttons
const getButtonClass = (status: QuestionStatus): string => {
  switch (status) {
    case "notVisited":
      return "question-btn-not-visited";
    case "notAnswered":
      return "question-btn-not-answered";
    case "answered":
      return "question-btn-answered";
    case "markedForReview":
      return "question-btn-marked-for-review";
    case "answeredAndMarkedForReview":
      return "question-btn-answered-and-marked";
    default:
      return "question-btn-not-visited";
  }
};

// Map status to legend CSS classes
const getLegendClass = (status: string): string => {
  switch (status) {
    case "notVisited":
      return "legend-not-visited";
    case "notAnswered":
      return "legend-not-answered";
    case "answered":
      return "legend-answered";
    case "markedForReview":
      return "legend-marked-for-review";
    case "answeredAndMarkedForReview":
      return "legend-answered-and-marked";
    default:
      return "legend-not-visited";
  }
};

export function QuestionPalette({
  questions,
  currentQuestion,
  status,
  onQuestionClick,
}: QuestionPaletteProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Legend */}
      <div className="mb-4 space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Question Status</h4>
        <div className="grid grid-cols-1 gap-2 text-xs">
          {Object.entries(STATUS_LABELS).map(([statusKey, label]) => (
            <div key={statusKey} className="flex items-center gap-2">
              <div
                className={cn(
                  "h-6 w-6 flex items-center justify-center text-[10px] font-medium text-white",
                  getLegendClass(statusKey)
                )}
              >
                {status[statusKey as keyof ITestStatus]?.length || 0}
              </div>
              <span className="text-muted-foreground">{label.en}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t my-4" />

      {/* Question Buttons */}
      <div className="flex-1 overflow-auto">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Questions</h4>
        <div className="grid grid-cols-5 gap-2">
          {questions.map((question, i) => (
            <button
              type="button"
              key={`QBTN_${question.id}`}
              onClick={() => onQuestionClick(i)}
              className={cn(
                "question-btn",
                getButtonClass(question.status.status),
                currentQuestion === i && "ring-2 ring-offset-1 ring-blue-500"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
