-- 1. Novo enum de tipo de cliente
CREATE TYPE public.cliente_tipo_new AS ENUM ('bar', 'delivery', 'avulso');

ALTER TABLE public.clientes ALTER COLUMN tipo DROP DEFAULT;
ALTER TABLE public.clientes
  ALTER COLUMN tipo TYPE public.cliente_tipo_new
  USING (
    CASE tipo::text
      WHEN 'bar_convenio' THEN 'bar'
      WHEN 'evento_pf' THEN 'delivery'
      ELSE 'avulso'
    END
  )::public.cliente_tipo_new;

DROP TYPE public.cliente_tipo;
ALTER TYPE public.cliente_tipo_new RENAME TO cliente_tipo;
ALTER TABLE public.clientes ALTER COLUMN tipo SET DEFAULT 'bar'::public.cliente_tipo;

-- 2. Aniversário do cliente
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS data_nascimento date;

-- 3. Endereço/datas na movimentação
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS endereco_entrega text;
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS complemento_entrega text;
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS data_entrega_prevista date;
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS data_retirada_prevista date;

-- 4. Fotos da movimentação
CREATE TABLE public.movimentacao_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id uuid NOT NULL REFERENCES public.movimentacoes(id) ON DELETE CASCADE,
  path text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacao_fotos TO authenticated;
GRANT ALL ON public.movimentacao_fotos TO service_role;

ALTER TABLE public.movimentacao_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam fotos de movimentacao"
ON public.movimentacao_fotos FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE INDEX idx_movimentacao_fotos_mov ON public.movimentacao_fotos(movimentacao_id);

-- 5. Politicas de storage para o bucket de romaneios
CREATE POLICY "Autenticados leem romaneios"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'romaneios');

CREATE POLICY "Autenticados enviam romaneios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'romaneios');

CREATE POLICY "Autenticados removem romaneios"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'romaneios');