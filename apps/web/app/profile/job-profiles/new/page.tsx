import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JobProfileForm } from "../job-profile-form";

export default async function NewJobProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main
      style={{
        maxWidth: 560,
        margin: "48px auto",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
      }}
    >
      <h1 style={{ fontSize: 18 }}>New job profile</h1>
      {/* useSearchParams() (for ?duplicate=<id>) requires a Suspense
          boundary in the App Router. */}
      <Suspense fallback={<p>Loading…</p>}>
        <JobProfileForm />
      </Suspense>
    </main>
  );
}
