"use client";

import { useRouter } from "next/navigation";
import { InkUnderline } from "@iitpulse/ui";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/shell/avatar";
import { useAuthHydrated, useAuthStore } from "@/stores";

/**
 * /profile placeholder (Student-Profile arrives in M4): who is signed in, and sign out.
 * The header avatar opens this page on desktop and on phones.
 */
export default function ProfilePage() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const { currentUser, logout } = useAuthStore();
  const name = hydrated ? currentUser?.name : undefined;
  const email = hydrated ? currentUser?.email : undefined;

  const signOut = () => {
    logout();
    router.replace("/login");
  };

  return (
    <section className="col rise mx-auto max-w-[560px] gap-6 pt-6 md:pt-12">
      <h1 className="h1">
        <InkUnderline delay={300}>Profile</InkUnderline>
      </h1>
      <div className="card pad row gap-4">
        <Avatar name={name} email={email} />
        <div className="col grow gap-0.5">
          <span className="h3 truncate">{name || "Signed in"}</span>
          {email && <span className="sm muted truncate">{email}</span>}
        </div>
      </div>
      <p className="sm muted m-0">Preferences and your details will be editable here soon.</p>
      <div>
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </section>
  );
}
