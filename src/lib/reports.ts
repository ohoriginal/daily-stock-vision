import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Sale, Purchase, BusinessConfig } from "./storage";
import { brlRaw as brl, fmtDate } from "./format";

export type Period = { from: string; to: string };

function inPeriod(iso: string, p: Period) {
  const d = new Date(iso).getTime();
  return d >= new Date(p.from).getTime() && d <= new Date(p.to + "T23:59:59").getTime();
}

export type ReportFormat = "pdf" | "csv" | "livro";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function pdfHeader(doc: jsPDF, cfg: BusinessConfig, title: string, p: Period) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(cfg.name || "STOKMASTER", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let y = 22;
  if (cfg.cnpj) { doc.text(`CNPJ: ${cfg.cnpj}`, 14, y); y += 4; }
  if (cfg.address) { doc.text(cfg.address, 14, y); y += 4; }
  if (cfg.phone) { doc.text(cfg.phone, 14, y); y += 4; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, 14, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Período: ${fmtDate(p.from)} a ${fmtDate(p.to)}`, 14, y + 10);
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, 14, y + 15);
  return y + 20;
}

export function exportDetailedPdf(
  sales: Sale[],
  purchases: Purchase[],
  cfg: BusinessConfig,
  p: Period,
) {
  const s = sales.filter((x) => inPeriod(x.date, p));
  const c = purchases.filter((x) => inPeriod(x.date, p));
  const totalVendas = s.reduce((a, b) => a + b.total, 0);
  const totalCompras = c.reduce((a, b) => a + b.total, 0);
  const totalLucro = s.reduce((a, b) => a + b.profit, 0);
  const impostoEst = totalVendas * ((cfg.taxRatePct || 0) / 100);

  const doc = new jsPDF();
  let y = pdfHeader(doc, cfg, "Relatório Detalhado — Receita Federal", p);

  autoTable(doc, {
    startY: y + 2,
    head: [["Resumo", "Valor"]],
    body: [
      ["Faturamento (vendas)", brl(totalVendas)],
      ["Custo dos produtos vendidos", brl(totalVendas - totalLucro)],
      ["Lucro bruto", brl(totalLucro)],
      ["Compras / despesas", brl(totalCompras)],
      [`Imposto estimado (${cfg.taxRatePct || 0}%)`, brl(impostoEst)],
      ["Resultado líquido estimado", brl(totalLucro - impostoEst)],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  // Produtos vendidos (agrupado por produto)
  const agg = new Map<string, { name: string; qty: number; total: number; profit: number }>();
  s.forEach((sale) =>
    sale.items.forEach((it) => {
      const cur = agg.get(it.name) || { name: it.name, qty: 0, total: 0, profit: 0 };
      cur.qty += it.qty;
      cur.total += it.qty * it.price;
      cur.profit += it.qty * (it.price - it.cost);
      agg.set(it.name, cur);
    }),
  );
  const aggRows = [...agg.values()].sort((a, b) => b.qty - a.qty);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Produtos vendidos", "Qtd", "Faturamento", "Lucro"]],
    body: aggRows.length
      ? aggRows.map((r) => [r.name, String(r.qty), brl(r.total), brl(r.profit)])
      : [["Nenhum produto vendido no período", "-", "-", "-"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  // Vendas com detalhamento dos itens
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Data", "Nº", "Cliente", "Produtos (qtd x nome)", "Pagto", "Total"]],
    body: s.map((x) => [
      fmtDate(x.date),
      x.id.slice(-6).toUpperCase(),
      x.customerName || "-",
      x.items.map((i) => `${i.qty}x ${i.name}`).join("\n") || "-",
      x.payment,
      brl(x.total),
    ]),
    styles: { fontSize: 8, cellWidth: "wrap" },
    columnStyles: { 3: { cellWidth: 70 } },
    headStyles: { fillColor: [30, 30, 30] },
  });


  doc.addPage();
  autoTable(doc, {
    startY: 16,
    head: [["Compras — Data", "Nº", "Fornecedor", "Itens", "Total"]],
    body: c.map((x) => [
      fmtDate(x.date),
      x.id.slice(-6).toUpperCase(),
      x.supplier || "-",
      String(x.items.reduce((a, b) => a + b.qty, 0)),
      brl(x.total),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  download(
    doc.output("blob"),
    `relatorio-detalhado-${p.from}_a_${p.to}.pdf`,
  );
}

export function exportCsvXlsx(
  sales: Sale[],
  purchases: Purchase[],
  cfg: BusinessConfig,
  p: Period,
) {
  const s = sales.filter((x) => inPeriod(x.date, p));
  const c = purchases.filter((x) => inPeriod(x.date, p));

  const wb = XLSX.utils.book_new();

  const resumo = [
    ["Empresa", cfg.name],
    ["CNPJ", cfg.cnpj],
    ["Período", `${fmtDate(p.from)} a ${fmtDate(p.to)}`],
    [],
    ["Faturamento", s.reduce((a, b) => a + b.total, 0)],
    ["Custo total", s.reduce((a, b) => a + (b.total - b.profit), 0)],
    ["Lucro bruto", s.reduce((a, b) => a + b.profit, 0)],
    ["Compras", c.reduce((a, b) => a + b.total, 0)],
    [`Imposto (${cfg.taxRatePct}%)`, s.reduce((a, b) => a + b.total, 0) * ((cfg.taxRatePct || 0) / 100)],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Resumo");

  const vendasRows: (string | number)[][] = [
    ["Data", "Nº", "Cliente", "Produto", "Qtd", "Preço", "Custo", "Subtotal", "Pagamento"],
  ];
  s.forEach((sale) => {
    sale.items.forEach((it) => {
      vendasRows.push([
        fmtDate(sale.date),
        sale.id.toUpperCase(),
        sale.customerName || "",
        it.name,
        it.qty,
        it.price,
        it.cost,
        it.qty * it.price,
        sale.payment,
      ]);
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vendasRows), "Vendas");

  const comprasRows: (string | number)[][] = [
    ["Data", "Nº", "Fornecedor", "Produto", "Qtd", "Custo", "Subtotal"],
  ];
  c.forEach((pu) => {
    pu.items.forEach((it) => {
      comprasRows.push([
        fmtDate(pu.date),
        pu.id.toUpperCase(),
        pu.supplier || "",
        it.name,
        it.qty,
        it.cost,
        it.qty * it.cost,
      ]);
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(comprasRows), "Compras");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(
    new Blob([wbout], { type: "application/octet-stream" }),
    `relatorio-planilha-${p.from}_a_${p.to}.xlsx`,
  );
}

export function exportLivroCaixa(
  sales: Sale[],
  purchases: Purchase[],
  cfg: BusinessConfig,
  p: Period,
) {
  type Row = { date: string; desc: string; entrada: number; saida: number };
  const rows: Row[] = [];
  sales
    .filter((x) => inPeriod(x.date, p))
    .forEach((x) =>
      rows.push({
        date: x.date,
        desc: `Venda ${x.id.slice(-6).toUpperCase()} ${x.customerName ? "- " + x.customerName : ""}`,
        entrada: x.total,
        saida: 0,
      }),
    );
  purchases
    .filter((x) => inPeriod(x.date, p))
    .forEach((x) =>
      rows.push({
        date: x.date,
        desc: `Compra ${x.id.slice(-6).toUpperCase()} ${x.supplier ? "- " + x.supplier : ""}`,
        entrada: 0,
        saida: x.total,
      }),
    );
  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const doc = new jsPDF();
  const y = pdfHeader(doc, cfg, "Livro Caixa Simplificado", p);

  let saldo = 0;
  autoTable(doc, {
    startY: y + 2,
    head: [["Data", "Descrição", "Entrada", "Saída", "Saldo"]],
    body: rows.map((r) => {
      saldo += r.entrada - r.saida;
      return [
        fmtDate(r.date),
        r.desc,
        r.entrada ? brl(r.entrada) : "-",
        r.saida ? brl(r.saida) : "-",
        brl(saldo),
      ];
    }),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  const totalEnt = rows.reduce((a, b) => a + b.entrada, 0);
  const totalSai = rows.reduce((a, b) => a + b.saida, 0);
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [["Totais do período", "Valor"]],
    body: [
      ["Total de entradas", brl(totalEnt)],
      ["Total de saídas", brl(totalSai)],
      ["Saldo final", brl(totalEnt - totalSai)],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  download(
    doc.output("blob"),
    `livro-caixa-${p.from}_a_${p.to}.pdf`,
  );
}
