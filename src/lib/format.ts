export function brl(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

/**
 * Converte entrada de formulário em número, sem surpresa.
 *
 * Number("") é 0 e Number("abc") é NaN — os dois passavam direto para o banco.
 * Aceita vírgula porque é o que o usuário brasileiro digita.
 */
export function numeroSeguro(valor: unknown, minimo = Number.NEGATIVE_INFINITY): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? Math.max(minimo, valor) : minimo === Number.NEGATIVE_INFINITY ? 0 : minimo;
  const texto = String(valor ?? "").trim().replace(",", ".");
  if (!texto) return minimo === Number.NEGATIVE_INFINITY ? 0 : minimo;
  const n = Number(texto);
  if (!Number.isFinite(n)) return minimo === Number.NEGATIVE_INFINITY ? 0 : minimo;
  return Math.max(minimo, n);
}

export function num(value: number | null | undefined, digits = 0): string {
  return (value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function dataBr(value: string | Date | null | undefined): string {
  if (!value) return "—";
  // "2026-09-06" vira meia-noite UTC, que no Brasil ainda é dia 5: formatar direto.
  if (typeof value === "string") {
    const puro = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (puro) return `${puro[3]}/${puro[2]}/${puro[1]}`;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

export function dataHoraBr(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function diasDesde(value: string | null | undefined): number {
  if (!value) return 0;
  const d = new Date(value).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d) / 86400000));
}

/**
 * Data no fuso do Brasil em YYYY-MM-DD, para colunas DATE.
 * toISOString() devolve UTC: depois das 21h no Brasil ele já grava o dia seguinte.
 */
export function dataHoje(dias = 0): string {
  return new Date(Date.now() + dias * 86400000).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

export function inputDate(value: string | null | undefined): string {
  if (!value) return "";
  // Coluna DATE já vem como YYYY-MM-DD; converter para Date e voltar deslocaria o dia.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function mesAtualRange() {
  const now = new Date();
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}
