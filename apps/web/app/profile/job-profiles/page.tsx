import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JobProfileList } from "./job-profile-list";

export default async function JobProfilesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main
      style={{
        maxWidth: 480,
        margin: "48px auto",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
      }}
    >
      <h1 style={{ fontSize: 18 }}>Job profiles</h1>
      <p style={{ color: "#444" }}>
        <Link href="/profile">← Your details</Link>
      </p>
      <JobProfileList />
    </main>
  );
}
