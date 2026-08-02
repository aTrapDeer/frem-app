import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { buildVoiceInstructions } from '@/lib/ai-prompt'
import { AI_CHAT_LIMIT, checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Latest realtime speech-to-speech model (July 2026): reasoning + low latency. */
const REALTIME_MODEL = 'gpt-realtime-2.1-mini'
const REALTIME_VOICE = 'marin'

/**
 * Mints an ephemeral client secret for a voice session with the coach.
 * The browser connects to OpenAI over WebRTC using this short-lived token —
 * the real API key never leaves the server, and model/voice/instructions
 * are pinned here so the client cannot override them.
 */
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Voice shares the text chat's budget — one coach, one limit
    const rateLimit = await checkRateLimit(session.user.id, AI_CHAT_LIMIT)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', details: `Try again after ${rateLimit.resetAt.toISOString()}` },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    const instructions = await buildVoiceInstructions(session.user.id)

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: REALTIME_MODEL,
          instructions,
          audio: { output: { voice: REALTIME_VOICE } },
        },
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('Realtime session mint failed:', response.status, detail.slice(0, 300))
      return NextResponse.json({ error: 'Could not start a voice session' }, { status: 502 })
    }

    const data = (await response.json()) as { value?: string; client_secret?: { value?: string } }
    const clientSecret = data.value ?? data.client_secret?.value
    if (!clientSecret) {
      return NextResponse.json({ error: 'Could not start a voice session' }, { status: 502 })
    }

    return NextResponse.json(
      { clientSecret, model: REALTIME_MODEL },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Error minting realtime session:', error)
    return NextResponse.json({ error: 'Could not start a voice session' }, { status: 500 })
  }
}
