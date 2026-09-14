import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  CardTitle,
  EmptyState,
  Field,
  Input,
  PageHead,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { supabase } from "@/integrations/db/client";
import { roleLabel } from "@/lib/labels";
import { telasPorPapel, useEhAdmin, type Papel } from "@/lib/permissoes";
import { criarUsuario, definirPapel, removerPapeis } from "@/lib/usuarios";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários e perfis — ChopeControl" },
      { name: "description", content: "Cadastre usuários da equipe e defina o perfil de acesso de cada um." },
      { property: "og:title", content: "Usuários e perfis — ChopeControl" },
      { property: "og:description", content: "Criação de usuários, perfis de acesso e telas liberadas por perfil." },
    ],
  }),
  component: UsuariosPage,
});

const papeis: Papel[] = ["admin", "operacional", "financeiro"];

const telasLabel: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/movimentacoes": "Movimentações",
  "/clientes": "Clientes",
  "/produtos": "Chopes",
  "/estoque": "Estoque e ativos",
  "/eventos": "Eventos / Locações",
  "/consignacoes": "Consignação e acertos",
  "/financeiro": "Financeiro",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
  "/usuarios": "Usuários",
};

function UsuariosPage() {
  const { ehAdmin, isPending } = useEhAdmin();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ nome: "", email: "", senha: "", papel: "operacional" as Papel });

  const equipe = useQuery({
    queryKey: ["equipe"],
    queryFn: async () => {
      const { data: perfis, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      const { data: vinculos, error: e2 } = await supabase.from("user_roles").select("*");
      if (e2) throw e2;
      return (perfis ?? []).map((p) => ({
        ...p,
        roles: (vinculos ?? []).filter((r) => r.user_id === p.id).map((r) => String(r.role)),
      }));
    },
  });

  const criar = useMutation({
    mutationFn: async () => await criarUsuario(form),
    onSuccess: () => {
      toast.success("Usuário criado");
      setForm({ nome: "", email: "", senha: "", papel: "operacional" });
      queryClient.invalidateQueries({ queryKey: ["equipe"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const trocarPapel = useMutation({
    mutationFn: async ({ id, papel }: { id: string; papel: string }) => {
      if (papel === "") await removerPapeis(id);
      else await definirPapel(id, papel as Papel);
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      queryClient.invalidateQueries({ queryKey: ["equipe"] });
      queryClient.invalidateQueries({ queryKey: ["meus-papeis"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return null;

  if (!ehAdmin) {
    return (
      <>
        <PageHead title="Usuários e perfis" subtitle="Área restrita" />
        <EmptyState>Somente administradores podem gerenciar usuários.</EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHead title="Usuários e perfis" subtitle="Cadastre a equipe e defina o acesso de cada pessoa" />

      <Card className="mb-4">
        <CardTitle>Novo usuário</CardTitle>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            criar.mutate();
          }}
        >
          <Field label="Nome">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Senha (mínimo 6 caracteres)">
            <Input
              type="text"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              minLength={6}
              required
            />
          </Field>
          <Field label="Perfil">
            <Select value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value as Papel })}>
              {papeis.map((p) => (
                <option key={p} value={p}>
                  {roleLabel[p]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending ? "Criando..." : "Criar usuário"}
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          A pessoa entra no sistema com esse e-mail e senha. Depois ela pode trocar a senha na tela de login.
        </p>
      </Card>

      <Card className="mb-4">
        <CardTitle>Equipe</CardTitle>
        <Table className="mt-3">
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>E-mail</Th>
              <Th>Perfil atual</Th>
              <Th>Alterar perfil</Th>
            </tr>
          </thead>
          <tbody>
            {(equipe.data ?? []).map((u) => (
              <tr key={u.id}>
                <Td className="font-semibold">{u.nome}</Td>
                <Td className="text-muted-foreground">{u.email}</Td>
                <Td>
                  {u.roles.length === 0 ? (
                    <Badge tone="danger">Sem acesso</Badge>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} tone="primary">
                          {roleLabel[r] ?? r}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Td>
                <Td>
                  <Select
                    value={u.roles[0] ?? ""}
                    disabled={trocarPapel.isPending}
                    onChange={(e) => trocarPapel.mutate({ id: u.id, papel: e.target.value })}
                  >
                    <option value="">Sem acesso</option>
                    {papeis.map((p) => (
                      <option key={p} value={p}>
                        {roleLabel[p]}
                      </option>
                    ))}
                  </Select>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardTitle>O que cada perfil acessa</CardTitle>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {papeis.map((p) => (
            <div key={p} className="rounded-lg border border-border p-3">
              <p className="font-semibold">{roleLabel[p]}</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {telasPorPapel[p][0] === "*" ? (
                  <li>Todas as telas do sistema</li>
                ) : (
                  telasPorPapel[p].map((t) => <li key={t}>{telasLabel[t] ?? t}</li>)
                )}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
