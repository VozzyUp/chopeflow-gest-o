import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge, Card, CardTitle, EmptyState, PageHead, StatCard, Table, Td, Th } from "@/components/ui/primitives";
import {
  useBarris,
  useChopeiras,
  useClientes,
  useContas,
  useEmpresa,
  useMovimentacaoItens,
  useMovimentacoes,
  useProdutos,
} from "@/lib/data";
import { brl, dataBr, diasDesde, num } from "@/lib/format";
import { barrilStatusLabel } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ChopeControl" },
      { name: "description", content: "Visão geral de barris na rua, chopeiras, faturamento e contas a receber." },
      { property: "og:title", content: "Dashboard — ChopeControl" },
      { property: "og:description", content: "Barris na rua, chopeiras em comodato, total a receber e faturamento do mês." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: barris } = useBarris();
  const { data: chopeiras } = useChopeiras();
  const { data: clientes } = useClientes();
  const { data: contas } = useContas();
  const { data: produtos } = useProdutos();
  const { data: movs } = useMovimentacoes();
  const { data: itens } = useMovimentacaoItens();
  const { data: empresa } = useEmpresa();

  const b = barris ?? [];
  const naRua = b.filter((x) => x.status === "ENTREGUE_CLIENTE" || x.status === "VAZIO_NO_CLIENTE");
  const cheios = b.filter((x) => x.status === "CHEIO_ESTOQUE");
  const vaziosColetar = b.filter((x) => x.status === "VAZIO_NO_CLIENTE");
  const comodato = (chopeiras ?? []).filter((c) => c.status === "EM_COMODATO");
  const disponiveis = (chopeiras ?? []).filter((c) => c.status === "DISPONIVEL");

  const aReceber = (contas ?? []).filter((c) => c.status !== "PAGO");
  const totalReceber = aReceber.reduce((s, c) => s + Number(c.saldo), 0);
  const vencido = aReceber.filter((c) => c.status === "VENCIDO");
  const totalVencido = vencido.reduce((s, c) => s + Number(c.saldo), 0);

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const contasMes = (contas ?? []).filter((c) => new Date(c.created_at).getTime() >= inicioMes);
  const faturamentoMes = contasMes.reduce((s, c) => s + Number(c.valor_total), 0);

  const movsMes = (movs ?? []).filter((m) => new Date(m.data).getTime() >= inicioMes && !m.estornada);
  const idsMes = new Set(movsMes.map((m) => m.id));
  const barrisConsumidosMes = (itens ?? [])
    .filter((i) => idsMes.has(i.movimentacao_id) && i.categoria === "BARRIL_CHEIO")
    .reduce((s, i) => s + Number(i.quantidade), 0);

  // vendas por mês (últimos 6)
  const meses: { mes: string; valor: number }[] = [];
  for (let k = 5; k >= 0; k--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - k);
    const ini = d.getTime();
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const valor = (contas ?? [])
      .filter((c) => {
        const t = new Date(c.created_at).getTime();
        return t >= ini && t < fim;
      })
      .reduce((s, c) => s + Number(c.valor_total), 0);
    meses.push({ mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), valor });
  }

  // ranking clientes
  const porCliente = new Map<string, number>();
  for (const c of contas ?? []) {
    porCliente.set(c.cliente_id, (porCliente.get(c.cliente_id) ?? 0) + Number(c.valor_total));
  }
  const ranking = [...porCliente.entries()]
    .map(([id, valor]) => ({ id, valor, nome: clientes?.find((c) => c.id === id)?.nome ?? "—" }))
    .sort((a, z) => z.valor - a.valor)
    .slice(0, 10);

  // barris na rua por cliente
  const naRuaPorCliente = new Map<string, number>();
  for (const x of naRua) {
    if (!x.cliente_id) continue;
    naRuaPorCliente.set(x.cliente_id, (naRuaPorCliente.get(x.cliente_id) ?? 0) + 1);
  }

  // alertas
  const diasParado = empresa?.dias_alerta_barril_parado ?? 21;
  const parados = naRua.filter((x) => diasDesde(x.data_ultima_movimentacao) > diasParado);
  const estoqueBaixo = (produtos ?? []).filter((p) => {
    const qtd = cheios.filter((x) => x.produto_id === p.id).length;
    return p.ativo && qtd < p.estoque_minimo;
  });
  const higienizacaoVencida = (chopeiras ?? []).filter(
    (c) => c.proxima_higienizacao && new Date(c.proxima_higienizacao) < new Date(),
  );

  return (
    <>
      <PageHead
        title="Dashboard"
        subtitle={empresa?.nome ?? "Distribuidora de chope"}
        actions={
          <Link
            to="/movimentacoes/nova"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            + Nova movimentação
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Barris na rua" value={num(naRua.length)} hint={`${naRuaPorCliente.size} clientes`} tone="primary" />
        <StatCard label="Cheios em estoque" value={num(cheios.length)} tone="success" />
        <StatCard label="Vazios a coletar" value={num(vaziosColetar.length)} tone="warning" />
        <StatCard label="Chopeiras em comodato" value={num(comodato.length)} tone="primary" />
        <StatCard label="Chopeiras disponíveis" value={num(disponiveis.length)} tone="success" />
        <StatCard label="Total a receber" value={brl(totalReceber)} tone="info" />
        <StatCard label="Total vencido" value={brl(totalVencido)} hint={`${vencido.length} títulos`} tone="danger" />
        <StatCard label="Faturamento do mês" value={brl(faturamentoMes)} tone="primary" />
        <StatCard label="Barris consumidos no mês" value={num(barrisConsumidosMes)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Faturamento por mês</CardTitle>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meses}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(v: number) => brl(v)}
                />
                <Bar dataKey="valor" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Top 10 clientes</CardTitle>
          <div className="mt-3 space-y-2">
            {ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem faturamento registrado.</p>
            ) : (
              ranking.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {r.nome}
                  </span>
                  <span className="font-semibold text-primary">{brl(r.valor)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Estoque abaixo do mínimo</CardTitle>
          <div className="mt-3 space-y-2 text-sm">
            {estoqueBaixo.length === 0 ? (
              <p className="text-muted-foreground">Todos os chopes acima do mínimo.</p>
            ) : (
              estoqueBaixo.map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span>{p.nome}</span>
                  <Badge tone="danger">
                    {cheios.filter((x) => x.produto_id === p.id).length} / mín {p.estoque_minimo}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Barris parados há mais de {diasParado} dias</CardTitle>
          <div className="mt-3 space-y-2 text-sm">
            {parados.length === 0 ? (
              <p className="text-muted-foreground">Nenhum barril parado.</p>
            ) : (
              parados.slice(0, 8).map((x) => (
                <div key={x.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {x.codigo} · {clientes?.find((c) => c.id === x.cliente_id)?.nome ?? "—"}
                  </span>
                  <Badge tone="warning">{diasDesde(x.data_ultima_movimentacao)} d</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Higienização vencida</CardTitle>
          <div className="mt-3 space-y-2 text-sm">
            {higienizacaoVencida.length === 0 ? (
              <p className="text-muted-foreground">Todas as chopeiras em dia.</p>
            ) : (
              higienizacaoVencida.map((c) => (
                <div key={c.id} className="flex justify-between gap-2">
                  <span className="truncate">{c.codigo}</span>
                  <Badge tone="danger">venceu {dataBr(c.proxima_higienizacao)}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle>Barris na rua por cliente</CardTitle>
        {naRuaPorCliente.size === 0 ? (
          <EmptyState>Nenhum barril em poder de clientes.</EmptyState>
        ) : (
          <Table className="mt-3">
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Barris</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody>
              {[...naRuaPorCliente.entries()]
                .sort((a, z) => z[1] - a[1])
                .map(([id, qtd]) => {
                  const doCliente = naRua.filter((x) => x.cliente_id === id);
                  const vaz = doCliente.filter((x) => x.status === "VAZIO_NO_CLIENTE").length;
                  return (
                    <tr key={id}>
                      <Td>
                        <Link to="/clientes/$id" params={{ id }} className="font-semibold hover:text-primary">
                          {clientes?.find((c) => c.id === id)?.nome ?? "—"}
                        </Link>
                      </Td>
                      <Td className="font-semibold">{qtd}</Td>
                      <Td className="text-muted-foreground">
                        {qtd - vaz} {barrilStatusLabel.ENTREGUE_CLIENTE.toLowerCase()} · {vaz} vazios
                      </Td>
                    </tr>
                  );
                })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
