// Cliente Supabase do navegador (chave publishable)
import { createClient } from "@supabase/supabase-js";

// Sem credenciais o app roda 100% local (localStorage); a sync ativa ao preencher o .env
const url = (import.meta.env.VITE_SUPABASE_URL as string) || "https://placeholder.supabase.co";
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "sb_publishable_placeholder";

export const supabase = createClient(url, key, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
