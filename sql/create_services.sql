-- Tabela dla usług jednorazowych (poza abonamentem)
DROP TABLE IF EXISTS services CASCADE;

CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Ceny
  price_net DECIMAL(10,2) NOT NULL, -- cena netto
  price_gross DECIMAL(10,2) NOT NULL, -- cena brutto
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00, -- stawka VAT w %
  currency VARCHAR(3) DEFAULT 'PLN',
  
  -- Kategoria usługi
  category VARCHAR(50) NOT NULL, -- 'removal', 'reset', 'monitoring'
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadane
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Wstaw domyślne usługi jednorazowe
INSERT INTO services (name, display_name, description, price_net, price_gross, vat_rate, category) VALUES
('opinion_removal', 'Usunięcie opinii', 'Profesjonalne usunięcie negatywnej opinii', 243.09, 299.00, 23.00, 'removal'),
('profile_removal', 'Usunięcie profilu', 'Całkowite usunięcie profilu firmy', 568.29, 699.00, 23.00, 'removal'),
('google_business_removal', 'Usunięcie wizytówki Google', 'Usunięcie wizytówki Google My Business', 1056.91, 1299.00, 23.00, 'removal'),
('google_business_reset', 'Reset wizytówki Google', 'Pełny reset wizytówki Google My Business', 1788.62, 2199.00, 23.00, 'reset');

-- Indeksy
CREATE INDEX idx_services_name ON services(name);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_is_active ON services(is_active);

-- RLS (Row Level Security) - usługi może czytać każdy
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active services" ON services
  FOR SELECT USING (is_active = TRUE);

-- Trigger dla updated_at
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Komentarze
COMMENT ON TABLE services IS 'Usługi jednorazowe dostępne poza abonamentem';
COMMENT ON COLUMN services.price_net IS 'Cena netto w PLN';
COMMENT ON COLUMN services.price_gross IS 'Cena brutto w PLN';
COMMENT ON COLUMN services.category IS 'Kategoria usługi: removal, reset, monitoring';

-- Tabela dla zamówień usług jednorazowych
DROP TABLE IF EXISTS service_orders CASCADE;

CREATE TABLE service_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  
  -- Dane zamówienia
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_net DECIMAL(10,2) NOT NULL,
  unit_price_gross DECIMAL(10,2) NOT NULL,
  total_price_net DECIMAL(10,2) NOT NULL,
  total_price_gross DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PLN',
  
  -- Status zamówienia
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, paid, in_progress, completed, canceled
  
  -- Dane do realizacji
  target_url TEXT, -- URL opinii/profilu do usunięcia
  target_description TEXT, -- Opis celu
  additional_notes TEXT, -- Dodatkowe uwagi
  
  -- Daty
  ordered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Płatność
  payment_method VARCHAR(50),
  external_payment_id VARCHAR(255),
  invoice_number VARCHAR(50),
  
  -- Metadane
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indeksy dla service_orders
CREATE INDEX idx_service_orders_user_id ON service_orders(user_id);
CREATE INDEX idx_service_orders_service_id ON service_orders(service_id);
CREATE INDEX idx_service_orders_status ON service_orders(status);
CREATE INDEX idx_service_orders_ordered_at ON service_orders(ordered_at);

-- Dodanie foreign key do payment_history po utworzeniu tabeli payment_history
-- (wymaga uruchomienia po create_subscriptions.sql)
-- ALTER TABLE payment_history ADD CONSTRAINT fk_payment_history_service_order 
-- FOREIGN KEY (service_order_id) REFERENCES service_orders(id);

-- RLS dla service_orders
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own service orders" ON service_orders
  FOR ALL USING (auth.uid() = (SELECT auth_id FROM users WHERE users.id = service_orders.user_id));

-- Trigger dla updated_at
CREATE TRIGGER update_service_orders_updated_at
  BEFORE UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Komentarze dla service_orders
COMMENT ON TABLE service_orders IS 'Zamówienia usług jednorazowych';
COMMENT ON COLUMN service_orders.status IS 'Status: pending, paid, in_progress, completed, canceled';
COMMENT ON COLUMN service_orders.target_url IS 'URL opinii/profilu do obsługi';
