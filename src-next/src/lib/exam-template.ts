// M6 exam template on the frozen NTA screens (owner, 5 Nov; board Exam-Additions). The exam payload carries the
// test's template (`StudentExamTemplate`: six labels, instructions, tool flags). Everything here falls back to the
// frozen NTA text in components/nta/instructions.ts, so a test without a template, or with "NTA standard", renders
// exactly as before.
import type { ExamLang, ExamTools, InstructionsDoc, StudentExamTemplate, WordingKey } from "@/types/m6";
import {
  ANSWERING_INSTRUCTIONS,
  GENERAL_INSTRUCTIONS,
  INSTRUCTIONS_CONFIRMATION,
  NAVIGATING_INSTRUCTIONS,
  SECTION_INSTRUCTIONS,
} from "@/components/nta/instructions";

/** The frozen labels of the /test screen (the buttons print English in both languages) */
export const NTA_WORDING: Record<WordingKey, string> = {
  clear: "Clear",
  saveNext: "Save & Next",
  saveMarkReview: "Save & Mark For Review",
  markReviewNext: "Mark For Review & Next",
  submit: "Submit",
  notAnswered: "Not Answered",
};

/** "NTA standard" tools: no calculator or rough sheet, everything else on */
export const NTA_TOOLS: ExamTools = {
  calculator: "off",
  markForReview: true,
  viewQuestionPaper: true,
  viewInstructions: true,
  languageSwitch: true,
  roughSheet: false,
};

/** Accepts only a well-formed template (anything else: the frozen NTA screen) */
export function parseExamTemplate(v: unknown): StudentExamTemplate | null {
  const t = v as Partial<StudentExamTemplate> | null | undefined;
  if (!t || typeof t !== "object" || !t.wording || !t.instructions || !t.tools) return null;
  return t as StudentExamTemplate;
}

export function wordingOf(t: StudentExamTemplate | null, lang: ExamLang): Record<WordingKey, string> {
  const w = t?.wording?.[lang] ?? t?.wording?.en;
  const out = { ...NTA_WORDING };
  if (w) for (const k of Object.keys(out) as WordingKey[]) if (typeof w[k] === "string" && w[k].trim()) out[k] = w[k];
  return out;
}

export function toolsOf(t: StudentExamTemplate | null): ExamTools {
  const x = t?.tools;
  if (!x) return NTA_TOOLS;
  return {
    calculator: x.calculator === "basic" || x.calculator === "scientific" ? x.calculator : "off",
    markForReview: x.markForReview !== false,
    viewQuestionPaper: x.viewQuestionPaper !== false,
    viewInstructions: x.viewInstructions !== false,
    languageSwitch: x.languageSwitch !== false,
    roughSheet: x.roughSheet === true,
  };
}

export interface InstructionBlock {
  id: string;
  title: string;
  lines: string[];
}
export interface ExamInstructions {
  heading: string;
  blocks: InstructionBlock[];
  declaration: string;
}

const HEADING = { en: "Please read the instructions carefully", hi: "कृपया निर्देशों को ध्यान से पढ़ें" };
const TITLES: Record<string, { en: string; hi: string }> = {
  general: { en: "General Instructions:", hi: "सामान्य निर्देश:" },
  navigating: { en: "Navigating to a Question", hi: "प्रश्न पर जाना" },
  answering: { en: "Answering a Question", hi: "प्रश्न का उत्तर देना" },
  sections: { en: "Navigation through sections", hi: "अनुभागों में नेविगेट करना" },
};
const FROZEN_LINES: Record<string, Array<{ content: { en: string; hi: string } }>> = {
  general: GENERAL_INSTRUCTIONS,
  navigating: NAVIGATING_INSTRUCTIONS,
  answering: ANSWERING_INSTRUCTIONS,
  sections: SECTION_INSTRUCTIONS,
};

/** The frozen /instructions text for this test (what the page showed before templates) */
export function frozenInstructions(test: { name?: string; duration?: number } | null, lang: ExamLang): ExamInstructions {
  const duration = test?.duration || 180;
  const testName = test?.name || "this test";
  const general = GENERAL_INSTRUCTIONS.map((x, i) =>
    i === 0 ? (lang === "en" ? `Total duration of ${testName} is ${duration} min.` : `${testName} की कुल अवधि ${duration} मिनट है।`) : x.content[lang],
  );
  return {
    heading: HEADING[lang],
    blocks: [
      { id: "general", title: TITLES.general[lang], lines: general },
      ...(["navigating", "answering", "sections"] as const).map((id) => ({ id, title: TITLES[id][lang], lines: FROZEN_LINES[id].map((x) => x.content[lang]) })),
    ],
    declaration: INSTRUCTIONS_CONFIRMATION[lang],
  };
}

const docOf = (t: StudentExamTemplate | null, lang: ExamLang): InstructionsDoc | null => {
  const d = t?.instructions?.[lang] ?? t?.instructions?.en;
  return d && Array.isArray(d.blocks) ? d : null;
};

/** /instructions: the template's heading, blocks and declaration (placeholders filled by the server), else frozen */
export function pageInstructions(t: StudentExamTemplate | null, test: { name?: string; duration?: number } | null, lang: ExamLang): ExamInstructions {
  const frozen = frozenInstructions(test, lang);
  const d = docOf(t, lang);
  if (!d) return frozen;
  return {
    heading: d.heading?.trim() ? d.heading : frozen.heading,
    blocks: d.blocks.map((b) => ({ id: b.id, title: b.title, lines: Array.isArray(b.lines) ? b.lines : [] })),
    declaration: d.declaration?.trim() ? d.declaration : frozen.declaration,
  };
}

// The first general line carries the test's name and duration; any filled form of the NTA line counts as unchanged.
const DURATION_LINE = { en: /^Total duration of .+ is \d+(\.\d+)? min\.$/, hi: /^.+ की कुल अवधि \d+(\.\d+)? मिनट है।$/ };

/**
 * The /test "View Instruction" dialog. It always printed the frozen lists (English titles, the generic duration line);
 * a block the template leaves as in NTA standard keeps that frozen look, a changed or new block shows the template's
 * text. Without a template: exactly the frozen dialog.
 */
export function dialogInstructions(t: StudentExamTemplate | null, lang: ExamLang): InstructionBlock[] {
  const frozenBlock = (id: string): InstructionBlock => ({ id, title: TITLES[id].en, lines: FROZEN_LINES[id].map((x) => x.content[lang]) });
  const d = docOf(t, lang);
  if (!d) return ["general", "navigating", "answering", "sections"].map(frozenBlock);
  return d.blocks.map((b) => {
    const frozen = FROZEN_LINES[b.id];
    const lines = Array.isArray(b.lines) ? b.lines : [];
    const sameTitle = TITLES[b.id] && (b.title === TITLES[b.id].en || b.title === TITLES[b.id].hi);
    const sameLines =
      !!frozen &&
      lines.length === frozen.length &&
      lines.every((l, i) => l === frozen[i].content[lang] || l === frozen[i].content.en || (b.id === "general" && i === 0 && DURATION_LINE[lang].test(l)));
    if (sameTitle && sameLines) return frozenBlock(b.id);
    return { id: b.id, title: sameTitle ? TITLES[b.id].en : b.title, lines };
  });
}
