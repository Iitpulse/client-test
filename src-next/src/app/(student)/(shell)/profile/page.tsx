import type { Metadata } from "next";
import { ProfileView } from "@/components/student/profile-view";

export const metadata: Metadata = { title: "Profile · IIT-PULSE" };

// Student-Profile (M4). The header avatar opens it on desktop and on phones.
export default function ProfilePage() {
  return <ProfileView />;
}
