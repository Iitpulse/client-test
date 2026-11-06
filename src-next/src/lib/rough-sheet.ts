// M6 rough sheet (board Exam-Additions, item 7): the student's rough work stays on this device, for this attempt only.
// Never sent, never marked; cleared on submit (test.store submitTest). Each sheet is a PNG data URL in localStorage.

const KEY = (testId: string) => `IITP_ROUGH_SHEET_${testId}`;
export const MAX_SHEETS = 20;

export function loadRoughSheets(testId: string | null): string[] {
  if (!testId) return [""];
  try {
    const v = JSON.parse(localStorage.getItem(KEY(testId)) || "null");
    if (Array.isArray(v) && v.length && v.every((x) => typeof x === "string")) return v.slice(0, MAX_SHEETS);
  } catch {
    // storage blocked or damaged: start with one empty sheet
  }
  return [""];
}

export function saveRoughSheets(testId: string | null, sheets: string[]) {
  if (!testId) return;
  try {
    localStorage.setItem(KEY(testId), JSON.stringify(sheets.slice(0, MAX_SHEETS)));
  } catch {
    // storage full or blocked: the drawing stays on screen until the page is left
  }
}

export function clearRoughSheets(testId: string | null) {
  if (!testId) return;
  try {
    localStorage.removeItem(KEY(testId));
  } catch {
    // storage blocked: nothing was kept
  }
}
