-- Tabela do przechowywania zamówień PayU
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ext_order_id VARCHAR(255) NOT NULL UNIQUE,
    payu_order_id VARCHAR(255),
    plan_id VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL, -- w groszach
    currency VARCHAR(3) DEFAULT 'PLN',
    status VARCHAR(50) DEFAULT 'PENDING',
    redirect_uri TEXT,
    customer_data JSONB,
    payu_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_ext_order_id ON public.payment_orders(ext_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);

-- RLS (Row Level Security)
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Polityki RLS - użytkownicy mogą zobaczyć tylko swoje zamówienia
CREATE POLICY "Users can view own payment orders" ON public.payment_orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment orders" ON public.payment_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Funkcja do aktualizacji timestamp'a
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger do automatycznej aktualizacji updated_at
CREATE TRIGGER update_payment_orders_updated_at 
    BEFORE UPDATE ON public.payment_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
