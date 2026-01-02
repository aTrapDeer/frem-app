"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    console.log('🚨 Auth Error Page Loaded')
    console.log('🔗 Current URL:', window.location.href)
    console.log('📋 Search Params:', Object.fromEntries(searchParams.entries()))
    console.log('🕐 Timestamp:', new Date().toISOString())
  }, [searchParams])
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <CardTitle className="text-xl text-slate-900">Authentication Error</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-slate-600">
          There was an error signing you in. Please try again.
        </p>
        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link href="/">Try Again</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AuthError() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-pulse">Loading...</div>
          </CardContent>
        </Card>
      }>
        <AuthErrorContent />
      </Suspense>
    </div>
  )
} 