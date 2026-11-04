// The result and review screens render equations (MathText, KaTeX), so KaTeX's CSS loads here and nowhere else
// in the signed-in app: Home and Tests stay free of its 20 KB of CSS and font faces.
import "katex/dist/katex.min.css";
import "@/app/m4.css"; // the inline doubt chat and Phone-Doubt (M4)

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
