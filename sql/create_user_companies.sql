-- Tabela dla danych firm chronionych przez użytkowników
DROP TABLE IF EXISTS user_companies CASCADE;

CREATE TABLE user_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Dane firmy chronionej (z GUS)
  company_name TEXT NOT NULL,
  nip VARCHAR(20) NOT NULL, -- Zwiększone dla bezpieczeństwa
  regon VARCHAR(20), -- Zwiększone dla bezpieczeństwa  
  krs VARCHAR(20), -- Zwiększone dla bezpieczeństwa
  
  -- Adres firmy
  street TEXT,
  building_number VARCHAR(20), -- Zwiększone dla długich numerów
  apartment_number VARCHAR(20), -- Zwiększone dla długich numerów
  city TEXT,
  zip_code VARCHAR(10), -- Zwiększone dla formatów z myślnikiem
  
  -- Metadane
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ograniczenia
  UNIQUE(user_id) -- Jeden użytkownik = jedna firma chroniona
  -- Usunięto UNIQUE(nip) - jedna firma może być chroniona przez wielu użytkowników
);

-- Indeksy dla lepszej wydajności
CREATE INDEX idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX idx_user_companies_nip ON user_companies(nip);

-- RLS (Row Level Security)
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- Polityka RLS - użytkownik może zarządzać tylko swoją firmą chronioną
CREATE POLICY "Users can manage their own protected company" ON user_companies
  FOR ALL USING (auth.uid() = (SELECT auth_id FROM users WHERE users.id = user_companies.user_id));

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
