// Strona sukcesu po udanej subskrypcji Stripe
// Bazuje na /app/success-payment/page.tsx z dokumentacji ale dla subskrypcji

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface SubscriptionDetails {
  success: boolean;
  session?: {
    id: string;
    subscription_id?: string;
    customer_id?: string;
    created: number;
  };
  subscription?: {
    id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    plan: {
      id: string;
      nickname?: string;
      amount: number;
      currency: string;
      interval: string;
    };
  };
  customer?: {
    email: string;
    name?: string;
  };
}

function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setError('Brak ID sesji płatności');
      setLoading(false);
      return;
    }

    const fetchSubscriptionDetails = async () => {
      try {
        const response = await fetch(`/api/stripe/session-details?session_id=${sessionId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Błąd podczas pobierania szczegółów subskrypcji');
        }

        setSubscriptionDetails(data);
      } catch (err) {
        console.error('Błąd pobierania szczegółów subskrypcji:', err);
        setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionDetails();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
        <p>Sprawdzanie statusu subskrypcji...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl mb-4">❌ Błąd</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link href="/subscription" className="text-blue-600 hover:underline">
          Powrót do subskrypcji
        </Link>
      </div>
    );
  }

  if (!subscriptionDetails?.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-yellow-500 text-xl mb-4">⚠️ Subskrypcja nieukończona</div>
        <p className="text-gray-600 mb-4">
          Subskrypcja nie została pomyślnie utworzona.
        </p>
        <Link href="/subscription" className="text-blue-600 hover:underline">
          Spróbuj ponownie
        </Link>
      </div>
    );
  }

  const { session, subscription, customer } = subscriptionDetails;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
        <div className="text-green-500 text-6xl mb-4">🎉</div>
        
        <h1 className="text-2xl font-bold mb-4">Subskrypcja aktywowana!</h1>
        
        <p className="text-gray-600 mb-6">
          Twoja subskrypcja Monitor Wizaro została pomyślnie utworzona. 
          Możesz już korzystać ze wszystkich funkcji dostępnych w Twoim planie.
        </p>

        {subscription && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left">
            <h2 className="font-semibold mb-2">Szczegóły subskrypcji:</h2>
            <p><strong>Plan:</strong> {subscription.plan.nickname || `${subscription.plan.id} ${subscription.plan.interval}`}</p>
            <p><strong>Cena:</strong> {(subscription.plan.amount / 100).toLocaleString('pl-PL', { style: 'currency', currency: subscription.plan.currency.toUpperCase() })}/{subscription.plan.interval === 'month' ? 'miesiąc' : 'rok'}</p>
            <p><strong>Status:</strong> <span className="text-green-600 font-medium">Aktywna</span></p>
            <p><strong>Następna płatność:</strong> {new Date(subscription.current_period_end).toLocaleDateString('pl-PL')}</p>
          </div>
        )}

        {customer && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
            <h2 className="font-semibold mb-2">Dane konta:</h2>
            <p><strong>Email:</strong> {customer.email}</p>
            {customer.name && <p><strong>Nazwa:</strong> {customer.name}</p>}
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-green-800">
            <strong>✅ Co teraz?</strong>
            <ul className="text-left text-sm mt-2 space-y-1">
              <li>• Przejdź do panelu, aby rozpocząć korzystanie z usług</li>
              <li>• Sprawdź swoje ustawienia powiadomień</li>
              <li>• W razie pytań skontaktuj się z naszym wsparciem</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <Link 
            href="/dashboard" 
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Przejdź do panelu
          </Link>
          
          <Link 
            href="/subscription/manage" 
            className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Zarządzaj subskrypcją
          </Link>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>ID subskrypcji: {subscription?.id}</p>
          {session && <p>ID sesji: {session.id}</p>}
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}