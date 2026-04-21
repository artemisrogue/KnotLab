# KnotLab Roadmap

This document records planned additions and their target locations in the app. It is the source of truth for "what is missing, where does it go, how big is it." Review and prune as items land.

---

## Recent completions (April 2026)

- **Home tab reorganization.** Diagrammatic Encodings (signed Gauss code, PD notation, realizability) now lives between Knot Diagrams and Braids on the Home tab (previously buried under gauss-linking).
- **Polynomial Invariants expansion.** Every sub-tab now has full pedagogical panels on par with Seifert & Alexander: Jones (6 panels + interactive table), HOMFLY-PT (5 panels + table), Quantum (6 panels incl. R-matrix/YBE, Volume Conjecture, Chern–Simons, colored Jones), Others (Conway, Kauffman F, Vassiliev, Kontsevich, Levine–Tristram, BLM/Ho, ADO, multi-variable Alexander).
- **Seifert subtab rename.** "Seifert & Alexander" → **"Seifert Surfaces & the Alexander Polynomial"**, now including a full skein-relation panel with worked Hopf-link → trefoil derivation.
- **Seifert algorithm SVG.** Three-panel visual (braid σ₁³ → oriented smoothing → disks-and-bands) with corrected orientation arrows.
- **Miscellaneous restructure.** Numerical invariants split into seven pedagogically-ordered sub-tabs (Crossing → Bridge → Unknotting → 3-genus → Determinant → Signature → Arf & Kervaire). Arf & Kervaire includes the full quadratic-refinement definition, pass-move characterization, and the surgery-theory bridge to the Kervaire invariant problem (Hill–Hopkins–Ravenel 2009, open in dimension 126).
- **Number Theory moved** from Appendix → Miscellaneous, with a per-row exposition section for every entry of Morishita's dictionary.
- **Tooltip system.** `.kl-term` class in `style.css` provides dotted-underlined hover definitions; applied systematically across every module for terms that weren't defined inline (braid group, writhe, Milnor conjecture, Gordon–Luecke, concordance, Rédei symbol, cyclic branched covers, + systematic sweep April 2026).
- **Kauffman-bracket rendering fix.** Replaced KaTeX-unsupported `\raisebox`/`\includegraphics` with inline SVG glyphs for the crossing and both smoothings.

Status tags:
- **[PRESENT]** — already substantively covered
- **[PARTIAL]** — some coverage, needs expansion
- **[STUB]** — mentioned or named but not developed
- **[MISSING]** — nothing in app yet

Scope tags:
- **(S)** small — one sub-tab's worth of content, < 1 day
- **(M)** medium — new sub-tab or substantial section, 1–3 days
- **(L)** large — new top-level tab or multi-week build

---

## 1. Foundations: Gauss Code & PD Notation — **[PRESENT] (M)** ✅

*Done April 2026: signed Gauss code, PD notation, realizability and virtual-knot forward-reference now occupy a dedicated Home-tab sub-tab between Knot Diagrams and Braids.*

**Original plan (retained for reference):**

**Current state.** Gauss codes appear in `modules/miscellaneous.js` (Virtual Knots sub-tab, as motivation for virtual crossings) and there's a Gauss-code field in `knot-explorer/index.html`. PD notation is not explicitly introduced anywhere as a first-class topic.

**Target location.** New sub-tab in `modules/introduction.js` — **"Diagrammatic Encodings"** — sitting between the existing 3D visualization content and the link sub-tabs. This is the natural home because PD and Gauss code are the bridge from hand-drawn diagrams to everything the rest of the app computes.

**Content required.**
- Signed Gauss code: definition, worked example on trefoil, figure-8, Hopf link
- PD notation: `X[a,b,c,d]` convention, orientation, worked example
- Realizability: why not every Gauss code is planar (virtual knot motivation — forward-reference to miscellaneous.js)
- SVG diagrams showing the labeling process step by step
- Small interactive: paste a PD code, get the braid word / polynomial lookup (can reuse knot-explorer data)

---

## 2. Jones via Operator Algebras — **[PARTIAL] (L)**

**Current state.** `modules/polynomial-invariants.js` (Jones sub-tab) has the Kauffman bracket state-sum definition, writhe correction, and a short discovery narrative. The operator-algebra origin story (Jones' subfactor index, Temperley–Lieb, Hecke) is named in `modules/appendix.js` history but not unpacked.

**Target location.** Expand the Jones sub-tab in `polynomial-invariants.js` with a collapsible **"Four Roads to the Jones Polynomial"** section containing four parallel derivations:
1. Kauffman bracket (already there)
2. Temperley–Lieb algebra TL_n: diagrammatic, shows braid generators acting on planar tangles
3. Hecke algebra H_n(q): braid generators satisfying (σ − q)(σ + 1) = 0
4. Subfactor index / von Neumann algebras: the Jones 1983 path

**Content required.**
- Each road is a `<details>` with: presentation, how a trace becomes a link invariant, why all four agree
- SVG of Temperley–Lieb generators (cup/cap diagrams)
- Braid-group → Hecke → trace → Jones flow diagram
- Worked trefoil computation via TL or Hecke

---

## 3. Reshetikhin–Turaev & Categorification Status — **[PARTIAL] (M)**

**Current state.** RT named and loosely sketched in `polynomial-invariants.js` (Quantum Link Invariants sub-tab); categorification discussed in `homological-invariants.js`.

**Target location.** Promote to its own sub-tab **"Quantum Invariants (RT)"** in `polynomial-invariants.js`, replacing/expanding the current Quantum Link Invariants stub. Cross-reference from `homological-invariants.js`.

**Content required.**
- Ribbon category axioms (objects, morphisms, braiding, twist)
- How U_q(sl_2) modules produce the Jones polynomial
- General U_q(sl_N) → sl(N) polynomial invariants
- What's categorified (Jones → Khovanov; HOMFLY → triply-graded KR) and what isn't (RT at roots of unity for general Lie algebra still open)
- Table: RT data vs. its categorification vs. open cases

---

## 4. sl(N) / HOMFLY-PT / Khovanov–Rozansky — **[PARTIAL] (M)**

**Current state.** HOMFLY-PT has skein relation in `polynomial-invariants.js`; sl(3), sl(4) values computed in `knot-explorer`; Khovanov–Rozansky named in `homological-invariants.js`.

**Target location.** Existing KR section in `homological-invariants.js` should be expanded with:
- The matrix-factorization construction (Khovanov–Rozansky 2004) with a worked low-rank example
- Triply-graded HOMFLY homology (Khovanov–Rozansky 2005 / Rasmussen)
- Connection to Hilbert schemes on C² (Gorsky–Negut–Rasmussen)

New **"sl(N) Zoo"** subsection showing the unified picture: sl(1) trivial → sl(2) Jones → sl(N) quantum → N→∞ HOMFLY-PT, with categorifications indicated.

---

## 5. Alexander Polynomial, Alexander Module, Knot Floer — **[PARTIAL] (M)**

**Current state.** Alexander via Seifert matrix in `polynomial-invariants.js`; knot Floer τ-invariant and fibered detection in `homological-invariants.js`.

**Target location.** New sub-tab in `polynomial-invariants.js` — **"Alexander Module"** — and expansion of knot Floer section in `homological-invariants.js`.

**Content required.**
- Infinite cyclic cover of knot complement; H_1 as Z[t, t⁻¹]-module
- Alexander polynomial as generator of order ideal
- Fox calculus derivation
- Blanchfield pairing mention
- **Super-Lie-algebra connection**: Alexander = RT invariant for U_q(gl(1|1)), write out the dictionary. Connect to Viro's sl(1|1) description.
- knot Floer expansion: how Heegaard Floer specializes, categorification of Alexander, genus detection, fiberedness, concordance τ

---

## 6. Spectral Sequences — **[STUB] (M)**

**Current state.** Lee spectral sequence mentioned in Khovanov section of `homological-invariants.js` (→ Rasmussen s-invariant). Other SSes named, not developed.

**Target location.** New sub-tab **"Spectral Sequences"** in `homological-invariants.js`, after Khovanov-Rozansky.

**Content required.** A diagram / table of all the known SSes:
- Lee SS: Khovanov ⇒ Q⊕Q (Rasmussen s)
- Bar-Natan SS: deformations of Khovanov
- Szabó SS: Khovanov ⇒ knot Floer (Ozsváth–Szabó)
- KR sl(N) SSes: Khovanov–Rozansky ⇒ Lee_N
- Instanton SS: Kronheimer–Mrowka, Khovanov ⇒ instanton Floer (unknot detection)
Each as a `<details>` with: source, target, what it computes, key reference.

---

## 7. Yang–Baxter & R-matrices — **[STUB] (S)**

**Current state.** YBE named in `appendix.js` in physics context only.

**Target location.** New sub-tab **"Yang–Baxter & R-matrices"** in `polynomial-invariants.js`, positioned right before Quantum Link Invariants — it's the operational heart of RT.

**Content required.**
- Statement of YBE with SVG (three-strand diagram, sliding the middle crossing)
- R-matrix from U_q(sl_2), explicit 4×4 matrix
- How YBE ⇔ Reidemeister III
- Small interactive: pick a 2×2 representation, verify YBE numerically
- Links to statistical-mechanics origin (Baxter, vertex models)

---

## 8. Polynomial Invariants Overview & Seifert Surfaces — **[PRESENT] (S)** ✅

*Done April 2026: three-panel SVG walkthrough of Seifert's algorithm (braid σ₁³ → oriented smoothing → two Seifert disks joined by three half-twisted bands) now opens the "Seifert Surfaces & the Alexander Polynomial" sub-tab, followed by genus/Alexander-degree linkage and the full skein-relation panel.*

**Original plan (retained for reference):**

**Current state.** Seifert matrix defined tersely in Alexander section. Actual surface construction (Seifert's algorithm) not shown.

**Target location.** New sub-tab **"Seifert Surfaces"** in `polynomial-invariants.js`, or as opening section of the Alexander sub-tab.

**Content required.**
- Seifert's algorithm: orient diagram → smooth crossings → stack disks, tubes at crossings
- SVG animation of the algorithm on trefoil
- 3D Three.js rendering of a trefoil's Seifert surface (reuse framed-knots tube infrastructure)
- Genus of a knot; the genus is the min over all Seifert surfaces
- Relation to Alexander polynomial degree

---

## 9. Knot Types — **[STUB] (L)**

**Current state.** Torus knots rendered in `introduction.js`; fibered noted in `homological-invariants.js`; the rest unmentioned.

**Target location.** **New top-level tab "Knot Types"** (between Polynomial Invariants and Homological Invariants) with sub-tabs:
- Torus knots
- Satellite knots (cable, Whitehead double)
- Hyperbolic knots + volume
- Alternating and almost-alternating
- Fibered knots
- The Volume Conjecture

**Content required per sub-tab.**
- Definition, canonical examples, 3D rendering where feasible
- Invariants that detect / measure the type (e.g. Alexander for fibered, volume for hyperbolic)
- The volume conjecture gets its own sub-tab: colored Jones limit ⇒ hyperbolic volume, status (proved for several classes, open in general)

---

## 10. Knot–Prime Dictionary — **[PRESENT] (S)** ✅

*Moved April 2026: the Morishita dictionary now lives as its own sub-tab of **Miscellaneous** (not Appendix). Every row has an expanded description panel below the table (S³↔Spec ℤ, knot↔prime, link↔finite set of primes, complement↔Spec ℤ[1/p], knot group↔étale π₁, meridian/longitude↔inertia/Frobenius, linking↔Legendre, triple linking↔Rédei, cyclic cover↔ℤ_p-extension, Alexander↔Iwasawa, branched cover↔cyclotomic field, H₁↔class group, Seifert surface↔bounding chain, torsion↔p-adic L).*

**Remaining enhancement.** Cross-link the Alexander–Iwasawa row to the planned Alexander Module sub-tab (#5) once that ships.

---

## 11. Higher-Dimensional Knots — **[MISSING] (M)**

**Target location.** New sub-tab **"Higher Knots"** in `miscellaneous.js` (natural home — already houses virtual knots, i.e. generalizations).

**Content required.**
- S² ↪ S⁴ and S^n ↪ S^(n+2) in general
- Why high-codim knots are trivial (Zeeman)
- The knot group in higher dimensions (Stallings)
- 2-knot examples: spun trefoil, twist-spun knots
- Bridge to surgery theory and exotic structures

---

## 12. Virtual Knots — **[PARTIAL] (M)**

**Current state.** `miscellaneous.js` has definitions, virtual crossings, odd writhe, index polynomial. There's a placeholder iframe for a virtual knot explorer.

**Target location.** Stay put in `miscellaneous.js`. Two expansions:
- Fill the placeholder iframe: a small interactive that lets the user draw Gauss codes and computes whether they're classical or virtual, with invariants
- Add Kauffman's f-polynomial for virtuals
- Add the connection to abstract link diagrams on surfaces

---

## 13. Gauge Theories — **[MENTIONED] (L)**

**Current state.** Instanton Floer mentioned once in `homological-invariants.js` (Khovanov unknot detection). Chern–Simons mentioned in `appendix.js`.

**Target location.** New sub-tab **"Gauge-Theoretic Invariants"** in `homological-invariants.js`, positioned after the existing spectral-sequences content.

**Content required.**
- Chern–Simons as a TQFT, path integral heuristic for Jones
- Instanton Floer homology (Floer's original 1988)
- Monopole Floer (Seiberg–Witten)
- Equivalence theorem (KLT: HM = HF = ECH)
- Where knot invariants enter: instanton knot homology, monopole knot homology, their spectral sequence to Khovanov

---

## Cross-cutting enhancements

- **References.** `references.json` currently has only Rolfsen. Every new proof/theorem should come with a citation. Build out as content is added.
- **SVG diagrams.** Adopt a convention: inline SVG with a consistent palette (already in `style.css`). Diagrams should be text-scalable, not raster.
- **Pedagogical boxes.** Port the `.calc-proof / .calc-example / .calc-practice` pattern from Calc1 into KnotLab's `style.css` for consistent collapsible proofs and worked examples.
- **Interactive widgets.** Pattern established in Calc1 (Plotly / Three.js widget with a `wireX(root)` function called post-innerHTML). Use the same pattern for all new interactives here.

---

## Priority ordering (suggested)

**Tier 1 (present-to-professor readiness):**
1. Seifert surfaces sub-tab (#8) — foundational, visual, fillable gap
2. Yang–Baxter & R-matrices (#7) — short, self-contained, upgrades polynomial story
3. Gauss code / PD sub-tab (#1) — closes the "where does the data come from" gap
4. Alexander module + super-Lie (#5) — binds Alexander to the rest of the quantum picture

**Tier 2 (depth for a specialist audience):**
5. Jones via operator algebras (#2)
6. Spectral sequences (#6)
7. Knot Types top-level tab (#9)

**Tier 3 (long-term build-out):**
8. Quantum invariants / RT expansion (#3)
9. sl(N) / KR deepening (#4)
10. Gauge theories (#13)
11. Higher knots (#11)
12. Virtual knots expansion (#12)
13. Knot–prime dictionary polish (#10)
