"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * MoneyField — the 3D hero backdrop.
 *
 * A few thousand transaction motes drift through depth along a rising current:
 * money in motion, converging into a trend. Slate for the mass of ordinary
 * spending, blue for income, emerald and amber for the categories that behave
 * and the ones that do not. Product-true, not a decorative blob.
 *
 * Restraint rules: no bloom, no neon glow, fog for depth instead of glass.
 * Reduced-motion users get nothing animated (the section's ink background and
 * type carry the composition alone). The scene pauses entirely offscreen and
 * caps pixel ratio on phones.
 */

const INK = 0x020617 // slate-950, matching the section background

const PALETTE = [
  { color: new THREE.Color('#64748b'), weight: 0.52 }, // slate — ordinary spend
  { color: new THREE.Color('#3b82f6'), weight: 0.22 }, // blue — income
  { color: new THREE.Color('#10b981'), weight: 0.14 }, // emerald — under plan
  { color: new THREE.Color('#f59e0b'), weight: 0.12 }, // amber — over plan
]

function pickColor(random: () => number): THREE.Color {
  const roll = random()
  let cumulative = 0
  for (const entry of PALETTE) {
    cumulative += entry.weight
    if (roll <= cumulative) return entry.color
  }
  return PALETTE[0].color
}

/** Soft round sprite so points render as motes, not squares. */
function makeSprite(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.55)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** The rising current the motes are drawn toward. */
function currentY(x: number): number {
  return Math.sin(x * 0.055) * 5 + x * 0.14
}

export function MoneyField({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const isSmall = window.innerWidth < 768
    const COUNT = isSmall ? 1300 : 2600

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(INK, 45, 110)

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
    camera.position.set(0, 2, 62)

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2))
    renderer.setClearColor(INK, 0) // section background shows through
    mount.appendChild(renderer.domElement)

    // Deterministic layout
    let seed = 11
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }

    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const speeds = new Float32Array(COUNT)
    const offsets = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i += 1) {
      const x = -90 + random() * 180
      const offset = (random() - 0.5) * 22
      positions[i * 3] = x
      positions[i * 3 + 1] = currentY(x) + offset
      positions[i * 3 + 2] = -38 + random() * 46

      const color = pickColor(random)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      speeds[i] = 2.4 + random() * 5.2
      offsets[i] = offset
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const sprite = makeSprite()
    const material = new THREE.PointsMaterial({
      size: 1.15,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    // Pointer parallax on desktop; a slow autonomous sway on touch
    const pointer = { x: 0, y: 0 }
    const onPointer = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    }
    if (!isSmall) mount.addEventListener('pointermove', onPointer)

    const resize = () => {
      const rect = mount.getBoundingClientRect()
      const width = Math.max(rect.width, 1)
      const height = Math.max(rect.height, 1)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
    }
    resize()

    let running = true
    let raf = 0
    let last = performance.now()
    let time = 0

    const frame = (now: number) => {
      if (!running) return
      const delta = Math.min((now - last) / 1000, 0.05)
      last = now
      time += delta

      const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute

      for (let i = 0; i < COUNT; i += 1) {
        let x = positionAttr.getX(i) + speeds[i] * delta
        if (x > 95) x = -95 // wrap and flow again

        // Drift toward the rising current while keeping each mote's own lane
        const targetY = currentY(x) + offsets[i] + Math.sin(time * 0.6 + i) * 0.35
        const y = positionAttr.getY(i) + (targetY - positionAttr.getY(i)) * Math.min(1, delta * 2)

        positionAttr.setX(i, x)
        positionAttr.setY(i, y)
      }
      positionAttr.needsUpdate = true

      if (isSmall) {
        camera.position.x = Math.sin(time * 0.12) * 3
        camera.position.y = 2 + Math.sin(time * 0.09) * 1.2
      } else {
        camera.position.x += (pointer.x * 4 - camera.position.x) * delta * 2
        camera.position.y += (2 - pointer.y * 2.5 - camera.position.y) * delta * 2
      }
      camera.lookAt(0, 4, 0)

      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    // Never render offscreen
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
    observer.observe(mount)

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      observer.disconnect()
      resizeObserver.disconnect()
      if (!isSmall) mount.removeEventListener('pointermove', onPointer)
      geometry.dispose()
      material.dispose()
      sprite.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className={className} aria-hidden="true" />
}

export default MoneyField
