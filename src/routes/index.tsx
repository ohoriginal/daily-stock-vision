import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  useProducts,
  useSales,
  usePurchases,
  stockLevel,
  stockColorVar,
  stockLabel,
} from "@/lib/storage";
import { brl } from "@/lib/format";
import { Package, ShoppingCart, Tag, TrendingUp, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Card({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: string;
  Icon: typeof Package;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      style={accent ? { borderColor: "color-mix(in oklch, var(--gold) 40%, transparent)" } : undefined}
    >
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Icon size={14} />
        {label}
      </div>
      <div
        className="mt-2 truncate text-xl font-black sm:text-2xl"
        style={{ color: "var(--gold)" }}
      >
        {value}
      </div>
    </div>
  );
}

function isThisMonth(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function Dashboard() {
  const [products] = useProducts();
  const [sales] = useSales();
  const [purchases] = usePurchases();

  const totalItens = products.reduce((a, b) => a + b.stock, 0);
  const vendasMes = sales.filter((s) => isThisMonth(s.date));
  const comprasMes = purchases.filter((p) => isThisMonth(p.date));
  const fatMes = vendasMes.reduce((a, b) => a + b.total, 0);
  const lucroMes = vendasMes.reduce((a, b) => a + b.profit, 0);
  const pgtoMes = comprasMes.reduce((a, b) => a + b.total, 0);
  const valorEstoque = products.reduce((a, b) => a + b.stock * b.cost, 0);

  const alertas = products
    .map((p) => ({ p, lvl: stockLevel(p) }))
    .filter((x) => x.lvl === "crit" || x.lvl === "low")
    .sort((a, b) => a.p.stock / (a.p.ideal || 1) - b.p.stock / (b.p.ideal || 1));

  return (
    <AppShell>
      <PageHeader title="Painel" subtitle="Resumo de hoje e do mês atual" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Produtos" value={String(products.length)} Icon={Package} />
        <Card label="Itens em estoque" value={String(totalItens)} Icon={Package} />
        <Card label="Vendas no mês" value={brl(fatMes)} Icon={Tag} />
        <Card label="Compras no mês" value={brl(pgtoMes)} Icon={ShoppingCart} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className="rounded-2xl border p-5"
          style={{
            borderColor: "color-mix(in oklch, var(--gold) 40%, transparent)",
            background: "color-mix(in oklch, var(--gold) 8%, var(--card))",
          }}
        >
          <div className="text-sm font-semibold" style={{ color: "var(--gold)" }}>
            Valor total do estoque
          </div>
          <div className="mt-2 text-3xl font-black" style={{ color: "var(--gold)" }}>
            {brl(valorEstoque)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Baseado no custo unitário</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp size={16} style={{ color: "var(--stock-full)" }} />
            Lucro do mês
          </div>
          <div
            className="mt-2 text-3xl font-black"
            style={{ color: "var(--stock-full)" }}
          >
            {brl(lucroMes)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Faturamento {brl(fatMes)} − custo dos produtos
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          to="/vendas"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-semibold hover:border-[color:var(--gold)]"
        >
          Nova venda
        </Link>
        <Link
          to="/compras"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-semibold hover:border-[color:var(--gold)]"
        >
          Nova compra
        </Link>
        <Link
          to="/produtos"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-semibold hover:border-[color:var(--gold)]"
        >
          Novo produto
        </Link>
        <Link
          to="/relatorios"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-semibold hover:border-[color:var(--gold)]"
        >
          Relatórios
        </Link>
      </div>

      {alertas.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[color:var(--stock-crit)]/50 bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--stock-crit)" }}>
            <AlertTriangle size={16} />
            Alertas de estoque ({alertas.length})
          </div>
          <ul className="mt-3 divide-y divide-border">
            {alertas.slice(0, 8).map(({ p, lvl }) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.stock} / ideal {p.ideal}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: stockColorVar[lvl] }}
                >
                  {stockLabel[lvl]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
