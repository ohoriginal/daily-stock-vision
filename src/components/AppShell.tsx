import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  Home,
  Package,
  ShoppingCart,
  Tag,
  Users,
  BarChart3,
  FileText,
  Settings,
  Sun,
  Moon,
  Wrench,
  Percent,
  Store,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useConfig } from "@/lib/storage";
import { useMask, toggleMask, initMask } from "@/lib/privacy";

type NavItem = {
  to: string;
  label: string;
  Icon: typeof Home;
};

const NAV: NavItem[] = [
  { to: "/", label: "Início", Icon: Home },
  { to: "/produtos", label: "Produtos", Icon: Package },
  { to: "/catalogo", label: "Catálogo", Icon: Store },
  { to: "/compras", label: "Compras", Icon: ShoppingCart },
  { to: "/vendas", label: "Vendas", Icon: Tag },
  { to: "/servicos", label: "Serviços", Icon: Wrench },
  { to: "/promocoes", label: "Promoções", Icon: Percent },
  { to: "/clientes", label: "Clientes", Icon: Users },
  { to: "/movimentacao", label: "Fluxo", Icon: BarChart3 },
  { to: "/relatorios", label: "Relatórios", Icon: FileText },
  { to: "/config", label: "Config", Icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { mode, toggle } = useTheme();
  const masked = useMask();
  useEffect(() => {
    initMask();
  }, []);
  const [config] = useConfig();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[color:var(--gold)]/40 font-black tracking-tight"
              style={{ color: "var(--gold)" }}
            >
              SM
            </div>
            <div className="min-w-0">
              <div
                className="truncate text-sm font-black leading-none sm:text-base"
                style={{ color: "var(--gold)" }}
              >
                {config.name || "STOKMASTER"}
              </div>
              <div className="mt-0.5 truncate text-[10px] uppercase tracking-widest text-muted-foreground">
                Controle de estoque
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => toggleMask()}
            aria-label={masked ? "Mostrar valores" : "Esconder valores"}
            title={masked ? "Mostrar valores" : "Esconder valores"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-foreground hover:bg-accent"
            style={masked ? { borderColor: "var(--gold)", color: "var(--gold)" } : undefined}
          >
            {masked ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button
            onClick={toggle}
            aria-label="Alternar tema"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-foreground hover:bg-accent"
          >
            {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 flex flex-col gap-1">
            {NAV.map(({ to, label, Icon }) => {
              const active = pathname === to || (to !== "/" && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
                    (active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")
                  }
                  style={active ? { color: "var(--gold)" } : undefined}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main key={masked ? "hidden" : "shown"} className="min-w-0 pb-28 lg:pb-6">
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-6xl items-stretch justify-between gap-1 overflow-x-auto px-1">
          {NAV.map(({ to, label, Icon }) => {
            const active = pathname === to || (to !== "/" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className="flex min-w-[62px] flex-col items-center gap-1 py-2 text-[10px] text-muted-foreground"
                style={active ? { color: "var(--gold)" } : undefined}
              >
                <Icon size={18} />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pb-4 sm:flex sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1
          className="truncate text-2xl font-black tracking-tight sm:text-3xl"
          style={{ color: "var(--gold)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
