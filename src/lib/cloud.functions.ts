// Server functions to persist the app DB in Lovable Cloud
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const STATE_ID = "main";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StateObj = Record<string, any>;

const hasHistory = (d: unknown): boolean => {
  if (!d || typeof d !== "object") return false;
  const x = d as Record<string, unknown[]>;
  const len = (k: string) => (Array.isArray(x[k]) ? x[k].length : 0);
  return len("orders") + len("sales") + len("applications") + len("expenses") + len("protocols") > 0;
};

function checkPass(pass: string) {
  if (pass !== "AeternumPeps$" && pass !== "DharmanPeps$") {
    throw new Error("Unauthorized");
  }
}

export const loadCloudState = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ pass: z.string().min(8).max(64) }).parse(i))
  .handler(async ({ data }) => {
    checkPass(data.pass);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as unknown as { from: (t: string) => any };
    const { data: row, error } = await admin
      .from("app_state")
      .select("data")
      .eq("id", STATE_ID)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const state: StateObj | null = (row?.data as StateObj | null) ?? null;
    return { state };
  });

export const saveCloudState = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        pass: z.string().min(8).max(64),
        state: z.record(z.any()),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    checkPass(data.pass);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as unknown as { from: (t: string) => any };
    const { data: row } = await admin
      .from("app_state")
      .select("data")
      .eq("id", STATE_ID)
      .maybeSingle();
    // Proteção: nunca sobrescrever dados existentes com um estado vazio
    if (row && hasHistory(row.data) && !hasHistory(data.state)) {
      return { ok: false, reason: "refused-empty-overwrite" };
    }
    const { error } = await admin.from("app_state").upsert({
      id: STATE_ID,
      data: data.state,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true, reason: "" };
  });
