import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { pageHead } from "@/lib/seo";
import { useSales, usePurchases, useConfig } from "@/lib/storage";
import { brl, fmtDate } from "@/lib/format";
import { exportDetailedPdf, exportCsvXlsx, exportLivroCaixa } from "@/lib/reports";
import { FileText, Sheet, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/relatorios")({
  head: () =>
    pageHead(
      "Relatórios — STOKMASTER",
      "Gere relatórios em PDF, planilha e livro caixa para controle financeiro e contabilidade.",
    ),
  component: Relatorios,
});

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today() { return new Date().toISOString().slice(0, 10); }

function Relatorios() {
  const [sales] = useSales();
  const [purchases] = usePurchases();
  const [config] = useConfig();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [format, setFormat] = useState<"pdf" | "csv" | "livro">("pdf");

  const period = { from, to };

  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= new Date(from).getTime() && t <= new Date(to + "T23:59:59").getTime();
  };
  const s = sales.filter((x) => inRange(x.date));
  const c = purchases.filter((x) => inRange(x.date));
  const fat = s.reduce((a, b) => a + b.total, 0);
  const luc = s.reduce((a, b) => a + b.profit, 0);
  const pag = c.reduce((a, b) => a + b.total, 0);
  const imp = fat * ((config.taxRatePct || 0) / 100);

  const download = () => {
    try {
      if (format === "pdf") exportDetailedPdf(sales, purchases, config, period);
      else if (format === "csv") exportCsvXlsx(sales, purchases, config, period);
      else exportLivroCaixa(sales, purchases, config, period);
      toast.success("Relatório gerado");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar relatório");
    }
  };

  const setQuick = (kind: "mes" | "ano" | "trimestre") => {
    const d = new Date();
    if (kind === "mes") {
      setFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10));
      setTo(today());
    } else if (kind === "trimestre") {
      const q = Math.floor(d.getMonth() / 3) * 3;
      setFrom(new Date(d.getFullYear(), q, 1).toISOString().slice(0, 10));
      setTo(today());
    } else {
      setFrom(new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10));
      setTo(today());
    }
  };

  return (
    <AppShell>
      <PageHeader title="Relatórios" subtitle="Para a Receita Federal e contabilidade" />

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold" style={{ color: "var(--gold)" }}>Período</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">De</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Até</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setQuick("mes")} className="rounded-lg border border-border px-3 py-1 text-xs">Mês atual</button>
          <button onClick={() => setQuick("trimestre")} className="rounded-lg border border-border px-3 py-1 text-xs">Trimestre</button>
          <button onClick={() => setQuick("ano")} className="rounded-lg border border-border px-3 py-1 text-xs">Ano atual</button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Faturamento" value={brl(fat)} />
        <Stat label="Lucro" value={brl(luc)} color="var(--stock-full)" />
        <Stat label="Compras" value={brl(pag)} color="var(--stock-crit)" />
        <Stat label={`Imposto est. (${config.taxRatePct}%)`} value={brl(imp)} />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold" style={{ color: "var(--gold)" }}>Formato do relatório</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <FormatOption id="pdf" title="PDF detalhado" desc="Resumo + tabelas de vendas e compras" Icon={FileText} current={format} onSelect={setFormat} />
          <FormatOption id="csv" title="Planilha (XLSX)" desc="Vendas item a item + compras + resumo" Icon={Sheet} current={format} onSelect={setFormat} />
          <FormatOption id="livro" title="Livro Caixa" desc="Entradas e saídas linha a linha" Icon={BookOpen} current={format} onSelect={setFormat} />
        </div>
        <button
          onClick={download}
          className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          Baixar relatório · {fmtDate(from)} a {fmtDate(to)}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Configure CNPJ, nome do negócio e alíquota estimada em <b>Config</b>.
        </p>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-black" style={{ color: color || "var(--gold)" }}>{value}</div>
    </div>
  );
}

function FormatOption({
  id, title, desc, Icon, current, onSelect,
}: {
  id: "pdf" | "csv" | "livro";
  title: string;
  desc: string;
  Icon: typeof FileText;
  current: string;
  onSelect: (v: any) => void;
}) {
  const active = current === id;
  return (
    <button
      onClick={() => onSelect(id)}
      className={"rounded-xl border p-3 text-left transition-colors " + (active ? "bg-accent" : "border-border hover:bg-accent/50")}
      style={active ? { borderColor: "var(--gold)" } : undefined}
    >
      <Icon size={18} style={{ color: active ? "var(--gold)" : "var(--muted-foreground)" }} />
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--gold)]";
