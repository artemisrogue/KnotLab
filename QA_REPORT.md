# KnotLab — QA Report

Date: 2026-04-21
Build: `http://localhost:8780/` (iframe versioned `v=1776768468`)
Method: `preview_eval`-based DOM scraping + `preview_console_logs`; minimal screenshots.

---

## 1. Summary — per-tab status

| Tab | Renders | Subtabs wired | JS errors | Factual spot-check | Notes |
|---|---|---|---|---|---|
| home | PASS (2,860 chars) | n/a | none | PASS | Overview + intro sections. |
| gauss-linking | PASS (10,875) | n/a | none | PASS | 1 Plotly, 1 canvas, 5 sliders, 3 selects; slider responds. |
| polynomial-invariants | PASS (7k–14k per sub) | 7/7 render | **1 recurring** (psmallmatrix) | PASS | All Jones & Alexander values verified against KnotAtlas/KnotInfo. |
| homological-invariants | PASS | 5/5 render | none | PASS | Khovanov / HFK / KR / SpecSeq / Comments all load. |
| knot-explorer | PASS (iframe, 74,295 chars body) | 4 sub-sections (Invariants / Cube / Homological / Khovanov Complex) visible | none | Not deeply probed per constraint | Iframe loads to readyState "complete". |
| number-theory | PASS | 9/9 render | none | PASS | Morishita dictionary rows all accurate. |
| miscellaneous | PASS | 9/9 render (all load on click) | none | PASS | Crossing / Bridge / Unknotting / Genus / Det / Signature / Arf-Kervaire / Knot Group / Virtual Knots. |
| appendix | PASS (4,803) | 3 sub (History / Physics / Definitions) | none | PASS | — |

Tooltips: 35 total, all Unicode — **no LaTeX / ASCII leakage**. Katex-error nodes in DOM: 0–1 depending on tab (the psmallmatrix silently fails to render as a boxed `.katex-error`).

Broken images: **0**.

---

## 2. Console errors

Only one recurring class of error across the whole app:

```
KaTeX auto-render: Failed to parse `V \mapsto \begin{psmallmatrix} V & * & 0 \\ 0 & 0 & 1 \\ 0 & 0 & 0 \end{psmallmatrix}`
ParseError: No such environment: psmallmatrix
```

Fires ~8–10 times on load of the Polynomial Invariants tab. Source: `modules/polynomial-invariants.js` (sole grep hit). KaTeX 0.16.9 does not implement `psmallmatrix`; use `smallmatrix` or `pmatrix` with `\small`.

No other runtime errors observed across all eight top-level tabs or during subtab/slider/details interaction.

---

## 3. Factual findings

### 3a. Jones polynomials (from `pi-jones-readout` interactive selector)

Verified against KnotAtlas / KnotInfo (standard right-handed = positive-crossing convention). All **PASS**.

| Knot | App V(q) | Reference | Status |
|---|---|---|---|
| unknot | 1 | 1 | PASS |
| 3₁ (RH) | −q⁻⁴ + q⁻³ + q⁻¹ | KnotAtlas `3_1` | PASS |
| 3₁ mirror | −q⁴ + q³ + q | mirror via q↔q⁻¹ | PASS (consistent) |
| 4₁ | q⁻² − q⁻¹ + 1 − q + q² | palindromic | PASS |
| 5₁ | −q⁻⁷+q⁻⁶−q⁻⁵+q⁻⁴+q⁻² | KnotAtlas | PASS |
| 5₂ | −q⁻⁶+q⁻⁵−q⁻⁴+2q⁻³−q⁻²+q⁻¹ | KnotAtlas | PASS |
| 6₁ | q⁻⁴−q⁻³+q⁻²−2q⁻¹+2−q+q² | KnotAtlas | PASS |
| 6₂ | q⁻⁵−2q⁻⁴+2q⁻³−2q⁻²+2q⁻¹−1+q | KnotAtlas | PASS |
| 6₃ | −q⁻³+2q⁻²−2q⁻¹+3−2q+2q²−q³ | palindromic | PASS |
| 7₁ | −q⁻¹⁰+q⁻⁹−q⁻⁸+q⁻⁷−q⁻⁶+q⁻⁵+q⁻³ | KnotAtlas | PASS |
| L2a1 Hopf+ | −q⁻⁵/² − q⁻¹/² | KnotAtlas | PASS |

### 3b. Alexander polynomials (same selector, Δ line)

| Knot | App Δ(t) | Status |
|---|---|---|
| 3₁ | t − 1 + t⁻¹ | PASS, symmetric ✓ |
| 4₁ | −t + 3 − t⁻¹ | PASS |
| 5₁ | t² − t + 1 − t⁻¹ + t⁻² | PASS |
| 5₂ | 2t − 3 + 2t⁻¹ | PASS |
| 6₁ | −2t + 5 − 2t⁻¹ | PASS, det=9 ✓ |
| 6₂ | −t²+3t−3+3t⁻¹−t⁻² | PASS |
| 6₃ | t²−3t+5−3t⁻¹+t⁻² | PASS |
| 7₁ | t³−t²+t−1+t⁻¹−t⁻²+t⁻³ | PASS |

All satisfy Δ(t)=Δ(t⁻¹) (up to overall sign for even-degree 4₁, 6₁, etc. — consistent).

### 3c. Signature, determinant, Arf

From Misc → Signature / Determinant / Arf:

| Knot | σ (app) | ref | det | Arf |
|---|---|---|---|---|
| 3₁ (RH) | **−2** | σ=−2 for positive crossings (Lickorish) | 3 | 1 |
| 4₁ | 0 | 0 (amphichiral) | 5 | 1 |
| 5₁ (=T(2,5) RH) | −4 (via σ(T₂,q)=−(q−1)) | −4 | 5 | 1 |
| 5₂ | (not explicitly printed; formula implies) | −2 | 7 | 0 |
| 6₁ | — | 0 | 9 | 0 |

App uses the **σ(right-handed)=−2 / σ(T(2,q)) = −(q−1)** convention (Lickorish, Kawauchi) — consistent throughout. σ(mirror)= −σ is explicitly mentioned in the Signature section. **PASS**.

### 3d. Kauffman bracket normalisation

Jones subtab states explicitly: **⟨◯⟩ = 1** and **⟨D ⊔ ◯⟩ = (−A² − A⁻²)⟨D⟩**. Standard Kauffman convention. **PASS**.

### 3e. HOMFLY-PT skein

App: `a⁻¹ P(L₊) − a P(L₋) = z P(L₀)` with P(◯)=1. Alexander specialization at `a=1, z=t^(1/2)−t^(−1/2)`. Jones at `a=q⁻¹, z=q^(1/2)−q^(−1/2)`. This is the **Lickorish–Millett / Morton** convention. Consistent internally; note KnotAtlas uses `a` with opposite sign (`a P₊ − a⁻¹ P₋ = z P₀`). **PASS** (flag: convention differs from KnotAtlas/Bar-Natan — worth a one-line call-out to the reader).

### 3f. Jones skein

App: `q⁻¹ V(L₊) − q V(L₋) = (q^(1/2) − q^(−1/2)) V(L₀)`, V(◯)=1. Standard Jones. **PASS**.

### 3g. Kervaire (Misc → Arf & Kervaire)

> "Status as of 2024: resolved. ... Lin–Wang–Xu (Weinan Lin, Guozhen Wang, Zhouli Xu, On the last Kervaire invariant problem, arXiv:2412.10879, December 2024) proved that Θ₅ ≠ 0 — i.e. the Kervaire invariant-one element does exist in dimension 126. ... realized precisely in dimensions 2, 6, 14, 30, 62, 126."

Fully accurate per the 2024 resolution. **PASS**.

### 3h. Khovanov

Categorification statement present: `V_K(q) = Σ (−1)^i q^j dim Kh^{i,j}(K)`. Correct. The specific value `Kh(unknot) = q + q⁻¹` is not printed verbatim but the worked mini-example is referenced by link; no incorrect statement found. **PASS (not disproven)**.

### 3i. Number-theory dictionary

Table spot-check:

| Knot side | Arithmetic side | Verdict |
|---|---|---|
| S³ | Spec(Z) | PASS |
| K ⊂ S³ | prime (p) ⊂ Spec(Z) | PASS (Mazur / Morishita) |
| Knot complement S³∖K | Spec(Z[1/p]) | PASS |
| π₁(S³∖K) | π₁ᵉᵗ(Spec(Z[1/p])) | PASS |
| Meridian | Inertia I_p | PASS |
| Longitude | Frobenius Frob_p | PASS |
| lk(K,L) mod 2 | Legendre symbol (p/q) | PASS (Morishita) |
| μ(K₁,K₂,K₃) | Rédei symbol [p₁,p₂,p₃] | PASS |
| Infinite cyclic cover | Maximal pro-p extension unramified outside p | PASS |
| Alexander polynomial | Iwasawa polynomial | PASS |
| Branched cyclic cover Σ_n(K) | ring of integers of n-th cyclotomic | PASS |
| H₁(Σ_n(K);Z) | ideal class group | PASS |
| Seifert surface | "arithmetic 1-chain bounding (p)" | PASS (heuristic, as labelled) |
| Reidemeister torsion | p-adic L-function | PASS |

No wrong correspondences found.

### 3j. PD code for trefoil

Not displayed verbatim on the Polynomial-Invariants tab during this QA pass (the trefoil visualisation uses σ₁³ braid word, not PD). **DEFERRED** — the PD `X_{6,3,1,4} X_{4,1,5,2} X_{2,5,3,6}` cited in the QA prompt was not located in the main tabs during walkthrough; likely lives in the Knot Explorer iframe which was not deep-probed per constraints.

---

## 4. Sign / parity issues

- **None found that are internally inconsistent.** The app is self-consistent on:
  - Right-handed trefoil → V = −q⁻⁴+q⁻³+q⁻¹, σ = −2, writhe = +3.
  - σ(mirror K) = −σ(K) is explicitly stated.
  - σ(T(2,q)) = −(q−1) gives σ(5₁)=−4 consistent with det=5, Arf=1.
  - Hopf link (positive) V = −q⁻⁵/² − q⁻¹/² uses the same convention as KnotAtlas L2a1.
- **Convention call-out** (not a bug, but worth a tooltip): the HOMFLY-PT skein sign (`a⁻¹P₊ − aP₋ = zP₀`) is the Lickorish–Millett form; KnotAtlas/Bar-Natan uses the opposite sign on `a`. Readers cross-referencing will see mirrored exponents.
- **Kauffman bracket**: ⟨◯⟩=1 convention is stated. Consistent.

---

## 5. Interaction bugs

1. **Deep-link hash routing to subtabs is not wired.** Setting `location.hash = '#polynomial-invariants/jones'` navigates to the tab but leaves the default subtab (Alexander) active. The sub-segment after `/` is ignored. No crash; just no effect. Browser back/forward between top-level tabs **works** correctly.
2. **Admin mode** Ctrl+Shift+E toggles an `admin-mode` overlay cleanly; re-press exits. No persistence escape. `?admin=1` path not independently verified (would require reload).
3. **Miscellaneous subtab data-attributes**: subtab buttons use class `fk-subtab active|""` but have no `data-tab` attribute (unlike Polynomial Invariants). Not a bug per se, but makes programmatic selection brittle.
4. **Plotly / Three.js widgets**: Gauss-linking tab has 1 canvas, 1 Plotly plot, 5 sliders, 3 selects. Slider `input` events propagate without error. A trefoil/torus 3D viewer is implicit via Three.js (canvases on several tabs).

---

## 6. Tooltip / LaTeX hygiene

- **35 tooltips sampled**: all use Unicode math symbols (Δ, σ, π, ℤ, ≤, ↪, etc.). **No** `\(` / `\)` / `$…$` / stray ASCII apostrophes inside tooltip strings.
- **Apostrophes inside body text** (e.g. "Tait's", "Jones's"): these are in body prose, not tooltips — fine.
- KaTeX errors: 1 recurring (see §2). No `.katex-error` nodes propagate to ≥2 across tab navigation; the one error renders as raw LaTeX fallback.

---

## 7. Recommended fixes (ordered by severity)

1. **[P1 – cosmetic but visible]** Replace `\begin{psmallmatrix} … \end{psmallmatrix}` in `modules/polynomial-invariants.js` with either `\begin{pmatrix} \small … \end{pmatrix}` or `\begin{smallmatrix} … \end{smallmatrix}` (wrap with `\left(…\right)`). KaTeX 0.16.9 does not ship `psmallmatrix`. Fires every time the Alexander-Module subtab renders.
2. **[P2 – feature gap]** Wire deep-linking for subtabs: parse `location.hash` of the form `#tab/subtab` in each `renderXxx` and, after rendering, programmatically click the matching `.fk-subtab`. Currently only the top-level tab is honoured.
3. **[P3 – doc clarity]** Add a one-line convention note next to the HOMFLY-PT skein relation stating "(Lickorish–Millett; KnotAtlas uses opposite sign on `a`)" so students cross-checking with KnotAtlas are not confused.
4. **[P3 – robustness]** Give Miscellaneous subtab buttons `data-tab` attributes matching their ids, mirroring the Polynomial-Invariants pattern. Makes URL deep-linking (fix #2) uniform.
5. **[P4 – polish]** Print `Kh(unknot) = q + q⁻¹` explicitly in the Khovanov subtab alongside the Euler-char formula — it's the smallest concrete check a reader wants.
6. **[P4 – polish]** Consider printing the PD code for the trefoil on the Polynomial-Invariants tab (currently only on the Knot Explorer iframe) to match the prompt's expectation.

---

## 8. Not tested / deferred

- **Knot Explorer iframe internals** — per hard constraint, I did not modify or deeply probe `knot-explorer/`. Confirmed: iframe loads, readyState complete, 74,295 chars of body text, has "Invariants / Cube of Resolutions / Homological / Khovanov Complex" section headers + skein relation content for Alexander, Jones, HOMFLY-PT.
- **`?admin=1` query-param admin activation** — avoided to prevent reload mid-QA; keyboard shortcut confirmed working.
- **Hopf link linking-number diagram sign** — the Gauss-Linking tab renders a Plotly widget; visual sign convention (positive crossing → lk=+1) was not eyeball-verified (no screenshot taken). Dropdown options include both Hopf(+1) and Hopf(−1), suggesting the UI offers both.
- **Khovanov bigraded Poincaré polynomial for 3₁** — not printed on a top-level tab; would require drilling into Knot Explorer.
- **Trefoil PD code parity check** — prompt asked me to verify `X_{6,3,1,4} X_{4,1,5,2} X_{2,5,3,6}` labels each appear exactly twice with correct orientation; label was not surfaced in any top-level tab text.
- **Plotly math / widget correctness** — sliders respond and Plotly plots render; numerical correctness of the Writhe/Călugăreanu plot was not independently recomputed.

---

*End of report.*
