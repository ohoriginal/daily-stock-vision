import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useSales, usePurchases } from "@/lib/storage";
import { brl } from "@/lib/format";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/movimentacao")({
  component: Movimentacao,
});

type Range = "semana" | "mes" | "ano";

function buildBuckets(range: Range): { key: string; label: string; from: Date; to: Date }[] {
  const now = new Date();
  if (range === "semana") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const from = new Date(d); from.setHours(0, 0, 0, 0);
      const to = new Date(d); to.setHours(23, 59, 59, 999);
      return {
        key: from.toISOString().slice(0, 10),
        label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
        from, to,
      };
    });
  }
  if (range === "mes") {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
      const from = new Date(d); from.setHours(0, 0, 0, 0);
      const to = new Date(d); to.setHours(23, 59, 59, 999);
      return { key: String(i + 1), label: String(i + 1), from, to };
    });
  }
  return Array.from({ length: 12 }).map((_, i) => {
    const from = new Date(now.getFullYear(), i, 1);
    const to = new Date(now.getFullYear(), i + 1, 0, 23, 59, 59, 999);
    return {
      key: String(i),
      label: from.toLocaleDateString("pt-BR", { month: "short" }),
      from, to,
    };
  });
}

function Movimentacao() {
  const [sales] = useSales();
  const [purchases] = usePurchases();
  const [range, setRange] = useState<Range>("semana");

  const data = useMemo(() => {
    const buckets = buildBuckets(range);
    return buckets.map((b) => {
      const s = sales.filter((x) => {
        const t = new Date(x.date).getTime();
        return t >= b.from.getTime() && t <= b.to.getTime();
      });
      const c = purchases.filter((x) => {
        const t = new Date(x.date).getTime();
        return t >= b.from.getTime() && t <= b.to.getTime();
      });
      return {
        label: b.label,
        faturamento: s.reduce((a, b) => a + b.total, 0),
        lucro: s.reduce((a, b) => a + b.profit, 0),
        pagamentos: c.reduce((a, b) => a + b.total, 0),
      };
    });
  }, [range, sales, purchases]);

  const totFat = data.reduce((a, b) => a + b.faturamento, 0);
  const totLuc = data.reduce((a, b) => a + b.lucro, 0);
  const totPag = data.reduce((a, b) => a + b.pagamentos, 0);

  return (
    <AppShell>
      <PageHeader title="Movimentação" subtitle="Entradas e saídas no período" />

      <div className="mb-4 inline-flex rounded-xl border border-border bg-card p-1">
        {(["semana", "mes", "ano"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={"rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors " + (range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            {r === "mes" ? "Mês" : r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ChartCard title="Faturamento" total={totFat} data={data} dataKey="faturamento" color="var(--stock-good)" />
        <ChartCard title="Lucro" total={totLuc} data={data} dataKey="lucro" color="var(--stock-full)" />
        <ChartCard title="Pagamentos" total={totPag} data={data} dataKey="pagamentos" color="var(--stock-crit)" />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold" style={{ color: "var(--gold)" }}>Resumo do período</div>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <Row label="Faturamento (entradas de vendas)" value={brl(totFat)} color="var(--stock-good)" />
          <Row label="Lucro (vendas − custo)" value={brl(totLuc)} color="var(--stock-full)" />
          <Row label="Pagamentos (compras/despesas)" value={brl(totPag)} color="var(--stock-crit)" />
          <hr className="my-2 border-border" />
          <Row label="Saldo (faturamento − pagamentos)" value={brl(totFat - totPag)} color="var(--gold)" />
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-black" style={{ color }}>{value}</span>
    </div>
  );
}

function ChartCard({
  title, total, data, dataKey, color,
}: {
  title: string;
  total: number;
  data: { label: string; [k: string]: any }[];
  dataKey: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-black" style={{ color }}>{brl(total)}</div>
      <div className="mt-3 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" fontSize={10} tick={{ fill: "var(--muted-foreground)" }} />
            <YAxis fontSize={10} tick={{ fill: "var(--muted-foreground)" }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
            <Tooltip
              cursor={{ fill: "color-mix(in oklch, var(--foreground) 8%, transparent)" }}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: any) => brl(Number(v))}
            />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
