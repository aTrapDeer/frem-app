import { redirect } from 'next/navigation'

// This route is no longer needed with NextAuth
// NextAuth handles callbacks at /api/auth/callback/[provider]
// Keeping this for backward compatibility - redirects to dashboard
export async function GET() {
  redirect('/dashboard')
}
