/**
 * Camada de acesso ao MySQL usada quando o sistema roda em Node (Hostinger).
 * Só é executada quando as variáveis MYSQL_* estão configuradas.
 *
 * O driver `mysql2` é carregado por import dinâmico com especificador em
 * variável para que o empacotador do preview (Cloudflare) nunca tente incluí-lo.
 */
import { createHmac, randomUUID, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

type QueryResult = { insertId?: number; affectedRows?: number };
type Pool = {
  query: (sql: string, params?: unknown[]) => Promise<[unknown, unknown]>;
  execute: (sql: string, params?: unknown[]) => Promise<[unknown, unknown]>;
};

export function mysqlEnabled(): boolean {
  return Boolean(process.env["MYSQL_HOST"] && process.env["MYSQL_DATABASE"]);
}

let poolPromise: Promise<Pool> | undefined;

async function getPool(): Promise<Pool> {
  if (!poolPromise) {
    const specifier = ["mysql2", "promise"].join("/");
    poolPromise = import(/* @vite-ignore */ specifier).then((mod) => {
      const mysql = (mod as { default?: unknown }).default ?? mod;
      return (
        mysql as {
          createPool: (cfg: Record<string, unknown>) => Pool;
        }
      ).createPool({
        host: process.env["MYSQL_HOST"],
        port: Number(process.env["MYSQL_PORT"] ?? 3306),
        user: process.env["MYSQL_USER"],
        password: process.env["MYSQL_PASSWORD"],
        database: process.env["MYSQL_DATABASE"],
        waitForConnections: true,
        connectionLimit: Number(process.env["MYSQL_POOL"] ?? 5),
        dateStrings: true,
        timezone: "Z",
      });
    });
  }
  return poolPromise;
}

export async function sqlRows<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = await getPool();
  const [rows] = await pool.query(sql, params);
  return (rows ?? []) as T[];
}

export async function sqlRun(sql: string, params: unknown[] = []): Promise<QueryResult> {
  const pool = await getPool();
  const [res] = await pool.query(sql, params);
  return (res ?? {}) as QueryResult;
}

/* ===================== segurança de identificadores ===================== */

const TABELAS = new Set([
  "profiles",
  "user_roles",
  "empresa_config",
  "clientes",
  "produtos_chope",
  "barris",
  "chopeiras",
  "cilindros",
  "contratos_comodato",
  "locacoes_eventos",
  "locacao_itens",
  "movimentacoes",
  "movimentacao_itens",
  "movimentacao_fotos",
  "movimentacao_estoque_chope",
  "consignacoes",
  "acertos",
  "acerto_itens",
  "contas_receber",
  "pagamentos",
  "higienizacoes_manutencoes",
  "saldos_cliente",
]);

const IDENT = /^[a-z_][a-z0-9_]*$/;

function tabela(nome: unknown): string {
  if (typeof nome !== "string" || !TABELAS.has(nome)) throw new Error(`Tabela inválida: ${String(nome)}`);
  return `\`${nome}\``;
}

function coluna(nome: unknown): string {
  if (typeof nome !== "string" || !IDENT.test(nome)) throw new Error(`Coluna inválida: ${String(nome)}`);
  return `\`${nome}\``;
}

/* ===================== operações genéricas ===================== */

export type DbFiltro = { col: string; valor: unknown };
export type DbPedido = {
  table: string;
  action: "select" | "insert" | "update" | "delete";
  filters?: DbFiltro[];
  order?: { col: string; ascending: boolean } | null;
  limit?: number | null;
  values?: Record<string, unknown> | Record<string, unknown>[] | null;
  returning?: boolean;
};

function onde(filters: DbFiltro[] = []): { sql: string; params: unknown[] } {
  if (!filters.length) return { sql: "", params: [] };
  const partes = filters.map((f) => `${coluna(f.col)} <=> ?`);
  return { sql: ` WHERE ${partes.join(" AND ")}`, params: filters.map((f) => f.valor) };
}

function normalizarValor(v: unknown): unknown {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace("T", " ");
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/.test(v)) {
    return v.slice(0, 19).replace("T", " ");
  }
  if (v !== null && typeof v === "object") return JSON.stringify(v);
  return v;
}

export async function executarPedido(pedido: DbPedido): Promise<unknown> {
  const t = tabela(pedido.table);

  if (pedido.action === "select") {
    const w = onde(pedido.filters);
    let sql = `SELECT * FROM ${t}${w.sql}`;
    if (pedido.order) sql += ` ORDER BY ${coluna(pedido.order.col)} ${pedido.order.ascending ? "ASC" : "DESC"}`;
    if (pedido.limit) sql += ` LIMIT ${Number(pedido.limit)}`;
    return await sqlRows(sql, w.params);
  }

  if (pedido.action === "insert") {
    const linhas = (Array.isArray(pedido.values) ? pedido.values : [pedido.values ?? {}]).filter(Boolean);
    const ids: string[] = [];
    for (const linha of linhas) {
      const registro: Record<string, unknown> = { ...linha };
      if (!registro["id"]) registro["id"] = randomUUID();
      ids.push(String(registro["id"]));
      const cols = Object.keys(registro);
      const sql = `INSERT INTO ${t} (${cols.map(coluna).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
      await sqlRun(
        sql,
        cols.map((c) => normalizarValor(registro[c])),
      );
    }
    if (!pedido.returning) return null;
    if (!ids.length) return [];
    return await sqlRows(`SELECT * FROM ${t} WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
  }

  if (pedido.action === "update") {
    const patch = (pedido.values ?? {}) as Record<string, unknown>;
    const cols = Object.keys(patch);
    if (!cols.length) return null;
    const w = onde(pedido.filters);
    const sql = `UPDATE ${t} SET ${cols.map((c) => `${coluna(c)} = ?`).join(", ")}${w.sql}`;
    await sqlRun(sql, [...cols.map((c) => normalizarValor(patch[c])), ...w.params]);
    if (!pedido.returning) return null;
    return await sqlRows(`SELECT * FROM ${t}${w.sql}`, w.params);
  }

  const w = onde(pedido.filters);
  if (!w.sql) throw new Error("Exclusão sem filtro não é permitida");
  await sqlRun(`DELETE FROM ${t}${w.sql}`, w.params);
  return null;
}

/* ===================== autenticação ===================== */

function segredo(): string {
  const s = process.env["AUTH_SECRET"];
  if (!s || s.length < 16) throw new Error("Defina AUTH_SECRET com pelo menos 16 caracteres");
  return s;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function criarToken(payload: Record<string, unknown>, diasValidade = 30): string {
  const corpo = { ...payload, exp: Date.now() + diasValidade * 86_400_000 };
  const dados = b64url(JSON.stringify(corpo));
  const assinatura = b64url(createHmac("sha256", segredo()).update(dados).digest());
  return `${dados}.${assinatura}`;
}

export function lerToken(token: string | null | undefined): { sub: string; email: string } | null {
  if (!token) return null;
  const [dados, assinatura] = token.split(".");
  if (!dados || !assinatura) return null;
  const esperada = b64url(createHmac("sha256", segredo()).update(dados).digest());
  if (esperada.length !== assinatura.length) return null;
  if (!timingSafeEqual(Buffer.from(esperada), Buffer.from(assinatura))) return null;
  try {
    const corpo = JSON.parse(Buffer.from(dados.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()) as {
      sub?: string;
      email?: string;
      exp?: number;
    };
    if (!corpo.sub || !corpo.exp || corpo.exp < Date.now()) return null;
    return { sub: corpo.sub, email: corpo.email ?? "" };
  } catch {
    return null;
  }
}

export function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(senha, salt, 64).toString("hex")}`;
}

export function conferirSenha(senha: string, hash: string): boolean {
  const [salt, esperado] = hash.split(":");
  if (!salt || !esperado) return false;
  const calc = scryptSync(senha, salt, 64).toString("hex");
  return calc.length === esperado.length && timingSafeEqual(Buffer.from(calc), Buffer.from(esperado));
}

export function usuarioDaRequisicao(request: Request): { sub: string; email: string } | null {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  return lerToken(token);
}
