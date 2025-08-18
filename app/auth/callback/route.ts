import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  
  console.log('Auth callback received:', { code: !!code, next, origin })

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('Exchange code result:', { error })
    
    if (!error) {
      // Pobierz dane użytkownika aby sprawdzić stan profilu
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('User after exchange:', { 
        userId: user?.id, 
        email: user?.email,
        profileCompleted: user?.user_metadata?.profile_completed 
      })
      
      if (user) {
        // Sprawdź czy profil jest uzupełniony
        if (user.user_metadata?.profile_completed) {
          // Profil uzupełniony - przekieruj na dashboard lub podaną stronę
          const redirectTo = next ?? '/dashboard'
          console.log('Redirecting to dashboard:', redirectTo)
          return NextResponse.redirect(`${origin}${redirectTo}`)
        } else {
          // Profil nie uzupełniony - przekieruj na uzupełnienie profilu
          console.log('Redirecting to complete-profile')
          return NextResponse.redirect(`${origin}/complete-profile`)
        }
      } else {
        // Brak użytkownika - błąd
        console.log('No user found after exchange')
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
      }
    } else {
      console.log('Exchange code error:', error)
    }
  } else {
    console.log('No code provided in callback')
  }

  // return the user to an error page with instructions
  console.log('Redirecting to auth error')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
