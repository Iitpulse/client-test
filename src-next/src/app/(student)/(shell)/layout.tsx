import { StudentShell } from "@/components/shell/student-shell";
import { QueryProvider } from "@/lib/query";
import "@/app/b9.css"; // classes card, class drawer, the bell (every signed-in screen)

// Signed-in student screens: StudentNav on desktop, the phone header and PhoneTabBar on phones (per screen, see
// StudentShell). TanStack Query serves their data (Home, Tests, Results).
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <StudentShell>{children}</StudentShell>
    </QueryProvider>
  );
}
