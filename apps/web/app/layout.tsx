import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: "JobMatch Copilot",
  description:
    "Scores job postings against your profile and autofills applications.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
