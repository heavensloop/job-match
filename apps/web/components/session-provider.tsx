"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

// Thin wrapper so app/layout.tsx (a Server Component) can still provide
// session context to client components (/login, /connect) that need
// useSession()/signIn()/signOut().
export function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
