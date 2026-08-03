import { defineTool } from "@lovable.dev/mcp-js";
import { brl, jsonResult, loadAppState } from "../state";

const MARCO_UNIT_COST_BRL = 500;

export default defineTool({
  name: "get_marco_partnership",
  title: "Parceria Marco Túlio",
  description:
    "Marco Túlio partnership report: partnership sales, operational costs, 50/50 profit distribution for each partner, Marco withdrawals and the net balance to pay.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const db = await loadAppState(ctx);
    const sales = db.sales.filter((s) => s.type === "marco");
    const operations = sales.map((s) => {
      const cost = MARCO_UNIT_COST_BRL * s.qty + (s.operationalCost || 0);
      const partnershipProfit = Math.max(0, (s.netRevenue || 0) - cost);
      const share = partnershipProfit / 2;
      return {
        data: s.date,
        produto: s.productName,
        qtd: s.qty,
        receitaLiquida: s.netRevenue,
        custoUnitario: MARCO_UNIT_COST_BRL,
        custoOperacional: s.operationalCost ?? 0,
        lucroParceria: partnershipProfit,
        distribuicaoSocioMarcos: share,
        distribuicaoSocioDharman: share,
      };
    });
    const totalShare = operations.reduce((s, o) => s + o.distribuicaoSocioMarcos, 0);
    const withdrawals = db.marcoWithdrawals.map((w) => ({
      data: w.date,
      produto: w.product,
      qtd: w.qty,
      custoUnitario: w.unitCost,
      total: w.qty * w.unitCost,
    }));
    const totalWithdrawals = withdrawals.reduce((s, w) => s + w.total, 0);
    return jsonResult(
      {
        operacoes: operations,
        distribuicaoSocioMarcos: totalShare,
        distribuicaoSocioDharman: totalShare,
        retiradasMarco: withdrawals,
        totalRetiradas: totalWithdrawals,
        saldoLiquidoAPagarMarco: totalShare - totalWithdrawals,
      },
      `Distribuição por sócio ${brl(totalShare)} · retiradas ${brl(totalWithdrawals)} · saldo líquido ${brl(totalShare - totalWithdrawals)}`,
    );
  },
});
