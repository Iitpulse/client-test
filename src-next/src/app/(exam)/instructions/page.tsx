"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useTestStore, useAuthHydrated } from "@/stores";
import { INSTRUCTIONS_WARNING } from "@/components/nta/instructions";
import { pageInstructions, toolsOf } from "@/lib/exam-template";
import "@/components/nta/exam-tools.css";
import { usePreview } from "@/lib/exam-preview";

// M6 (owner-approved, board Exam-Additions D1/P1): heading, blocks and declaration come from the test's exam template
// (frozen NTA text without one); pressing PROCEED before ticking shows the old alert text inline, under the declaration.
const CONFIRM_MESSAGE = {
  en: "Please confirm that you have read the instructions",
  hi: "कृपया पुष्टि करें कि आपने निर्देश पढ़ लिए हैं",
};

export default function InstructionsPage() {
  const router = useRouter();
  // "Preview as student" (batch 7): staff see this page read-only and PROCEED goes back to the previewed paper
  const preview = usePreview();
  const authState = useAuthStore();
  const { checkAuth, isAuthenticated } = authState;
  const testId = preview ? null : authState.testId;
  const { test, fetchTest, isLoading, error: testError, template } = useTestStore();

  const [confirmed, setConfirmed] = useState(false);
  const [showConfirmMessage, setShowConfirmMessage] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  // Wait for the persisted test id / session to be restored (SSR-safe)
  const hydrated = useAuthHydrated();

  const previewTestId = preview?.testId ?? null;
  useEffect(() => {
    if (previewTestId) {
      if (!test) fetchTest(previewTestId);
      return;
    }
    if (!hydrated) return;
    // Check authentication
    if (!checkAuth() || !isAuthenticated) {
      router.push("/login");
      return;
    }

    // No test chosen: go to the list instead of showing generic instructions
    if (!testId) {
      router.push("/tests");
      return;
    }
    // Fetch test if we have testId but no test loaded
    if (!test) {
      fetchTest(testId);
    }
  }, [hydrated, checkAuth, isAuthenticated, testId, test, fetchTest, router, previewTestId]);

  const handleProceed = () => {
    if (!confirmed) {
      setShowConfirmMessage(true);
      return;
    }

    if (previewTestId) {
      router.push(`/preview/${encodeURIComponent(previewTestId)}`);
      return;
    }

    // Request fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }

    router.push("/test");
  };

  if (testError && !test) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center max-w-md px-4">
          <p className="text-gray-700 font-medium">{testError}</p>
          <p className="text-gray-500 text-sm mt-1">This test cannot be opened right now.</p>
          <button
            type="button"
            onClick={() => router.push("/tests")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to your tests
          </button>
        </div>
      </div>
    );
  }

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

  const instructions = pageInstructions(template, test, language);
  const languageSwitch = toolsOf(template).languageSwitch;

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
        {/* M6 (owner, 6 Nov): no language select when the template turns the language switch off, as on /test */}
        {languageSwitch && (
        <select
          title="Select Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as "en" | "hi")}
          className="px-3 py-1 border rounded text-sm"
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </select>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto instructions-main">
        <h3 className="text-xl font-medium text-center mb-6">
          {instructions.heading}
        </h3>

        {instructions.blocks.map((block) => (
          <InstructionSection
            key={block.id}
            title={block.title}
            instructions={block.lines.map((line) => ({ content: { en: line, hi: line } }))}
            language={language}
          />
        ))}

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
            onChange={(e) => {
              setConfirmed(e.target.checked);
              if (e.target.checked) setShowConfirmMessage(false);
            }}
            aria-describedby={showConfirmMessage ? "confirm-message" : undefined}
            className="mt-1 cursor-pointer"
          />
          <span>{instructions.declaration}</span>
        </label>
        {showConfirmMessage && !confirmed && (
          <p id="confirm-message" role="alert" className="mt-3 ml-[21px] text-sm text-red-500">
            {CONFIRM_MESSAGE[language]}
          </p>
        )}

        {/* Proceed Button */}
        <button
          type="button"
          onClick={handleProceed}
          aria-disabled={!confirmed}
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
