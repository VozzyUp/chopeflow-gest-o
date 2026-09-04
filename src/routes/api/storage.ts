import { createFileRoute } from "@tanstack/react-router";

/**
 * Armazenamento das fotos dos romaneios em disco (pasta uploads) quando o
 * sistema roda em Node com MySQL.
 */
export const Route = createFileRoute("/api/storage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const mod = await import("@/lib/mysql.server");
        if (!mod.mysqlEnabled()) return Response.json({ error: "Armazenamento não configurado" }, { status: 501 });
        const usuario = mod.usuarioDaRequisicao(request);
        if (!usuario) return Response.json({ error: "Não autenticado" }, { status: 401 });

        const form = await request.formData();
        const caminho = String(form.get("path") ?? "");
        const arquivo = form.get("file");
        if (!caminho || !(arquivo instanceof File)) {
          return Response.json({ error: "Arquivo inválido" }, { status: 400 });
        }
        if (!/^[A-Za-z0-9._/-]+$/.test(caminho) || caminho.includes("..")) {
          return Response.json({ error: "Caminho inválido" }, { status: 400 });
        }

        const { writeFile, mkdir } = await import("node:fs/promises");
        const path = await import("node:path");
        const base = process.env["UPLOAD_DIR"] ?? "./uploads";
        const destino = path.join(base, caminho);
        await mkdir(path.dirname(destino), { recursive: true });
        await writeFile(destino, Buffer.from(await arquivo.arrayBuffer()));
        return Response.json({ path: caminho });
      },

      GET: async ({ request }) => {
        const mod = await import("@/lib/mysql.server");
        if (!mod.mysqlEnabled()) return new Response("Armazenamento não configurado", { status: 501 });

        const url = new URL(request.url);
        const caminho = url.searchParams.get("path") ?? "";
        const token = url.searchParams.get("token");
        if (!mod.lerToken(token) && !mod.usuarioDaRequisicao(request)) {
          return new Response("Não autenticado", { status: 401 });
        }
        if (!/^[A-Za-z0-9._/-]+$/.test(caminho) || caminho.includes("..")) {
          return new Response("Caminho inválido", { status: 400 });
        }

        const { readFile } = await import("node:fs/promises");
        const path = await import("node:path");
        const base = process.env["UPLOAD_DIR"] ?? "./uploads";
        try {
          const conteudo = await readFile(path.join(base, caminho));
          const ext = caminho.split(".").pop()?.toLowerCase();
          const tipo = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
          return new Response(new Uint8Array(conteudo), {
            headers: { "content-type": tipo, "cache-control": "private, max-age=3600" },
          });
        } catch {
          return new Response("Arquivo não encontrado", { status: 404 });
        }
      },
    },
  },
});
