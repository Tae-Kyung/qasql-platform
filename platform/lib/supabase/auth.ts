import { redirect } from "next/navigation";
import { createClient } from "./server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUserOrRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getUserPlan(userId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("qasql_profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  return ((data as { plan?: string } | null)?.plan ?? "free") as
    | "free"
    | "pro"
    | "enterprise";
}
