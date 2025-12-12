"use client";

import { memo, useEffect, useRef } from "react";
import { RenderLatex } from "./render-latex";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";

interface QuestionContent {
  question: string;
}

interface QuestionIntegerProps {
  question: {
    en: QuestionContent;
    hi?: QuestionContent;
  };
  id: string;
  index: number;
  enteredAnswer: string;
  language: "en" | "hi";
  timeTakenInSeconds: number;
  onChangeValue: (value: string) => void;
  onTimeUpdate: (time: number) => void;
}

const TIME_INTERVAL = 1000; // 1 second

function QuestionIntegerComponent({
  question,
  id,
  index,
  enteredAnswer,
  language,
  timeTakenInSeconds,
  onChangeValue,
  onTimeUpdate,
}: QuestionIntegerProps) {
  const timeRef = useRef(timeTakenInSeconds);

  // Timer effect
  useEffect(() => {
    timeRef.current = timeTakenInSeconds;
    const interval = setInterval(() => {
      timeRef.current = Math.round((timeRef.current + TIME_INTERVAL / 1000) * 100) / 100;
      onTimeUpdate(timeRef.current);
    }, TIME_INTERVAL);

    return () => clearInterval(interval);
  }, [id, onTimeUpdate, timeTakenInSeconds]);

  const currentQuestion = language === "hi" && question.hi ? question.hi : question.en;

  const isUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Question Header */}
      <div className="flex items-center justify-between border-b pb-3 mb-4">
        <h3 className="text-lg font-semibold">Question {index + 1}</h3>
        <a href="#bottom" title="Go to bottom" className="text-muted-foreground hover:text-foreground">
          <ChevronDown className="h-5 w-5" />
        </a>
      </div>

      {/* Question Content */}
      <div className="flex-1 overflow-auto mb-6">
        <div className="mb-6">
          {isUrl(currentQuestion.question) ? (
            <img src={currentQuestion.question} alt="question" className="max-w-full" />
          ) : (
            <RenderLatex content={currentQuestion.question} />
          )}
        </div>

        {/* Answer Input */}
        <div className="max-w-sm">
          <Label htmlFor="numerical-answer" className="text-muted-foreground mb-2 block">
            Answer
          </Label>
          <Input
            id="numerical-answer"
            type="number"
            placeholder="Enter your answer"
            value={enteredAnswer}
            onChange={(e) => onChangeValue(e.target.value)}
            className="text-lg"
          />
        </div>
      </div>

      {/* Bottom anchor */}
      <div id="bottom" className="flex justify-end">
        <a href="#top" title="Go to top" className="text-muted-foreground hover:text-foreground">
          <ChevronUp className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
}

export const QuestionInteger = memo(QuestionIntegerComponent);
