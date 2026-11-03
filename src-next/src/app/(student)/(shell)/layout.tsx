import { StudentShell } from "@/components/shell/student-shell";

// Signed-in student screens: StudentNav on desktop, compact header + PhoneTabBar on phones.
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
