import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SearchCriteriaForm } from "../search-criteria-form";

export default async function NewSearchCriteriaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main
      style={{
        maxWidth: 560,
        margin: "48px auto",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
      }}
    >
      <h1 style={{ fontSize: 18 }}>New search criteria</h1>
      <SearchCriteriaForm />
    </main>
  );
}
