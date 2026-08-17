import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ApplicationDraftDetail } from "./application-draft-detail";

export default async function ApplicationDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  return (
    <main
      style={{
        maxWidth: 560,
        margin: "48px auto",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
      }}
    >
      <ApplicationDraftDetail applicationDraftId={id} />
    </main>
  );
}
