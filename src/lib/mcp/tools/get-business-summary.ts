import { defineTool } from "@lovable.dev/mcp-js";
import { brl, jsonResult, loadAppState } from "../state";

export default defineTool({
  name: "get_business_summary",
  title: "Resumo do negócio",
  description:
    "Overall financial summary of the peptide business: revenue, profit, investment, expenses, stock value and counts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const db = await loadAppState(ctx);
    const grossRevenue = db.sales.reduce((s, v) => s + (v.grossRevenue || 0), 0);
    const netRevenue = db.sales.reduce((s, v) => s + (v.netRevenue || 0), 0);
    const profit = db.sales.reduce((s, v) => s + (v.profit || 0), 0);
    const ordersCost = db.orders.reduce((s, o) => s + (o.totalCost || 0), 0);
    const expenses = db.expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const stockValue =
      Object.values(db.inventory).reduce((s, i) => s + (i.totalCost || 0), 0) +
      Object.values(db.inventoryConsumo).reduce((s, i) => s + (i.totalCost || 0), 0);
    const summary = {
      receitaBruta: grossRevenue,
      receitaLiquida: netRevenue,
      lucroSobreVendas: profit,
      investimentoEmPedidos: ordersCost,
      despesas: expenses,
      valorEmEstoque: stockValue,
      totais: {
        pedidos: db.orders.length,
        vendas: db.sales.length,
        despesas: db.expenses.length,
        protocolos: db.protocols.length,
        aplicacoes: db.applications.length,
      },
    };
    return jsonResult(
      summary,
      `Receita bruta ${brl(grossRevenue)} · Lucro ${brl(profit)} · Investimento em pedidos ${brl(ordersCost)}`,
    );
  },
});
