'use client'

import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

// ── Types ──────────────────────────────────────────────────────────

interface SignPoint {
  g: string
  p: [number, number, number]
  H: number
  L: number
  O: number
  M: number
}

interface SignSpaceData {
  signs: SignPoint[]
  k: Record<PhonComp, number>
  colors: Record<PhonComp, string[]>
}

type PhonComp = 'H' | 'L' | 'O' | 'M'

const COMP_LABELS: Record<PhonComp, string> = {
  H: 'Handshape',
  L: 'Location',
  O: 'Orientation',
  M: 'Movement',
}

// ── Background star field ──────────────────────────────────────────

function StarField() {
  const geo = useMemo(() => {
    const N = 900
    const phi = Math.PI * (3 - Math.sqrt(5))
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const y = (1 - (i / (N - 1)) * 2) * 3.2
      const r = Math.sqrt(Math.max(0, 3.2 * 3.2 - y * y))
      const t = phi * i
      pos[i * 3]     = r * Math.cos(t)
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = r * Math.sin(t)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  useEffect(() => () => { geo.dispose() }, [geo])

  return (
    <points geometry={geo}>
      <pointsMaterial size={0.016} color="#7dcfe0" sizeAttenuation transparent opacity={0.40} />
    </points>
  )
}

// ── Main 3D scene ──────────────────────────────────────────────────

interface GalaxySceneProps {
  data: SignSpaceData
  activeComp: PhonComp
}

function GalaxyScene({ data, activeComp }: GalaxySceneProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // BufferGeometry created once from sign positions
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(data.signs.length * 3)
    data.signs.forEach((s, i) => {
      pos[i * 3]     = s.p[0]
      pos[i * 3 + 1] = s.p[1]
      pos[i * 3 + 2] = s.p[2]
    })
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(data.signs.length * 3), 3))
    return g
  }, [data.signs])

  // Update vertex colors when active component changes
  useEffect(() => {
    const palette = data.colors[activeComp].map(h => new THREE.Color(h))
    const attr = geo.getAttribute('color')
    if (!(attr instanceof THREE.BufferAttribute)) return
    const arr = attr.array as Float32Array
    data.signs.forEach((s, i) => {
      const c = palette[s[activeComp]]
      arr[i * 3]     = c.r
      arr[i * 3 + 1] = c.g
      arr[i * 3 + 2] = c.b
    })
    attr.needsUpdate = true
  }, [geo, data, activeComp])

  useEffect(() => () => { geo.dispose() }, [geo])

  const hoveredSign = hoveredIdx !== null ? data.signs[hoveredIdx] : null

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHoveredIdx(e.index ?? null)
  }, [])

  const handlePointerOut = useCallback(() => setHoveredIdx(null), [])

  return (
    <>
      <ambientLight intensity={1.0} />
      <StarField />

      <points
        geometry={geo}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <pointsMaterial
          vertexColors
          size={0.046}
          sizeAttenuation
          transparent
          opacity={0.88}
          depthWrite={false}
        />
      </points>

      {hoveredSign !== null && hoveredIdx !== null && (
        <Html
          position={data.signs[hoveredIdx].p}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(5,13,22,0.92)',
            border: '1px solid rgba(125,207,224,0.28)',
            borderRadius: 5,
            padding: '5px 10px',
            whiteSpace: 'nowrap',
            transform: 'translateY(-30px)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              color: '#e8f4f8',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.02em',
            }}>
              {hoveredSign.g.replace(/_/g, ' ')}
            </div>
            <div style={{
              color: 'rgba(125,207,224,0.65)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 9,
              marginTop: 3,
              letterSpacing: '0.04em',
            }}>
              H:{hoveredSign.H} · L:{hoveredSign.L} · O:{hoveredSign.O} · M:{hoveredSign.M}
            </div>
          </div>
        </Html>
      )}

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        autoRotate={hoveredIdx === null}
        autoRotateSpeed={0.40}
        dampingFactor={0.10}
        enableDamping
      />
    </>
  )
}

// ── Public component ───────────────────────────────────────────────

export function SignSpaceExplorer() {
  const [data, setData] = useState<SignSpaceData | null>(null)
  const [activeComp, setActiveComp] = useState<PhonComp>('H')
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/data/sign_space_umap.json')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then((d: SignSpaceData) => setData(d))
      .catch((err: unknown) => { console.error('SignSpaceExplorer: failed to load sign_space_umap.json', err); setError(true) })
  }, [])

  if (error) {
    return (
      <div style={{
        height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink4)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12,
      }}>
        sign_space_umap.json not found — run nb10 cell nb10-export-3d first
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{
        height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink5)', fontFamily: 'var(--font-mono, monospace)', fontSize: 11,
      }}>
        loading sign space…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

      {/* Component toggle */}
      <div style={{ display: 'flex', gap: 6, paddingLeft: 2 }}>
        {(['H', 'L', 'O', 'M'] as PhonComp[]).map(comp => {
          const active = comp === activeComp
          return (
            <button
              key={comp}
              onClick={() => setActiveComp(comp)}
              style={{
                background: active ? 'rgba(125,207,224,0.12)' : 'transparent',
                border: `1px solid ${active ? '#7dcfe0' : 'rgba(125,207,224,0.25)'}`,
                borderRadius: 4,
                color: active ? '#7dcfe0' : 'var(--ink4)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 10,
                padding: '3px 9px',
                cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s, background 0.15s',
              }}
            >
              {comp} · {COMP_LABELS[comp]}
            </button>
          )
        })}
      </div>

      {/* 3D canvas */}
      <Canvas
        camera={{ position: [0, 0.5, 4.5], fov: 52 }}
        raycaster={{ params: { Mesh: {}, Line: { threshold: 1 }, LOD: {}, Sprite: {}, Points: { threshold: 0.06 } } as THREE.RaycasterParameters }}
        style={{
          width: '100%',
          height: 380,
          borderRadius: 6,
          background: '#050d16',
          cursor: 'grab',
          display: 'block',
          border: '1px solid rgba(0,0,0,0.14)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
        gl={{ antialias: true }}
      >
        <GalaxyScene data={data} activeComp={activeComp} />
      </Canvas>

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        paddingLeft: 2, paddingRight: 2,
      }}>
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 9, color: 'var(--ink5)' }}>
          drag · zoom · hover a sign
        </span>
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 9, color: 'var(--ink5)' }}>
          {data.signs.length} signs · UMAP of 256-dim learned embeddings · colored by {COMP_LABELS[activeComp]}
        </span>
      </div>

    </div>
  )
}
