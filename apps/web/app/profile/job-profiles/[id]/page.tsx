import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JobProfileForm } from "../job-profile-form";

export default async function EditJobProfilePage({
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
      <h1 style={{ fontSize: 18 }}>Edit job profile</h1>
      <JobProfileForm jobProfileId={id} />
    </main>
  );
}
