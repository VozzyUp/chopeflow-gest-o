import { supabase, usandoMysql } from "@/integrations/db/client";
import { tokenAtual } from "@/integrations/db/mysql-bridge";
import { criarUsuarioAdmin } from "@/lib/usuarios.functions";
import type { Papel } from "@/lib/permissoes";

export type NovoUsuario = { email: string; senha: string; nome: string; papel: Papel };

/** Cria um usuário no backend em uso (nuvem ou MySQL na Hostinger). */
export async function criarUsuario(dados: NovoUsuario) {
  if (usandoMysql) {
    const resp = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(tokenAtual() ? { authorization: `Bearer ${tokenAtual()}` } : {}),
      },
      body: JSON.stringify({
        action: "admin-create",
        email: dados.email,
        senha: dados.senha,
        nome: dados.nome,
        papel: dados.papel,
      }),
    });
    const json = (await resp.json()) as { id?: string; error?: string };
    if (!resp.ok || json.error) throw new Error(json.error ?? "Não foi possível criar o usuário");
    return { id: json.id as string };
  }

  return await criarUsuarioAdmin({ data: dados });
}

/** Define o perfil de um usuário já existente. */
export async function definirPapel(userId: string, papel: Papel) {
  const remover = await supabase.from("user_roles").delete().eq("user_id", userId);
  if (remover.error) throw new Error(remover.error.message);
  const inserir = await supabase.from("user_roles").insert({ user_id: userId, role: papel });
  if (inserir.error) throw new Error(inserir.error.message);
}

/** Remove todos os perfis, bloqueando o acesso do usuário às telas. */
export async function removerPapeis(userId: string) {
  const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}
