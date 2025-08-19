import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Konfiguracja
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly_net: number;
  price_monthly_gross: number;
  price_yearly_net: number;
  price_yearly_gross: number;
  currency: string;
  max_companies: number;
  max_opinion_removals_monthly: number;
  has_negative_monitoring: boolean;
  has_weekly_reports: boolean;
  has_email_notifications: boolean;
  has_instant_notifications: boolean;
  additional_services_discount_percent: number;
  stripe_product_id?: string;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
}

async function createStripeProducts() {
  try {
    console.log('🚀 Rozpoczynam synchronizację planów z Stripe...');

    // Pobierz plany z bazy danych
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Błąd pobierania planów: ${error.message}`);
    }

    if (!plans || plans.length === 0) {
      throw new Error('Nie znaleziono aktywnych planów subskrypcyjnych');
    }

    console.log(`📋 Znaleziono ${plans.length} planów do synchronizacji`);

    for (const plan of plans as SubscriptionPlan[]) {
      console.log(`\n📦 Przetwarzam plan: ${plan.display_name}`);

      // Sprawdź czy produkt już istnieje
      let product: Stripe.Product;
      if (plan.stripe_product_id) {
        try {
          product = await stripe.products.retrieve(plan.stripe_product_id);
          console.log(`✅ Produkt już istnieje: ${product.id}`);
        } catch (error) {
          console.log(`❌ Produkt nie istnieje, tworzę nowy...`);
          product = await createProduct(plan);
        }
      } else {
        console.log(`🆕 Tworzę nowy produkt...`);
        product = await createProduct(plan);
      }

      // Utwórz lub zaktualizuj ceny
      const monthlyPrice = await createOrUpdatePrice(product, plan, 'month');
      const yearlyPrice = await createOrUpdatePrice(product, plan, 'year');

      // Zaktualizuj plan w bazie danych
      const { error: updateError } = await supabase
        .from('subscription_plans')
        .update({
          stripe_product_id: product.id,
          stripe_price_id_monthly: monthlyPrice.id,
          stripe_price_id_yearly: yearlyPrice.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', plan.id);

      if (updateError) {
        console.error(`❌ Błąd aktualizacji planu ${plan.name}:`, updateError);
        continue;
      }

      console.log(`✅ Plan ${plan.display_name} zsynchronizowany:`);
      console.log(`   🆔 Produkt: ${product.id}`);
      console.log(`   💰 Cena miesięczna: ${monthlyPrice.id}`);
      console.log(`   💰 Cena roczna: ${yearlyPrice.id}`);
    }

    console.log('\n🎉 Synchronizacja zakończona pomyślnie!');
  } catch (error) {
    console.error('❌ Błąd synchronizacji:', error);
    process.exit(1);
  }
}

async function createProduct(plan: SubscriptionPlan): Promise<Stripe.Product> {
  const features = [
    plan.max_companies === 1 
      ? 'Monitoring 1 firmy' 
      : plan.max_companies === 999 || plan.max_companies > 10
      ? 'Monitoring nielimitowany'
      : `Monitoring ${plan.max_companies} firm`,
    `${plan.max_opinion_removals_monthly} usuwań opinii miesięcznie`,
    ...(plan.has_negative_monitoring ? ['Monitoring negatywnych opinii'] : []),
    ...(plan.has_weekly_reports ? ['Tygodniowe raporty'] : []),
    ...(plan.has_email_notifications ? ['Powiadomienia email'] : []),
    ...(plan.has_instant_notifications ? ['Natychmiastowe powiadomienia'] : []),
    ...(plan.additional_services_discount_percent > 0 ? [`${plan.additional_services_discount_percent}% zniżki na dodatkowe usługi`] : []),
  ];

  const product = await stripe.products.create({
    name: plan.display_name,
    description: plan.description,
    metadata: {
      plan_id: plan.id,
      plan_name: plan.name,
      features: features.join(', '),
      max_companies: plan.max_companies.toString(),
      max_opinion_removals: plan.max_opinion_removals_monthly.toString(),
    },
  });

  return product;
}

async function createOrUpdatePrice(
  product: Stripe.Product, 
  plan: SubscriptionPlan, 
  interval: 'month' | 'year'
): Promise<Stripe.Price> {
  const isMonthly = interval === 'month';
  const amount = isMonthly ? plan.price_monthly_gross * 100 : plan.price_yearly_gross * 100;
  const existingPriceId = isMonthly ? plan.stripe_price_id_monthly : plan.stripe_price_id_yearly;

  // Sprawdź czy cena już istnieje
  if (existingPriceId) {
    try {
      const existingPrice = await stripe.prices.retrieve(existingPriceId);
      if (existingPrice.unit_amount === amount) {
        console.log(`✅ Cena ${interval} już istnieje i jest aktualna: ${existingPrice.id}`);
        return existingPrice;
      } else {
        console.log(`🔄 Cena ${interval} istnieje ale ma inną wartość, tworzę nową...`);
      }
    } catch {
      console.log(`❌ Cena ${interval} nie istnieje, tworzę nową...`);
    }
  }

  // Utwórz nową cenę
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: plan.currency.toLowerCase(),
    recurring: {
      interval: interval,
      interval_count: 1,
    },
    metadata: {
      plan_id: plan.id,
      plan_name: plan.name,
      billing_cycle: interval,
    },
  });

  console.log(`✅ Utworzono nową cenę ${interval}: ${price.id} (${amount / 100} ${plan.currency})`);
  return price;
}

// Funkcja do czyszczenia starych/nieużywanych produktów i cen
async function cleanupStripeProducts() {
  console.log('\n🧹 Rozpoczynam czyszczenie nieużywanych produktów...');

  try {
    // Pobierz wszystkie produkty z Stripe
    const products = await stripe.products.list({ limit: 100 });
    
    // Pobierz aktywne plany z bazy danych
    const { data: activePlans } = await supabase
      .from('subscription_plans')
      .select('stripe_product_id')
      .eq('is_active', true);

    const activeProductIds = activePlans?.map(p => p.stripe_product_id).filter(Boolean) || [];

    for (const product of products.data) {
      if (!activeProductIds.includes(product.id)) {
        console.log(`🗑️ Archiwizuję nieużywany produkt: ${product.name} (${product.id})`);
        
        // Archiwizuj produkt zamiast go usuwać (bezpieczniejsze)
        await stripe.products.update(product.id, { active: false });
        
        // Archiwizuj powiązane ceny
        const prices = await stripe.prices.list({ product: product.id });
        for (const price of prices.data) {
          if (price.active) {
            await stripe.prices.update(price.id, { active: false });
            console.log(`   🗑️ Archiwizuję cenę: ${price.id}`);
          }
        }
      }
    }

    console.log('✅ Czyszczenie zakończone');
  } catch (error) {
    console.error('❌ Błąd podczas czyszczenia:', error);
  }
}

// Główna funkcja
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'sync':
      await createStripeProducts();
      break;
    case 'cleanup':
      await cleanupStripeProducts();
      break;
    case 'full':
      await createStripeProducts();
      await cleanupStripeProducts();
      break;
    default:
      console.log(`
🔧 Skrypt synchronizacji Stripe

Użycie:
  npm run stripe:sync     - Synchronizuj plany z Stripe
  npm run stripe:cleanup  - Wyczyść nieużywane produkty
  npm run stripe:full     - Pełna synchronizacja + czyszczenie

Przed uruchomieniem upewnij się, że masz ustawione zmienne środowiskowe:
  - STRIPE_SECRET_KEY
  - NEXT_PUBLIC_SUPABASE_URL  
  - SUPABASE_SERVICE_ROLE_KEY
      `);
      break;
  }
}

// Sprawdź zmienne środowiskowe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Brak STRIPE_SECRET_KEY w zmiennych środowiskowych');
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Brak zmiennych Supabase w środowisku');
  process.exit(1);
}

main().catch(console.error);
