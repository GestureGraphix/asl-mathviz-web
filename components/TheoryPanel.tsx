"use client";

import { renderTex, tex } from "@/lib/tex";
import { memo } from "react";

function renderInlineLabel(label: string): string {
  return label.replace(/\\\((.*?)\\\)/g, (_, t) => tex(t));
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
    ref: "§1",
    title: "Extended Bimanual Phonological Alphabet",
    status: "live",
    accent: "var(--mint)",
    summary:
      "Signs described as 9-tuples in Σ_B — extending the basic HLOM alphabet to capture dominant/non-dominant handshapes, contact, handshape change, path geometry, and movement manner. The Battison Dominance Constraint reduces the attested bimanual space by 4×.",
    formulas: [
      {
        label: "Basic phonological alphabet",
        tex: String.raw`s = (H,\, L,\, O,\, M,\, N) \;\in\; \Sigma_H \times \Sigma_L \times \Sigma_O \times \Sigma_M \times \Sigma_N =: \Sigma`,
        note: "|Σ_H| ≈ 35, |Σ_L| ≈ 22, |Σ_O| ≈ 14, |Σ_M| ≈ 25, |Σ_N| ≈ 18",
        block: true,
      },
      {
        label: "Extended bimanual alphabet \\(\\Sigma_B\\)",
        tex: String.raw`B = \bigl(H^d,\; H^n,\; \kappa,\; \Delta_H,\; L,\; O,\; M_{\mathrm{path}},\; M_{\mathrm{manner}},\; N\bigr) \;\in\; \Sigma_B`,
        note: "H^d dominant / H^n non-dominant handshape, κ contact flag, Δ_H change record, M_path ∈ {str, arc, circ, rep}, M_manner ∈ {smo, tri, hld}",
        block: true,
      },
      {
        label: "Battison Dominance Constraint",
        tex: String.raw`H^n \in \Sigma_0 = \{\mathrm{B},\,\mathrm{A},\,\mathrm{S},\,\mathrm{C},\,\mathrm{O},\,5,\,\mathrm{G},\ldots\},\quad |\Sigma_0| = 8`,
        note: "In any attested asymmetric bimanual sign (H^d ≠ H^n), the non-dominant hand uses only an unmarked base handshape",
        block: true,
      },
      {
        label: "Attested bimanual space reduction",
        tex: String.raw`|\Sigma_H|(1 + |\Sigma_0|) = 35 \times 9 = 315 \;\ll\; |\Sigma_H|^2 = 1225`,
        note: "Constraint reduces the sign space by 4×, enabling efficient grading without ML",
        block: true,
      },
    ],
  },

  {
    ref: "§2",
    title: "Mobile Sim(3) Normalization",
    status: "live",
    accent: "var(--sky)",
    summary:
      "Two-stage normalization for mobile capture: IMU pre-rotation removes camera pitch/roll using the phone accelerometer's gravity vector; then anchor-frame normalization is case-split on sign type — shoulder-anchored for two-handed, face-anchored for one-handed.",
    formulas: [
      {
        label: "IMU pre-rotation  \\(R_t^{\\mathrm{imu}}\\)",
        tex: String.raw`R_t^{\mathrm{imu}} = I + [\mathbf{v}]_\times + [\mathbf{v}]_\times^2 \cdot \frac{1}{1+c}, \qquad \mathbf{v} = \mathbf{g}_t^{\mathrm{dev}} \times \hat{y},\quad c = \mathbf{g}_t^{\mathrm{dev}} \cdot \hat{y}`,
        note: "g^dev = unit gravity vector from phone accelerometer; ŷ = world down-axis; removes camera tilt at zero compute cost",
        block: true,
      },
      {
        label: "Gravity-corrected landmarks",
        tex: String.raw`X_t^{\mathrm{gc}} = X_t\,(R_t^{\mathrm{imu}})^\top`,
        block: true,
      },
      {
        label: "Two-handed Sim(3)  (phone propped, \\(H^n \\neq \\emptyset\\))",
        tex: String.raw`\tilde{X}_t = \frac{\bigl(X_t^{\mathrm{gc}} - T_t^{\mathrm{bi}}\bigr)(R_t^{\mathrm{bi}})^\top}{s_t^{\mathrm{bi}}}, \quad s_t^{\mathrm{bi}} = \|B_t[\mathrm{RS}] - B_t[\mathrm{LS}]\|_2`,
        note: "T^bi = shoulder midpoint, R^bi = yaw correction aligning shoulder axis with x̂",
        block: true,
      },
      {
        label: "One-handed Sim(3)  (phone held, \\(H^n = \\emptyset\\))",
        tex: String.raw`\tilde{X}_t = \frac{\bigl(X_t^{\mathrm{gc}} - F_t[1]\bigr)(R_t^{\mathrm{face}})^\top}{\|F_t[33] - F_t[263]\|_2}`,
        note: "Anchor: nose tip F[1], scale: inter-ocular distance F[33]–F[263]. Reliable in selfie mode even without body landmarks",
        block: true,
      },
      {
        label: "Full mobile Sim(3) pipeline",
        tex: String.raw`\tilde{X}_t = \begin{cases} \mathrm{Sim3}_{\mathrm{bi}}\!\left(X_t (R_t^{\mathrm{imu}})^\top\right) & H^n \neq \emptyset \\ \mathrm{Sim3}_{\mathrm{face}}\!\left(X_t (R_t^{\mathrm{imu}})^\top\right) & H^n = \emptyset \end{cases}`,
        block: true,
      },
      {
        label: "Phone-tilt augmentation",
        tex: String.raw`\theta_{\mathrm{pitch}} \sim \mathcal{U}(-30^\circ, +30^\circ),\quad \theta_{\mathrm{roll}} \sim \mathcal{U}(-15^\circ, +15^\circ),\quad s_{\mathrm{aug}} \sim \mathcal{U}(0.7, 1.4)`,
        note: "Applied before normalization during training to cover real phone-hold variation",
        block: true,
      },
    ],
  },

  {
    ref: "§3",
    title: "Feature Extraction from Normalized Landmarks",
    status: "live",
    accent: "var(--mint)",
    summary:
      "Five phonological sub-vectors extracted per frame from Sim(3)-normalized landmarks, concatenated into f_t ∈ ℝ⁵¹. Product VQ quantizes each sub-vector independently for exponentially more efficient codebook learning.",
    formulas: [
      {
        label: "Handshape  \\(\\mathbf{u}^H_t \\in \\mathbb{R}^{16}\\)",
        tex: String.raw`\theta_{k,t} = \angle\!\bigl(\tilde{L}_t[4k{+}1] - \tilde{L}_t[0],\;\tilde{L}_t[4k{+}4] - \tilde{L}_t[4k{+}1]\bigr)`,
        note: "4 finger flexion angles × 2 hands + thumb + inter-finger abduction = 16-D",
        block: true,
      },
      {
        label: "Handshape recognition check",
        tex: String.raw`\hat{H}^d = \operatorname*{arg\,min}_{h \in \Sigma_H} \|\mathbf{u}_t^H - \mu_h\|_2, \qquad C_{H^d} = \mathbf{1}\!\left[\|\mathbf{u}_t^H - \mu_{h^*}\|_2 \leq \varepsilon_H\right]`,
        note: "εH = 0.30 (L2 in ℝ¹⁶, normalized). Nearest-prototype — no ML required",
        block: true,
      },
      {
        label: "Location  \\(\\mathbf{u}^L_t \\in \\mathbb{R}^{6}\\)",
        tex: String.raw`c_t^{L/R} = \tfrac{1}{5}\sum_{j \in \{0,5,9,13,17\}} \tilde{L/R}_t[j] \;\in\; \mathbb{R}^3`,
        block: true,
      },
      {
        label: "Orientation  \\(\\mathbf{u}^O_t \\in \\mathbb{R}^{6}\\)",
        tex: String.raw`n_t^{L/R} = \frac{(\tilde{L/R}_t[5]-\tilde{L/R}_t[0]) \times (\tilde{L/R}_t[17]-\tilde{L/R}_t[0])}{\|\cdots\|_2} \;\in\; \mathbb{S}^2`,
        note: "Unit palm normal via cross product",
        block: true,
      },
      {
        label: "Movement  \\(\\mathbf{u}^M_t \\in \\mathbb{R}^{18}\\)",
        tex: String.raw`\Delta c_t = c_t - c_{t-1},\quad \Delta^2 c_t = \Delta c_t - \Delta c_{t-1},\quad \Delta n_t = n_t - n_{t-1}`,
        note: "Velocity, acceleration, orientation velocity — per hand (6 each)",
        block: true,
      },
      {
        label: "Non-manual  \\(\\mathbf{u}^N_t \\in \\mathbb{R}^{5}\\)",
        tex: String.raw`g_t = \tfrac{1}{2}(F_t[33]+F_t[133]) - \tfrac{1}{2}(F_t[362]+F_t[263])`,
        note: "+ mouth aperture ‖F[61]−F[291]‖₂ (mouthAp ≥ 0), brow height face[65].y − face[159].y (browH ≤ 0)",
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
        note: "Product VQ achieves equivalent quality with exponentially less data than joint quantization",
        block: true,
      },
    ],
  },

  {
    ref: "§4",
    title: "Sign Grading: Contact, Change Record & Boolean Checks",
    status: "partial",
    accent: "var(--coral)",
    summary:
      "Grading fires once at sign completion (final Hold phase). Each Σ_B component is a deterministic boolean check on Sim(3)-normalized landmarks — no ML required. The Hamming distance over 8 checks yields phonological error feedback at sub-millisecond cost.",
    formulas: [
      {
        label: "Contact flag \\(\\kappa\\)",
        tex: String.raw`\kappa_t = \mathbf{1}\!\left[\|c_t^d - c_t^n\|_2 \leq 0.15\right], \qquad \kappa = \left\lceil \frac{1}{T}\sum_{t=1}^{T} \kappa_t \;\geq\; 0.3 \right\rceil`,
        note: "δ_contact = 0.15 sw calibrated above MediaPipe noise (σ ≈ 0.02 sw). Vote threshold θ_κ = 0.3",
        block: true,
      },
      {
        label: "Handshape change record \\(\\Delta_H\\)",
        tex: String.raw`\Delta_H = \mathrm{RLE}(q^H) = \bigl(h_1^{\times r_1},\; h_2^{\times r_2},\; \ldots,\; h_k^{\times r_k}\bigr), \quad h_i \in \Sigma_H`,
        note: "|Δ_H| = 1 constant, 2 single change (BECOME), ≥ 3 complex trajectory (DREAM)",
        block: true,
      },
      {
        label: "Movement-Hold segmentation",
        tex: String.raw`\mathrm{Hold}(t) = \bigl\{t : \|c_t^d - c_{t-1}^d\|_2 < \varepsilon_{\mathrm{hold}}\bigr\}, \qquad \varepsilon_{\mathrm{hold}} = 0.01 \text{ sw/frame}`,
        note: "≈ 0.3 cm/frame at 30 fps. MH-string e.g. H·M·H (single), H·M·H·M·H (repeated, AGAIN)",
        block: true,
      },
      {
        label: "Path shape \\(M_{\\mathrm{path}}\\)  — straight criterion",
        tex: String.raw`M_{\mathrm{path}} = \mathrm{str} \iff \max_{u \in [0,1]} d\!\bigl(\gamma(u),\,\overline{\gamma(0)\gamma(1)}\bigr) \;\leq\; \theta_{\mathrm{str}},\quad \theta_{\mathrm{str}} = 0.05 \text{ sw}`,
        note: "Arc: best-fit circle residual ≤ θ_arc, |φ| ≤ 270°. Circular: |φ| > 270°. Repeated: ≥ 2 Movement segments",
        block: true,
      },
      {
        label: "Sign grading function",
        tex: String.raw`\mathrm{correct}(B^*) = C_{H^d} \wedge C_{H^n} \wedge C_\kappa \wedge C_{\Delta_H} \wedge C_L \wedge C_O \wedge C_{M_{\mathrm{path}}} \wedge C_{M_{\mathrm{manner}}}`,
        note: "Each Cᴊ is a deterministic boolean predicate on Sim(3)-normalized landmarks. No ML.",
        block: true,
      },
      {
        label: "Phonological Hamming distance",
        tex: String.raw`d_{\mathrm{phon}}(s, s') = \#\bigl\{J : \hat{J}(s) \neq J^*(s')\bigr\} \;\in\; \{0, 1, 2, \ldots, 8\}`,
        note: "Enables feedback: \"Handshape correct. Location needs to be at chin, not forehead.\"",
        block: true,
      },
      {
        label: "Grading latency  (all 8 checks)",
        tex: String.raw`t_{\mathrm{grade}} = \frac{\approx 300\text{ FLOPs}}{10^9\text{ FLOP/s}} \approx 3 \times 10^{-4}\,\text{ms}; \qquad t_{\mathrm{total}} \approx \begin{cases} 38\,\text{ms} & \text{one-handed} \\ 73\,\text{ms} & \text{two-handed} \end{cases}`,
        note: "Dominant cost is MediaPipe (~20–55 ms mid-range). All phonological math < 1 ms. Budget: 300 ms target.",
        block: true,
      },
    ],
  },

  {
    ref: "§5",
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
    ref: "§6",
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
    ref: "§7",
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
    ref: "§8",
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
    ref: "§9",
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
    ref: "§10",
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
    ref: "§11",
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
        Hernandez Juarez, A. (2026). <em>Palmar Sign Mathematics Reference: Formal Definitions
        for Sign Description, Grading, and Comparison.</em> Development Reference v1.0.
      </p>

      {RENDERED.map((s) => (
        <SectionCard key={s.ref} section={s} />
      ))}
    </div>
  );
});
