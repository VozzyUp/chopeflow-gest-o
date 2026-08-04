import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHead,
  Select,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useClientes, type Cliente } from "@/lib/data";
import { brl } from "@/lib/format";
import { clienteStatusLabel, clienteTipoLabel, condicaoPagamentoLabel, statusTone } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — ChopeControl" },
      { name: "description", content: "Cadastro de bares em convênio, clientes de evento e vendas avulsas." },
      { property: "og:title", content: "Clientes — ChopeControl" },
      { property: "og:description", content: "Bares em convênio, eventos e clientes avulsos com limite de crédito e situação." },
    ],
  }),
  component: ClientesPage,
});

const vazio = {
  tipo: "bar_convenio",
  nome: "",
  documento: "",
  telefone: "",
  email: "",
  endereco: "",
  cidade: "",
  uf: "",
  cep: "",
  contato_responsavel: "",
  condicao_pagamento: "a_vista",
  tabela_preco: "padrao",
  limite_credito: 0,
  status: "ativo",
  observacoes: "",
};

function ClientesPage() {
  const { data: clientes, isLoading } = useClientes();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(vazio);

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = { ...form, limite_credito: Number(form.limite_credito) || 0 };
      if (editando) {
        const { error } = await supabase.from("clientes").update(payload as never).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editando ? "Cliente atualizado" : "Cliente cadastrado");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setModal(false);
      setEditando(null);
      setForm(vazio);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = useMemo(() => {
    return (clientes ?? []).filter((c) => {
      const t = busca.trim().toLowerCase();
      const okBusca =
        !t ||
        c.nome.toLowerCase().includes(t) ||
        (c.documento ?? "").toLowerCase().includes(t) ||
        (c.telefone ?? "").toLowerCase().includes(t);
      return okBusca && (!tipo || c.tipo === tipo) && (!status || c.status === status);
    });
  }, [clientes, busca, tipo, status]);

  function abrirNovo() {
    setEditando(null);
    setForm(vazio);
    setModal(true);
  }

  function abrirEdicao(c: Cliente) {
    setEditando(c);
    setForm({ ...vazio, ...c });
    setModal(true);
  }

  const set = (k: string) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHead
        title="Clientes"
        subtitle="Bares em convênio, eventos e avulsos"
        actions={<Button onClick={abrirNovo}>+ Novo cliente</Button>}
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Buscar">
            <Input placeholder="Nome, CPF/CNPJ ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </Field>
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(clienteTipoLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Situação">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(clienteStatusLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : lista.length === 0 ? (
          <EmptyState>Nenhum cliente encontrado.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th className="hidden sm:table-cell">Tipo</Th>
                <Th className="hidden md:table-cell">Contato</Th>
                <Th className="hidden lg:table-cell">Pagamento</Th>
                <Th className="hidden lg:table-cell">Limite</Th>
                <Th>Situação</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <Link to="/clientes/$id" params={{ id: c.id }} className="font-semibold hover:text-primary">
                      {c.nome}
                    </Link>
                    <div className="text-xs text-muted-foreground">{c.documento}</div>
                  </Td>
                  <Td className="hidden sm:table-cell text-muted-foreground">{clienteTipoLabel[c.tipo]}</Td>
                  <Td className="hidden md:table-cell text-muted-foreground">{c.telefone}</Td>
                  <Td className="hidden lg:table-cell text-muted-foreground">
                    {condicaoPagamentoLabel[c.condicao_pagamento] ?? c.condicao_pagamento}
                  </Td>
                  <Td className="hidden lg:table-cell">{brl(c.limite_credito)}</Td>
                  <Td>
                    <Badge tone={statusTone(c.status)}>{clienteStatusLabel[c.status]}</Badge>
                  </Td>
                  <Td>
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(c)}>
                      Editar
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editando ? "Editar cliente" : "Novo cliente"} wide>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
        >
          <Field label="Nome / Razão social" className="sm:col-span-2">
            <Input value={String(form.nome ?? "")} onChange={set("nome")} required />
          </Field>
          <Field label="Tipo">
            <Select value={String(form.tipo)} onChange={set("tipo")}>
              {Object.entries(clienteTipoLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="CPF / CNPJ">
            <Input value={String(form.documento ?? "")} onChange={set("documento")} />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input value={String(form.telefone ?? "")} onChange={set("telefone")} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={String(form.email ?? "")} onChange={set("email")} />
          </Field>
          <Field label="Endereço" className="sm:col-span-2">
            <Input value={String(form.endereco ?? "")} onChange={set("endereco")} />
          </Field>
          <Field label="Cidade">
            <Input value={String(form.cidade ?? "")} onChange={set("cidade")} />
          </Field>
          <Field label="UF">
            <Input maxLength={2} value={String(form.uf ?? "")} onChange={set("uf")} />
          </Field>
          <Field label="CEP">
            <Input value={String(form.cep ?? "")} onChange={set("cep")} />
          </Field>
          <Field label="Contato responsável">
            <Input value={String(form.contato_responsavel ?? "")} onChange={set("contato_responsavel")} />
          </Field>
          <Field label="Condição de pagamento">
            <Select value={String(form.condicao_pagamento)} onChange={set("condicao_pagamento")}>
              {Object.entries(condicaoPagamentoLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tabela de preço">
            <Select value={String(form.tabela_preco)} onChange={set("tabela_preco")}>
              <option value="padrao">Padrão</option>
              <option value="convenio">Convênio</option>
              <option value="evento">Evento</option>
            </Select>
          </Field>
          <Field label="Limite de crédito (R$)">
            <Input type="number" step="0.01" value={String(form.limite_credito ?? 0)} onChange={set("limite_credito")} />
          </Field>
          <Field label="Situação">
            <Select value={String(form.status)} onChange={set("status")}>
              {Object.entries(clienteStatusLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <Textarea value={String(form.observacoes ?? "")} onChange={set("observacoes")} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
