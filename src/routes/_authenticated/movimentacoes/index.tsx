import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FichaPedidoPrint } from "@/components/ficha-pedido";
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
import {
  nomeCliente,
  nomeProduto,
  useChopeiras,
  useCilindros,
  useClientes,
  useEmpresa,
  useMovimentacaoItens,
  useMovimentacoes,
  useProdutos,
} from "@/lib/data";
import { supabase } from "@/integrations/db/client";
import { brl, dataBr, dataHoraBr, num } from "@/lib/format";
import { movNaturezaLabel, movTipoLabel } from "@/lib/labels";
import { urlFotoMovimentacao } from "@/lib/movimentacao";
import { fichaDeMovimentacao, textoRomaneio, whatsappRomaneio, type DadosRomaneio } from "@/lib/romaneio";

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
      { title: "Histórico de movimentações — V-Chopp" },
      { name: "description", content: "Todos os romaneios de entrega, coleta, troca e venda, com estorno auditável." },
      { property: "og:title", content: "Histórico de movimentações — V-Chopp" },
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
  const { data: chopeiras } = useChopeiras();
  const { data: cilindros } = useCilindros();
  const { data: empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);
  const [verId, setVerId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const movEditar = useMemo(() => (movs ?? []).find((m) => m.id === editId) ?? null, [movs, editId]);

  const [form, setForm] = useState({
    data: "",
    endereco_entrega: "",
    complemento_entrega: "",
    data_entrega_prevista: "",
    data_retirada_prevista: "",
    responsavel: "",
    recebido_por: "",
    observacao: "",
  });

  useEffect(() => {
    if (!movEditar) {
      setForm({
        data: "",
        endereco_entrega: "",
        complemento_entrega: "",
        data_entrega_prevista: "",
        data_retirada_prevista: "",
        responsavel: "",
        recebido_por: "",
        observacao: "",
      });
      return;
    }
    const toDatetimeLocal = (iso: string) => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setForm({
      data: toDatetimeLocal(movEditar.data),
      endereco_entrega: movEditar.endereco_entrega ?? "",
      complemento_entrega: movEditar.complemento_entrega ?? "",
      data_entrega_prevista: movEditar.data_entrega_prevista ? movEditar.data_entrega_prevista.slice(0, 10) : "",
      data_retirada_prevista: movEditar.data_retirada_prevista ? movEditar.data_retirada_prevista.slice(0, 10) : "",
      responsavel: movEditar.responsavel ?? "",
      recebido_por: movEditar.recebido_por ?? "",
      observacao: movEditar.observacao ?? "",
    });
  }, [movEditar]);

  const salvarEdicao = useMutation({
    mutationFn: async (values: typeof form & { id: string }) => {
      const { id, ...rest } = values;
      const { error } = await supabase
        .from("movimentacoes")
        .update({
          data: new Date(rest.data).toISOString(),
          endereco_entrega: rest.endereco_entrega || null,
          complemento_entrega: rest.complemento_entrega || null,
          data_entrega_prevista: rest.data_entrega_prevista || null,
          data_retirada_prevista: rest.data_retirada_prevista || null,
          responsavel: rest.responsavel || null,
          recebido_por: rest.recebido_por || null,
          observacao: rest.observacao || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimentação atualizada");
      queryClient.invalidateQueries();
      setEditId(null);
    },
    onError: (e: Error) => toast.error("Erro ao salvar: " + e.message),
  });

  const lista = (movs ?? []).filter(
    (m) => (!tipo || m.tipo === tipo) && (!clienteId || m.cliente_id === clienteId),
  );

  const movVer = (movs ?? []).find((m) => m.id === verId);
  const dados: DadosRomaneio | null = movVer
    ? {
        mov: movVer,
        itens: (itens ?? []).filter((i) => i.movimentacao_id === movVer.id),
        cliente: clientes?.find((c) => c.id === movVer.cliente_id),
        produtos,
        chopeiras,
        cilindros,
        empresaNome: empresa?.nome,
      }
    : null;
  const texto = dados ? textoRomaneio(dados) : "";

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
                        <Button variant="ghost" size="sm" onClick={() => setVerId(m.id)}>
                          Visualizar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setAberta(aberta === m.id ? null : m.id)}>
                          Itens
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditId(m.id)}>
                          Editar
                        </Button>
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

      <Modal
        open={dados !== null}
        onClose={() => setVerId(null)}
        title={`Romaneio #${movVer?.numero ?? ""}`}
        wide
      >
        {dados ? (
          <>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Cliente:</span> {dados.cliente?.nome ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Data:</span> {dataHoraBr(dados.mov.data)}
              </p>
              <p>
                <span className="text-muted-foreground">Operação:</span>{" "}
                {movTipoLabel[dados.mov.tipo] ?? dados.mov.tipo} · {movNaturezaLabel[dados.mov.natureza]}
              </p>
              <p>
                <span className="text-muted-foreground">Valor:</span> {brl(dados.mov.valor_total)}
              </p>
              {dados.mov.responsavel ? (
                <p>
                  <span className="text-muted-foreground">Entregador:</span> {dados.mov.responsavel}
                </p>
              ) : null}
              {dados.mov.recebido_por ? (
                <p>
                  <span className="text-muted-foreground">Recebido por:</span> {dados.mov.recebido_por}
                </p>
              ) : null}
            </div>

            <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-background/70 p-4 text-sm whitespace-pre-wrap">
              {texto}
            </pre>

            <FotosRomaneio movimentacaoId={dados.mov.id} />

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(texto);
                  toast.success("Texto copiado");
                }}
              >
                Copiar texto
              </Button>
              <a
                className="inline-flex h-11 items-center rounded-lg bg-success px-4 text-sm font-semibold text-success-foreground"
                href={whatsappRomaneio(dados.cliente?.telefone, texto)}
                target="_blank"
                rel="noreferrer"
              >
                Reenviar no WhatsApp
              </a>
              <Button onClick={() => window.print()}>Reimprimir ficha (PDF)</Button>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={!!movEditar}
        onClose={() => setEditId(null)}
        title={`Editar romaneio #${movEditar?.numero ?? ""}`}
      >
        {movEditar ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.data) {
                toast.error("Informe a data/hora da movimentação");
                return;
              }
              salvarEdicao.mutate({ ...form, id: movEditar.id });
            }}
            className="space-y-4"
          >
            <Field label="Data e hora">
              <Input
                type="datetime-local"
                value={form.data}
                onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Endereço de entrega">
                <Input
                  value={form.endereco_entrega}
                  onChange={(e) => setForm((f) => ({ ...f, endereco_entrega: e.target.value }))}
                  placeholder="Rua, número, bairro"
                />
              </Field>
              <Field label="Complemento">
                <Input
                  value={form.complemento_entrega}
                  onChange={(e) => setForm((f) => ({ ...f, complemento_entrega: e.target.value }))}
                  placeholder="Apto, bloco, referência"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data de entrega prevista">
                <Input
                  type="date"
                  value={form.data_entrega_prevista}
                  onChange={(e) => setForm((f) => ({ ...f, data_entrega_prevista: e.target.value }))}
                />
              </Field>
              <Field label="Data de retirada prevista">
                <Input
                  type="date"
                  value={form.data_retirada_prevista}
                  onChange={(e) => setForm((f) => ({ ...f, data_retirada_prevista: e.target.value }))}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Entregador / Responsável">
                <Input
                  value={form.responsavel}
                  onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
                />
              </Field>
              <Field label="Recebido por">
                <Input
                  value={form.recebido_por}
                  onChange={(e) => setForm((f) => ({ ...f, recebido_por: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Observação">
              <Textarea
                value={form.observacao}
                onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                rows={3}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditId(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvarEdicao.isPending}>
                Salvar alterações
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      {dados ? <FichaPedidoPrint empresa={empresa ?? null} pedido={fichaDeMovimentacao(dados)} /> : null}
    </>
  );
}
