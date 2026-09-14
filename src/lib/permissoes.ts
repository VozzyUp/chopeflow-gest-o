import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/db/client";

export type Papel = "admin" | "operacional" | "financeiro";

/** Telas liberadas para cada perfil (o admin acessa tudo). */
export const telasPorPapel: Record<Papel, string[]> = {
  admin: ["*"],
  operacional: ["/dashboard", "/movimentacoes", "/estoque", "/clientes", "/eventos"],
  financeiro: ["/dashboard", "/financeiro", "/consignacoes", "/relatorios", "/clientes"],
};

export function podeAcessar(papeis: string[], caminho: string): boolean {
  if (papeis.includes("admin")) return true;
  return papeis.some((papel) =>
    (telasPorPapel[papel as Papel] ?? []).some((base) => caminho === base || caminho.startsWith(`${base}/`)),
  );
}

/** Perfis do usuário logado. */
export function usePapeis() {
  return useQuery({
    queryKey: ["meus-papeis"],
    staleTime: 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data: usuario } = await supabase.auth.getUser();
      const id = usuario.user?.id;
      if (!id) return [];
      const { data, error } = await supabase.from("user_roles").select("*").eq("user_id", id);
      if (error) throw error;
      return (data ?? []).map((r) => String(r.role));
    },
  });
}

export function useEhAdmin() {
  const papeis = usePapeis();
  return { ...papeis, ehAdmin: (papeis.data ?? []).includes("admin") };
}
