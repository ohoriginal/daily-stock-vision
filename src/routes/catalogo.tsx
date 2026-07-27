import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { pageHead } from "@/lib/seo";
import { useProducts, useConfig } from "@/lib/storage";
import { brl } from "@/lib/format";
import { Search, Share2, MessageCircle, Phone, Pencil, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/catalogo")({
  head: () =>
    pageHead(
      "Catálogo — STOKMASTER",
      "Monte e compartilhe um catálogo de produtos com fotos, preços e pedidos pelo WhatsApp.",
    ),
  component: Catalogo,
});

function digits(p: string) {
  return (p || "").replace(/\D/g, "");
}

function Catalogo() {
  const [products] = useProducts();
  const [config, setConfig] = useConfig();
  const [q, setQ] = useState("");
  const [editPhone, setEditPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(config.phone);

  const visible = useMemo(
    () =>
      products.filter((p) => {
        if (p.active === false) return false;
        if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [products, q],
  );

  const savePhone = () => {
    setConfig({ ...config, phone: phoneDraft });
    setEditPhone(false);
    toast.success("Telefone atualizado");
  };

  const catalogText = () => {
    const lines: string[] = [];
    lines.push(`*${config.name || "STOKMASTER"} — Catálogo*`);
    if (config.address) lines.push(config.address);
    if (config.phone) lines.push(`Pedidos: ${config.phone}`);
    lines.push("");
    visible.forEach((p) => {
      lines.push(`• *${p.name}* — ${brl(p.price)}`);
      if (p.description) lines.push(`  ${p.description}`);
    });
    lines.push("");
    lines.push("Faça seu pedido respondendo esta mensagem 📱");
    return lines.join("\n");
  };

  const shareCatalog = async () => {
    const text = catalogText();
    const nav = navigator as Navigator & {
      share?: (d: { text?: string; title?: string; url?: string }) => Promise<void>;
    };
    try {
      if (nav.share) {
        await nav.share({ title: "Catálogo", text });
        return;
      }
    } catch {}
    // fallback: wa.me
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const orderProduct = (name: string, price: number) => {
    const text = `Olá! Tenho interesse no produto:\n\n*${name}* — ${brl(price)}\n\nAinda está disponível?`;
    const phone = digits(config.phone);
    if (!phone) {
      toast.error("Cadastre o telefone da loja em Configurações");
      return;
    }
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  return (
    <AppShell>
      <PageHeader
        title="Catálogo"
        subtitle={`${visible.length} produto(s) publicado(s)`}
        action={
          <button
            onClick={shareCatalog}
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white"
          >
            <Share2 size={16} /> Compartilhar
          </button>
        }
      />

      <div className="mb-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Phone size={14} /> Telefone para pedidos
        </div>
        {editPhone ? (
          <div className="mt-2 flex gap-2">
            <input
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              placeholder="Ex: +55 11 99999-9999"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--gold)]"
            />
            <button
              onClick={savePhone}
              className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"
              aria-label="Salvar"
            >
              <Check size={16} />
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center justify-between">
            <div className="text-sm font-semibold" style={{ color: "var(--gold)" }}>
              {config.phone || "não cadastrado"}
            </div>
            <button
              onClick={() => {
                setPhoneDraft(config.phone);
                setEditPhone(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs"
            >
              <Pencil size={12} /> Alterar
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-[color:var(--gold)]"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {products.length === 0
            ? "Nenhum produto cadastrado."
            : 'Nenhum produto publicado. Ative a opção "Mostrar no catálogo" ao editar um produto.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="aspect-square w-full bg-muted">
                {p.photo ? (
                  <img
                    src={p.photo}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                    sem foto
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold">
                  {p.name}
                </div>
                <div className="mt-1 text-base font-black" style={{ color: "var(--gold)" }}>
                  {brl(p.price)}
                </div>
                <button
                  onClick={() => orderProduct(p.name, p.price)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#25D366] px-2 py-1.5 text-xs font-semibold text-white"
                >
                  <MessageCircle size={14} /> Pedir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
