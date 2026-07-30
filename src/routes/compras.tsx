import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { pageHead } from "@/lib/seo";
import {
  useProducts,
  usePurchases,
  type Purchase,
  type PurchaseItem,
} from "@/lib/storage";
import { brl, fmtDateTime, todayISO, uid } from "@/lib/format";
import { Plus, X, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { ProductPicker } from "@/components/ProductPicker";

export const Route = createFileRoute("/compras")({
  head: () =>
    pageHead(
      "Compras — STOKMASTER",
      "Registre compras offline, atualize estoque automaticamente e adicione produtos por código de barras.",
    ),
  component: Compras,
});

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--gold)]";

function Compras() {
  const [purchases, setPurchases, purchasesHydrated] = usePurchases();
  const [products, setProducts, productsHydrated] = useProducts();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ready = purchasesHydrated && productsHydrated;

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    if (!qn) return purchases;
    return purchases.filter(
      (p) =>
        (p.supplier || "").toLowerCase().includes(qn) ||
        p.items.some((i) => i.name.toLowerCase().includes(qn)) ||
        (p.notes || "").toLowerCase().includes(qn),
    );
  }, [purchases, q]);

  const removePurchase = (purchase: Purchase) => {
    if (!confirm("Apagar esta compra? O estoque adicionado por ela será revertido.")) return;
    setProducts((prev) =>
      prev.map((p) => {
        const it = purchase.items.find((i) => i.productId === p.id);
        if (!it) return p;
        return { ...p, stock: Math.max(0, p.stock - it.qty) };
      }),
    );
    setPurchases((prev) => prev.filter((x) => x.id !== purchase.id));
    toast.success("Compra apagada");
  };

  const finalize = (draft: Purchase) => {
    setProducts((prev) =>
      prev.map((p) => {
        const it = draft.items.find((i) => i.productId === p.id);
        if (!it) return p;
        return { ...p, stock: p.stock + it.qty, cost: it.cost || p.cost };
      }),
    );
    setPurchases((prev) => [draft, ...prev]);
    toast.success("Compra registrada");
    setOpen(false);
  };

  return (
    <AppShell>
      <PageHeader
        title="Compras"
        subtitle={ready ? `${purchases.length} compra(s) registrada(s)` : "Carregando dados locais..."}
        action={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Plus size={16} /> Nova compra
          </button>
        }
      />

      {ready && purchases.length > 0 && (
        <div className="relative mb-3">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por fornecedor ou produto..."
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-[color:var(--gold)]"
          />
        </div>
      )}

      {!ready ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Carregando compras salvas neste aparelho...
        </div>
      ) : purchases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma compra ainda.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum resultado.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{p.supplier || "Fornecedor não informado"}</div>
                <div className="text-xs text-muted-foreground">{fmtDateTime(p.date)} · {p.items.length} item(s)</div>
              </div>
              <div className="font-black" style={{ color: "var(--gold)" }}>{brl(p.total)}</div>
              <button
                onClick={() => removePurchase(p)}
                aria-label="Apagar compra"
                className="grid h-9 w-9 place-items-center rounded-lg text-[color:var(--stock-crit)] hover:bg-accent"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && <PurchaseModal products={products} onClose={() => setOpen(false)} onFinalize={finalize} />}
    </AppShell>
  );
}

function PurchaseModal({
  products,
  onClose,
  onFinalize,
}: {
  products: ReturnType<typeof useProducts>[0];
  onClose: () => void;
  onFinalize: (p: Purchase) => void;
}) {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const addProduct = (p: (typeof products)[number]) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing)
        return prev.map((i) =>
          i.productId === p.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [...prev, { productId: p.id, name: p.name, qty: 1, cost: p.cost }];
    });
    toast.success(`+1 ${p.name}`);
  };

  const onScan = (code: string) => {
    const p = products.find((x) => (x.barcode || "") === code);
    if (!p) return toast.error("Produto com esse código não encontrado");
    addProduct(p);
  };


  const total = items.reduce((a, b) => a + b.qty * b.cost, 0);

  const finish = () => {
    if (items.length === 0) return toast.error("Adicione ao menos um item");
    onFinalize({ id: uid(), date: todayISO(), supplier, items, total, notes });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "var(--gold)" }}>Nova compra</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-accent"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Fornecedor (opcional)" className={inputCls} />

          <div>
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Buscar produto para comprar
            </span>
            <ProductPicker
              products={products}
              onPick={addProduct}
              onScan={onScan}
              mode="compra"
              placeholder="Buscar produto por nome, categoria ou código..."
            />
          </div>


          {items.length > 0 && (
            <div className="rounded-xl border border-border">
              {items.map((it, idx) => (
                <div key={it.productId} className={"grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-3 " + (idx > 0 ? "border-t border-border" : "")}>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{it.name}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="text-xs">
                        <span className="text-muted-foreground">Qtd</span>
                        <input type="number" min={1} value={it.qty} onChange={(e) => setItems((prev) => prev.map((i) => i.productId === it.productId ? { ...i, qty: Number(e.target.value) } : i))} className={inputCls} />
                      </label>
                      <label className="text-xs">
                        <span className="text-muted-foreground">Custo unit.</span>
                        <input type="number" step="0.01" value={it.cost} onChange={(e) => setItems((prev) => prev.map((i) => i.productId === it.productId ? { ...i, cost: Number(e.target.value) } : i))} className={inputCls} />
                      </label>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Subtotal: {brl(it.qty * it.cost)}</div>
                  </div>
                  <button onClick={() => setItems((prev) => prev.filter((i) => i.productId !== it.productId))} className="self-start grid h-9 w-9 place-items-center rounded-lg text-[color:var(--stock-crit)] hover:bg-accent">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observação" className={inputCls} />

          <div className="rounded-xl bg-accent p-3 text-sm">
            <div className="flex justify-between"><span>Total</span><span className="font-black" style={{ color: "var(--gold)" }}>{brl(total)}</span></div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm">Cancelar</button>
          <button onClick={finish} className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Registrar</button>
        </div>
      </div>
    </div>
  );
}
