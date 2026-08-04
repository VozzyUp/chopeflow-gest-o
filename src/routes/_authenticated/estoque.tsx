import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Modal,
  PageHead,
  Select,
  StatCard,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { supabase } from "@/integrations/supabase/client";
import {
  nomeCliente,
  nomeProduto,
  useBarris,
  useChopeiras,
  useCilindros,
  useClientes,
  useProdutos,
  useSaldosCliente,
} from "@/lib/data";
import { brl, dataBr, diasDesde, num } from "@/lib/format";
import { barrilStatusLabel, chopeiraStatusLabel, cilindroStatusLabel, statusTone } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque e ativos — ChopeControl" },
      { name: "description", content: "Barris por status e produto, chopeiras por cliente e cilindros de CO2." },
      { property: "og:title", content: "Estoque e ativos — ChopeControl" },
      { property: "og:description", content: "Ciclo de vida dos vasilhames, mapa de chopeiras e controle de cilindros." },
    ],
  }),
  component: EstoquePage,
});

const abas = ["Barris", "Chopeiras", "Cilindros", "Saldo por cliente"] as const;

function EstoquePage() {
  const [aba, setAba] = useState<(typeof abas)[number]>("Barris");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [produtoFiltro, setProdutoFiltro] = useState("");
  const [inventario, setInventario] = useState(false);
  const [ajuste, setAjuste] = useState({ codigo: "", produto_id: "", volume_litros: 50, status: "CHEIO_ESTOQUE" });

  const queryClient = useQueryClient();
  const { data: barris } = useBarris();
  const { data: chopeiras } = useChopeiras();
  const { data: cilindros } = useCilindros();
  const { data: clientes } = useClientes();
  const { data: produtos } = useProdutos();
  const { data: saldos } = useSaldosCliente();

  const criarBarril = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("barris").insert({
        codigo: ajuste.codigo,
        produto_id: ajuste.produto_id || null,
        volume_litros: Number(ajuste.volume_litros),
        status: ajuste.status as "CHEIO_ESTOQUE",
        data_ultima_movimentacao: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inventário ajustado");
      queryClient.invalidateQueries({ queryKey: ["barris"] });
      setInventario(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mudarStatusBarril = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: Record<string, unknown> = {
        status,
        data_ultima_movimentacao: new Date().toISOString(),
      };
      if (status === "CHEIO_ESTOQUE" || status === "EM_HIGIENIZACAO") patch["cliente_id"] = null;
      const { error } = await supabase.from("barris").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["barris"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const b = barris ?? [];
  const listaBarris = b.filter(
    (x) => (!statusFiltro || x.status === statusFiltro) && (!produtoFiltro || x.produto_id === produtoFiltro),
  );

  return (
    <>
      <PageHead
        title="Estoque e ativos"
        subtitle="Ciclo de vida dos vasilhames e patrimônio"
        actions={<Button onClick={() => setInventario(true)}>Inventário / ajuste</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Cheios em estoque" value={num(b.filter((x) => x.status === "CHEIO_ESTOQUE").length)} tone="success" />
        <StatCard label="Na rua" value={num(b.filter((x) => x.status === "ENTREGUE_CLIENTE" || x.status === "VAZIO_NO_CLIENTE").length)} tone="primary" />
        <StatCard label="Em higienização" value={num(b.filter((x) => x.status === "EM_HIGIENIZACAO").length)} tone="warning" />
        <StatCard label="Manutenção / baixado" value={num(b.filter((x) => x.status === "MANUTENCAO" || x.status === "BAIXADO").length)} tone="danger" />
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

      {aba === "Barris" ? (
        <>
          <Card className="mb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status">
                <Select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
                  <option value="">Todos</option>
                  {Object.entries(barrilStatusLabel).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Chope">
                <Select value={produtoFiltro} onChange={(e) => setProdutoFiltro(e.target.value)}>
                  <option value="">Todos</option>
                  {(produtos ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>
          <Card>
            {listaBarris.length === 0 ? (
              <EmptyState>Nenhum barril encontrado.</EmptyState>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Código</Th>
                    <Th>Chope</Th>
                    <Th>Volume</Th>
                    <Th>Status</Th>
                    <Th className="hidden md:table-cell">Cliente</Th>
                    <Th className="hidden sm:table-cell">Dias</Th>
                    <Th className="hidden lg:table-cell">Ciclos</Th>
                    <Th>Mover para</Th>
                  </tr>
                </thead>
                <tbody>
                  {listaBarris.map((x) => (
                    <tr key={x.id}>
                      <Td className="font-semibold">{x.codigo}</Td>
                      <Td>{nomeProduto(produtos, x.produto_id)}</Td>
                      <Td>{num(x.volume_litros)} L</Td>
                      <Td>
                        <Badge tone={statusTone(x.status)}>{barrilStatusLabel[x.status]}</Badge>
                      </Td>
                      <Td className="hidden md:table-cell text-muted-foreground">{nomeCliente(clientes, x.cliente_id)}</Td>
                      <Td className="hidden sm:table-cell">{diasDesde(x.data_ultima_movimentacao)}</Td>
                      <Td className="hidden lg:table-cell">{x.ciclos}</Td>
                      <Td>
                        <Select
                          value=""
                          onChange={(e) =>
                            e.target.value && mudarStatusBarril.mutate({ id: x.id, status: e.target.value })
                          }
                          className="h-9 w-40"
                        >
                          <option value="">—</option>
                          {Object.entries(barrilStatusLabel).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      ) : null}

      {aba === "Chopeiras" ? (
        <Card>
          <CardTitle>Mapa de chopeiras</CardTitle>
          <Table className="mt-3">
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Modelo / série</Th>
                <Th>Torneiras</Th>
                <Th>Status</Th>
                <Th>Onde está</Th>
                <Th className="hidden md:table-cell">Desde</Th>
                <Th className="hidden lg:table-cell">Valor</Th>
                <Th className="hidden lg:table-cell">Próx. higienização</Th>
              </tr>
            </thead>
            <tbody>
              {(chopeiras ?? []).map((c) => {
                const vencida = c.proxima_higienizacao && new Date(c.proxima_higienizacao) < new Date();
                return (
                  <tr key={c.id}>
                    <Td className="font-semibold">{c.codigo}</Td>
                    <Td>
                      {c.marca_modelo}
                      <div className="text-xs text-muted-foreground">{c.numero_serie}</div>
                    </Td>
                    <Td>{c.torneiras}</Td>
                    <Td>
                      <Badge tone={statusTone(c.status)}>{chopeiraStatusLabel[c.status]}</Badge>
                    </Td>
                    <Td>{c.cliente_id ? nomeCliente(clientes, c.cliente_id) : "Depósito"}</Td>
                    <Td className="hidden md:table-cell">{dataBr(c.data_saida)}</Td>
                    <Td className="hidden lg:table-cell">{brl(c.valor_equipamento)}</Td>
                    <Td className="hidden lg:table-cell">
                      <Badge tone={vencida ? "danger" : "success"}>{dataBr(c.proxima_higienizacao)}</Badge>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      ) : null}

      {aba === "Cilindros" ? (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Tipo</Th>
                <Th>Capacidade</Th>
                <Th>Status</Th>
                <Th>Cliente</Th>
                <Th>Desde</Th>
              </tr>
            </thead>
            <tbody>
              {(cilindros ?? []).map((c) => (
                <tr key={c.id}>
                  <Td className="font-semibold">{c.codigo}</Td>
                  <Td>{c.tipo}</Td>
                  <Td>{num(c.capacidade_kg)} kg</Td>
                  <Td>
                    <Badge tone={statusTone(c.status)}>{cilindroStatusLabel[c.status]}</Badge>
                  </Td>
                  <Td>{c.cliente_id ? nomeCliente(clientes, c.cliente_id) : "Depósito"}</Td>
                  <Td>{dataBr(c.data_saida)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      {aba === "Saldo por cliente" ? (
        <Card>
          <CardTitle>Saldo agregado em poder do cliente (modo quantidade)</CardTitle>
          {(saldos ?? []).length === 0 ? (
            <EmptyState>Nenhum saldo agregado registrado.</EmptyState>
          ) : (
            <Table className="mt-3">
              <thead>
                <tr>
                  <Th>Cliente</Th>
                  <Th>Chope</Th>
                  <Th>Cheios</Th>
                  <Th>Vazios</Th>
                </tr>
              </thead>
              <tbody>
                {(saldos ?? []).map((s) => (
                  <tr key={s.id}>
                    <Td>{nomeCliente(clientes, s.cliente_id)}</Td>
                    <Td>{nomeProduto(produtos, s.produto_id)}</Td>
                    <Td className="font-semibold text-primary">{num(s.barris_cheios)}</Td>
                    <Td className="font-semibold text-warning">{num(s.barris_vazios)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : null}

      <Modal open={inventario} onClose={() => setInventario(false)} title="Inventário / ajuste manual">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            criarBarril.mutate();
          }}
        >
          <Field label="Código / etiqueta do barril">
            <Input
              value={ajuste.codigo}
              onChange={(e) => setAjuste((a) => ({ ...a, codigo: e.target.value }))}
              required
              placeholder="BR-041"
            />
          </Field>
          <Field label="Chope">
            <Select value={ajuste.produto_id} onChange={(e) => setAjuste((a) => ({ ...a, produto_id: e.target.value }))}>
              <option value="">Sem chope definido</option>
              {(produtos ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Volume (L)">
            <Input
              type="number"
              value={ajuste.volume_litros}
              onChange={(e) => setAjuste((a) => ({ ...a, volume_litros: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Status inicial">
            <Select value={ajuste.status} onChange={(e) => setAjuste((a) => ({ ...a, status: e.target.value }))}>
              {Object.entries(barrilStatusLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setInventario(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criarBarril.isPending}>
              Adicionar ao inventário
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
