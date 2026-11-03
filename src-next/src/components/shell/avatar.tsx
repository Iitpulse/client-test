import { cn } from "@/lib/utils";

/** Two initials from a name ("Aarav Jain" -> "AJ"), or from the email's local part when no name is known. */
export function initialsOf(name?: string, email?: string): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  const local = (email || "").split("@")[0]?.replace(/[^a-zA-Z]/g, "") || "";
  return local.slice(0, 2).toUpperCase() || "?";
}

/** The boards' .avatar (36px; 32px in the phone header). */
export function Avatar({ name, email, size = 36, className }: { name?: string; email?: string; size?: 32 | 36; className?: string }) {
  return (
    <span className={cn("avatar", className)} style={size === 32 ? { width: 32, height: 32, fontSize: 12 } : undefined} aria-hidden="true">
      {initialsOf(name, email)}
    </span>
  );
}
