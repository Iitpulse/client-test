"use client";

import { memo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { RenderLatex } from "./render-latex";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Option {
  id: string;
  value: string;
}

interface QuestionContent {
  question: string;
  options?: Option[];
}

interface QuestionObjectiveProps {
  question: {
    en: QuestionContent;
    hi?: QuestionContent;
  };
  id: string;
  index: number;
  selectedOptions: string[];
  type: "single" | "multiple";
  language: "en" | "hi";
  timeTakenInSeconds: number;
  onClickOption: (optionId: string) => void;
  onTimeUpdate: (time: number) => void;
}

const TIME_INTERVAL = 1000; // 1 second

function QuestionObjectiveComponent({
  question,
  id,
  index,
  selectedOptions,
  type,
  language,
  timeTakenInSeconds,
  onClickOption,
  onTimeUpdate,
}: QuestionObjectiveProps) {
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

        {/* Options */}
        <div className="space-y-3">
          {type === "single" ? (
            <RadioGroup
              value={selectedOptions[0] || ""}
              onValueChange={(value) => onClickOption(value)}
            >
              {currentQuestion.options?.map((option, i) => (
                <div
                  key={`${option.id}-${i}`}
                  className={cn(
                    "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                    selectedOptions.includes(option.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => onClickOption(option.id)}
                >
                  <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                    {isUrl(option.value) ? (
                      <img src={option.value} alt="option" className="max-w-full" />
                    ) : (
                      <RenderLatex content={option.value} />
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <div className="space-y-3">
              {currentQuestion.options?.map((option, i) => (
                <div
                  key={`${option.id}-${i}`}
                  className={cn(
                    "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                    selectedOptions.includes(option.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => onClickOption(option.id)}
                >
                  <Checkbox
                    id={option.id}
                    checked={selectedOptions.includes(option.id)}
                    onCheckedChange={() => onClickOption(option.id)}
                    className="mt-1"
                  />
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                    {isUrl(option.value) ? (
                      <img src={option.value} alt="option" className="max-w-full" />
                    ) : (
                      <RenderLatex content={option.value} />
                    )}
                  </Label>
                </div>
              ))}
            </div>
          )}
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

export const QuestionObjective = memo(QuestionObjectiveComponent);
