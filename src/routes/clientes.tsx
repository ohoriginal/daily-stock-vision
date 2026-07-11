import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useCustomers, useSales, type Customer } from "@/lib/storage";
import { brl, fmtDate, todayISO, uid } from "@/lib/format";
import { Plus, X, Trash2, Pencil, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes")({
  component: Clientes,
});

function Clientes() {
  const [customers, setCustomers] = useCustomers();
  const [sales] = useSales();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    if (!qn) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(qn) ||
        (c.phone || "").toLowerCase().includes(qn) ||
        (c.notes || "").toLowerCase().includes(qn),
    );
  }, [customers, q]);

  const salesByCustomer = useMemo(() => {
    const m = new Map<string, typeof sales>();
    sales.forEach((s) => {
      if (!s.customerId) return;
      const arr = m.get(s.customerId) || [];
      arr.push(s);
      m.set(s.customerId, arr);
    });
    return m;
  }, [sales]);

  const save = (c: Customer) => {
    if (!c.name.trim()) return toast.error("Nome é obrigatório");
    setCustomers((prev) =>
      prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c],
    );
    setEditing(null);
    toast.success("Cliente salvo");
  };

  const remove = (id: string) => {
    if (!confirm("Excluir este cliente?")) return;
    setCustomers((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <AppShell>
      <PageHeader
        title="Clientes"
        subtitle={`${customers.length} cadastrado(s)`}
        action={
          <button
            onClick={() => setEditing({ id: uid(), name: "", phone: "", notes: "", createdAt: todayISO() })}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={16} /> Novo
          </button>
        }
      />

      {customers.length > 0 && (
        <div className="relative mb-3">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-[color:var(--gold)]"
          />
        </div>
      )}

      {customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum cliente ainda.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum resultado.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const list = salesByCustomer.get(c.id) || [];
            const total = list.reduce((a, b) => a + b.total, 0);
            const isOpen = expanded === c.id;
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
                  <button className="min-w-0 text-left" onClick={() => setExpanded(isOpen ? null : c.id)}>
                    <div className="truncate font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {list.length} compra(s) · Total {brl(total)}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </div>
                  </button>
                  <div className="flex gap-1">
                    {c.phone && (
                      <a
                        href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-[#25D366] hover:bg-accent"
                        aria-label="WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                    <button onClick={() => setEditing(c)} className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-accent">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(c.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-[color:var(--stock-crit)] hover:bg-accent">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-border p-3">
                    {list.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Sem compras.</div>
                    ) : (
                      <ul className="space-y-1 text-xs">
                        {list.map((s) => (
                          <li key={s.id} className="flex justify-between">
                            <span>{fmtDate(s.date)} · {s.items.length} item(s)</span>
                            <span className="font-semibold">{brl(s.total)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center">
          <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: "var(--gold)" }}>Cliente</h2>
              <button onClick={() => setEditing(null)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-accent"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Nome" className={inputCls} />
              <input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="WhatsApp com DDD (ex: 5511999998888)" className={inputCls} />
              <textarea value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Observação" className={inputCls} rows={3} />
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-xl border border-border py-2 text-sm">Cancelar</button>
              <button onClick={() => save(editing)} className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--gold)]";
