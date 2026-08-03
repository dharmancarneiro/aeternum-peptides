import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getBusinessSummary from "./tools/get-business-summary";
import listOrders from "./tools/list-orders";
import listSales from "./tools/list-sales";
import getInventory from "./tools/get-inventory";
import listExpenses from "./tools/list-expenses";
import getProtocols from "./tools/get-protocols";
import getMarcoPartnership from "./tools/get-marco-partnership";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "aeternum-management-suite",
  title: "Aeternum Management Suite",
  version: "0.1.0",
  instructions:
    "Read-only tools for the ÆTERNUM Peptides management suite. Use get_business_summary for overall financial numbers, list_orders / list_sales / list_expenses for records, get_inventory for current stock, get_protocols for personal peptide protocols, and get_marco_partnership for the Marco Túlio partnership report. All monetary values are in BRL (R$).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getBusinessSummary,
    listOrders,
    listSales,
    getInventory,
    listExpenses,
    getProtocols,
    getMarcoPartnership,
  ],
});
