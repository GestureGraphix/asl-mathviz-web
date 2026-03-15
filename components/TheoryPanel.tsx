"use client";

import katex from "katex";
import { memo } from "react";

// ── Pre-render helper (runs once at module load, never during render) ─────────

function renderTex(tex: string, block: boolean): string {
  try {
    return katex.renderToString(tex, { displayMode: block, throwOnError: false });
  } catch {
    return `<span>${tex}</span>`;
  }
}

function renderInlineLabel(label: string): string {
  return label.replace(/\\\((.*?)\\\)/g, (_, t) =>
    katex.renderToString(t, { throwOnError: false })
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = "live" | "partial" | "future";

interface Formula {
  label?: string;
  tex: string;
  note?: string;
  block?: boolean;
}

interface Section {
  ref: string;
  title: string;
  status: Status;
  accent: string;
  summary: string;
  formulas: Formula[];
}

// ── Paper sections ────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    ref: "§3",
    title: "Phonological Alphabet & Feature Extraction",
    status: "live",
    accent: "var(--mint)",
    summary:
      "Signs factorized into five simultaneous phonological parameters extracted frame-by-frame from MediaPipe landmarks with Sim(3)-invariance.",
    formulas: [
      {
        label: "Sim(3) normalization",
        tex: String.raw`\tilde{X}_t = \frac{(X_t - T_t)\,R_t^\top}{s_t}`,
        note: "sₜ = bi-shoulder width, Tₜ = shoulder midpoint, Rₜ = yaw rotation",
        block: true,
      },
      {
        label: "Handshape  \\(\\mathbf{u}^H_t \\in \\mathbb{R}^{16}\\)",
        tex: String.raw`\theta_{k,t} = \angle\!\bigl(\tilde{L}_t[4k{+}1] - \tilde{L}_t[0],\;\tilde{L}_t[4k{+}4] - \tilde{L}_t[4k{+}1]\bigr)`,
        note: "5 flexion + 3 spread angles per hand → 16-D",
        block: true,
      },
      {
        label: "Location  \\(\\mathbf{u}^L_t \\in \\mathbb{R}^{6}\\)",
        tex: String.raw`c^{L/R}_t = \tfrac{1}{5}\sum_{j \in \{0,5,9,13,17\}} \tilde{L/R}_t[j] \in \mathbb{R}^3`,
        block: true,
      },
      {
        label: "Orientation  \\(\\mathbf{u}^O_t \\in \\mathbb{R}^{6}\\)",
        tex: String.raw`n^{L/R}_t = \frac{(\tilde{L}_t[5]-\tilde{L}_t[0]) \times (\tilde{L}_t[17]-\tilde{L}_t[0])}{\|\cdot\|_2}`,
        note: "Unit palm normal via cross product",
        block: true,
      },
      {
        label: "Movement  \\(\\mathbf{u}^M_t \\in \\mathbb{R}^{18}\\)",
        tex: String.raw`\Delta c_t = c_t - c_{t-1},\quad \Delta^2 c_t = \Delta c_t - \Delta c_{t-1},\quad \Delta n_t = n_t - n_{t-1}`,
        note: "Velocity, acceleration, orientation velocity per hand",
        block: true,
      },
      {
        label: "Non-manual  \\(\\mathbf{u}^N_t \\in \\mathbb{R}^{5}\\)",
        tex: String.raw`g_t = \tfrac{1}{2}(F_t[33]+F_t[133]) - \tfrac{1}{2}(F_t[362]+F_t[263])`,
        note: "+ mouth aperture ‖F[61]−F[291]‖₂, brow height, head tilt",
        block: true,
      },
      {
        label: "Complete feature vector",
        tex: String.raw`f_t = [\mathbf{u}^H_t;\;\mathbf{u}^L_t;\;\mathbf{u}^O_t;\;\mathbf{u}^M_t;\;\mathbf{u}^N_t] \in \mathbb{R}^{51}`,
        block: true,
      },
      {
        label: "Product VQ sample complexity",
        tex: String.raw`\mathbb{E}[\mathrm{dist}(q_n)] - \mathrm{dist}(q^\star) = \tilde{\mathcal{O}}\!\left(\sum_j \sqrt{\frac{d_j \log k_j}{n}}\right) \;\ll\; \tilde{\mathcal{O}}\!\left(\sqrt{\frac{d \log K}{n}}\right)`,
        note: "Product VQ achieves equivalent quality with exponentially less data",
        block: true,
      },
    ],
  },

  {
    ref: "§4",
    title: "BiLSTM Encoder + VQ-VAE Extension",
    status: "partial",
    accent: "var(--sky)",
    summary:
      "BiLSTM with attention pooling runs inside the ONNX model. The VQ-VAE stage and CTC head are defined but not yet connected to learned codebooks.",
    formulas: [
      {
        label: "Attention pooling",
        tex: String.raw`e_t = w^\top \tanh(W_a h_t + b_a), \quad \alpha_t = \frac{\exp(e_t)}{\sum_\tau \exp(e_\tau)}, \quad c = \sum_{t=1}^{T} \alpha_t h_t`,
        note: "αₜ weights exposed live as the AttentionStrip visualization",
        block: true,
      },
      {
        label: "VQ-VAE commitment loss",
        tex: String.raw`\mathcal{L}_{\mathrm{VQ}} = \bigl\|\mathbf{u}^J - \mathrm{sg}[\mu^J_z]\bigr\|^2 + \beta\,\bigl\|\mathrm{sg}[\mathbf{u}^J] - \mu^J_z\bigr\|^2`,
        note: "β = 0.25; codebook updated via EMA with decay γ = 0.99",
        block: true,
      },
      {
        label: "CTC marginalisation",
        tex: String.raw`p(y \mid Z_{1:T}) = \sum_{\pi \in \mathcal{B}^{-1}(y)} \prod_{t=1}^{T} p(\pi_t \mid \mathbf{e}_t)`,
        note: "𝒷 collapses blanks and repeated labels; enables continuous signing",
        block: true,
      },
    ],
  },

  {
    ref: "§5",
    title: "Spatial Discourse Algebra",
    status: "future",
    accent: "var(--lav)",
    summary:
      "ASL grammar assigns discourse referents to loci on S². Pointing, agreement morphology, and body shifts retrieve referents via a formal referential algebra.",
    formulas: [
      {
        label: "Discourse state",
        tex: String.raw`\hat{\ell} \in \mathbb{S}^2, \qquad \mathcal{L}_t = \bigl\{ (r,\,\hat{\ell}_r) : r \in \mathcal{R}_t \bigr\}`,
        block: true,
      },
      {
        label: "Assignment operator",
        tex: String.raw`\mathcal{A}(r, \hat{\ell})\colon \quad \mathcal{L}_{t+1} = \mathcal{L}_t \cup \{(r, \hat{\ell})\}`,
        block: true,
      },
      {
        label: "Retrieval distribution",
        tex: String.raw`p(r \mid g(t)) \propto \exp\!\bigl(-\alpha\,\angle(g(t),\hat{\ell}_r)\bigr)\cdot p(r \mid \mathrm{context})`,
        block: true,
      },
      {
        label: "Deterministic uniqueness  (Lemma)",
        tex: String.raw`\angle(\hat{\ell}_1, \hat{\ell}_2) > 2\tau \implies |\Gamma_t(\tau)| \le 1`,
        note: "Proof via triangle inequality on S²; τ ≈ 2.3° at h = 8 cm, r = 1 m",
        block: true,
      },
      {
        label: "Probabilistic bound",
        tex: String.raw`\Pr\!\bigl[|\Gamma_t(\tau)| \le 1\bigr] \;\ge\; 1 - \tbinom{m}{2}\frac{1 - \cos 2\tau}{2}`,
        block: true,
      },
      {
        label: "Bayesian sensor fusion  (MAP)",
        tex: String.raw`\hat{r}_t = \operatorname*{arg\,max}_{r \in \mathcal{R}_t} \sum_{c \in C} \log p(c_t \mid r) + \log p(r \mid r_{t-1})`,
        note: "Cues C = { pointing, gaze, eyebrow, mouthing } — UMP by Neyman–Pearson",
        block: true,
      },
    ],
  },

  {
    ref: "§6",
    title: "Non-Associative Morphological Fusion",
    status: "future",
    accent: "var(--coral)",
    summary:
      "Classifier constructions (DRIVE-CAR, EAT-TACO) fuse verb and object signs via a role-sensitive binary operator ⊗ on Σ, proved non-associative.",
    formulas: [
      {
        label: "Fusion operator",
        tex: String.raw`s_1 \otimes s_2 := \bigl(f_H(H_1,H_2),\;f_L(L_1,L_2),\;f_O(O_1,O_2),\;f_M(M_1,M_2),\;f_N(N_1,N_2)\bigr)`,
        block: true,
      },
      {
        label: "Handshape fusion  \\(f_H\\)",
        tex: String.raw`f_H(H_v, H_o) = \begin{cases} \mathrm{SELECT}(H_v,\,\mathrm{Class}(H_o)) & H_v \in \mathcal{H}_{\mathrm{handle}} \\ H_o & \text{placement / \textsc{have}} \\ H_v & \text{otherwise} \end{cases}`,
        note: "e.g. SELECT(5-hand, vehicle) = S-hand",
        block: true,
      },
      {
        label: "Orientation fusion  \\(f_O\\)",
        tex: String.raw`f_O(O_v, O_o) = \mathrm{ROTATE}\!\bigl(O_v,\;\mathbf{n}_{\mathrm{obj}},\;\mathrm{AlignType}(\mathrm{Class}(H_o))\bigr)`,
        note: "Minimal rotation aligning handling hand with object geometry",
        block: true,
      },
      {
        label: "Movement fusion  \\(f_M\\)",
        tex: String.raw`f_M(M_v, M_o) = \begin{cases} M_v & M_v \in \mathcal{M}_{\mathrm{obj}} \\ \mathrm{PROJECT}(M_v,\,\mathcal{M}_{\mathrm{obj}}) & \text{otherwise} \end{cases}`,
        note: "Suppresses movements incompatible with object affordances",
        block: true,
      },
      {
        label: "Non-associativity  (Proposition)",
        tex: String.raw`\exists\;s_1,s_2,s_3 \in \Sigma : \;(s_1 \otimes s_2) \otimes s_3 \;\neq\; s_1 \otimes (s_2 \otimes s_3)`,
        note: "Role sensitivity: f(x,a) ≠ f(x,b) for some x,a,b breaks associativity",
        block: true,
      },
      {
        label: "Gated emission",
        tex: String.raw`\log p(z_{1:T} \mid s) = \sum_t \log\!\Bigl(\alpha_t\,p_{\mathrm{plain}}(z_t \mid s) + (1-\alpha_t)\,p_{\mathrm{morph}}(z_t \mid s)\Bigr), \quad \alpha_t = \sigma(w^\top h_t)`,
        block: true,
      },
      {
        label: "Bayes risk gain  (Theorem)",
        tex: String.raw`\Delta A = \rho\,\bigl(e_{\mathrm{fuse}}^{(0)} - e_{\mathrm{fuse}}^{(*)}\bigr) \;\ge\; \rho\,\delta_-(1-\eta_-) - (1-\rho)\,\delta_+\,\eta_+`,
        note: "ρ = fused-token fraction; η₋ miss rate, η₊ false-activation rate",
        block: true,
      },
    ],
  },

  {
    ref: "§7",
    title: "Temporal Segmentation",
    status: "partial",
    accent: "var(--teal)",
    summary:
      "Rest-state detection runs via a movement norm threshold. Formal phonological discontinuity scoring and CTC semi-Markov formulation are theoretical.",
    formulas: [
      {
        label: "Phonological discontinuity",
        tex: String.raw`\Delta^{\mathrm{phon}}_t = \sum_{J \in \{H,L,O,M,N\}} \mathbf{1}\!\left[Z^J_t \neq Z^J_{t+1}\right]`,
        note: "Boundary when Δᵖʰᵒⁿ ≥ τ; currently implemented as movNorm < 0.5 heuristic",
        block: true,
      },
      {
        label: "Boundary likelihood",
        tex: String.raw`p(\text{boundary at }t \mid Z) \propto \exp\!\Bigl(\beta_{\mathrm{disc}}\cdot\Delta^{\mathrm{phon}}_t - \beta_{\mathrm{dur}}\cdot(t - t_{\mathrm{prev}})^{-1}\Bigr)`,
        note: "Duration penalty enforces d_min ≈ 200 ms, d_max ≈ 2 s",
        block: true,
      },
      {
        label: "CTC as semi-Markov segmentation",
        tex: String.raw`p(y \mid Z_{1:T}) = \sum_{\mathrm{alignments}\;\pi} \prod_i p(y_i \mid Z_{\pi_i})\cdot p(d_i), \quad d_i \sim \mathrm{Geom}(p)`,
        block: true,
      },
      {
        label: "Segmentation identifiability  (Proposition)",
        tex: String.raw`\sigma^2_{\mathrm{noise}} < \frac{\delta^2}{4\log(1/\alpha)}\;\wedge\; d_{\min} \ge 3\tau_{\mathrm{ac}} \;\implies\; \Pr[\text{correct segmentation}] \ge 1-\alpha`,
        block: true,
      },
    ],
  },

  {
    ref: "§8",
    title: "WFST Decoding Cascade",
    status: "future",
    accent: "var(--sage)",
    summary:
      "Six composed weighted transducers integrate all knowledge sources into a single decodable graph with formal soundness and completeness proofs.",
    formulas: [
      {
        label: "Cascade",
        tex: String.raw`\boxed{H \;\circ\; C \;\circ\; M \;\circ\; D \;\circ\; L \;\circ\; G}`,
        note: "Observation · Coarticulation · Morphology · Discourse · Lexicon · Grammar",
        block: true,
      },
      {
        label: "Arc weight learning",
        tex: String.raw`\hat{w} = \operatorname*{arg\,min}_{w} \sum_{(Z,y)\in\mathcal{D}} -\log p(y \mid Z;\,w) + \lambda\|w\|^2`,
        note: "via forward-backward on H ∘ C ∘ L ∘ G",
        block: true,
      },
      {
        label: "Coarticulation likelihood gain  (Theorem)",
        tex: String.raw`\mathbb{E}\!\left[\log p(y \mid Z; C) - \log p(y \mid Z; C_{\mathrm{null}})\right] \;\ge\; \rho_{\mathrm{coart}}\cdot \mathrm{KL}(p_{\mathrm{coart}} \,\|\, p_{\mathrm{plain}})`,
        block: true,
      },
      {
        label: "Pruning-loss tail bound  (Lemma)",
        tex: String.raw`\Pr(\text{beam prunes gold in }T) \;\le\; T\exp\!\left(\frac{-\Delta^2}{2\nu^2}\right)`,
        note: "Δ = target log-score gap, ν = sub-exponential parameter",
        block: true,
      },
      {
        label: "Decoding cost",
        tex: String.raw`\mathcal{O}(T \cdot B \cdot \bar{d} \cdot c), \quad \bar{d} \in [4, 8]`,
        note: "T frames, B beam, d̄ avg out-degree, c per-arc cost",
        block: true,
      },
    ],
  },

  {
    ref: "§9",
    title: "Information-Theoretic Modality Selection",
    status: "future",
    accent: "var(--sky)",
    summary:
      "Mutual information chain-rule decomposition quantifies each modality's marginal contribution; Fano-type bounds set hard Bayes error floors.",
    formulas: [
      {
        label: "MI chain rule",
        tex: String.raw`\mathcal{I}(U;Y) = \mathcal{I}(H_{\mathrm{feat}};Y) + \mathcal{I}(F_{\mathrm{feat}};Y \mid H_{\mathrm{feat}}) + \mathcal{I}(B_{\mathrm{feat}};Y \mid H_{\mathrm{feat}}, F_{\mathrm{feat}})`,
        block: true,
      },
      {
        label: "Fano-type lower bound  (Theorem)",
        tex: String.raw`\Pr[\hat{Y} \neq Y] \;\ge\; \frac{H(Y) - \mathcal{I}(U;Y) - 1}{\log g}`,
        note: "g = vocabulary size; e.g. g = 50 → H(Y) ≈ 5.64 bits, min error ≥ 2.2%",
        block: true,
      },
      {
        label: "Modality inclusion stopping rule",
        tex: String.raw`\text{include modality }m \iff \frac{\Delta\mathrm{Err}_m}{C_m} \ge \lambda`,
        note: "Pareto-efficiency criterion on accuracy–latency frontier",
        block: true,
      },
      {
        label: "Data processing inequality",
        tex: String.raw`\mathcal{I}(Z;Y) \;\le\; \mathcal{I}(\phi(X);Y) \;\le\; \mathcal{I}(X;Y)`,
        note: "Quantized features lose no more MI than raw landmarks",
        block: true,
      },
    ],
  },

  {
    ref: "§10",
    title: "Joint Training & GradNorm Balancing",
    status: "future",
    accent: "var(--coral)",
    summary:
      "Multi-task objective combining CTC, segmentation, locus, and morphological gating losses with GradNorm-balanced SGD and a proved convergence rate.",
    formulas: [
      {
        label: "Total loss",
        tex: String.raw`\mathcal{L}_{\mathrm{total}} = \mathcal{L}_{\mathrm{CTC}} + \lambda_{\mathrm{seg}}\,\mathcal{L}_{\mathrm{seg}} + \lambda_{\mathrm{locus}}\,\mathcal{L}_{\mathrm{locus}} + \lambda_{\mathrm{morph}}\,\mathcal{L}_{\mathrm{morph}}`,
        block: true,
      },
      {
        label: "CTC loss",
        tex: String.raw`\mathcal{L}_{\mathrm{CTC}} = -\log \sum_{\pi \in \mathcal{B}^{-1}(y)} \prod_{t=1}^{T} p(\pi_t \mid \mathbf{e}_t)`,
        block: true,
      },
      {
        label: "Segmentation loss",
        tex: String.raw`\mathcal{L}_{\mathrm{seg}} = -\sum_t \bigl[b_t \log \hat{b}_t + (1-b_t)\log(1-\hat{b}_t)\bigr], \quad \hat{b}_t = \sigma(w_{\mathrm{seg}}^\top h_t)`,
        block: true,
      },
      {
        label: "Locus resolution loss",
        tex: String.raw`\mathcal{L}_{\mathrm{locus}} = -\!\!\sum_{t \in \mathcal{T}_{\mathrm{point}}} \log p(r_t^* \mid g(t), \mathcal{L}_t)`,
        block: true,
      },
      {
        label: "GradNorm weight update",
        tex: String.raw`\lambda_j^{(t+1)} = \lambda_j^{(t)} \cdot \exp\!\Bigl(\alpha \cdot \frac{\|\nabla_\theta \mathcal{L}_j\|}{\bar{G}}\Bigr), \qquad \bar{G} = \tfrac{1}{4}\sum_j \|\nabla_\theta \mathcal{L}_j\|`,
        block: true,
      },
      {
        label: "Convergence rate  (Theorem)",
        tex: String.raw`\mathbb{E}\!\left[\|\nabla \mathcal{L}_{\mathrm{total}}(\theta^*)\|\right] = \mathcal{O}\!\left(\frac{1}{\sqrt{T}}\right) \quad \text{with prob} \ge 1-\delta`,
        note: "Under Lipschitz losses, bounded gradient variance, and decaying learning rate",
        block: true,
      },
    ],
  },
];

// ── Pre-compute all KaTeX HTML once at module load (never during render) ──────

interface RenderedFormula {
  labelHtml: string | null;
  mathHtml: string;
  note: string | undefined;
  block: boolean;
}

interface RenderedSection {
  ref: string;
  title: string;
  status: Status;
  accent: string;
  summary: string;
  formulas: RenderedFormula[];
}

const STATUS_CONFIG: Record<Status, { label: string; bg: string; color: string; border: string }> = {
  live:    { label: "live",    bg: "rgba(77,187,135,0.14)",  color: "var(--mint)",  border: "var(--mint)"  },
  partial: { label: "partial", bg: "rgba(80,144,216,0.14)",  color: "var(--sky)",   border: "var(--sky)"   },
  future:  { label: "future",  bg: "rgba(176,171,161,0.12)", color: "var(--ink4)",  border: "var(--ink5)"  },
};

const RENDERED: RenderedSection[] = SECTIONS.map((s) => ({
  ...s,
  formulas: s.formulas.map((f) => ({
    labelHtml: f.label ? renderInlineLabel(f.label) : null,
    mathHtml:  renderTex(f.tex, f.block ?? true),
    note:      f.note,
    block:     f.block ?? true,
  })),
}));

// ── Pure render components (no computation inside) ────────────────────────────

function StatusPill({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      display: "inline-block",
      padding: "1px 7px",
      borderRadius: 999,
      border: `1px solid ${cfg.border}`,
      background: cfg.bg,
      color: cfg.color,
      fontFamily: "var(--font-mono, monospace)",
      fontSize: 9,
      letterSpacing: "0.06em",
      fontWeight: 500,
      textTransform: "uppercase",
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  );
}

function FormulaBlock({ formula }: { formula: RenderedFormula }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {formula.labelHtml && (
        <span
          style={{
            fontFamily: "var(--font-ui, Figtree, sans-serif)",
            fontSize: 9,
            color: "var(--ink4)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
          dangerouslySetInnerHTML={{ __html: formula.labelHtml }}
        />
      )}
      <div style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--rule)",
        borderRadius: 5,
        padding: "8px 12px",
        overflowX: "auto",
        lineHeight: 1.6,
      }}
        dangerouslySetInnerHTML={{ __html: formula.mathHtml }}
      />
      {formula.note && (
        <span style={{
          fontFamily: "var(--font-ui, Figtree, sans-serif)",
          fontSize: 9,
          color: "var(--ink4)",
          lineHeight: 1.45,
          paddingLeft: 2,
        }}>
          {formula.note}
        </span>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: RenderedSection }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 10,
      padding: "13px 13px",
      background: "var(--bg-base)",
      border: "1px solid var(--rule)",
      borderLeft: `3px solid ${section.accent}`,
      borderRadius: 6,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 10,
          color: section.accent,
          fontWeight: 600,
          letterSpacing: "0.04em",
          flexShrink: 0,
          marginTop: 1,
        }}>
          {section.ref}
        </span>
        <span style={{
          fontFamily: "var(--font-ui, Figtree, sans-serif)",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--ink2)",
          flex: 1,
          lineHeight: 1.4,
        }}>
          {section.title}
        </span>
        <StatusPill status={section.status} />
      </div>

      <p style={{
        fontFamily: "var(--font-ui, Figtree, sans-serif)",
        fontSize: 10,
        color: "var(--ink3)",
        lineHeight: 1.6,
      }}>
        {section.summary}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {section.formulas.map((f, i) => (
          <FormulaBlock key={i} formula={f} />
        ))}
      </div>
    </div>
  );
}

// ── Main export — memo so parent re-renders at 30 fps don't touch this ────────

export const TheoryPanel = memo(function TheoryPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        paddingBottom: 8,
        borderBottom: "1px solid var(--rule)",
      }}>
        {(["live", "partial", "future"] as Status[]).map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <StatusPill status={s} />
            <span style={{
              fontFamily: "var(--font-ui, Figtree, sans-serif)",
              fontSize: 9,
              color: "var(--ink4)",
            }}>
              {s === "live" ? "implemented" : s === "partial" ? "in ONNX model" : "theoretical · next steps"}
            </span>
          </div>
        ))}
      </div>

      <p style={{
        fontFamily: "var(--font-ui, Figtree, sans-serif)",
        fontSize: 9,
        color: "var(--ink4)",
        fontStyle: "italic",
        lineHeight: 1.55,
      }}>
        Hernandez Juarez, A. (2026). <em>Compositional Mathematical Linguistics for ASL: Formal
        Phonology, Spatial Discourse Algebra, Morphological Fusion, and Scalable Decoding.</em>
      </p>

      {RENDERED.map((s) => (
        <SectionCard key={s.ref} section={s} />
      ))}
    </div>
  );
});
