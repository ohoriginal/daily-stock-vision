import { useMemo, useState } from "react";
import { Search, ScanLine } from "lucide-react";
import { brl } from "@/lib/format";
import type { Product } from "@/lib/storage";
import { BarcodeScanner } from "@/components/BarcodeScanner";

export function ProductPicker({
  products,
  onPick,
  mode = "venda",
  placeholder = "Buscar produto por nome, categoria ou código...",
  onScan,
}: {
  products: Product[];
  onPick: (p: Product) => void;
  mode?: "venda" | "compra";
  placeholder?: string;
  onScan?: (code: string) => void;
}) {
  const [q, setQ] = useState("");
  const [scanning, setScanning] = useState(false);

  const results = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const arr = qn
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(qn) ||
            (p.category || "").toLowerCase().includes(qn) ||
            (p.barcode || "").toLowerCase().includes(qn),
        )
      : products;
    return [...arr].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 40);
  }, [products, q]);

  const handleScan = (code: string) => {
    setScanning(false);
    if (onScan) return onScan(code);
    const p = products.find((x) => (x.barcode || "") === code);
    if (p) onPick(p);
    else setQ(code);
  };

  return (
    <div className="rounded-xl border border-border">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-[color:var(--gold)]"
          />
        </div>
        <button
          type="button"
          onClick={() => setScanning(true)}
          aria-label="Escanear código de barras"
          className="grid h-9 w-9 place-items-center rounded-xl border border-[color:var(--gold)]/60"
          style={{ color: "var(--gold)" }}
        >
          <ScanLine size={16} />
        </button>
      </div>

      <div className="max-h-52 overflow-y-auto border-t border-border">
        {products.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground">
            Nenhum produto cadastrado.
          </div>
        ) : results.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground">
            Nenhum produto encontrado para "{q}".
          </div>
        ) : (
          results.map((p) => {
            const disabled = mode === "venda" && p.stock <= 0;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onPick(p)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/60 p-2 text-left last:border-b-0 hover:bg-accent disabled:opacity-40"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {p.category || "sem categoria"} · estoque {p.stock}
                    {p.barcode ? ` · ${p.barcode}` : ""}
                  </div>
                </div>
                <span className="text-sm font-bold" style={{ color: "var(--gold)" }}>
                  {mode === "venda" ? brl(p.price) : brl(p.cost)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {scanning && (
        <BarcodeScanner onDetected={handleScan} onClose={() => setScanning(false)} />
      )}
    </div>
  );
}
