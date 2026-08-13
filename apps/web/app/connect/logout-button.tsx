"use client";

import { signOut } from "next-auth/react";
import { PAT_STORAGE_KEY } from "./pat-storage";

export function LogoutButton() {
  function handleLogout() {
    localStorage.removeItem(PAT_STORAGE_KEY);
    void signOut({ callbackUrl: "/login" });
  }

  return (
    <button type="button" onClick={handleLogout}>
      Logout
    </button>
  );
}
