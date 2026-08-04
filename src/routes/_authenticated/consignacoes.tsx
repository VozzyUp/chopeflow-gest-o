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
import { supabase } from "@/integrations/supabase/client";
import { nomeCliente, nomeProduto, useClientes, useConsignacoes, useProdutos } from "@/lib/data";
import { brl, dataBr, diasDesde, num } from "@/lib/format";
import { consignacaoStatusLabel, statusTone } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/consignacoes")({
  head: () => ({
    meta: [
      { title: "Consignação e acertos — ChopeControl" },
      { name: "description", content: "Barris consignados por cliente, dias em aberto e geração do acerto." },
      { property: "og:title", content: "Consignação e acertos — ChopeControl" },
      { property: "og:description", content: "Consignado não é vendido: a receita nasce no acerto, que gera a conta a receber." },
    ],
  }),
  component: ConsignacoesPage,
});

function ConsignacoesPage() {
  const { data: consignacoes } = useConsignacoes();
  const { data: clientes } = useClientes();
  const { data: produtos } = useProdutos();
  const queryClient = useQueryClient();

  const [clienteFiltro, setClienteFiltro] = useState("");
  const [acertoCliente, setAcertoCliente] = useState<string | null>(null);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [desconto, setDesconto] = useState(0);
  const [vencimentoDias, setVencimentoDias] = useState(7);

  const abertas = (consignacoes ?? []).filter((c) => c.status !== "ACERTADA");
  const lista = abertas.filter((c) => !clienteFiltro || c.cliente_id === clienteFiltro);

  const totais = useMemo(() => {
    const barrisAbertos = abertas.reduce(
      (s, c) => s + (Number(c.quantidade_entregue) - Number(c.quantidade_acertada)),
      0,
    );
    const valorPotencial = abertas.reduce(
      (s, c) => s + (Number(c.quantidade_entregue) - Number(c.quantidade_acertada)) * Number(c.preco_unitario),
      0,
    );
    return { barrisAbertos, valorPotencial, clientes: new Set(abertas.map((c) => c.cliente_id)).size };
  }, [abertas]);

  const doAcerto = abertas.filter((c) => c.cliente_id === acertoCliente);
  const valorBruto = doAcerto.reduce((s, c) => s + (quantidades[c.id] ?? 0) * Number(c.preco_unitario), 0);
  const valorFinal = Math.max(0, valorBruto - desconto);

  const gerarAcerto = useMutation({
    mutationFn: async () => {
      if (!acertoCliente) throw new Error("Cliente inválido");
      if (valorBruto <= 0) throw new Error("Informe as quantidades consumidas");

      const { data: acerto, error } = await supabase
        .from("acertos")
        .insert({
          cliente_id: acertoCliente,
          periodo_inicio: doAcerto.reduce((min, c) => (c.data_entrega < min ? c.data_entrega : min), doAcerto[0]!.data_entrega),
          periodo_fim: new Date().toISOString().slice(0, 10),
          valor_bruto: valorBruto,
          desconto,
          valor_final: valorFinal,
        })
        .select("*")
        .single();
      if (error) throw error;

      for (const c of doAcerto) {
        const qtd = quantidades[c.id] ?? 0;
        if (qtd <= 0) continue;
        const { error: itemErr } = await supabase.from("acerto_itens").insert({
          acerto_id: acerto.id,
          consignacao_id: c.id,
          produto_id: c.produto_id,
          quantidade: qtd,
          preco_unitario: c.preco_unitario,
        });
        if (itemErr) throw itemErr;
        const { error: upErr } = await supabase
          .from("consignacoes")
          .update({ quantidade_acertada: Number(c.quantidade_acertada) + qtd })
          .eq("id", c.id);
        if (upErr) throw upErr;
      }

      const { error: contaErr } = await supabase.from("contas_receber").insert({
        origem: "acerto",
        cliente_id: acertoCliente,
        acerto_id: acerto.id,
        descricao: `Acerto de consignação em ${dataBr(new Date())}`,
        valor_total: valorFinal,
        vencimento: new Date(Date.now() + vencimentoDias * 86400000).toISOString().slice(0, 10),
      });
      if (contaErr) throw contaErr;
    },
    onSuccess: () => {
      toast.success("Acerto gerado e conta a receber criada");
      queryClient.invalidateQueries();
      setAcertoCliente(null);
      setQuantidades({});
      setDesconto(0);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHead title="Consignação e acertos" subtitle="Consignado só vira receita no acerto" />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Barris consignados em aberto" value={num(totais.barrisAbertos)} tone="warning" />
        <StatCard label="Valor potencial" value={brl(totais.valorPotencial)} tone="primary" />
        <StatCard label="Clientes com consignação" value={num(totais.clientes)} />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
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
          <Field label="Ação">
            <Select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                setAcertoCliente(e.target.value);
                setQuantidades({});
                setDesconto(0);
              }}
            >
              <option value="">Fazer acerto de...</option>
              {[...new Set(abertas.map((c) => c.cliente_id))].map((id) => (
                <option key={id} value={id}>
                  {nomeCliente(clientes, id)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Consignações abertas</CardTitle>
        {lista.length === 0 ? (
          <EmptyState>Nenhuma consignação em aberto.</EmptyState>
        ) : (
          <Table className="mt-3">
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Chope</Th>
                <Th>Entregues</Th>
                <Th>Acertados</Th>
                <Th>Em aberto</Th>
                <Th className="hidden sm:table-cell">Entrega</Th>
                <Th>Dias</Th>
                <Th className="hidden md:table-cell">Limite</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const dias = diasDesde(c.data_entrega);
                return (
                  <tr key={c.id}>
                    <Td className="font-semibold">{nomeCliente(clientes, c.cliente_id)}</Td>
                    <Td>{nomeProduto(produtos, c.produto_id)}</Td>
                    <Td>{num(c.quantidade_entregue)}</Td>
                    <Td>{num(c.quantidade_acertada)}</Td>
                    <Td className="font-semibold text-warning">
                      {num(Number(c.quantidade_entregue) - Number(c.quantidade_acertada))}
                    </Td>
                    <Td className="hidden sm:table-cell">{dataBr(c.data_entrega)}</Td>
                    <Td>
                      <Badge tone={dias > 30 ? "danger" : dias > 20 ? "warning" : "neutral"}>{dias} d</Badge>
                    </Td>
                    <Td className="hidden md:table-cell">{dataBr(c.data_limite)}</Td>
                    <Td>
                      <Badge tone={statusTone(c.status)}>{consignacaoStatusLabel[c.status]}</Badge>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={acertoCliente !== null}
        onClose={() => setAcertoCliente(null)}
        title={`Acerto — ${nomeCliente(clientes, acertoCliente)}`}
        wide
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Informe quantos barris o cliente consumiu. O valor gera automaticamente uma conta a receber.
        </p>
        <Table>
          <thead>
            <tr>
              <Th>Chope</Th>
              <Th>Em aberto</Th>
              <Th>Preço</Th>
              <Th>Consumidos</Th>
              <Th>Subtotal</Th>
            </tr>
          </thead>
          <tbody>
            {doAcerto.map((c) => {
              const aberto = Number(c.quantidade_entregue) - Number(c.quantidade_acertada);
              const qtd = quantidades[c.id] ?? 0;
              return (
                <tr key={c.id}>
                  <Td>{nomeProduto(produtos, c.produto_id)}</Td>
                  <Td>{num(aberto)}</Td>
                  <Td>{brl(c.preco_unitario)}</Td>
                  <Td>
                    <Input
                      type="number"
                      min={0}
                      max={aberto}
                      className="h-9 w-24"
                      value={qtd}
                      onChange={(e) =>
                        setQuantidades((q) => ({ ...q, [c.id]: Math.min(aberto, Number(e.target.value)) }))
                      }
                    />
                  </Td>
                  <Td className="font-semibold">{brl(qtd * Number(c.preco_unitario))}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Desconto (R$)">
            <Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(Number(e.target.value))} />
          </Field>
          <Field label="Vencimento (dias)">
            <Input
              type="number"
              min={0}
              value={vencimentoDias}
              onChange={(e) => setVencimentoDias(Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Valor final do acerto</p>
            <p className="num-xl text-primary">{brl(valorFinal)}</p>
          </div>
          <Button onClick={() => gerarAcerto.mutate()} disabled={gerarAcerto.isPending} size="lg">
            {gerarAcerto.isPending ? "Gerando..." : "Gerar acerto e conta a receber"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
