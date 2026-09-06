import { describe, expect, it } from "vitest";

import { executarPedido } from "./mysql.server";

/**
 * Guardas de segurança da ponte /api/db. Todas rejeitam antes de tocar o banco,
 * então rodam sem MySQL. Cada uma corresponde a um achado real da auditoria.
 */
describe("executarPedido — guardas", () => {
  const usuario = { sub: "11111111-1111-1111-1111-111111111111" };

  it("recusa tabela fora da lista branca", async () => {
    await expect(executarPedido({ table: "app_users", action: "select" }, usuario)).rejects.toThrow(
      /Tabela inválida/,
    );
  });

  it("não deixa escrever em user_roles (escalação para admin)", async () => {
    await expect(
      executarPedido(
        { table: "user_roles", action: "insert", values: { user_id: usuario.sub, role: "admin" } },
        usuario,
      ),
    ).rejects.toThrow(/não pode ser alterada/);
  });

  it("permite ler user_roles", async () => {
    // Não deve barrar na guarda; se falhar, é por falta de banco, não por autorização.
    await expect(
      executarPedido({ table: "user_roles", action: "select" }, usuario),
    ).rejects.not.toThrow(/não pode ser alterada/);
  });

  it("recusa UPDATE sem filtro, que reescreveria a tabela inteira", async () => {
    await expect(
      executarPedido({ table: "contas_receber", action: "update", values: { valor_pago: 0 } }, usuario),
    ).rejects.toThrow(/sem filtro/);
  });

  it("recusa DELETE sem filtro", async () => {
    await expect(executarPedido({ table: "clientes", action: "delete" }, usuario)).rejects.toThrow(
      /sem filtro/,
    );
  });

  it("não deixa criar nem apagar perfil pela ponte", async () => {
    await expect(
      executarPedido({ table: "profiles", action: "insert", values: { nome: "x" } }, usuario),
    ).rejects.toThrow(/não pode ser criado nem removido/);
  });

  it("exige autenticação para escrever em profiles", async () => {
    await expect(
      executarPedido({ table: "profiles", action: "update", values: { nome: "x" } }),
    ).rejects.toThrow(/Não autenticado/);
  });
});
