import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { AeternumLogo } from "@/components/AeternumLogo";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clearRole, getRole, getInfluencerName, useDB, fmtBRL, type Sale } from "@/lib/storage";
import { LogOut, DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/influencer")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ÆTERNUM Peptides — Painel do Influenciador" },
      { name: "description", content: "Suas vendas e comissões." },
    ],
  }),
  component: InfluencerPanel,
});

const parseDay = (d: string) => new Date(d.length <= 10 ? `${d}T00:00:00` : d);
const nameMatches = (a?: string, b?: string) =>
  (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

function InfluencerPanel() {
  const navigate = useNavigate();
  const name = typeof window !== "undefined" ? getInfluencerName() : null;

  useEffect(() => {
    if (getRole() !== "influencer" || !getInfluencerName()) navigate({ to: "/" });
  }, [navigate]);

  const { db } = useDB();

  const rows = useMemo(() => {
    if (!name) return [] as { sale: Sale; amount: number }[];
    const out: { sale: Sale; amount: number }[] = [];
    for (const s of db.sales) {
      let amount = 0;
      if (nameMatches(s.commission1?.name, name)) amount += s.commission1?.amount || 0;
      if (nameMatches(s.commission2?.name, name)) amount += s.commission2?.amount || 0;
      if (amount > 0) out.push({ sale: s, amount });
    }
    return out.sort((a, b) => b.sale.date.localeCompare(a.sale.date));
  }, [db.sales, name]);

  const totals = useMemo(() => {
    const sales = rows.length;
    const qty = rows.reduce((s, r) => s + r.sale.qty, 0);
    const value = rows.reduce((s, r) => s + r.sale.grossRevenue, 0);
    const commission = rows.reduce((s, r) => s + r.amount, 0);
    return { sales, qty, value, commission };
  }, [rows]);

  const logout = () => { clearRole(); navigate({ to: "/" }); };

  return (
    <div className="min-h-screen dna-pattern pb-20">
      <Toaster theme="dark" />

      <header className="border-b border-primary/20 bg-background/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AeternumLogo size={48} glow={false} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">ÆTERNUM Peptides</p>
              <h1 className="text-lg font-serif font-bold gold-text">Painel de {name || "Influenciador"}</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="border-primary/40">
            <LogOut className="w-4 h-4 mr-1" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric icon={<ShoppingCart />} label="Vendas" value={String(totals.sales)} />
          <Metric icon={<TrendingUp />} label="Frascos" value={String(totals.qty)} />
          <Metric icon={<DollarSign />} label="Valor Vendido" value={fmtBRL(totals.value)} />
          <Metric icon={<DollarSign />} label="Minha Comissão" value={fmtBRL(totals.commission)} highlight />
        </div>

        <div className="glass-card rounded-xl p-6 overflow-x-auto">
          <h3 className="font-serif text-xl gold-text mb-4">Minhas Vendas</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead className="text-right">Valor da Venda</TableHead>
              <TableHead className="text-right">Minha Comissão</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma venda com sua comissão ainda.</TableCell></TableRow>}
              {rows.map(r => (
                <TableRow key={r.sale.id}>
                  <TableCell>{format(parseDay(r.sale.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{r.sale.productName}</TableCell>
                  <TableCell>{r.sale.qty}</TableCell>
                  <TableCell className="text-right">{fmtBRL(r.sale.grossRevenue)}</TableCell>
                  <TableCell className="text-right text-primary font-semibold">{fmtBRL(r.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <p className={`font-display text-2xl font-semibold ${highlight ? "gold-text" : "text-primary"}`}>{value}</p>
    </div>
  );
}
