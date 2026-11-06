"use client";

// Admin-PreviewStudent (batch 7, canvas v180): the navy preview bar above the real NTA exam screens, and the token
// handshake with the admin tab that opened this one. The admin app opens /preview/<testId>; this page tells its opener
// it is ready, and the opener answers with the staff token (postMessage, checked origin and source; never in the URL,
// never stored). The children are the frozen /test and /instructions pages in preview mode (lib/exam-preview).
import { use, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminOrigin, usePreviewStore } from "@/lib/exam-preview";
import { useTestStore } from "@/stores";
import { toolsOf } from "@/lib/exam-template";

const BAR: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 60,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 12,
  padding: "8px 16px",
  background: "#00007E",
  color: "#fff",
  font: "500 14px/1.3 system-ui, sans-serif",
};
const BTN: React.CSSProperties = {
  background: "rgba(255,255,255,.12)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,.28)",
  borderRadius: 8,
  padding: "6px 12px",
  font: "600 13px/1 system-ui, sans-serif",
  cursor: "pointer",
  minHeight: 32,
};

export default function PreviewLayout({ children, params }: { children: React.ReactNode; params: Promise<{ testId: string }> }) {
  const { testId } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const active = usePreviewStore((s) => s.active && s.testId === testId);
  const lang = usePreviewStore((s) => s.lang);
  const setLang = usePreviewStore((s) => s.setLang);
  const template = useTestStore((s) => s.template);
  const testName = useTestStore((s) => (s.test as { name?: string } | null)?.name);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (active) return;
    const origin = adminOrigin();
    const opener = window.opener as Window | null;
    if (!origin || !opener) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the opener is only known in the browser
      setProblem("Open the preview from the test builder in the admin app.");
      return;
    }
    // A test left over from a student session in this browser must not show here
    useTestStore.setState({ test: null, questions: [], currentQuestion: 0, error: null });
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== opener) return;
      const d = e.data as { type?: string; testId?: string; token?: string } | null;
      if (d?.type !== "iitp-preview-token" || d.testId !== testId || typeof d.token !== "string") return;
      usePreviewStore.getState().start(testId, d.token);
    };
    window.addEventListener("message", onMessage);
    opener.postMessage({ type: "iitp-preview-ready", testId }, origin);
    const t = setTimeout(() => setProblem("The admin tab didn't answer. Open the preview again from the test builder."), 6000);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(t);
    };
  }, [active, testId]);

  const onInstructions = pathname.endsWith("/instructions");
  const bilingual = toolsOf(template).languageSwitch;

  return (
    <>
      <div role="region" aria-label="Preview" style={BAR}>
        <span style={{ fontWeight: 700 }}>Preview as student</span>
        <span style={{ opacity: 0.85, flex: "1 1 260px" }}>
          {testName ? `${testName} · ` : ""}Answers are not saved and the timer doesn&apos;t run.
        </span>
        {bilingual && (
          <span role="group" aria-label="Language" style={{ display: "inline-flex", gap: 4 }}>
            {(["en", "hi"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} style={{ ...BTN, background: lang === l ? "#fff" : BTN.background, color: lang === l ? "#00007E" : "#fff" }}>
                {l === "en" ? "English" : "हिन्दी"}
              </button>
            ))}
          </span>
        )}
        <button type="button" style={BTN} onClick={() => router.push(onInstructions ? `/preview/${encodeURIComponent(testId)}` : `/preview/${encodeURIComponent(testId)}/instructions`)}>
          {onInstructions ? "Back to the paper" : "See the instructions page"}
        </button>
        <button
          type="button"
          style={BTN}
          onClick={() => {
            usePreviewStore.getState().stop();
            window.close();
          }}
        >
          Exit preview
        </button>
      </div>
      {active ? (
        children
      ) : (
        <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", padding: 24, font: "15px/1.5 system-ui, sans-serif", color: "#374151", textAlign: "center" }}>
          {problem ?? "Opening the preview…"}
        </div>
      )}
    </>
  );
}
