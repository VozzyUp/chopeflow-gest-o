import { createFileRoute } from "@tanstack/react-router";

/** Ponte de dados usada quando o sistema roda em Node com MySQL (Hostinger). */
export const Route = createFileRoute("/api/db")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { mysqlEnabled, usuarioDaRequisicao, executarPedido } = await import("@/lib/mysql.server");
        if (!mysqlEnabled()) {
          return Response.json({ error: "Banco MySQL não configurado" }, { status: 501 });
        }
        const usuario = usuarioDaRequisicao(request);
        if (!usuario) return Response.json({ error: "Não autenticado" }, { status: 401 });

        try {
          const pedido = (await request.json()) as Parameters<typeof executarPedido>[0];
          const data = await executarPedido(pedido, usuario);
          return Response.json({ data });
        } catch (e) {
          // O erro cru do MySQL revela o esquema do banco; fica no log do servidor.
          console.error("[api/db]", e);
          return Response.json({ error: "Não foi possível concluir a operação." }, { status: 400 });
        }
      },
    },
  },
});
