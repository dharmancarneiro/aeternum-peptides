import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";

export type AppOrder = {
  id: string;
  date: string;
  supplier: string;
  products: {
    name: string;
    boxQty?: number;
    frascosPerBox?: number;
    qty?: number;
    mgPerVial: number;
    priceUSD: number;
    status: string;
    usage: string;
    consumed?: number;
  }[];
  freightChina: number;
  freightUSA: number;
  freightBR: number;
  totalCost: number;
};

export type AppSale = {
  id: string;
  date: string;
  client: string;
  productName: string;
  qty: number;
  salePrice: number;
  discount: number;
  type: string;
  operationalCost?: number;
  commission1?: { name: string; amount: number };
  commission2?: { name: string; amount: number };
  grossRevenue: number;
  netRevenue: number;
  productCost: number;
  profit: number;
};

export type AppExpense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
};

export type AppInventoryItem = {
  name: string;
  mgPerVial: number;
  vials: number;
  totalCost: number;
};

export type AppProtocol = {
  id: string;
  peptideName: string;
  currentStock: number;
  vials: number;
  dailyDosage: number;
  applicationTime: string;
  daysOfWeek: string[];
};

export type AppApplication = {
  id: string;
  dateTime: string;
  peptideName: string;
  dose: number;
  status: string;
};

export type AppState = {
  orders: AppOrder[];
  sales: AppSale[];
  inventory: Record<string, AppInventoryItem>;
  inventoryConsumo: Record<string, AppInventoryItem>;
  protocols: AppProtocol[];
  applications: AppApplication[];
  expenses: AppExpense[];
  marcoWithdrawals: { id: string; date: string; product: string; qty: number; unitCost: number }[];
};

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const obj = <T>(v: unknown): Record<string, T> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, T>) : {};

/** Loads the business data record as the signed-in user (database rules apply). */
export async function loadAppState(ctx: ToolContext): Promise<AppState> {
  if (!ctx.isAuthenticated()) {
    throw new ToolError("Not authenticated. Sign in to this app first.");
  }
  const supabase = supabaseForUser(ctx);
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", "main")
    .maybeSingle();
  if (error) throw new ToolError(error.message);
  if (!data) {
    throw new ToolError(
      "No business data is available for this account. Ask the workspace owner to grant access.",
    );
  }
  const raw = (data.data ?? {}) as Record<string, unknown>;
  return {
    orders: arr<AppOrder>(raw.orders),
    sales: arr<AppSale>(raw.sales),
    inventory: obj<AppInventoryItem>(raw.inventory),
    inventoryConsumo: obj<AppInventoryItem>(raw.inventoryConsumo),
    protocols: arr<AppProtocol>(raw.protocols),
    applications: arr<AppApplication>(raw.applications),
    expenses: arr<AppExpense>(raw.expenses),
    marcoWithdrawals: arr<AppState["marcoWithdrawals"][number]>(raw.marcoWithdrawals),
  };
}

export const vialsOf = (p: { boxQty?: number; frascosPerBox?: number; qty?: number }) =>
  (p.boxQty ?? p.qty ?? 0) * (p.frascosPerBox ?? 1);

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const byDateDesc = <T extends { date?: string; dateTime?: string }>(a: T, b: T) =>
  new Date(b.date ?? b.dateTime ?? 0).getTime() - new Date(a.date ?? a.dateTime ?? 0).getTime();

export const jsonResult = (payload: unknown, summary: string) => ({
  content: [{ type: "text" as const, text: `${summary}\n\n${JSON.stringify(payload, null, 2)}` }],
});
