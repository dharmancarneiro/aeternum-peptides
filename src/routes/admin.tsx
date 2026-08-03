import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AeternumLogo } from "@/components/AeternumLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  useDB, uid, fmtBRL, fmtPct, USD_BRL, exportBackup, importBackup,
  clearRole, getRole, stockDurationDays, DAYS,
  recomputeInventories, computeOrderCost, vialsOf, MARCO_UNIT_COST_BRL, MARCO_WITHDRAWAL_CATALOG,
  type Order, type Sale, type Protocol, type OrderProduct, type SaleType, type Expense, type Inventory, type MarcoWithdrawal,
} from "@/lib/storage";
import {
  Download, Upload, LogOut, Plus, Trash2, TrendingUp, DollarSign,
  Wallet, Target, Syringe, Package, ShoppingCart, BarChart3, Pencil, Users,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminPanel,
});

function AdminPanel() {
  const navigate = useNavigate();
  useEffect(() => {
    if (getRole() !== "admin") navigate({ to: "/" });
  }, [navigate]);

  const { db } = useDB();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("orders");

  const totals = useMemo(() => {
    const investment = db.orders.reduce((s, o) => s + o.totalCost, 0);
    const realSales = db.sales.filter(s => s.type !== "sample");
    const grossRevenue = realSales.reduce((s, x) => s + x.netRevenue, 0);
    const totalExpenses = (db.expenses || []).reduce((s, e) => s + e.amount, 0);
    const revenue = grossRevenue - totalExpenses;
    const salesProfit = realSales.reduce((s, x) => s + x.profit, 0) - totalExpenses;
    const breakeven = investment === 0 ? 0 : (revenue / investment) * 100;
    return { investment, revenue, salesProfit, breakeven };
  }, [db]);


  const logout = () => { clearRole(); navigate({ to: "/" }); };

  return (
    <div className="min-h-screen dna-pattern pb-20">
      <Toaster theme="dark" />

      <header className="border-b border-primary/20 bg-background/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AeternumLogo size={48} glow={false} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">ÆTERNUM Peptides</p>
              <h1 className="text-lg font-serif font-bold gold-text">Painel Administrativo</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="application/json" className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try { await importBackup(f); toast.success("Backup importado"); }
                catch { toast.error("Falha ao importar"); }
              }} />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} className="text-primary">
              <Upload className="w-4 h-4 mr-1" /> Importar
            </Button>
            <Button variant="ghost" size="sm" onClick={exportBackup} className="text-primary">
              <Download className="w-4 h-4 mr-1" /> Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="border-primary/40">
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {tab !== "marco" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={<Wallet />} label="Investimento" value={fmtBRL(totals.investment)} tone="red" />
            <MetricCard icon={<DollarSign />} label="Receita" value={fmtBRL(totals.revenue)} tone="green" />
            <MetricCard icon={<Target />} label="Breakeven" value={fmtPct(totals.breakeven)} tone="gold" />
            <MetricCard icon={<TrendingUp />} label="Lucro sobre Vendas" value={fmtBRL(totals.salesProfit)} tone="gold" />
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-card/60 border border-primary/30 p-1 h-auto flex-wrap">
            <TabsTrigger value="orders" className="data-[state=active]:gold-gradient data-[state=active]:text-primary-foreground"><Package className="w-4 h-4 mr-1" /> Pedidos</TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:gold-gradient data-[state=active]:text-primary-foreground"><ShoppingCart className="w-4 h-4 mr-1" /> Vendas</TabsTrigger>
            <TabsTrigger value="marco" className="data-[state=active]:bg-[oklch(0.55_0.18_270)] data-[state=active]:text-white"><DollarSign className="w-4 h-4 mr-1" /> Marco Túlio</TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:gold-gradient data-[state=active]:text-primary-foreground"><BarChart3 className="w-4 h-4 mr-1" /> Relatórios</TabsTrigger>
            <TabsTrigger value="partners" className="data-[state=active]:gold-gradient data-[state=active]:text-primary-foreground"><Users className="w-4 h-4 mr-1" /> Parceiros</TabsTrigger>
            <TabsTrigger value="protocols" className="data-[state=active]:gold-gradient data-[state=active]:text-primary-foreground"><Syringe className="w-4 h-4 mr-1" /> Protocolos</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6"><OrdersTab /></TabsContent>
          <TabsContent value="sales" className="mt-6"><SalesTab /></TabsContent>
          <TabsContent value="marco" className="mt-6"><MarcoTab /></TabsContent>
          <TabsContent value="reports" className="mt-6"><ReportsTab /></TabsContent>
          <TabsContent value="partners" className="mt-6"><PartnersTab /></TabsContent>
          <TabsContent value="protocols" className="mt-6"><ProtocolsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "gold" | "green" | "red" }) {
  const toneClass = tone === "gold" ? "text-primary" : tone === "green" ? "text-[oklch(0.78_0.17_155)]" : "text-[oklch(0.7_0.22_25)]";
  return (
    <div className="glass-card rounded-xl p-5 hover:-translate-y-1 transition-transform">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <span className={toneClass}>{icon}</span>
      </div>
      <p className={`font-display text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</Label>{children}</div>;
}

function Calc({ label, v, highlight }: { label: string; v: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display text-lg ${highlight ? "text-primary font-bold" : ""}`}>{v}</p>
    </div>
  );
}

/** Input numérico que pode ficar vazio (mostra placeholder em vez de 0 travado) */
function NumInput({ value, onValue, ...props }: { value: number; onValue: (v: number) => void }
  & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">) {
  const [text, setText] = useState(value === 0 ? "" : String(value));
  useEffect(() => {
    const parsed = text === "" || text === "-" ? 0 : Number(text);
    if (parsed !== value) setText(value === 0 ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Input
      type="number"
      inputMode="decimal"
      placeholder="0"
      value={text}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        const n = t === "" || t === "-" ? 0 : Number(t);
        if (!Number.isNaN(n)) onValue(n);
      }}
      {...props}
    />
  );
}

/** Datas YYYY-MM-DD sao interpretadas como dia LOCAL (evita cair um dia por fuso) */
const parseDay = (d: string) => new Date(d.length <= 10 ? `${d}T00:00:00` : d);

/* ---------------- ORDERS ---------------- */
const emptyProduct = (): OrderProduct => ({
  name: "", boxQty: 0, frascosPerBox: 0, mgPerVial: 0, priceUSD: 0, priceCurrency: "USD",
  status: "arrived", usage: "consumo", consumed: 0,
});

function OrderForm({ initial, onSave, onCancel, submitLabel }: {
  initial?: Order;
  onSave: (data: Omit<Order, "id" | "totalCost">) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const { db } = useDB();
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState(initial?.supplier || "");
  const [products, setProducts] = useState<OrderProduct[]>(initial?.products?.map(p => ({ ...p })) || [emptyProduct()]);
  const [freightChina, setFreightChina] = useState(initial?.freightChina || 0);
  const [freightUSA, setFreightUSA] = useState(initial?.freightUSA || 0);
  const [freightBR, setFreightBR] = useState(initial?.freightBR || 0);
  const [directBR, setDirectBR] = useState(initial?.directBR || false);

  const calc = useMemo(
    () => computeOrderCost(products, freightChina, freightUSA, freightBR, directBR),
    [products, freightChina, freightUSA, freightBR, directBR]
  );

  const setProd = (i: number, patch: Partial<OrderProduct>) => {
    const c = [...products]; c[i] = { ...c[i], ...patch }; setProducts(c);
  };

  const submit = () => {
    if (!supplier || products.some(p => !p.name)) return toast.error("Preencha fornecedor e nomes dos produtos");
    onSave({ date, supplier, products, freightChina, freightUSA, freightBR, directBR });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Data da Compra *"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Fornecedor *"><Input value={supplier} onChange={e => setSupplier(e.target.value)} /></Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Produtos</Label>
          <Button size="sm" variant="outline" className="border-primary/40" onClick={() => setProducts([...products, emptyProduct()])}>
            <Plus className="w-4 h-4 mr-1" /> Produto
          </Button>
        </div>
        <div className="space-y-3">
          {products.map((p, idx) => {
            const vials = vialsOf(p);
            const per = calc.perProduct[idx];
            const cpv = per?.costPerVial || 0;
            const productTotal = per?.totalCost || 0;
            const onPick = (name: string) => {
              const saved = db.savedProducts?.find(sp => sp.name.toLowerCase() === name.toLowerCase());
              if (saved) setProd(idx, {
                name: saved.name, mgPerVial: saved.mgPerVial, priceUSD: saved.priceUSD, priceCurrency: "USD",
                frascosPerBox: saved.frascosPerBox || p.frascosPerBox,
              });
              else setProd(idx, { name });
            };
            return (
              <div key={idx} className="rounded-lg border border-primary/20 bg-background/30 p-3 space-y-2">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 md:col-span-3">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Peptídeo</Label>
                    <Input list={`prods-${idx}`} placeholder="Nome do peptídeo" value={p.name} onChange={e => onPick(e.target.value)} />
                    <datalist id={`prods-${idx}`}>
                      {(db.savedProducts || []).map(sp => <option key={sp.name} value={sp.name} />)}
                    </datalist>
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Boxes</Label>
                    <NumInput min={0} value={p.boxQty} onValue={v => setProd(idx, { boxQty: v })} />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fr/Box</Label>
                    <NumInput min={1} value={p.frascosPerBox} onValue={v => setProd(idx, { frascosPerBox: v })} />
                  </div>
                  <div className="col-span-4 md:col-span-1 text-center">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</Label>
                    <p className="font-display text-primary py-2">{vials}</p>
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">mg/Frasco</Label>
                    <NumInput value={p.mgPerVial} onValue={v => setProd(idx, { mgPerVial: v })} />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <div className="flex items-center gap-1 mb-0.5">
                      {(["USD", "BRL"] as const).map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setProd(idx, { priceCurrency: c })}
                          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors ${
                            (p.priceCurrency ?? "USD") === c
                              ? "gold-gradient border-transparent font-semibold"
                              : "border-primary/30 text-muted-foreground hover:border-primary/60"
                          }`}
                        >
                          {c === "USD" ? "US$" : "R$"}
                        </button>
                      ))}
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/Box</span>
                    </div>
                    <NumInput step="0.01" value={p.priceUSD} onValue={v => setProd(idx, { priceUSD: v })} />
                  </div>
                  <div className="col-span-10 md:col-span-1 text-right">
                    <p className="text-[10px] uppercase text-muted-foreground">Custo/Frasco</p>
                    <p className="font-display text-primary text-sm">{fmtBRL(cpv)}</p>
                  </div>
                  <div className="col-span-2 md:col-span-1 flex justify-end"><Button variant="ghost" size="icon" onClick={() => setProducts(products.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
                </div>
                <div className="grid md:grid-cols-4 gap-3 pt-1 border-t border-primary/10">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
                    <RadioGroup value={p.status} onValueChange={v => setProd(idx, { status: v as OrderProduct["status"] })} className="flex flex-wrap gap-3 mt-1">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer"><RadioGroupItem value="arrived" /> Chegou</label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer"><RadioGroupItem value="lost" /> Perdida</label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer"><RadioGroupItem value="rebuy" /> Recompra</label>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Destino</Label>
                    <RadioGroup value={p.usage} onValueChange={v => setProd(idx, { usage: v as OrderProduct["usage"] })} className="flex gap-3 mt-1">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer"><RadioGroupItem value="consumo" /> Consumo</label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer"><RadioGroupItem value="revenda" /> Revenda</label>
                    </RadioGroup>
                  </div>
                  {p.usage === "consumo" && p.status === "arrived" && (
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Já consumi (frascos)</Label>
                      <NumInput min={0} max={vials} value={p.consumed || 0} onValue={v => setProd(idx, { consumed: v })} className="mt-1" />
                      <p className="text-[10px] text-muted-foreground mt-1">Restante: {Math.max(0, vials - (p.consumed || 0))}</p>
                    </div>
                  )}
                  <div className="text-right md:text-left">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Custo Total Produto</Label>
                    <p className="font-display text-primary">{fmtBRL(productTotal)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={directBR}
          onChange={e => { setDirectBR(e.target.checked); if (e.target.checked) { setFreightUSA(0); setFreightBR(0); } }}
          className="w-4 h-4 accent-[oklch(0.78_0.13_70)]"
        />
        <span className="text-muted-foreground">Frete direto para o Brasil (não passa pelo Paraguai · sem propina)</span>
      </label>

      <div className="grid md:grid-cols-3 gap-4">
        {directBR ? (
          <Field label="Frete China → Brasil (USD)"><NumInput step="0.01" value={freightChina} onValue={v => setFreightChina(v)} /></Field>
        ) : (
          <Field label="Frete China → USA (USD)"><NumInput step="0.01" value={freightChina} onValue={v => setFreightChina(v)} /></Field>
        )}
        {!directBR && <Field label="Frete USA → Paraguai (USD)"><NumInput step="0.01" value={freightUSA} onValue={v => setFreightUSA(v)} /></Field>}
        {!directBR && <Field label="Frete Paraguai → Brasil (R$)"><NumInput step="0.01" value={freightBR} onValue={v => setFreightBR(v)} /></Field>}
      </div>

      <div className="rounded-lg gold-border p-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
        <Calc label="Produtos (USD)" v={`US$ ${calc.productsUSD.toFixed(2)}`} />
        <Calc label="Produtos (R$)" v={fmtBRL(calc.productsBRL)} />
        <Calc label={directBR ? "Propina PY (isento)" : "Propina PY (US$4/vial)"} v={fmtBRL(calc.propinaBRL)} />
        <Calc label="Frete Total (R$)" v={fmtBRL(calc.freightBRLTotal)} />
        <Calc label="Frete / Frasco" v={fmtBRL(calc.freightPerVial)} />
        <Calc label="Custo Total" v={fmtBRL(calc.totalBRL)} highlight />
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && <Button variant="outline" onClick={onCancel}>Cancelar</Button>}
        <Button onClick={submit} className="gold-gradient"><Plus className="w-4 h-4 mr-1" /> {submitLabel}</Button>
      </div>
    </div>
  );
}

export function OrdersTab() {
  const { db, update } = useDB();
  const [editing, setEditing] = useState<Order | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const orders = useMemo(() => [...db.orders].sort((a,b) => b.date.localeCompare(a.date)), [db.orders]);

  const createOrder = (data: Omit<Order, "id" | "totalCost">) => {
    update(d => {
      d.orders.push({ ...data, id: uid(), totalCost: 0 });
      recomputeInventories(d);
    });
    toast.success("Pedido registrado");
  };

  const saveEdit = (data: Omit<Order, "id" | "totalCost">) => {
    if (!editing) return;
    update(d => {
      const idx = d.orders.findIndex(o => o.id === editing.id);
      if (idx >= 0) d.orders[idx] = { ...editing, ...data, totalCost: 0 };
      recomputeInventories(d);
    });
    setOpenEdit(false); setEditing(null);
    toast.success("Pedido atualizado");
  };

  const remove = (id: string) => {
    update(d => {
      d.orders = d.orders.filter(o => o.id !== id);
      recomputeInventories(d);
    });
    toast.success("Pedido removido");
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-serif text-xl gold-text mb-4">Novo Pedido</h3>
        <OrderForm onSave={createOrder} submitLabel="Registrar Pedido" />
      </div>

      <div className="glass-card rounded-xl p-6 overflow-x-auto">
        <h3 className="font-serif text-xl gold-text mb-4">Pedidos Realizados</h3>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Fornecedor</TableHead>
            <TableHead>Produtos</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">Custo Total</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {orders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem pedidos</TableCell></TableRow>}
            {orders.map(o => {
              const arrived = o.products.filter(p => p.status === "arrived").length;
              const lost = o.products.filter(p => p.status === "lost").length;
              const rebuy = o.products.filter(p => p.status === "rebuy").length;
              return (
                <TableRow key={o.id}>
                  <TableCell>{format(parseDay(o.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{o.supplier}</TableCell>
                  <TableCell className="text-xs">
                    {o.products.map((p, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span>{p.name} ({vialsOf(p)} fr.)</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5">{p.usage}</Badge>
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="text-xs">
                    {arrived > 0 && <Badge className="bg-[oklch(0.7_0.17_155)] text-white mr-1">✓ {arrived}</Badge>}
                    {lost > 0 && <Badge className="bg-destructive mr-1">✗ {lost}</Badge>}
                    {rebuy > 0 && <Badge variant="outline" className="border-primary/50">↻ {rebuy}</Badge>}
                  </TableCell>
                  <TableCell className="text-right text-primary">{fmtBRL(o.totalCost)}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(o); setOpenEdit(true); }}><Pencil className="w-4 h-4 text-primary" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(o.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ExpensesPanel />

      <Dialog open={openEdit} onOpenChange={(o) => { setOpenEdit(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif text-xl gold-text">Editar Pedido</DialogTitle></DialogHeader>
          {editing && <OrderForm initial={editing} onSave={saveEdit} onCancel={() => setOpenEdit(false)} submitLabel="Salvar Alterações" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- SALES ---------------- */
export function SalesTab() {
  const { db, update } = useDB();
  // unifica estoque de revenda + consumo (permite vender produtos marcados como uso pessoal, ex: GH)
  const allInventory: Inventory = { ...db.inventoryConsumo, ...db.inventory };
  const inventoryKeys = Object.keys(allInventory).filter(k => allInventory[k].vials > 0);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    client: "", phone: "",
    productKey: inventoryKeys[0] || "",
    marcoProductName: "",
    qty: 1, salePrice: 0, discount: 0,
    operationalCost: 0,
    type: "normal" as SaleType,
    c1Name: "", c1Mode: "BRL" as "BRL" | "PCT", c1Input: 0,
    c2Name: "", c2Mode: "BRL" as "BRL" | "PCT", c2Input: 0,
  });


  const calc = useMemo(() => {
    const isMarco = form.type === "marco";
    const item = allInventory[form.productKey];

    const gross = form.qty * form.salePrice;
    const c1Amount = form.c1Mode === "PCT" ? gross * (form.c1Input || 0) / 100 : (form.c1Input || 0);
    const c2Amount = form.c2Mode === "PCT" ? gross * (form.c2Input || 0) / 100 : (form.c2Input || 0);
    const commissions = c1Amount + c2Amount;
    const stockCostPerVial = item && item.vials ? item.totalCost / item.vials : 0;

    let net = 0, productCost = 0, profit = 0, costPerVial = 0;
    if (form.type === "sample") {
      productCost = stockCostPerVial * form.qty;
      net = 0;
      profit = -productCost;
      costPerVial = stockCostPerVial;
    } else {
      productCost = stockCostPerVial * form.qty;
      net = gross - form.discount - commissions;
      const gross_profit = net - productCost;
      if (isMarco) {
        const marcoProfit = net - MARCO_UNIT_COST_BRL * form.qty - (form.operationalCost || 0);
        const marcoShare = Math.max(0, marcoProfit / 2);
        profit = gross_profit - marcoShare;
      } else {
        profit = gross_profit;
      }
      costPerVial = stockCostPerVial;
    }
    const margin = net > 0 ? (profit / net) * 100 : 0;
    return { gross, net, productCost, profit, margin, costPerVial, c1Amount, c2Amount, commissions };
  }, [form, db.inventory]);

  const submit = () => {
    const isMarco = form.type === "marco";
    if (!form.client) return toast.error("Cliente é obrigatório");
    if (!form.productKey) return toast.error("Selecione o produto");
    const item = allInventory[form.productKey];
    if (!item || item.vials < form.qty) return toast.error("Estoque de revenda insuficiente");
    const productName = item.name;
    const productKey = form.productKey;
    update(d => {
      const sale: Sale = {
        id: uid(), date: form.date, client: form.client, phone: form.phone,
        productKey, productName, qty: form.qty,
        salePrice: form.salePrice, discount: form.discount, type: form.type,
        operationalCost: isMarco ? form.operationalCost : undefined,
        commission1: form.c1Name ? { name: form.c1Name, amount: calc.c1Amount } : undefined,
        commission2: form.c2Name ? { name: form.c2Name, amount: calc.c2Amount } : undefined,
        grossRevenue: calc.gross, netRevenue: calc.net,
        productCost: calc.productCost, profit: calc.profit,
      };
      d.sales.push(sale);
      recomputeInventories(d);
    });
    setForm({ ...form, client: "", phone: "", qty: 1, salePrice: 0, discount: 0, operationalCost: 0, marcoProductName: "", c1Name: "", c1Input: 0, c2Name: "", c2Input: 0 });
    toast.success("Venda registrada");
  };

  const isMarco = form.type === "marco";

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h3 className="font-serif text-xl gold-text">Nova Venda <span className="text-xs text-muted-foreground font-sans normal-case">(custo real do seu estoque{isMarco ? " · espelhada para Marco Túlio" : ""})</span></h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Data *"><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></Field>
          <Field label="Cliente *"><Input value={form.client} onChange={e => setForm({...form, client: e.target.value})} /></Field>
          <Field label="Telefone"><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(11) 98765-4321" /></Field>
          <Field label="Produto *">
            <Select value={form.productKey} onValueChange={v => setForm({...form, productKey: v})}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{inventoryKeys.map(k => <SelectItem key={k} value={k}>{k} ({allInventory[k].vials} fr.{db.inventoryConsumo[k] && !db.inventory[k] ? " · pessoal" : ""})</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Qtd Frascos *"><NumInput value={form.qty} onValue={v => setForm({...form, qty: v})} /></Field>
          <Field label="Preço Unit. (R$) *"><NumInput step="0.01" value={form.salePrice} onValue={v => setForm({...form, salePrice: v})} /></Field>
          <Field label="Desconto (R$)"><NumInput step="0.01" value={form.discount} onValue={v => setForm({...form, discount: v})} /></Field>
          {isMarco && (
            <Field label="Custo Operacional Marco (R$)" className="md:col-span-1">
              <NumInput step="0.01" value={form.operationalCost} onValue={v => setForm({...form, operationalCost: v})} placeholder="Frete, taxas, etc." />
            </Field>
          )}
          <Field label="Tipo" className="md:col-span-2">
            <RadioGroup value={form.type} onValueChange={v => setForm({...form, type: v as SaleType})} className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="normal" /> Venda Normal</label>
              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="sample" /> Amostra</label>
              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="marco" /> Marco Túlio</label>
            </RadioGroup>
            {isMarco && <p className="text-[10px] text-muted-foreground mt-1">Aqui mostra seu lucro REAL (custo do seu estoque − distribuição de lucros do Marco). O painel dele só vê custo R$ {MARCO_UNIT_COST_BRL}/un.</p>}
          </Field>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid grid-cols-[1fr_90px_1fr] gap-2 items-end">
            <Field label="Comissão 1 - Parceiro"><Input value={form.c1Name} onChange={e => setForm({...form, c1Name: e.target.value})} /></Field>
            <Field label="Tipo">
              <Select value={form.c1Mode} onValueChange={v => setForm({...form, c1Mode: v as "BRL" | "PCT"})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="BRL">R$</SelectItem><SelectItem value="PCT">%</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label={form.c1Mode === "PCT" ? `% da venda (= ${fmtBRL(calc.c1Amount)})` : "Valor (R$)"}>
              <NumInput step="0.01" value={form.c1Input} onValue={v => setForm({...form, c1Input: v})} />
            </Field>
          </div>
          <div className="grid grid-cols-[1fr_90px_1fr] gap-2 items-end">
            <Field label="Comissão 2 - Parceiro"><Input value={form.c2Name} onChange={e => setForm({...form, c2Name: e.target.value})} /></Field>
            <Field label="Tipo">
              <Select value={form.c2Mode} onValueChange={v => setForm({...form, c2Mode: v as "BRL" | "PCT"})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="BRL">R$</SelectItem><SelectItem value="PCT">%</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label={form.c2Mode === "PCT" ? `% da venda (= ${fmtBRL(calc.c2Amount)})` : "Valor (R$)"}>
              <NumInput step="0.01" value={form.c2Input} onValue={v => setForm({...form, c2Input: v})} />
            </Field>
          </div>
        </div>
        <div className="rounded-lg gold-border p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <Calc label="Custo/Frasco" v={fmtBRL(calc.costPerVial)} />
          <Calc label="Receita Bruta" v={fmtBRL(calc.gross)} />
          <Calc label="Receita Líquida" v={fmtBRL(calc.net)} />
          <Calc label="Custo Total" v={fmtBRL(calc.productCost)} />
          <Calc label={isMarco ? "Meu Lucro (líq. comissão Marco)" : "Lucro"} v={fmtBRL(calc.profit)} highlight />
          <Calc label="Margem" v={fmtPct(calc.margin)} />
        </div>
        <Button onClick={submit} className="gold-gradient"><Plus className="w-4 h-4 mr-1" /> Registrar Venda</Button>
      </div>

      <div className="glass-card rounded-xl p-6 overflow-x-auto">
        <h3 className="font-serif text-xl gold-text mb-4">Histórico de Vendas</h3>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Produto</TableHead>
            <TableHead>Qtd</TableHead><TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Lucro</TableHead><TableHead>Tipo</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {db.sales.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sem vendas</TableCell></TableRow>}
            {[...db.sales].sort((a,b) => b.date.localeCompare(a.date)).map(s => (
              <TableRow key={s.id}>
                <TableCell>{format(parseDay(s.date), "dd/MM/yyyy")}</TableCell>
                <TableCell>{s.client}</TableCell>
                <TableCell>
                  <button onClick={() => setEditingSale(s)} className="text-primary hover:underline text-left">
                    {s.productName}
                  </button>
                </TableCell>
                <TableCell>{s.qty}</TableCell>
                <TableCell className="text-right">{fmtBRL(s.netRevenue)}</TableCell>
                <TableCell className="text-right text-primary">{fmtBRL(s.profit)}</TableCell>
                <TableCell>
                  {s.type === "sample" && <Badge variant="outline">Amostra</Badge>}
                  {s.type === "normal" && <Badge className="gold-gradient">Venda</Badge>}
                  {s.type === "marco" && <Badge className="bg-[oklch(0.55_0.18_270)] text-white">Marco Túlio</Badge>}
                </TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditingSale(s)}><Pencil className="w-4 h-4 text-primary" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => update(d => { d.sales = d.sales.filter(x => x.id !== s.id); recomputeInventories(d); })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingSale} onOpenChange={(o) => { if (!o) setEditingSale(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif gold-text">Editar Venda</DialogTitle></DialogHeader>
          {editingSale && (
            <EditSaleForm sale={editingSale} onSave={(patch) => {
              update(d => {
                const i = d.sales.findIndex(x => x.id === editingSale.id);
                if (i >= 0) {
                  const cur = d.sales[i];
                  const nextType: SaleType = patch.type;
                  const gross = patch.qty * patch.salePrice;
                  const commissions = (cur.commission1?.amount || 0) + (cur.commission2?.amount || 0);

                  let net = 0, productCost = 0, profit = 0;
                  if (nextType === "sample") {
                    const inv = d.inventory[cur.productKey];
                    const unitCost = inv && inv.vials ? inv.totalCost / inv.vials : cur.productCost / Math.max(1, cur.qty);
                    productCost = unitCost * patch.qty;
                    net = 0;
                    profit = -productCost;
                  } else if (nextType === "marco") {
                    productCost = MARCO_UNIT_COST_BRL * patch.qty + (patch.operationalCost || 0);
                    net = gross - patch.discount - commissions;
                    profit = (net - productCost) / 2;
                  } else {
                    const inv = d.inventory[cur.productKey];
                    const unitCost = inv && inv.vials ? inv.totalCost / inv.vials : cur.productCost / Math.max(1, cur.qty);
                    productCost = unitCost * patch.qty;
                    net = gross - patch.discount - commissions;
                    profit = net - productCost;
                  }

                  d.sales[i] = {
                    ...cur,
                    date: patch.date, client: patch.client, phone: patch.phone,
                    qty: patch.qty, salePrice: patch.salePrice, discount: patch.discount,
                    type: nextType,
                    operationalCost: nextType === "marco" ? patch.operationalCost : undefined,
                    grossRevenue: gross, netRevenue: net, productCost, profit,
                  };
                }
                recomputeInventories(d);
              });
              setEditingSale(null);
              toast.success("Venda atualizada");
            }} onCancel={() => setEditingSale(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type EditSalePatch = {
  date: string; client: string; phone?: string;
  qty: number; salePrice: number; discount: number;
  type: SaleType; operationalCost: number;
};

function EditSaleForm({ sale, onSave, onCancel }: { sale: Sale; onSave: (p: EditSalePatch) => void; onCancel: () => void }) {
  const { db } = useDB();
  const [date, setDate] = useState(sale.date);
  const [client, setClient] = useState(sale.client);
  const [phone, setPhone] = useState(sale.phone || "");
  const [qty, setQty] = useState(sale.qty);
  const [salePrice, setSalePrice] = useState(sale.salePrice);
  const [discount, setDiscount] = useState(sale.discount);
  const [type, setType] = useState<SaleType>(sale.type);
  const [operationalCost, setOperationalCost] = useState(sale.operationalCost || 0);

  const calc = useMemo(() => {
    const inv = db.inventory[sale.productKey];
    // Custo unitário ATUAL do estoque, ou fallback do snapshot da venda
    const unitCostStock = inv && inv.vials ? inv.totalCost / inv.vials : (sale.productCost / Math.max(1, sale.qty));
    const commissions = (sale.commission1?.amount || 0) + (sale.commission2?.amount || 0);
    const gross = qty * salePrice;
    let net = 0, productCost = 0, profit = 0;
    let marcoCost = 0, marcoOp = 0, marcoTotalProfit = 0, marcoCommission = 0;

    if (type === "sample") {
      productCost = unitCostStock * qty;
      net = 0;
      profit = -productCost;
    } else if (type === "marco") {
      productCost = unitCostStock * qty;
      net = gross - discount - commissions;
      const grossProfit = net - productCost;
      marcoCost = MARCO_UNIT_COST_BRL * qty;
      marcoOp = operationalCost || 0;
      marcoTotalProfit = net - marcoCost - marcoOp;
      marcoCommission = Math.max(0, marcoTotalProfit / 2);
      profit = grossProfit - marcoCommission;
    } else {
      productCost = unitCostStock * qty;
      net = gross - discount - commissions;
      profit = net - productCost;
    }
    const margin = net > 0 ? (profit / net) * 100 : 0;
    return { unitCostStock, commissions, gross, net, productCost, profit, margin, marcoCost, marcoOp, marcoTotalProfit, marcoCommission };
  }, [db.inventory, sale, qty, salePrice, discount, type, operationalCost]);

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Data"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Cliente"><Input value={client} onChange={e => setClient(e.target.value)} /></Field>
        <Field label="Telefone"><Input value={phone} onChange={e => setPhone(e.target.value)} /></Field>
        <Field label="Produto"><Input value={sale.productName} disabled /></Field>
        <Field label="Qtd"><NumInput value={qty} onValue={v => setQty(v)} /></Field>
        <Field label="Preço Unit."><NumInput step="0.01" value={salePrice} onValue={v => setSalePrice(v)} /></Field>
        <Field label="Desconto"><NumInput step="0.01" value={discount} onValue={v => setDiscount(v)} /></Field>
        <Field label="Tipo" className="md:col-span-2">
          <RadioGroup value={type} onValueChange={v => setType(v as SaleType)} className="flex flex-wrap gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="normal" /> Venda Normal</label>
            <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="sample" /> Amostra</label>
            <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="marco" /> Marco Túlio</label>
          </RadioGroup>
        </Field>
        {type === "marco" && (
          <Field label="Custo Operacional Marco (R$)" className="md:col-span-2">
            <NumInput step="0.01" value={operationalCost} onValue={v => setOperationalCost(v)} />
          </Field>
        )}
      </div>

      {/* Breakdown do cálculo */}
      <div className="rounded-lg gold-border p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Memória de cálculo</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Calc label="Custo/Frasco (estoque)" v={fmtBRL(calc.unitCostStock)} />
          <Calc label={`Receita Bruta (${qty} × ${fmtBRL(salePrice)})`} v={fmtBRL(calc.gross)} />
          <Calc label="Desconto" v={fmtBRL(discount)} />
          <Calc label="Comissões (snapshot)" v={fmtBRL(calc.commissions)} />
          <Calc label="Receita Líquida" v={fmtBRL(calc.net)} />
          <Calc label={`Custo Mercadoria (${qty} × ${fmtBRL(calc.unitCostStock)})`} v={fmtBRL(calc.productCost)} />
        </div>
        {type === "marco" && (
          <div className="border-t border-primary/20 pt-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-[oklch(0.75_0.18_270)] font-semibold">Parceria Marco Túlio</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Calc label={`Custo Marco (${qty} × R$ ${MARCO_UNIT_COST_BRL})`} v={fmtBRL(calc.marcoCost)} />
              <Calc label="Custo Operacional" v={fmtBRL(calc.marcoOp)} />
              <Calc label="Lucro Total (parceria)" v={fmtBRL(calc.marcoTotalProfit)} />
              <Calc label="Distribuição Sócio Marcos (50%)" v={fmtBRL(calc.marcoCommission)} />
              <Calc label="Distribuição Sócio Dharman (50%)" v={fmtBRL(calc.marcoCommission)} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Seu lucro = (Líquido − Custo Mercadoria) − Distribuição Sócio Marcos<br />
              = ({fmtBRL(calc.net)} − {fmtBRL(calc.productCost)}) − {fmtBRL(calc.marcoCommission)} = <span className="text-primary font-semibold">{fmtBRL(calc.profit)}</span>
            </p>
          </div>
        )}
        {type === "normal" && (
          <p className="text-[10px] text-muted-foreground">
            Lucro = Líquido − Custo = {fmtBRL(calc.net)} − {fmtBRL(calc.productCost)} = <span className="text-primary font-semibold">{fmtBRL(calc.profit)}</span>
          </p>
        )}
        {type === "sample" && (
          <p className="text-[10px] text-muted-foreground">
            Amostra: prejuízo = −Custo = <span className="text-destructive font-semibold">{fmtBRL(calc.profit)}</span>
          </p>
        )}
        <div className="border-t border-primary/20 pt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Calc label="Lucro Final (seu bolso)" v={fmtBRL(calc.profit)} highlight />
          <Calc label="Margem" v={fmtPct(calc.margin)} highlight />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button className="gold-gradient" onClick={() => onSave({ date, client, phone, qty, salePrice, discount, type, operationalCost })}>Salvar</Button>
      </DialogFooter>
    </div>
  );
}

/* ---------------- MARCO TÚLIO (visão da parceria — sem dados do cliente) ---------------- */
export function MarcoTab() {
  const { db, update } = useDB();

  const marcoSales = useMemo(
    () => [...db.sales].filter(s => s.type === "marco").sort((a, b) => b.date.localeCompare(a.date)),
    [db.sales]
  );

  const withdrawals = useMemo(
    () => [...(db.marcoWithdrawals || [])].sort((a, b) => b.date.localeCompare(a.date)),
    [db.marcoWithdrawals]
  );

  const totals = useMemo(() => {
    let qty = 0, gross = 0, net = 0, productCost = 0, operational = 0, totalProfit = 0;
    for (const s of marcoSales) {
      qty += s.qty;
      gross += s.grossRevenue;
      net += s.netRevenue;
      productCost += MARCO_UNIT_COST_BRL * s.qty;
      operational += s.operationalCost || 0;
      totalProfit += s.netRevenue - MARCO_UNIT_COST_BRL * s.qty - (s.operationalCost || 0);
    }
    const withdrawalsTotal = withdrawals.reduce((s, w) => s + w.qty * w.unitCost, 0);
    const marcoShare = totalProfit / 2;
    return {
      qty, gross, net, productCost, operational,
      totalProfit,
      myShare: marcoShare,
      marcoCommission: marcoShare,
      withdrawalsTotal,
      marcoNet: marcoShare - withdrawalsTotal,
    };
  }, [marcoSales, withdrawals]);

  // form state
  const [wDate, setWDate] = useState(new Date().toISOString().slice(0, 10));
  const [wProduct, setWProduct] = useState(MARCO_WITHDRAWAL_CATALOG[0].product);
  const [wQty, setWQty] = useState(1);
  const [wCost, setWCost] = useState(MARCO_WITHDRAWAL_CATALOG[0].unitCost);
  const [wNote, setWNote] = useState("");

  const pickProduct = (name: string) => {
    setWProduct(name);
    const preset = MARCO_WITHDRAWAL_CATALOG.find(c => c.product === name);
    if (preset) setWCost(preset.unitCost);
  };

  const addWithdrawal = () => {
    if (!wProduct || wQty <= 0 || wCost < 0) return toast.error("Preencha os campos");
    const w: MarcoWithdrawal = {
      id: uid(), date: wDate, product: wProduct.trim(),
      qty: Number(wQty), unitCost: Number(wCost),
      note: wNote.trim() || undefined,
    };
    update(d => { d.marcoWithdrawals = [...(d.marcoWithdrawals || []), w]; });
    setWQty(1); setWNote("");
    toast.success("Retirada registrada — descontada da comissão do Marco");
  };

  const removeWithdrawal = (id: string) => {
    update(d => { d.marcoWithdrawals = (d.marcoWithdrawals || []).filter(w => w.id !== id); });
  };

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<DollarSign />} label="Receita Líquida" value={fmtBRL(totals.net)} tone="green" />
        <MetricCard icon={<TrendingUp />} label="Lucro Total (a dividir)" value={fmtBRL(totals.totalProfit)} tone="gold" />
        <MetricCard icon={<Target />} label="Sócio Dharman (50%)" value={fmtBRL(totals.myShare)} tone="gold" />
        <MetricCard icon={<Target />} label="Sócio Marcos — Saldo a Pagar" value={fmtBRL(totals.marcoNet)} tone={totals.marcoNet >= 0 ? "gold" : "red"} />
      </div>

      {totals.withdrawalsTotal > 0 && (
        <div className="glass-card rounded-xl p-4 text-sm">
          <div className="flex flex-wrap gap-6">
            <span>Comissão bruta Marcos: <b className="text-primary">{fmtBRL(totals.myShare)}</b></span>
            <span>Retiradas: <b className="text-destructive">− {fmtBRL(totals.withdrawalsTotal)}</b></span>
            <span>Saldo líquido a pagar: <b className="gold-text">{fmtBRL(totals.marcoNet)}</b></span>
          </div>
        </div>
      )}

      {/* Retiradas do Marco (descontam da comissão) */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-serif text-xl gold-text mb-1">Retiradas Marco (produtos p/ ele)</h3>
        <p className="text-xs text-muted-foreground mb-4">O valor é descontado automaticamente da comissão dele. Preços padrão: Retatrutide R$ 500 · GH 200 UI R$ 1.400.</p>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <div>
            <Label className="text-xs">Data</Label>
            <Input type="date" value={wDate} onChange={e => setWDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Produto</Label>
            <Input list="marco-catalog" value={wProduct} onChange={e => pickProduct(e.target.value)} />
            <datalist id="marco-catalog">
              {MARCO_WITHDRAWAL_CATALOG.map(c => <option key={c.product} value={c.product} />)}
            </datalist>
          </div>
          <div>
            <Label className="text-xs">Qtd</Label>
            <NumInput min={1} value={wQty} onValue={v => setWQty(v)} />
          </div>
          <div>
            <Label className="text-xs">Custo un. (R$)</Label>
            <NumInput min={0} step="0.01" value={wCost} onValue={v => setWCost(v)} />
          </div>
          <div className="flex items-end">
            <Button onClick={addWithdrawal} className="w-full"><Plus className="w-4 h-4 mr-1" />Registrar</Button>
          </div>
          <div className="md:col-span-6">
            <Label className="text-xs">Observação (opcional)</Label>
            <Input value={wNote} onChange={e => setWNote(e.target.value)} placeholder="Ex: entregue em 12/06" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead className="text-right">Custo un.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Obs.</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {withdrawals.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma retirada registrada.</TableCell></TableRow>}
              {withdrawals.map(w => (
                <TableRow key={w.id}>
                  <TableCell>{format(parseDay(w.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{w.product}</TableCell>
                  <TableCell>{w.qty}</TableCell>
                  <TableCell className="text-right">{fmtBRL(w.unitCost)}</TableCell>
                  <TableCell className="text-right text-destructive font-semibold">{fmtBRL(w.qty * w.unitCost)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{w.note || "—"}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => removeWithdrawal(w.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
              {withdrawals.length > 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-semibold">Total de retiradas</TableCell>
                  <TableCell className="text-right text-destructive font-bold">{fmtBRL(totals.withdrawalsTotal)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 overflow-x-auto">
        <h3 className="font-serif text-xl gold-text mb-4">Operações da Parceria</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Total: {marcoSales.length} venda(s) · {totals.qty} frasco(s)
        </p>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Qtd</TableHead>
            <TableHead className="text-right">Líquido</TableHead>
            <TableHead className="text-right">Custo (500/un)</TableHead>
            <TableHead className="text-right">Custo Op.</TableHead>
            <TableHead className="text-right">Lucro Total</TableHead>
            <TableHead className="text-right">Sócio Marcos</TableHead>
            <TableHead className="text-right">Sócio Dharman</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {marcoSales.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Nenhuma venda marcada como Marco Túlio ainda.</TableCell></TableRow>}
            {marcoSales.map(s => {
              const cost = MARCO_UNIT_COST_BRL * s.qty;
              const op = s.operationalCost || 0;
              const tp = s.netRevenue - cost - op;
              const share = tp / 2;
              return (
                <TableRow key={s.id}>
                  <TableCell>{format(parseDay(s.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{s.client || "—"}</TableCell>
                  <TableCell>{s.productName}</TableCell>
                  <TableCell>{s.qty}</TableCell>

                  <TableCell className="text-right">{fmtBRL(s.netRevenue)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmtBRL(cost)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmtBRL(op)}</TableCell>
                  <TableCell className="text-right">{fmtBRL(tp)}</TableCell>
                  <TableCell className="text-right text-primary font-semibold">{fmtBRL(share)}</TableCell>
                  <TableCell className="text-right text-primary font-semibold">{fmtBRL(share)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ---------------- EXPENSES ---------------- */
function ExpensesPanel() {
  const { db, update } = useDB();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState("");

  const expenses = useMemo(
    () => [...(db.expenses || [])].sort((a, b) => b.date.localeCompare(a.date)),
    [db.expenses]
  );
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const add = () => {
    if (!description.trim() || !amount) return toast.error("Informe descrição e valor");
    update(d => {
      d.expenses = d.expenses || [];
      d.expenses.push({ id: uid(), date, description: description.trim(), amount, category: category.trim() || undefined });
    });
    setDescription(""); setAmount(0); setCategory("");
    toast.success("Despesa registrada");
  };

  const remove = (id: string) => {
    update(d => { d.expenses = (d.expenses || []).filter(e => e.id !== id); });
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-serif text-xl gold-text">Despesas & Investimentos</h3>
        <span className="text-sm text-muted-foreground">Total: <span className="text-primary font-semibold">{fmtBRL(total)}</span></span>
      </div>
      <div className="grid md:grid-cols-4 gap-3">
        <Field label="Data"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Descrição *"><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: anúncio, embalagem..." /></Field>
        <Field label="Categoria"><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Marketing" /></Field>
        <Field label="Valor (R$) *"><NumInput step="0.01" value={amount} onValue={v => setAmount(v)} /></Field>
      </div>
      <Button onClick={add} className="gold-gradient"><Plus className="w-4 h-4 mr-1" /> Adicionar Despesa</Button>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {expenses.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem despesas</TableCell></TableRow>}
            {expenses.map((e: Expense) => (
              <TableRow key={e.id}>
                <TableCell>{format(parseDay(e.date), "dd/MM/yyyy")}</TableCell>
                <TableCell>{e.description}</TableCell>
                <TableCell className="text-muted-foreground">{e.category || "—"}</TableCell>
                <TableCell className="text-right text-primary">{fmtBRL(e.amount)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ---------------- REPORTS ---------------- */
export function ReportsTab() {
  const { db } = useDB();

  const timeline = useMemo(() => {
    const events: { date: string; inv: number; rev: number; profit: number }[] = [];
    const realSales = db.sales.filter(s => s.type !== "sample");
    const all: { date: string; inv?: number; rev?: number; profit?: number }[] = [
      ...db.orders.map(o => ({ date: o.date, inv: o.totalCost })),
      ...(db.expenses || []).map(e => ({ date: e.date, inv: e.amount })),
      ...realSales.map(s => ({ date: s.date, rev: s.netRevenue, profit: s.profit })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    let cInv = 0, cRev = 0, cProf = 0;
    for (const e of all) {
      cInv += e.inv || 0; cRev += e.rev || 0; cProf += e.profit || 0;
      events.push({ date: format(parseDay(e.date), "dd/MM"), inv: cInv, rev: cRev, profit: cProf });
    }
    return events;
  }, [db]);

  const byProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of db.sales.filter(s => s.type !== "sample")) {
      map.set(s.productName, (map.get(s.productName) || 0) + s.profit);
    }
    return Array.from(map.entries()).map(([name, profit]) => ({ name, profit }));
  }, [db.sales]);

  const costComposition = useMemo(() => {
    let base = 0, fChina = 0, fUSA = 0, fBR = 0;
    for (const o of db.orders) {
      base += o.products.reduce((s, p) => s + (p.boxQty || 0) * p.priceUSD, 0) * USD_BRL;
      fChina += o.freightChina * USD_BRL;
      fUSA += o.freightUSA * USD_BRL;
      fBR += o.freightBR;
    }
    const commissions = db.sales.reduce((s, x) => s + (x.commission1?.amount || 0) + (x.commission2?.amount || 0), 0);
    return [
      { name: "Produto Base", value: base },
      { name: "Frete China-USA", value: fChina },
      { name: "Frete USA-PAR", value: fUSA },
      { name: "Frete PAR-BR", value: fBR },
      { name: "Comissões", value: commissions },
    ].filter(x => x.value > 0);
  }, [db]);

  const GOLD = "#D4A24A";
  const COLORS = ["#E8C063", "#D4A24A", "#B07F2E", "#7A5A1F", "#3A2D10"];

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-serif text-xl gold-text mb-4">Evolução Financeira</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.72 0.13 50 / 0.15)" />
            <XAxis dataKey="date" stroke="#E8C988" />
            <YAxis stroke="#E8C988" />
            <Tooltip contentStyle={{ background: "#0D1B4D", border: "1px solid #D4A24A", borderRadius: 8 }} formatter={(v: number) => fmtBRL(v)} />
            <Legend />
            <Line type="monotone" dataKey="inv" name="Investimento" stroke="#C41E3A" strokeWidth={2} />
            <Line type="monotone" dataKey="rev" name="Receita" stroke="#50C878" strokeWidth={2} />
            <Line type="monotone" dataKey="profit" name="Lucro" stroke={GOLD} strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-serif text-xl gold-text mb-4">Lucro por Produto</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byProduct}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.72 0.13 50 / 0.15)" />
              <XAxis dataKey="name" stroke="#E8C988" />
              <YAxis stroke="#E8C988" />
              <Tooltip contentStyle={{ background: "#0D1B4D", border: "1px solid #D4A24A" }} formatter={(v: number) => fmtBRL(v)} />
              <Bar dataKey="profit" fill={GOLD} radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h3 className="font-serif text-xl gold-text mb-4">Composição de Custos</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={costComposition} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {costComposition.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0D1B4D", border: "1px solid #D4A24A" }} formatter={(v: number) => fmtBRL(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <InventoryTable title="Estoque Revenda" inv={db.inventory} />
        <InventoryTable title="Estoque Consumo Pessoal" inv={db.inventoryConsumo} />
      </div>
    </div>
  );
}

function InventoryTable({ title, inv }: { title: string; inv: Record<string, { name: string; mgPerVial: number; vials: number; totalCost: number }> }) {
  const items = Object.entries(inv);
  return (
    <div className="glass-card rounded-xl p-6 overflow-x-auto">
      <h3 className="font-serif text-xl gold-text mb-4">{title}</h3>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Produto</TableHead><TableHead>Frascos</TableHead><TableHead>mg/un</TableHead>
          <TableHead>Custo/Frasco</TableHead><TableHead>Total</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem estoque</TableCell></TableRow>}
          {items.map(([k, it]) => (
            <TableRow key={k}>
              <TableCell>{it.name}</TableCell>
              <TableCell>{it.vials}</TableCell>
              <TableCell>{it.mgPerVial}</TableCell>
              <TableCell>{fmtBRL(it.vials ? it.totalCost / it.vials : 0)}</TableCell>
              <TableCell className="text-primary">{fmtBRL(it.totalCost)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ---------------- PROTOCOLS ---------------- */
function ProtocolsTab() {
  const { db, update } = useDB();
  const [detail, setDetail] = useState<Protocol | null>(null);
  const [form, setForm] = useState<Partial<Protocol>>({
    peptideName: "", currentStock: 0, vials: 0, dailyDosage: 0,
    applicationTime: "08:00", daysOfWeek: ["mon","tue","wed","thu","fri","sat","sun"],
  });

  // Peptídeos disponíveis em estoque (consumo + revenda), sem duplicar
  const availablePeptides = useMemo(() => {
    const map = new Map<string, { name: string; vials: number; mgPerVial: number; source: "consumo" | "revenda" | "ambos" }>();
    const add = (it: { name: string; vials: number; mgPerVial: number }, src: "consumo" | "revenda") => {
      const k = it.name.trim().toLowerCase();
      if (!k) return;
      const ex = map.get(k);
      if (ex) {
        ex.vials += it.vials;
        ex.mgPerVial = it.mgPerVial || ex.mgPerVial;
        ex.source = "ambos";
      } else {
        map.set(k, { name: it.name.trim(), vials: it.vials, mgPerVial: it.mgPerVial, source: src });
      }
    };
    Object.values(db.inventoryConsumo || {}).forEach(i => add(i, "consumo"));
    Object.values(db.inventory || {}).forEach(i => add(i, "revenda"));
    return Array.from(map.values()).filter(i => i.vials > 0).sort((a, b) => a.name.localeCompare(b.name));
  }, [db.inventoryConsumo, db.inventory]);

  const onSelectPeptide = (name: string) => {
    const p = availablePeptides.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!p) { setForm({ ...form, peptideName: name }); return; }
    setForm({
      ...form,
      peptideName: p.name,
      vials: p.vials,
      currentStock: Number((p.vials * p.mgPerVial).toFixed(4)),
    });
  };

  const submit = () => {
    if (!form.peptideName || !form.dailyDosage) return toast.error("Selecione o peptídeo e informe a dosagem diária");
    update(d => { d.protocols.push({ id: uid(), peptideName: form.peptideName!, currentStock: Number(form.currentStock||0), vials: Number(form.vials||0), dailyDosage: Number(form.dailyDosage), applicationTime: form.applicationTime!, daysOfWeek: form.daysOfWeek! }); });
    setForm({ peptideName: "", currentStock: 0, vials: 0, dailyDosage: 0, applicationTime: "08:00", daysOfWeek: ["mon","tue","wed","thu","fri","sat","sun"] });
    toast.success("Protocolo criado");
  };

  const toggleDay = (id: string) => {
    const cur = form.daysOfWeek || [];
    setForm({ ...form, daysOfWeek: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] });
  };

  // Resumo do peptídeo selecionado
  const selectedSummary = useMemo(() => {
    const name = (form.peptideName || "").trim().toLowerCase();
    if (!name) return null;
    const matches = db.orders.flatMap(o => o.products).filter(p => p.status === "arrived" && p.name.trim().toLowerCase() === name);
    const totalBought = matches.reduce((s, p) => s + vialsOf(p), 0);
    const boxes = matches.reduce((s, p) => s + (p.boxQty || 0), 0);
    const kC = Object.keys(db.inventoryConsumo).find(k => k.toLowerCase() === name);
    const kR = Object.keys(db.inventory).find(k => k.toLowerCase() === name);
    const invC = kC ? db.inventoryConsumo[kC] : undefined;
    const invR = kR ? db.inventory[kR] : undefined;
    const remaining = (invC?.vials || 0) + (invR?.vials || 0);
    const used = Math.max(0, totalBought - remaining);
    const mgPerVial = invC?.mgPerVial || invR?.mgPerVial || 0;
    return { totalBought, boxes, remaining, used, mgPerVial };
  }, [form.peptideName, db.orders, db.inventoryConsumo, db.inventory]);

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h3 className="font-serif text-xl gold-text">Novo Protocolo</h3>
        {availablePeptides.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum peptídeo em estoque. Cadastre pedidos primeiro.</p>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Peptídeo (do estoque) *">
            <Select value={form.peptideName || ""} onValueChange={onSelectPeptide}>
              <SelectTrigger><SelectValue placeholder="Selecione o peptídeo" /></SelectTrigger>
              <SelectContent>
                {availablePeptides.map(p => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name} — {p.vials} fr. ({p.source})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Dosagem Diária (mg) *"><NumInput step="0.01" value={form.dailyDosage ?? 0} onValue={v => setForm({...form, dailyDosage: v})} /></Field>
          <Field label="Horário"><Input type="time" value={form.applicationTime} onChange={e => setForm({...form, applicationTime: e.target.value})} /></Field>
        </div>

        {selectedSummary && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div><div className="text-xs uppercase text-muted-foreground">Boxes comprados</div><div className="text-foreground font-medium">{selectedSummary.boxes}</div></div>
            <div><div className="text-xs uppercase text-muted-foreground">Total frascos</div><div className="text-foreground font-medium">{selectedSummary.totalBought}</div></div>
            <div><div className="text-xs uppercase text-muted-foreground">Já usados</div><div className="text-foreground font-medium">{selectedSummary.used}</div></div>
            <div><div className="text-xs uppercase text-muted-foreground">Restantes</div><div className="text-primary font-semibold">{selectedSummary.remaining}</div></div>
            <div><div className="text-xs uppercase text-muted-foreground">mg / frasco</div><div className="text-foreground font-medium">{selectedSummary.mgPerVial}</div></div>
            <div className="col-span-2 md:col-span-5 text-xs text-muted-foreground">
              Estoque total: <span className="text-foreground font-medium">{(selectedSummary.remaining * selectedSummary.mgPerVial).toFixed(2)} mg</span>
              {Number(form.dailyDosage) > 0 && selectedSummary.mgPerVial > 0 && (
                <> · Duração estimada: <span className="text-foreground font-medium">{Math.floor((selectedSummary.remaining * selectedSummary.mgPerVial) / Number(form.dailyDosage))} dias</span></>
              )}
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Dias da Semana</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(d => {
              const on = form.daysOfWeek?.includes(d.id);
              return (
                <button type="button" key={d.id} onClick={() => toggleDay(d.id)}
                  className={`px-4 py-2 rounded-lg border text-sm transition ${on ? "gold-gradient border-primary font-semibold" : "border-primary/30 text-muted-foreground hover:border-primary/60"}`}>
                  {d.short}
                </button>
              );
            })}
          </div>
        </div>
        <Button onClick={submit} className="gold-gradient"><Plus className="w-4 h-4 mr-1" /> Criar Protocolo</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {db.protocols.map(p => {
          const dur = stockDurationDays(p);
          const ok = dur >= 30;
          return (
            <div key={p.id} className="glass-card rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <button onClick={() => setDetail(p)} className="font-serif text-lg text-primary hover:underline text-left">{p.peptideName}</button>
                <Badge className={ok ? "bg-[oklch(0.7_0.17_155)] text-white" : "bg-destructive"}>{ok ? "ESTOQUE OK" : "REABASTECER"}</Badge>
              </div>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>Dosagem: <span className="text-foreground">{p.dailyDosage} mg/dia</span></p>
                <p>Estoque: <span className="text-foreground">{p.currentStock} mg ({p.vials} fr.)</span></p>
                <p>Duração: <span className="text-foreground">{isFinite(dur) ? `${dur} dias` : "∞"}</span></p>
                <p>Horário: <span className="text-foreground">{p.applicationTime}</span></p>
                <div className="flex gap-1 pt-1">
                  {DAYS.map(d => <span key={d.id} className={`text-[10px] px-1.5 py-0.5 rounded ${p.daysOfWeek.includes(d.id) ? "gold-gradient" : "bg-muted/40 text-muted-foreground"}`}>{d.short}</span>)}
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => update(d => { d.protocols = d.protocols.filter(x => x.id !== p.id); })}>
                <Trash2 className="w-4 h-4 mr-1" /> Remover
              </Button>
            </div>
          );
        })}
        {db.protocols.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Nenhum protocolo criado</p>}
      </div>

      <div className="glass-card rounded-xl p-6 overflow-x-auto">
        <h3 className="font-serif text-xl gold-text mb-4">Histórico de Administrações</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Data/Hora</TableHead><TableHead>Peptídeo</TableHead><TableHead>Dose</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {db.applications.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem registros</TableCell></TableRow>}
            {[...db.applications].sort((a,b) => b.dateTime.localeCompare(a.dateTime)).map(a => (
              <TableRow key={a.id}>
                <TableCell>{format(new Date(a.dateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                <TableCell>{a.peptideName}</TableCell>
                <TableCell>{a.dose} mg</TableCell>
                <TableCell>{a.status === "applied" ? <Badge className="bg-[oklch(0.7_0.17_155)] text-white">Aplicado</Badge> : <Badge variant="outline">Pulado</Badge>}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => update(d => { d.applications = d.applications.filter(x => x.id !== a.id); })}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-serif gold-text">{detail?.peptideName}</DialogTitle></DialogHeader>
          {detail && (() => {
            const inv = db.inventoryConsumo[detail.peptideName.trim()];
            const totalBought = db.orders.flatMap(o => o.products).filter(p => p.usage === "consumo" && p.status === "arrived" && p.name.trim().toLowerCase() === detail.peptideName.trim().toLowerCase()).reduce((s, p) => s + vialsOf(p), 0);
            const remaining = inv?.vials ?? detail.vials;
            const used = Math.max(0, totalBought - remaining);
            const dur = stockDurationDays(detail);
            return (
              <div className="space-y-2 text-sm">
                <Row k="Total comprado (frascos)" v={`${totalBought}`} />
                <Row k="Já utilizados" v={`${used}`} />
                <Row k="Restantes em estoque" v={`${remaining}`} />
                <Row k="mg por frasco" v={`${inv?.mgPerVial ?? "—"}`} />
                <Row k="Estoque total (mg)" v={`${detail.currentStock} mg`} />
                <Row k="Dosagem diária" v={`${detail.dailyDosage} mg`} />
                <Row k="Horário" v={detail.applicationTime} />
                <Row k="Dias" v={DAYS.filter(d => detail.daysOfWeek.includes(d.id)).map(d => d.short).join(", ")} />
                <Row k="Duração estimada" v={isFinite(dur) ? `${dur} dias` : "∞"} />
                <Row k="Custo médio/frasco" v={inv && inv.vials ? fmtBRL(inv.totalCost / inv.vials) : "—"} />
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between border-b border-primary/10 py-1.5"><span className="text-muted-foreground">{k}</span><span className="text-foreground font-medium">{v}</span></div>;
}

/* ---------------- PARCEIROS COMISSIONADOS ---------------- */
type PartnerRow = {
  saleId: string;
  partner: string;
  date: string;
  client: string;
  saleValue: number;
  commission: number;
  pct: number;
};

function PartnersTab() {
  const { db } = useDB();
  const [filter, setFilter] = useState<string>("all");

  const rows: PartnerRow[] = useMemo(() => {
    const out: PartnerRow[] = [];
    for (const s of db.sales) {
      const base = s.grossRevenue || s.qty * s.salePrice;
      if (s.commission1?.name) {
        out.push({
          saleId: s.id, partner: s.commission1.name, date: s.date, client: s.client,
          saleValue: base, commission: s.commission1.amount,
          pct: base > 0 ? (s.commission1.amount / base) * 100 : 0,
        });
      }
      if (s.commission2?.name) {
        out.push({
          saleId: s.id, partner: s.commission2.name, date: s.date, client: s.client,
          saleValue: base, commission: s.commission2.amount,
          pct: base > 0 ? (s.commission2.amount / base) * 100 : 0,
        });
      }
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [db.sales]);

  const partners = useMemo(() => Array.from(new Set(rows.map(r => r.partner))).sort(), [rows]);
  const filtered = filter === "all" ? rows : rows.filter(r => r.partner === filter);

  const summary = useMemo(() => {
    const byPartner: Record<string, { total: number; count: number }> = {};
    for (const r of rows) {
      byPartner[r.partner] = byPartner[r.partner] || { total: 0, count: 0 };
      byPartner[r.partner].total += r.commission;
      byPartner[r.partner].count += 1;
    }
    return Object.entries(byPartner).map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const totalPaid = filtered.reduce((s, r) => s + r.commission, 0);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {summary.map(p => (
          <div key={p.name} className="glass-card rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.name}</p>
            <p className="text-2xl font-serif gold-text mt-1">{fmtBRL(p.total)}</p>
            <p className="text-xs text-muted-foreground">{p.count} venda(s) comissionada(s)</p>
          </div>
        ))}
        {summary.length === 0 && (
          <div className="glass-card rounded-xl p-4 md:col-span-3 text-center text-muted-foreground text-sm">
            Nenhuma comissão registrada ainda. Adicione comissões ao registrar uma venda.
          </div>
        )}
      </div>

      <div className="glass-card rounded-xl p-6 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-serif text-xl gold-text">Histórico de Comissões</h3>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os parceiros</SelectItem>
                {partners.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="border-primary/40 text-primary">
              Total: {fmtBRL(totalPaid)}
            </Badge>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parceiro</TableHead>
              <TableHead>Dia</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Valor da Venda</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r, i) => (
              <TableRow key={r.saleId + r.partner + i}>
                <TableCell className="font-medium text-primary">{r.partner}</TableCell>
                <TableCell>{format(parseDay(r.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                <TableCell>{r.client}</TableCell>
                <TableCell className="text-right">{fmtPct(r.pct)}</TableCell>
                <TableCell className="text-right">{fmtBRL(r.saleValue)}</TableCell>
                <TableCell className="text-right font-semibold gold-text">{fmtBRL(r.commission)}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Sem comissões para exibir.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
