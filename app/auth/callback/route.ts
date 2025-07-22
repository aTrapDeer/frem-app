import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Test endpoint to verify route is accessible
export async function POST(request: Request) {
  console.log('🧪 Test POST to callback route')
  return NextResponse.json({ message: 'Callback route is accessible', timestamp: new Date().toISOString() })
}

export async function GET(request: Request) {
  console.log('🚨 === CALLBACK ROUTE HIT ===')
  console.log('⏰ Time:', new Date().toISOString())
  console.log('🌐 Full URL:', request.url)
  
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('🔐 Auth callback - letting client handle OAuth:', {
    origin,
    next,
    allSearchParams: Object.fromEntries(searchParams.entries())
  })

  // Handle test requests
  const isTest = searchParams.get('test')
  if (isTest) {
    console.log('🧪 Test request detected - callback route is working!')
    return NextResponse.json({ 
      message: 'Callback route is accessible!', 
      timestamp: new Date().toISOString(),
      url: request.url 
    })
  }

  // Simply redirect to dashboard - let client-side Supabase handle the OAuth
  console.log('📤 Redirecting to dashboard, client will handle auth')
  return NextResponse.redirect(`${origin}${next}`)
} 