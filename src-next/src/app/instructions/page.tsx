"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useAuthStore, useTestStore } from "@/stores";
import {
  GENERAL_INSTRUCTIONS,
  NAVIGATING_INSTRUCTIONS,
  ANSWERING_INSTRUCTIONS,
  SECTION_INSTRUCTIONS,
  INSTRUCTIONS_WARNING,
  INSTRUCTIONS_CONFIRMATION,
  STATUS_LABELS,
} from "@/lib/constants";

// Map status to legend CSS classes (same as question-palette)
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading test...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-white px-6">
        <h1 className="text-xl font-bold">GENERAL INSTRUCTIONS</h1>
        <div className="flex items-center gap-4">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "hi")}
            className="rounded-md border px-3 py-1 text-sm"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
          <span className="text-sm text-muted-foreground">
            {currentUser?.email}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              {language === "en"
                ? "Please read the instructions carefully"
                : "कृपया निर्देशों को ध्यान से पढ़ें"}
            </h2>

            {/* General Instructions */}
            <InstructionSection
              title={language === "en" ? "General Instructions" : "सामान्य निर्देश"}
              instructions={GENERAL_INSTRUCTIONS}
              language={language}
            />

            {/* Question Status Legend */}
            <div className="my-6 rounded-lg bg-slate-50 p-4">
              <h3 className="mb-3 font-medium">
                {language === "en" ? "Question Status Indicators" : "प्रश्न स्थिति संकेतक"}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                  <div key={status} className="flex items-center gap-3">
                    <div
                      className={`h-7 w-7 flex items-center justify-center ${getLegendClass(status)}`}
                    />
                    <span className="text-sm">{label[language]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigating Instructions */}
            <InstructionSection
              title={
                language === "en"
                  ? "Navigating to a Question"
                  : "प्रश्न पर जाना"
              }
              instructions={NAVIGATING_INSTRUCTIONS}
              language={language}
            />

            {/* Answering Instructions */}
            <InstructionSection
              title={
                language === "en"
                  ? "Answering a Question"
                  : "प्रश्न का उत्तर देना"
              }
              instructions={ANSWERING_INSTRUCTIONS}
              language={language}
            />

            {/* Section Instructions */}
            <InstructionSection
              title={
                language === "en"
                  ? "Navigating Through Sections"
                  : "अनुभागों में नेविगेट करना"
              }
              instructions={SECTION_INSTRUCTIONS}
              language={language}
            />

            {/* Warning */}
            <div className="my-6 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                {INSTRUCTIONS_WARNING[language]}
              </p>
            </div>

            {/* Test Info */}
            {test && (
              <div className="my-6 rounded-lg bg-blue-50 p-4">
                <h3 className="mb-2 font-medium text-blue-900">
                  {language === "en" ? "Test Information" : "परीक्षा जानकारी"}
                </h3>
                <div className="grid gap-2 text-sm text-blue-800 sm:grid-cols-2">
                  <div>
                    <span className="font-medium">
                      {language === "en" ? "Test Name:" : "परीक्षा का नाम:"}
                    </span>{" "}
                    {test.name}
                  </div>
                  <div>
                    <span className="font-medium">
                      {language === "en" ? "Duration:" : "अवधि:"}
                    </span>{" "}
                    {test.duration || 180} minutes
                  </div>
                  <div>
                    <span className="font-medium">
                      {language === "en" ? "Sections:" : "अनुभाग:"}
                    </span>{" "}
                    {test.sections?.length || 0}
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation */}
            <div className="mt-6 border-t pt-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                  className="mt-1"
                />
                <span className="text-sm leading-relaxed">
                  {INSTRUCTIONS_CONFIRMATION[language]}
                </span>
              </label>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white p-4">
        <div className="mx-auto flex max-w-4xl justify-end">
          <Button
            onClick={handleProceed}
            disabled={!confirmed}
            size="lg"
            className="px-8"
          >
            {language === "en" ? "PROCEED" : "आगे बढ़ें"}
          </Button>
        </div>
      </footer>
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
    <div className="mb-6">
      <h3 className="mb-3 font-medium text-primary">{title}</h3>
      <ol className="list-decimal space-y-2 pl-6 text-sm text-slate-700">
        {instructions.map((instruction, index) => (
          <li key={index}>{instruction.content[language]}</li>
        ))}
      </ol>
    </div>
  );
}
