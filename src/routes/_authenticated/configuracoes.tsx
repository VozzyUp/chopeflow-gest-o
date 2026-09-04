import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  CardTitle,
  Field,
  Input,
  PageHead,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { supabase } from "@/integrations/db/client";
import { useEmpresa } from "@/lib/data";
import { roleLabel } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — ChopeControl" },
      { name: "description", content: "Dados da empresa, parâmetros de alerta e perfis de acesso da equipe." },
      { property: "og:title", content: "Configurações — ChopeControl" },
      { property: "og:description", content: "Empresa, alertas de barril parado e higienização, usuários e perfis." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { data: empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    dias_alerta_barril_parado: 21,
    dias_alerta_higienizacao: 90,
  });

  useEffect(() => {
    if (empresa) {
      setForm({
        nome: empresa.nome ?? "",
        cnpj: empresa.cnpj ?? "",
        telefone: empresa.telefone ?? "",
        email: empresa.email ?? "",
        endereco: empresa.endereco ?? "",
        dias_alerta_barril_parado: empresa.dias_alerta_barril_parado,
        dias_alerta_higienizacao: empresa.dias_alerta_higienizacao,
      });
    }
  }, [empresa]);

  const equipe = useQuery({
    queryKey: ["equipe"],
    queryFn: async () => {
      const { data: perfis, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      const { data: papeis, error: e2 } = await supabase.from("user_roles").select("*");
      if (e2) throw e2;
      return (perfis ?? []).map((p) => ({
        ...p,
        roles: (papeis ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as string),
      }));
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!empresa) throw new Error("Configuração não encontrada");
      const { error } = await supabase
        .from("empresa_config")
        .update({
          nome: form.nome,
          cnpj: form.cnpj,
          telefone: form.telefone,
          email: form.email,
          endereco: form.endereco,
          dias_alerta_barril_parado: Number(form.dias_alerta_barril_parado),
          dias_alerta_higienizacao: Number(form.dias_alerta_higienizacao),
        })
        .eq("id", empresa.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      queryClient.invalidateQueries({ queryKey: ["empresa_config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHead title="Configurações" subtitle="Empresa, alertas e equipe" />

      <Card className="mb-4">
        <CardTitle>Dados da empresa</CardTitle>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
        >
          <Field label="Nome / razão social" className="sm:col-span-2">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="CNPJ">
            <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          </Field>
          <Field label="Telefone">
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Field>
          <Field label="E-mail">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Endereço">
            <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </Field>
          <Field label="Alerta de barril parado (dias)">
            <Input
              type="number"
              value={form.dias_alerta_barril_parado}
              onChange={(e) => setForm({ ...form, dias_alerta_barril_parado: Number(e.target.value) })}
            />
          </Field>
          <Field label="Intervalo de higienização (dias)">
            <Input
              type="number"
              value={form.dias_alerta_higienizacao}
              onChange={(e) => setForm({ ...form, dias_alerta_higienizacao: Number(e.target.value) })}
            />
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={salvar.isPending}>
              Salvar configurações
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Usuários e perfis</CardTitle>
        <Table className="mt-3">
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>E-mail</Th>
              <Th>Perfis</Th>
            </tr>
          </thead>
          <tbody>
            {(equipe.data ?? []).map((u) => (
              <tr key={u.id}>
                <Td className="font-semibold">{u.nome}</Td>
                <Td className="text-muted-foreground">{u.email}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 ? (
                      <Badge>Sem perfil</Badge>
                    ) : (
                      u.roles.map((r) => (
                        <Badge key={r} tone="primary">
                          {roleLabel[r] ?? r}
                        </Badge>
                      ))
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="mt-3 text-xs text-muted-foreground">
          Perfis disponíveis: Administrador (acesso total), Operacional/Entregador (romaneios e estoque) e Financeiro
          (contas e acertos). Novos usuários entram criando conta na tela de login; o primeiro recebe Administrador.
        </p>
      </Card>
    </>
  );
}
