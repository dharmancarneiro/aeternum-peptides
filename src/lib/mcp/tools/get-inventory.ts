import { defineTool } from "@lovable.dev/mcp-js";
import { jsonResult, loadAppState } from "../state";

const map = (inv: Record<string, { name: string; mgPerVial: number; vials: number; totalCost: number }>) =>
  Object.values(inv).map((i) => ({
    nome: i.name,
    frascos: Number(i.vials.toFixed(2)),
    mgPorFrasco: i.mgPerVial,
    custoTotalBRL: Number(i.totalCost.toFixed(2)),
    custoPorFrascoBRL: i.vials > 0 ? Number((i.totalCost / i.vials).toFixed(2)) : 0,
  }));

export default defineTool({
  name: "get_inventory",
  title: "Estoque atual",
  description:
    "Current stock split into resale (revenda) and personal use (consumo), with vials, real cost per vial and total cost in BRL.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const db = await loadAppState(ctx);
    const payload = { revenda: map(db.inventory), consumo: map(db.inventoryConsumo) };
    return jsonResult(
      payload,
      `${payload.revenda.length} item(ns) em revenda e ${payload.consumo.length} em consumo.`,
    );
  },
});
