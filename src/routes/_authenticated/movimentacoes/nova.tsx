import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { FichaPedidoPrint, type FichaPedido } from "@/components/ficha-pedido";
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
import {
  useBarris,
  useChopeiras,
  useCilindros,
  useClientes,
  useContas,
  useEmpresa,
  useProdutos,
} from "@/lib/data";
import { brl, dataBr, dataHoraBr, num } from "@/lib/format";
import { clienteStatusLabel, movNaturezaLabel, movTipoLabel } from "@/lib/labels";
import { anexarFotoMovimentacao, registrarMovimentacao, type LinhaProduto } from "@/lib/movimentacao";

export const Route = createFileRoute("/_authenticated/movimentacoes/nova")({
  head: () => ({
    meta: [
      { title: "Nova movimentação — ChopeControl" },
      { name: "description", content: "Romaneio rápido de entrega e coleta de barris, chopeiras e cilindros." },
      { property: "og:title", content: "Nova movimentação — ChopeControl" },
      {
        property: "og:description",
        content: "Romaneio de entrega/coleta em poucos toques, com ficha imprimível, foto da entrega e envio no WhatsApp.",
      },
    ],
  }),
  component: NovaMovimentacaoPage,
});

type Linha = { produto_id: string; quantidade: number; preco_unitario: number };

/** Define quais blocos do romaneio fazem sentido para cada tipo de movimentação. */
function blocosDoTipo(tipo: string): { saida: boolean; retorno: boolean } {
  switch (tipo) {
    case "ENTREGA":
    case "VENDA_AVULSA":
    case "PERDA":
      return { saida: true, retorno: false };
    case "COLETA":
    case "DEVOLUCAO":
      return { saida: false, retorno: true };
    default:
      return { saida: true, retorno: true };
  }
}

function NovaMovimentacaoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: clientes } = useClientes();
  const { data: produtos } = useProdutos();
  const { data: barris } = useBarris();
  const { data: chopeiras } = useChopeiras();
  const { data: cilindros } = useCilindros();
  const { data: contas } = useContas();
  const { data: empresa } = useEmpresa();

  const [clienteId, setClienteId] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [natureza, setNatureza] = useState("CONSIGNACAO");
  const [tipo, setTipo] = useState("ENTREGA");
  const [responsavel, setResponsavel] = useState("");
  const [recebidoPor, setRecebidoPor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [outroEndereco, setOutroEndereco] = useState(false);
  const [enderecoEntrega, setEnderecoEntrega] = useState("");
  const [complementoEntrega, setComplementoEntrega] = useState("");
  const [dataEntrega, setDataEntrega] = useState(new Date().toISOString().slice(0, 10));
  const [dataRetirada, setDataRetirada] = useState("");
  const [saidas, setSaidas] = useState<Linha[]>([]);
  const [retornos, setRetornos] = useState<Linha[]>([]);
  const [chopeiraSaida, setChopeiraSaida] = useState("");
  const [chopeiraRetorno, setChopeiraRetorno] = useState("");
  const [cilindroSaida, setCilindroSaida] = useState("");
  const [cilindroRetorno, setCilindroRetorno] = useState("");
  const [vencimentoDias, setVencimentoDias] = useState(7);
  const [confirmarBloqueio, setConfirmarBloqueio] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const [comprovante, setComprovante] = useState<string | null>(null);
  const [numeroRomaneio, setNumeroRomaneio] = useState<number | null>(null);

  const blocos = blocosDoTipo(tipo);
  const cliente = clientes?.find((c) => c.id === clienteId);
  const emAberto = (contas ?? [])
    .filter((c) => c.cliente_id === clienteId && c.status !== "PAGO")
    .reduce((s, c) => s + Number(c.saldo), 0);

  const sugestoes = useMemo(() => {
    const t = buscaCliente.trim().toLowerCase();
    if (!t || cliente) return [];
    return (clientes ?? [])
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(t) ||
          (c.documento ?? "").toLowerCase().includes(t) ||
          (c.telefone ?? "").toLowerCase().includes(t),
      )
      .slice(0, 8);
  }, [clientes, buscaCliente, cliente]);

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
  const enderecoUsado = (outroEndereco ? enderecoEntrega : cliente?.endereco) ?? "";

  const equipamentosTexto = [
    chopeiraSaida ? `Chopeira ${chopeiras?.find((c) => c.id === chopeiraSaida)?.codigo} (entregue)` : null,
    chopeiraRetorno ? `Chopeira ${chopeiras?.find((c) => c.id === chopeiraRetorno)?.codigo} (recolhida)` : null,
    cilindroSaida ? `Cilindro ${cilindros?.find((c) => c.id === cilindroSaida)?.codigo} (entregue)` : null,
    cilindroRetorno ? `Cilindro ${cilindros?.find((c) => c.id === cilindroRetorno)?.codigo} (recolhido)` : null,
  ].filter((x): x is string => Boolean(x));

  const ficha: FichaPedido = {
    numero: numeroRomaneio ?? 0,
    cliente: cliente?.nome ?? "",
    documento: cliente?.documento ?? null,
    telefone: cliente?.telefone ?? null,
    endereco: enderecoUsado,
    complemento: outroEndereco ? complementoEntrega : null,
    dataEntrega: dataEntrega || null,
    dataRetirada: dataRetirada || null,
    servicoEntrega: `${movTipoLabel[tipo] ?? tipo} · ${movNaturezaLabel[natureza] ?? natureza}${
      responsavel ? ` · Entregador: ${responsavel}` : ""
    }`,
    produtos: [
      ...saidas.map((l) => {
        const p = produtos?.find((x) => x.id === l.produto_id);
        return {
          descricao: `${p?.nome ?? "Chope"} ${num(p?.volume_litros ?? 0)}L (saída)`,
          quantidade: l.quantidade,
          preco: natureza === "CONSIGNACAO" ? 0 : l.preco_unitario,
        };
      }),
      ...retornos.map((l) => {
        const p = produtos?.find((x) => x.id === l.produto_id);
        return { descricao: `${p?.nome ?? "Chope"} — barril vazio (retorno)`, quantidade: l.quantidade, preco: 0 };
      }),
    ],
    equipamentos: equipamentosTexto,
    valorTotal,
    informacoes: observacao || null,
  };

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
      const mov = await registrarMovimentacao({
        tipo,
        natureza,
        cliente_id: clienteId,
        responsavel,
        recebido_por: recebidoPor,
        observacao,
        saidaCheios: (blocos.saida ? saidas : []) as LinhaProduto[],
        retornoVazios: (blocos.retorno ? retornos : []) as LinhaProduto[],
        chopeiraSaida: blocos.saida ? chopeiraSaida || null : null,
        chopeiraRetorno: blocos.retorno ? chopeiraRetorno || null : null,
        cilindroSaida: blocos.saida ? cilindroSaida || null : null,
        cilindroRetorno: blocos.retorno ? cilindroRetorno || null : null,
        gerarContaReceber: natureza === "VENDA" || natureza === "LOCACAO",
        vencimentoDias,
        endereco_entrega: outroEndereco ? enderecoEntrega : null,
        complemento_entrega: outroEndereco ? complementoEntrega : null,
        data_entrega_prevista: dataEntrega || null,
        data_retirada_prevista: dataRetirada || null,
      });
      for (const f of fotos) {
        try {
          await anexarFotoMovimentacao(mov.id, f);
        } catch {
          toast.error("Uma foto não pôde ser enviada");
        }
      }
      return mov;
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
    linhas.push(`*${empresa?.nome ?? "ChopeControl"} — Romaneio #${numero}*`);
    linhas.push(`Cliente: ${cliente?.nome ?? "—"}`);
    linhas.push(`Data: ${dataHoraBr(new Date())}`);
    linhas.push(`Operação: ${movTipoLabel[tipo] ?? tipo} · ${movNaturezaLabel[natureza] ?? natureza}`);
    if (enderecoUsado) linhas.push(`Entrega em: ${enderecoUsado}${complementoEntrega ? ` — ${complementoEntrega}` : ""}`);
    if (dataEntrega) linhas.push(`Data da entrega: ${dataBr(dataEntrega)}`);
    if (dataRetirada) linhas.push(`Data da retirada: ${dataBr(dataRetirada)}`);
    if (blocos.saida && saidas.length) {
      linhas.push("");
      linhas.push("*Saída (barris cheios)*");
      for (const l of saidas) {
        const p = produtos?.find((x) => x.id === l.produto_id);
        linhas.push(`- ${num(l.quantidade)}x ${p?.nome ?? ""} ${num(p?.volume_litros ?? 0)}L`);
      }
    }
    if (blocos.retorno && retornos.length) {
      linhas.push("");
      linhas.push("*Retorno (barris vazios)*");
      for (const l of retornos) {
        const p = produtos?.find((x) => x.id === l.produto_id);
        linhas.push(`- ${num(l.quantidade)}x ${p?.nome ?? ""}`);
      }
    }
    for (const eq of equipamentosTexto) linhas.push(eq);
    if (valorTotal > 0) linhas.push(`\n*Total: ${brl(valorTotal)}*`);
    else linhas.push("\nConsignação: valor cobrado somente no acerto.");
    if (recebidoPor) linhas.push(`Recebido por: ${recebidoPor}`);
    return linhas.join("\n");
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) {
      toast.error("Escolha o cliente");
      return;
    }
    const temItem =
      (blocos.saida && (saidas.length || chopeiraSaida || cilindroSaida)) ||
      (blocos.retorno && (retornos.length || chopeiraRetorno || cilindroRetorno));
    if (!temItem) {
      toast.error("Inclua ao menos um item");
      return;
    }
    if (precisaConfirmar && !confirmarBloqueio) {
      toast.error("Cliente bloqueado ou acima do limite — confirme a liberação do administrador");
      return;
    }
    salvar.mutate();
  }

  const whatsappHref = () => {
    const fone = (cliente?.telefone ?? "").replace(/\D/g, "");
    const numeroFone = fone.length >= 10 ? `55${fone.replace(/^55/, "")}` : "";
    return `https://wa.me/${numeroFone}?text=${encodeURIComponent(comprovante ?? "")}`;
  };

  return (
    <>
      <PageHead title="Nova movimentação" subtitle="Romaneio de entrega e coleta" />

      <form onSubmit={enviar} className="space-y-4">
        <Card>
          <CardTitle>1. Cliente e operação</CardTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Cliente" className="sm:col-span-2">
              {cliente ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
                  <div>
                    <p className="font-semibold">{cliente.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {cliente.telefone ?? "sem telefone"} · {cliente.endereco ?? "sem endereço"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setClienteId("");
                      setBuscaCliente("");
                    }}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    placeholder="Buscar por nome, CPF/CNPJ ou telefone"
                    autoComplete="off"
                  />
                  {sugestoes.length > 0 ? (
                    <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-border">
                      {sugestoes.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setClienteId(c.id);
                            setBuscaCliente(c.nome);
                          }}
                          className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-secondary"
                        >
                          <span>
                            <span className="font-semibold">{c.nome}</span>
                            <span className="block text-xs text-muted-foreground">
                              {c.telefone ?? c.documento ?? "—"}
                            </span>
                          </span>
                          <Badge tone={c.status === "ativo" ? "success" : "danger"}>
                            {clienteStatusLabel[c.status]}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  ) : buscaCliente.trim() ? (
                    <p className="mt-2 text-xs text-muted-foreground">Nenhum cliente encontrado.</p>
                  ) : null}
                </>
              )}
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
            <Field label="Data da entrega">
              <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
            </Field>
            <Field label="Data da retirada">
              <Input type="date" value={dataRetirada} onChange={(e) => setDataRetirada(e.target.value)} />
            </Field>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={outroEndereco} onChange={(e) => setOutroEndereco(e.target.checked)} />
            Entregar em outro endereço (diferente do cadastro)
          </label>

          {outroEndereco ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Endereço / bairro / nº" className="sm:col-span-2">
                <Input
                  value={enderecoEntrega}
                  onChange={(e) => setEnderecoEntrega(e.target.value)}
                  placeholder="Rua, nº, bairro, cidade"
                />
              </Field>
              <Field label="Complemento" className="sm:col-span-2">
                <Input
                  value={complementoEntrega}
                  onChange={(e) => setComplementoEntrega(e.target.value)}
                  placeholder="Salão, bloco, referência"
                />
              </Field>
            </div>
          ) : cliente?.endereco ? (
            <p className="mt-2 text-xs text-muted-foreground">Entrega no endereço do cadastro: {cliente.endereco}</p>
          ) : null}

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

        {blocos.saida ? (
          <Card>
            <CardTitle>Saída — barris cheios</CardTitle>
            <div className="mt-3 space-y-2">
              {saidas.map((l, i) => {
                const disp = estoqueCheio.get(l.produto_id) ?? 0;
                return (
                  <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                    <Select
                      value={l.produto_id}
                      onChange={(e) => atualizarLinha(setSaidas, i, "produto_id", e.target.value)}
                    >
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
        ) : null}

        {blocos.retorno ? (
          <Card>
            <CardTitle>Retorno — barris vazios</CardTitle>
            <div className="mt-3 space-y-2">
              {retornos.map((l, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
                  <Select
                    value={l.produto_id}
                    onChange={(e) => atualizarLinha(setRetornos, i, "produto_id", e.target.value)}
                  >
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
        ) : null}

        <Card>
          <CardTitle>Equipamentos</CardTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {blocos.saida ? (
              <>
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
              </>
            ) : null}
            {blocos.retorno ? (
              <>
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
              </>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Foto do produto entregue / instalado</CardTitle>
          <div className="mt-3 space-y-3">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => {
                const arquivos = Array.from(e.target.files ?? []);
                if (arquivos.length) setFotos((f) => [...f, ...arquivos]);
                e.target.value = "";
              }}
              className="block w-full rounded-lg border border-border bg-secondary p-3 text-sm"
            />
            {fotos.length ? (
              <div className="flex flex-wrap gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative">
                    <img
                      src={URL.createObjectURL(f)}
                      alt={`Foto ${i + 1} da entrega`}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFotos((fs) => fs.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-xs font-bold text-destructive-foreground"
                      aria-label="Remover foto"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Toque para abrir a câmera e registrar a instalação. As fotos ficam anexadas ao romaneio.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Fechamento</CardTitle>
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
            href={whatsappHref()}
            target="_blank"
            rel="noreferrer"
          >
            Compartilhar no WhatsApp
          </a>
          <Button onClick={() => window.print()}>Imprimir ficha (PDF)</Button>
        </div>
      </Modal>

      {numeroRomaneio !== null ? <FichaPedidoPrint empresa={empresa ?? null} pedido={ficha} /> : null}
    </>
  );
}
