import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Badge, Button, Card, CardTitle, EmptyState, PageHead, Table, Td, Th } from "@/components/ui/primitives";
import {
  nomeCliente,
  nomeProduto,
  useBarris,
  useClientes,
  useConsignacoes,
  useContas,
  useMovimentacaoItens,
  useMovimentacoes,
  useProdutos,
} from "@/lib/data";
import { brl, dataBr, diasDesde, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — ChopeControl" },
      { name: "description", content: "Barris por cliente, giro de vasilhame, inadimplência e rentabilidade." },
      { property: "og:title", content: "Relatórios — ChopeControl" },
      { property: "og:description", content: "Giro de barril, tempo médio de retorno, ranking de consumo e exportação CSV." },
    ],
  }),
  component: RelatoriosPage,
});

const relatorios = [
  "Barris por cliente",
  "Giro de barril",
  "Ranking de consumo",
  "Inadimplência",
  "Rentabilidade por produto",
] as const;

function RelatoriosPage() {
  const [rel, setRel] = useState<(typeof relatorios)[number]>("Barris por cliente");
  const { data: barris } = useBarris();
  const { data: clientes } = useClientes();
  const { data: contas } = useContas();
  const { data: produtos } = useProdutos();
  const { data: movs } = useMovimentacoes();
  const { data: itens } = useMovimentacaoItens();
  const { data: consignacoes } = useConsignacoes();

  const dados = useMemo(() => {
    if (rel === "Barris por cliente") {
      const mapa = new Map<string, { total: number; vazios: number; maisAntigo: number }>();
      for (const b of barris ?? []) {
        if (!b.cliente_id) continue;
        const atual = mapa.get(b.cliente_id) ?? { total: 0, vazios: 0, maisAntigo: 0 };
        atual.total += 1;
        if (b.status === "VAZIO_NO_CLIENTE") atual.vazios += 1;
        atual.maisAntigo = Math.max(atual.maisAntigo, diasDesde(b.data_ultima_movimentacao));
        mapa.set(b.cliente_id, atual);
      }
      return {
        colunas: ["Cliente", "Barris", "Vazios a coletar", "Barril mais antigo (dias)"],
        linhas: [...mapa.entries()]
          .sort((a, z) => z[1].total - a[1].total)
          .map(([id, v]) => [nomeCliente(clientes, id), num(v.total), num(v.vazios), num(v.maisAntigo)]),
      };
    }

    if (rel === "Giro de barril") {
      return {
        colunas: ["Barril", "Chope", "Ciclos", "Dias desde a última movimentação", "Status"],
        linhas: (barris ?? [])
          .slice()
          .sort((a, z) => z.ciclos - a.ciclos)
          .map((b) => [
            b.codigo,
            nomeProduto(produtos, b.produto_id),
            num(b.ciclos),
            num(diasDesde(b.data_ultima_movimentacao)),
            b.status,
          ]),
      };
    }

    if (rel === "Ranking de consumo") {
      const mapa = new Map<string, number>();
      const porMov = new Map((movs ?? []).map((m) => [m.id, m]));
      for (const i of itens ?? []) {
        if (i.categoria !== "BARRIL_CHEIO") continue;
        const m = porMov.get(i.movimentacao_id);
        if (!m?.cliente_id || m.estornada) continue;
        mapa.set(m.cliente_id, (mapa.get(m.cliente_id) ?? 0) + Number(i.quantidade));
      }
      return {
        colunas: ["Cliente", "Barris movimentados"],
        linhas: [...mapa.entries()]
          .sort((a, z) => z[1] - a[1])
          .map(([id, q]) => [nomeCliente(clientes, id), num(q)]),
      };
    }

    if (rel === "Inadimplência") {
      return {
        colunas: ["Cliente", "Título", "Vencimento", "Dias em atraso", "Saldo"],
        linhas: (contas ?? [])
          .filter((c) => c.status === "VENCIDO")
          .sort((a, z) => a.vencimento.localeCompare(z.vencimento))
          .map((c) => [
            nomeCliente(clientes, c.cliente_id),
            c.descricao ?? c.origem,
            dataBr(c.vencimento),
            num(diasDesde(c.vencimento)),
            brl(c.saldo),
          ]),
      };
    }

    // Rentabilidade por produto
    const mapa = new Map<string, { qtd: number; receita: number; custo: number }>();
    for (const i of itens ?? []) {
      if (i.categoria !== "BARRIL_CHEIO" || !i.produto_id) continue;
      const p = produtos?.find((x) => x.id === i.produto_id);
      const atual = mapa.get(i.produto_id) ?? { qtd: 0, receita: 0, custo: 0 };
      atual.qtd += Number(i.quantidade);
      atual.receita += Number(i.quantidade) * Number(p?.preco_barril ?? 0);
      atual.custo += Number(i.quantidade) * Number(p?.custo_barril ?? 0);
      mapa.set(i.produto_id, atual);
    }
    return {
      colunas: ["Chope", "Barris", "Receita potencial", "Custo", "Margem"],
      linhas: [...mapa.entries()]
        .sort((a, z) => z[1].receita - a[1].receita)
        .map(([id, v]) => [
          nomeProduto(produtos, id),
          num(v.qtd),
          brl(v.receita),
          brl(v.custo),
          brl(v.receita - v.custo),
        ]),
    };
  }, [rel, barris, clientes, contas, produtos, movs, itens]);

  const tempoMedioRetorno = useMemo(() => {
    const abertas = (consignacoes ?? []).filter((c) => c.status !== "ACERTADA");
    if (!abertas.length) return 0;
    return abertas.reduce((s, c) => s + diasDesde(c.data_entrega), 0) / abertas.length;
  }, [consignacoes]);

  function exportarCsv() {
    const linhas = [dados.colunas.join(";"), ...dados.linhas.map((l) => l.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + linhas], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rel.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHead
        title="Relatórios"
        subtitle="Análises operacionais e financeiras"
        actions={<Button onClick={exportarCsv}>Exportar CSV</Button>}
      />

      <Card className="mb-4">
        <CardTitle>Indicadores rápidos</CardTitle>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Badge tone="primary">
            Tempo médio de retorno de vasilhame: {num(tempoMedioRetorno, 1)} dias
          </Badge>
          <Badge tone="warning">
            Barris na rua: {(barris ?? []).filter((b) => b.cliente_id).length}
          </Badge>
          <Badge tone="danger">
            Títulos vencidos: {(contas ?? []).filter((c) => c.status === "VENCIDO").length}
          </Badge>
        </div>
      </Card>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-secondary p-1">
        {relatorios.map((r) => (
          <button
            key={r}
            onClick={() => setRel(r)}
            className={
              "shrink-0 rounded-md px-4 py-2 text-sm font-semibold " +
              (rel === r ? "bg-primary text-primary-foreground" : "text-muted-foreground")
            }
          >
            {r}
          </button>
        ))}
      </div>

      <Card>
        <CardTitle>{rel}</CardTitle>
        {dados.linhas.length === 0 ? (
          <EmptyState>Sem dados para este relatório.</EmptyState>
        ) : (
          <Table className="mt-3">
            <thead>
              <tr>
                {dados.colunas.map((c) => (
                  <Th key={c}>{c}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.linhas.map((l, i) => (
                <tr key={i}>
                  {l.map((v, j) => (
                    <Td key={j} className={j === 0 ? "font-semibold" : ""}>
                      {v}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
