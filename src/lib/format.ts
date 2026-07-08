export const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR");

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR");

export const todayISO = () => new Date().toISOString();

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
