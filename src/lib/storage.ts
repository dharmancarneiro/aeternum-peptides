// Storage layer for ÆTERNUM Peptides — localStorage cache + Lovable Cloud sync
import { useEffect, useState, useCallback } from "react";
import { loadCloudState, saveCloudState } from "./cloud.functions";
import { SEED_DB } from "./seed";

export type OrderStatus = "arrived" | "lost" | "rebuy";

/** Parceria Marco Túlio: custo fixo por unidade (R$) */
export const MARCO_UNIT_COST_BRL = 500;
export type ProductUsage = "consumo" | "revenda";

export type OrderProduct = {
  name: string;
  boxQty: number;          // qtd de boxes
  frascosPerBox: number;   // frascos por box
  qty?: number;            // (legado) total de vials — derivado de boxQty*frascosPerBox
  mgPerVial: number;
  priceUSD: number;        // preço POR BOX na moeda de priceCurrency (legado: sempre USD)
  priceCurrency?: "USD" | "BRL"; // moeda do preço por box (padrão USD)
  status: OrderStatus;
  usage: ProductUsage;
  consumed?: number;       // frascos já consumidos (usage=consumo)
};

export const vialsOf = (p: { boxQty?: number; frascosPerBox?: number; qty?: number }) =>
  (p.boxQty ?? p.qty ?? 0) * (p.frascosPerBox ?? (p.boxQty ? 1 : 1));

export type SavedProduct = {
  name: string;
  mgPerVial: number;
  priceUSD: number;        // preço por box
  frascosPerBox: number;
};

export type Order = {
  id: string;
  date: string;
  supplier: string;
  products: OrderProduct[];
  freightChina: number; // USD
  freightUSA: number; // USD
  freightBR: number; // BRL
  directBR?: boolean;   // frete direto ao Brasil: não passa pelo Paraguai (sem propina)
  totalCost: number; // BRL
};

export type SaleType = "normal" | "sample" | "marco" | "dereck";

export type Sale = {
  id: string;
  date: string;
  client: string;
  phone?: string;
  productKey: string;
  productName: string;
  qty: number;
  salePrice: number;
  discount: number;
  type: SaleType;
  /** Custo operacional adicional (frete etc) — usado em vendas Marco Túlio */
  operationalCost?: number;
  commission1?: { name: string; amount: number };
  commission2?: { name: string; amount: number };
  grossRevenue: number;
  netRevenue: number;
  productCost: number;
  profit: number;
};

export type Expense = {
  id: string;
  date: string;
  description: string;
  amount: number;       // R$
  category?: string;    // ex: "Investimento", "Marketing", "Frete"
};

export type InventoryItem = {
  name: string;
  mgPerVial: number;
  vials: number;
  totalCost: number; // BRL accumulated
};

export type Inventory = Record<string, InventoryItem>;

export type Protocol = {
  id: string;
  peptideName: string;
  currentStock: number; // mg
  vials: number;
  dailyDosage: number;
  applicationTime: string;
  daysOfWeek: string[];
};

export type Application = {
  id: string;
  dateTime: string;
  peptideId: string;
  peptideName: string;
  dose: number;
  status: "applied" | "skipped";
  notes?: string;
};

export type MarcoWithdrawal = {
  id: string;
  date: string;
  product: string;   // ex: "Retatrutide", "GH 200 UI"
  qty: number;
  unitCost: number;  // R$ por unidade (será descontado da comissão do Marco)
  note?: string;
};

/** Tabela de preços padrão para retiradas do Marco (R$/unidade) */
export const MARCO_WITHDRAWAL_CATALOG: { product: string; unitCost: number }[] = [
  { product: "Retatrutide", unitCost: 500 },
  { product: "GH 200 UI", unitCost: 1400 },
];

/** Afiliado/influenciador gerido pelo Dereck; a senha dá acesso ao painel /influencer */
export type Influencer = {
  name: string;
  pass: string;
};

export type DB = {
  orders: Order[];
  sales: Sale[];
  inventory: Inventory;          // revenda (vendas saem daqui)
  inventoryConsumo: Inventory;   // uso pessoal
  protocols: Protocol[];
  applications: Application[];
  savedProducts: SavedProduct[]; // catálogo p/ autocompletar
  expenses: Expense[];           // despesas / investimentos
  marcoWithdrawals?: MarcoWithdrawal[]; // retiradas do Marco (descontam comissão)
  dereckWithdrawals?: MarcoWithdrawal[]; // retiradas do Dereck (descontam comissão)
  influencers?: Influencer[]; // afiliados geridos pelo Dereck (nome + senha de acesso)
  seedApplied?: string[]; // ids do seed já aplicados neste aparelho (evita re-adicionar apagados)
};

export const EMPTY_DB: DB = {
  orders: [],
  sales: [],
  inventory: {},
  inventoryConsumo: {},
  protocols: [],
  applications: [],
  savedProducts: [],
  expenses: [],
  marcoWithdrawals: [],
  dereckWithdrawals: [],
  influencers: [],
};

const KEY = "aeturnum_db_v2";
const OLD_KEY = "aeturnum_db_v1";
export const USD_BRL = 5.06;
/** Propina Paraguai: USD por vial (todos os vials do pedido) */
export const PROPINA_PY_USD = 4;

/** Custo da mercadoria do produto (boxes * preço/box) em BRL, respeitando a moeda escolhida */
export const productCostBRL = (p: OrderProduct) =>
  (p.boxQty || 0) * (p.priceUSD || 0) * (p.priceCurrency === "BRL" ? 1 : USD_BRL);
/** Idem, em USD (para exibição no resumo) */
export const productCostUSD = (p: OrderProduct) =>
  p.priceCurrency === "BRL" ? productCostBRL(p) / USD_BRL : (p.boxQty || 0) * (p.priceUSD || 0);
/** Preço por box convertido para USD (para o catálogo de produtos salvos) */
export const boxPriceUSD = (p: OrderProduct) =>
  p.priceCurrency === "BRL" ? (p.priceUSD || 0) / USD_BRL : (p.priceUSD || 0);

function normalizeOrderProduct(p: OrderProduct): OrderProduct {
  const legacyQty = Number(p.qty || 0);
  const boxQty = Number(p.boxQty || (legacyQty > 0 ? 1 : 0));
  const frascosPerBox = Number(p.frascosPerBox || (legacyQty > 0 ? legacyQty : 10));
  return {
    ...p,
    boxQty,
    frascosPerBox,
    qty: boxQty * frascosPerBox,
    consumed: Number(p.consumed || 0),
    priceCurrency: p.priceCurrency === "BRL" ? "BRL" : "USD",
  };
}

function normalizeDB(parsed: Partial<DB>): DB {
  const db: DB = {
    ...EMPTY_DB,
    ...parsed,
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    sales: Array.isArray(parsed.sales) ? parsed.sales : [],
    inventory: parsed.inventory || {},
    inventoryConsumo: parsed.inventoryConsumo || {},
    protocols: Array.isArray(parsed.protocols) ? parsed.protocols : [],
    applications: Array.isArray(parsed.applications) ? parsed.applications : [],
    savedProducts: Array.isArray(parsed.savedProducts) ? parsed.savedProducts : [],
    expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    marcoWithdrawals: Array.isArray(parsed.marcoWithdrawals) ? parsed.marcoWithdrawals : [],
    dereckWithdrawals: Array.isArray(parsed.dereckWithdrawals) ? parsed.dereckWithdrawals : [],
    influencers: Array.isArray(parsed.influencers) ? parsed.influencers : [],
  };
  db.orders = db.orders.map(o => ({
    ...o,
    products: Array.isArray(o.products) ? o.products.map(normalizeOrderProduct) : [],
    freightChina: Number(o.freightChina || 0),
    freightUSA: Number(o.freightUSA || 0),
    freightBR: Number(o.freightBR || 0),
    totalCost: Number(o.totalCost || 0),
  }));
  recomputeInventories(db);
  return db;
}

/**
 * Aplica ao banco local os registros do seed que ainda não passaram por este
 * aparelho (por id). Assim, dados novos publicados no seed chegam a aparelhos
 * que já têm histórico próprio, sem apagar nada e sem ressuscitar registros
 * que o usuário apagou (ids já aplicados ficam em seedApplied).
 */
function mergeSeedInto(db: DB): DB {
  const seed = SEED_DB as Partial<DB>;
  const applied = new Set(db.seedApplied || []);
  let added = false;

  const mergeById = <T extends { id: string }>(target: T[], source: T[] | undefined) => {
    for (const item of source || []) {
      if (!applied.has(item.id)) {
        if (!target.some(x => x.id === item.id)) {
          target.push(JSON.parse(JSON.stringify(item)) as T);
          added = true;
        }
        applied.add(item.id);
      }
    }
  };

  mergeById(db.orders, seed.orders);
  mergeById(db.sales, seed.sales);
  mergeById(db.expenses, seed.expenses);
  db.marcoWithdrawals = db.marcoWithdrawals || [];
  db.dereckWithdrawals = db.dereckWithdrawals || [];
  mergeById(db.marcoWithdrawals, seed.marcoWithdrawals);
  mergeById(db.dereckWithdrawals, seed.dereckWithdrawals);

  db.influencers = db.influencers || [];
  for (const inf of seed.influencers || []) {
    const key = `influencer:${inf.name.trim().toLowerCase()}`;
    if (!applied.has(key)) {
      if (!db.influencers.some(i => i.name.trim().toLowerCase() === inf.name.trim().toLowerCase())) {
        db.influencers.push({ ...inf });
        added = true;
      }
      applied.add(key);
    }
  }

  db.seedApplied = [...applied];
  if (added) {
    db.orders = db.orders.map(o => ({
      ...o,
      products: Array.isArray(o.products) ? o.products.map(normalizeOrderProduct) : [],
    }));
    recomputeInventories(db);
  }
  return db;
}

export function loadDB(): DB {
  if (typeof window === "undefined") return EMPTY_DB;
  try {
    const rawCurrent = localStorage.getItem(KEY);
    const rawOld = localStorage.getItem(OLD_KEY);
    let raw = rawCurrent || rawOld;
    if (rawCurrent && rawOld) {
      const current = JSON.parse(rawCurrent);
      const old = JSON.parse(rawOld);
      const currentHasHistory = Boolean(current?.orders?.length || current?.sales?.length || current?.applications?.length);
      const oldHasHistory = Boolean(old?.orders?.length || old?.sales?.length || old?.applications?.length);
      if (!currentHasHistory && oldHasHistory) raw = rawOld;
    }
    if (!raw) return mergeSeedInto(normalizeDB(structuredClone(SEED_DB) as Partial<DB>));
    const parsed = JSON.parse(raw);
    return mergeSeedInto(normalizeDB(parsed));
  } catch {
    return EMPTY_DB;
  }
}

export function saveDB(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
  window.dispatchEvent(new Event("aeturnum:db"));
  pushToCloud(db);
}

// ============ Cloud sync (nunca mais perder dados) ============
const dbHasHistory = (d: Partial<DB> | null | undefined): boolean =>
  Boolean(
    d &&
      (d.orders?.length || 0) +
        (d.sales?.length || 0) +
        (d.applications?.length || 0) +
        (d.expenses?.length || 0) +
        (d.protocols?.length || 0) >
        0,
  );

let cloudTimer: ReturnType<typeof setTimeout> | undefined;
function pushToCloud(db: DB) {
  if (typeof window === "undefined") return;
  const pass = getPass();
  if (!pass) return;
  if (cloudTimer) clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveCloudState({ data: { pass, state: db as any } }).catch(
      (e) => console.error("[cloud] falha ao salvar:", e),
    );
  }, 600);
}

let cloudSyncPromise: Promise<boolean> | null = null;
/** Baixa os dados da nuvem (ou sobe os locais na primeira vez). Roda 1x por sessão. */
export function ensureCloudSync(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (cloudSyncPromise) return cloudSyncPromise;
  const pass = getPass();
  if (!pass) return Promise.resolve(false);
  cloudSyncPromise = (async () => {
    try {
      const res = await loadCloudState({ data: { pass } });
      const remote = ((res as { state?: Partial<DB> | null })?.state ?? null) as Partial<DB> | null;
      const local = loadDB();
      if (remote && dbHasHistory(remote)) {
        const normalized = normalizeDB(remote);
        localStorage.setItem(KEY, JSON.stringify(normalized));
        window.dispatchEvent(new Event("aeturnum:db"));
        return true;
      }
      if (dbHasHistory(local)) {
        // primeira sincronização: sobe os dados locais para a nuvem
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await saveCloudState({ data: { pass, state: local as any } });
        return true;
      }
      return false;
    } catch (e) {
      console.error("[cloud] falha ao sincronizar:", e);
      cloudSyncPromise = null; // permite tentar de novo
      return false;
    }
  })();
  return cloudSyncPromise;
}

/**
 * Recalcula totalCost de um pedido + redistribui no estoque.
 * Frete dividido APENAS pelos frascos que chegaram (perdidas/recompras não diluem).
 * Itens lost/rebuy não entram em estoque (mas mantêm seu custo de produto registrado).
 * usage="consumo" => inventoryConsumo + cria/atualiza protocolo (descontando "consumed")
 * usage="revenda" => inventory
 */
export function applyOrderToInventory(d: DB, order: Order) {
  const totalOrderVials = order.products.reduce((s, p) => s + vialsOf(p), 0);
  const propinaUSD = order.directBR ? 0 : totalOrderVials * PROPINA_PY_USD;
  const freightBRLTotal = (order.freightChina + order.freightUSA + propinaUSD) * USD_BRL + order.freightBR;
  const arrivedVials = order.products
    .filter(p => p.status === "arrived")
    .reduce((s, p) => s + vialsOf(p), 0) || 1;
  const freightPerVial = freightBRLTotal / arrivedVials;

  let totalCost = 0;
  for (const p of order.products) {
    const vials = vialsOf(p);
    // custo total mercadoria = boxes * preço/box, na moeda escolhida (padrão USD)
    const productBRL = productCostBRL(p);
    const freightAlloc = p.status === "arrived" ? freightPerVial * vials : 0;
    totalCost += productBRL + freightAlloc;

    if (p.status !== "arrived") continue;

    const key = p.name.trim();
    if (!key || vials <= 0) continue;
    const consumed = Math.min(Math.max(0, p.consumed || 0), vials);
    const remaining = vials - consumed;

    if (remaining > 0) {
      const bucket = p.usage === "revenda" ? d.inventory : d.inventoryConsumo;
      const allocated = productBRL + freightAlloc;
      const unitCost = allocated / vials;
      const remainingCost = unitCost * remaining;
      const existing = bucket[key];
      if (existing) {
        existing.vials += remaining;
        existing.totalCost += remainingCost;
        existing.mgPerVial = p.mgPerVial;
      } else {
        bucket[key] = { name: key, mgPerVial: p.mgPerVial, vials: remaining, totalCost: remainingCost };
      }
    }

    if (p.usage === "consumo") {
      let proto = d.protocols.find(pr => pr.peptideName.trim().toLowerCase() === key.toLowerCase());
      if (!proto) {
        proto = {
          id: uid(), peptideName: key, currentStock: 0, vials: 0,
          dailyDosage: 0, applicationTime: "08:00",
          daysOfWeek: ["mon","tue","wed","thu","fri","sat","sun"],
        };
        d.protocols.push(proto);
      }
      proto.vials += remaining;
      proto.currentStock += remaining * p.mgPerVial;
    }
  }
  order.totalCost = totalCost;
}

const findInventoryKey = (inventory: Inventory, productKey?: string, productName?: string) => {
  if (productKey && inventory[productKey]) return productKey;
  const name = (productName || productKey || "").trim().toLowerCase();
  return Object.keys(inventory).find(k => k.trim().toLowerCase() === name);
};

function subtractInventoryVials(item: InventoryItem, qty: number) {
  if (qty <= 0 || item.vials <= 0) return;
  const unitCost = item.totalCost / item.vials;
  item.vials = Math.max(0, item.vials - qty);
  item.totalCost = Math.max(0, item.totalCost - unitCost * qty);
}

function recalcSaleFromCurrentStock(d: DB, sale: Sale) {
  const gross = sale.qty * sale.salePrice;
  const commissions = (sale.commission1?.amount || 0) + (sale.commission2?.amount || 0);
  const net = sale.type === "sample" ? 0 : gross - sale.discount - commissions;
  // procura em revenda primeiro; depois consumo (permite vender frasco do estoque pessoal)
  let bucket: Inventory | undefined;
  let key = findInventoryKey(d.inventory, sale.productKey, sale.productName);
  if (key) bucket = d.inventory;
  else {
    key = findInventoryKey(d.inventoryConsumo, sale.productKey, sale.productName);
    if (key) bucket = d.inventoryConsumo;
  }
  const inv = key && bucket ? bucket[key] : undefined;
  const fallbackUnitCost = sale.qty > 0 ? sale.productCost / sale.qty : 0;
  const unitCost = inv && inv.vials > 0 ? inv.totalCost / inv.vials : fallbackUnitCost;
  const productCost = unitCost * sale.qty;

  let profit = 0;
  if (sale.type === "sample") {
    profit = -productCost;
  } else if (sale.type === "marco" || sale.type === "dereck") {
    // parceria (Marco ou Dereck): custo fixo R$500/un, lucro dividido 50/50
    const partnerProfit = net - MARCO_UNIT_COST_BRL * sale.qty - (sale.operationalCost || 0);
    const partnerCommission = Math.max(0, partnerProfit / 2);
    profit = net - productCost - partnerCommission;
  } else {
    profit = net - productCost;
  }

  sale.grossRevenue = gross;
  sale.netRevenue = net;
  sale.productCost = productCost;
  sale.profit = profit;

  if (inv) subtractInventoryVials(inv, sale.qty);
}


function applyApplicationsToStock(d: DB) {
  for (const app of d.applications.filter(a => a.status === "applied")) {
    const proto = d.protocols.find(p => p.id === app.peptideId)
      || d.protocols.find(p => p.peptideName.trim().toLowerCase() === app.peptideName.trim().toLowerCase());
    const consumoKey = findInventoryKey(d.inventoryConsumo, undefined, app.peptideName);
    const revendaKey = findInventoryKey(d.inventory, undefined, app.peptideName);
    const inv = consumoKey ? d.inventoryConsumo[consumoKey] : revendaKey ? d.inventory[revendaKey] : undefined;
    const dose = Math.max(0, Number(app.dose || 0));
    const mgPerVial = inv?.mgPerVial || (proto && proto.vials > 0 ? proto.currentStock / proto.vials : 0);
    const usedVials = mgPerVial > 0 ? dose / mgPerVial : 0;

    if (proto) {
      proto.currentStock = Math.max(0, proto.currentStock - dose);
      if (mgPerVial > 0) proto.vials = Math.max(0, proto.currentStock / mgPerVial);
    }
    if (inv && usedVials > 0) subtractInventoryVials(inv, usedVials);
  }
}

/** Recompute both inventories + protocols from scratch using all orders, applications and sales. */
export function recomputeInventories(d: DB) {
  d.inventory = {};
  d.inventoryConsumo = {};
  // zera estoque dos protocolos antes de reaplicar
  for (const p of d.protocols) { p.vials = 0; p.currentStock = 0; }
  for (const o of d.orders) applyOrderToInventory(d, o);

  // baixa aplicações do estoque pessoal/protocolo de forma persistente
  applyApplicationsToStock(d);

  // recalcula custo/lucro e subtrai TODAS as vendas (normal, amostra, Marco Túlio) do estoque de revenda
  for (const s of d.sales) {
    recalcSaleFromCurrentStock(d, s);
  }

  // sincroniza catálogo
  if (!d.savedProducts) d.savedProducts = [];
  for (const o of d.orders) {
    for (const p of o.products) {
      const key = p.name.trim();
      if (!key) continue;
      const ex = d.savedProducts.find(sp => sp.name.toLowerCase() === key.toLowerCase());
      if (ex) {
        ex.mgPerVial = p.mgPerVial;
        ex.priceUSD = boxPriceUSD(p);
        ex.frascosPerBox = p.frascosPerBox || ex.frascosPerBox || 1;
      } else {
        d.savedProducts.push({ name: key, mgPerVial: p.mgPerVial, priceUSD: boxPriceUSD(p), frascosPerBox: p.frascosPerBox || 1 });
      }
    }
  }
}

export function computeOrderCost(products: OrderProduct[], fChina: number, fUSA: number, fBR: number, directBR = false) {
  // valor de produtos = soma( boxes * preço_por_box ), respeitando a moeda de cada produto
  const productsUSD = products.reduce((s, p) => s + productCostUSD(p), 0);
  const productsBRL = products.reduce((s, p) => s + productCostBRL(p), 0);
  const totalOrderVials = products.reduce((s, p) => s + vialsOf(p), 0);
  const propinaUSD = directBR ? 0 : totalOrderVials * PROPINA_PY_USD;
  const propinaBRL = propinaUSD * USD_BRL;
  const freightBRLTotal = (fChina + fUSA + propinaUSD) * USD_BRL + fBR;
  const arrivedVials = products.filter(p => p.status === "arrived").reduce((s, p) => s + vialsOf(p), 0);
  const freightPerVial = arrivedVials ? freightBRLTotal / arrivedVials : 0;
  const perProduct = products.map(p => {
    const vials = vialsOf(p);
    const productPerVialBRL = vials ? productCostBRL(p) / vials : 0;
    const freightAlloc = p.status === "arrived" ? freightPerVial : 0;
    const costPerVial = productPerVialBRL + freightAlloc;
    return {
      name: p.name,
      vials,
      productPerVialBRL,
      costPerVial,
      totalCost: vials * costPerVial,
    };
  });
  return {
    productsUSD, productsBRL, freightBRLTotal, propinaBRL, propinaUSD,
    totalBRL: productsBRL + freightBRLTotal,
    totalVials: arrivedVials, freightPerVial,
    perProduct,
  };
}

export function useDB() {
  const [db, setDb] = useState<DB>(EMPTY_DB);
  useEffect(() => {
    setDb(loadDB());
    ensureCloudSync();
    const handler = () => setDb(loadDB());
    window.addEventListener("aeturnum:db", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("aeturnum:db", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const update = useCallback((mut: (d: DB) => DB | void) => {
    const current = loadDB();
    const next = mut(current) ?? current;
    saveDB(next);
    setDb({ ...next });
  }, []);

  return { db, update };
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtPct = (v: number) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export const DAYS = [
  { id: "sun", short: "Dom", name: "Domingo" },
  { id: "mon", short: "Seg", name: "Segunda" },
  { id: "tue", short: "Ter", name: "Terça" },
  { id: "wed", short: "Qua", name: "Quarta" },
  { id: "thu", short: "Qui", name: "Quinta" },
  { id: "fri", short: "Sex", name: "Sexta" },
  { id: "sat", short: "Sáb", name: "Sábado" },
];

export const dayIdFromDate = (d: Date) => DAYS[d.getDay()].id;

export function stockDurationDays(p: Protocol): number {
  const activeDays = p.daysOfWeek.length || 7;
  const weeklyConsumption = p.dailyDosage * activeDays;
  const dailyAvg = weeklyConsumption / 7;
  if (dailyAvg <= 0) return Infinity;
  return Math.floor(p.currentStock / dailyAvg);
}

export function adherence(apps: Application[], days: number) {
  const since = Date.now() - days * 86400000;
  const recent = apps.filter((a) => new Date(a.dateTime).getTime() >= since);
  const applied = recent.filter((a) => a.status === "applied").length;
  const total = recent.length;
  return { applied, total, pct: total === 0 ? 100 : (applied / total) * 100 };
}

/** Total perdido (mercadoria não chegou) em R$ */
export function totalLoss(orders: Order[]): number {
  let loss = 0;
  for (const o of orders) {
    const totalVials = o.products.reduce((s, p) => s + vialsOf(p), 0) || 1;
    const propinaUSD = totalVials * PROPINA_PY_USD;
    const freightBRL = (o.freightChina + o.freightUSA + propinaUSD) * USD_BRL + o.freightBR;
    const freightPerVial = freightBRL / totalVials;
    for (const p of o.products) {
      if (p.status === "lost") {
        const v = vialsOf(p);
        const productPerVialBRL = v ? ((p.boxQty || 0) * p.priceUSD * USD_BRL) / v : 0;
        loss += v * (productPerVialBRL + freightPerVial);
      }
    }
  }
  return loss;
}

export function exportBackup() {
  const data = loadDB();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aeturnum-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result as string);
        saveDB({ ...EMPTY_DB, ...parsed });
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = reject;
    r.readAsText(file);
  });
}

// Auth (persistente — não pede senha de novo a cada visita)
export const AUTH_KEY = "aeturnum_role";
export type Role = "admin" | "user" | "marco" | "dereck" | "influencer";
/** Nome do influenciador logado (quando role = "influencer") */
export const INFLUENCER_KEY = "aeturnum_influencer";
export function setInfluencerName(name: string) {
  localStorage.setItem(INFLUENCER_KEY, name);
}
export function getInfluencerName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(INFLUENCER_KEY);
}
export function setRole(r: Role) {
  localStorage.setItem(AUTH_KEY, r);
  sessionStorage.setItem(AUTH_KEY, r);
}
export function getRole(): Role | null {
  if (typeof window === "undefined") return null;
  return (
    (localStorage.getItem(AUTH_KEY) as Role) ||
    (sessionStorage.getItem(AUTH_KEY) as Role) ||
    null
  );
}
/** Senha usada para autenticar a sincronização com a nuvem */
export function getPass(): string | null {
  const r = getRole();
  if (r === "admin") return "AeternumPeps$";
  if (r === "user") return "DharmanPeps$";
  if (r === "marco") return "AeternumPeps$"; // Marco compartilha os mesmos dados do admin
  if (r === "dereck") return "AeternumPeps$"; // Dereck idem
  if (r === "influencer") return "AeternumPeps$"; // influenciador idem (leitura)
  return null;
}
export function clearRole() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(INFLUENCER_KEY);
}
