// Cliente Supabase do servidor (chave service_role) — nunca importar no navegador
import { createClient } from "@supabase/supabase-js";

const url =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_secret_placeholder";

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
