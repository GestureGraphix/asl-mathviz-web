'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import dynamic from 'next/dynamic'

const SignSpaceExplorer = dynamic(
  () => import('@/components/SignSpaceExplorer').then(m => ({ default: m.SignSpaceExplorer })),
  { ssr: false, loading: () => <div style={{ height: 430 }} /> }
)

const PROBE_STATS = [
  { comp: 'H', label: 'Handshape', acc: '52.2%', lift: '8.3×', color: '#3ea89f' },
  { comp: 'L', label: 'Location',  acc: '46.8%', lift: '5.6×', color: '#5090d8' },
  { comp: 'O', label: 'Orientation', acc: '49.4%', lift: '3.9×', color: '#8b7fd4' },
  { comp: 'M', label: 'Movement',  acc: '38.5%', lift: '3.5×', color: '#4dbb87' },
]

export function EmbeddingSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.08 })

  return (
    <section
      id="sign-space"
      ref={ref}
      style={{
        padding: '96px 40px',
        borderTop: '1px solid var(--rule)',
        background: 'var(--bg-base)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}
        >
          <span style={{
            fontFamily: 'var(--font-mono, DM Mono, monospace)',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--teal)',
          }}>§ 05</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--rule)' }} />
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-display, 'Bodoni Moda', Georgia, serif)",
            fontStyle: 'italic',
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 400,
            color: 'var(--ink)',
            marginBottom: 12,
            lineHeight: 1.15,
          }}
        >
          Emergent Sign Space
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: 'var(--font-ui, Figtree, sans-serif)',
            fontSize: 15,
            lineHeight: 1.65,
            color: 'var(--ink3)',
            maxWidth: 620,
            marginBottom: 40,
          }}
        >
          The model was trained only to name signs — it was never told what handshape,
          location, or movement meant. Yet when we project the 256-dim learned embedding
          for each of 2,279 signs into 3D, signs that share phonological features cluster
          together. The linguistic structure was there all along, hiding inside the weights.
        </motion.p>

        {/* Probe accuracy callouts */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          {PROBE_STATS.map(({ comp, label, acc, lift, color }) => (
            <div
              key={comp}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-surface)',
                border: '1px solid var(--rule)',
                borderRadius: 6,
                padding: '7px 13px',
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: color, flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'var(--font-mono, DM Mono, monospace)',
                fontSize: 10,
                color: 'var(--ink3)',
                letterSpacing: '0.04em',
              }}>
                {comp} · {label}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono, DM Mono, monospace)',
                fontSize: 10,
                color: 'var(--ink)',
                fontWeight: 600,
              }}>
                {acc}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono, DM Mono, monospace)',
                fontSize: 9,
                color: color,
                opacity: 0.85,
              }}>
                {lift} above chance
              </span>
            </div>
          ))}
        </motion.div>

        {/* Explorer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <SignSpaceExplorer />
        </motion.div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            fontFamily: 'var(--font-mono, DM Mono, monospace)',
            fontSize: 10,
            color: 'var(--ink5)',
            marginTop: 16,
            lineHeight: 1.6,
          }}
        >
          Linear probe accuracy on geometry-derived cluster labels. Chance: H 6.3% · L 8.3% · O 12.5% · M 11.1%.
          Embeddings extracted from the nb07 Transformer (80.8% top-1, 2,279 signs) with no phonological supervision.
        </motion.p>

      </div>
    </section>
  )
}
