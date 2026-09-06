import type { EntradaEstoque, Movimentacao, MovimentacaoItem } from "@/lib/data";

/**
 * Estoque de barris cheios por produto, em QUANTIDADE.
 *
 * Os barris giram: o fabricante leva os vazios e traz cheios, e nunca são os
 * mesmos vasilhames. Por isso o estoque não pode ser contado por linha da
 * tabela `barris` (código individual) — aquilo não corresponde à operação real.
 * A conta que vale é o razão: o que entrou do fabricante menos o que saiu em
 * romaneio.
 *
 * Itens de romaneio estornado são ignorados: o estorno marca a movimentação
 * mas não remove os itens, então somá-los subtrairia uma saída que foi desfeita.
 */
export function estoquePorProduto(
  entradas: EntradaEstoque[] | undefined,
  itens: MovimentacaoItem[] | undefined,
  movimentacoes: Movimentacao[] | undefined,
): Map<string, number> {
  const estornadas = new Set(
    (movimentacoes ?? []).filter((m) => m.estornada).map((m) => m.id),
  );

  const saldo = new Map<string, number>();

  for (const e of entradas ?? []) {
    if (!e.produto_id) continue;
    saldo.set(e.produto_id, (saldo.get(e.produto_id) ?? 0) + Number(e.quantidade || 0));
  }

  for (const i of itens ?? []) {
    if (i.categoria !== "BARRIL_CHEIO" || !i.produto_id) continue;
    if (estornadas.has(i.movimentacao_id)) continue;
    saldo.set(i.produto_id, (saldo.get(i.produto_id) ?? 0) - Number(i.quantidade || 0));
  }

  return saldo;
}
