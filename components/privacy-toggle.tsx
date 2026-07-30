"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

/**
 * Privacy mode: one tap blurs every monetary figure in the app.
 *
 * Amounts opt in by carrying the `font-numbers` or `tabular-nums` classes the
 * app already uses for money, so no page needs its own masking logic — the
 * toggle flips a class on <body> and CSS does the rest. The choice persists
 * and applies everywhere, because someone hiding numbers on the dashboard
 * doesn't want them visible one click later on the accounts page.
 */

const STORAGE_KEY = 'frem-hide-amounts'
const BODY_CLASS = 'privacy-hide'
const EVENT = 'frem-privacy-change'

function applyHidden(hidden: boolean) {
  document.body.classList.toggle(BODY_CLASS, hidden)
}

export function PrivacyToggle({ className }: { className?: string }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) === '1'
    setHidden(stored)
    applyHidden(stored)

    // Multiple toggle instances (dashboard header, accounts header) stay in sync
    const onChange = () => setHidden(document.body.classList.contains(BODY_CLASS))
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])

  const toggle = () => {
    const next = !document.body.classList.contains(BODY_CLASS)
    applyHidden(next)
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    setHidden(next)
    window.dispatchEvent(new Event(EVENT))
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={hidden ? 'Show amounts' : 'Hide amounts'}
      title={hidden ? 'Show amounts' : 'Hide amounts'}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors ${className ?? ''}`}
    >
      {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  )
}
