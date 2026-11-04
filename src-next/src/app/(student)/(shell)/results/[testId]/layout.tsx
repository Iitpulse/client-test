// The result and review screens render equations (MathText, KaTeX), so KaTeX's CSS loads here and nowhere else
// in the signed-in app: Home and Tests stay free of its 20 KB of CSS and font faces.
import "katex/dist/katex.min.css";

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
