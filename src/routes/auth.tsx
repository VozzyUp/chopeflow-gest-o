import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, Card, Field, Input } from "@/components/ui/primitives";
import { supabase } from "@/integrations/db/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — ChopeControl" },
      {
        name: "description",
        content: "Acesse o ChopeControl para gerenciar barris, chopeiras, consignações e o financeiro da sua distribuidora de chope.",
      },
      { property: "og:title", content: "Entrar — ChopeControl" },
      {
        property: "og:description",
        content: "Gestão completa de distribuidora de chope: barris na rua, comodato, consignação e financeiro.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  function traduzirErro(msg: string) {
    if (/invalid login credentials/i.test(msg))
      return "E-mail ou senha incorretos. Se ainda não tem conta, use a aba “Criar conta”.";
    if (/email not confirmed/i.test(msg)) return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
    if (/user already registered|already been registered/i.test(msg))
      return "Este e-mail já possui conta. Use a aba “Entrar”.";
    if (/password should be at least/i.test(msg)) return "A senha deve ter no mínimo 6 caracteres.";
    if (/rate limit|too many/i.test(msg)) return "Muitas tentativas. Aguarde alguns instantes e tente novamente.";
    return msg;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada!");
          navigate({ to: "/dashboard", replace: true });
        } else {
          toast.success("Confira seu e-mail para confirmar a conta.");
          setErro("Enviamos um e-mail de confirmação. Confirme para entrar.");
        }
      }
    } catch (err) {
      const msg = traduzirErro(err instanceof Error ? err.message : "Não foi possível continuar");
      setErro(msg);
      toast.error(msg);
    } finally {
      setCarregando(false);
    }
  }


  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-display text-4xl font-bold tracking-tight">
            <span className="text-gradient-amber">Chope</span>Control
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestão de distribuidora de chope — barris, chopeiras e financeiro em um só lugar.
          </p>
        </div>

        <Card>
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
            {(["login", "cadastro"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={
                  "rounded-md py-2 text-sm font-semibold transition-colors " +
                  (modo === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")
                }
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <form onSubmit={enviar} className="space-y-4">
            {modo === "cadastro" ? (
              <Field label="Seu nome">
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Nome completo" />
              </Field>
            ) : null}
            <Field label="E-mail">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="voce@empresa.com.br"
                autoComplete="email"
              />
            </Field>
            <Field label="Senha">
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                autoComplete={modo === "login" ? "current-password" : "new-password"}
              />
            </Field>
            {erro ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erro}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="w-full" disabled={carregando}>

              {carregando ? "Aguarde..." : modo === "login" ? "Entrar no sistema" : "Criar minha conta"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          A primeira conta criada recebe o perfil de Administrador.
        </p>
      </div>
    </main>
  );
}
