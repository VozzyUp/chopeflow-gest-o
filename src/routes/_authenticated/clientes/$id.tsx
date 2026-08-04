import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Badge, Card, CardTitle, EmptyState, PageHead, Table, Td, Th } from "@/components/ui/primitives";
import {
  useBarris,
  useChopeiras,
  useCilindros,
  useClientes,
  useConsignacoes,
  useContas,
  useMovimentacoes,
  useProdutos,
  nomeProduto,
} from "@/lib/data";
import { brl, dataBr, dataHoraBr, diasDesde, num } from "@/lib/format";
import {
  barrilStatusLabel,
  chopeiraStatusLabel,
  clienteStatusLabel,
  clienteTipoLabel,
  condicaoPagamentoLabel,
  consignacaoStatusLabel,
  contaStatusLabel,
  movNaturezaLabel,
  movTipoLabel,
  statusTone,
} from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do cliente — ChopeControl" },
      { name: "description", content: "Ativos em poder do cliente, histórico, consignações e financeiro." },
      { property: "og:title", content: "Ficha do cliente — ChopeControl" },
      { property: "og:description", content: "Barris, chopeiras, consignações abertas e financeiro do cliente." },
    ],
  }),
  component: FichaCliente,
});

const abas = ["Dados", "Ativos", "Movimentações", "Consignações", "Financeiro"] as const;

function FichaCliente() {
  const { id } = Route.useParams();
  const [aba, setAba] = useState<(typeof abas)[number]>("Dados");

  const { data: clientes } = useClientes();
  const { data: barris } = useBarris();
  const { data: chopeiras } = useChopeiras();
  const { data: cilindros } = useCilindros();
  const { data: consignacoes } = useConsignacoes();
  const { data: contas } = useContas();
  const { data: movs } = useMovimentacoes();
  const { data: produtos } = useProdutos();

  const cliente = clientes?.find((c) => c.id === id);
  if (!cliente) {
    return (
      <>
        <PageHead title="Cliente" />
        <EmptyState>Carregando ou cliente não encontrado.</EmptyState>
      </>
    );
  }

  const barrisCliente = (barris ?? []).filter((b) => b.cliente_id === id);
  const chopeirasCliente = (chopeiras ?? []).filter((c) => c.cliente_id === id);
  const cilindrosCliente = (cilindros ?? []).filter((c) => c.cliente_id === id);
  const consigCliente = (consignacoes ?? []).filter((c) => c.cliente_id === id);
  const contasCliente = (contas ?? []).filter((c) => c.cliente_id === id);
  const movsCliente = (movs ?? []).filter((m) => m.cliente_id === id);

  const emAberto = contasCliente.filter((c) => c.status !== "PAGO").reduce((s, c) => s + Number(c.saldo), 0);
  const consumoTotal = contasCliente.reduce((s, c) => s + Number(c.valor_total), 0);
  const mesesAtivo = Math.max(1, Math.round(diasDesde(cliente.created_at) / 30));

  return (
    <>
      <PageHead
        title={cliente.nome}
        subtitle={`${clienteTipoLabel[cliente.tipo]} · ${cliente.documento ?? "sem documento"}`}
        actions={
          <>
            <Badge tone={statusTone(cliente.status)}>{clienteStatusLabel[cliente.status]}</Badge>
            <Link
              to="/movimentacoes/nova"
              className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Nova movimentação
            </Link>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardTitle>Barris em poder</CardTitle>
          <div className="num-xl text-primary">{num(barrisCliente.length)}</div>
        </Card>
        <Card>
          <CardTitle>Em aberto</CardTitle>
          <div className="num-xl text-warning">{brl(emAberto)}</div>
        </Card>
        <Card>
          <CardTitle>Consignações abertas</CardTitle>
          <div className="num-xl">{num(consigCliente.filter((c) => c.status !== "ACERTADA").length)}</div>
        </Card>
        <Card>
          <CardTitle>Consumo médio / mês</CardTitle>
          <div className="num-xl text-success">{brl(consumoTotal / mesesAtivo)}</div>
        </Card>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-secondary p-1">
        {abas.map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={
              "shrink-0 rounded-md px-4 py-2 text-sm font-semibold " +
              (aba === a ? "bg-primary text-primary-foreground" : "text-muted-foreground")
            }
          >
            {a}
          </button>
        ))}
      </div>

      {aba === "Dados" ? (
        <Card className="grid gap-4 sm:grid-cols-2">
          <Info label="Telefone / WhatsApp" value={cliente.telefone} />
          <Info label="E-mail" value={cliente.email} />
          <Info label="Endereço" value={[cliente.endereco, cliente.cidade, cliente.uf].filter(Boolean).join(" - ")} />
          <Info label="Contato responsável" value={cliente.contato_responsavel} />
          <Info label="Condição de pagamento" value={condicaoPagamentoLabel[cliente.condicao_pagamento]} />
          <Info label="Tabela de preço" value={cliente.tabela_preco} />
          <Info label="Limite de crédito" value={brl(cliente.limite_credito)} />
          <Info label="Cliente desde" value={dataBr(cliente.created_at)} />
          <Info label="Observações" value={cliente.observacoes} />
        </Card>
      ) : null}

      {aba === "Ativos" ? (
        <div className="space-y-4">
          <Card>
            <CardTitle>Barris ({barrisCliente.length})</CardTitle>
            {barrisCliente.length === 0 ? (
              <EmptyState>Nenhum barril em poder deste cliente.</EmptyState>
            ) : (
              <Table className="mt-3">
                <thead>
                  <tr>
                    <Th>Código</Th>
                    <Th>Chope</Th>
                    <Th>Status</Th>
                    <Th>Dias com o cliente</Th>
                  </tr>
                </thead>
                <tbody>
                  {barrisCliente.map((b) => (
                    <tr key={b.id}>
                      <Td className="font-semibold">{b.codigo}</Td>
                      <Td>{nomeProduto(produtos, b.produto_id)}</Td>
                      <Td>
                        <Badge tone={statusTone(b.status)}>{barrilStatusLabel[b.status]}</Badge>
                      </Td>
                      <Td>{diasDesde(b.data_ultima_movimentacao)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardTitle>Chopeiras ({chopeirasCliente.length})</CardTitle>
            {chopeirasCliente.length === 0 ? (
              <EmptyState>Nenhuma chopeira com este cliente.</EmptyState>
            ) : (
              <Table className="mt-3">
                <thead>
                  <tr>
                    <Th>Código</Th>
                    <Th>Modelo</Th>
                    <Th>Regime</Th>
                    <Th>Desde</Th>
                  </tr>
                </thead>
                <tbody>
                  {chopeirasCliente.map((c) => (
                    <tr key={c.id}>
                      <Td className="font-semibold">{c.codigo}</Td>
                      <Td>{c.marca_modelo}</Td>
                      <Td>
                        <Badge tone={statusTone(c.status)}>{chopeiraStatusLabel[c.status]}</Badge>
                      </Td>
                      <Td>{dataBr(c.data_saida)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardTitle>Cilindros ({cilindrosCliente.length})</CardTitle>
            {cilindrosCliente.length === 0 ? (
              <EmptyState>Nenhum cilindro com este cliente.</EmptyState>
            ) : (
              <Table className="mt-3">
                <thead>
                  <tr>
                    <Th>Código</Th>
                    <Th>Tipo</Th>
                    <Th>Capacidade</Th>
                    <Th>Desde</Th>
                  </tr>
                </thead>
                <tbody>
                  {cilindrosCliente.map((c) => (
                    <tr key={c.id}>
                      <Td className="font-semibold">{c.codigo}</Td>
                      <Td>{c.tipo}</Td>
                      <Td>{num(c.capacidade_kg)} kg</Td>
                      <Td>{dataBr(c.data_saida)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      ) : null}

      {aba === "Movimentações" ? (
        <Card>
          {movsCliente.length === 0 ? (
            <EmptyState>Sem movimentações registradas.</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Data</Th>
                  <Th>Tipo</Th>
                  <Th>Natureza</Th>
                  <Th>Valor</Th>
                  <Th>Recebido por</Th>
                </tr>
              </thead>
              <tbody>
                {movsCliente.map((m) => (
                  <tr key={m.id} className={m.estornada ? "opacity-50" : ""}>
                    <Td>{m.numero}</Td>
                    <Td>{dataHoraBr(m.data)}</Td>
                    <Td>{movTipoLabel[m.tipo]}</Td>
                    <Td>{movNaturezaLabel[m.natureza]}</Td>
                    <Td>{brl(m.valor_total)}</Td>
                    <Td className="text-muted-foreground">{m.recebido_por ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : null}

      {aba === "Consignações" ? (
        <Card>
          {consigCliente.length === 0 ? (
            <EmptyState>Nenhuma consignação.</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Chope</Th>
                  <Th>Entregues</Th>
                  <Th>Acertados</Th>
                  <Th>Em aberto</Th>
                  <Th>Entrega</Th>
                  <Th>Dias</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {consigCliente.map((c) => (
                  <tr key={c.id}>
                    <Td>{nomeProduto(produtos, c.produto_id)}</Td>
                    <Td>{num(c.quantidade_entregue)}</Td>
                    <Td>{num(c.quantidade_acertada)}</Td>
                    <Td className="font-semibold text-warning">
                      {num(Number(c.quantidade_entregue) - Number(c.quantidade_acertada))}
                    </Td>
                    <Td>{dataBr(c.data_entrega)}</Td>
                    <Td>{diasDesde(c.data_entrega)}</Td>
                    <Td>
                      <Badge tone={statusTone(c.status)}>{consignacaoStatusLabel[c.status]}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : null}

      {aba === "Financeiro" ? (
        <Card>
          {contasCliente.length === 0 ? (
            <EmptyState>Nenhum título financeiro.</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Descrição</Th>
                  <Th>Vencimento</Th>
                  <Th>Total</Th>
                  <Th>Pago</Th>
                  <Th>Saldo</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {contasCliente.map((c) => (
                  <tr key={c.id}>
                    <Td>{c.descricao}</Td>
                    <Td>{dataBr(c.vencimento)}</Td>
                    <Td>{brl(c.valor_total)}</Td>
                    <Td>{brl(c.valor_pago)}</Td>
                    <Td className="font-semibold">{brl(c.saldo)}</Td>
                    <Td>
                      <Badge tone={statusTone(c.status)}>{contaStatusLabel[c.status]}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : null}
    </>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}
