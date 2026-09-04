import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Beer,
  CalendarDays,
  ClipboardList,
  Cog,
  Home,
  Handshake,
  LogOut,
  Menu,
  Package,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/primitives";
import { supabase } from "@/integrations/db/client";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/movimentacoes/nova", label: "Nova movimentação", icon: ClipboardList },
  { to: "/movimentacoes", label: "Histórico", icon: Package },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/produtos", label: "Chopes", icon: Beer },
  { to: "/estoque", label: "Estoque e ativos", icon: Package },
  { to: "/eventos", label: "Eventos / Locações", icon: CalendarDays },
  { to: "/consignacoes", label: "Consignação e acertos", icon: Handshake },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Cog },
] as const;

export function AppShell() {
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Topbar mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 lg:hidden">
        <Link to="/dashboard" className="font-display text-xl font-bold">
          <span className="text-gradient-amber">Chope</span>Control
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setAberto((v) => !v)} aria-label="Menu">
          {aberto ? <X /> : <Menu />}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "z-30 w-full shrink-0 border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64",
          aberto ? "block" : "hidden",
        )}
      >
        <div className="hidden px-5 py-6 lg:block">
          <Link to="/dashboard" className="font-display text-2xl font-bold">
            <span className="text-gradient-amber">Chope</span>Control
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">Distribuidora de chope</p>
        </div>
        <nav className="flex flex-col gap-1 p-3 lg:px-3 lg:py-0">
          {nav.map((item) => {
            const Icon = item.icon;
            const ativo = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors lg:py-2.5",
                  ativo
                    ? "bg-primary/15 text-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={sair}
            className="mt-2 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:py-2.5"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
