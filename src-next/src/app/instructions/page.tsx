"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useTestStore } from "@/stores";
import {
  GENERAL_INSTRUCTIONS,
  NAVIGATING_INSTRUCTIONS,
  ANSWERING_INSTRUCTIONS,
  SECTION_INSTRUCTIONS,
  INSTRUCTIONS_WARNING,
  INSTRUCTIONS_CONFIRMATION,
} from "@/lib/constants";

export default function InstructionsPage() {
  const router = useRouter();
  const { checkAuth, isAuthenticated, testId, currentUser } = useAuthStore();
  const { test, fetchTest, isLoading } = useTestStore();

  const [confirmed, setConfirmed] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi">("en");

  useEffect(() => {
    // Check authentication
    if (!checkAuth() || !isAuthenticated) {
      router.push("/login");
      return;
    }

    // Fetch test if we have testId but no test loaded
    if (testId && !test) {
      fetchTest(testId);
    }
  }, [checkAuth, isAuthenticated, testId, test, fetchTest, router]);

  const handleProceed = () => {
    if (!confirmed) {
      alert("Please confirm that you have read the instructions");
      return;
    }

    // Request fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }

    router.push("/test");
  };

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

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white test-header">
        <div className="flex items-center">
          <div className="h-12 flex items-center">
            <span className="text-2xl font-bold text-blue-600">IIT Pulse</span>
          </div>
        </div>
        <p className="ml-auto text-sm">Test</p>
      </header>

      {/* Test Info Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b test-info-bar">
        <h3 className="font-medium">GENERAL INSTRUCTIONS</h3>
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
      <main className="flex-1 overflow-auto instructions-main">
        <h3 className="text-xl font-medium text-center mb-6">
          {language === "en"
            ? "Please read the instructions carefully"
            : "कृपया निर्देशों को ध्यान से पढ़ें"}
        </h3>

        {/* General Instructions */}
        <InstructionSection
          title={language === "en" ? "General Instructions:" : "सामान्य निर्देश:"}
          instructions={getGeneralInstructionsWithTestName(test, language)}
          language={language}
        />

        {/* Navigating Instructions */}
        <InstructionSection
          title={language === "en" ? "Navigating to a Question" : "प्रश्न पर जाना"}
          instructions={NAVIGATING_INSTRUCTIONS}
          language={language}
        />

        {/* Answering Instructions */}
        <InstructionSection
          title={language === "en" ? "Answering a Question" : "प्रश्न का उत्तर देना"}
          instructions={ANSWERING_INSTRUCTIONS}
          language={language}
        />

        {/* Section Instructions */}
        <InstructionSection
          title={language === "en" ? "Navigation through sections" : "अनुभागों में नेविगेट करना"}
          instructions={SECTION_INSTRUCTIONS}
          language={language}
        />

        <hr className="my-6" />

        {/* Warning */}
        <p className="text-red-500 my-6">
          {INSTRUCTIONS_WARNING[language]}
        </p>

        <hr className="my-6" />

        {/* Confirmation */}
        <label className="flex items-start gap-2 cursor-pointer mt-8 text-gray-600">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 cursor-pointer"
          />
          <span>{INSTRUCTIONS_CONFIRMATION[language]}</span>
        </label>

        {/* Proceed Button */}
        <button
          type="button"
          onClick={handleProceed}
          disabled={!confirmed}
          className="block w-full mt-8 py-4 text-center font-semibold text-base rounded btn-proceed"
        >
          {language === "en" ? "PROCEED" : "आगे बढ़ें"}
        </button>
      </main>
    </div>
  );
}

interface InstructionSectionProps {
  title: string;
  instructions: Array<{ content: { en: string; hi: string } }>;
  language: "en" | "hi";
}

function InstructionSection({
  title,
  instructions,
  language,
}: InstructionSectionProps) {
  return (
    <div className="my-8">
      <h4 className="text-lg font-normal underline mb-4">{title}</h4>
      <ol className="list-decimal space-y-2 ml-4 text-gray-600">
        {instructions.map((instruction, index) => (
          <li key={index} className="ml-4">{instruction.content[language]}</li>
        ))}
      </ol>
    </div>
  );
}

function getGeneralInstructionsWithTestName(test: { name?: string; duration?: number } | null, language: "en" | "hi") {
  const duration = test?.duration || 180;
  const testName = test?.name || "this test";

  return GENERAL_INSTRUCTIONS.map((instruction, i) =>
    i === 0
      ? {
          ...instruction,
          content: {
            en: `Total duration of ${testName} is ${duration} min.`,
            hi: `${testName} की कुल अवधि ${duration} मिनट है।`,
          },
        }
      : instruction
  );
}
