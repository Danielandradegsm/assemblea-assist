
-- ====== ENUMS ======
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'vendedor', 'consulta');
CREATE TYPE public.cota_status AS ENUM ('ativa','aguardando_pagamento','aguardando_estorno','finalizada','estorno_realizado','contemplada','cancelada');
CREATE TYPE public.parcela_status AS ENUM ('paga','em_aberto','atrasada','cancelada');
CREATE TYPE public.comissao_status AS ENUM ('pendente','parcial','paga','cancelada');

-- ====== updated_at helper ======
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ====== PROFILES ======
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ====== USER ROLES ======
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

-- Profile policies
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles policies
CREATE POLICY "roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ====== Handle new user trigger ======
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email);

  IF NEW.email = 'ti1@ceolinautos.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'consulta')
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====== CLIENTES ======
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT UNIQUE,
  rg TEXT,
  data_nascimento DATE,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  endereco TEXT,
  cep TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "clientes_select_auth" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_modify_admin_gerente" ON public.clientes FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]));

CREATE INDEX idx_clientes_nome ON public.clientes USING gin (to_tsvector('portuguese', nome));
CREATE INDEX idx_clientes_cpfcnpj ON public.clientes(cpf_cnpj);

-- ====== VENDEDORES ======
CREATE TABLE public.vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  email TEXT,
  cargo TEXT,
  meta_mensal NUMERIC(14,2) DEFAULT 0,
  percentual_comissao NUMERIC(6,3) DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendedores TO authenticated;
GRANT ALL ON public.vendedores TO service_role;
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_vendedores_updated BEFORE UPDATE ON public.vendedores
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "vendedores_select_auth" ON public.vendedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "vendedores_modify_admin_gerente" ON public.vendedores FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]));

-- ====== COTAS ======
CREATE TABLE public.cotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  vendedor_id UUID REFERENCES public.vendedores(id) ON DELETE SET NULL,
  grupo TEXT,
  cota TEXT,
  proposta TEXT,
  assembleia DATE,
  data_adesao DATE,
  valor_credito NUMERIC(14,2) DEFAULT 0,
  valor_parcela NUMERIC(14,2) DEFAULT 0,
  qtd_parcelas INT DEFAULT 0,
  vencimento INT,
  status public.cota_status NOT NULL DEFAULT 'ativa',
  contemplada BOOLEAN NOT NULL DEFAULT false,
  data_contemplacao DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotas TO authenticated;
GRANT ALL ON public.cotas TO service_role;
ALTER TABLE public.cotas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cotas_updated BEFORE UPDATE ON public.cotas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "cotas_select_auth" ON public.cotas FOR SELECT TO authenticated USING (true);
CREATE POLICY "cotas_modify_admin_gerente" ON public.cotas FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]));

CREATE INDEX idx_cotas_cliente ON public.cotas(cliente_id);
CREATE INDEX idx_cotas_vendedor ON public.cotas(vendedor_id);
CREATE INDEX idx_cotas_status ON public.cotas(status);

-- ====== PARCELAS ======
CREATE TABLE public.parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cota_id UUID NOT NULL REFERENCES public.cotas(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  valor NUMERIC(14,2) DEFAULT 0,
  vencimento DATE,
  status public.parcela_status NOT NULL DEFAULT 'em_aberto',
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cota_id, numero)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelas TO authenticated;
GRANT ALL ON public.parcelas TO service_role;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_parcelas_updated BEFORE UPDATE ON public.parcelas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "parcelas_select_auth" ON public.parcelas FOR SELECT TO authenticated USING (true);
CREATE POLICY "parcelas_modify_admin_gerente" ON public.parcelas FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]));

-- ====== COMISSOES ======
CREATE TABLE public.comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cota_id UUID NOT NULL REFERENCES public.cotas(id) ON DELETE CASCADE,
  vendedor_id UUID REFERENCES public.vendedores(id) ON DELETE SET NULL,
  primeira_parcela NUMERIC(14,2) DEFAULT 0,
  segunda_parcela NUMERIC(14,2) DEFAULT 0,
  terceira_parcela NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) DEFAULT 0,
  status_pagamento public.comissao_status NOT NULL DEFAULT 'pendente',
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comissoes TO authenticated;
GRANT ALL ON public.comissoes TO service_role;
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_comissoes_updated BEFORE UPDATE ON public.comissoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "comissoes_select_auth" ON public.comissoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "comissoes_modify_admin_gerente" ON public.comissoes FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]));

-- ====== IMPORT LOGS ======
CREATE TABLE public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  arquivo TEXT,
  linhas_processadas INT DEFAULT 0,
  registros_criados INT DEFAULT 0,
  registros_atualizados INT DEFAULT 0,
  erros INT DEFAULT 0,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.import_logs TO authenticated;
GRANT ALL ON public.import_logs TO service_role;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "imports_select_auth" ON public.import_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "imports_insert_admin_gerente" ON public.import_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]));
