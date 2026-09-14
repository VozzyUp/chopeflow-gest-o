import type { FichaPedido } from "@/components/ficha-pedido";
import type { Chopeira, Cilindro, Cliente, Movimentacao, MovimentacaoItem, Produto } from "@/lib/data";
import { brl, dataBr, dataHoraBr, num } from "@/lib/format";
import { movNaturezaLabel, movTipoLabel } from "@/lib/labels";

/**
 * Monta a ficha e o texto de um romaneio já gravado, para reimprimir a OS ou
 * reenviar pelo WhatsApp a partir do histórico.
 */
export type DadosRomaneio = {
  mov: Movimentacao;
  itens: MovimentacaoItem[];
  cliente: Cliente | undefined;
  produtos: Produto[] | undefined;
  chopeiras: Chopeira[] | undefined;
  cilindros: Cilindro[] | undefined;
  empresaNome?: string | undefined;
};

const rotuloProduto = (produtos: Produto[] | undefined, id: string | null) =>
  produtos?.find((p) => p.id === id)?.nome ?? "Chopp";

export function equipamentosRomaneio(d: DadosRomaneio): string[] {
  const nomeChopeira = (id: string | null) => d.chopeiras?.find((c) => c.id === id)?.codigo ?? "—";
  const nomeCilindro = (id: string | null) => d.cilindros?.find((c) => c.id === id)?.codigo ?? "—";
  return d.itens.flatMap((i) => {
    if (i.categoria === "CHOPEIRA_SAIDA") return [`Chopeira ${nomeChopeira(i.chopeira_id)} (entregue)`];
    if (i.categoria === "CHOPEIRA_RETORNO") return [`Chopeira ${nomeChopeira(i.chopeira_id)} (recolhida)`];
    if (i.categoria === "CILINDRO_SAIDA") return [`Cilindro ${nomeCilindro(i.cilindro_id)} (entregue)`];
    if (i.categoria === "CILINDRO_RETORNO") return [`Cilindro ${nomeCilindro(i.cilindro_id)} (recolhido)`];
    return [];
  });
}

/** Equipamentos entregues nesta visita, com série e valor de reposição. */
function equipamentosFicha(d: DadosRomaneio) {
  return d.itens.flatMap((i) => {
    if (i.categoria === "CHOPEIRA_SAIDA") {
      const c = d.chopeiras?.find((x) => x.id === i.chopeira_id);
      return [
        {
          quantidade: 1,
          nome: `Chopeira ${c?.codigo ?? "—"}${c?.marca_modelo ? ` · ${c.marca_modelo}` : ""}`,
          serie: c?.numero_serie ?? null,
          valor: c ? Number(c.valor_equipamento) : null,
        },
      ];
    }
    if (i.categoria === "CILINDRO_SAIDA") {
      const c = d.cilindros?.find((x) => x.id === i.cilindro_id);
      return [
        {
          quantidade: 1,
          nome: `Cilindro ${c?.codigo ?? "—"}${c ? ` · ${c.tipo}` : ""}`,
          serie: null,
          valor: null,
        },
      ];
    }
    return [];
  });
}

export function fichaDeMovimentacao(d: DadosRomaneio): FichaPedido {
  const { mov } = d;
  const saidas = d.itens.filter((i) => i.categoria === "BARRIL_CHEIO");
  const retornos = d.itens.filter((i) => i.categoria === "BARRIL_VAZIO");
  const equipRetorno = d.itens.flatMap((i) => {
    if (i.categoria === "CHOPEIRA_RETORNO")
      return [{ quantidade: 1, item: `Chopeira ${d.chopeiras?.find((c) => c.id === i.chopeira_id)?.codigo ?? "—"}` }];
    if (i.categoria === "CILINDRO_RETORNO")
      return [{ quantidade: 1, item: `Cilindro ${d.cilindros?.find((c) => c.id === i.cilindro_id)?.codigo ?? "—"}` }];
    return [];
  });
  const semCobranca = mov.natureza === "CONSIGNACAO" || mov.natureza === "COMODATO";
  return {
    numero: mov.numero,
    tipoLabel: movTipoLabel[mov.tipo] ?? mov.tipo,
    natureza: mov.natureza,
    naturezaLabel: movNaturezaLabel[mov.natureza] ?? mov.natureza,
    data: mov.data ?? null,
    cliente: d.cliente?.nome ?? "—",
    documento: d.cliente?.documento ?? null,
    telefone: d.cliente?.telefone ?? null,
    endereco: mov.endereco_entrega ?? d.cliente?.endereco ?? "",
    complemento: mov.complemento_entrega ?? null,
    entregador: mov.responsavel ?? null,
    dataEntrega: mov.data_entrega_prevista ?? null,
    dataRetirada: mov.data_retirada_prevista ?? null,
    mostrarSaida: saidas.length > 0 || mov.tipo === "ENTREGA" || mov.tipo === "VENDA_AVULSA" || mov.tipo === "TROCA",
    mostrarRetorno:
      retornos.length > 0 ||
      equipRetorno.length > 0 ||
      mov.tipo === "COLETA" ||
      mov.tipo === "DEVOLUCAO" ||
      mov.tipo === "TROCA",
    saidas: saidas.map((i) => {
      const p = d.produtos?.find((x) => x.id === i.produto_id);
      return {
        quantidade: Number(i.quantidade),
        produto: rotuloProduto(d.produtos, i.produto_id),
        detalhe: `Barril ${num(p?.volume_litros ?? 0)} L`,
        precoUnitario: semCobranca ? null : Number(i.preco_unitario),
      };
    }),
    equipamentos: equipamentosFicha(d),
    retornos: [
      ...retornos.map((i) => ({
        quantidade: Number(i.quantidade),
        item: `${rotuloProduto(d.produtos, i.produto_id)} — barril vazio`,
      })),
      ...equipRetorno,
    ],
    valorTotal: Number(mov.valor_total ?? 0),
    informacoes: mov.observacao ?? null,
  };
}

export function textoRomaneio(d: DadosRomaneio): string {
  const { mov } = d;
  const linhas: string[] = [];
  linhas.push(`*${d.empresaNome ?? "V-Chopp"} — Romaneio #${mov.numero}*`);
  linhas.push(`Cliente: ${d.cliente?.nome ?? "—"}`);
  linhas.push(`Data: ${dataHoraBr(mov.data)}`);
  linhas.push(`Operação: ${movTipoLabel[mov.tipo] ?? mov.tipo} · ${movNaturezaLabel[mov.natureza] ?? mov.natureza}`);
  const endereco = mov.endereco_entrega ?? d.cliente?.endereco ?? "";
  if (endereco) {
    linhas.push(`Entrega em: ${endereco}${mov.complemento_entrega ? ` — ${mov.complemento_entrega}` : ""}`);
  }
  if (mov.data_entrega_prevista) linhas.push(`Data da entrega: ${dataBr(mov.data_entrega_prevista)}`);
  if (mov.data_retirada_prevista) linhas.push(`Data da retirada: ${dataBr(mov.data_retirada_prevista)}`);

  const saidas = d.itens.filter((i) => i.categoria === "BARRIL_CHEIO");
  const retornos = d.itens.filter((i) => i.categoria === "BARRIL_VAZIO");
  if (saidas.length) {
    linhas.push("");
    linhas.push("*Saída (barris cheios)*");
    for (const i of saidas) {
      const p = d.produtos?.find((x) => x.id === i.produto_id);
      linhas.push(`- ${num(i.quantidade)}x ${rotuloProduto(d.produtos, i.produto_id)} ${num(p?.volume_litros ?? 0)}L`);
    }
  }
  if (retornos.length) {
    linhas.push("");
    linhas.push("*Retorno (barris vazios)*");
    for (const i of retornos) {
      linhas.push(`- ${num(i.quantidade)}x ${rotuloProduto(d.produtos, i.produto_id)}`);
    }
  }
  for (const eq of equipamentosRomaneio(d)) linhas.push(eq);
  if (Number(mov.valor_total ?? 0) > 0) linhas.push(`\n*Total: ${brl(mov.valor_total)}*`);
  else linhas.push("\nConsignação: valor cobrado somente no acerto.");
  if (mov.recebido_por) linhas.push(`Recebido por: ${mov.recebido_por}`);
  return linhas.join("\n");
}

/** Link do WhatsApp já com o texto do romaneio (abre a conversa do cliente). */
export function whatsappRomaneio(telefone: string | null | undefined, texto: string) {
  const fone = (telefone ?? "").replace(/\D/g, "");
  const numeroFone = fone.length >= 10 ? `55${fone.replace(/^55/, "")}` : "";
  return `https://wa.me/${numeroFone}?text=${encodeURIComponent(texto)}`;
}
