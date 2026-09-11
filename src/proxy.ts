import type { NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/integrations/supabase/session";

export async function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: ["/solicitar", "/mis-citas", "/equipo/:path*", "/admin/:path*"],
};
