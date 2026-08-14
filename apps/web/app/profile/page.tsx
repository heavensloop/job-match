import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PersonForm } from "./person-form";

export default async function ProfilePage() {
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
      <h1 style={{ fontSize: 18 }}>Your details</h1>
      <p style={{ color: "#444" }}>
        Shared across every job profile — edit once, applies everywhere.
      </p>
      <PersonForm />
      <p style={{ marginTop: 24 }}>
        <Link href="/profile/job-profiles">Manage job profiles →</Link>
      </p>
    </main>
  );
}
