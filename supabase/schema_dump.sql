-- ============================================================
-- COMET CRM — Full Schema Dump
-- Generated from Supabase project: zhyihwtgsctlpzspgsop
-- Run in Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. CUSTOM TYPES / ENUMS (if any)
-- ============================================================
-- No custom enums found; using TEXT with CHECK constraints where needed.

-- ============================================================
-- 2. TABLES
-- ============================================================

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    role TEXT DEFAULT 'Vendedor (Closer)',
    email TEXT,
    contact TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'Ativo',
    goals JSONB DEFAULT '[]'::jsonb,
    operational_goals JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;

CREATE POLICY profiles_select_policy ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY profiles_update_policy ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY profiles_insert_policy ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_delete_policy ON public.profiles
    FOR DELETE TO authenticated USING (auth.uid() = id);

-- company_settings
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT DEFAULT 'Minha Empresa',
    sector TEXT,
    purpose TEXT,
    logo TEXT,
    contact TEXT,
    email TEXT,
    address TEXT,
    website TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.company_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_settings TO service_role;

CREATE POLICY company_select_policy ON public.company_settings
    FOR SELECT TO authenticated USING (true);

-- pipelines
CREATE TABLE IF NOT EXISTS public.pipelines (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'primary',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pipelines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pipelines TO service_role;

CREATE POLICY pipelines_all_access ON public.pipelines
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pipeline_stages
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'default',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pipeline_stages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pipeline_stages TO service_role;

CREATE POLICY pipeline_stages_all_access ON public.pipeline_stages
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- stage_workflows
CREATE TABLE IF NOT EXISTS public.stage_workflows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
    rule_text TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stage_workflows ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stage_workflows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stage_workflows TO service_role;

CREATE POLICY stage_workflows_all_access ON public.stage_workflows
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- leads
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    company TEXT,
    email TEXT,
    whatsapp TEXT,
    value NUMERIC DEFAULT 0,
    stage TEXT DEFAULT 'Leads',
    owner TEXT,
    source TEXT,
    classification TEXT DEFAULT 'Lead',
    temperature TEXT DEFAULT 'Frio',
    type TEXT DEFAULT 'Novo',
    strategy TEXT DEFAULT 'Nenhuma',
    decision_role TEXT DEFAULT 'Não Decisor',
    min_score TEXT DEFAULT 'Nenhum',
    landing_page TEXT,
    product_id TEXT,
    pipeline_id UUID REFERENCES public.pipelines(id),
    tags TEXT[] DEFAULT '{}',
    score INTEGER DEFAULT 0,
    prev_score INTEGER,
    sla TEXT DEFAULT 'ok',
    last_interaction TEXT DEFAULT 'Agora',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    won_at TIMESTAMPTZ,
    activities JSONB DEFAULT '[]'::jsonb,
    completed_checkpoints TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leads TO service_role;

CREATE POLICY leads_all_access ON public.leads
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    lead TEXT,
    owners TEXT[] DEFAULT '{}',
    due DATE,
    priority TEXT DEFAULT 'media',
    done BOOLEAN DEFAULT FALSE,
    subtasks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO service_role;

CREATE POLICY tasks_all_access ON public.tasks
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    cost_price NUMERIC DEFAULT 0,
    sale_price NUMERIC DEFAULT 0,
    recurring BOOLEAN DEFAULT FALSE,
    recurrence_months INTEGER DEFAULT 12,
    installments INTEGER DEFAULT 1,
    image_url TEXT,
    strategy TEXT DEFAULT 'Nenhuma',
    related_product_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO service_role;

CREATE POLICY products_all_access ON public.products
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- surveys
CREATE TABLE IF NOT EXISTS public.surveys (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'mass',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    visits INTEGER DEFAULT 0,
    completions INTEGER DEFAULT 0,
    questions JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    reward JSONB,
    template TEXT DEFAULT 'Modern'
);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.surveys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.surveys TO service_role;

CREATE POLICY surveys_all_access ON public.surveys
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- survey_responses
CREATE TABLE IF NOT EXISTS public.survey_responses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER DEFAULT 0
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.survey_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.survey_responses TO service_role;

CREATE POLICY survey_responses_all_access ON public.survey_responses
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- playbooks
CREATE TABLE IF NOT EXISTS public.playbooks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    content TEXT,
    objective TEXT,
    icon_type TEXT DEFAULT 'message',
    specialty TEXT,
    when_to_use TEXT,
    expected_result TEXT,
    avg_duration TEXT,
    initial_checklist JSONB DEFAULT '[]'::jsonb,
    mandatory_questions JSONB DEFAULT '[]'::jsonb,
    optional_questions JSONB DEFAULT '[]'::jsonb,
    green_flags JSONB DEFAULT '[]'::jsonb,
    red_flags JSONB DEFAULT '[]'::jsonb,
    common_objections JSONB DEFAULT '[]'::jsonb,
    next_action TEXT,
    approval_criteria TEXT,
    rejection_criteria TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.playbooks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.playbooks TO service_role;

CREATE POLICY playbooks_all_access ON public.playbooks
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- objections
CREATE TABLE IF NOT EXISTS public.objections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    response TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.objections ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.objections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.objections TO service_role;

CREATE POLICY objections_all_access ON public.objections
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- landing_pages
CREATE TABLE IF NOT EXISTS public.landing_pages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    template TEXT,
    status TEXT DEFAULT 'Ativa',
    visits INTEGER DEFAULT 0,
    leads_count INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.landing_pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.landing_pages TO service_role;

CREATE POLICY landing_pages_all_access ON public.landing_pages
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- automations
CREATE TABLE IF NOT EXISTS public.automations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    trigger_event TEXT NOT NULL,
    priority TEXT DEFAULT 'media',
    active BOOLEAN DEFAULT TRUE,
    action_type TEXT NOT NULL,
    action_config JSONB DEFAULT '{}'::jsonb,
    runs INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.automations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.automations TO service_role;

CREATE POLICY automations_all_access ON public.automations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- visibility_settings
CREATE TABLE IF NOT EXISTS public.visibility_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    dashboard BOOLEAN DEFAULT TRUE,
    daily_sales BOOLEAN DEFAULT TRUE,
    crm BOOLEAN DEFAULT TRUE,
    leads BOOLEAN DEFAULT TRUE,
    tasks BOOLEAN DEFAULT TRUE,
    gestao_a_vista BOOLEAN DEFAULT TRUE,
    performance JSONB DEFAULT '{"root":true,"goals":true,"matrix":true,"podium":true,"ranking":true}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.visibility_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.visibility_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.visibility_settings TO service_role;

CREATE POLICY visibility_settings_all_access ON public.visibility_settings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- role_permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role TEXT NOT NULL PRIMARY KEY,
    stages JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.role_permissions TO service_role;

CREATE POLICY role_permissions_all_access ON public.role_permissions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- funnel_types
CREATE TABLE IF NOT EXISTS public.funnel_types (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    types JSONB DEFAULT '["Voucher","Isca Digital","Vídeo","Pesquisa"]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.funnel_types ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.funnel_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.funnel_types TO service_role;

CREATE POLICY funnel_types_all_access ON public.funnel_types
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sla_thresholds
CREATE TABLE IF NOT EXISTS public.sla_thresholds (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    alerta INTEGER DEFAULT 24,
    critico INTEGER DEFAULT 48,
    vencido INTEGER DEFAULT 72,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sla_thresholds ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sla_thresholds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sla_thresholds TO service_role;

CREATE POLICY sla_thresholds_all_access ON public.sla_thresholds
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- working_days
CREATE TABLE IF NOT EXISTS public.working_days (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    days JSONB DEFAULT '[1,2,3,4,5]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.working_days ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.working_days TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.working_days TO service_role;

CREATE POLICY working_days_all_access ON public.working_days
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- holidays
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    dates JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.holidays TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.holidays TO service_role;

CREATE POLICY holidays_all_access ON public.holidays
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- levels
CREATE TABLE IF NOT EXISTS public.levels (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    min_xp INTEGER NOT NULL,
    max_xp INTEGER,
    badge_icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.levels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.levels TO service_role;

CREATE POLICY levels_all_access ON public.levels
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- badges
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT,
    condition_json JSONB,
    xp_reward INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.badges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.badges TO service_role;

CREATE POLICY badges_all_access ON public.badges
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- user_badges
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_badges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_badges TO service_role;

CREATE POLICY user_badges_all_access ON public.user_badges
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ai_config
CREATE TABLE IF NOT EXISTS public.ai_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    openrouter_key TEXT,
    model_id TEXT DEFAULT 'openai/gpt-4o-mini',
    model_name TEXT DEFAULT 'GPT-4o Mini',
    max_tokens INTEGER DEFAULT 4096,
    context_window INTEGER DEFAULT 128000,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_config TO service_role;

CREATE POLICY ai_config_all_access ON public.ai_config
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. HELPER FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'email'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. REALTIME PUBLICATION (optional)
-- ============================================================
-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE
    public.leads,
    public.tasks,
    public.pipeline_stages,
    public.surveys,
    public.survey_responses,
    public.landing_pages;

-- ============================================================
-- 5. STORAGE BUCKETS (run separately in Storage UI)
-- ============================================================
-- avatars, landing-page-assets, survey-rewards, etc.

-- ============================================================
-- END OF SCHEMA DUMP
-- ============================================================