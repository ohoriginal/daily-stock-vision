import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  useProducts,
  useSales,
  useCustomers,
  useConfig,
  usePromotions,
  applyPromo,
  findPromo,
  type Sale,
  type SaleItem,
} from "@/lib/storage";
import { brl, fmtDateTime, todayISO, uid } from "@/lib/format";
import { Plus, X, Trash2, Share2, Download, ScanLine, Search } from "lucide-react";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import {
  receiptPdfBlob,
  receiptPngBlob,
  receiptSummaryText,
  shareOrDownload,
} from "@/lib/receipt";

export const Route = createFileRoute("/vendas")({
  component: Vendas,
});

function Vendas() {
  const [sales, setSales] = useSales();
  const [products, setProducts] = useProducts();
  const [customers] = useCustomers();
  const [promos] = usePromotions();
  const [config] = useConfig();
  const [open, setOpen] = useState(false);
  const [receiptFor, setReceiptFor] = useState<Sale | null>(null);
  const [q, setQ] = useState("");

  const filteredSales = useMemo(() => {
    const qn = q.trim().toLowerCase();
    if (!qn) return sales;
    return sales.filter((s) => {
      if ((s.customerName || "").toLowerCase().includes(qn)) return true;
      if (s.items.some((i) => i.name.toLowerCase().includes(qn))) return true;
      if ((s.couponCode || "").toLowerCase().includes(qn)) return true;
      if ((s.payment || "").toLowerCase().includes(qn)) return true;
      return false;
    });
  }, [sales, q]);

  const finalize = (draft: Sale) => {
    setProducts((prev) =>
      prev.map((p) => {
        const it = draft.items.find((i) => i.productId === p.id);
        return it ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p;
      }),
    );
    setSales((prev) => [draft, ...prev]);
    toast.success("Venda registrada");
    setOpen(false);
    setReceiptFor(draft);
  };

  return (
    <AppShell>
      <PageHeader
        title="Vendas"
        subtitle={`${sales.length} venda(s) registrada(s)`}
        action={
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={16} /> Nova venda
          </button>
        }
      />

      {sales.length > 0 && (
        <div className="relative mb-3">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente, produto, cupom..."
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-[color:var(--gold)]"
          />
        </div>
      )}

      {sales.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma venda ainda.
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum resultado.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSales.map((s) => (
            <button
              key={s.id}
              onClick={() => setReceiptFor(s)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left hover:border-[color:var(--gold)]"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">
                  {s.customerName || "Cliente avulso"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {fmtDateTime(s.date)} · {s.items.length} item(s) · {s.payment}
                  {s.discount ? ` · desc ${brl(s.discount)}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="font-black" style={{ color: "var(--gold)" }}>{brl(s.total)}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  lucro {brl(s.profit)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <SaleModal
          products={products}
          customers={customers}
          promos={promos}
          onClose={() => setOpen(false)}
          onFinalize={finalize}
        />
      )}
      {receiptFor && (
        <ReceiptModal
          sale={receiptFor}
          onClose={() => setReceiptFor(null)}
          phone={config.phone}
        />
      )}
    </AppShell>
  );
}

function SaleModal({
  products,
  customers,
  promos,
  onClose,
  onFinalize,
}: {
  products: ReturnType<typeof useProducts>[0];
  customers: ReturnType<typeof useCustomers>[0];
  promos: ReturnType<typeof usePromotions>[0];
  onClose: () => void;
  onFinalize: (s: Sale) => void;
}) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [payment, setPayment] = useState<Sale["payment"]>("dinheiro");
  const [notes, setNotes] = useState("");
  const [pickProductId, setPickProductId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [manualDiscount, setManualDiscount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [scanning, setScanning] = useState(false);

  const addProduct = (p: (typeof products)[number]) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing)
        return prev.map((i) =>
          i.productId === p.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [
        ...prev,
        { productId: p.id, name: p.name, qty: 1, price: p.price, cost: p.cost },
      ];
    });
  };

  const addItem = () => {
    const p = products.find((x) => x.id === pickProductId);
    if (!p) return toast.error("Escolha um produto");
    if (items.some((i) => i.productId === p.id)) return toast.error("Já adicionado");
    addProduct(p);
    setPickProductId("");
  };

  const onScan = (code: string) => {
    const p = products.find((x) => (x.barcode || "") === code);
    setScanning(false);
    if (!p) return toast.error("Produto com esse código não encontrado");
    addProduct(p);
    toast.success(`+1 ${p.name}`);
  };

  const updateQty = (id: string, qty: number) =>
    setItems((prev) => prev.map((i) => (i.productId === id ? { ...i, qty } : i)));
  const updatePrice = (id: string, price: number) =>
    setItems((prev) => prev.map((i) => (i.productId === id ? { ...i, price } : i)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.productId !== id));

  const subtotal = useMemo(
    () => items.reduce((a, b) => a + b.qty * b.price, 0),
    [items],
  );
  const cost = items.reduce((a, b) => a + b.qty * b.cost, 0);
  const discount = Math.min(subtotal, Math.max(0, manualDiscount + couponDiscount));
  const total = Math.max(0, subtotal - discount);
  const profit = total - cost;

  const applyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponDiscount(0);
      return;
    }
    const promo = findPromo(promos, couponCode);
    if (!promo) {
      setCouponDiscount(0);
      return toast.error("Cupom não encontrado");
    }
    const res = applyPromo(subtotal, promo);
    if (!res.ok) {
      setCouponDiscount(0);
      return toast.error(res.reason || "Cupom inválido");
    }
    setCouponDiscount(Math.round(res.discount * 100) / 100);
    toast.success("Cupom aplicado");
  };

  const finish = () => {
    if (items.length === 0) return toast.error("Adicione ao menos um item");
    const c = customers.find((x) => x.id === customerId);
    onFinalize({
      id: uid(),
      date: todayISO(),
      items,
      subtotal,
      discount,
      couponCode: couponDiscount > 0 ? couponCode.trim().toUpperCase() : undefined,
      total,
      cost,
      profit,
      payment,
      notes,
      customerId: c?.id,
      customerName: c?.name,
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "var(--gold)" }}>Nova venda</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-accent"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Cliente</span>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
              <option value="">Avulso</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
            <select value={pickProductId} onChange={(e) => setPickProductId(e.target.value)} className={inputCls}>
              <option value="">Adicionar produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                  {p.name} — {brl(p.price)} (est: {p.stock})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--gold)]/60 px-3 text-xs font-semibold"
              style={{ color: "var(--gold)" }}
              aria-label="Escanear código de barras"
            >
              <ScanLine size={14} />
            </button>
            <button onClick={addItem} className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
              +
            </button>
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
                        <input type="number" min={1} value={it.qty} onChange={(e) => updateQty(it.productId, Number(e.target.value))} className={inputCls} />
                      </label>
                      <label className="text-xs">
                        <span className="text-muted-foreground">Preço</span>
                        <input type="number" step="0.01" value={it.price} onChange={(e) => updatePrice(it.productId, Number(e.target.value))} className={inputCls} />
                      </label>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Subtotal: {brl(it.qty * it.price)}</div>
                  </div>
                  <button onClick={() => removeItem(it.productId)} className="self-start grid h-9 w-9 place-items-center rounded-lg text-[color:var(--stock-crit)] hover:bg-accent">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Pagamento</span>
              <select value={payment} onChange={(e) => setPayment(e.target.value as any)} className={inputCls}>
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="credito">Crédito</option>
                <option value="debito">Débito</option>
                <option value="outro">Outro</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Observação</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
            </label>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
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
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Desconto manual (R$)
            </span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={manualDiscount}
              onChange={(e) => setManualDiscount(Number(e.target.value))}
              className={inputCls}
            />
          </label>

          <div className="rounded-xl bg-accent p-3 text-sm">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span><span>{brl(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Desconto{couponDiscount > 0 ? ` (cupom ${couponCode.toUpperCase()})` : ""}</span>
                <span>-{brl(discount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between font-black">
              <span>Total</span>
              <span style={{ color: "var(--gold)" }}>{brl(total)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>Lucro estimado</span><span>{brl(profit)}</span></div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm">Cancelar</button>
          <button onClick={finish} className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Finalizar</button>
        </div>
      </div>
      {scanning && (
        <BarcodeScanner onDetected={onScan} onClose={() => setScanning(false)} />
      )}
    </div>
  );
}

function ReceiptModal({ sale, onClose, phone }: { sale: Sale; onClose: () => void; phone: string }) {
  const [config] = useConfig();
  const [busy, setBusy] = useState(false);
  const text = useMemo(() => receiptSummaryText(sale, config), [sale, config]);
  const subtotal = sale.subtotal ?? sale.total + (sale.discount || 0);

  const sharePng = async () => {
    setBusy(true);
    try {
      const el = document.getElementById("receipt-render");
      if (!el) throw new Error("erro");
      const blob = await receiptPngBlob(el);
      const file = new File([blob], `recibo-${sale.id}.png`, { type: "image/png" });
      await shareOrDownload(file, text, phone);
    } catch (e) {
      toast.error("Não foi possível compartilhar");
    } finally {
      setBusy(false);
    }
  };

  const sharePdf = async () => {
    setBusy(true);
    try {
      const blob = receiptPdfBlob(sale, config);
      const file = new File([blob], `recibo-${sale.id}.pdf`, { type: "application/pdf" });
      await shareOrDownload(file, text, phone);
    } catch {
      toast.error("Falha");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "var(--gold)" }}>Recibo</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-accent"><X size={16} /></button>
        </div>

        <div id="receipt-render" className="rounded-xl bg-white p-4 text-black">
          <div className="text-center">
            <div className="text-base font-black">{config.name || "STOKMASTER"}</div>
            {config.cnpj && <div className="text-xs">CNPJ: {config.cnpj}</div>}
            {config.address && <div className="text-xs">{config.address}</div>}
            {config.phone && <div className="text-xs">{config.phone}</div>}
          </div>
          <hr className="my-2 border-black/20" />
          <div className="text-xs">
            <div className="text-center font-bold">RECIBO</div>
            <div>Data: {fmtDateTime(sale.date)}</div>
            <div>Nº: {sale.id.toUpperCase()}</div>
            {sale.customerName && <div>Cliente: {sale.customerName}</div>}
          </div>
          <hr className="my-2 border-black/20" />
          <table className="w-full text-xs">
            <tbody>
              {sale.items.map((i) => (
                <tr key={i.productId}>
                  <td className="pr-2">{i.qty}x {i.name}</td>
                  <td className="text-right">{brl(i.qty * i.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="my-2 border-black/20" />
          {sale.discount && sale.discount > 0 ? (
            <>
              <div className="flex justify-between text-xs"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
              <div className="flex justify-between text-xs"><span>Desconto{sale.couponCode ? ` (${sale.couponCode})` : ""}</span><span>-{brl(sale.discount)}</span></div>
            </>
          ) : null}
          <div className="flex justify-between text-sm font-black">
            <span>TOTAL</span><span>{brl(sale.total)}</span>
          </div>
          <div className="mt-1 text-xs">Pagamento: {sale.payment}</div>
          {sale.notes && <div className="mt-1 text-xs">Obs.: {sale.notes}</div>}
          <div className="mt-3 text-center text-[10px]">Obrigado pela preferência!</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={sharePng} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <Share2 size={16} /> Enviar imagem
          </button>
          <button disabled={busy} onClick={sharePdf} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            <Download size={16} /> Enviar PDF
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          O WhatsApp abrirá com o arquivo pronto para envio.
        </p>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--gold)]";
