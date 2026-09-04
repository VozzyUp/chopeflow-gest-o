/**
 * Gera mysql/dados.sql com os dados atuais do banco na nuvem, já no formato
 * aceito pelo MySQL da Hostinger.
 *
 * Uso: node scripts/export-mysql-dados.mjs
 * Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.
 */
import { readFileSync, writeFileSync } from "node:fs";

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const ORDEM = [
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
];

const schema = readFileSync(new URL("../mysql/schema.sql", import.meta.url), "utf8");

function colunasDaTabela(tabela) {
  const re = new RegExp(`CREATE TABLE IF NOT EXISTS ${tabela} \\(([\\s\\S]*?)\\n\\) ENGINE`, "m");
  const m = schema.match(re);
  if (!m) return null;
  return m[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[a-z_]+ /.test(l))
    .map((l) => l.split(" ")[0]);
}

function valorSql(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
  let s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T[\d:.]+([+-]\d{2}:?\d{2}|Z)?$/.test(s)) s = s.slice(0, 19).replace("T", " ");
  return `'${s.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

async function buscar(tabela) {
  const linhas = [];
  for (let inicio = 0; ; inicio += 1000) {
    const resp = await fetch(`${URL_BASE}/rest/v1/${tabela}?select=*`, {
      headers: { apikey: KEY, Range: `${inicio}-${inicio + 999}`, Prefer: "count=none" },
    });
    if (!resp.ok) throw new Error(`${tabela}: ${resp.status} ${await resp.text()}`);
    const lote = await resp.json();
    linhas.push(...lote);
    if (lote.length < 1000) break;
  }
  return linhas;
}

let out = `-- ChopeControl — dados exportados em ${new Date().toISOString()}\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

for (const tabela of ORDEM) {
  const cols = colunasDaTabela(tabela);
  if (!cols) {
    console.warn(`Tabela ${tabela} não existe no schema MySQL — ignorada.`);
    continue;
  }
  let linhas;
  try {
    linhas = await buscar(tabela);
  } catch (e) {
    console.warn(`Falha ao ler ${tabela}: ${e.message}`);
    continue;
  }
  console.log(`${tabela}: ${linhas.length} registro(s)`);
  if (!linhas.length) continue;
  out += `-- ${tabela}\n`;
  for (const linha of linhas) {
    const usadas = cols.filter((c) => linha[c] !== undefined);
    out += `INSERT INTO \`${tabela}\` (${usadas.map((c) => `\`${c}\``).join(", ")}) VALUES (${usadas
      .map((c) => valorSql(linha[c]))
      .join(", ")});\n`;
  }
  out += "\n";
}

out += "SET FOREIGN_KEY_CHECKS = 1;\n";
writeFileSync(new URL("../mysql/dados.sql", import.meta.url), out);
console.log("mysql/dados.sql gerado.");
