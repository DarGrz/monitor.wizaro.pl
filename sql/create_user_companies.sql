-- Tabela dla danych firm użytkowników
CREATE TABLE user_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dane z GUS
  company_name TEXT NOT NULL,
  nip VARCHAR(10) NOT NULL,
  regon VARCHAR(14),
  krs VARCHAR(10),
  
  -- Adres firmy
  street TEXT,
  building_number VARCHAR(10),
  apartment_number VARCHAR(10),
  city TEXT,
  zip_code VARCHAR(6),
  
  -- Metadane
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Indeksy i ograniczenia
  UNIQUE(user_id), -- Jeden użytkownik = jedna firma
  UNIQUE(nip) -- Jeden NIP może być przypisany tylko do jednego użytkownika
);

-- Indeksy dla lepszej wydajności
CREATE INDEX idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX idx_user_companies_nip ON user_companies(nip);

-- RLS (Row Level Security)
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- Polityka RLS - użytkownik może zarządzać tylko swoją firmą
CREATE POLICY "Users can manage their own company" ON user_companies
  FOR ALL USING (auth.uid() = user_id);

-- Trigger do automatycznej aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_companies_updated_at
  BEFORE UPDATE ON user_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
