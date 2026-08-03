import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AeternumLogo } from "@/components/AeternumLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useDB, uid, fmtPct, clearRole, getRole, stockDurationDays,
  adherence, dayIdFromDate, DAYS, recomputeInventories,
} from "@/lib/storage";
import { LogOut, Check, X, Package, AlertTriangle, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/user")({
  ssr: false,
  component: UserPanel,
});

function UserPanel() {
  const navigate = useNavigate();
  useEffect(() => { if (getRole() !== "user") navigate({ to: "/" }); }, [navigate]);

  const { db, update } = useDB();
  const [now] = useState(() => new Date());
  const todayId = dayIdFromDate(now);
  const todayKey = now.toISOString().slice(0, 10);

  const todaysProtocols = useMemo(
    () => db.protocols.filter(p => p.daysOfWeek.includes(todayId))
      .sort((a, b) => a.applicationTime.localeCompare(b.applicationTime)),
    [db.protocols, todayId]
  );

  const isDoneToday = (peptideId: string) =>
    db.applications.some(a => a.peptideId === peptideId && a.dateTime.startsWith(todayKey));

  const apply = (id: string) => {
    const p = db.protocols.find(x => x.id === id);
    if (!p) return;
    update(d => {
      const proto = d.protocols.find(x => x.id === id)!;
      d.applications.push({ id: uid(), dateTime: new Date().toISOString(), peptideId: id, peptideName: proto.peptideName, dose: proto.dailyDosage, status: "applied" });
      recomputeInventories(d);
    });
    toast.success(`✅ ${p.peptideName} aplicado com sucesso!`);
  };

  const skip = (id: string) => {
    const p = db.protocols.find(x => x.id === id);
    if (!p) return;
    update(d => { d.applications.push({ id: uid(), dateTime: new Date().toISOString(), peptideId: id, peptideName: p.peptideName, dose: p.dailyDosage, status: "skipped" }); });
    toast.warning("⚠️ Aplicação pulada");
  };

  const week = adherence(db.applications, 7);
  const month = adherence(db.applications, 30);

  const logout = () => { clearRole(); navigate({ to: "/" }); };

  return (
    <div className="min-h-screen dna-pattern pb-16">
      <Toaster theme="dark" />

      <header className="border-b border-primary/20 bg-background/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AeternumLogo size={48} glow={false} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">ÆTERNUM Peptides</p>
              <h1 className="text-lg font-serif font-bold gold-text">Bem-vindo, Dharman</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="border-primary/40"><LogOut className="w-4 h-4 mr-1" /> Sair</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Today */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-primary w-5 h-5" />
            <h2 className="font-serif text-2xl gold-text capitalize">
              {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
          </div>
          <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Protocolo de Hoje</h3>
          {todaysProtocols.length === 0 && (
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">Nenhuma aplicação agendada para hoje</div>
          )}
          <div className="space-y-3">
            {todaysProtocols.map(p => {
              const done = isDoneToday(p.id);
              return (
                <div key={p.id} className={`glass-card rounded-xl p-5 transition ${done ? "opacity-70" : "hover:gold-glow"}`}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full gold-gradient flex items-center justify-center font-display text-xl font-bold">
                        {p.applicationTime}
                      </div>
                      <div>
                        <h4 className="font-serif text-xl text-primary">{p.peptideName}</h4>
                        <p className="text-sm text-muted-foreground">{p.dailyDosage} mg · subcutânea</p>
                      </div>
                    </div>
                    {done ? (
                      <Badge className="bg-[oklch(0.7_0.17_155)] text-white text-sm px-4 py-2"><Check className="w-4 h-4 mr-1" /> Aplicado</Badge>
                    ) : (
                      <div className="flex gap-2">
                        <Button onClick={() => apply(p.id)} className="gold-gradient font-semibold"><Check className="w-4 h-4 mr-1" /> Marcar como Aplicado</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="border-destructive/40 text-destructive"><X className="w-4 h-4 mr-1" /> Pular</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Pular aplicação?</AlertDialogTitle>
                              <AlertDialogDescription>Tem certeza que deseja pular a aplicação de {p.peptideName}?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => skip(p.id)}>Pular</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Stock */}
        <section>
          <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Meu Estoque</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {db.protocols.length === 0 && <p className="text-muted-foreground col-span-full">Sem protocolos ativos</p>}
            {db.protocols.map(p => {
              const dur = stockDurationDays(p);
              const low = dur < 30;
              return (
                <div key={p.id} className="glass-card rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-serif text-lg text-primary">{p.peptideName}</h4>
                    {low ? <Badge className="bg-destructive animate-pulse"><AlertTriangle className="w-3 h-3 mr-1" /> REABASTECER</Badge>
                      : <Badge className="bg-[oklch(0.7_0.17_155)] text-white">ESTOQUE OK</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">📦 <span className="text-foreground">{p.currentStock} mg ({p.vials} fr.)</span></p>
                  <p className="text-sm text-muted-foreground"><Clock className="inline w-3 h-3 mr-1" /> Dura <span className="text-foreground">{isFinite(dur) ? `${dur} dias` : "∞"}</span></p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Adherence */}
        <section className="grid md:grid-cols-2 gap-4">
          <AdherenceCard title="Esta Semana" pct={week.pct} applied={week.applied} total={week.total} />
          <AdherenceCard title="Este Mês" pct={month.pct} applied={month.applied} total={month.total} />
        </section>

        {/* History */}
        <section>
          <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Histórico (últimos 7 dias)</h3>
          <div className="glass-card rounded-xl divide-y divide-primary/10">
            {(() => {
              const since = Date.now() - 7 * 86400000;
              const recent = [...db.applications].filter(a => new Date(a.dateTime).getTime() >= since).sort((a, b) => b.dateTime.localeCompare(a.dateTime));
              if (recent.length === 0) return <p className="p-6 text-center text-muted-foreground">Sem registros recentes</p>;
              return recent.map(a => (
                <div key={a.id} className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-foreground">{a.peptideName} · {a.dose} mg</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.dateTime), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                  {a.status === "applied"
                    ? <Badge className="bg-[oklch(0.7_0.17_155)] text-white">Aplicado ✓</Badge>
                    : <Badge variant="outline" className="border-destructive/50 text-destructive">Pulado ✕</Badge>}
                </div>
              ));
            })()}
          </div>
        </section>
      </main>
    </div>
  );
}

function AdherenceCard({ title, pct, applied, total }: { title: string; pct: number; applied: number; total: number }) {
  const good = pct >= 80;
  return (
    <div className="glass-card rounded-xl p-6 space-y-3">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{title}</p>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-5xl font-bold gold-text">{fmtPct(pct)}</span>
        <span className="text-sm text-muted-foreground">de Aderência {good ? "✅" : "⚠️"}</span>
      </div>
      <Progress value={pct} className="h-2" />
      <p className="text-sm text-muted-foreground">{applied}/{total} aplicações realizadas</p>
    </div>
  );
}
