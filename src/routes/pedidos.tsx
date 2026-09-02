import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { pageHead } from "@/lib/seo";
import {
  useRestock,
  useProducts,
  useConfig,
  groupRestockByCategory,
  restockListText,
  type RestockItem,
} from "@/lib/storage";
import { ProductPicker } from "@/components/ProductPicker";
import { Search, Share2, Trash2, Minus, Plus, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pedidos")({
  head: () =>
    pageHead(
      "Lista de pedidos — STOKMASTER",
      "Produtos vendidos entram automaticamente na lista de reposição, separados por categoria e prontos para enviar no WhatsApp.",
    ),
  component: Pedidos,
});

function Pedidos() {
  const [restock, setRestock] = useRestock();
  const [products] = useProducts();
  const [config] = useConfig();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    if (!qn) return restock;
    return restock.filter(
      (r) =>
        r.name.toLowerCase().includes(qn) ||
        r.category.toLowerCase().includes(qn),
    );
  }, [restock, q]);

  const groups = useMemo(() => groupRestockByCategory(filtered), [filtered]);
  const totalUn = restock.reduce((a, b) => a + b.qty, 0);

  const setQty = (id: string, qty: number) =>
    setRestock((prev) =>
      prev.flatMap((r) =>
        r.id === id ? (qty <= 0 ? [] : [{ ...r, qty }]) : [r],
      ),
    );

  const remove = (id: string) =>
    setRestock((prev) => prev.filter((r) => r.id !== id));

  const clearAll = () => {
    if (restock.length === 0) return;
    setRestock([]);
    toast.success("Lista de pedidos limpa");
  };

  const addManual = (p: (typeof products)[number]) => {
    setRestock((prev) => {
      const found = prev.find((r) => r.productId === p.id);
      if (found)
        return prev.map((r) =>
          r.id === found.id ? { ...r, qty: r.qty + 1 } : r,
        );
      return [
        ...prev,
        {
          id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
          productId: p.id,
          name: p.name,
          category: (p.category || "").trim() || "Sem categoria",
          qty: 1,
          updatedAt: new Date().toISOString(),
        } satisfies RestockItem,
      ];
    });
    toast.success(`+1 ${p.name}`);
  };

  const share = async (items: RestockItem[], label: string) => {
    if (items.length === 0) return toast.error("Nada para enviar");
    const text = restockListText(items, config.name || "STOKMASTER");
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: label, text });
        return;
      }
    } catch {
      // usuário cancelou ou share indisponível
    }
    if (typeof window !== "undefined") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Lista de pedidos"
        subtitle={`${restock.length} produto(s) · ${totalUn} unidade(s) para repor`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => share(restock, "Lista de pedidos")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Share2 size={16} /> Enviar tudo
            </button>
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
            >
              <Trash2 size={16} />
            </button>
          </div>
        }
      />

      <div className="mb-3 space-y-2">
        <div>
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">
            Adicionar produto manualmente
          </span>
          <ProductPicker
            products={products}
            onPick={addManual}
            mode="compra"
            placeholder="Buscar produto para incluir no pedido..."
          />
        </div>
        {restock.length > 0 && (
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar na lista por produto ou categoria..."
              className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-[color:var(--gold)]"
            />
          </div>
        )}
      </div>

      {restock.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <ClipboardList size={20} className="mx-auto mb-2 opacity-60" />
          Nenhum pedido ainda. Os produtos vendidos entram aqui automaticamente.
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum resultado.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <section
              key={g.category}
              className="rounded-2xl border border-border bg-card"
            >
              <header className="flex items-center justify-between gap-2 border-b border-border p-3">
                <h2
                  className="truncate text-sm font-bold uppercase tracking-wide"
                  style={{ color: "var(--gold)" }}
                >
                  {g.category}
                </h2>
                <button
                  onClick={() => share(g.items, `Pedido — ${g.category}`)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold"
                >
                  <Share2 size={13} /> Enviar categoria
                </button>
              </header>
              <div>
                {g.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={
                      "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-3 " +
                      (idx > 0 ? "border-t border-border/60" : "")
                    }
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {item.qty} unidade(s) para repor
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        aria-label="Diminuir"
                        onClick={() => setQty(item.id, item.qty - 1)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">
                        {item.qty}
                      </span>
                      <button
                        aria-label="Aumentar"
                        onClick={() => setQty(item.id, item.qty + 1)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        aria-label="Remover"
                        onClick={() => remove(item.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
