import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { brl, byDateDesc, jsonResult, loadAppState } from "../state";

export default defineTool({
  name: "list_expenses",
  title: "Listar despesas",
  description: "List expenses and investments with date, description, category and amount in BRL.",
  inputSchema: {
    limit: z.number().int().describe("How many of the most recent expenses to return (1-100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const db = await loadAppState(ctx);
    const take = Math.min(Math.max(Math.trunc(limit) || 20, 1), 100);
    const expenses = [...db.expenses].sort(byDateDesc).slice(0, take).map((e) => ({
      id: e.id,
      data: e.date,
      descricao: e.description,
      categoria: e.category ?? "",
      valorBRL: e.amount,
    }));
    const total = db.expenses.reduce((s, e) => s + (e.amount || 0), 0);
    return jsonResult(expenses, `${expenses.length} despesa(s) · total geral ${brl(total)}`);
  },
});
