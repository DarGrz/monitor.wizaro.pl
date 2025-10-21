-- Dodaj nowe kolumny do tabeli users związane z subskrypcją PayU
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "subscription_start_date" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "subscription_end_date" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "subscription_renewal_date" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "subscription_status" VARCHAR(50) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS "subscription_plan_id" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "subscription_payu_order_id" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "subscription_cancel_at_period_end" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "subscription_canceled_date" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "subscription_tax_rate_id" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "subscription_tax_percentage" DECIMAL(5,2);

-- Dodaj komentarze do nowych kolumn
COMMENT ON COLUMN "public"."users"."subscription_start_date" IS 'Data rozpoczęcia subskrypcji';
COMMENT ON COLUMN "public"."users"."subscription_end_date" IS 'Data zakończenia subskrypcji';
COMMENT ON COLUMN "public"."users"."subscription_renewal_date" IS 'Data następnego odnowienia subskrypcji';
COMMENT ON COLUMN "public"."users"."subscription_status" IS 'Status subskrypcji: active, inactive, canceled, expired, past_due';
COMMENT ON COLUMN "public"."users"."subscription_plan_id" IS 'ID planu subskrypcji (basic, professional, enterprise)';
COMMENT ON COLUMN "public"."users"."subscription_payu_order_id" IS 'ID zamówienia w PayU';
COMMENT ON COLUMN "public"."users"."subscription_cancel_at_period_end" IS 'Czy subskrypcja ma być anulowana na koniec okresu';
COMMENT ON COLUMN "public"."users"."subscription_canceled_date" IS 'Data anulowania subskrypcji';
COMMENT ON COLUMN "public"."users"."subscription_tax_rate_id" IS 'ID stawki podatkowej (np. txr_1RxvZhLEJlt9ALSCCK2eJqsw)';
COMMENT ON COLUMN "public"."users"."subscription_tax_percentage" IS 'Procent stawki podatkowej (np. 23.00 dla VAT 23%)';

-- Utwórz indeksy dla wydajności zapytań
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON "public"."users"("subscription_status");
CREATE INDEX IF NOT EXISTS idx_users_subscription_end_date ON "public"."users"("subscription_end_date");
CREATE INDEX IF NOT EXISTS idx_users_subscription_payu_order_id ON "public"."users"("subscription_payu_order_id");

-- Zaktualizuj istniejące rekordy - ustaw status na podstawie kolumny Subscribed
UPDATE "public"."users" 
SET "subscription_status" = CASE 
    WHEN "Subcribed" = 'true' THEN 'active'
    ELSE 'inactive'
END
WHERE "subscription_status" IS NULL OR "subscription_status" = 'inactive';
