-- Tabela główna użytkowników (łączy się z auth.users)
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Podstawowe dane użytkownika
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  
  -- Status konta
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Preferencje
  language VARCHAR(10) DEFAULT 'pl',
  timezone VARCHAR(50) DEFAULT 'Europe/Warsaw',
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
  
  -- Metadane
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Ograniczenia
  UNIQUE(auth_id),
  UNIQUE(email)
);

-- Indeksy
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Polityka RLS - użytkownik może zarządzać tylko swoimi danymi
CREATE POLICY "Users can manage their own data" ON users
  FOR ALL USING (auth.uid() = auth_id);

-- Trigger do automatycznej aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Komentarze
COMMENT ON TABLE users IS 'Główna tabela użytkowników łącząca się z auth.users';
COMMENT ON COLUMN users.auth_id IS 'Klucz obcy do auth.users(id)';
COMMENT ON COLUMN users.notification_preferences IS 'Preferencje powiadomień w formacie JSON';
