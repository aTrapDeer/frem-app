"use client"

import { useCallback, useEffect, useState } from "react"
import { usePlaidLink } from "react-plaid-link"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"

interface PlaidLinkButtonProps {
  entity: 'personal' | 'business'
  entityLabel?: string | null
  onLinked: () => void
  onError?: (message: string) => void
  disabled?: boolean
}

/**
 * Launches Plaid Link and hands the resulting public token to the server.
 *
 * The public token is single-use and short-lived; it is exchanged server-side for
 * the long-lived access token, which never reaches the browser.
 */
export function PlaidLinkButton({
  entity,
  entityLabel,
  onLinked,
  onError,
  disabled,
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [exchanging, setExchanging] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchLinkToken() {
      try {
        const response = await fetch('/api/plaid/link-token', { method: 'POST' })
        const data = await response.json()

        if (cancelled) return

        if (!response.ok) {
          setTokenError(data.details || data.error || 'Could not reach Plaid')
          return
        }

        setLinkToken(data.linkToken)
      } catch {
        if (!cancelled) setTokenError('Could not reach Plaid')
      }
    }

    fetchLinkToken()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSuccess = useCallback(
    async (publicToken: string | null) => {
      // Link can report success without a token in some OAuth re-entry flows
      if (!publicToken) {
        onError?.('Plaid did not return a token — please try again')
        return
      }

      setExchanging(true)
      try {
        const response = await fetch('/api/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicToken, entity, entityLabel }),
        })

        const data = await response.json()

        if (!response.ok) {
          onError?.(data.details || data.error || 'Failed to link account')
          return
        }

        onLinked()
      } catch {
        onError?.('Failed to link account')
      } finally {
        setExchanging(false)
      }
    },
    [entity, entityLabel, onLinked, onError]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
  })

  if (tokenError) {
    return (
      <div className="text-sm text-red-600 py-2">
        {tokenError}
      </div>
    )
  }

  const busy = exchanging || !ready || !linkToken

  return (
    <Button
      onClick={() => open()}
      disabled={disabled || busy}
      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
    >
      {exchanging ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Linking...
        </>
      ) : !ready || !linkToken ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Preparing...
        </>
      ) : (
        <>
          <Plus className="w-4 h-4 mr-2" />
          Connect {entity === 'business' ? 'business' : 'personal'} bank
        </>
      )}
    </Button>
  )
}
