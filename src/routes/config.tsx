import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useConfig, exportBackup, importBackup } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { Download, Upload, Sun, Moon } from "lucide-react";

export const Route = createFileRoute("/config")({
  component: Config,
});

function Config() {
  const [config, setConfig, hydrated] = useConfig();
  const { mode, set: setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(config);

  useEffect(() => { if (hydrated) setDraft(config); }, [hydrated, config]);

  const save = () => { setConfig(draft); toast.success("Configurações salvas"); };

  const onImport = async (f: File | null) => {
    if (!f) return;
    try { await importBackup(f); toast.success("Backup restaurado"); }
    catch { toast.error("Arquivo inválido"); }
  };

  return (
    <AppShell>
      <PageHeader title="Configurações" />

      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--gold)" }}>Aparência</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTheme("dark")}
              className={"rounded-xl border p-3 text-left " + (mode === "dark" ? "border-[color:var(--gold)]" : "border-border")}
            >
              <Moon size={18} style={{ color: "var(--gold)" }} />
              <div className="mt-2 text-sm font-semibold">Preto + Dourado</div>
              <div className="text-xs text-muted-foreground">Estilo original</div>
            </button>
            <button
              onClick={() => setTheme("light")}
              className={"rounded-xl border p-3 text-left " + (mode === "light" ? "border-[color:var(--gold)]" : "border-border")}
            >
              <Sun size={18} />
              <div className="mt-2 text-sm font-semibold">Branco + Preto</div>
              <div className="text-xs text-muted-foreground">Modo claro</div>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--gold)" }}>Dados do negócio</h3>
          <div className="space-y-3">
            <Field label="Nome do negócio">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CNPJ / CPF"><input value={draft.cnpj} onChange={(e) => setDraft({ ...draft, cnpj: e.target.value })} className={inputCls} /></Field>
              <Field label="Telefone"><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className={inputCls} /></Field>
            </div>
            <Field label="Endereço"><input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className={inputCls} /></Field>
            <Field label="Alíquota estimada de imposto (%)">
              <input type="number" step="0.01" value={draft.taxRatePct} onChange={(e) => setDraft({ ...draft, taxRatePct: Number(e.target.value) })} className={inputCls} />
              <p className="mt-1 text-xs text-muted-foreground">Ex: MEI ~6%, Simples Nacional varia.</p>
            </Field>
            <button onClick={save} className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Salvar dados</button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--gold)" }}>Backup dos dados</h3>
          <p className="mb-3 text-xs text-muted-foreground">Os dados ficam salvos apenas neste aparelho. Baixe um backup periodicamente.</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportBackup} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm">
              <Download size={16} /> Exportar
            </button>
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm">
              <Upload size={16} /> Restaurar
            </button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => onImport(e.target.files?.[0] || null)} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>;
}

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--gold)]";
