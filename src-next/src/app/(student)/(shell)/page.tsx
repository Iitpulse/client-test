import type { Metadata } from "next";
import { HomeView } from "@/components/student/home-view";

export const metadata: Metadata = { title: "Home · IIT-PULSE" };

// "/" is the Home tab (Student-Home, Phone-Home). Signed-out visitors are sent to /login by the shell.
export default function HomePage() {
  return <HomeView />;
}
