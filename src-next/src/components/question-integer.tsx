"use client";

import { memo, useEffect, useRef } from "react";
import { RenderLatex } from "./render-latex";

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
    <div id="container" className="scroll-smooth select-none">
      {/* Question Header */}
      <div className="flex items-center justify-between my-3 sticky top-0 bg-white">
        <h3 className="text-lg font-semibold">Question {index + 1}</h3>
        <a
          id="top"
          href="#bottom"
          title="Go to bottom"
          className="ml-auto bg-blue-500 rounded-full p-1"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </div>

      {/* Divider */}
      <div className="w-full bg-gray-200 h-px my-3" />

      {/* Question Content */}
      <div className="text-gray-700 leading-6">
        {isUrl(currentQuestion.question) ? (
          <img src={currentQuestion.question} alt="question" className="max-w-full" />
        ) : (
          <RenderLatex content={currentQuestion.question} />
        )}
      </div>

      {/* Answer Input */}
      <div className="flex flex-col my-8">
        <p className="text-gray-500 mb-2">Answer</p>
        <input
          title="Answer"
          type="number"
          onChange={(e) => onChangeValue(e.target.value)}
          value={enteredAnswer}
          name="numerical"
          id="numerical"
          className="p-2 border rounded max-w-sm"
        />
      </div>

      {/* Bottom anchor */}
      <div className="mt-4 flex justify-end">
        <a
          id="bottom"
          href="#top"
          title="Go to top"
          className="ml-auto bg-blue-500 rounded-full p-1"
        >
          <svg className="w-4 h-4 text-white transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </div>
    </div>
  );
}

export const QuestionInteger = memo(QuestionIntegerComponent);
