import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { usePromotions, type Promotion } from "@/lib/storage";
import { uid, todayISO, brl } from "@/lib/format";
import { Plus, Trash2, X, Percent, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/promocoes")({
  component: Promocoes,
});

function Promocoes() {
  const [promos, setPromos] = usePromotions();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qn = q.trim().toUpperCase();
    if (!qn) return promos;
    return promos.filter((p) => p.keyword.toUpperCase().includes(qn));
  }, [promos, q]);

  const openNew = () => {
    setEditing({
      id: uid(),
      keyword: "",
      type: "percent",
      value: 10,
      active: true,
      minValue: 0,
      createdAt: todayISO(),
    });
    setOpen(true);
  };

  const save = (p: Promotion) => {
    const key = p.keyword.trim().toUpperCase();
    if (!key) return toast.error("Palavra-chave é obrigatória");
    if (p.value <= 0) return toast.error("Valor do desconto inválido");
    const normalized = { ...p, keyword: key };
    setPromos((prev) => {
      const exists = prev.some((x) => x.id === p.id);
      if (
        prev.some((x) => x.id !== p.id && x.keyword.toUpperCase() === key)
      ) {
        toast.error("Já existe um cupom com essa palavra-chave");
        return prev;
      }
      return exists
        ? prev.map((x) => (x.id === p.id ? normalized : x))
        : [...prev, normalized];
    });
    setOpen(false);
    setEditing(null);
    toast.success("Cupom salvo");
  };

  const remove = (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    setPromos((prev) => prev.filter((x) => x.id !== id));
  };

  const toggle = (id: string) =>
    setPromos((prev) =>
      prev.map((x) => (x.id === id ? { ...x, active: !x.active } : x)),
    );

  return (
    <AppShell>
      <PageHeader
        title="Promoções"
        subtitle={`${promos.length} cupom(ns) cadastrado(s)`}
        action={
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={16} /> Novo cupom
          </button>
        }
      />

      <p className="mb-3 text-xs text-muted-foreground">
        O cliente informa a palavra-chave na hora da venda ou serviço para
        ganhar o desconto configurado.
      </p>

      {promos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma promoção. Toque em Novo cupom.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {promos.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="truncate font-black tracking-widest"
                    style={{ color: "var(--gold)" }}
                  >
                    {p.keyword}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {p.type === "percent"
                      ? `${p.value}% de desconto`
                      : `${brl(p.value)} de desconto`}
                    {p.minValue ? ` · mínimo ${brl(p.minValue)}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => toggle(p.id)}
                    className={
                      "rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wider " +
                      (p.active
                        ? "border-[color:var(--stock-full)] text-[color:var(--stock-full)]"
                        : "border-border text-muted-foreground")
                    }
                  >
                    {p.active ? "Ativo" : "Inativo"}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(p);
                      setOpen(true);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border"
                    aria-label="Editar"
                  >
                    <Percent size={14} />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border text-[color:var(--stock-crit)]"
                    aria-label="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && editing && (
        <PromoModal
          value={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSave={save}
        />
      )}
    </AppShell>
  );
}

function PromoModal({
  value,
  onClose,
  onSave,
}: {
  value: Promotion;
  onClose: () => void;
  onSave: (p: Promotion) => void;
}) {
  const [p, setP] = useState<Promotion>(value);
  const set = <K extends keyof Promotion>(k: K, v: Promotion[K]) =>
    setP((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "var(--gold)" }}>
            Cupom de promoção
          </h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-accent">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Palavra-chave (o cliente digita este código)
            </span>
            <input
              value={p.keyword}
              onChange={(e) => set("keyword", e.target.value.toUpperCase())}
              placeholder="EX: PROMO10"
              className={inputCls}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                Tipo
              </span>
              <select
                value={p.type}
                onChange={(e) => set("type", e.target.value as Promotion["type"])}
                className={inputCls}
              >
                <option value="percent">Porcentagem (%)</option>
                <option value="fixo">Valor fixo (R$)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                Valor do desconto
              </span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={p.value}
                onChange={(e) => set("value", Number(e.target.value))}
                className={inputCls}
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Compra mínima (R$) — opcional
            </span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={p.minValue ?? 0}
              onChange={(e) => set("minValue", Number(e.target.value))}
              className={inputCls}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={p.active}
              onChange={(e) => set("active", e.target.checked)}
            />
            Cupom ativo
          </label>
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
