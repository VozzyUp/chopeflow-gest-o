
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','operacional','financeiro');
CREATE TYPE public.cliente_tipo AS ENUM ('bar_convenio','evento_pf','avulso');
CREATE TYPE public.cliente_status AS ENUM ('ativo','inativo','bloqueado');
CREATE TYPE public.barril_status AS ENUM ('CHEIO_ESTOQUE','ENTREGUE_CLIENTE','VAZIO_NO_CLIENTE','EM_TRANSITO_RETORNO','EM_HIGIENIZACAO','MANUTENCAO','BAIXADO');
CREATE TYPE public.chopeira_status AS ENUM ('DISPONIVEL','EM_COMODATO','EM_LOCACAO','MANUTENCAO','BAIXADA');
CREATE TYPE public.cilindro_status AS ENUM ('DISPONIVEL','COM_CLIENTE','VAZIO_RETORNO','MANUTENCAO','BAIXADO');
CREATE TYPE public.mov_tipo AS ENUM ('ENTREGA','COLETA','TROCA','VENDA_AVULSA','DEVOLUCAO','AJUSTE_INVENTARIO','PERDA');
CREATE TYPE public.mov_natureza AS ENUM ('VENDA','CONSIGNACAO','LOCACAO','COMODATO','INTERNO');
CREATE TYPE public.consignacao_status AS ENUM ('ABERTA','PARCIAL','ACERTADA');
CREATE TYPE public.conta_status AS ENUM ('ABERTO','PARCIAL','PAGO','VENCIDO');
CREATE TYPE public.locacao_status AS ENUM ('ORCAMENTO','CONFIRMADO','ENTREGUE','COLETADO','FINALIZADO','CANCELADO');

-- UTIL
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text,
  telefone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- novo usuário -> profile + papel admin para o primeiro
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- EMPRESA / CONFIG
CREATE TABLE public.empresa_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT 'ChopeControl Distribuidora',
  cnpj text, telefone text, email text, endereco text, logo_url text,
  dias_alerta_barril_parado int NOT NULL DEFAULT 21,
  dias_alerta_higienizacao int NOT NULL DEFAULT 90,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CLIENTES
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.cliente_tipo NOT NULL DEFAULT 'avulso',
  nome text NOT NULL,
  documento text,
  telefone text, email text,
  endereco text, cidade text, uf text, cep text,
  contato_responsavel text,
  condicao_pagamento text NOT NULL DEFAULT 'a_vista',
  tabela_preco text NOT NULL DEFAULT 'padrao',
  limite_credito numeric(12,2) NOT NULL DEFAULT 0,
  status public.cliente_status NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.produtos_chope (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  fornecedor text,
  volume_litros numeric(8,2) NOT NULL DEFAULT 50,
  custo_barril numeric(12,2) NOT NULL DEFAULT 0,
  preco_barril numeric(12,2) NOT NULL DEFAULT 0,
  preco_litro numeric(12,2) NOT NULL DEFAULT 0,
  estoque_minimo int NOT NULL DEFAULT 5,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.barris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  produto_id uuid REFERENCES public.produtos_chope(id) ON DELETE SET NULL,
  volume_litros numeric(8,2) NOT NULL DEFAULT 50,
  status public.barril_status NOT NULL DEFAULT 'CHEIO_ESTOQUE',
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  data_ultima_movimentacao timestamptz,
  ciclos int NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chopeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  marca_modelo text, numero_serie text,
  torneiras int NOT NULL DEFAULT 1,
  tipo text NOT NULL DEFAULT 'eletrica',
  status public.chopeira_status NOT NULL DEFAULT 'DISPONIVEL',
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  data_saida date, data_prevista_retorno date,
  valor_equipamento numeric(12,2) NOT NULL DEFAULT 0,
  ultima_higienizacao date, proxima_higienizacao date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cilindros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  tipo text NOT NULL DEFAULT 'CO2',
  capacidade_kg numeric(8,2) NOT NULL DEFAULT 6,
  status public.cilindro_status NOT NULL DEFAULT 'DISPONIVEL',
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  data_saida date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contratos_comodato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  chopeira_id uuid REFERENCES public.chopeiras(id) ON DELETE SET NULL,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  vigencia_meses int NOT NULL DEFAULT 12,
  consumo_minimo_barris numeric(10,2) NOT NULL DEFAULT 0,
  valor_multa numeric(12,2) NOT NULL DEFAULT 0,
  valor_garantia numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ATIVO',
  termo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.locacoes_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data_evento timestamptz NOT NULL,
  endereco_evento text,
  valor_locacao numeric(12,2) NOT NULL DEFAULT 0,
  valor_caucao numeric(12,2) NOT NULL DEFAULT 0,
  caucao_devolvida boolean NOT NULL DEFAULT false,
  taxa_entrega numeric(12,2) NOT NULL DEFAULT 0,
  forma_pagamento text,
  status public.locacao_status NOT NULL DEFAULT 'ORCAMENTO',
  data_entrega timestamptz, data_coleta timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.locacao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locacao_id uuid NOT NULL REFERENCES public.locacoes_eventos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos_chope(id) ON DELETE SET NULL,
  chopeira_id uuid REFERENCES public.chopeiras(id) ON DELETE SET NULL,
  quantidade numeric(10,2) NOT NULL DEFAULT 1,
  quantidade_consumida numeric(10,2) NOT NULL DEFAULT 0,
  preco_unitario numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero serial,
  tipo public.mov_tipo NOT NULL,
  natureza public.mov_natureza NOT NULL DEFAULT 'CONSIGNACAO',
  data timestamptz NOT NULL DEFAULT now(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  locacao_id uuid REFERENCES public.locacoes_eventos(id) ON DELETE SET NULL,
  responsavel text,
  recebido_por text,
  valor_total numeric(12,2) NOT NULL DEFAULT 0,
  observacao text,
  estornada boolean NOT NULL DEFAULT false,
  estorno_de uuid REFERENCES public.movimentacoes(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.movimentacao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id uuid NOT NULL REFERENCES public.movimentacoes(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'BARRIL_CHEIO',
  produto_id uuid REFERENCES public.produtos_chope(id) ON DELETE SET NULL,
  barril_id uuid REFERENCES public.barris(id) ON DELETE SET NULL,
  chopeira_id uuid REFERENCES public.chopeiras(id) ON DELETE SET NULL,
  cilindro_id uuid REFERENCES public.cilindros(id) ON DELETE SET NULL,
  quantidade numeric(10,2) NOT NULL DEFAULT 1,
  preco_unitario numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.consignacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos_chope(id) ON DELETE SET NULL,
  movimentacao_id uuid REFERENCES public.movimentacoes(id) ON DELETE SET NULL,
  quantidade_entregue numeric(10,2) NOT NULL DEFAULT 0,
  quantidade_acertada numeric(10,2) NOT NULL DEFAULT 0,
  preco_unitario numeric(12,2) NOT NULL DEFAULT 0,
  data_entrega date NOT NULL DEFAULT CURRENT_DATE,
  data_limite date,
  status public.consignacao_status NOT NULL DEFAULT 'ABERTA',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.acertos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  periodo_inicio date, periodo_fim date,
  valor_bruto numeric(12,2) NOT NULL DEFAULT 0,
  desconto numeric(12,2) NOT NULL DEFAULT 0,
  valor_final numeric(12,2) NOT NULL DEFAULT 0,
  data_acerto date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.acerto_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acerto_id uuid NOT NULL REFERENCES public.acertos(id) ON DELETE CASCADE,
  consignacao_id uuid REFERENCES public.consignacoes(id) ON DELETE SET NULL,
  produto_id uuid REFERENCES public.produtos_chope(id) ON DELETE SET NULL,
  quantidade numeric(10,2) NOT NULL DEFAULT 0,
  preco_unitario numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contas_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem text NOT NULL DEFAULT 'acerto',
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  acerto_id uuid REFERENCES public.acertos(id) ON DELETE SET NULL,
  locacao_id uuid REFERENCES public.locacoes_eventos(id) ON DELETE SET NULL,
  movimentacao_id uuid REFERENCES public.movimentacoes(id) ON DELETE SET NULL,
  descricao text,
  valor_total numeric(12,2) NOT NULL DEFAULT 0,
  valor_pago numeric(12,2) NOT NULL DEFAULT 0,
  saldo numeric(12,2) NOT NULL DEFAULT 0,
  vencimento date NOT NULL DEFAULT CURRENT_DATE,
  status public.conta_status NOT NULL DEFAULT 'ABERTO',
  data_pagamento date,
  forma text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.contas_receber(id) ON DELETE CASCADE,
  valor numeric(12,2) NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  forma text NOT NULL DEFAULT 'PIX',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.higienizacoes_manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo_tipo text NOT NULL DEFAULT 'chopeira',
  chopeira_id uuid REFERENCES public.chopeiras(id) ON DELETE CASCADE,
  barril_id uuid REFERENCES public.barris(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'higienizacao',
  data date NOT NULL DEFAULT CURRENT_DATE,
  custo numeric(12,2) NOT NULL DEFAULT 0,
  tecnico text, descricao text,
  proxima_data date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.movimentacao_estoque_chope (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos_chope(id) ON DELETE CASCADE,
  nota_fiscal text,
  quantidade numeric(10,2) NOT NULL DEFAULT 0,
  custo_unitario numeric(12,2) NOT NULL DEFAULT 0,
  data date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- saldo agregado em poder do cliente (modo quantidade)
CREATE TABLE public.saldos_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos_chope(id) ON DELETE CASCADE,
  barris_cheios numeric(10,2) NOT NULL DEFAULT 0,
  barris_vazios numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, produto_id)
);

-- GRANTS + RLS (dados da empresa: acessíveis a usuários autenticados)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['empresa_config','clientes','produtos_chope','barris','chopeiras','cilindros',
    'contratos_comodato','locacoes_eventos','locacao_itens','movimentacoes','movimentacao_itens',
    'consignacoes','acertos','acerto_itens','contas_receber','pagamentos','higienizacoes_manutencoes',
    'movimentacao_estoque_chope','saldos_cliente']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t||'_auth_all', t);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON SEQUENCE public.movimentacoes_numero_seq TO authenticated;
GRANT ALL ON SEQUENCE public.movimentacoes_numero_seq TO service_role;

-- TRIGGERS updated_at
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['empresa_config','clientes','produtos_chope','barris','chopeiras','cilindros',
    'contratos_comodato','locacoes_eventos','consignacoes','contas_receber']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', 'trg_upd_'||t, t);
  END LOOP;
END $$;

-- consignacao status automático
CREATE OR REPLACE FUNCTION public.sync_consignacao_status() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.quantidade_acertada <= 0 THEN NEW.status := 'ABERTA';
  ELSIF NEW.quantidade_acertada >= NEW.quantidade_entregue THEN NEW.status := 'ACERTADA';
  ELSE NEW.status := 'PARCIAL'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_consignacao_status BEFORE INSERT OR UPDATE ON public.consignacoes
FOR EACH ROW EXECUTE FUNCTION public.sync_consignacao_status();

-- contas a receber: saldo/status
CREATE OR REPLACE FUNCTION public.sync_conta_valores() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.saldo := GREATEST(NEW.valor_total - NEW.valor_pago, 0);
  IF NEW.saldo <= 0 THEN NEW.status := 'PAGO';
  ELSIF NEW.vencimento < CURRENT_DATE THEN NEW.status := 'VENCIDO';
  ELSIF NEW.valor_pago > 0 THEN NEW.status := 'PARCIAL';
  ELSE NEW.status := 'ABERTO'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_conta_valores BEFORE INSERT OR UPDATE ON public.contas_receber
FOR EACH ROW EXECUTE FUNCTION public.sync_conta_valores();

CREATE OR REPLACE FUNCTION public.aplicar_pagamento() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  cid := COALESCE(NEW.conta_id, OLD.conta_id);
  UPDATE public.contas_receber c
  SET valor_pago = COALESCE((SELECT SUM(p.valor) FROM public.pagamentos p WHERE p.conta_id = cid),0),
      data_pagamento = (SELECT MAX(p.data) FROM public.pagamentos p WHERE p.conta_id = cid)
  WHERE c.id = cid;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_pagamento AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.aplicar_pagamento();

-- ===================== SEED =====================
INSERT INTO public.empresa_config (nome, cnpj, telefone, email, endereco)
VALUES ('ChopeControl Distribuidora de Chope', '12.345.678/0001-90', '(11) 98888-1234', 'contato@chopecontrol.com.br', 'Rua das Cervejarias, 450 - São Paulo/SP');

INSERT INTO public.produtos_chope (id, nome, fornecedor, volume_litros, custo_barril, preco_barril, preco_litro, estoque_minimo) VALUES
('a1000000-0000-0000-0000-000000000001','Pilsen','Cervejaria Baden Sul',50,420.00,690.00,13.80,8),
('a1000000-0000-0000-0000-000000000002','IPA','Cervejaria Alta Colina',30,390.00,650.00,21.67,4),
('a1000000-0000-0000-0000-000000000003','Weiss','Cervejaria Baden Sul',50,470.00,760.00,15.20,4),
('a1000000-0000-0000-0000-000000000004','Lager Premium','Cervejaria Vale Verde',50,450.00,720.00,14.40,6),
('a1000000-0000-0000-0000-000000000005','Red Ale','Cervejaria Alta Colina',30,410.00,680.00,22.67,3);

INSERT INTO public.clientes (id, tipo, nome, documento, telefone, email, endereco, cidade, uf, contato_responsavel, condicao_pagamento, limite_credito, status, observacoes) VALUES
('c1000000-0000-0000-0000-000000000001','bar_convenio','Boteco do Zé Ltda','11.222.333/0001-44','(11) 99123-4567','contato@botecodoze.com.br','Av. Paulista, 1200','São Paulo','SP','José Ribeiro','28_dias',6000,'ativo','Cliente desde 2021, consumo alto de Pilsen'),
('c1000000-0000-0000-0000-000000000002','bar_convenio','Pub Alta Malte ME','22.333.444/0001-55','(11) 99222-1122','financeiro@altamalte.com.br','Rua Augusta, 890','São Paulo','SP','Marina Duarte','14_dias',5000,'ativo','Prefere IPA e Red Ale'),
('c1000000-0000-0000-0000-000000000003','bar_convenio','Restaurante Vila Sul','33.444.555/0001-66','(11) 98777-3311','vila@sul.com.br','Rua Vergueiro, 2210','São Paulo','SP','Carlos Menezes','7_dias',3500,'ativo',null),
('c1000000-0000-0000-0000-000000000004','bar_convenio','Choperia Central','44.555.666/0001-77','(11) 97555-8899','central@choperia.com','Av. Ipiranga, 77','São Paulo','SP','Fernanda Lopes','28_dias',4000,'bloqueado','Bloqueado por inadimplência acima de 45 dias'),
('c1000000-0000-0000-0000-000000000005','evento_pf','Ricardo Almeida','123.456.789-00','(11) 96444-2233','ricardo.almeida@gmail.com','Rua das Acácias, 55','São Paulo','SP','Ricardo','a_vista',0,'ativo','Casamento em dezembro'),
('c1000000-0000-0000-0000-000000000006','evento_pf','Juliana Prado','987.654.321-00','(11) 96333-7788','ju.prado@gmail.com','Alameda Santos, 340','São Paulo','SP','Juliana','a_vista',0,'ativo',null),
('c1000000-0000-0000-0000-000000000007','avulso','Mercado São Jorge','55.666.777/0001-88','(11) 95222-4455','compras@saojorge.com.br','Rua do Comércio, 12','Guarulhos','SP','Antônio','a_vista',1500,'ativo',null),
('c1000000-0000-0000-0000-000000000008','bar_convenio','Bar da Esquina Eireli','66.777.888/0001-99','(11) 94111-2233','bar@esquina.com.br','Rua Teodoro Sampaio, 900','São Paulo','SP','Paulo Henrique','14_dias',3000,'ativo','Consumo mínimo 6 barris/mês');

-- CHOPEIRAS
INSERT INTO public.chopeiras (codigo, marca_modelo, numero_serie, torneiras, tipo, status, cliente_id, data_saida, valor_equipamento, ultima_higienizacao, proxima_higienizacao) VALUES
('CHP-001','Beertech BT-200','SN20394',2,'eletrica','EM_COMODATO','c1000000-0000-0000-0000-000000000001', CURRENT_DATE - 240, 4200, CURRENT_DATE - 100, CURRENT_DATE - 10),
('CHP-002','Beertech BT-100','SN20395',1,'eletrica','EM_COMODATO','c1000000-0000-0000-0000-000000000002', CURRENT_DATE - 180, 3200, CURRENT_DATE - 40, CURRENT_DATE + 50),
('CHP-003','ChopMaster CM-4','SN44120',4,'eletrica','EM_COMODATO','c1000000-0000-0000-0000-000000000008', CURRENT_DATE - 90, 6500, CURRENT_DATE - 30, CURRENT_DATE + 60),
('CHP-004','Gelopack G2','SN77812',2,'a_gelo','EM_LOCACAO','c1000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 2100, CURRENT_DATE - 5, CURRENT_DATE + 85),
('CHP-005','Beertech BT-200','SN20396',2,'eletrica','DISPONIVEL',null,null,4200, CURRENT_DATE - 12, CURRENT_DATE + 78),
('CHP-006','Extratora Inox EX-1','SN99001',1,'extratora','MANUTENCAO',null,null,1800, CURRENT_DATE - 150, CURRENT_DATE - 60);

INSERT INTO public.cilindros (codigo, tipo, capacidade_kg, status, cliente_id, data_saida) VALUES
('CO2-001','CO2',6,'COM_CLIENTE','c1000000-0000-0000-0000-000000000001',CURRENT_DATE - 30),
('CO2-002','CO2',6,'COM_CLIENTE','c1000000-0000-0000-0000-000000000002',CURRENT_DATE - 20),
('CO2-003','CO2',10,'COM_CLIENTE','c1000000-0000-0000-0000-000000000008',CURRENT_DATE - 12),
('CO2-004','CO2',6,'DISPONIVEL',null,null),
('CO2-005','CO2',10,'DISPONIVEL',null,null),
('N2-001','N2',6,'DISPONIVEL',null,null);

-- 40 BARRIS
INSERT INTO public.barris (codigo, produto_id, volume_litros, status, cliente_id, data_ultima_movimentacao, ciclos)
SELECT
  'BR-' || lpad(g::text,3,'0'),
  p.id,
  p.volume_litros,
  CASE
    WHEN g <= 16 THEN 'CHEIO_ESTOQUE'::public.barril_status
    WHEN g <= 28 THEN 'ENTREGUE_CLIENTE'::public.barril_status
    WHEN g <= 34 THEN 'VAZIO_NO_CLIENTE'::public.barril_status
    WHEN g <= 37 THEN 'EM_HIGIENIZACAO'::public.barril_status
    WHEN g <= 39 THEN 'EM_TRANSITO_RETORNO'::public.barril_status
    ELSE 'MANUTENCAO'::public.barril_status
  END,
  CASE WHEN g BETWEEN 17 AND 34 THEN
    (ARRAY['c1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002',
           'c1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000004',
           'c1000000-0000-0000-0000-000000000008'])[1 + (g % 5)]::uuid
  END,
  now() - ((g % 40) || ' days')::interval,
  (g % 14) + 3
FROM generate_series(1,40) g
JOIN LATERAL (
  SELECT id, volume_litros FROM public.produtos_chope ORDER BY nome OFFSET (g % 5) LIMIT 1
) p ON true;

-- CONTRATOS DE COMODATO
INSERT INTO public.contratos_comodato (cliente_id, chopeira_id, data_inicio, vigencia_meses, consumo_minimo_barris, valor_multa, valor_garantia)
SELECT c.id, ch.id, CURRENT_DATE - 240, 12, 8, 1200, 4200 FROM public.clientes c, public.chopeiras ch
WHERE c.id='c1000000-0000-0000-0000-000000000001' AND ch.codigo='CHP-001';
INSERT INTO public.contratos_comodato (cliente_id, chopeira_id, data_inicio, vigencia_meses, consumo_minimo_barris, valor_multa, valor_garantia)
SELECT c.id, ch.id, CURRENT_DATE - 180, 12, 6, 900, 3200 FROM public.clientes c, public.chopeiras ch
WHERE c.id='c1000000-0000-0000-0000-000000000002' AND ch.codigo='CHP-002';
INSERT INTO public.contratos_comodato (cliente_id, chopeira_id, data_inicio, vigencia_meses, consumo_minimo_barris, valor_multa, valor_garantia)
SELECT c.id, ch.id, CURRENT_DATE - 90, 24, 6, 1500, 6500 FROM public.clientes c, public.chopeiras ch
WHERE c.id='c1000000-0000-0000-0000-000000000008' AND ch.codigo='CHP-003';

-- CONSIGNAÇÕES ABERTAS
INSERT INTO public.consignacoes (cliente_id, produto_id, quantidade_entregue, quantidade_acertada, preco_unitario, data_entrega, data_limite) VALUES
('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',6,2,690,CURRENT_DATE-25,CURRENT_DATE+5),
('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000004',3,0,720,CURRENT_DATE-12,CURRENT_DATE+18),
('c1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000002',4,0,650,CURRENT_DATE-18,CURRENT_DATE+12),
('c1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000005',2,0,680,CURRENT_DATE-9,CURRENT_DATE+21),
('c1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001',3,1,690,CURRENT_DATE-33,CURRENT_DATE-3),
('c1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000003',5,0,760,CURRENT_DATE-48,CURRENT_DATE-18),
('c1000000-0000-0000-0000-000000000008','a1000000-0000-0000-0000-000000000001',5,3,690,CURRENT_DATE-15,CURRENT_DATE+15);

-- SALDOS AGREGADOS
INSERT INTO public.saldos_cliente (cliente_id, produto_id, barris_cheios, barris_vazios) VALUES
('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',4,2),
('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000004',3,0),
('c1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000002',4,1),
('c1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001',2,1),
('c1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000003',5,0),
('c1000000-0000-0000-0000-000000000008','a1000000-0000-0000-0000-000000000001',2,2);

-- ENTRADAS DE ESTOQUE
INSERT INTO public.movimentacao_estoque_chope (produto_id, nota_fiscal, quantidade, custo_unitario, data) VALUES
('a1000000-0000-0000-0000-000000000001','NF-10231',20,420,CURRENT_DATE-30),
('a1000000-0000-0000-0000-000000000002','NF-10232',10,390,CURRENT_DATE-28),
('a1000000-0000-0000-0000-000000000003','NF-10233',8,470,CURRENT_DATE-20),
('a1000000-0000-0000-0000-000000000004','NF-10240',12,450,CURRENT_DATE-10),
('a1000000-0000-0000-0000-000000000005','NF-10241',6,410,CURRENT_DATE-5);

-- MOVIMENTAÇÕES DE EXEMPLO
INSERT INTO public.movimentacoes (id, tipo, natureza, data, cliente_id, responsavel, recebido_por, valor_total, observacao) VALUES
('d1000000-0000-0000-0000-000000000001','ENTREGA','CONSIGNACAO',now()-interval '25 days','c1000000-0000-0000-0000-000000000001','Marcos (entregador)','José Ribeiro',0,'Entrega semanal'),
('d1000000-0000-0000-0000-000000000002','TROCA','CONSIGNACAO',now()-interval '12 days','c1000000-0000-0000-0000-000000000001','Marcos (entregador)','José Ribeiro',0,'Troca de 2 vazios'),
('d1000000-0000-0000-0000-000000000003','ENTREGA','CONSIGNACAO',now()-interval '18 days','c1000000-0000-0000-0000-000000000002','Douglas','Marina Duarte',0,null),
('d1000000-0000-0000-0000-000000000004','VENDA_AVULSA','VENDA',now()-interval '6 days','c1000000-0000-0000-0000-000000000007','Douglas','Antônio',1380,'Venda de 2 barris Pilsen'),
('d1000000-0000-0000-0000-000000000005','ENTREGA','LOCACAO',now()-interval '2 days','c1000000-0000-0000-0000-000000000005','Marcos (entregador)','Ricardo',0,'Entrega para evento');

INSERT INTO public.movimentacao_itens (movimentacao_id, categoria, produto_id, quantidade, preco_unitario) VALUES
('d1000000-0000-0000-0000-000000000001','BARRIL_CHEIO','a1000000-0000-0000-0000-000000000001',6,690),
('d1000000-0000-0000-0000-000000000002','BARRIL_CHEIO','a1000000-0000-0000-0000-000000000004',3,720),
('d1000000-0000-0000-0000-000000000002','BARRIL_VAZIO','a1000000-0000-0000-0000-000000000001',2,0),
('d1000000-0000-0000-0000-000000000003','BARRIL_CHEIO','a1000000-0000-0000-0000-000000000002',4,650),
('d1000000-0000-0000-0000-000000000004','BARRIL_CHEIO','a1000000-0000-0000-0000-000000000001',2,690),
('d1000000-0000-0000-0000-000000000005','BARRIL_CHEIO','a1000000-0000-0000-0000-000000000001',3,690);

-- LOCAÇÕES / EVENTOS
INSERT INTO public.locacoes_eventos (id, cliente_id, data_evento, endereco_evento, valor_locacao, valor_caucao, taxa_entrega, forma_pagamento, status, data_entrega) VALUES
('e1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000005', now()+interval '1 day','Chácara Recanto Verde - Cotia/SP',450,600,120,'PIX','ENTREGUE', now()-interval '2 days'),
('e1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000006', now()+interval '12 days','Salão Alameda Santos, 340',380,500,100,'PIX','CONFIRMADO', null),
('e1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000006', now()-interval '20 days','Rua Harmonia, 210 - Vila Madalena',420,500,100,'dinheiro','FINALIZADO', now()-interval '21 days');

INSERT INTO public.locacao_itens (locacao_id, produto_id, quantidade, quantidade_consumida, preco_unitario) VALUES
('e1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',3,0,690),
('e1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003',2,0,760),
('e1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001',2,2,690);

-- ACERTOS + CONTAS A RECEBER
INSERT INTO public.acertos (id, cliente_id, periodo_inicio, periodo_fim, valor_bruto, desconto, valor_final, data_acerto) VALUES
('f1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001',CURRENT_DATE-40,CURRENT_DATE-10,1380,0,1380,CURRENT_DATE-10),
('f1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000008',CURRENT_DATE-45,CURRENT_DATE-15,2070,70,2000,CURRENT_DATE-15),
('f1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000003',CURRENT_DATE-60,CURRENT_DATE-33,690,0,690,CURRENT_DATE-33);

INSERT INTO public.acerto_itens (acerto_id, produto_id, quantidade, preco_unitario) VALUES
('f1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',2,690),
('f1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001',3,690),
('f1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001',1,690);

INSERT INTO public.contas_receber (id, origem, cliente_id, acerto_id, descricao, valor_total, vencimento) VALUES
('b1000000-0000-0000-0000-000000000001','acerto','c1000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','Acerto de consignação - 2 barris Pilsen',1380,CURRENT_DATE+8),
('b1000000-0000-0000-0000-000000000002','acerto','c1000000-0000-0000-0000-000000000008','f1000000-0000-0000-0000-000000000002','Acerto de consignação - 3 barris Pilsen',2000,CURRENT_DATE-5),
('b1000000-0000-0000-0000-000000000003','acerto','c1000000-0000-0000-0000-000000000003','f1000000-0000-0000-0000-000000000003','Acerto de consignação - 1 barril Pilsen',690,CURRENT_DATE-20);
INSERT INTO public.contas_receber (id, origem, cliente_id, movimentacao_id, descricao, valor_total, vencimento) VALUES
('b1000000-0000-0000-0000-000000000004','venda_avulsa','c1000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000004','Venda avulsa - 2 barris Pilsen',1380,CURRENT_DATE-1);
INSERT INTO public.contas_receber (id, origem, cliente_id, locacao_id, descricao, valor_total, vencimento) VALUES
('b1000000-0000-0000-0000-000000000005','locacao','c1000000-0000-0000-0000-000000000005','e1000000-0000-0000-0000-000000000001','Locação chopeira + 3 barris - evento',2640,CURRENT_DATE+3),
('b1000000-0000-0000-0000-000000000006','locacao','c1000000-0000-0000-0000-000000000006','e1000000-0000-0000-0000-000000000003','Locação evento finalizado',1900,CURRENT_DATE-18);
INSERT INTO public.contas_receber (id, origem, cliente_id, descricao, valor_total, vencimento) VALUES
('b1000000-0000-0000-0000-000000000007','acerto','c1000000-0000-0000-0000-000000000004','Acerto atrasado - 5 barris Weiss',3800,CURRENT_DATE-45),
('b1000000-0000-0000-0000-000000000008','acerto','c1000000-0000-0000-0000-000000000002','Acerto de consignação - 4 barris IPA',2600,CURRENT_DATE+11);

INSERT INTO public.pagamentos (conta_id, valor, data, forma) VALUES
('b1000000-0000-0000-0000-000000000001',600,CURRENT_DATE-3,'PIX'),
('b1000000-0000-0000-0000-000000000006',1900,CURRENT_DATE-18,'dinheiro'),
('b1000000-0000-0000-0000-000000000003',200,CURRENT_DATE-10,'PIX');

INSERT INTO public.higienizacoes_manutencoes (ativo_tipo, chopeira_id, tipo, data, custo, tecnico, descricao, proxima_data)
SELECT 'chopeira', id, 'higienizacao', CURRENT_DATE-100, 90, 'Equipe interna', 'Higienização completa das linhas', CURRENT_DATE-10 FROM public.chopeiras WHERE codigo='CHP-001';
INSERT INTO public.higienizacoes_manutencoes (ativo_tipo, chopeira_id, tipo, data, custo, tecnico, descricao, proxima_data)
SELECT 'chopeira', id, 'manutencao_corretiva', CURRENT_DATE-15, 340, 'FrioTec Assistência', 'Troca do compressor', CURRENT_DATE+165 FROM public.chopeiras WHERE codigo='CHP-006';
