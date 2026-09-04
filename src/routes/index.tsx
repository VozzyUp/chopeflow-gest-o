import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Button } from "@/components/ui/primitives";
import { supabase } from "@/integrations/db/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChopeControl — Gestão para distribuidora de chope" },
      {
        name: "description",
        content:
          "Controle barris na rua, chopeiras em comodato, consignações, acertos e contas a receber da sua distribuidora de chope.",
      },
      { property: "og:title", content: "ChopeControl — Gestão para distribuidora de chope" },
      {
        property: "og:description",
        content:
          "Saiba em segundos quantos barris estão na rua, com quem, quanto está em aberto e onde estão suas chopeiras.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center">
        <p className="font-display text-5xl font-bold sm:text-6xl">
          <span className="text-gradient-amber">Chope</span>Control
        </p>
        <h1 className="mt-6 text-2xl font-bold sm:text-3xl">
          Saiba onde estão seus barris, chopeiras e o seu dinheiro
        </h1>
        <p className="mt-4 text-muted-foreground">
          Locação para eventos, comodato e consignação em bares, venda avulsa, ciclo de vida de vasilhames,
          acertos e contas a receber — tudo em um sistema pensado para o dia a dia na rua.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" onClick={() => navigate({ to: "/auth" })}>
            Entrar no sistema
          </Button>
        </div>
      </div>
    </main>
  );
}
