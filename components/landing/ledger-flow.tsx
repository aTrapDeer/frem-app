"use client"

import { useEffect, useRef } from "react"

/**
 * LedgerFlow — the hero animation.
 *
 * Transactions drift in from the right as small marks, sort themselves into
 * category lanes, land in a ledger where their category bar grows, and a
 * measured line draws itself against a dotted plan line below. It is the
 * product in one picture: money arrives, gets classified, and the truth gets
 * drawn next to the guess.
 *
 * Hand-built canvas, ~zero dependency weight. Respects prefers-reduced-motion
 * (renders a single static frame) and pauses entirely when scrolled offscreen.
 */

type Particle = {
  lane: number
  /** 0..1 progress along the lane path */
  t: number
  speed: number
  size: number
}

const LANES = [
  { color: '#2563eb', label: 'Income' },        // blue-600
  { color: '#475569', label: 'Housing' },       // slate-600
  { color: '#059669', label: 'Groceries' },     // emerald-600
  { color: '#d97706', label: 'Dining' },        // amber-600
  { color: '#7c3aed', label: 'Business' },      // violet-600 (entity, used sparingly)
]

/** Deterministic pseudo-random so the static reduced-motion frame is stable. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function LedgerFlow({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const random = mulberry32(7)

    let width = 0
    let height = 0
    let raf = 0
    let running = true
    let elapsed = reducedMotion ? 4000 : 0

    const particles: Particle[] = []
    const bars = LANES.map(() => 12)
    // The measured line's control points accumulate as time passes
    const measured: number[] = []

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const laneY = (lane: number) => height * 0.14 + lane * (height * 0.5 / (LANES.length - 1))

    /** Gentle S-curve from the right edge to the ledger axis. */
    const lanePoint = (lane: number, t: number) => {
      const startX = width + 12
      const endX = width * 0.34
      const startY = height * 0.05 + ((lane * 37) % 60) - 30 + height * 0.3
      const endY = laneY(lane)
      const x = startX + (endX - startX) * t
      const ease = t * t * (3 - 2 * t)
      return { x, y: startY + (endY - startY) * ease }
    }

    const spawn = () => {
      const lane = Math.floor(random() * LANES.length)
      particles.push({
        lane,
        t: 0,
        speed: 0.0028 + random() * 0.0035,
        size: 3 + random() * 3.5,
      })
    }

    const draw = (delta: number) => {
      elapsed += delta
      context.clearRect(0, 0, width, height)

      const axisX = width * 0.32

      // Ledger axis
      context.strokeStyle = '#e2e8f0'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(axisX, height * 0.08)
      context.lineTo(axisX, height * 0.68)
      context.stroke()

      // Category bars, left of the axis
      LANES.forEach((laneDef, index) => {
        const y = laneY(index)
        const barWidth = bars[index]

        context.fillStyle = laneDef.color
        context.globalAlpha = 0.9
        context.beginPath()
        context.roundRect(axisX - barWidth - 8, y - 5, barWidth, 10, 3)
        context.fill()
        context.globalAlpha = 1

        context.fillStyle = '#64748b'
        context.font = '10px var(--font-dm-sans), sans-serif'
        context.textAlign = 'right'
        context.fillText(laneDef.label, axisX - barWidth - 14, y + 3)

        // Bars breathe back down so the composition never saturates
        bars[index] = Math.max(12, bars[index] - delta * 0.004)
      })

      // Particles
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index]
        particle.t += particle.speed * delta * 0.06

        if (particle.t >= 1) {
          bars[particle.lane] = Math.min(width * 0.16, bars[particle.lane] + 7)
          particles.splice(index, 1)
          continue
        }

        const point = lanePoint(particle.lane, particle.t)
        context.fillStyle = LANES[particle.lane].color
        context.globalAlpha = 0.25 + particle.t * 0.75
        context.beginPath()
        context.roundRect(point.x, point.y, particle.size * 1.8, particle.size, 2)
        context.fill()
        context.globalAlpha = 1
      }

      // Plan line (dotted) and measured line (solid) along the bottom
      const chartTop = height * 0.76
      const chartBottom = height * 0.94
      const chartLeft = width * 0.08
      const chartRight = width * 0.94

      context.strokeStyle = '#cbd5e1'
      context.setLineDash([3, 5])
      context.lineWidth = 1.5
      context.beginPath()
      context.moveTo(chartLeft, chartTop + (chartBottom - chartTop) * 0.42)
      context.lineTo(chartRight, chartTop + (chartBottom - chartTop) * 0.42)
      context.stroke()
      context.setLineDash([])

      // Measured wanders honestly around the plan
      const target = Math.min(1, elapsed / 9000)
      const points = Math.floor(48 * target)
      while (measured.length < points) {
        const i = measured.length
        const wave =
          Math.sin(i * 0.55) * 0.16 +
          Math.sin(i * 0.21 + 2) * 0.22 +
          (i > 30 ? -0.12 : 0.06)
        measured.push(0.42 - wave * 0.8)
      }

      if (measured.length > 1) {
        context.strokeStyle = '#0f172a'
        context.lineWidth = 2
        context.beginPath()
        measured.forEach((value, i) => {
          const x = chartLeft + ((chartRight - chartLeft) * i) / 47
          const y = chartTop + (chartBottom - chartTop) * Math.min(0.98, Math.max(0.02, value))
          if (i === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        })
        context.stroke()

        // Live tip
        const lastIndex = measured.length - 1
        const tipX = chartLeft + ((chartRight - chartLeft) * lastIndex) / 47
        const tipY = chartTop + (chartBottom - chartTop) * Math.min(0.98, Math.max(0.02, measured[lastIndex]))
        context.fillStyle = '#0f172a'
        context.beginPath()
        context.arc(tipX, tipY, 3, 0, Math.PI * 2)
        context.fill()
      }

      // Legend for the chart, set once
      context.fillStyle = '#94a3b8'
      context.font = '10px var(--font-dm-sans), sans-serif'
      context.textAlign = 'left'
      context.fillText('planned', chartLeft, chartTop - 6)
      context.fillStyle = '#0f172a'
      context.fillText('measured', chartLeft + 52, chartTop - 6)
    }

    resize()

    if (reducedMotion) {
      // One meaningful static frame: mid-animation composition
      for (let i = 0; i < 26; i += 1) {
        spawn()
        const particle = particles[particles.length - 1]
        particle.t = random()
      }
      bars.forEach((_, index) => {
        bars[index] = 20 + random() * 40
      })
      draw(0)
      return
    }

    let last = performance.now()
    let spawnClock = 0

    const frame = (now: number) => {
      if (!running) return
      const delta = Math.min(now - last, 48)
      last = now

      spawnClock += delta
      if (spawnClock > 260 && particles.length < 26) {
        spawnClock = 0
        spawn()
      }

      draw(delta)
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    // Never burn frames offscreen
    const observer = new IntersectionObserver(entries => {
      const visible = entries[0]?.isIntersecting ?? true
      if (visible && !running) {
        running = true
        last = performance.now()
        raf = requestAnimationFrame(frame)
      } else if (!visible) {
        running = false
        cancelAnimationFrame(raf)
      }
    })
    observer.observe(canvas)

    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
