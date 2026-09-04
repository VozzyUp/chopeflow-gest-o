/**
 * Ponte de dados MySQL com a mesma "cara" do cliente atual, para que as telas
 * do sistema não precisem mudar quando ele roda na Hostinger (Node + MySQL).
 */

const TOKEN_KEY = "chopecontrol.token";

type Resultado<T = unknown> = { data: T; error: { message: string } | null };
type Filtro = { col: string; valor: unknown };

function guardarToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function tokenAtual(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

async function pedir<T>(pedido: Record<string, unknown>): Promise<Resultado<T>> {
  try {
    const resp = await fetch("/api/db", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(tokenAtual() ? { authorization: `Bearer ${tokenAtual()}` } : {}),
      },
      body: JSON.stringify(pedido),
    });
    const json = (await resp.json()) as { data?: T; error?: string };
    if (!resp.ok || json.error) return { data: null as T, error: { message: json.error ?? "Erro no banco" } };
    return { data: (json.data ?? null) as T, error: null };
  } catch (e) {
    return { data: null as T, error: { message: e instanceof Error ? e.message : "Falha de conexão" } };
  }
}

class Consulta implements PromiseLike<Resultado<unknown>> {
  private filtros: Filtro[] = [];
  private ordem: { col: string; ascending: boolean } | null = null;
  private limite: number | null = null;
  private unico: "single" | "maybe" | null = null;
  private retornar = false;

  constructor(
    private table: string,
    private action: "select" | "insert" | "update" | "delete",
    private values: unknown = null,
  ) {}

  select() {
    this.retornar = true;
    return this;
  }
  eq(col: string, valor: unknown) {
    this.filtros.push({ col, valor });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.ordem = { col, ascending: opts?.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.limite = n;
    return this;
  }
  single() {
    this.unico = "single";
    return this;
  }
  maybeSingle() {
    this.unico = "maybe";
    return this;
  }

  private async executar(): Promise<Resultado<unknown>> {
    const retornar = this.action === "select" ? true : this.retornar;
    const res = await pedir<unknown[]>({
      table: this.table,
      action: this.action,
      filters: this.filtros,
      order: this.ordem,
      limit: this.limite,
      values: this.values,
      returning: retornar,
    });
    if (res.error) return res;
    const linhas = Array.isArray(res.data) ? res.data : [];
    if (this.unico === "single") {
      if (!linhas.length) return { data: null, error: { message: "Registro não encontrado" } };
      return { data: linhas[0], error: null };
    }
    if (this.unico === "maybe") return { data: linhas[0] ?? null, error: null };
    return { data: retornar ? linhas : null, error: null };
  }

  then<A, B = never>(
    onOk?: ((v: Resultado<unknown>) => A | PromiseLike<A>) | null,
    onErr?: ((r: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.executar().then(onOk, onErr);
  }
}

type Ouvinte = (evento: string, sessao: unknown) => void;
const ouvintes = new Set<Ouvinte>();

function sessaoLocal() {
  const token = tokenAtual();
  return token ? { access_token: token, user: { id: "", email: "" } } : null;
}

async function chamarAuth(body: Record<string, unknown>) {
  const resp = await fetch("/api/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await resp.json()) as {
    token?: string;
    user?: { id: string; email: string; nome: string } | null;
    error?: string;
  };
}

export const mysqlBridge = {
  from(table: string) {
    return {
      select: () => new Consulta(table, "select"),
      insert: (values: unknown) => new Consulta(table, "insert", values),
      update: (values: unknown) => new Consulta(table, "update", values),
      delete: () => new Consulta(table, "delete"),
    };
  },

  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const json = await chamarAuth({ action: "signin", email, senha: password });
      if (json.error || !json.token) return { data: { session: null }, error: { message: json.error ?? "Erro" } };
      guardarToken(json.token);
      const sessao = { access_token: json.token, user: json.user };
      ouvintes.forEach((f) => f("SIGNED_IN", sessao));
      return { data: { session: sessao, user: json.user }, error: null };
    },

    async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { nome?: string } } }) {
      const json = await chamarAuth({ action: "signup", email, senha: password, nome: options?.data?.nome });
      if (json.error || !json.token) return { data: { session: null }, error: { message: json.error ?? "Erro" } };
      guardarToken(json.token);
      const sessao = { access_token: json.token, user: json.user };
      ouvintes.forEach((f) => f("SIGNED_IN", sessao));
      return { data: { session: sessao, user: json.user }, error: null };
    },

    async signOut() {
      guardarToken(null);
      ouvintes.forEach((f) => f("SIGNED_OUT", null));
      return { error: null };
    },

    async getSession() {
      return { data: { session: sessaoLocal() }, error: null };
    },

    async getUser() {
      const token = tokenAtual();
      if (!token) return { data: { user: null }, error: { message: "Não autenticado" } };
      const json = await chamarAuth({ action: "user", token });
      if (!json.user) {
        guardarToken(null);
        return { data: { user: null }, error: { message: "Sessão expirada" } };
      }
      return { data: { user: json.user }, error: null };
    },

    onAuthStateChange(cb: Ouvinte) {
      ouvintes.add(cb);
      return { data: { subscription: { unsubscribe: () => ouvintes.delete(cb) } } };
    },
  },

  storage: {
    from() {
      return {
        async upload(path: string, file: File) {
          const form = new FormData();
          form.append("path", path);
          form.append("file", file);
          const resp = await fetch("/api/storage", {
            method: "POST",
            headers: tokenAtual() ? { authorization: `Bearer ${tokenAtual()}` } : {},
            body: form,
          });
          const json = (await resp.json()) as { path?: string; error?: string };
          if (!resp.ok || json.error) return { data: null, error: { message: json.error ?? "Falha no envio" } };
          return { data: { path: json.path }, error: null };
        },
        async createSignedUrl(path: string) {
          const token = tokenAtual();
          if (!token) return { data: null, error: { message: "Não autenticado" } };
          const signedUrl = `/api/storage?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}`;
          return { data: { signedUrl }, error: null };
        },
      };
    },
  },
};
