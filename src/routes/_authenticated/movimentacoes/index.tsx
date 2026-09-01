import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHead,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import {
  nomeCliente,
  nomeProduto,
  useClientes,
  useMovimentacaoItens,
  useMovimentacoes,
  useProdutos,
} from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { brl, dataBr, dataHoraBr, num } from "@/lib/format";
import { movNaturezaLabel, movTipoLabel } from "@/lib/labels";
import { estornarMovimentacao, urlFotoMovimentacao } from "@/lib/movimentacao";

/** Fotos da entrega/instalação anexadas ao romaneio. */
function FotosRomaneio({ movimentacaoId }: { movimentacaoId: string }) {
  const { data } = useQuery({
    queryKey: ["movimentacao_fotos", movimentacaoId],
    queryFn: async () => {
      const { data: fotos, error } = await supabase
        .from("movimentacao_fotos")
        .select("id, path")
        .eq("movimentacao_id", movimentacaoId);
      if (error) throw error;
      return Promise.all((fotos ?? []).map(async (f) => ({ id: f.id, url: await urlFotoMovimentacao(f.path) })));
    },
  });

  if (!data?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {data.map((f) => (
        <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
          <img src={f.url} alt="Foto da entrega" className="h-24 w-24 rounded-lg object-cover" />
        </a>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/movimentacoes/")({
  head: () => ({
    meta: [
      { title: "Histórico de movimentações — ChopeControl" },
      { name: "description", content: "Todos os romaneios de entrega, coleta, troca e venda, com estorno auditável." },
      { property: "og:title", content: "Histórico de movimentações — ChopeControl" },
      { property: "og:description", content: "Romaneios de entrega e coleta com itens, valores e estornos registrados." },
    ],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const { data: movs } = useMovimentacoes();
  const { data: itens } = useMovimentacaoItens();
  const { data: clientes } = useClientes();
  const { data: produtos } = useProdutos();
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);

  const estornar = useMutation({
    mutationFn: (id: string) => estornarMovimentacao(id),
    onSuccess: () => {
      toast.success("Movimentação estornada (registro mantido no histórico)");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = (movs ?? []).filter(
    (m) => (!tipo || m.tipo === tipo) && (!clienteId || m.cliente_id === clienteId),
  );

  return (
    <>
      <PageHead
        title="Movimentações"
        subtitle="Histórico auditável de romaneios"
        actions={
          <Link
            to="/movimentacoes/nova"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            + Nova movimentação
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(movTipoLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cliente">
            <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Todos</option>
              {(clientes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        {lista.length === 0 ? (
          <EmptyState>Nenhuma movimentação registrada.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Data</Th>
                <Th>Cliente</Th>
                <Th className="hidden sm:table-cell">Tipo</Th>
                <Th className="hidden md:table-cell">Natureza</Th>
                <Th>Valor</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => {
                const meus = (itens ?? []).filter((i) => i.movimentacao_id === m.id);
                return (
                  <Fragment key={m.id}>
                    <tr className={m.estornada ? "opacity-50" : ""}>
                      <Td className="font-semibold">{m.numero}</Td>
                      <Td>{dataHoraBr(m.data)}</Td>
                      <Td>{nomeCliente(clientes, m.cliente_id)}</Td>
                      <Td className="hidden sm:table-cell">{movTipoLabel[m.tipo]}</Td>
                      <Td className="hidden md:table-cell">
                        <Badge tone={m.natureza === "CONSIGNACAO" ? "warning" : "primary"}>
                          {movNaturezaLabel[m.natureza]}
                        </Badge>
                      </Td>
                      <Td>{brl(m.valor_total)}</Td>
                      <Td className="whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => setAberta(aberta === m.id ? null : m.id)}>
                          Itens
                        </Button>
                        {!m.estornada ? (
                          <Button variant="ghost" size="sm" onClick={() => estornar.mutate(m.id)}>
                            Estornar
                          </Button>
                        ) : (
                          <Badge tone="danger">Estornada</Badge>
                        )}
                      </Td>
                    </tr>
                    {aberta === m.id ? (
                      <tr key={`${m.id}-itens`}>
                        <Td colSpan={7} className="bg-background/50">
                          {meus.length === 0 ? (
                            <span className="text-sm text-muted-foreground">Sem itens registrados.</span>
                          ) : (
                            <ul className="space-y-1 text-sm">
                              {meus.map((i) => (
                                <li key={i.id}>
                                  <span className="text-muted-foreground">{i.categoria.replace(/_/g, " ")}:</span>{" "}
                                  {num(i.quantidade)}x {nomeProduto(produtos, i.produto_id)}{" "}
                                  {Number(i.preco_unitario) > 0 ? `· ${brl(i.preco_unitario)}` : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                          {m.endereco_entrega ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Entrega em: {m.endereco_entrega}
                              {m.complemento_entrega ? ` — ${m.complemento_entrega}` : ""}
                            </p>
                          ) : null}
                          {m.data_entrega_prevista || m.data_retirada_prevista ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Entrega: {dataBr(m.data_entrega_prevista)} · Retirada: {dataBr(m.data_retirada_prevista)}
                            </p>
                          ) : null}
                          {m.observacao ? (
                            <p className="mt-2 text-xs text-muted-foreground">Obs.: {m.observacao}</p>
                          ) : null}
                          <FotosRomaneio movimentacaoId={m.id} />
                        </Td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
