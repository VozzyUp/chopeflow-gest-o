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
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui/primitives";
import { supabase } from "@/integrations/supabase/client";
import { nomeCliente, useClientes, useLocacoes, useProdutos, type Locacao } from "@/lib/data";
import { brl, dataBr, dataHoraBr } from "@/lib/format";
import { locacaoStatusLabel, statusTone } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos e locações — ChopeControl" },
      { name: "description", content: "Calendário de eventos, orçamentos, entrega, coleta e controle de caução." },
      { property: "og:title", content: "Eventos e locações — ChopeControl" },
      { property: "og:description", content: "Do orçamento ao acerto final do evento, com checklist de entrega e coleta." },
    ],
  }),
  component: EventosPage,
});

const vazio = {
  cliente_id: "",
  data_evento: "",
  endereco_evento: "",
  valor_locacao: 0,
  valor_caucao: 0,
  taxa_entrega: 0,
  forma_pagamento: "PIX",
  status: "ORCAMENTO",
  observacoes: "",
};

function EventosPage() {
  const { data: locacoes } = useLocacoes();
  const { data: clientes } = useClientes();
  const { data: produtos } = useProdutos();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>(vazio);
  const [mesRef, setMesRef] = useState(() => new Date());

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("locacoes_eventos").insert({
        cliente_id: String(form["cliente_id"]),
        data_evento: new Date(String(form["data_evento"])).toISOString(),
        endereco_evento: String(form["endereco_evento"] ?? ""),
        valor_locacao: Number(form["valor_locacao"]) || 0,
        valor_caucao: Number(form["valor_caucao"]) || 0,
        taxa_entrega: Number(form["taxa_entrega"]) || 0,
        forma_pagamento: String(form["forma_pagamento"] ?? ""),
        status: String(form["status"]) as "ORCAMENTO",
        observacoes: String(form["observacoes"] ?? ""),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento registrado");
      queryClient.invalidateQueries({ queryKey: ["locacoes"] });
      setModal(false);
      setForm(vazio);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mudarStatus = useMutation({
    mutationFn: async ({ loc, status }: { loc: Locacao; status: string }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "ENTREGUE") patch["data_entrega"] = new Date().toISOString();
      if (status === "COLETADO") patch["data_coleta"] = new Date().toISOString();
      const { error } = await supabase.from("locacoes_eventos").update(patch as never).eq("id", loc.id);
      if (error) throw error;

      // Ao finalizar: cobra barris consumidos + locação e devolve a caução
      if (status === "FINALIZADO") {
        const { data: itens } = await supabase.from("locacao_itens").select("*").eq("locacao_id", loc.id);
        const consumo = (itens ?? []).reduce(
          (s, i) => s + Number(i.quantidade_consumida || i.quantidade) * Number(i.preco_unitario),
          0,
        );
        const total = consumo + Number(loc.valor_locacao) + Number(loc.taxa_entrega);
        const { error: contaErr } = await supabase.from("contas_receber").insert({
          origem: "locacao",
          cliente_id: loc.cliente_id,
          locacao_id: loc.id,
          descricao: `Acerto final do evento de ${dataBr(loc.data_evento)}`,
          valor_total: total,
          vencimento: new Date().toISOString().slice(0, 10),
        });
        if (contaErr) throw contaErr;
        const { error: caucaoErr } = await supabase
          .from("locacoes_eventos")
          .update({ caucao_devolvida: true })
          .eq("id", loc.id);
        if (caucaoErr) throw caucaoErr;
      }
    },
    onSuccess: () => {
      toast.success("Status do evento atualizado");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // calendário
  const primeiro = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1);
  const diasNoMes = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).getDate();
  const offset = primeiro.getDay();
  const celulas: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  function eventosDoDia(dia: number) {
    return (locacoes ?? []).filter((l) => {
      const d = new Date(l.data_evento);
      return d.getFullYear() === mesRef.getFullYear() && d.getMonth() === mesRef.getMonth() && d.getDate() === dia;
    });
  }

  return (
    <>
      <PageHead
        title="Eventos e locações"
        subtitle="Orçamentos, entregas, coletas e caução"
        actions={<Button onClick={() => setModal(true)}>+ Novo orçamento</Button>}
      />

      <Card className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>
            {mesRef.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() - 1, 1))}
            >
              ◀
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 1))}
            >
              ▶
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <div key={i} className="py-1 font-semibold">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {celulas.map((dia, i) => (
            <div
              key={i}
              className={
                "min-h-16 rounded-lg border border-border/60 p-1 text-xs " + (dia ? "bg-background/40" : "opacity-0")
              }
            >
              {dia ? (
                <>
                  <div className="mb-1 font-semibold text-muted-foreground">{dia}</div>
                  {eventosDoDia(dia).map((l) => (
                    <div
                      key={l.id}
                      className={
                        "mb-1 truncate rounded px-1 py-0.5 font-semibold " +
                        (l.status === "CANCELADO"
                          ? "bg-destructive/20 text-destructive"
                          : l.status === "FINALIZADO"
                            ? "bg-success/20 text-success"
                            : l.status === "ORCAMENTO"
                              ? "bg-warning/20 text-warning"
                              : "bg-primary/20 text-primary")
                      }
                      title={nomeCliente(clientes, l.cliente_id)}
                    >
                      {nomeCliente(clientes, l.cliente_id)}
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Todos os eventos</CardTitle>
        {(locacoes ?? []).length === 0 ? (
          <EmptyState>Nenhum evento cadastrado.</EmptyState>
        ) : (
          <Table className="mt-3">
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Data do evento</Th>
                <Th className="hidden md:table-cell">Local</Th>
                <Th>Locação</Th>
                <Th className="hidden sm:table-cell">Caução</Th>
                <Th>Status</Th>
                <Th>Ação</Th>
              </tr>
            </thead>
            <tbody>
              {(locacoes ?? []).map((l) => (
                <tr key={l.id}>
                  <Td className="font-semibold">{nomeCliente(clientes, l.cliente_id)}</Td>
                  <Td>{dataHoraBr(l.data_evento)}</Td>
                  <Td className="hidden md:table-cell text-muted-foreground">{l.endereco_evento}</Td>
                  <Td>{brl(Number(l.valor_locacao) + Number(l.taxa_entrega))}</Td>
                  <Td className="hidden sm:table-cell">
                    {brl(l.valor_caucao)}
                    <div className="text-xs text-muted-foreground">
                      {l.caucao_devolvida ? "devolvida" : "retida"}
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={statusTone(l.status)}>{locacaoStatusLabel[l.status]}</Badge>
                  </Td>
                  <Td>
                    <Select
                      value=""
                      className="h-9 w-36"
                      onChange={(e) => e.target.value && mudarStatus.mutate({ loc: l, status: e.target.value })}
                    >
                      <option value="">Alterar...</option>
                      {Object.entries(locacaoStatusLabel).map(([k, v]) => (
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
        <p className="mt-3 text-xs text-muted-foreground">
          Ao marcar <strong>Finalizado</strong>, o sistema cobra os barris consumidos + locação e devolve a caução
          automaticamente, gerando a conta a receber do acerto final.
        </p>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo orçamento de evento" wide>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
        >
          <Field label="Cliente">
            <Select value={String(form["cliente_id"])} onChange={set("cliente_id")} required>
              <option value="">Selecione...</option>
              {(clientes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data e hora do evento">
            <Input type="datetime-local" value={String(form["data_evento"])} onChange={set("data_evento")} required />
          </Field>
          <Field label="Endereço do evento" className="sm:col-span-2">
            <Input value={String(form["endereco_evento"] ?? "")} onChange={set("endereco_evento")} />
          </Field>
          <Field label="Valor da locação (R$)">
            <Input type="number" step="0.01" value={String(form["valor_locacao"])} onChange={set("valor_locacao")} />
          </Field>
          <Field label="Caução (R$)">
            <Input type="number" step="0.01" value={String(form["valor_caucao"])} onChange={set("valor_caucao")} />
          </Field>
          <Field label="Taxa de entrega (R$)">
            <Input type="number" step="0.01" value={String(form["taxa_entrega"])} onChange={set("taxa_entrega")} />
          </Field>
          <Field label="Forma de pagamento">
            <Select value={String(form["forma_pagamento"])} onChange={set("forma_pagamento")}>
              <option value="PIX">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
              <option value="boleto">Boleto</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={String(form["status"])} onChange={set("status")}>
              {Object.entries(locacaoStatusLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observações / checklist" className="sm:col-span-2">
            <Textarea
              value={String(form["observacoes"] ?? "")}
              onChange={set("observacoes")}
              placeholder={`Chopeira, barris (${(produtos ?? []).map((p) => p.nome).join(", ")}), gelo, CO2, torneiras...`}
            />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
