import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { brl, byDateDesc, jsonResult, loadAppState } from "../state";

export default defineTool({
  name: "list_sales",
  title: "Listar vendas",
  description:
    "List sales with client, product, quantity, revenue, product cost, commissions and profit. Optionally filter by sale type (normal, sample, marco).",
  inputSchema: {
    limit: z.number().int().describe("How many of the most recent sales to return (1-100)."),
    type: z
      .string()
      .nullable()
      .describe('Optional sale type filter: "normal", "sample" or "marco". Use null for all.'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, type }, ctx) => {
    const db = await loadAppState(ctx);
    const take = Math.min(Math.max(Math.trunc(limit) || 20, 1), 100);
    const filter = type?.trim().toLowerCase();
    const filtered = filter ? db.sales.filter((s) => s.type === filter) : db.sales;
    const sales = [...filtered].sort(byDateDesc).slice(0, take).map((s) => ({
      id: s.id,
      data: s.date,
      cliente: s.client,
      produto: s.productName,
      qtd: s.qty,
      precoUnitario: s.salePrice,
      desconto: s.discount,
      tipo: s.type,
      custoOperacional: s.operationalCost ?? 0,
      comissoes: [s.commission1, s.commission2].filter(Boolean),
      receitaBruta: s.grossRevenue,
      receitaLiquida: s.netRevenue,
      custoProduto: s.productCost,
      lucro: s.profit,
    }));
    const profit = sales.reduce((acc, s) => acc + (s.lucro || 0), 0);
    return jsonResult(
      sales,
      `${sales.length} venda(s) retornada(s) · lucro somado ${brl(profit)}`,
    );
  },
});
