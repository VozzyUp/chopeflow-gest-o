import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHead,
  Select,
  StatCard,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { supabase } from "@/integrations/db/client";
import {
  nomeCliente,
  useClientes,
  useContas,
  usePagamentos,
  useProdutos,
  useMovimentacaoItens,
  useMovimentacoes,
  type ContaReceber,
} from "@/lib/data";
import { brl, dataBr, num } from "@/lib/format";
import { contaStatusLabel, statusTone } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — ChopeControl" },
      { name: "description", content: "Contas a receber, pagamentos parciais, DRE simplificado e fluxo previsto." },
      { property: "og:title", content: "Financeiro — ChopeControl" },
      { property: "og:description", content: "Aberto, vencido e pago por cliente e período, com margem do mês." },
    ],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { data: contas } = useContas();
  const { data: clientes } = useClientes();
  const { data: pagamentos } = usePagamentos();
  const { data: produtos } = useProdutos();
  const { data: movs } = useMovimentacoes();
  const { data: itens } = useMovimentacaoItens();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [conta, setConta] = useState<ContaReceber | null>(null);
  const [valor, setValor] = useState(0);
  const [forma, setForma] = useState("PIX");

  const registrar = useMutation({
    mutationFn: async () => {
      if (!conta) throw new Error("Título inválido");
      if (valor <= 0) throw new Error("Informe o valor recebido");
      const { error } = await supabase.from("pagamentos").insert({
        conta_id: conta.id,
        valor,
        forma,
        data: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento registrado");
      queryClient.invalidateQueries();
      setConta(null);
      setValor(0);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = (contas ?? []).filter((c) => {
    if (status && c.status !== status) return false;
    if (clienteFiltro && c.cliente_id !== clienteFiltro) return false;
    if (de && c.vencimento < de) return false;
    if (ate && c.vencimento > ate) return false;
    return true;
  });

  const totalAberto = (contas ?? []).filter((c) => c.status !== "PAGO").reduce((s, c) => s + Number(c.saldo), 0);
  const totalVencido = (contas ?? []).filter((c) => c.status === "VENCIDO").reduce((s, c) => s + Number(c.saldo), 0);
  const totalRecebido = (pagamentos ?? []).reduce((s, p) => s + Number(p.valor), 0);

  // DRE simplificado do mês
  const dre = useMemo(() => {
    const inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const receita = (contas ?? [])
      .filter((c) => new Date(c.created_at).getTime() >= inicio)
      .reduce((s, c) => s + Number(c.valor_total), 0);
    const idsMes = new Set((movs ?? []).filter((m) => new Date(m.data).getTime() >= inicio && !m.estornada).map((m) => m.id));
    const custo = (itens ?? [])
      .filter((i) => idsMes.has(i.movimentacao_id) && i.categoria === "BARRIL_CHEIO")
      .reduce((s, i) => {
        const p = produtos?.find((x) => x.id === i.produto_id);
        return s + Number(i.quantidade) * Number(p?.custo_barril ?? 0);
      }, 0);
    return { receita, custo, margem: receita - custo };
  }, [contas, movs, itens, produtos]);

  // fluxo de caixa previsto (próximos 4 vencimentos semanais)
  const fluxo = useMemo(() => {
    const semanas: { rotulo: string; valor: number }[] = [];
    for (let k = 0; k < 4; k++) {
      const ini = new Date();
      ini.setDate(ini.getDate() + k * 7);
      const fim = new Date(ini);
      fim.setDate(fim.getDate() + 7);
      const valorSemana = (contas ?? [])
        .filter((c) => c.status !== "PAGO")
        .filter((c) => {
          const v = new Date(c.vencimento);
          return v >= ini && v < fim;
        })
        .reduce((s, c) => s + Number(c.saldo), 0);
      semanas.push({ rotulo: `${dataBr(ini)} a ${dataBr(fim)}`, valor: valorSemana });
    }
    return semanas;
  }, [contas]);

  return (
    <>
      <PageHead title="Financeiro" subtitle="Contas a receber, recebimentos e margem" />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total a receber" value={brl(totalAberto)} tone="info" />
        <StatCard label="Total vencido" value={brl(totalVencido)} tone="danger" />
        <StatCard label="Recebido (histórico)" value={brl(totalRecebido)} tone="success" />
        <StatCard label="Margem do mês" value={brl(dre.margem)} hint={`Receita ${brl(dre.receita)} · custo ${brl(dre.custo)}`} tone="primary" />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(contaStatusLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cliente">
            <Select value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)}>
              <option value="">Todos</option>
              {(clientes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vencimento de">
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </Field>
          <Field label="até">
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="mb-4">
        <CardTitle>Contas a receber ({lista.length})</CardTitle>
        {lista.length === 0 ? (
          <EmptyState>Nenhum título encontrado.</EmptyState>
        ) : (
          <Table className="mt-3">
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th className="hidden md:table-cell">Descrição</Th>
                <Th className="hidden sm:table-cell">Origem</Th>
                <Th>Vencimento</Th>
                <Th>Total</Th>
                <Th>Saldo</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <Td className="font-semibold">{nomeCliente(clientes, c.cliente_id)}</Td>
                  <Td className="hidden md:table-cell text-muted-foreground">{c.descricao}</Td>
                  <Td className="hidden sm:table-cell text-muted-foreground">{c.origem}</Td>
                  <Td>{dataBr(c.vencimento)}</Td>
                  <Td>{brl(c.valor_total)}</Td>
                  <Td className="font-semibold">{brl(c.saldo)}</Td>
                  <Td>
                    <Badge tone={statusTone(c.status)}>{contaStatusLabel[c.status]}</Badge>
                  </Td>
                  <Td>
                    {c.status !== "PAGO" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConta(c);
                          setValor(Number(c.saldo));
                        }}
                      >
                        Receber
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{dataBr(c.data_pagamento)}</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>DRE simplificado do mês</CardTitle>
          <div className="mt-3 space-y-2 text-sm">
            <Linha label="Receita bruta" valor={dre.receita} />
            <Linha label="Custo dos barris entregues" valor={-dre.custo} />
            <div className="border-t border-border pt-2">
              <Linha label="Margem" valor={dre.margem} forte />
            </div>
            <p className="text-xs text-muted-foreground">
              Margem percentual: {dre.receita ? num((dre.margem / dre.receita) * 100, 1) : "0"}%
            </p>
          </div>
        </Card>

        <Card>
          <CardTitle>Fluxo de caixa previsto (4 semanas)</CardTitle>
          <div className="mt-3 space-y-2 text-sm">
            {fluxo.map((f) => (
              <div key={f.rotulo} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{f.rotulo}</span>
                <span className="font-semibold">{brl(f.valor)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={conta !== null} onClose={() => setConta(null)} title="Registrar recebimento">
        {conta ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              registrar.mutate();
            }}
          >
            <p className="text-sm text-muted-foreground">
              {nomeCliente(clientes, conta.cliente_id)} · saldo atual <strong>{brl(conta.saldo)}</strong>
            </p>
            <Field label="Valor recebido (R$)">
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} />
            </Field>
            <Field label="Forma">
              <Select value={forma} onChange={(e) => setForma(e.target.value)}>
                <option value="PIX">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="boleto">Boleto</option>
              </Select>
            </Field>
            <p className="text-xs text-muted-foreground">
              Pagamentos parciais são permitidos: o saldo é recalculado automaticamente.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setConta(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={registrar.isPending}>
                Confirmar recebimento
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </>
  );
}

function Linha({ label, valor, forte }: { label: string; valor: number; forte?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className={forte ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={forte ? "font-bold text-primary" : valor < 0 ? "text-destructive" : ""}>{brl(valor)}</span>
    </div>
  );
}
