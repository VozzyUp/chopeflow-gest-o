import { createFileRoute } from "@tanstack/react-router";

/** Login/cadastro próprios, usados quando o sistema roda em Node com MySQL. */
export const Route = createFileRoute("/api/auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const mod = await import("@/lib/mysql.server");
        if (!mod.mysqlEnabled()) {
          return Response.json({ error: "Banco MySQL não configurado" }, { status: 501 });
        }

        let body: { action?: string; email?: string; senha?: string; nome?: string; token?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Requisição inválida" }, { status: 400 });
        }

        const email = (body.email ?? "").trim().toLowerCase();
        const senha = body.senha ?? "";

        try {
          if (body.action === "signup") {
            if (!email || senha.length < 6) {
              return Response.json({ error: "Informe e-mail e senha com pelo menos 6 caracteres" }, { status: 400 });
            }
            const existentes = await mod.sqlRows<{ id: string }>("SELECT id FROM app_users WHERE email = ?", [email]);
            if (existentes.length) return Response.json({ error: "E-mail já cadastrado" }, { status: 409 });

            const id = crypto.randomUUID();
            const nome = (body.nome ?? "").trim() || email.split("@")[0];
            await mod.sqlRun("INSERT INTO app_users (id, email, senha_hash, nome) VALUES (?, ?, ?, ?)", [
              id,
              email,
              mod.hashSenha(senha),
              nome,
            ]);
            await mod.sqlRun("INSERT INTO profiles (id, nome, email) VALUES (?, ?, ?)", [id, nome, email]);
            const primeiro = await mod.sqlRows<{ total: number }>("SELECT COUNT(*) AS total FROM user_roles");
            if (Number(primeiro[0]?.total ?? 0) === 0) {
              await mod.sqlRun("INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')", [
                crypto.randomUUID(),
                id,
              ]);
            }
            return Response.json({ token: mod.criarToken({ sub: id, email }), user: { id, email, nome } });
          }

          if (body.action === "signin") {
            const usuarios = await mod.sqlRows<{ id: string; email: string; senha_hash: string; nome: string }>(
              "SELECT id, email, senha_hash, nome FROM app_users WHERE email = ?",
              [email],
            );
            const u = usuarios[0];
            if (!u || !mod.conferirSenha(senha, u.senha_hash)) {
              return Response.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
            }
            return Response.json({
              token: mod.criarToken({ sub: u.id, email: u.email }),
              user: { id: u.id, email: u.email, nome: u.nome },
            });
          }

          if (body.action === "user") {
            const dados = mod.lerToken(body.token);
            if (!dados) return Response.json({ user: null }, { status: 200 });
            const usuarios = await mod.sqlRows<{ id: string; email: string; nome: string }>(
              "SELECT id, email, nome FROM app_users WHERE id = ?",
              [dados.sub],
            );
            return Response.json({ user: usuarios[0] ?? null });
          }

          return Response.json({ error: "Ação desconhecida" }, { status: 400 });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Erro no login";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
