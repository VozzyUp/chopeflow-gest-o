import { supabase } from "@/integrations/supabase/client";

export type LinhaProduto = { produto_id: string; quantidade: number; preco_unitario: number };

export type NovaMovimentacaoInput = {
  tipo: string;
  natureza: string;
  /* natureza: VENDA | CONSIGNACAO | LOCACAO | COMODATO | INTERNO */
  cliente_id: string;
  responsavel: string;
  recebido_por: string;
  observacao: string;
  saidaCheios: LinhaProduto[];
  retornoVazios: LinhaProduto[];
  chopeiraSaida: string | null;
  chopeiraRetorno: string | null;
  cilindroSaida: string | null;
  cilindroRetorno: string | null;
  gerarContaReceber: boolean;
  vencimentoDias: number;
};

/**
 * Registra um romaneio de entrega/coleta aplicando as regras de negócio:
 * - entrega reduz o estoque de cheios e aumenta o saldo em poder do cliente;
 * - coleta de vazio reduz o saldo do cliente e joga o barril para higienização;
 * - consignação não gera receita (só o acerto gera);
 * - venda e locação geram conta a receber.
 */
export async function registrarMovimentacao(input: NovaMovimentacaoInput) {
  const valorTotal =
    input.natureza === "CONSIGNACAO"
      ? 0
      : input.saidaCheios.reduce((s, l) => s + l.quantidade * l.preco_unitario, 0);

  const { data: mov, error: movErr } = await supabase
    .from("movimentacoes")
    .insert({
      tipo: input.tipo as "ENTREGA",
      natureza: input.natureza as "CONSIGNACAO",
      cliente_id: input.cliente_id,
      responsavel: input.responsavel || null,
      recebido_por: input.recebido_por || null,
      observacao: input.observacao || null,
      valor_total: valorTotal,
    })
    .select("*")
    .single();
  if (movErr) throw movErr;

  const itens: Record<string, unknown>[] = [];
  for (const l of input.saidaCheios) {
    itens.push({
      movimentacao_id: mov.id,
      categoria: "BARRIL_CHEIO",
      produto_id: l.produto_id,
      quantidade: l.quantidade,
      preco_unitario: l.preco_unitario,
    });
  }
  for (const l of input.retornoVazios) {
    itens.push({
      movimentacao_id: mov.id,
      categoria: "BARRIL_VAZIO",
      produto_id: l.produto_id,
      quantidade: l.quantidade,
      preco_unitario: 0,
    });
  }
  if (input.chopeiraSaida)
    itens.push({ movimentacao_id: mov.id, categoria: "CHOPEIRA_SAIDA", chopeira_id: input.chopeiraSaida, quantidade: 1 });
  if (input.chopeiraRetorno)
    itens.push({
      movimentacao_id: mov.id,
      categoria: "CHOPEIRA_RETORNO",
      chopeira_id: input.chopeiraRetorno,
      quantidade: 1,
    });
  if (input.cilindroSaida)
    itens.push({ movimentacao_id: mov.id, categoria: "CILINDRO_SAIDA", cilindro_id: input.cilindroSaida, quantidade: 1 });
  if (input.cilindroRetorno)
    itens.push({
      movimentacao_id: mov.id,
      categoria: "CILINDRO_RETORNO",
      cilindro_id: input.cilindroRetorno,
      quantidade: 1,
    });

  if (itens.length) {
    const { error } = await supabase.from("movimentacao_itens").insert(itens as never);
    if (error) throw error;
  }

  // ------- barris: saída de cheios -------
  for (const l of input.saidaCheios) {
    const { data: disponiveis, error } = await supabase
      .from("barris")
      .select("id")
      .eq("status", "CHEIO_ESTOQUE")
      .eq("produto_id", l.produto_id)
      .limit(Math.round(l.quantidade));
    if (error) throw error;
    if (disponiveis?.length) {
      const { error: upErr } = await supabase
        .from("barris")
        .update({
          status: "ENTREGUE_CLIENTE",
          cliente_id: input.cliente_id,
          data_ultima_movimentacao: new Date().toISOString(),
        })
        .in(
          "id",
          disponiveis.map((b) => b.id),
        );
      if (upErr) throw upErr;
    }
    await ajustarSaldo(input.cliente_id, l.produto_id, l.quantidade, 0);
  }

  // ------- barris: retorno de vazios -------
  for (const l of input.retornoVazios) {
    const { data: noCliente, error } = await supabase
      .from("barris")
      .select("id, ciclos")
      .eq("cliente_id", input.cliente_id)
      .eq("produto_id", l.produto_id)
      .in("status", ["VAZIO_NO_CLIENTE", "ENTREGUE_CLIENTE"])
      .limit(Math.round(l.quantidade));
    if (error) throw error;
    for (const b of noCliente ?? []) {
      const { error: upErr } = await supabase
        .from("barris")
        .update({
          status: "EM_HIGIENIZACAO",
          cliente_id: null,
          ciclos: (b.ciclos ?? 0) + 1,
          data_ultima_movimentacao: new Date().toISOString(),
        })
        .eq("id", b.id);
      if (upErr) throw upErr;
    }
    await ajustarSaldo(input.cliente_id, l.produto_id, -l.quantidade, 0);
  }

  // ------- chopeiras -------
  if (input.chopeiraSaida) {
    const { error } = await supabase
      .from("chopeiras")
      .update({
        status: input.natureza === "LOCACAO" ? ("EM_LOCACAO" as const) : ("EM_COMODATO" as const),
        cliente_id: input.cliente_id,
        data_saida: new Date().toISOString().slice(0, 10),
      })
      .eq("id", input.chopeiraSaida);
    if (error) throw error;
  }
  if (input.chopeiraRetorno) {
    const { error } = await supabase
      .from("chopeiras")
      .update({ status: "DISPONIVEL", cliente_id: null, data_saida: null })
      .eq("id", input.chopeiraRetorno);
    if (error) throw error;
  }

  // ------- cilindros -------
  if (input.cilindroSaida) {
    const { error } = await supabase
      .from("cilindros")
      .update({
        status: "COM_CLIENTE",
        cliente_id: input.cliente_id,
        data_saida: new Date().toISOString().slice(0, 10),
      })
      .eq("id", input.cilindroSaida);
    if (error) throw error;
  }
  if (input.cilindroRetorno) {
    const { error } = await supabase
      .from("cilindros")
      .update({ status: "DISPONIVEL", cliente_id: null, data_saida: null })
      .eq("id", input.cilindroRetorno);
    if (error) throw error;
  }

  // ------- consignação: só vira receita no acerto -------
  if (input.natureza === "CONSIGNACAO") {
    for (const l of input.saidaCheios) {
      const { error } = await supabase.from("consignacoes").insert({
        cliente_id: input.cliente_id,
        produto_id: l.produto_id,
        movimentacao_id: mov.id,
        quantidade_entregue: l.quantidade,
        preco_unitario: l.preco_unitario,
        data_limite: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      });
      if (error) throw error;
    }
  }

  // ------- venda / locação geram conta a receber -------
  if (input.gerarContaReceber && valorTotal > 0) {
    const venc = new Date(Date.now() + input.vencimentoDias * 86400000).toISOString().slice(0, 10);
    const { error } = await supabase.from("contas_receber").insert({
      origem: input.natureza === "LOCACAO" ? "locacao" : "venda_avulsa",
      cliente_id: input.cliente_id,
      movimentacao_id: mov.id,
      descricao: `Romaneio #${mov.numero}`,
      valor_total: valorTotal,
      vencimento: venc,
    });
    if (error) throw error;
  }

  return mov as { id: string; numero: number };
}

async function ajustarSaldo(clienteId: string, produtoId: string, deltaCheios: number, deltaVazios: number) {
  const { data, error } = await supabase
    .from("saldos_cliente")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("produto_id", produtoId)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    const { error: upErr } = await supabase
      .from("saldos_cliente")
      .update({
        barris_cheios: Math.max(0, Number(data.barris_cheios) + deltaCheios),
        barris_vazios: Math.max(0, Number(data.barris_vazios) + deltaVazios),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (upErr) throw upErr;
  } else {
    const { error: insErr } = await supabase.from("saldos_cliente").insert({
      cliente_id: clienteId,
      produto_id: produtoId,
      barris_cheios: Math.max(0, deltaCheios),
      barris_vazios: Math.max(0, deltaVazios),
    });
    if (insErr) throw insErr;
  }
}

/** Estorna uma movimentação criando o registro espelho (histórico auditável). */
export async function estornarMovimentacao(movId: string) {
  const { data: mov, error } = await supabase.from("movimentacoes").select("*").eq("id", movId).single();
  if (error) throw error;
  const { error: insErr } = await supabase.from("movimentacoes").insert({
    tipo: "DEVOLUCAO" as const,
    natureza: mov.natureza,
    cliente_id: mov.cliente_id,
    responsavel: mov.responsavel,
    observacao: `Estorno do romaneio #${mov.numero}`,
    estorno_de: mov.id,
    valor_total: -Number(mov.valor_total ?? 0),
  });
  if (insErr) throw insErr;
  const { error: upErr } = await supabase.from("movimentacoes").update({ estornada: true }).eq("id", movId);
  if (upErr) throw upErr;
}
