import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  useServices,
  usePromotions,
  useConfig,
  applyPromo,
  findPromo,
  fileToResizedDataURL,
  type Service,
} from "@/lib/storage";
import { brl, fmtDate, fmtDateTime, todayISO, uid } from "@/lib/format";
import {
  Plus,
  X,
  Trash2,
  Share2,
  Wrench,
  Camera,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/servicos")({
  component: Servicos,
});

function digits(p: string) {
  return (p || "").replace(/\D/g, "");
}

function statusLabel(s: Service["status"]) {
  return {
    aberta: "Aberta",
    andamento: "Em andamento",
    concluida: "Concluída",
    entregue: "Entregue",
  }[s];
}

function osText(s: Service, businessName: string) {
  const lines: string[] = [];
  lines.push(`*ORDEM DE SERVIÇO — ${businessName}*`);
  lines.push(`Nº: ${s.id.toUpperCase()}`);
  lines.push(`Data: ${fmtDateTime(s.date)}`);
  lines.push("");
  lines.push(`*Cliente:* ${s.customerName}`);
  if (s.customerPhone) lines.push(`Telefone: ${s.customerPhone}`);
  lines.push("");
  lines.push(`*Técnico:* ${s.technician}`);
  lines.push(`*Serviço:* ${s.work}`);
  if (s.details) lines.push(`*Detalhes:* ${s.details}`);
  lines.push("");
  lines.push(`Prazo de entrega: ${fmtDate(s.deadline)}`);
  lines.push(`Status: ${statusLabel(s.status)}`);
  lines.push("");
  const total = Math.max(0, s.price - (s.discount || 0));
  lines.push(`Valor: ${brl(s.price)}`);
  if (s.discount)
    lines.push(
      `Desconto${s.couponCode ? ` (${s.couponCode})` : ""}: -${brl(s.discount)}`,
    );
  lines.push(`*Total: ${brl(total)}*`);
  return lines.join("\n");
}

function Servicos() {
  const [services, setServices] = useServices();
  const [promos] = usePromotions();
  const [config] = useConfig();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const openNew = () => {
    const now = new Date();
    const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setEditing({
      id: uid(),
      date: todayISO(),
      technician: "",
      work: "",
      customerName: "",
      customerPhone: "",
      details: "",
      photos: [],
      deadline: deadline.toISOString().slice(0, 10),
      price: 0,
      discount: 0,
      couponCode: "",
      status: "aberta",
    });
    setOpen(true);
  };

  const save = (s: Service) => {
    if (!s.customerName.trim()) return toast.error("Informe o cliente");
    if (!s.work.trim()) return toast.error("Informe o serviço");
    if (s.photos.length < 4)
      return toast.error("Adicione de 4 a 6 fotos do produto antes do serviço");
    if (s.photos.length > 6)
      return toast.error("Máximo de 6 fotos");
    setServices((prev) => {
      const exists = prev.some((x) => x.id === s.id);
      return exists
        ? prev.map((x) => (x.id === s.id ? s : x))
        : [s, ...prev];
    });
    toast.success("OS salva");
    setOpen(false);
    setEditing(null);
  };

  const remove = (id: string) => {
    if (!confirm("Excluir esta OS?")) return;
    setServices((prev) => prev.filter((x) => x.id !== id));
  };

  const share = (s: Service) => {
    const text = osText(s, config.name || "STOKMASTER");
    const phone = digits(s.customerPhone);
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <AppShell>
      <PageHeader
        title="Serviços"
        subtitle={`${services.length} OS ativa(s) · guardadas por 3 meses`}
        action={
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={16} /> Nova OS
          </button>
        }
      />

      {services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma ordem de serviço.
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((s) => {
            const total = Math.max(0, s.price - (s.discount || 0));
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-border bg-card p-3"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Wrench size={14} style={{ color: "var(--gold)" }} />
                      <div className="truncate font-semibold">{s.work}</div>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {s.customerName} · técnico {s.technician || "—"}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Aberta {fmtDateTime(s.date)} · Prazo {fmtDate(s.deadline)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black" style={{ color: "var(--gold)" }}>
                      {brl(total)}
                    </div>
                    <div className="mt-1 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {statusLabel(s.status)}
                    </div>
                  </div>
                </div>
                {s.photos.length > 0 && (
                  <div className="mt-2 flex gap-1 overflow-x-auto">
                    {s.photos.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => share(s)}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#25D366] px-2 py-1.5 text-xs font-semibold text-white"
                  >
                    <Share2 size={14} /> WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      setEditing(s);
                      setOpen(true);
                    }}
                    className="rounded-lg border border-border px-3 text-xs"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border text-[color:var(--stock-crit)]"
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
        <ServiceModal
          value={editing}
          promos={promos}
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

function ServiceModal({
  value,
  promos,
  onClose,
  onSave,
}: {
  value: Service;
  promos: ReturnType<typeof usePromotions>[0];
  onClose: () => void;
  onSave: (s: Service) => void;
}) {
  const [s, setS] = useState<Service>(value);
  const set = <K extends keyof Service>(k: K, v: Service[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const remaining = 6 - s.photos.length;
    const toAdd = Array.from(files).slice(0, remaining);
    if (toAdd.length === 0) return toast.error("Máximo de 6 fotos");
    try {
      const urls = await Promise.all(
        toAdd.map((f) => fileToResizedDataURL(f, 900, 0.75)),
      );
      set("photos", [...s.photos, ...urls]);
    } catch {
      toast.error("Não foi possível carregar a imagem");
    }
  };

  const removePhoto = (i: number) =>
    set(
      "photos",
      s.photos.filter((_, idx) => idx !== i),
    );

  const applyCoupon = () => {
    const promo = findPromo(promos, s.couponCode || "");
    if (!promo) {
      set("discount", 0);
      return toast.error("Cupom não encontrado");
    }
    const res = applyPromo(s.price, promo);
    if (!res.ok) {
      set("discount", 0);
      return toast.error(res.reason || "Cupom inválido");
    }
    set("discount", Math.round(res.discount * 100) / 100);
    toast.success("Cupom aplicado");
  };

  const total = Math.max(0, s.price - (s.discount || 0));

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "var(--gold)" }}>
            Ordem de Serviço
          </h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-accent"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Técnico responsável">
            <input
              value={s.technician}
              onChange={(e) => set("technician", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Serviço / trabalho">
            <input
              value={s.work}
              onChange={(e) => set("work", e.target.value)}
              placeholder="Ex: Troca de tela iPhone 12"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente">
              <input
                value={s.customerName}
                onChange={(e) => set("customerName", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Telefone do cliente">
              <input
                value={s.customerPhone}
                onChange={(e) => set("customerPhone", e.target.value)}
                placeholder="+55..."
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Detalhes">
            <textarea
              value={s.details}
              onChange={(e) => set("details", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Fotos do produto antes do serviço ({s.photos.length}/6 · mín. 4)
              </span>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs">
                <Camera size={12} />
                Adicionar
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            {s.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {s.photos.map((src, i) => (
                  <div key={i} className="relative">
                    <img
                      src={src}
                      alt=""
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white"
                      aria-label="Remover"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prazo de entrega">
              <input
                type="date"
                value={s.deadline.slice(0, 10)}
                onChange={(e) => set("deadline", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Status">
              <select
                value={s.status}
                onChange={(e) => set("status", e.target.value as Service["status"])}
                className={inputCls}
              >
                <option value="aberta">Aberta</option>
                <option value="andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
                <option value="entregue">Entregue</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor do serviço (R$)">
              <input
                type="number"
                step="0.01"
                value={s.price}
                onChange={(e) => set("price", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Desconto (R$)">
              <input
                type="number"
                step="0.01"
                value={s.discount}
                onChange={(e) => set("discount", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              value={s.couponCode || ""}
              onChange={(e) => set("couponCode", e.target.value.toUpperCase())}
              placeholder="Cupom (palavra-chave)"
              className={inputCls}
            />
            <button
              type="button"
              onClick={applyCoupon}
              className="rounded-xl border border-border px-3 text-xs font-semibold"
            >
              Aplicar
            </button>
          </div>

          <div className="rounded-xl bg-accent p-3 text-sm">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Valor</span>
              <span>{brl(s.price)}</span>
            </div>
            {s.discount > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Desconto</span>
                <span>-{brl(s.discount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between font-black">
              <span>Total</span>
              <span style={{ color: "var(--gold)" }}>{brl(total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={() => onSave(s)}
            className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground"
          >
            Salvar OS
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--gold)]";
