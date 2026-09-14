import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Entrada = { email: string; senha: string; nome: string; papel: "admin" | "operacional" | "financeiro" };

/** Criação de usuário pelo administrador (backend na nuvem). */
export const criarUsuarioAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Entrada) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    const senha = String(input?.senha ?? "");
    const nome = String(input?.nome ?? "").trim();
    const papel = input?.papel;
    if (!email.includes("@")) throw new Error("Informe um e-mail válido");
    if (senha.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres");
    if (!nome) throw new Error("Informe o nome");
    if (papel !== "admin" && papel !== "operacional" && papel !== "financeiro") {
      throw new Error("Perfil inválido");
    }
    return { email, senha, nome, papel };
  })
  .handler(async ({ data, context }) => {
    const { data: ehAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ehAdmin) throw new Error("Apenas administradores podem criar usuários");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const criado = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (criado.error || !criado.data.user) {
      throw new Error(criado.error?.message ?? "Não foi possível criar o usuário");
    }
    const id = criado.data.user.id;

    await supabaseAdmin
      .from("profiles")
      .upsert({ id, nome: data.nome, email: data.email }, { onConflict: "id" });

    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    const papel = await supabaseAdmin.from("user_roles").insert({ user_id: id, role: data.papel });
    if (papel.error) throw new Error(papel.error.message);

    return { id };
  });
