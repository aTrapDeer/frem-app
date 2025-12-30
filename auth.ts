import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { TursoAdapter } from '@/lib/auth-adapter'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: TursoAdapter(),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      // Add user id to the session
      if (session.user) {
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

