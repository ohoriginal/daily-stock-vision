import { isMasked } from "./privacy";

export const brlRaw = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

/** Formata em BRL, mas oculta o valor quando o modo privacidade está ativo. */
export const brl = (n: number) => (isMasked() ? "R$ ••••" : brlRaw(n));


function safeDate(iso: string) {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

export const fmtDate = (iso: string) => safeDate(iso).toLocaleDateString("pt-BR");

export const fmtDateTime = (iso: string) => safeDate(iso).toLocaleString("pt-BR");

export const todayISO = () => new Date().toISOString();

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
