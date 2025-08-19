// Test połączenia z bazą danych Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔧 Supabase URL:', supabaseUrl)
console.log('🔧 Supabase Key exists:', !!supabaseKey)

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Test basic connection
async function testConnection() {
  try {
    console.log('🔍 Testing basic connection...')
    
    // Test auth
    const { data: authData, error: authError } = await supabase.auth.getUser()
    console.log('👤 Auth test:', { authData, authError })
    
    // Test database access - sprawdź czy tabela subscription_plans istnieje
    console.log('🗄️ Testing database access...')
    
    // Sprawdź subscription_plans
    const { data: plansData, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .limit(1)
    
    console.log('📊 subscription_plans test:', { data: plansData, error: plansError })
    
    if (plansError) {
      console.error('❌ subscription_plans error:')
      console.error('- Code:', plansError.code)
      console.error('- Message:', plansError.message)
      console.error('- Details:', plansError.details)
      console.error('- Hint:', plansError.hint)
    }
    
    // Sprawdź user_subscriptions
    const { data: subsData, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .limit(1)
    
    console.log('📊 user_subscriptions test:', { data: subsData, error: subsError })
    
    // Sprawdź jakie tabele w ogóle istnieją
    console.log('🔍 Checking what tables exist...')
    const { data: tablesData, error: tablesError } = await supabase.rpc('get_tables')
    console.log('📋 Available tables:', { data: tablesData, error: tablesError })
    
  } catch (err) {
    console.error('💥 Test failed:', err)
  }
}

testConnection()
