import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { Sale, BusinessConfig } from "./storage";
import { brlRaw as brl, fmtDateTime } from "./format";

function paymentLabel(p: Sale["payment"]) {
  return (
    {
      dinheiro: "Dinheiro",
      pix: "Pix",
      credito: "Crédito",
      debito: "Débito",
      outro: "Outro",
    }[p] || p
  );
}

export function receiptSummaryText(sale: Sale, cfg: BusinessConfig) {
  const lines: string[] = [];
  lines.push(`*RECIBO — ${cfg.name || "STOKMASTER"}*`);
  if (cfg.cnpj) lines.push(`CNPJ: ${cfg.cnpj}`);
  lines.push(`Data: ${fmtDateTime(sale.date)}`);
  lines.push(`Nº: ${sale.id.toUpperCase()}`);
  if (sale.customerName) lines.push(`Cliente: ${sale.customerName}`);
  lines.push("");
  lines.push("*Itens:*");
  sale.items.forEach((i) => {
    lines.push(
      `• ${i.qty}x ${i.name} — ${brl(i.price)} = ${brl(i.qty * i.price)}`,
    );
  });
  lines.push("");
  if (sale.discount && sale.discount > 0) {
    const sub = sale.subtotal ?? sale.total + sale.discount;
    lines.push(`Subtotal: ${brl(sub)}`);
    lines.push(
      `Desconto${sale.couponCode ? ` (${sale.couponCode})` : ""}: -${brl(sale.discount)}`,
    );
  }
  lines.push(`Total: *${brl(sale.total)}*`);
  lines.push(`Pagamento: ${paymentLabel(sale.payment)}`);
  if (sale.notes) lines.push(`Obs.: ${sale.notes}`);
  lines.push("");
  lines.push("Obrigado pela preferência! 🙏");
  return lines.join("\n");
}

async function nodeToPng(node: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(node, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
  });
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else resolve(new Blob([], { type: "image/png" }));
    }, "image/png");
  });
}

export async function receiptPngBlob(node: HTMLElement) {
  return nodeToPng(node);
}

export function receiptPdfBlob(sale: Sale, cfg: BusinessConfig): Blob {
  const doc = new jsPDF({ unit: "mm", format: [80, 200] });
  let y = 8;
  const cx = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(cfg.name || "STOKMASTER", cx, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (cfg.cnpj) {
    doc.text(`CNPJ: ${cfg.cnpj}`, cx, y, { align: "center" });
    y += 4;
  }
  if (cfg.phone) {
    doc.text(cfg.phone, cx, y, { align: "center" });
    y += 4;
  }
  if (cfg.address) {
    doc.text(cfg.address, cx, y, { align: "center" });
    y += 4;
  }
  y += 2;
  doc.setLineWidth(0.2);
  doc.line(5, y, 75, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO", cx, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${fmtDateTime(sale.date)}`, 5, y);
  y += 4;
  doc.text(`Nº: ${sale.id.toUpperCase()}`, 5, y);
  y += 4;
  if (sale.customerName) {
    doc.text(`Cliente: ${sale.customerName}`, 5, y);
    y += 4;
  }
  y += 1;
  doc.line(5, y, 75, y);
  y += 4;
  sale.items.forEach((it) => {
    doc.setFont("helvetica", "bold");
    doc.text(it.name.slice(0, 32), 5, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(`${it.qty} x ${brl(it.price)}`, 5, y);
    doc.text(brl(it.qty * it.price), 75, y, { align: "right" });
    y += 5;
  });
  doc.line(5, y, 75, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", 5, y);
  doc.text(brl(sale.total), 75, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Pagamento: ${paymentLabel(sale.payment)}`, 5, y);
  y += 5;
  if (sale.notes) {
    doc.text(`Obs.: ${sale.notes}`, 5, y);
    y += 5;
  }
  y += 3;
  doc.setFontSize(8);
  doc.text("Obrigado pela preferência!", cx, y, { align: "center" });
  return doc.output("blob");
}

export async function shareOrDownload(
  file: File,
  fallbackText: string,
  phone?: string,
) {
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; text?: string; title?: string }) => Promise<void>;
  };
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        text: fallbackText,
        title: "Recibo",
      });
      return "shared";
    } catch (e) {
      // user cancel or fail — fall through
    }
  }
  // fallback: download + open wa.me
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  const wa = `https://wa.me/${(phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(fallbackText)}`;
  window.open(wa, "_blank");
  return "downloaded";
}
