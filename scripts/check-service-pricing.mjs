import { createClient } from "@supabase/supabase-js";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
const { data, error } = await client.rpc("get_service_offers");
console.log(error ? { code: error.code, message: error.message } : { offers: data.length });
if (error) process.exitCode = 1;
