import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  CardTitle,
  Field,
  Input,
  Modal,
  PageHead,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { useBarris, useChopeiras, useCilindros, useClientes, useContas, useProdutos } from "@/lib/data";
import { brl, dataHoraBr, num } from "@/lib/format";
import { clienteStatusLabel } from "@/lib/labels";
import { registrarMovimentacao, type LinhaProduto } from "@/lib/movimentacao";

export const Route = createFileRoute("/_authenticated/movimentacoes/nova")({
  head: () => ({
    meta: [
      { title: "Nova movimentação — ChopeControl" },
      { name: "description", content: "Romaneio rápido de entrega e coleta de barris, chopeiras e cilindros." },
      { property: "og:title", content: "Nova movimentação — ChopeControl" },
      {
        property: "og:description",
        content: "Romaneio de entrega/coleta em poucos toques, com comprovante imprimível e texto de WhatsApp.",
      },
    ],
  }),
  component: NovaMovimentacaoPage,
});

type Linha = { produto_id: string; quantidade: number; preco_unitario: number };

function NovaMovimentacaoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: clientes } = useClientes();
  const { data: produtos } = useProdutos();
  const { data: barris } = useBarris();
  const { data: chopeiras } = useChopeiras();
  const { data: cilindros } = useCilindros();
  const { data: contas } = useContas();

  const [clienteId, setClienteId] = useState("");
  const [natureza, setNatureza] = useState("CONSIGNACAO");
  const [tipo, setTipo] = useState("ENTREGA");
  const [responsavel, setResponsavel] = useState("");
  const [recebidoPor, setRecebidoPor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saidas, setSaidas] = useState<Linha[]>([]);
  const [retornos, setRetornos] = useState<Linha[]>([]);
  const [chopeiraSaida, setChopeiraSaida] = useState("");
  const [chopeiraRetorno, setChopeiraRetorno] = useState("");
  const [cilindroSaida, setCilindroSaida] = useState("");
  const [cilindroRetorno, setCilindroRetorno] = useState("");
  const [vencimentoDias, setVencimentoDias] = useState(7);
  const [confirmarBloqueio, setConfirmarBloqueio] = useState(false);
  const [comprovante, setComprovante] = useState<string | null>(null);
  const [numeroRomaneio, setNumeroRomaneio] = useState<number | null>(null);

  const cliente = clientes?.find((c) => c.id === clienteId);
  const emAberto = (contas ?? [])
    .filter((c) => c.cliente_id === clienteId && c.status !== "PAGO")
    .reduce((s, c) => s + Number(c.saldo), 0);

  const estoqueCheio = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of barris ?? []) {
      if (b.status === "CHEIO_ESTOQUE" && b.produto_id) m.set(b.produto_id, (m.get(b.produto_id) ?? 0) + 1);
    }
    return m;
  }, [barris]);

  const valorTotal = natureza === "CONSIGNACAO" ? 0 : saidas.reduce((s, l) => s + l.quantidade * l.preco_unitario, 0);
  const limiteEstourado =
    cliente && Number(cliente.limite_credito) > 0 && emAberto + valorTotal > Number(cliente.limite_credito);
  const bloqueado = cliente?.status === "bloqueado";
  const precisaConfirmar = Boolean(bloqueado || limiteEstourado);

  function addLinha(setter: typeof setSaidas) {
    const p = produtos?.[0];
    if (!p) return;
    setter((l) => [...l, { produto_id: p.id, quantidade: 1, preco_unitario: Number(p.preco_barril) }]);
  }

  function atualizarLinha(setter: typeof setSaidas, i: number, campo: keyof Linha, valor: string) {
    setter((linhas) =>
      linhas.map((l, idx) => {
        if (idx !== i) return l;
        if (campo === "produto_id") {
          const p = produtos?.find((x) => x.id === valor);
          return { ...l, produto_id: valor, preco_unitario: p ? Number(p.preco_barril) : l.preco_unitario };
        }
        return { ...l, [campo]: Number(valor) };
      }),
    );
  }

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        tipo,
        natureza,
        cliente_id: clienteId,
        responsavel,
        recebido_por: recebidoPor,
        observacao,
        saidaCheios: saidas as LinhaProduto[],
        retornoVazios: retornos as LinhaProduto[],
        chopeiraSaida: chopeiraSaida || null,
        chopeiraRetorno: chopeiraRetorno || null,
        cilindroSaida: cilindroSaida || null,
        cilindroRetorno: cilindroRetorno || null,
        gerarContaReceber: natureza === "VENDA" || natureza === "LOCACAO",
        vencimentoDias,
      };
      return registrarMovimentacao(payload);
    },
    onSuccess: (mov) => {
      toast.success(`Romaneio #${mov.numero} registrado`);
      queryClient.invalidateQueries();
      setNumeroRomaneio(mov.numero);
      setComprovante(textoRomaneio(mov.numero));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function textoRomaneio(numero: number) {
    const linhas: string[] = [];
    linhas.push(`*ChopeControl — Romaneio #${numero}*`);
    linhas.push(`Cliente: ${cliente?.nome ?? "—"}`);
    linhas.push(`Data: ${dataHoraBr(new Date())}`);
    linhas.push(`Operação: ${natureza === "CONSIGNACAO" ? "Consignação" : natureza === "VENDA" ? "Venda" : "Locação"}`);
    if (saidas.length) {
      linhas.push("");
      linhas.push("*Saída (barris cheios)*");
      for (const l of saidas) {
        const p = produtos?.find((x) => x.id === l.produto_id);
        linhas.push(`- ${num(l.quantidade)}x ${p?.nome ?? ""} ${num(p?.volume_litros ?? 0)}L`);
      }
    }
    if (retornos.length) {
      linhas.push("");
      linhas.push("*Retorno (barris vazios)*");
      for (const l of retornos) {
        const p = produtos?.find((x) => x.id === l.produto_id);
        linhas.push(`- ${num(l.quantidade)}x ${p?.nome ?? ""}`);
      }
    }
    if (chopeiraSaida) linhas.push(`Chopeira entregue: ${chopeiras?.find((c) => c.id === chopeiraSaida)?.codigo}`);
    if (chopeiraRetorno) linhas.push(`Chopeira recolhida: ${chopeiras?.find((c) => c.id === chopeiraRetorno)?.codigo}`);
    if (cilindroSaida) linhas.push(`Cilindro entregue: ${cilindros?.find((c) => c.id === cilindroSaida)?.codigo}`);
    if (cilindroRetorno) linhas.push(`Cilindro recolhido: ${cilindros?.find((c) => c.id === cilindroRetorno)?.codigo}`);
    if (valorTotal > 0) linhas.push(`\n*Total: ${brl(valorTotal)}*`);
    else linhas.push("\nConsignação: valor cobrado somente no acerto.");
    if (recebidoPor) linhas.push(`Recebido por: ${recebidoPor}`);
    return linhas.join("\n");
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) return toast.error("Escolha o cliente");
    if (!saidas.length && !retornos.length && !chopeiraSaida && !chopeiraRetorno && !cilindroSaida && !cilindroRetorno)
      return toast.error("Inclua ao menos um item");
    if (precisaConfirmar && !confirmarBloqueio) {
      return toast.error("Cliente bloqueado ou acima do limite — confirme a liberação do administrador");
    }
    salvar.mutate();
  }

  return (
    <>
      <PageHead title="Nova movimentação" subtitle="Romaneio de entrega e coleta" />

      <form onSubmit={enviar} className="space-y-4">
        <Card>
          <CardTitle>1. Cliente e operação</CardTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Cliente">
              <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Selecione...</option>
                {(clientes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.status !== "ativo" ? `(${clienteStatusLabel[c.status]})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Natureza">
              <Select value={natureza} onChange={(e) => setNatureza(e.target.value)}>
                <option value="CONSIGNACAO">Consignação</option>
                <option value="VENDA">Venda</option>
                <option value="LOCACAO">Locação</option>
                <option value="COMODATO">Comodato</option>
              </Select>
            </Field>
            <Field label="Tipo de movimentação">
              <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="ENTREGA">Entrega</option>
                <option value="COLETA">Coleta</option>
                <option value="TROCA">Troca</option>
                <option value="VENDA_AVULSA">Venda avulsa</option>
                <option value="DEVOLUCAO">Devolução</option>
              </Select>
            </Field>
            <Field label="Entregador / responsável">
              <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Quem levou" />
            </Field>
          </div>

          {cliente ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={cliente.status === "ativo" ? "success" : "danger"}>
                {clienteStatusLabel[cliente.status]}
              </Badge>
              <span className="text-muted-foreground">
                Em aberto: <strong className="text-foreground">{brl(emAberto)}</strong> · Limite:{" "}
                <strong className="text-foreground">{brl(cliente.limite_credito)}</strong>
              </span>
            </div>
          ) : null}

          {precisaConfirmar ? (
            <label className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmarBloqueio}
                onChange={(e) => setConfirmarBloqueio(e.target.checked)}
              />
              <span>
                {bloqueado ? "Cliente bloqueado por inadimplência. " : "Operação acima do limite de crédito. "}
                Confirmo a liberação com autorização do administrador.
              </span>
            </label>
          ) : null}
        </Card>

        <Card>
          <CardTitle>2. Saída — barris cheios</CardTitle>
          <div className="mt-3 space-y-2">
            {saidas.map((l, i) => {
              const disp = estoqueCheio.get(l.produto_id) ?? 0;
              return (
                <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                  <Select value={l.produto_id} onChange={(e) => atualizarLinha(setSaidas, i, "produto_id", e.target.value)}>
                    {(produtos ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} {num(p.volume_litros)}L
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={l.quantidade}
                    onChange={(e) => atualizarLinha(setSaidas, i, "quantidade", e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={l.preco_unitario}
                    onChange={(e) => atualizarLinha(setSaidas, i, "preco_unitario", e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <Badge tone={l.quantidade > disp ? "danger" : "neutral"}>{disp} disp.</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSaidas((s) => s.filter((_, idx) => idx !== i))}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => addLinha(setSaidas)}>
              + Adicionar barril cheio
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>3. Retorno — barris vazios</CardTitle>
          <div className="mt-3 space-y-2">
            {retornos.map((l, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
                <Select value={l.produto_id} onChange={(e) => atualizarLinha(setRetornos, i, "produto_id", e.target.value)}>
                  {(produtos ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {num(p.volume_litros)}L
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={l.quantidade}
                  onChange={(e) => atualizarLinha(setRetornos, i, "quantidade", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRetornos((s) => s.filter((_, idx) => idx !== i))}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => addLinha(setRetornos)}>
              + Adicionar barril vazio coletado
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>4. Equipamentos</CardTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Chopeira entregue">
              <Select value={chopeiraSaida} onChange={(e) => setChopeiraSaida(e.target.value)}>
                <option value="">Nenhuma</option>
                {(chopeiras ?? [])
                  .filter((c) => c.status === "DISPONIVEL")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.marca_modelo}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Chopeira recolhida">
              <Select value={chopeiraRetorno} onChange={(e) => setChopeiraRetorno(e.target.value)}>
                <option value="">Nenhuma</option>
                {(chopeiras ?? [])
                  .filter((c) => c.cliente_id === clienteId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.marca_modelo}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Cilindro entregue">
              <Select value={cilindroSaida} onChange={(e) => setCilindroSaida(e.target.value)}>
                <option value="">Nenhum</option>
                {(cilindros ?? [])
                  .filter((c) => c.status === "DISPONIVEL")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.tipo} {num(c.capacidade_kg)}kg
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Cilindro recolhido">
              <Select value={cilindroRetorno} onChange={(e) => setCilindroRetorno(e.target.value)}>
                <option value="">Nenhum</option>
                {(cilindros ?? [])
                  .filter((c) => c.cliente_id === clienteId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.tipo}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>5. Fechamento</CardTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Recebido por (nome de quem assinou)">
              <Input value={recebidoPor} onChange={(e) => setRecebidoPor(e.target.value)} />
            </Field>
            {natureza !== "CONSIGNACAO" ? (
              <Field label="Vencimento (dias)">
                <Input
                  type="number"
                  min={0}
                  value={vencimentoDias}
                  onChange={(e) => setVencimentoDias(Number(e.target.value))}
                />
              </Field>
            ) : null}
            <Field label="Observação" className="sm:col-span-2">
              <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Valor da operação</p>
              <p className="num-xl text-primary">{brl(valorTotal)}</p>
              {natureza === "CONSIGNACAO" ? (
                <p className="text-xs text-muted-foreground">Consignação: receita apenas no acerto.</p>
              ) : null}
            </div>
            <Button type="submit" size="lg" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar romaneio"}
            </Button>
          </div>
        </Card>
      </form>

      <Modal
        open={comprovante !== null}
        onClose={() => {
          setComprovante(null);
          navigate({ to: "/movimentacoes" });
        }}
        title={`Romaneio #${numeroRomaneio ?? ""}`}
        wide
      >
        <pre className="max-h-80 overflow-auto rounded-lg bg-background/70 p-4 text-sm whitespace-pre-wrap">
          {comprovante}
        </pre>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(comprovante ?? "");
              toast.success("Texto copiado");
            }}
          >
            Copiar texto
          </Button>
          <a
            className="inline-flex h-11 items-center rounded-lg bg-success px-4 text-sm font-semibold text-success-foreground"
            href={`https://wa.me/?text=${encodeURIComponent(comprovante ?? "")}`}
            target="_blank"
            rel="noreferrer"
          >
            Enviar no WhatsApp
          </a>
          <Button onClick={() => window.print()}>Imprimir / PDF</Button>
        </div>
      </Modal>
    </>
  );
}
