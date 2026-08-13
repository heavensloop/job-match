"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button type="button" onClick={() => signOut({ callbackUrl: "/login" })}>
      Logout
    </button>
  );
}
