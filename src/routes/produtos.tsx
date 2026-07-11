import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  useProducts,
  stockLevel,
  stockColorVar,
  stockLabel,
  fileToResizedDataURL,
  type Product,
} from "@/lib/storage";
import { brl, uid, todayISO } from "@/lib/format";
import { Plus, Search, Pencil, Trash2, X, Camera, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/BarcodeScanner";

export const Route = createFileRoute("/produtos")({
  component: Produtos,
});

function Produtos() {
  const [products, setProducts] = useProducts();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todas");
  const [status, setStatus] = useState<"todos" | "alerta">("todos");
  const [sort, setSort] = useState<"nome" | "preco-asc" | "preco-desc">("nome");
  const [scanning, setScanning] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const arr = products.filter((p) => {
      if (qn) {
        const hit =
          p.name.toLowerCase().includes(qn) ||
          (p.barcode || "").toLowerCase().includes(qn) ||
          (p.category || "").toLowerCase().includes(qn);
        if (!hit) return false;
      }
      if (cat !== "todas" && p.category !== cat) return false;
      if (status === "alerta") {
        const l = stockLevel(p);
        if (l !== "crit" && l !== "low") return false;
      }
      return true;
    });
    if (sort === "preco-asc") arr.sort((a, b) => a.price - b.price);
    else if (sort === "preco-desc") arr.sort((a, b) => b.price - a.price);
    else arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [products, q, cat, status, sort]);

  const onScan = (code: string) => {
    setScanning(false);
    const found = products.find((p) => (p.barcode || "") === code);
    if (found) {
      setQ(found.name);
      toast.success(`Encontrado: ${found.name}`);
    } else {
      setQ(code);
      toast.message("Nenhum produto com esse código", {
        description: "Você pode cadastrá-lo agora.",
      });
    }
  };

  const openNew = () => {
    setEditing({
      id: uid(),
      name: "",
      category: "",
      cost: 0,
      price: 0,
      stock: 0,
      ideal: 10,
      alertPct: 15,
      active: true,
      description: "",
      createdAt: todayISO(),
    });
    setOpen(true);
  };

  const save = (p: Product) => {
    if (!p.name.trim()) return toast.error("Nome é obrigatório");
    setProducts((prev) => {
      const exists = prev.some((x) => x.id === p.id);
      return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
    });
    toast.success("Produto salvo");
    setOpen(false);
    setEditing(null);
  };

  const remove = (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    setProducts((prev) => prev.filter((x) => x.id !== id));
    toast.success("Produto excluído");
  };

  return (
    <AppShell>
      <PageHeader
        title="Produtos"
        subtitle={`${products.length} cadastrado(s)`}
        action={
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus size={16} /> Novo
          </button>
        }
      />

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, categoria ou código..."
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-[color:var(--gold)]"
          />
        </div>
        <button
          onClick={() => setScanning(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--gold)]/60 bg-card px-3 py-2 text-sm font-semibold"
          style={{ color: "var(--gold)" }}
        >
          <ScanLine size={16} /> Escanear
        </button>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="todas">Todas categorias</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="nome">Ordem: Nome</option>
          <option value="preco-asc">Preço: menor → maior</option>
          <option value="preco-desc">Preço: maior → menor</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "todos" | "alerta")}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="todos">Todos</option>
          <option value="alerta">Em alerta</option>
        </select>
      </div>

      {scanning && (
        <BarcodeScanner onDetected={onScan} onClose={() => setScanning(false)} />
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {products.length === 0 ? "Nenhum produto ainda. Toque em Novo." : "Nenhum resultado."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {filtered.map((p) => {
            const lvl = stockLevel(p);
            const pct = p.ideal > 0 ? Math.min(100, (p.stock / p.ideal) * 100) : 100;
            return (
              <div
                key={p.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {p.photo ? (
                    <img src={p.photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">
                      s/ foto
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: stockColorVar[lvl] }}
                    />
                    <div className="truncate font-semibold">{p.name}</div>
                    {p.active !== false && (
                      <span className="rounded-full border border-[color:var(--gold)]/40 px-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
                        Catálogo
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {p.category || "Sem categoria"} · Custo {brl(p.cost)} · Venda {brl(p.price)}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, background: stockColorVar[lvl] }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: stockColorVar[lvl] }}
                    >
                      {stockLabel[lvl]}
                    </span>
                  </div>
                  <div className="mt-1 text-xs">
                    <span className="font-semibold" style={{ color: stockColorVar[lvl] }}>
                      {p.stock}
                    </span>
                    <span className="text-muted-foreground"> / ideal {p.ideal} · alerta {p.alertPct}%</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    onClick={() => { setEditing(p); setOpen(true); }}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-accent"
                    aria-label="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-border text-[color:var(--stock-crit)] hover:bg-accent"
                    aria-label="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && editing && (
        <ProductModal
          value={editing}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSave={save}
        />
      )}
    </AppShell>
  );
}

function ProductModal({
  value,
  onClose,
  onSave,
}: {
  value: Product;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [p, setP] = useState<Product>(value);
  const set = <K extends keyof Product>(k: K, v: Product[K]) =>
    setP((prev) => ({ ...prev, [k]: v }));

  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    try {
      const url = await fileToResizedDataURL(f, 900, 0.8);
      set("photo", url);
    } catch {
      toast.error("Não foi possível carregar a foto");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "var(--gold)" }}>
            {value.name ? "Editar produto" : "Novo produto"}
          </h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-accent">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-20 w-20 overflow-hidden rounded-xl bg-muted">
              {p.photo ? (
                <img src={p.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">sem foto</div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs">
                <Camera size={12} /> Escolher foto
                <input type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
              </label>
              {p.photo && (
                <button onClick={() => set("photo", undefined)} className="rounded-lg border border-border px-3 py-1 text-xs text-[color:var(--stock-crit)]">
                  Remover foto
                </button>
              )}
            </div>
          </div>
          <Field label="Nome">
            <input value={p.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Categoria">
            <input value={p.category} onChange={(e) => set("category", e.target.value)} className={inputCls} placeholder="Ex: Capinhas, Cabos..." />
          </Field>
          <Field label="Código de barras (opcional)">
            <div className="flex gap-2">
              <input
                value={p.barcode || ""}
                onChange={(e) => set("barcode", e.target.value)}
                placeholder="Escaneie ou digite"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--gold)]/60 px-3 text-xs font-semibold"
                style={{ color: "var(--gold)" }}
              >
                <ScanLine size={14} /> Ler
              </button>
            </div>
          </Field>
          <Field label="Descrição (para o catálogo)">
            <textarea value={p.description || ""} onChange={(e) => set("description", e.target.value)} rows={2} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Custo (R$)">
              <input type="number" step="0.01" value={p.cost} onChange={(e) => set("cost", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Preço venda (R$)">
              <input type="number" step="0.01" value={p.price} onChange={(e) => set("price", Number(e.target.value))} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Estoque atual">
              <input type="number" value={p.stock} onChange={(e) => set("stock", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Qtd. ideal">
              <input type="number" value={p.ideal} onChange={(e) => set("ideal", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Alerta (%)">
              <input type="number" min={1} max={100} value={p.alertPct} onChange={(e) => set("alertPct", Number(e.target.value))} className={inputCls} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={p.active !== false}
              onChange={(e) => set("active", e.target.checked)}
            />
            Mostrar no catálogo compartilhável
          </label>
          <p className="text-xs text-muted-foreground">
            Cores: verde 100% · azul 70% · lilás 50% · vermelho abaixo de {p.alertPct}% ou 15%.
          </p>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={() => onSave(p)}
            className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--gold)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
