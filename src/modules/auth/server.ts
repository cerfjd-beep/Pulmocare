import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { parseAccess, portals, type Portal } from "./access";

export const getAccount = cache(async () => {
  try {
    const client = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) return null;
    const result = await client.rpc("get_my_access");
    return {
      email: user.email ?? "",
      access: parseAccess(result.data),
      unavailable: Boolean(result.error),
    };
  } catch {
    return null;
  }
});
export async function requirePortal(portal: Portal) {
  const account = await getAccount();
  if (!account) redirect("/ingresar");
  if (!portals(account.access).includes(portal)) redirect("/cuenta");
  return account;
}
