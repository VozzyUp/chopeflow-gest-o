import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Cliente = {
  id: string;
  tipo: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  contato_responsavel: string | null;
  condicao_pagamento: string;
  tabela_preco: string;
  limite_credito: number;
  status: string;
  observacoes: string | null;
  created_at: string;
};

export type Produto = {
  id: string;
  nome: string;
  fornecedor: string | null;
  volume_litros: number;
  custo_barril: number;
  preco_barril: number;
  preco_litro: number;
  estoque_minimo: number;
  ativo: boolean;
};

export type Barril = {
  id: string;
  codigo: string;
  produto_id: string | null;
  volume_litros: number;
  status: string;
  cliente_id: string | null;
  data_ultima_movimentacao: string | null;
  ciclos: number;
};

export type Chopeira = {
  id: string;
  codigo: string;
  marca_modelo: string | null;
  numero_serie: string | null;
  torneiras: number;
  tipo: string;
  status: string;
  cliente_id: string | null;
  data_saida: string | null;
  data_prevista_retorno: string | null;
  valor_equipamento: number;
  ultima_higienizacao: string | null;
  proxima_higienizacao: string | null;
};

export type Cilindro = {
  id: string;
  codigo: string;
  tipo: string;
  capacidade_kg: number;
  status: string;
  cliente_id: string | null;
  data_saida: string | null;
};

export type Consignacao = {
  id: string;
  cliente_id: string;
  produto_id: string | null;
  quantidade_entregue: number;
  quantidade_acertada: number;
  preco_unitario: number;
  data_entrega: string;
  data_limite: string | null;
  status: string;
};

export type ContaReceber = {
  id: string;
  origem: string;
  cliente_id: string;
  descricao: string | null;
  valor_total: number;
  valor_pago: number;
  saldo: number;
  vencimento: string;
  status: string;
  data_pagamento: string | null;
  forma: string | null;
  created_at: string;
};

export type Movimentacao = {
  id: string;
  numero: number;
  tipo: string;
  natureza: string;
  data: string;
  cliente_id: string | null;
  responsavel: string | null;
  recebido_por: string | null;
  valor_total: number;
  observacao: string | null;
  estornada: boolean;
};

export type MovimentacaoItem = {
  id: string;
  movimentacao_id: string;
  categoria: string;
  produto_id: string | null;
  barril_id: string | null;
  chopeira_id: string | null;
  cilindro_id: string | null;
  quantidade: number;
  preco_unitario: number;
};

export type Locacao = {
  id: string;
  cliente_id: string;
  data_evento: string;
  endereco_evento: string | null;
  valor_locacao: number;
  valor_caucao: number;
  caucao_devolvida: boolean;
  taxa_entrega: number;
  forma_pagamento: string | null;
  status: string;
  data_entrega: string | null;
  data_coleta: string | null;
  observacoes: string | null;
};

type LooseResult = { data: unknown; error: unknown };
type LooseBuilder = Promise<LooseResult> & {
  order: (c: string, o: { ascending: boolean }) => Promise<LooseResult>;
};

async function selectAll<T>(table: string, order?: string, asc = true): Promise<T[]> {
  const client = supabase as unknown as {
    from: (t: string) => { select: (c: string) => LooseBuilder };
  };
  const base = client.from(table).select("*");
  const res = order ? await base.order(order, { ascending: asc }) : await base;
  if (res.error) throw res.error;
  return ((res.data ?? []) as T[]);
}

export const useClientes = () =>
  useQuery({ queryKey: ["clientes"], queryFn: () => selectAll<Cliente>("clientes", "nome") });

export const useProdutos = () =>
  useQuery({ queryKey: ["produtos"], queryFn: () => selectAll<Produto>("produtos_chope", "nome") });

export const useBarris = () =>
  useQuery({ queryKey: ["barris"], queryFn: () => selectAll<Barril>("barris", "codigo") });

export const useChopeiras = () =>
  useQuery({ queryKey: ["chopeiras"], queryFn: () => selectAll<Chopeira>("chopeiras", "codigo") });

export const useCilindros = () =>
  useQuery({ queryKey: ["cilindros"], queryFn: () => selectAll<Cilindro>("cilindros", "codigo") });

export const useConsignacoes = () =>
  useQuery({
    queryKey: ["consignacoes"],
    queryFn: () => selectAll<Consignacao>("consignacoes", "data_entrega", false),
  });

export const useContas = () =>
  useQuery({
    queryKey: ["contas_receber"],
    queryFn: () => selectAll<ContaReceber>("contas_receber", "vencimento"),
  });

export const useMovimentacoes = () =>
  useQuery({
    queryKey: ["movimentacoes"],
    queryFn: () => selectAll<Movimentacao>("movimentacoes", "data", false),
  });

export const useMovimentacaoItens = () =>
  useQuery({
    queryKey: ["movimentacao_itens"],
    queryFn: () => selectAll<MovimentacaoItem>("movimentacao_itens"),
  });

export const useLocacoes = () =>
  useQuery({
    queryKey: ["locacoes"],
    queryFn: () => selectAll<Locacao>("locacoes_eventos", "data_evento", false),
  });

export const useSaldosCliente = () =>
  useQuery({
    queryKey: ["saldos_cliente"],
    queryFn: () =>
      selectAll<{
        id: string;
        cliente_id: string;
        produto_id: string;
        barris_cheios: number;
        barris_vazios: number;
      }>("saldos_cliente"),
  });

export const usePagamentos = () =>
  useQuery({
    queryKey: ["pagamentos"],
    queryFn: () =>
      selectAll<{
        id: string;
        conta_id: string;
        valor: number;
        data: string;
        forma: string;
        observacao: string | null;
      }>("pagamentos", "data", false),
  });

export const useEmpresa = () =>
  useQuery({
    queryKey: ["empresa_config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresa_config").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        nome: string;
        cnpj: string | null;
        telefone: string | null;
        email: string | null;
        endereco: string | null;
        dias_alerta_barril_parado: number;
        dias_alerta_higienizacao: number;
      } | null;
    },
  });

export function nomeCliente(clientes: Cliente[] | undefined, id: string | null | undefined) {
  if (!id) return "—";
  return clientes?.find((c) => c.id === id)?.nome ?? "—";
}

export function nomeProduto(produtos: Produto[] | undefined, id: string | null | undefined) {
  if (!id) return "—";
  return produtos?.find((p) => p.id === id)?.nome ?? "—";
}
