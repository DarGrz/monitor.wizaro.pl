-- Tworzenie tabel dla integracji PayU
-- Zastępujemy strukturę Stripe na PayU

-- Tabela planów subskrypcji
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    price_monthly_net DECIMAL(10,2) NOT NULL,
    price_monthly_gross DECIMAL(10,2) NOT NULL,
    price_yearly_net DECIMAL(10,2) NOT NULL,
    price_yearly_gross DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PLN',
    max_companies INTEGER DEFAULT 1,
    max_opinion_removals_monthly INTEGER DEFAULT 0,
    has_negative_monitoring BOOLEAN DEFAULT true,
    has_weekly_reports BOOLEAN DEFAULT false,
    has_email_notifications BOOLEAN DEFAULT true,
    has_instant_notifications BOOLEAN DEFAULT false,
    additional_services_discount_percent INTEGER DEFAULT 0,
    estimated_monthly_savings DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela zamówień płatności (tracking PayU orders)
DROP TABLE IF EXISTS public.payment_orders CASCADE;
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id VARCHAR(100) PRIMARY KEY, -- extOrderId z PayU
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    payu_order_id VARCHAR(100), -- orderId z PayU
    plan_id VARCHAR(50) REFERENCES public.subscription_plans(id),
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    amount_gross INTEGER NOT NULL, -- kwota w groszach
    currency VARCHAR(3) DEFAULT 'PLN',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'canceled', 'failed')),
    customer_data JSONB,
    payu_data JSONB, -- dodatkowe dane z PayU
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela subskrypcji użytkowników (zaktualizowana dla PayU)
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) REFERENCES public.subscription_plans(id),
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'suspended')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancel_at TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    amount_gross INTEGER NOT NULL, -- kwota w groszach
    currency VARCHAR(3) DEFAULT 'PLN',
    payment_method VARCHAR(50) DEFAULT 'payu',
    last_payment_order_id VARCHAR(100) REFERENCES public.payment_orders(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela informacji o płatnościach (zamiast Stripe billing info)
DROP TABLE IF EXISTS public.user_billing_info CASCADE;
CREATE TABLE IF NOT EXISTS public.user_billing_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    payu_customer_data JSONB, -- dane klienta w PayU
    billing_address JSONB,
    payment_method_preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_payu_order_id ON public.payment_orders(payu_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_user_billing_info_user_id ON public.user_billing_info(user_id);

-- Wstawienie domyślnych planów subskrypcji
INSERT INTO public.subscription_plans (id, name, display_name, description, 
    price_monthly_net, price_monthly_gross, price_yearly_net, price_yearly_gross,
    max_companies, max_opinion_removals_monthly, has_negative_monitoring, 
    has_weekly_reports, has_email_notifications, has_instant_notifications,
    additional_services_discount_percent, estimated_monthly_savings) 
VALUES 
    ('basic', 'basic', 'Plan Podstawowy', 
     'Idealny dla małych firm rozpoczynających dbanie o swój wizerunek w internecie.',
     649.59, 799.00, 5680.00, 6988.00, 
     1, 2, true, false, true, false, 0, 18),
    
    ('professional', 'professional', 'Plan Profesjonalny',
     'Dla firm które chcą kompleksowo dbać o swój wizerunek z dodatkowymi funkcjami.',
     999.00, 1299.00, 9992.00, 12290.00,
     3, 5, true, true, true, true, 10, 40),
     
    ('enterprise', 'enterprise', 'Plan Enterprise',
     'Dla dużych firm wymagających zaawansowanego monitoringu i nieograniczonych możliwości.',
     399.00, 491.00, 3990.00, 4908.00,
     999, 15, true, true, true, true, 20, 80)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    price_monthly_net = EXCLUDED.price_monthly_net,
    price_monthly_gross = EXCLUDED.price_monthly_gross,
    price_yearly_net = EXCLUDED.price_yearly_net,
    price_yearly_gross = EXCLUDED.price_yearly_gross,
    max_companies = EXCLUDED.max_companies,
    max_opinion_removals_monthly = EXCLUDED.max_opinion_removals_monthly,
    has_negative_monitoring = EXCLUDED.has_negative_monitoring,
    has_weekly_reports = EXCLUDED.has_weekly_reports,
    has_email_notifications = EXCLUDED.has_email_notifications,
    has_instant_notifications = EXCLUDED.has_instant_notifications,
    additional_services_discount_percent = EXCLUDED.additional_services_discount_percent,
    estimated_monthly_savings = EXCLUDED.estimated_monthly_savings,
    updated_at = NOW();

-- Dodanie komentarzy do tabel
COMMENT ON TABLE public.subscription_plans IS 'Dostępne plany subskrypcji z cenami i funkcjami';
COMMENT ON TABLE public.payment_orders IS 'Zamówienia płatności obsługiwane przez PayU';
COMMENT ON TABLE public.user_subscriptions IS 'Aktywne subskrypcje użytkowników z płatnościami PayU';
COMMENT ON TABLE public.user_billing_info IS 'Informacje o płatnościach i preferencjach użytkowników';

-- Enable RLS (Row Level Security)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_billing_info ENABLE ROW LEVEL SECURITY;

-- Polityki bezpieczeństwa
-- Plany subskrypcji - wszyscy mogą czytać
CREATE POLICY "subscription_plans_select_policy" ON public.subscription_plans
    FOR SELECT USING (true);

-- Zamówienia płatności - tylko właściciel
CREATE POLICY "payment_orders_policy" ON public.payment_orders
    FOR ALL USING (auth.uid() = user_id);

-- Subskrypcje użytkowników - tylko właściciel
CREATE POLICY "user_subscriptions_policy" ON public.user_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Informacje o płatnościach - tylko właściciel
CREATE POLICY "user_billing_info_policy" ON public.user_billing_info
    FOR ALL USING (auth.uid() = user_id);
