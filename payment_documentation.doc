# 💳 Integracja Systemu Płatności Stripe - Przewodnik Implementacji

## 🎯 Wprowadzenie

Ten dokument zawiera kompletną instrukcję implementacji systemu płatności Stripe wykorzystywanego w aplikacji Wizaro. System obsługuje automatyczne fakturowanie VAT, wieloetapowe formularze płatności oraz integrację z bazą danych Supabase.

## 🛠️ Architektura Systemu

### Główne Komponenty:
1. **Frontend Components** - Komponenty React do obsługi płatności
2. **API Endpoints** - Endpointy Next.js do komunikacji ze Stripe
3. **Webhook Handler** - Obsługa powiadomień od Stripe
4. **Database Integration** - Synchronizacja z Supabase

---

## 📋 Wymagania Systemowe

### Zależności NPM:
```json
{
  "stripe": "^16.12.0",
  "@supabase/supabase-js": "^2.38.4",
  "framer-motion": "^10.16.5"
}
```

### Zmienne Środowiskowe:
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase Configuration  
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# App Configuration
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

---

## 🎨 1. Frontend Components

### PaymentSection.tsx - Główny Komponent Płatności

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface PaymentSectionProps {
  orderId?: string;
  amount?: number; // kwota w złotych (np. 299)
  description?: string;
}

export default function PaymentSection({ 
  orderId, 
  amount = 299, 
  description = "Zapłać za swoją usługę" 
}: PaymentSectionProps) {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [nip, setNip] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Automatyczne ładowanie danych z localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) setEmail(savedEmail);

    // Ładowanie danych firmy z różnych źródeł
    const companyFormData = localStorage.getItem("companyFormData");
    const companyFormRemovalData = localStorage.getItem("companyFormRemovalData");
    
    let company = null;
    
    if (companyFormRemovalData) {
      try {
        company = JSON.parse(companyFormRemovalData);
      } catch (e) {
        console.error('Błąd parsowania danych firmy:', e);
      }
    } else if (companyFormData) {
      try {
        company = JSON.parse(companyFormData);
      } catch (e) {
        console.error('Błąd parsowania danych firmy:', e);
      }
    }

    if (company) {
      setCompanyName(company.name || '');
      setNip(company.nip || '');
      setAddress(company.street || '');
      setCity(company.city || '');
      setZipCode(company.zip || '');
    }
  }, []);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Zapisz email do localStorage
      localStorage.setItem('userEmail', email);
      
      // Zapisz dane firmy
      localStorage.setItem('companyName', companyName);
      localStorage.setItem('companyNip', nip);
      localStorage.setItem('companyAddress', address);
      localStorage.setItem('companyCity', city);
      localStorage.setItem('companyZipCode', zipCode);

      // Określ stronę powrotu
      const currentPath = window.location.pathname;
      const returnPage = currentPath.includes('/dziekuje') ? 'dziekuje' : 'thankyou';

      const amountInCents = Math.round(amount * 100);

      const response = await fetch('/api/payments/create-quick-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          amount: amountInCents,
          email: email,
          companyName: companyName,
          nip: nip,
          address: address,
          city: city,
          zipCode: zipCode,
          description: description,
          returnPage: returnPage
        })
      });

      if (!response.ok) {
        throw new Error('Błąd podczas tworzenia płatności');
      }

      const { url } = await response.json();
      
      // Wyczyść dane z localStorage po udanej płatności
      localStorage.removeItem('userEmail');
      localStorage.removeItem('companyFormRemovalData');
      localStorage.removeItem('companyFormData');
      
      // Przekieruj do Stripe
      window.location.href = url;
    } catch (error) {
      console.error('Błąd płatności:', error);
      alert('Wystąpił problem z płatnością. Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">💳 Płatność</h2>
        <p className="text-3xl font-bold text-blue-600">
          {amount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
        </p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      <form onSubmit={handlePayment} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Email (dla faktury VAT) *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="twoj@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Nazwa firmy *
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nazwa Twojej firmy"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            NIP
          </label>
          <input
            type="text"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1234567890"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">Miasto</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Warszawa"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kod pocztowy</label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="00-000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Adres</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ul. Przykładowa 123"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
        >
          {isLoading ? '⏳ Przekierowywanie...' : '💳 Zapłać bezpiecznie'}
        </button>
      </form>

      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-sm text-green-800">
          <strong>✅ Korzyści natychmiastowej płatności:</strong>
          <ul className="text-left text-xs mt-2 space-y-1">
            <li>• Priorytetowe wykonanie zlecenia</li>
            <li>• Bezpieczna szybka płatność</li>
            <li>• Szybsze informacje o postępach prac</li>
            <li>• Czas realizacji skrócony o ponad 50%</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## 🔌 2. API Endpoints

### 2.1. Create Quick Payment - `/api/payments/create-quick-payment/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not found');
      return NextResponse.json(
        { error: 'Błąd konfiguracji płatności' },
        { status: 500 }
      );
    }

    const requestBody = await request.json();
    
    const {
      amount, // kwota w groszach
      orderId,
      email,
      companyName,
      nip,
      address,
      city,
      zipCode,
      description = 'Natychmiastowa płatność za usługę',
      returnPage = 'thankyou',
    } = requestBody;

    // Walidacja podstawowych danych
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Nieprawidłowa kwota' },
        { status: 400 }
      );
    }

    if (!email || !companyName) {
      return NextResponse.json(
        { error: 'Email i nazwa firmy są wymagane' },
        { status: 400 }
      );
    }

    // Sprawdź czy klient już istnieje w Stripe
    let customer = null;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      // Utwórz nowego klienta
      customer = await stripe.customers.create({
        email: email,
        name: companyName,
        ...(address && { address: { line1: address, city, postal_code: zipCode } }),
        ...(nip && { vat_number: `PL${nip}` }),
        metadata: {
          company_name: companyName,
          ...(nip && { nip }),
          ...(nip && { vat_number: `PL${nip}` }),
          type: 'wizaro_client',
        },
      });
      
      // Dodaj tax_id automatycznie do klienta
      if (nip && customer) {
        try {
          await stripe.customers.createTaxId(customer.id, {
            type: 'eu_vat',
            value: `PL${nip}`,
          });
        } catch (taxError) {
          console.error('⚠️ Nie udało się dodać VAT ID:', taxError);
        }
      }
    }

    // Tworzenie sesji płatności Stripe
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'pln',
            product_data: {
              name: 'Płatność za usługę Wizaro.pl',
              description: description,
            },
            unit_amount: amount,
          },
          quantity: 1,
          // Dodanie tax rate dla polskiego VAT 23%
          ...(nip && {
            tax_rates: ['txr_1R7D3ILEJlt9ALSCyamMiFnX'] // Zastąp swoim tax rate ID
          }),
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success-payment?session_id={CHECKOUT_SESSION_ID}${orderId ? `&order_id=${orderId}` : ''}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${returnPage}?amount=${Math.round(amount / 100)}&description=${encodeURIComponent(description)}${orderId ? `&orderId=${orderId}` : ''}`,
      
      // Przypisanie klienta do sesji
      ...(customer ? { customer: customer.id } : { customer_email: email }),
      
      metadata: {
        ...(orderId && { order_id: orderId }),
        type: 'quick_payment',
        company_name: companyName,
        ...(nip && { nip }),
        ...(nip && { vat_number: `PL${nip}` }),
        ...(address && { address }),
        ...(city && { city }),
        ...(zipCode && { zip_code: zipCode }),
      },
      
      // Automatyczne wystawianie faktur
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: {
            ...(orderId && { order_id: orderId }),
            type: 'quick_payment',
            company_name: companyName,
            ...(nip && { nip }),
            ...(nip && { vat_number: `PL${nip}` }),
          },
          description: `Płatność za usługę Wizaro.pl - ${description}`,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('❌ Stripe payment error:', error);
    
    return NextResponse.json(
      { 
        error: 'Błąd podczas tworzenia płatności',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
```

### 2.2. Session Details - `/api/payments/session-details/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Pobierz szczegóły sesji ze Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'invoice']
    });

    // Sprawdź status płatności
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        status: session.payment_status,
        message: 'Płatność nie została zrealizowana'
      });
    }

    // Pobierz dane firmy z bazy danych na podstawie order_id lub email
    let companyData = null;
    
    if (orderId && session.metadata?.order_id === orderId) {
      const { data } = await supabase
        .from('documents')
        .select(`
          *,
          companies (
            name,
            first_name,
            last_name,
            email,
            phone,
            nip,
            street,
            city,
            zip
          )
        `)
        .eq('id', orderId)
        .single();
      
      companyData = data?.companies;
    }

    // Jeśli nie ma danych z bazy, użyj danych z sesji Stripe
    if (!companyData && session.customer) {
      const customer = session.customer as Stripe.Customer;
      companyData = {
        name: session.metadata?.company_name || customer.name,
        email: customer.email,
        nip: session.metadata?.nip,
        street: session.metadata?.address,
        city: session.metadata?.city,
        zip: session.metadata?.zip_code,
      };
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
        created: session.created,
      },
      company: companyData,
      invoice_url: session.invoice ? 
        await stripe.invoices.retrieve(session.invoice as string).then(inv => inv.hosted_invoice_url) 
        : null
    });

  } catch (error) {
    console.error('❌ Session details error:', error);
    return NextResponse.json(
      { error: 'Błąd podczas pobierania szczegółów płatności' },
      { status: 500 }
    );
  }
}
```

### 2.3. Webhook Handler - `/api/payments/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('✅ Payment successful for session:', session.id);

        // Aktualizuj status dokumentu na 'paid' w bazie danych
        if (session.metadata?.order_id) {
          const { error } = await supabase
            .from('documents')
            .update({ 
              status: 'paid',
              stripe_session_id: session.id,
              payment_date: new Date().toISOString()
            })
            .eq('id', session.metadata.order_id);

          if (error) {
            console.error('❌ Error updating document status:', error);
          } else {
            console.log('✅ Document status updated to paid');
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Payment failed for intent:', paymentIntent.id);
        break;
      }

      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('📄 Invoice finalized:', invoice.id);
        
        // Opcjonalnie: wyślij email z fakturą
        break;
      }

      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
```

---

## 📄 3. Success Page - `/app/success-payment/page.tsx`

```tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface PaymentDetails {
  success: boolean;
  session?: {
    id: string;
    payment_status: string;
    amount_total: number;
    currency: string;
    customer_email: string;
    created: number;
  };
  company?: {
    name: string;
    email: string;
    nip?: string;
    street?: string;
    city?: string;
    zip?: string;
  };
  invoice_url?: string;
}

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');

    if (!sessionId) {
      setError('Brak ID sesji płatności');
      setLoading(false);
      return;
    }

    const fetchPaymentDetails = async () => {
      try {
        const params = new URLSearchParams({ session_id: sessionId });
        if (orderId) params.append('order_id', orderId);

        const response = await fetch(`/api/payments/session-details?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Błąd podczas pobierania szczegółów płatności');
        }

        setPaymentDetails(data);
      } catch (err) {
        console.error('Błąd pobierania szczegółów płatności:', err);
        setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
        <p>Sprawdzanie statusu płatności...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl mb-4">❌ Błąd</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Powrót na stronę główną
        </Link>
      </div>
    );
  }

  if (!paymentDetails?.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-yellow-500 text-xl mb-4">⚠️ Płatność nieukończona</div>
        <p className="text-gray-600 mb-4">
          Status: {paymentDetails?.session?.payment_status || 'nieznany'}
        </p>
        <Link href="/" className="text-blue-600 hover:underline">
          Powrót na stronę główną
        </Link>
      </div>
    );
  }

  const { session, company, invoice_url } = paymentDetails;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4">
      <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
        <div className="text-green-500 text-6xl mb-4">✅</div>
        
        <h1 className="text-2xl font-bold mb-4">Płatność zakończona pomyślnie!</h1>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
          <h2 className="font-semibold mb-2">Szczegóły płatności:</h2>
          <p><strong>Kwota:</strong> {session?.amount_total ? (session.amount_total / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' }) : '—'}</p>
          <p><strong>Data:</strong> {session?.created ? new Date(session.created * 1000).toLocaleString('pl-PL') : '—'}</p>
          <p><strong>ID sesji:</strong> {session?.id}</p>
        </div>

        {company && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left">
            <h2 className="font-semibold mb-2">Dane do faktury:</h2>
            <p><strong>Firma:</strong> {company.name}</p>
            <p><strong>Email:</strong> {company.email}</p>
            {company.nip && <p><strong>NIP:</strong> {company.nip}</p>}
            {company.street && <p><strong>Adres:</strong> {company.street}</p>}
            {company.city && company.zip && <p><strong>Miasto:</strong> {company.zip} {company.city}</p>}
          </div>
        )}

        {invoice_url && (
          <div className="mb-6">
            <a
              href={invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-block"
            >
              📄 Pobierz fakturę
            </a>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Dziękujemy za zaufanie! Twoje zamówienie zostało przekazane do realizacji.
          </p>
          <p className="text-xs text-gray-500">
            Faktura VAT zostanie wysłana na podany adres email.
          </p>
        </div>

        <div className="mt-6">
          <Link 
            href="/" 
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Powrót na stronę główną
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}
```

---

## 🔧 4. Konfiguracja Stripe

### 4.1. Utworzenie Tax Rate (VAT 23%)

```bash
# Przez Stripe CLI lub Dashboard
stripe tax_rates create \
  --display_name="VAT 23%" \
  --percentage=23 \
  --inclusive=false \
  --country=PL \
  --description="Polish VAT 23%"
```

### 4.2. Konfiguracja Webhook

1. W Stripe Dashboard przejdź do **Webhooks**
2. Dodaj endpoint: `https://yourdomain.com/api/payments/webhook`
3. Wybierz eventy:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `invoice.finalized`
4. Skopiuj **Webhook Secret** do zmiennych środowiskowych

---

## 📊 5. Integracja z Bazą Danych

### 5.1. Struktura Tabeli `documents`

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  stripe_session_id TEXT,
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2. Struktura Tabeli `companies`

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  nip TEXT,
  street TEXT,
  city TEXT,
  zip TEXT,
  price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 6. Implementacja w Nowej Aplikacji

### Krok 1: Instalacja Zależności

```bash
npm install stripe @supabase/supabase-js framer-motion
```

### Krok 2: Konfiguracja Zmiennych

```bash
# .env.local
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
NEXT_PUBLIC_BASE_URL=https://...
```

### Krok 3: Kopiowanie Komponentów

1. Skopiuj `PaymentSection.tsx` do `components/`
2. Skopiuj endpointy API do `app/api/payments/`
3. Skopiuj stronę sukcesu do `app/success-payment/`

### Krok 4: Integracja w Formularzach

```tsx
// Przykład integracji w formularzu
const handleFormSubmit = async (formData) => {
  // Logika przetwarzania formularza...
  
  // Przekierowanie do płatności
  const searchParams = new URLSearchParams({
    amount: "299", // kwota w złotych
    description: "Opis usługi",
    orderId: "order-123" // opcjonalne
  });
  
  window.location.href = `/thankyou?${searchParams.toString()}`;
};
```

### Krok 5: Dodanie Płatności do Stron

```tsx
// thankyou/page.tsx lub podobna
import PaymentSection from '@/components/PaymentSection';
import { Suspense } from 'react';

export default function ThankYouPage() {
  const [showPayment, setShowPayment] = useState(false);
  
  return (
    <div>
      <h1>Dziękujemy!</h1>
      
      {!showPayment && (
        <button onClick={() => setShowPayment(true)}>
          💳 Zapłać od razu
        </button>
      )}
      
      {showPayment && (
        <Suspense fallback={<div>Ładowanie...</div>}>
          <PaymentSection 
            amount={299}
            description="Płatność za usługę"
          />
        </Suspense>
      )}
    </div>
  );
}
```

---

## 🛡️ 7. Bezpieczeństwo

### Zalecenia:
- Zawsze używaj HTTPS w production
- Weryfikuj webhook signature
- Nie przechowuj danych kart płatniczych
- Używaj Stripe Customer dla powtarzających się płatności
- Loguj wszystkie operacje płatności

### Walidacja po stronie serwera:
```typescript
// Przykład walidacji
const validatePaymentData = (data: any) => {
  if (!data.email || !data.email.includes('@')) {
    throw new Error('Nieprawidłowy email');
  }
  
  if (!data.amount || data.amount < 100) { // min 1 PLN
    throw new Error('Minimalna kwota to 1 PLN');
  }
  
  if (data.nip && !/^\d{10}$/.test(data.nip)) {
    throw new Error('NIP musi mieć 10 cyfr');
  }
};
```

---

## 🧪 8. Testowanie

### Testowe karty Stripe:
```
# Sukces
4242 4242 4242 4242

# Odrzucona karta
4000 0000 0000 0002

# Wymaga uwierzytelnienia
4000 0025 0000 3155
```

### Testowanie webhook lokalnie:
```bash
# Stripe CLI
stripe listen --forward-to localhost:3000/api/payments/webhook
stripe trigger checkout.session.completed
```

---

## 📝 9. Monitorowanie i Analytics

### Metryki do śledzenia:
- Współczynnik konwersji płatności
- Średnia wartość transakcji
- Czas od formularza do płatności
- Błędy płatności według typów

### Implementacja logowania:
```typescript
// lib/analytics.ts
export const trackPaymentEvent = (event: string, data: any) => {
  console.log(`Payment Event: ${event}`, data);
  
  // Integracja z Google Analytics, Mixpanel, etc.
  if (typeof gtag !== 'undefined') {
    gtag('event', event, {
      event_category: 'payment',
      value: data.amount,
      currency: 'PLN'
    });
  }
};
```

---

## 🎉 10. Gotowe!

System płatności jest teraz gotowy do użycia w nowej aplikacji. Pamiętaj o:

✅ Testowaniu wszystkich scenariuszy płatności  
✅ Konfiguracji webhooków w production  
✅ Monitorowaniu błędów i wydajności  
✅ Regularnej aktualizacji bibliotek  
✅ Backup'ie kluczy API  

---

## 📞 Wsparcie

W przypadku problemów sprawdź:
1. **Logi Stripe Dashboard** - szczegóły błędów płatności
2. **Webhook logs** - czy eventy są prawidłowo odbierane
3. **Browser Console** - błędy JavaScript
4. **Server logs** - błędy API endpoints

---

*Dokument utworzony: 2025*  
*Ostatnia aktualizacja: Compatible z Stripe API 2025-07-30.basil*