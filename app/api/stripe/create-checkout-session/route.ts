import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/config';
import { getCustomerByEmail, createCustomer } from '@/lib/stripe/utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Sprawdź czy użytkownik jest zalogowany
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { planId, cycle = 'monthly', successUrl, cancelUrl } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Pobierz szczegóły planu z bazy danych
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Sprawdź czy klient już istnieje w Stripe
    let customer = await getCustomerByEmail(user.email!);
    
    // Jeśli nie istnieje, utwórz nowego klienta
    if (!customer) {
      customer = await createCustomer({
        email: user.email!,
        name: user.user_metadata?.full_name,
        userId: user.id,
        metadata: {
          userId: user.id,
        },
      });
    }

    // Określ cenę na podstawie cyklu
    const isYearly = cycle === 'yearly';
    const priceGross = isYearly ? plan.price_yearly_gross : plan.price_monthly_gross;
    const priceNet = isYearly ? plan.price_yearly_net : plan.price_monthly_net;
    const interval = isYearly ? 'year' : 'month';
    
    // Oblicz VAT
    const vatAmount = priceGross - priceNet;
    const vatRate = Math.round((vatAmount / priceNet) * 100); // VAT w procentach

    // Stwórz szczegółowy opis z rozbiciem cen
    const priceDescription = `

Netto: ${priceNet.toFixed(2)} ${plan.currency.toUpperCase()} 
VAT (${vatRate}%): ${vatAmount.toFixed(2)} ${plan.currency.toUpperCase()}

${plan.description}
    `.trim();

    // Utwórz produkt i cenę w Stripe dynamicznie
    const product = await stripe.products.create({
      name: `${plan.display_name} (${priceGross.toFixed(2)} ${plan.currency.toUpperCase()} brutto)`,
      description: priceDescription,
      metadata: {
        planId: plan.id,
        cycle: cycle,
        priceGross: priceGross.toString(),
        priceNet: priceNet.toString(),
        vatAmount: vatAmount.toString(),
        vatRate: vatRate.toString(),
      },
    });

    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(priceGross * 100), // cena brutto w groszach
      currency: plan.currency.toLowerCase(),
      recurring: {
        interval: interval,
      },
      metadata: {
        planId: plan.id,
        cycle: cycle,
        priceGross: priceGross.toString(),
        priceNet: priceNet.toString(),
        vatAmount: vatAmount.toString(),
        vatRate: vatRate.toString(),
      },
    });

    // Utwórz sesję checkout
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${request.nextUrl.origin}/dashboard?success=true`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/subscription?canceled=true`,
      metadata: {
        userId: user.id,
        planId: plan.id,
        cycle: cycle,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: plan.id,
          cycle: cycle,
        },
      },
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
