import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select(`
        *,
        stripe_price_id_monthly,
        stripe_price_id_yearly
      `)
      .eq('is_active', true)
      .order('price_monthly_gross', { ascending: true })

    if (error) {
      console.error('Error fetching subscription plans:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscription plans' },
        { status: 500 }
      )
    }

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
