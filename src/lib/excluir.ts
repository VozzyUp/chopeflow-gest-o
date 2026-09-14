import { supabase } from "@/integrations/db/client";

/**
 * Exclui um registro traduzindo o erro de vínculo: quando o item já aparece em
 * romaneios, contas ou acertos, o banco recusa a exclusão para não quebrar o
 * histórico — a mensagem explica isso em português.
 */
export async function excluirRegistro(tabela: string, id: string) {
  const cliente = supabase as unknown as {
    from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> } };
  };
  const { error } = await cliente.from(tabela).delete().eq("id", id);
  if (error) {
    const msg = String((error as { message?: string }).message ?? error);
    if (/foreign key|constraint|referenc/i.test(msg)) {
      throw new Error(
        "Não é possível excluir: este registro já está usado em movimentações ou lançamentos. Marque como inativo em vez de excluir.",
      );
    }
    throw new Error(msg);
  }
}
