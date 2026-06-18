
ALTER TABLE public.cotas
  ADD COLUMN IF NOT EXISTS administradora text,
  ADD COLUMN IF NOT EXISTS empresa text,
  ADD COLUMN IF NOT EXISTS fdi_assinado boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_cotas_grupo_cota_adm
  ON public.cotas (grupo, cota, COALESCE(administradora, ''))
  WHERE grupo IS NOT NULL AND cota IS NOT NULL;

ALTER TABLE public.comissoes
  ADD COLUMN IF NOT EXISTS mes_referencia text,
  ADD COLUMN IF NOT EXISTS administradora text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_comissoes_cota_mes
  ON public.comissoes (cota_id, mes_referencia)
  WHERE mes_referencia IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comissoes_mes ON public.comissoes (mes_referencia);
CREATE INDEX IF NOT EXISTS idx_cotas_administradora ON public.cotas (administradora);
