import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Settings from "@/screens/Settings";

export default async function Page() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("postfork_user_id")?.value;
  if (!userId) {
    redirect("/");
  }

  return <Settings />;
}