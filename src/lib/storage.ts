import { useEffect, useState, useCallback } from "react";

export type Product = {
  id: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  stock: number;
  ideal: number; // ideal quantity
  alertPct: number; // percent (0-100) below which we alert; default 15
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
  total: number;
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
  phone?: string; // digits only, with country code preferred
  notes?: string;
  createdAt: string;
};

export type BusinessConfig = {
  name: string;
  cnpj: string;
  phone: string;
  address: string;
  taxRatePct: number; // estimated tax rate for reports (default 6 for Simples MEI-like)
};

export type ThemeMode = "dark" | "light";

const KEYS = {
  products: "mm.products",
  sales: "mm.sales",
  purchases: "mm.purchases",
  customers: "mm.customers",
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
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("mm-store", { detail: { key } }));
}

export function useStore<T>(name: StoreKey, fallback: T) {
  const key = KEYS[name];
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(read<T>(key, fallback));
    setHydrated(true);
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (ce.detail?.key === key) setValue(read<T>(key, fallback));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(read<T>(key, fallback));
    };
    window.addEventListener("mm-store", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("mm-store", onChange);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

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

// Backup helpers
export function exportBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    products: read(KEYS.products, []),
    sales: read(KEYS.sales, []),
    purchases: read(KEYS.purchases, []),
    customers: read(KEYS.customers, []),
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
        if (data.products) write(KEYS.products, data.products);
        if (data.sales) write(KEYS.sales, data.sales);
        if (data.purchases) write(KEYS.purchases, data.purchases);
        if (data.customers) write(KEYS.customers, data.customers);
        if (data.config) write(KEYS.config, data.config);
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
