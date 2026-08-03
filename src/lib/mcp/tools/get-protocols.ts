import { defineTool } from "@lovable.dev/mcp-js";
import { jsonResult, loadAppState } from "../state";

export default defineTool({
  name: "get_protocols",
  title: "Protocolos pessoais",
  description:
    "Personal peptide protocols with current mg stock, vials, daily dosage, schedule, estimated days of stock left and the most recent applications.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const db = await loadAppState(ctx);
    const protocols = db.protocols.map((p) => {
      const activeDays = p.daysOfWeek?.length || 7;
      const dailyAvg = (p.dailyDosage * activeDays) / 7;
      return {
        id: p.id,
        peptideo: p.peptideName,
        estoqueMg: Number((p.currentStock || 0).toFixed(2)),
        frascos: Number((p.vials || 0).toFixed(2)),
        doseDiariaMg: p.dailyDosage,
        horario: p.applicationTime,
        dias: p.daysOfWeek,
        diasDeEstoqueRestante: dailyAvg > 0 ? Math.floor(p.currentStock / dailyAvg) : null,
      };
    });
    const applications = [...db.applications]
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      .slice(0, 20)
      .map((a) => ({
        dataHora: a.dateTime,
        peptideo: a.peptideName,
        doseMg: a.dose,
        status: a.status,
      }));
    return jsonResult(
      { protocolos: protocols, ultimasAplicacoes: applications },
      `${protocols.length} protocolo(s) e ${db.applications.length} aplicação(ões) registradas.`,
    );
  },
});
