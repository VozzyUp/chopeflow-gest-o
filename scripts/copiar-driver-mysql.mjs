/**
 * Copia o mysql2 (e suas dependências) para dentro de .output/server/node_modules.
 *
 * src/lib/mysql.server.ts monta o especificador do driver em runtime
 * (["mysql2","promise"].join("/")) para o bundler do preview Cloudflare nunca
 * tentar incluí-lo. O efeito colateral é que o rastreador de dependências do
 * Nitro também não enxerga o mysql2, então ele ficava de fora da saída de
 * produção e o servidor quebrava com "Cannot find package 'mysql2'".
 *
 * Nenhuma opção do Nitro resolve isso (traceDeps/externals só agem sobre
 * imports que o bundler tenta resolver), por isso a cópia é feita aqui.
 */
import { cp, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const destino = join(raiz, ".output", "server", "node_modules");

function localizarPacote(nome, aPartirDe) {
  const candidatos = [join(aPartirDe, "node_modules", nome), join(raiz, "node_modules", nome)];
  return candidatos.find((caminho) => existsSync(join(caminho, "package.json")));
}

async function lerPackageJson(caminho) {
  return JSON.parse(await readFile(join(caminho, "package.json"), "utf8"));
}

const fila = ["mysql2"];
const copiados = new Map();

while (fila.length > 0) {
  const nome = fila.shift();
  if (copiados.has(nome)) continue;

  const origem = localizarPacote(nome, raiz);
  if (!origem) {
    // Dependências opcionais podem legitimamente não estar instaladas.
    console.warn(`[copiar-driver-mysql] pacote nao encontrado, ignorando: ${nome}`);
    continue;
  }

  const pkg = await lerPackageJson(origem);
  copiados.set(nome, pkg.version);

  await mkdir(dirname(join(destino, nome)), { recursive: true });
  await cp(origem, join(destino, nome), { recursive: true, dereference: true });

  for (const dep of Object.keys(pkg.dependencies ?? {})) fila.push(dep);
}

const manifesto = join(raiz, ".output", "server", "package.json");
const conteudo = JSON.parse(await readFile(manifesto, "utf8"));
conteudo.dependencies = { ...conteudo.dependencies, mysql2: copiados.get("mysql2") };
await writeFile(manifesto, `${JSON.stringify(conteudo, null, 2)}\n`);

console.log(`[copiar-driver-mysql] ${copiados.size} pacotes copiados: ${[...copiados.keys()].join(", ")}`);
