# Ceolin Consórcios — Plano de Construção

Sistema ERP de gestão de consórcios. Vou ativar **Lovable Cloud** (banco PostgreSQL + autenticação) e construir em fases, começando pela fundação. Identidade **Corporativo Azul** (#0B1F3A / #1E40AF / #3B82F6).

---

## Fase 1 — Fundação (esta entrega)

### Infraestrutura
- Ativar Lovable Cloud (banco + auth).
- Design system Corporativo Azul em `src/styles.css` (tokens, variantes de botão, cartões ERP).
- Layout principal com **sidebar colapsável** (estilo ERP) + topbar com busca global e usuário.

### Banco de dados (schema completo, já preparado para as próximas fases)
- `profiles` (id, nome, email, avatar)
- `user_roles` + enum `app_role` (admin, gerente, vendedor, consulta) + função `has_role()`
- `clientes` (nome, cpf_cnpj único, rg, nascimento, telefone, whatsapp, email, endereço, cep, cidade, estado, observações)
- `vendedores` (nome, cpf, telefone, email, cargo, meta_mensal, percentual_comissao)
- `cotas` (cliente_id, vendedor_id, grupo, cota, proposta, assembleia, data_adesao, valor_credito, valor_parcela, qtd_parcelas, vencimento, status enum, data_contemplacao, observações)
- `parcelas` (cota_id, numero, valor, vencimento, status enum, data_pagamento, observações)
- `comissoes` (cota_id, vendedor_id, primeira/segunda/terceira_parcela, total, status_pagamento)
- `import_logs` (arquivo, linhas_processadas, criados, atualizados, erros, payload jsonb, usuario_id)
- RLS habilitado em todas as tabelas, com policies por perfil.

### Autenticação
- Tela `/auth` (login + cadastro) — email/senha, auto-confirm ativado.
- Rota `/_authenticated` protegida (gate gerenciado do Lovable).
- **Seed**: o e-mail `ti1@ceolinautos.com` recebe o role `admin` automaticamente no primeiro signup (via trigger).
- Logout, recuperação de senha.

### Telas funcionais nesta fase
- **Dashboard** com cards de KPI (Total de Clientes, Cotas, Valor Vendido, Comissões, Contemplados, Inadimplentes) — já lendo dados reais (zerados no início).
- **Clientes**: listagem com busca + paginação, criar/editar/excluir, modal com formulário validado (Zod).
- **Vendedores**: listagem + CRUD completo.
- **Configurações/Usuários**: admin gerencia roles dos usuários.

### Próximas fases (não nesta entrega)
- **Fase 2**: Cotas + Parcelas (CRUD, vínculo cliente/vendedor, geração automática de parcelas).
- **Fase 3**: Comissões + Importação Excel (parser da planilha mensal, deduplicação por CPF/CNPJ, log de importação).
- **Fase 4**: Relatórios (PDF/Excel/impressão), gráficos no dashboard (Recharts), busca global, notificações, tema escuro, histórico de alterações.

---

## Detalhes técnicos
- Stack: TanStack Start + React 19 + Tailwind v4 + shadcn/ui + Supabase (Lovable Cloud).
- Server functions com `requireSupabaseAuth` para mutações sensíveis.
- Validação dupla: Zod no client + RLS no banco.
- Roles em tabela separada (`user_roles`) com `has_role()` SECURITY DEFINER — sem risco de escalada.

Confirma para eu começar a Fase 1?
