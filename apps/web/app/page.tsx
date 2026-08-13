import Link from "next/link";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/logout-button";

export default async function HomePage() {
  const session = await auth();

  return (
    <main>
      <h1>JobMatch Copilot</h1>
      {session?.user ? (
        <p>
          Logged in as {session.user.email} — <LogoutButton />
        </p>
      ) : (
        <p>
          <Link href="/login">Login</Link>
        </p>
      )}
    </main>
  );
}
