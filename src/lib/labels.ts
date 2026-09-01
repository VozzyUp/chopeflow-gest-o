export const clienteTipoLabel: Record<string, string> = {
  bar: "Bar",
  delivery: "Delivery",
  avulso: "Avulso",
};

export const clienteStatusLabel: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  bloqueado: "Bloqueado",
};

export const barrilStatusLabel: Record<string, string> = {
  CHEIO_ESTOQUE: "Cheio no estoque",
  ENTREGUE_CLIENTE: "Entregue ao cliente",
  VAZIO_NO_CLIENTE: "Vazio no cliente",
  EM_TRANSITO_RETORNO: "Em trânsito (retorno)",
  EM_HIGIENIZACAO: "Em higienização",
  MANUTENCAO: "Manutenção",
  BAIXADO: "Baixado",
};

export const chopeiraStatusLabel: Record<string, string> = {
  DISPONIVEL: "Disponível",
  EM_COMODATO: "Em comodato",
  EM_LOCACAO: "Em locação",
  MANUTENCAO: "Manutenção",
  BAIXADA: "Baixada",
};

export const cilindroStatusLabel: Record<string, string> = {
  DISPONIVEL: "Disponível",
  COM_CLIENTE: "Com cliente",
  VAZIO_RETORNO: "Vazio em retorno",
  MANUTENCAO: "Manutenção",
  BAIXADO: "Baixado",
};

export const movTipoLabel: Record<string, string> = {
  ENTREGA: "Entrega",
  COLETA: "Coleta",
  TROCA: "Troca",
  VENDA_AVULSA: "Venda avulsa",
  DEVOLUCAO: "Devolução",
  AJUSTE_INVENTARIO: "Ajuste de inventário",
  PERDA: "Perda",
};

export const movNaturezaLabel: Record<string, string> = {
  VENDA: "Venda",
  CONSIGNACAO: "Consignação",
  LOCACAO: "Locação",
  COMODATO: "Comodato",
  INTERNO: "Interno",
};

export const locacaoStatusLabel: Record<string, string> = {
  ORCAMENTO: "Orçamento",
  CONFIRMADO: "Confirmado",
  ENTREGUE: "Entregue",
  COLETADO: "Coletado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export const contaStatusLabel: Record<string, string> = {
  ABERTO: "Aberto",
  PARCIAL: "Parcial",
  PAGO: "Pago",
  VENCIDO: "Vencido",
};

export const consignacaoStatusLabel: Record<string, string> = {
  ABERTA: "Aberta",
  PARCIAL: "Parcial",
  ACERTADA: "Acertada",
};

export const condicaoPagamentoLabel: Record<string, string> = {
  a_vista: "À vista",
  "7_dias": "7 dias",
  "14_dias": "14 dias",
  "28_dias": "28 dias",
};

export const roleLabel: Record<string, string> = {
  admin: "Administrador",
  operacional: "Operacional / Entregador",
  financeiro: "Financeiro",
};

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

export function statusTone(status: string): Tone {
  switch (status) {
    case "CHEIO_ESTOQUE":
    case "DISPONIVEL":
    case "PAGO":
    case "ACERTADA":
    case "FINALIZADO":
    case "ativo":
      return "success";
    case "ENTREGUE_CLIENTE":
    case "EM_COMODATO":
    case "EM_LOCACAO":
    case "COM_CLIENTE":
    case "CONFIRMADO":
    case "ENTREGUE":
      return "primary";
    case "VAZIO_NO_CLIENTE":
    case "EM_TRANSITO_RETORNO":
    case "EM_HIGIENIZACAO":
    case "PARCIAL":
    case "ABERTA":
    case "ABERTO":
    case "ORCAMENTO":
      return "warning";
    case "MANUTENCAO":
    case "VENCIDO":
    case "BAIXADO":
    case "BAIXADA":
    case "CANCELADO":
    case "bloqueado":
      return "danger";
    default:
      return "neutral";
  }
}
