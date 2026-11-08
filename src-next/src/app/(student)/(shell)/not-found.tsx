import { ErrorScreen } from "@/components/student/error-screen";

// Student-ErrorPages "Not found" inside the app frame (a signed-in page that calls notFound()). Unmatched URLs get
// app/global-not-found.tsx, which has no frame.
export default function ShellNotFound() {
  return (
    <ErrorScreen
      mark="404"
      title="Page not found"
      body="The link may be old or mistyped. Everything of yours is where it was."
      bodyShort="The link may be old or mistyped."
      primary={{ label: "Go to Home", href: "/" }}
      secondary={{ label: "See your tests", href: "/tests" }}
    />
  );
}
