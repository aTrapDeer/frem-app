import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { TursoAdapter } from '@/lib/auth-adapter'

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET is required. Please set it in your .env.local file')
}

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID is required. Please set it in your .env.local file')
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('GOOGLE_CLIENT_SECRET is required. Please set it in your .env.local file')
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: TursoAdapter(),
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      // Add user id to the session (for database strategy)
      if (session.user && user) {
        session.user.id = user.id
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after sign in
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith('/')) return `${baseUrl}${url}`
      return `${baseUrl}/dashboard`
    },
  },
  session: {
    strategy: 'database',
  },
  debug: process.env.NODE_ENV === 'development',
})
