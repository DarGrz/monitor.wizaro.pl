-- Tabela dla danych rozliczeniowych użytkowników
DROP TABLE IF EXISTS billing_information CASCADE;

CREATE TABLE billing_information (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Dane rozliczeniowe
  company_name TEXT NOT NULL,
  nip VARCHAR(20) NOT NULL,
  regon VARCHAR(20),
  krs VARCHAR(20),
  
  -- Adres rozliczeniowy
  street TEXT NOT NULL,
  building_number VARCHAR(20) NOT NULL,
  apartment_number VARCHAR(20),
  city TEXT NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  
  -- Dane kontaktowe
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Status weryfikacji
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadane
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ograniczenia
  UNIQUE(user_id) -- Jeden użytkownik = jeden zestaw danych rozliczeniowych
);

-- Indeksy dla lepszej wydajności
CREATE INDEX idx_billing_information_user_id ON billing_information(user_id);
CREATE INDEX idx_billing_information_nip ON billing_information(nip);

-- RLS (Row Level Security)
ALTER TABLE billing_information ENABLE ROW LEVEL SECURITY;

-- Polityka RLS - użytkownik może zarządzać tylko swoimi danymi rozliczeniowymi
CREATE POLICY "Users can manage their own billing information" ON billing_information
  FOR ALL USING (auth.uid() = (SELECT auth_id FROM users WHERE users.id = billing_information.user_id));

-- Trigger do automatycznej aktualizacji updated_at
CREATE TRIGGER update_billing_information_updated_at
  BEFORE UPDATE ON billing_information
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Dodatkowe komentarze dla jasności
COMMENT ON TABLE billing_information IS 'Dane rozliczeniowe użytkowników - oddzielne od danych firm chronionych';
COMMENT ON COLUMN billing_information.company_name IS 'Nazwa firmy na fakturach';
COMMENT ON COLUMN billing_information.is_verified IS 'Czy dane zostały zweryfikowane przez administratora';
COMMENT ON COLUMN billing_information.verified_at IS 'Data weryfikacji danych przez administratora';
