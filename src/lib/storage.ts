import { useEffect, useState, useCallback } from "react";

export type Product = {
  id: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  stock: number;
  ideal: number;
  alertPct: number;
  photo?: string; // dataURL
  active?: boolean; // show in catalog
  description?: string;
  barcode?: string;
  createdAt: string;
};

export type SaleItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
  cost: number;
};

export type Sale = {
  id: string;
  date: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal?: number;
  discount?: number;
  couponCode?: string;
  total: number; // net (subtotal - discount)
  cost: number;
  profit: number;
  payment: "dinheiro" | "pix" | "credito" | "debito" | "outro";
  notes?: string;
};

export type PurchaseItem = {
  productId: string;
  name: string;
  qty: number;
  cost: number;
};

export type Purchase = {
  id: string;
  date: string;
  supplier?: string;
  items: PurchaseItem[];
  total: number;
  notes?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
};

export type Service = {
  id: string;
  date: string;
  technician: string;
  work: string;
  customerName: string;
  customerPhone: string;
  details: string;
  photos: string[]; // 4-6 dataURLs
  deadline: string; // ISO date
  price: number;
  discount: number;
  couponCode?: string;
  status: "aberta" | "andamento" | "concluida" | "entregue";
};

export type Promotion = {
  id: string;
  keyword: string; // uppercase
  type: "fixo" | "percent";
  value: number; // BRL or %
  active: boolean;
  minValue?: number; // min purchase to apply
  createdAt: string;
};

export type BusinessConfig = {
  name: string;
  cnpj: string;
  phone: string;
  address: string;
  taxRatePct: number;
};

export type ThemeMode = "dark" | "light";

const KEYS = {
  products: "mm.products",
  sales: "mm.sales",
  purchases: "mm.purchases",
  customers: "mm.customers",
  services: "mm.services",
  promotions: "mm.promotions",
  config: "mm.config",
  theme: "mm.theme",
} as const;

type StoreKey = keyof typeof KEYS;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("mm-store", { detail: { key } }));
  } catch {
    window.dispatchEvent(new CustomEvent("mm-store", { detail: { key } }));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeProduct(value: unknown): Product | null {
  if (!isRecord(value)) return null;
  const id = str(value.id, uidFallback());
  const name = str(value.name).trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    category: str(value.category),
    cost: num(value.cost),
    price: num(value.price),
    stock: num(value.stock),
    ideal: num(value.ideal, 10),
    alertPct: num(value.alertPct, 15),
    photo: typeof value.photo === "string" ? value.photo : undefined,
    active: typeof value.active === "boolean" ? value.active : true,
    description: typeof value.description === "string" ? value.description : undefined,
    barcode: typeof value.barcode === "string" ? value.barcode : undefined,
    createdAt: str(value.createdAt, new Date().toISOString()),
  };
}

function normalizeSaleItem(value: unknown): SaleItem | null {
  if (!isRecord(value)) return null;
  const productId = str(value.productId);
  const name = str(value.name).trim();
  if (!productId || !name) return null;
  return {
    productId,
    name,
    qty: Math.max(0, num(value.qty)),
    price: num(value.price),
    cost: num(value.cost),
  };
}

function normalizePurchaseItem(value: unknown): PurchaseItem | null {
  if (!isRecord(value)) return null;
  const productId = str(value.productId);
  const name = str(value.name).trim();
  if (!productId || !name) return null;
  return {
    productId,
    name,
    qty: Math.max(0, num(value.qty)),
    cost: num(value.cost),
  };
}

function normalizeSale(value: unknown): Sale | null {
  if (!isRecord(value)) return null;
  const items = list(value.items).map(normalizeSaleItem).filter((item) => item !== null);
  const id = str(value.id, uidFallback());
  const total = num(value.total);
  const payment = ["dinheiro", "pix", "credito", "debito", "outro"].includes(str(value.payment))
    ? (str(value.payment) as Sale["payment"])
    : "outro";
  return {
    id,
    date: str(value.date, new Date().toISOString()),
    customerId: typeof value.customerId === "string" ? value.customerId : undefined,
    customerName: typeof value.customerName === "string" ? value.customerName : undefined,
    items,
    subtotal: typeof value.subtotal === "number" ? value.subtotal : undefined,
    discount: typeof value.discount === "number" ? value.discount : undefined,
    couponCode: typeof value.couponCode === "string" ? value.couponCode : undefined,
    total,
    cost: num(value.cost),
    profit: num(value.profit, total - num(value.cost)),
    payment,
    notes: typeof value.notes === "string" ? value.notes : undefined,
  };
}

function normalizePurchase(value: unknown): Purchase | null {
  if (!isRecord(value)) return null;
  const items = list(value.items).map(normalizePurchaseItem).filter((item) => item !== null);
  return {
    id: str(value.id, uidFallback()),
    date: str(value.date, new Date().toISOString()),
    supplier: typeof value.supplier === "string" ? value.supplier : undefined,
    items,
    total: num(value.total, items.reduce((sum, item) => sum + item.qty * item.cost, 0)),
    notes: typeof value.notes === "string" ? value.notes : undefined,
  };
}

function normalizeCustomer(value: unknown): Customer | null {
  if (!isRecord(value)) return null;
  const name = str(value.name).trim();
  if (!name) return null;
  return {
    id: str(value.id, uidFallback()),
    name,
    phone: typeof value.phone === "string" ? value.phone : undefined,
    notes: typeof value.notes === "string" ? value.notes : undefined,
    createdAt: str(value.createdAt, new Date().toISOString()),
  };
}

function normalizeService(value: unknown): Service | null {
  if (!isRecord(value)) return null;
  const status = ["aberta", "andamento", "concluida", "entregue"].includes(str(value.status))
    ? (str(value.status) as Service["status"])
    : "aberta";
  return {
    id: str(value.id, uidFallback()),
    date: str(value.date, new Date().toISOString()),
    technician: str(value.technician),
    work: str(value.work),
    customerName: str(value.customerName),
    customerPhone: str(value.customerPhone),
    details: str(value.details),
    photos: list(value.photos).filter((photo): photo is string => typeof photo === "string").slice(0, 6),
    deadline: str(value.deadline, new Date().toISOString().slice(0, 10)),
    price: num(value.price),
    discount: num(value.discount),
    couponCode: typeof value.couponCode === "string" ? value.couponCode : undefined,
    status,
  };
}

function normalizePromotion(value: unknown): Promotion | null {
  if (!isRecord(value)) return null;
  const keyword = str(value.keyword).trim().toUpperCase();
  if (!keyword) return null;
  return {
    id: str(value.id, uidFallback()),
    keyword,
    type: str(value.type) === "fixo" ? "fixo" : "percent",
    value: num(value.value),
    active: bool(value.active, true),
    minValue: typeof value.minValue === "number" ? value.minValue : undefined,
    createdAt: str(value.createdAt, new Date().toISOString()),
  };
}

function uidFallback() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function sanitizeStoreValue(name: StoreKey, value: unknown, fallback: unknown): unknown {
  switch (name) {
    case "products":
      return list(value).map(normalizeProduct).filter((item) => item !== null);
    case "sales":
      return list(value).map(normalizeSale).filter((item) => item !== null);
    case "purchases":
      return list(value).map(normalizePurchase).filter((item) => item !== null);
    case "customers":
      return list(value).map(normalizeCustomer).filter((item) => item !== null);
    case "services":
      return list(value).map(normalizeService).filter((item) => item !== null);
    case "promotions":
      return list(value).map(normalizePromotion).filter((item) => item !== null);
    case "config":
      return isRecord(value)
        ? {
            ...defaultConfig,
            name: str(value.name, defaultConfig.name),
            cnpj: str(value.cnpj),
            phone: str(value.phone),
            address: str(value.address),
            taxRatePct: num(value.taxRatePct, defaultConfig.taxRatePct),
          }
        : fallback;
    case "theme":
      return value === "light" || value === "dark" ? value : fallback;
    default:
      return fallback;
  }
}

function readStore<T>(name: StoreKey, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEYS[name]);
    if (!raw) return fallback;
    return sanitizeStoreValue(name, JSON.parse(raw), fallback) as T;
  } catch {
    return fallback;
  }
}

export function useStore<T>(name: StoreKey, fallback: T) {
  const key = KEYS[name];
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(readStore<T>(name, fallback));
    setHydrated(true);
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (ce.detail?.key === key) setValue(readStore<T>(name, fallback));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(readStore<T>(name, fallback));
    };
    window.addEventListener("mm-store", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("mm-store", onChange);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, name]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        write(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, set, hydrated] as const;
}

export const useProducts = () => useStore<Product[]>("products", []);
export const useSales = () => useStore<Sale[]>("sales", []);
export const usePurchases = () => useStore<Purchase[]>("purchases", []);
export const useCustomers = () => useStore<Customer[]>("customers", []);
export const usePromotions = () => useStore<Promotion[]>("promotions", []);

// Services: auto-prune anything older than 90 days on hydration
export function useServices() {
  const store = useStore<Service[]>("services", []);
  const [value, set, hydrated] = store;
  useEffect(() => {
    if (!hydrated) return;
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const filtered = value.filter((s) => new Date(s.date).getTime() >= cutoff);
    if (filtered.length !== value.length) set(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  return store;
}

export const defaultConfig: BusinessConfig = {
  name: "STOKMASTER",
  cnpj: "",
  phone: "",
  address: "",
  taxRatePct: 6,
};

export const useConfig = () => useStore<BusinessConfig>("config", defaultConfig);

// Stock health helper
export type StockLevel = "full" | "good" | "mid" | "low" | "crit" | "empty";
export function stockLevel(p: Product): StockLevel {
  if (p.ideal <= 0) return "full";
  const pct = (p.stock / p.ideal) * 100;
  const alert = p.alertPct ?? 15;
  if (p.stock <= 0) return "crit";
  if (pct <= 15 || pct <= alert) return "crit";
  if (pct < 50) return "low";
  if (pct < 70) return "mid";
  if (pct < 100) return "good";
  return "full";
}

export const stockColorVar: Record<StockLevel, string> = {
  full: "var(--stock-full)",
  good: "var(--stock-good)",
  mid: "var(--stock-mid)",
  low: "var(--stock-low)",
  crit: "var(--stock-crit)",
  empty: "var(--stock-crit)",
};

export const stockLabel: Record<StockLevel, string> = {
  full: "Ideal",
  good: "Bom",
  mid: "Médio",
  low: "Baixo",
  crit: "Crítico",
  empty: "Zerado",
};

// Compute discount from promo
export function applyPromo(
  subtotal: number,
  promo: Promotion | undefined | null,
): { discount: number; ok: boolean; reason?: string } {
  if (!promo) return { discount: 0, ok: false };
  if (!promo.active) return { discount: 0, ok: false, reason: "Cupom inativo" };
  if (promo.minValue && subtotal < promo.minValue)
    return { discount: 0, ok: false, reason: `Mínimo ${promo.minValue}` };
  const raw =
    promo.type === "percent"
      ? (subtotal * promo.value) / 100
      : promo.value;
  return { discount: Math.min(subtotal, Math.max(0, raw)), ok: true };
}

export function findPromo(list: Promotion[], code: string) {
  const k = code.trim().toUpperCase();
  if (!k) return undefined;
  return list.find((p) => p.keyword.trim().toUpperCase() === k);
}

// Backup helpers
export function exportBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    products: read(KEYS.products, []),
    sales: read(KEYS.sales, []),
    purchases: read(KEYS.purchases, []),
    customers: read(KEYS.customers, []),
    services: read(KEYS.services, []),
    promotions: read(KEYS.promotions, []),
    config: read(KEYS.config, defaultConfig),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stokmaster-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.products) write(KEYS.products, sanitizeStoreValue("products", data.products, []));
        if (data.sales) write(KEYS.sales, sanitizeStoreValue("sales", data.sales, []));
        if (data.purchases) write(KEYS.purchases, sanitizeStoreValue("purchases", data.purchases, []));
        if (data.customers) write(KEYS.customers, sanitizeStoreValue("customers", data.customers, []));
        if (data.services) write(KEYS.services, sanitizeStoreValue("services", data.services, []));
        if (data.promotions) write(KEYS.promotions, sanitizeStoreValue("promotions", data.promotions, []));
        if (data.config) write(KEYS.config, sanitizeStoreValue("config", data.config, defaultConfig));
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// Image helper: resize an image File to a JPEG dataURL (max side 1024) to keep localStorage small
export async function fileToResizedDataURL(
  file: File,
  maxSide = 1024,
  quality = 0.8,
): Promise<string> {
  const dataURL = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("img load"));
    i.src = dataURL;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context unavailable");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
