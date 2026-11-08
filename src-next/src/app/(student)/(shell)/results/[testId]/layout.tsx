// KaTeX's CSS comes with the components that render equations (question-body, review-parts, review-ai,
// doubt-chat, and MathLite's lazy chunk), so the result summary's first paint does not wait for it.
import "@/app/m4.css"; // the inline doubt chat and Phone-Doubt (M4)

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
