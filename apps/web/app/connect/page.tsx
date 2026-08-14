import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LogoutButton } from "./logout-button";
import { PluginConnection } from "./plugin-connection";

export default async function ConnectPage() {
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
      <h1 style={{ fontSize: 18 }}>JobMatch Copilot</h1>
      <p>
        Logged in as {session.user.email} — <LogoutButton />
      </p>
      <h2 style={{ fontSize: 15 }}>Connect the Plugin</h2>
      <PluginConnection />
    </main>
  );
}
