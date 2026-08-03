import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { byDateDesc, jsonResult, loadAppState, vialsOf } from "../state";

export default defineTool({
  name: "list_orders",
  title: "Listar pedidos",
  description:
    "List purchase orders with supplier, freight, total cost in BRL and per-product detail (boxes, vials, arrival status, consumo/revenda).",
  inputSchema: {
    limit: z.number().int().describe("How many of the most recent orders to return (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const db = await loadAppState(ctx);
    const take = Math.min(Math.max(Math.trunc(limit) || 10, 1), 50);
    const orders = [...db.orders].sort(byDateDesc).slice(0, take).map((o) => ({
      id: o.id,
      data: o.date,
      fornecedor: o.supplier,
      freteChinaUSD: o.freightChina,
      freteUSAUSD: o.freightUSA,
      freteBRL: o.freightBR,
      custoTotalBRL: o.totalCost,
      produtos: o.products.map((p) => ({
        nome: p.name,
        boxes: p.boxQty,
        frascosPorBox: p.frascosPerBox,
        frascos: vialsOf(p),
        mgPorFrasco: p.mgPerVial,
        precoBoxUSD: p.priceUSD,
        status: p.status,
        uso: p.usage,
        jaConsumidos: p.consumed ?? 0,
      })),
    }));
    return jsonResult(orders, `${orders.length} pedido(s) de ${db.orders.length} no total.`);
  },
});
