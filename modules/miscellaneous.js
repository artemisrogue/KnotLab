/**
 * miscellaneous.js — Miscellaneous module for KnotLab
 * Exposes window.renderMiscellaneous(containerEl)
 *
 * Sub-tabs (pedagogical order):
 *   Numerical invariants, one per tab:
 *     1. Crossing Number        — simplest diagrammatic
 *     2. Bridge Number          — diagrammatic, continues the visual theme
 *     3. Unknotting Number      — move-based
 *     4. Three-Genus            — introduces Seifert surfaces
 *     5. Determinant            — first algebraic invariant
 *     6. Signature              — Seifert form
 *     7. Arf & Kervaire         — mod-2 invariants, bridge to 4-manifold topology
 *   Then:
 *     8. The Knot Group         — group-theoretic
 *     9. Number Theory          — arithmetic analogy (moved from Appendix)
 *    10. Virtual Knots          — generalization
 */
(function () {
  'use strict';

  var TABS = [
    'Crossing Number',
    'Bridge Number',
    'Unknotting Number',
    'Three-Genus',
    'Determinant',
    'Signature',
    'Arf & Kervaire',
    'The Knot Group',
    'Number Theory',
    'Virtual Knots'
  ];

  // ───────────────────────────────────────────────────────────────────
  //  Numerical invariants — one panel per concept, with examples table
  // ───────────────────────────────────────────────────────────────────

  function crossingNumberHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Crossing Number \\(c(K)\\)</h3>' +
        '<p>The <strong>crossing number</strong> of a knot \\(K\\) is the minimum number of crossings ' +
        'over all diagrams representing \\(K\\):</p>' +
        '<div class="formula-box">$$c(K) \\;=\\; \\min_{D \\text{ diagram of } K}\\,\\#(\\text{crossings of } D).$$</div>' +
        '<p>It is the oldest numerical invariant &mdash; it is what Tait and Kirkman used in the 1870s and 80s to ' +
        'organize their first knot tables. The <span class="kl-term" title="Flype: a 180° rotation of a tangle T between two crossings in an alternating diagram, preserving the alternating property. Conjectured by Tait; proved by Menasco–Thistlethwaite (1993).">flype</span> move and the notion of an <span class="kl-term" title="Alternating knot: admits a diagram whose crossings alternate over/under as one traverses the knot.">alternating knot</span> underpin their analysis. Rolfsen&rsquo;s 1976 table (still the standard reference) arranges ' +
        'prime knots into rows indexed by crossing number.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>What is hard about it</h4>' +
        '<p>Computing \\(c(K)\\) means ruling out every diagram with fewer crossings &mdash; an infinite ' +
        'search. The great breakthrough came with the <strong>Tait conjectures</strong>, proved by ' +
        'Kauffman, Murasugi, and Thistlethwaite in 1987 using the span of the Jones polynomial:</p>' +
        '<ul>' +
          '<li><strong>Tait I (Jones span).</strong> Any reduced alternating diagram of an alternating knot ' +
          'realizes the crossing number. So \\(c(K)\\) can be read off directly from a single good picture ' +
          'for alternating knots.</li>' +
          '<li><strong>Tait II (flype).</strong> Any two reduced alternating diagrams of the same alternating ' +
          'knot differ by a sequence of <em>flypes</em>.</li>' +
        '</ul>' +
        '<p>For non-alternating knots &mdash; the simplest examples are the \\((3,4)\\)-<span class="kl-term" title="Torus knot T(p,q): lies on a standard torus in S³, wrapping p times in one direction and q times in the other (gcd(p,q)=1). Fibered; Seifert genus (p−1)(q−1)/2.">torus knot</span> \\(8_{19}\\) ' +
        'and the knot \\(8_{20}\\) &mdash; one usually needs additional invariants to bound \\(c(K)\\) from below.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Additivity under <span class="kl-term" title="Connected sum K₁#K₂: cut out a small arc from each knot and glue the remaining ends, yielding a single knot. Makes the set of isotopy classes of oriented knots a commutative monoid with unique prime decomposition.">connected sum</span></h4>' +
        '<p>Whether \\(c(K_1 \\# K_2) = c(K_1) + c(K_2)\\) is <em>open in general</em>. It holds for alternating ' +
        'knots (Kauffman&ndash;Murasugi&ndash;Thistlethwaite) and for <span class="kl-term" title="Adequate knot: admits a diagram that is both +adequate and −adequate (resolving all crossings consistently yields a state with no self-touching loops). Generalizes alternating; introduced by Lickorish–Thistlethwaite.">adequate knot</span>s (Lackenby 2009), but no one ' +
        'knows it in full generality. This is perhaps the most embarrassing open problem in the subject.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Small knots</h4>' +
        '<table class="dict-table" style="width:100%;max-width:420px;margin:0 auto;">' +
          '<thead><tr><th>Knot</th><th>\\(c(K)\\)</th><th>Alternating?</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>unknot \\(0_1\\)</td><td>0</td><td>&ndash;</td></tr>' +
            '<tr><td>\\(3_1\\) (trefoil)</td><td>3</td><td>yes</td></tr>' +
            '<tr><td>\\(4_1\\) (figure-eight)</td><td>4</td><td>yes</td></tr>' +
            '<tr><td>\\(5_1, 5_2\\)</td><td>5</td><td>yes</td></tr>' +
            '<tr><td>\\(8_{19}\\) = \\((3,4)\\)-torus</td><td>8</td><td><strong>no</strong></td></tr>' +
            '<tr><td>\\(8_{20}, 8_{21}\\)</td><td>8</td><td><strong>no</strong></td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<p><em>The Knot Explorer contains precomputed crossing numbers for all prime knots up to 12 crossings.</em></p>' +
      '</div>';
  }

  function bridgeNumberHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Bridge Number \\(b(K)\\)</h3>' +
        '<p>Put the knot \\(K\\) in general position with respect to a height function ' +
        '\\(h : \\mathbb{R}^3 \\to \\mathbb{R}\\) and count its local maxima. The <strong>bridge ' +
        'number</strong> is the minimum of this count over all positions:</p>' +
        '<div class="formula-box">$$b(K) \\;=\\; \\min_{K \\text{ in Morse position}}\\,\\#\\{\\text{local maxima}\\}.$$</div>' +
        '<p>Here <span class="kl-term" title="Morse position: K is embedded so the height function h restricted to K is Morse — finitely many non-degenerate critical points, all at distinct heights.">Morse position</span> means the height function restricted to \\(K\\) is Morse. Equivalently, it is the smallest \\(n\\) such that \\(K\\) admits a decomposition ' +
        '\\(K = \\alpha_1 \\cup \\beta_1 \\cup \\cdots \\cup \\alpha_n \\cup \\beta_n\\) with the ' +
        '\\(\\alpha_i\\) all above a plane, the \\(\\beta_i\\) all below, and the endpoints matching ' +
        '&mdash; the picture from which the term &ldquo;bridge&rdquo; originates.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Classification of low bridge number</h4>' +
        '<ul>' +
          '<li>\\(b(K) = 1 \\iff K\\) is the unknot.</li>' +
          '<li><strong>2-bridge knots</strong> (also called <em>rational</em> or <em>Schubert</em> knots) are ' +
          'parametrized by pairs \\((p, q)\\) with \\(p\\) odd and \\(0 < q < p\\), \\(\\gcd(p,q) = 1\\), modulo ' +
          'the equivalence \\((p,q) \\sim (p, q^{\\pm 1} \\bmod p)\\). The <span class="kl-term" title="Schubert (2-bridge) classification (1956): 2-bridge knots correspond bijectively to pairs (p,q) with p odd, 0<q<p, gcd(p,q)=1, modulo q ~ q^{±1} mod p. First infinite family of knots classified.">Schubert (2-bridge) classification</span> (1956) is via continued fractions &mdash; the first infinite family of knots ever classified.</li>' +
          '<li>All torus knots \\(T(p,q)\\) with \\(p = 2\\) are 2-bridge. \\(T(3,4) = 8_{19}\\) is 3-bridge.</li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Schubert\'s additivity theorem (1954)</h4>' +
        '<div class="formula-box">$$b(K_1 \\# K_2) \\;=\\; b(K_1) + b(K_2) - 1.$$</div>' +
        '<p>Unlike the open question for \\(c(K)\\), bridge additivity was proved in full by Schubert using a ' +
        'careful decomposition argument on 2-spheres transverse to the knot.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Relation to other invariants</h4>' +
        '<ul>' +
          '<li>\\(b(K) - 1 \\leq g(K)\\), where \\(g\\) is the Seifert genus.</li>' +
          '<li>\\(b(K) \\leq \\beta(K)\\), the braid index.</li>' +
          '<li>Birman and Hilden: 2-bridge knots are exactly the quotients of two-bridge involutions on the ' +
          '3-sphere.</li>' +
        '</ul>' +
      '</div>';
  }

  function unknottingNumberHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Unknotting Number \\(u(K)\\)</h3>' +
        '<p>The <strong>unknotting number</strong> is the minimum number of <em>crossing changes</em> ' +
        '(switching an over-crossing to an under-crossing) needed to convert \\(K\\) to the unknot, minimized ' +
        'over all diagrams and all choices of crossings to change.</p>' +
        '<div class="formula-box">$$u(K) \\;=\\; \\min_{D,\\, \\text{changes}}\\,\\#\\{\\text{crossings flipped}\\}.$$</div>' +
        '<p>Examples: \\(u(3_1) = 1\\) (flip any crossing of the standard 3-crossing diagram). ' +
        '\\(u(4_1) = 1\\). \\(u(5_1) = 2\\). \\(u(T(p,q)) = \\tfrac12(p-1)(q-1)\\) for torus knots ' +
        '(Kronheimer&ndash;Mrowka 1993, via the <span class="kl-term" title="Milnor conjecture: the smooth 4-genus of the torus knot T(p,q) equals (p-1)(q-1)/2. Proved by Kronheimer–Mrowka using gauge theory; reproved via Khovanov homology by Rasmussen.">Milnor conjecture</span>).</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Upper and lower bounds</h4>' +
        '<p>Upper bounds are easy &mdash; exhibit an unknotting sequence. Lower bounds are hard. The standard ' +
        'tools:</p>' +
        '<ul>' +
          '<li><strong>Signature.</strong> \\(|\\sigma(K)| \\leq 2\\,u(K)\\).</li>' +
          '<li><strong><span class="kl-term" title="Rasmussen s-invariant (2004): even integer extracted from the Lee spectral sequence on Khovanov homology; concordance homomorphism with |s(K)| ≤ 2g₄(K).">Rasmussen \\(s\\)-invariant</span>.</strong> \\(|s(K)| \\leq 2\\,u(K)\\) (Rasmussen 2004, from ' +
          '<span class="kl-term" title="Khovanov homology (Khovanov 2000): bigraded homology theory Kh^{i,j}(K) categorifying the Jones polynomial via a cube of resolutions and a Frobenius algebra.">Khovanov homology</span>).</li>' +
          '<li><strong><span class="kl-term" title="Ozsváth–Szabó τ invariant (2003): integer-valued concordance homomorphism from the Alexander filtration on CFK̂(K); |τ(K)| ≤ g₄(K).">Ozsv&aacute;th&ndash;Szab&oacute; \\(\\tau\\)</span>.</strong> \\(|\\tau(K)| \\leq u(K)\\).</li>' +
          '<li><strong>Montesinos trick.</strong> \\(u(K) \\geq \\tfrac12 \\log_2 |\\det K|\\) does not hold in ' +
          'general, but \\(\\det K\\) constraints on unknotting via double branched covers are still useful.</li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Counterintuitive facts</h4>' +
        '<ul>' +
          '<li>Some knots require more crossing changes from a <em>minimum-crossing</em> diagram than from a ' +
          'non-minimal one. An explicit example is the knot \\(10_8\\).</li>' +
          '<li>Additivity \\(u(K_1 \\# K_2) = u(K_1) + u(K_2)\\) is <em>open</em>. It is not even known if ' +
          '\\(u(K \\# K) = 2u(K)\\) always.</li>' +
          '<li>Neither \\(|\\sigma|/2\\) nor \\(|s|/2\\) alone detects unknotting number &mdash; there exist ' +
          'knots where the bound is strict.</li>' +
        '</ul>' +
      '</div>';
  }

  function threeGenusHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Three-Genus (Seifert Genus) \\(g(K)\\)</h3>' +
        '<p>A <strong><span class="kl-term" title="Seifert surface: a compact, connected, orientable surface Σ ⊂ S³ with ∂Σ = K. Exists for every knot (Seifert 1934).">Seifert surface</span></strong> for \\(K\\) is a compact, connected, orientable surface ' +
        '\\(\\Sigma \\subset S^3\\) with \\(\\partial\\Sigma = K\\). Every knot bounds one (Seifert 1934, ' +
        'algorithmic construction described on the Polynomial Invariants tab). The <strong>three-genus</strong> ' +
        'is the smallest possible genus among all such surfaces:</p>' +
        '<div class="formula-box">$$g(K) \\;=\\; \\min\\{\\, g(\\Sigma) : \\Sigma \\text{ Seifert surface for } K\\,\\}.$$</div>' +
        '<p>\\(g(K) = 0\\) iff \\(K\\) is the unknot (the only knot that bounds a disk in \\(S^3\\)).</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Key properties</h4>' +
        '<ul>' +
          '<li><strong>Additivity.</strong> \\(g(K_1 \\# K_2) = g(K_1) + g(K_2)\\). Proved by Schubert; follows ' +
          'from a sphere-decomposition argument.</li>' +
          '<li><strong><span class="kl-term" title="Alexander polynomial Δ_K(t) ∈ ℤ[t,t⁻¹]: Laurent polynomial invariant (1928), det(tV−Vᵀ) up to ±t^k; satisfies Δ_K(t) ≐ Δ_K(t⁻¹) and Δ_K(1)=±1.">Alexander polynomial</span> lower bound.</strong> \\(2 g(K) \\geq \\deg \\Delta_K(t) - 1\\) (where ' +
          '\\(\\Delta_K\\) is normalized symmetrically). Often sharp, but not always: e.g. for connected sums ' +
          'of Whitehead doubles.</li>' +
          '<li><strong><span class="kl-term" title="Knot Floer homology (Ozsváth–Szabó & Rasmussen, 2003): bigraded abelian group HFK̂(K,j) built from Heegaard diagrams with basepoints; categorifies the Alexander polynomial; detects Seifert genus and fiberedness.">Knot Floer homology</span> detection.</strong> Ozsv&aacute;th&ndash;Szab&oacute; (2004): ' +
          '\\(g(K) = \\max\\{\\,i : \\widehat{HFK}(K, i) \\neq 0\\,\\}\\). This is a <em>theorem</em>, not a bound; ' +
          'knot Floer detects the Seifert genus on the nose.</li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4><span class="kl-term" title="Fibered knot: the complement S³∖K fibers over S¹; the fiber is a minimal-genus Seifert surface and its monodromy determines the knot type.">Fibered knot</span>s</h4>' +
        '<p>A knot is <strong>fibered</strong> if its complement is a surface bundle over \\(S^1\\). For ' +
        'fibered knots the fiber realizes \\(g(K)\\), and the Alexander polynomial is <em>monic</em> ' +
        '(leading coefficient \\(\\pm 1\\)). This is again detected by knot Floer homology: \\(K\\) is fibered ' +
        'iff \\(\\widehat{HFK}(K, g(K)) \\cong \\mathbb{Z}\\) (Ghiggini&ndash;Ni).</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Four-genus \\(g_4(K)\\)</h4>' +
        '<p>The <strong>four-genus</strong> (slice genus) is the smallest genus of a smooth orientable surface ' +
        'in \\(B^4\\) bounded by \\(K \\subset S^3 = \\partial B^4\\). Always \\(g_4(K) \\leq g(K)\\), and the gap ' +
        'can be arbitrary: for instance \\(g(4_1) = 1\\) and \\(g_4(4_1) = 1\\) (so here no gap), but for ' +
        'untwisted Whitehead doubles one has \\(g = 1\\) while \\(g_4 = 0\\) or \\(1\\) depending on the ' +
        'companion. The <span class="kl-term" title="Smoothly slice knot: bounds a smoothly embedded disk in B⁴, i.e. g₄(K)=0. Smooth sliceness is strictly stronger than topological sliceness (Casson–Gordon, Freedman).">smoothly slice</span> vs. <span class="kl-term" title="Topologically slice: bounds a locally-flat embedded disk in B⁴. Freedman (1982): knots with Δ_K(t)=1 are topologically slice.">topologically slice</span> distinction is where gauge theory enters. Milnor\'s conjecture' +
        '\\(g_4(T_{p,q}) = \\tfrac12(p-1)(q-1)\\), proved by Kronheimer&ndash;Mrowka (1993) using gauge theory, ' +
        'was the first major success of smooth 4-manifold invariants applied to knot theory.</p>' +
      '</div>';
  }

  function determinantHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Determinant \\(\\det(K)\\)</h3>' +
        '<p>The <strong>determinant</strong> of a knot is</p>' +
        '<div class="formula-box">$$\\det(K) \\;=\\; |\\Delta_K(-1)| \\;=\\; |\\det(V + V^{T})|,$$</div>' +
        '<p>where \\(V\\) is any <span class="kl-term" title="Seifert matrix V: g×g integer matrix V_{ij} = lk(a_i, a_j⁺) where {a_i} is a basis of H₁(Σ) and a_j⁺ is the pushoff in the positive normal direction. Depends on choice of surface and basis.">Seifert matrix</span>. Equivalently,</p>' +
        '<div class="formula-box">$$\\det(K) \\;=\\; |H_1(\\Sigma_2(K);\\,\\mathbb{Z})|,$$</div>' +
        '<p>the order of the first homology of the double cover of \\(S^3\\) branched along \\(K\\). This is ' +
        'the cleanest topological meaning: \\(\\det(K)\\) counts something geometric.</p>' +
        '<p>The determinant is always a <em>positive odd integer</em> for knots. (Reason: ' +
        '\\(\\Sigma_2(K)\\) is a rational homology sphere, so \\(|H_1|\\) is odd.)</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Why the determinant matters</h4>' +
        '<ul>' +
          '<li><strong>Colorability.</strong> \\(K\\) admits a <span class="kl-term" title="Fox p-coloring: assigns labels in ℤ/p to arcs of a diagram so that at each crossing 2·(over-label) ≡ (sum of under-labels) mod p. Non-trivial coloring exists iff p | det(K).">Fox \\(p\\)-coloring</span> (for an odd prime \\(p\\)) ' +
          'iff \\(p \\mid \\det(K)\\). This was the first combinatorial test for knottedness &mdash; ' +
          'tricolorability distinguishes the trefoil from the unknot.</li>' +
          '<li><strong><span class="kl-term" title="n-fold cyclic branched cover Σₙ(K): the n-fold cover of S³ branched along K, obtained by taking the n-fold cyclic cover of the complement and filling the boundary torus.">Cyclic branched covers</span>.</strong> \\(\\det(K) = |H_1(\\Sigma_2(K))|\\) gives an ' +
          'elementary bound on how complicated the 2-fold branched cover can be.</li>' +
          '<li><strong>Slice obstructions.</strong> If \\(K\\) is a <span class="kl-term" title="Slice knot: bounds a smoothly embedded disk in B⁴ (i.e. g₄(K)=0). Equivalently, K is concordant to the unknot.">slice knot</span> (smoothly) then \\(\\det(K)\\) is a ' +
          'perfect square (Murasugi&ndash;Fox). E.g. \\(\\det(3_1) = 3\\) is not a square, so \\(3_1\\) is not ' +
          'slice.</li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Small knots</h4>' +
        '<table class="dict-table" style="width:100%;max-width:420px;margin:0 auto;">' +
          '<thead><tr><th>Knot</th><th>\\(\\det\\)</th><th>Slice?</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>\\(0_1\\)</td><td>1</td><td>yes (trivially)</td></tr>' +
            '<tr><td>\\(3_1\\)</td><td>3</td><td>no</td></tr>' +
            '<tr><td>\\(4_1\\)</td><td>5</td><td>no</td></tr>' +
            '<tr><td>\\(5_1\\)</td><td>5</td><td>no</td></tr>' +
            '<tr><td>\\(5_2\\)</td><td>7</td><td>no</td></tr>' +
            '<tr><td>\\(6_1\\)</td><td>9 = \\(3^2\\)</td><td>topologically yes, smoothly no</td></tr>' +
            '<tr><td>\\(8_8\\)</td><td>25 = \\(5^2\\)</td><td>topologically yes</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>';
  }

  function signatureHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Signature \\(\\sigma(K)\\)</h3>' +
        '<p>Pick any Seifert surface \\(\\Sigma\\) for \\(K\\) with Seifert matrix \\(V\\). The <span class="kl-term" title="Seifert form: the bilinear form on H₁(Σ) given by (a,b) ↦ lk(a, b⁺), where b⁺ is the positive pushoff. Its matrix in any basis is a Seifert matrix.">Seifert form</span> has matrix \\(V\\), and the ' +
        '<strong>symmetrized Seifert form</strong> is the symmetric matrix \\(V + V^{T}\\). The ' +
        '<strong>signature</strong></p>' +
        '<div class="formula-box">$$\\sigma(K) \\;=\\; \\operatorname{sign}(V + V^{T})$$</div>' +
        '<p>is the number of positive eigenvalues minus the number of negative eigenvalues. It is independent ' +
        'of the choice of \\(\\Sigma\\) (Trotter 1962). It is always <em>even</em> for knots.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Examples</h4>' +
        '<ul>' +
          '<li>Right-handed trefoil: \\(V + V^{T} = \\begin{pmatrix}-2 & 1\\\\ 1 & -2\\end{pmatrix}\\); eigenvalues ' +
          '\\(-1, -3\\); \\(\\sigma(3_1) = -2\\). (Left-handed trefoil: \\(+2\\).)</li>' +
          '<li>Figure-eight: symmetrized form has eigenvalues \\(+1, -1\\); \\(\\sigma(4_1) = 0\\). Consistent ' +
          'with amphichirality: \\(\\sigma(K)\\) flips sign under mirror.</li>' +
          '<li>\\((2,q)\\)-torus knot for odd \\(q \\geq 3\\): \\(\\sigma(T_{2,q}) = -(q-1)\\).</li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Why signature is concordance-invariant</h4>' +
        '<p>A <em><span class="kl-term" title="Concordance: a smooth embedded annulus in S³ × [0,1] with K₀ on one boundary and K₁ on the other. The quotient set of knots modulo concordance is the concordance group 𝒞.">concordance</span></em> between knots \\(K_0, K_1\\) is a smooth annulus ' +
        '\\(A \\subset S^3 \\times [0,1]\\) with \\(\\partial A = K_0 \\sqcup (-K_1)\\). If \\(K\\) is slice ' +
        '(concordant to the unknot) then \\(\\sigma(K) = 0\\). More generally, \\(\\sigma\\) is additive under ' +
        'connected sum and satisfies \\(|\\sigma(K)| \\leq 2 g_4(K) \\leq 2 g(K)\\). It is the oldest ' +
        'concordance invariant (Levine, Tristram 1960s) and remains one of the strongest simple ones; it ' +
        'obstructs sliceness for most small non-slice knots. See also the Levine&ndash;Tristram signature ' +
        'function \\(\\sigma_\\omega(K)\\) on the Polynomial Invariants &rsaquo; Others tab.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Bounds and sharpness</h4>' +
        '<ul>' +
          '<li>\\(|\\sigma(K)| \\leq 2\\,u(K)\\) &mdash; signature gives a lower bound on the unknotting number.</li>' +
          '<li>For positive braids, \\(\\sigma\\) is sharp for \\(g_4\\).</li>' +
          '<li>Vanishes on amphichiral knots (since \\(\\sigma(\\overline{K}) = -\\sigma(K)\\)), so ' +
          '\\(\\sigma\\) also detects chirality.</li>' +
        '</ul>' +
      '</div>';
  }

  function arfKervaireHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>The Arf Invariant \\(\\mathrm{Arf}(K) \\in \\mathbb{Z}/2\\)</h3>' +
        '<p>Given a Seifert surface \\(\\Sigma\\) with Seifert matrix \\(V\\), reduce the Seifert form mod 2 to ' +
        'a <em><span class="kl-term" title="Quadratic refinement q of a symmetric bilinear form b over 𝔽₂: a function q: V → 𝔽₂ with q(x+y) = q(x)+q(y)+b(x,y). Its Arf invariant Σ q(aᵢ)q(bᵢ) on a symplectic basis is an 𝔽₂-valued isomorphism invariant.">quadratic refinement</span></em> of the <span class="kl-term" title="Intersection form on H₁(Σ;𝔽₂): the mod-2 symmetric bilinear form (a,b) ↦ a·b counting transverse intersections. On an oriented genus-g surface it is the standard symplectic form over 𝔽₂.">intersection form</span> on \\(H_1(\\Sigma; \\mathbb{Z}/2)\\):</p>' +
        '<div class="formula-box">$$q(x) \\;=\\; V(x, x) \\bmod 2, \\qquad q(x+y) + q(x) + q(y) = x\\cdot y \\pmod 2.$$</div>' +
        '<p>The <strong>Arf invariant</strong> of the knot is the Arf invariant of this \\(\\mathbb{Z}/2\\)-valued ' +
        'quadratic form: pick a <span class="kl-term" title="Symplectic basis: a basis (a₁,b₁,…,a_g,b_g) of a symplectic vector space (V,ω) with ω(aᵢ,bⱼ)=δᵢⱼ and ω(aᵢ,aⱼ)=ω(bᵢ,bⱼ)=0. Exists for any non-degenerate symplectic form.">symplectic basis</span> \\((a_1, b_1, \\ldots, a_g, b_g)\\) of ' +
        '\\(H_1(\\Sigma;\\mathbb{Z}/2)\\) and set</p>' +
        '<div class="formula-box">$$\\mathrm{Arf}(K) \\;=\\; \\sum_{i=1}^{g} q(a_i)\\,q(b_i) \\pmod 2.$$</div>' +
        '<p>Independent of \\(\\Sigma\\) and of the symplectic basis (Arf 1941; applied to knots by ' +
        'Robertello 1965). A quick shortcut: ' +
        '\\(\\mathrm{Arf}(K) \\equiv \\tfrac{\\Delta_K(-1) - 1}{2} \\pmod 2\\), equivalently ' +
        '\\(\\mathrm{Arf}(K) = 0\\) iff \\(\\det(K) \\equiv \\pm 1 \\pmod 8\\).</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Small examples</h4>' +
        '<table class="dict-table" style="width:100%;max-width:460px;margin:0 auto;">' +
          '<thead><tr><th>Knot</th><th>\\(\\det\\)</th><th>\\(\\det \\bmod 8\\)</th><th>\\(\\mathrm{Arf}\\)</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>\\(0_1\\)</td><td>1</td><td>1</td><td>0</td></tr>' +
            '<tr><td>\\(3_1\\)</td><td>3</td><td>3</td><td>1</td></tr>' +
            '<tr><td>\\(4_1\\)</td><td>5</td><td>5</td><td>1</td></tr>' +
            '<tr><td>\\(5_1\\)</td><td>5</td><td>5</td><td>1</td></tr>' +
            '<tr><td>\\(5_2\\)</td><td>7</td><td>7</td><td>0</td></tr>' +
            '<tr><td>\\(6_1\\)</td><td>9</td><td>1</td><td>0 (slice)</td></tr>' +
            '<tr><td>\\(6_2\\)</td><td>11</td><td>3</td><td>1</td></tr>' +
            '<tr><td>\\(6_3\\)</td><td>13</td><td>5</td><td>1</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>What \\(\\mathrm{Arf}(K)\\) detects</h4>' +
        '<ul>' +
          '<li><strong>Sliceness obstruction.</strong> If \\(K\\) is (topologically or smoothly) slice, ' +
          '\\(\\mathrm{Arf}(K) = 0\\). So \\(\\mathrm{Arf}(3_1) = 1\\) says \\(3_1\\) is not slice &mdash; ' +
          'the easiest slice obstruction there is.</li>' +
          '<li><strong>Pass moves.</strong> A <em>pass move</em> on a diagram exchanges two parallel pairs of ' +
          'arcs (see Kauffman). Two knots have the same Arf invariant iff they are connected by pass moves ' +
          '(Kauffman&ndash;Robertello). So \\(\\mathrm{Arf}\\) is the <em>complete</em> pass-equivalence invariant.</li>' +
          '<li><strong>Concordance homomorphism.</strong> \\(\\mathrm{Arf}\\) is a homomorphism from the ' +
          'knot concordance group \\(\\mathcal{C}\\) to \\(\\mathbb{Z}/2\\), additive under connected sum.</li>' +
          '<li><strong>Relation to Jones.</strong> \\(V_K(i) = (-1)^{\\mathrm{Arf}(K)} \\cdot \\sqrt{2}^{\\,?}\\) ' +
          '&mdash; up to normalization, the value of the Jones polynomial at \\(q = i\\) is determined by the ' +
          'Arf invariant (Jones, Murasugi).</li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h3>From Arf to Kervaire</h3>' +
        '<p>The Arf invariant is the one-dimensional instance of a much more general story in surgery theory. ' +
        'Kervaire (1960) defined an invariant</p>' +
        '<div class="formula-box">$$\\operatorname{Kerv}: \\Omega^{\\mathrm{fr}}_{4k+2} \\longrightarrow \\mathbb{Z}/2$$</div>' +
        '<p>on <span class="kl-term" title="Framed cobordism: equivalence classes of closed manifolds M with a trivialization of their stable normal bundle, under cobordism respecting the framing. Ω^{fr}_n ≅ π_n^s(S⁰) by Pontrjagin–Thom.">framed cobordism</span> classes of closed \\((4k+2)\\)-manifolds, built from a quadratic refinement of ' +
        'the intersection form on middle-dimensional homology &mdash; literally the same construction as Arf, ' +
        'but in dimension \\(4k+2\\) instead of dimension 2. For \\(k = 0\\) this <em>is</em> the Arf ' +
        'invariant of knots (via the surgery interpretation of a Seifert surface). For \\(k = 1\\) it is the ' +
        'Kervaire invariant of framed 6-manifolds.</p>' +
        '<p>In the <span class="kl-term" title="Stable homotopy: the category of spectra; stable homotopy groups π_n^s(S⁰) = colim_k π_{n+k}(S^k). Framed bordism of n-manifolds ≅ π_n^s(S⁰).">stable homotopy</span> category this becomes an invariant on the image of the Hopf map family,</p>' +
        '<div class="formula-box">$$\\theta_j \\in \\pi^{s}_{2^{j+1}-2}(S^{0}), \\qquad \\operatorname{Kerv}(\\theta_j) = 1\\ ?$$</div>' +
        '<p>The famous <strong>Kervaire invariant problem</strong> asks for which \\(j\\) such a class ' +
        '\\(\\theta_j\\) exists with non-zero Kervaire invariant. Classical work of Browder (1969) showed it ' +
        'can only happen for \\(j \\leq \\infty\\) satisfying a combinatorial constraint on Adams-spectral ' +
        'sequence differentials; \\(\\theta_1, \\ldots, \\theta_5\\) are known to exist (in dimensions ' +
        '\\(2, 6, 14, 30, 62\\)). <span class="kl-term" title="Hill–Hopkins–Ravenel (2009): θⱼ ∈ π^s_{2^{j+1}−2}(S⁰) vanishes for j ≥ 7, settling the Kervaire invariant problem in all dimensions except 2,6,14,30,62,126. Proof uses equivariant stable homotopy and a slice filtration.">Hill&ndash;Hopkins&ndash;Ravenel</span> (2009) proved that \\(\\theta_j\\) does ' +
        '<em>not</em> exist for \\(j \\geq 7\\), leaving \\(j = 6\\) (dimension 126) as the only open case ' +
        '&mdash; one of the most celebrated results in modern homotopy theory.</p>' +
        '<p>The takeaway: the humble mod-2 Arf invariant of a knot, originally introduced for purely ' +
        'three-dimensional reasons, is the first non-trivial instance of an invariant that determines the ' +
        'existence of exotic framed manifolds in <em>every</em> dimension \\(4k+2\\). The same local ' +
        'algebra &mdash; quadratic refinement of a symplectic form over \\(\\mathbb{F}_2\\) &mdash; governs ' +
        'both.</p>' +
      '</div>';
  }

  // ───────────────────────────────────────────────────────────────────
  //  Knot Group  (kept largely as-is, lightly expanded)
  // ───────────────────────────────────────────────────────────────────

  function knotGroupHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>The Knot Group \\(\\pi_1(S^3 \\setminus K)\\)</h3>' +
        '<p>The <strong>knot group</strong> is the fundamental group of the knot complement:</p>' +
        '<div class="formula-box">$$\\pi_G(K) \\;:=\\; \\pi_1(S^3 \\setminus K).$$</div>' +
        '<p>It is one of the most powerful knot invariants &mdash; complete on prime knots, in a sense made ' +
        'precise by Gordon&ndash;Luecke below.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4><span class="kl-term" title="Wirtinger presentation: presentation of π₁(S³∖K) with one generator per arc of a diagram (a meridian) and one relation per crossing expressing the conjugation x_j = x_k⁻¹ x_i x_k. Always n generators and n−1 relations for an n-crossing diagram.">Wirtinger presentation</span></h4>' +
        '<p>Given a diagram with \\(n\\) arcs (segments between under-crossings), label each arc by a ' +
        'generator \\(x_i\\) (thought of as a small meridian loop around that arc, oriented by a fixed ' +
        'normal). Each crossing contributes a relation: if arcs \\(x_i\\) and \\(x_j\\) meet under the ' +
        'over-strand \\(x_k\\),</p>' +
        '<div class="formula-box">$$x_j \\;=\\; x_k^{-1}\\,x_i\\,x_k \\qquad \\text{(positive crossing)}.$$</div>' +
        '<p>For a diagram with \\(n\\) crossings, one of the \\(n\\) relations is a consequence of the others, ' +
        'so the presentation has \\(n\\) generators and \\(n-1\\) relations.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Examples</h4>' +
        '<ul style="line-height:2;">' +
          '<li><strong>Unknot:</strong> \\(\\pi_G(0_1) \\cong \\mathbb{Z}\\).</li>' +
          '<li><strong>Trefoil:</strong> \\(\\pi_G(3_1) \\cong \\langle a, b \\mid a^2 = b^3 \\rangle\\), isomorphic ' +
          'to the braid group \\(B_3\\) and to \\(\\widetilde{SL}_2(\\mathbb{Z})\\).</li>' +
          '<li><strong>Figure-eight:</strong> \\(\\pi_G(4_1) \\cong \\langle a, b \\mid ab^{-1}a^{-1}bab^{-1} = b^{-1}ab^{-1}a^{-1}b \\rangle\\), ' +
          'with hyperbolic volume \\(\\approx 2.0299\\ldots\\) &mdash; the smallest-volume orientable hyperbolic 3-manifold.</li>' +
          '<li><strong>\\((p,q)\\)-torus knot:</strong> \\(\\pi_G(T_{p,q}) \\cong \\langle a, b \\mid a^p = b^q\\rangle\\), ' +
          'with non-trivial center generated by \\(a^p = b^q\\).</li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Fundamental properties</h4>' +
        '<ul>' +
          '<li><strong>Abelianization.</strong> \\(\\pi_G(K)^{\\mathrm{ab}} \\cong \\mathbb{Z}\\), generated by ' +
          'any meridian. Hence the trivial loop in first homology is geometric: every knot looks the same to ' +
          'first homology.</li>' +
          '<li><strong>Unknot detection.</strong> \\(K\\) is the unknot iff \\(\\pi_G(K) \\cong \\mathbb{Z}\\) ' +
          '(<span class="kl-term" title="Dehn&rsquo;s lemma (Papakyriakopoulos 1957): if a PL map of a disk into a 3-manifold is an embedding on the boundary, then the boundary curve bounds an embedded disk. Consequence: π₁(S³∖K) = ℤ iff K is the unknot.">Dehn&rsquo;s Lemma</span>, Papakyriakopoulos 1957).</li>' +
          '<li><strong><span class="kl-term" title="Gordon–Luecke (1989): if two knots have homeomorphic complements in S³, they are isotopic (up to mirror).">Gordon&ndash;Luecke (1989)</span>.</strong> The knot complement determines the knot up to mirror ' +
          'image. Combined with the peripheral structure (meridian&ndash;longitude pair), the knot group is a ' +
          'complete invariant for prime knots.</li>' +
          '<li><strong>Fox calculus.</strong> The Alexander polynomial is recovered from the knot group by ' +
          'taking the abelianization of the kernel of the abelianization map; computationally via Fox partial ' +
          'derivatives on the Wirtinger presentation.</li>' +
          '<li><strong>Hyperbolic vs. Seifert-fibered vs. satellite.</strong> By Thurston\'s geometrization, ' +
          'every knot complement is either hyperbolic, Seifert fibered (torus knots, some cables), or a ' +
          'satellite. For <span class="kl-term" title="Hyperbolic knot: S³∖K admits a complete hyperbolic metric of finite volume. Generic among knots; volume and all geometric data are knot invariants.">hyperbolic knot</span>s, the representation ' +
          '\\(\\pi_G(K) \\hookrightarrow \\mathrm{PSL}_2(\\mathbb{C})\\) is rigid (<span class="kl-term" title="Mostow rigidity (1968): for n ≥ 3, a complete finite-volume hyperbolic n-manifold is determined up to isometry by its fundamental group. Hence hyperbolic volume and all geometric invariants are topological.">Mostow</span> rigidity), so the complete ' +
          'hyperbolic structure is a knot invariant.</li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Peripheral system</h4>' +
        '<p>Inside \\(\\pi_G(K)\\), fix the conjugacy class of a <strong><span class="kl-term" title="Meridian μ: a small loop on ∂N(K) bounding a disk in the tubular neighborhood N(K), linking K once. Generates the abelianization π_G(K)^ab = ℤ.">meridian</span></strong> \\(\\mu\\) (a small ' +
        'positively-oriented loop linking \\(K\\) once) and a <strong><span class="kl-term" title="Longitude λ: a curve on ∂N(K) isotopic to K and null-homologous in S³∖K (the preferred or Seifert longitude). Together with μ it forms a basis of π₁(∂N(K)) ≅ ℤ².">longitude</span></strong> \\(\\lambda\\) ' +
        '(a curve on \\(\\partial N(K)\\) that is null-homologous in the complement). The pair ' +
        '\\((\\mu, \\lambda)\\) generates the <em><span class="kl-term" title="Peripheral subgroup: image of π₁(∂N(K)) ≅ ℤ² in π_G(K), generated by the meridian and longitude. The triple (π_G(K), μ, λ) is a complete invariant of a prime knot.">peripheral subgroup</span></em> \\(\\cong \\mathbb{Z}^2\\). The ' +
        'triple \\((\\pi_G(K), \\mu, \\lambda)\\) up to group isomorphism is the <strong>peripheral ' +
        'system</strong>, and it is a complete invariant of prime knots (without needing to take mirrors ' +
        'into account).</p>' +
      '</div>';
  }

  // ───────────────────────────────────────────────────────────────────
  //  Number theory  (moved from Appendix; Morishita's dictionary with
  //  expanded descriptions)
  // ───────────────────────────────────────────────────────────────────

  function numberTheoryHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Knots and Primes &mdash; Arithmetic Topology</h3>' +
        '<p>A striking analogy, now called <strong>arithmetic topology</strong>, relates the topology of knots in ' +
        '\\(S^3\\) to the arithmetic of prime numbers in \\(\\operatorname{Spec}(\\mathbb{Z})\\). Noticed in ' +
        'fragments by Mazur, Manin, Mumford, Kapranov, and Reznikov in the 1960s&ndash;90s and codified in a ' +
        'systematic dictionary by Masanori Morishita, the analogy is not a theorem but a remarkably fruitful ' +
        'heuristic: concepts on one side translate into concepts on the other, and many (though not all) ' +
        'theorems carry across.</p>' +
        '<p>The central identification is</p>' +
        '<div class="formula-box">$$\\text{knot } K \\subset S^3 \\;\\longleftrightarrow\\; \\text{prime } (p) \\subset \\operatorname{Spec}(\\mathbb{Z}).$$</div>' +
        '<p>Topologically, \\(S^3\\) is simply-connected and \\(K\\) is a 1-dimensional submanifold. ' +
        'Arithmetically, \\(\\operatorname{Spec}(\\mathbb{Z})\\) has trivial \u00e9tale \\(\\pi_1\\) (no unramified extensions of ' +
        '\\(\\mathbb{Q}\\)) and a prime \\((p)\\) is a &ldquo;codimension-1&rdquo; subscheme; an even better match is ' +
        'between the <span class="kl-term" title="Étale fundamental group π₁^ét(X,x̄): profinite group classifying finite étale covers of X. For Spec(ℤ) it is trivial (Minkowski); for Spec(ℤ[1/p]) it classifies extensions of ℚ unramified outside p.">étale fundamental group</span> \\(\\pi_1^{\\mathrm{\u00e9t}}(\\operatorname{Spec}(\\mathbb{Z}))\\) and \\(\\pi_1(S^3)\\), both of which are trivial.</p>' +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Morishita&rsquo;s Dictionary</h3>' +
        '<p>The following table summarises the main entries of the dictionary. Each row pairs a knot-theoretic ' +
        'object or invariant with its number-theoretic counterpart; an expanded description of each row appears ' +
        'below the table.</p>' +
        '<table class="dict-table" style="width:100%">' +
          '<thead><tr><th>Knot theory / 3-manifolds</th><th>Number theory / arithmetic</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>\\(S^3\\)</td><td>\\(\\operatorname{Spec}(\\mathbb{Z})\\)</td></tr>' +
            '<tr><td>Knot \\(K \\subset S^3\\)</td><td>Prime ideal \\((p) \\subset \\operatorname{Spec}(\\mathbb{Z})\\)</td></tr>' +
            '<tr><td>Link \\(L = K_1 \\cup \\cdots \\cup K_n\\)</td><td>Finite set of primes \\(\\{p_1,\\ldots,p_n\\}\\)</td></tr>' +
            '<tr><td>Knot complement \\(S^3 \\setminus K\\)</td><td>\\(\\operatorname{Spec}(\\mathbb{Z}) \\setminus \\{(p)\\} = \\operatorname{Spec}(\\mathbb{Z}[1/p])\\)</td></tr>' +
            '<tr><td>Knot group \\(\\pi_1(S^3 \\setminus K)\\)</td><td>\u00c9tale fundamental group \\(\\pi_1^{\\mathrm{\u00e9t}}(\\operatorname{Spec}(\\mathbb{Z}[1/p]))\\)</td></tr>' +
            '<tr><td>Meridian of \\(K\\)</td><td>Inertia element \\(I_p\\) at \\(p\\)</td></tr>' +
            '<tr><td>Longitude of \\(K\\)</td><td>Frobenius element \\(\\mathrm{Frob}_p\\)</td></tr>' +
            '<tr><td>Linking number \\(\\operatorname{lk}(K,L) \\bmod 2\\)</td><td>Legendre symbol \\(\\left(\\tfrac{p}{q}\\right)\\)</td></tr>' +
            '<tr><td>Triple linking (Milnor) \\(\\mu(K_1,K_2,K_3)\\)</td><td>R\u00e9dei symbol \\([p_1,p_2,p_3]\\)</td></tr>' +
            '<tr><td>Infinite cyclic cover of \\(S^3 \\setminus K\\)</td><td>Maximal pro-\\(p\\) unramified outside \\(p\\) extension of \\(\\mathbb{Q}\\)</td></tr>' +
            '<tr><td>Alexander polynomial \\(\\Delta_K(t)\\)</td><td>Iwasawa polynomial of the \\(\\mathbb{Z}_p\\)-extension</td></tr>' +
            '<tr><td>Branched cyclic cover \\(\\Sigma_n(K)\\)</td><td>Ring of integers of the \\(n\\)-th cyclotomic field</td></tr>' +
            '<tr><td>\\(H_1(\\Sigma_n(K);\\mathbb{Z})\\)</td><td>Ideal class group of the extension</td></tr>' +
            '<tr><td>Seifert surface for \\(K\\)</td><td>Arithmetic 1-chain bounding \\((p)\\)</td></tr>' +
            '<tr><td>Reidemeister torsion</td><td>\\(p\\)-adic \\(L\\)-function</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Descriptions and exposition</h3>' +

        '<h4>\\(S^3 \\longleftrightarrow \\operatorname{Spec}(\\mathbb{Z})\\)</h4>' +
        '<p>Both are &ldquo;absolute&rdquo; objects in their categories: \\(S^3\\) is simply-connected and has no ' +
        'non-trivial unramified covers; \\(\\operatorname{Spec}(\\mathbb{Z})\\) has no non-trivial unramified extensions ' +
        '(Minkowski: every number field other than \\(\\mathbb{Q}\\) has ramification). In the Grothendieck view ' +
        '\\(\\operatorname{Spec}(\\mathbb{Z})\\) is a 3-dimensional arithmetic object: \\(\\mathbb{Z}\\) has Krull ' +
        'dimension 1, but \\(\\operatorname{Spec}(\\mathbb{Z})\\) carries \u00e9tale cohomology that is ' +
        '&ldquo;Poincar\u00e9-dual to \\(H^{3-*}\\)&rdquo; in an appropriate sense (Mazur, Artin&ndash;Verdier ' +
        'duality).</p>' +

        '<h4>Knot \\(\\longleftrightarrow\\) prime</h4>' +
        '<p>A knot is a codimension-2 submanifold of \\(S^3\\); a prime \\((p)\\) is a codimension-1 closed point ' +
        'of \\(\\operatorname{Spec}(\\mathbb{Z})\\). The dimensional mismatch is resolved by regarding ' +
        '\\(\\operatorname{Spec}(\\mathbb{Z})\\) as a 3-dimensional arithmetic scheme (points of residue field ' +
        '\\(\\mathbb{F}_p\\) behave like 1-cycles). Both \\(K\\) and \\((p)\\) are indecomposable and ' +
        'codimension-2 in the relevant cohomological sense.</p>' +

        '<h4>Link \\(\\longleftrightarrow\\) finite set of primes</h4>' +
        '<p>Multi-component links parallel finite sets of primes. The &ldquo;linking&rdquo; of different primes ' +
        'shows up in power-residue symbols (quadratic, cubic, ...) just as linking numbers detect how two knots ' +
        'are intertwined.</p>' +

        '<h4>Complement \\(\\longleftrightarrow \\operatorname{Spec}(\\mathbb{Z}[1/p])\\)</h4>' +
        '<p>Removing \\(K\\) from \\(S^3\\) gives a non-compact 3-manifold whose fundamental group is the knot ' +
        'group. Inverting \\(p\\) in \\(\\mathbb{Z}\\) gives the localisation \\(\\mathbb{Z}[1/p]\\), whose ' +
        '\u00e9tale fundamental group classifies extensions of \\(\\mathbb{Q}\\) unramified outside \\(p\\). ' +
        'Both are &ldquo;one prime removed&rdquo; objects whose \\(\\pi_1\\) encodes how complicated the removed ' +
        'thing is.</p>' +

        '<h4>Knot group \\(\\longleftrightarrow\\) \u00e9tale fundamental group</h4>' +
        '<p>The analogy is very tight here. Both groups are finitely generated, have abelianisation ' +
        '\\(\\mathbb{Z}\\) (or \\(\\hat{\\mathbb{Z}}\\) profinitely) and a meaningful notion of meridian. The ' +
        '\u00e9tale \\(\\pi_1\\) governs Galois extensions of \\(\\mathbb{Q}\\) ramified only at \\(p\\); the ' +
        'knot group governs covering spaces of \\(S^3 \\setminus K\\). Many classical number-theoretic theorems ' +
        '(\u010Cebotarev, Minkowski, class field theory) have knot-theoretic shadows via this analogy.</p>' +

        '<h4>Meridian \\(\\longleftrightarrow\\) inertia, Longitude \\(\\longleftrightarrow\\) Frobenius</h4>' +
        '<p>The meridian \\(\\mu\\) lives in the peripheral subgroup and maps to a generator of the local ' +
        'fundamental group at \\(K\\); the longitude \\(\\lambda\\) is a canonical non-meridional curve. The ' +
        'arithmetic decomposition group \\(D_p \\subset \\pi_1^{\\mathrm{\u00e9t}}\\) at a prime \\(p\\) has an ' +
        '<span class="kl-term" title="Inertia subgroup I_p ⊂ D_p: the kernel of the map D_p → Gal(k̄/k) to the residue-field Galois group; measures ramification at p. Trivial iff p is unramified.">inertia subgroup</span> \\(I_p\\) (generating the ramification) and a <span class="kl-term" title="Frobenius element Frob_p: for an unramified prime p in a Galois extension, the canonical generator of D_p/I_p acting as x ↦ x^p on the residue field. Well-defined up to conjugacy.">Frobenius</span> element \\(\\mathrm{Frob}_p \\in D_p/I_p\\) ' +
        '(the action on residue fields, where Frobenius is the canonical automorphism \\(x \\mapsto x^{p}\\)). Under the dictionary meridian \\(\\leftrightarrow\\) inertia and ' +
        'longitude \\(\\leftrightarrow\\) Frobenius &mdash; both pairs are the &ldquo;local&rdquo; generators of ' +
        'their boundary tori.</p>' +

        '<h4>Linking number \\(\\longleftrightarrow\\) Legendre symbol</h4>' +
        '<p>For knots \\(K, L\\) in \\(S^3\\) the mod-2 linking number \\(\\operatorname{lk}(K,L) \\bmod 2\\) tells ' +
        'whether they are &ldquo;\\(\\mathbb{Z}/2\\)-linked.&rdquo; For primes \\(p, q\\) the Legendre symbol ' +
        '<span class="kl-term" title="Legendre symbol (a/p): equals +1 if a is a non-zero quadratic residue mod p, −1 if a non-residue, 0 if p|a. Completely multiplicative in a.">Legendre symbol</span> \\(\\left(\\frac{p}{q}\\right)\\) tells whether \\(p\\) is a quadratic residue mod \\(q\\). ' +
        '<strong><span class="kl-term" title="Quadratic reciprocity (Gauss): for distinct odd primes p,q, (p/q)(q/p) = (−1)^{(p−1)(q−1)/4}. The prototype of all reciprocity laws; analogous to symmetry of linking numbers.">Quadratic reciprocity</span></strong></p>' +
        '<div class="formula-box">$$\\left(\\tfrac{p}{q}\\right)\\left(\\tfrac{q}{p}\\right) = (-1)^{\\frac{p-1}{2}\\cdot\\frac{q-1}{2}}$$</div>' +
        '<p>corresponds to the symmetry \\(\\operatorname{lk}(K,L) = \\operatorname{lk}(L,K)\\) &mdash; but with a sign ' +
        'twist when both primes are \\(\\equiv 3 \\pmod 4\\), reflecting a subtle orientation correction.</p>' +

        '<h4>Triple linking \\(\\longleftrightarrow\\) R\u00e9dei symbol</h4>' +
        '<p>Milnor\'s triple \\(\\bar\\mu\\)-invariant \\(\\mu_{123}(L)\\) detects Borromean rings &mdash; a ' +
        'three-component link that is non-trivial even though every pair of components is a split link. The ' +
        '<strong><span class="kl-term" title="Rédei symbol [p₁,p₂,p₃] ∈ ℤ/2: a ternary mod-2 reciprocity invariant, non-zero iff the three primes are arithmetically &lsquo;Borromean&rsquo;.">R\u00e9dei symbol</span></strong> \\([p_1, p_2, p_3] \\in \\mathbb{Z}/2\\) is the arithmetic analogue: a ' +
        'mod-2 ternary reciprocity refinement of Legendre, non-zero iff the three primes are &ldquo;Borromean&rdquo; ' +
        'in an arithmetic sense. Morishita uses this to give a number-theoretic definition of Borromean triples ' +
        'of primes.</p>' +

        '<h4>Infinite cyclic cover \\(\\longleftrightarrow\\) \\(\\mathbb{Z}_p\\)-extension</h4>' +
        '<p>The maximal abelian cover of \\(S^3 \\setminus K\\) has deck group \\(\\mathbb{Z}\\), and its ' +
        'first homology is the <span class="kl-term" title="Alexander module: H₁ of the infinite cyclic cover X̃ of S³∖K, regarded as a ℤ[t,t⁻¹]-module via the deck transformation. Finitely presented; torsion for knots.">Alexander module</span> \\(H_1(\\widetilde{X}; \\mathbb{Z})\\), a module over ' +
        '\\(\\mathbb{Z}[t, t^{-1}]\\). The arithmetic analogue is the cyclotomic \\(\\mathbb{Z}_p\\)-extension ' +
        '\\(\\mathbb{Q}_\\infty / \\mathbb{Q}\\) (obtained by adjoining all \\(p^n\\)-th roots of unity and ' +
        'restricting to the \\(p\\)-part); its <span class="kl-term" title="Iwasawa module: the inverse limit X_∞ = lim A_n of p-parts of ideal class groups along the ℤ_p-extension, a compact finitely generated Λ = ℤ_p[[T]]-module.">Iwasawa module</span> is a module over \\(\\mathbb{Z}_p[\\![T]\\!]\\). ' +
        'Both are modules over a one-variable (completed) group ring with deck action \\(t\\) or \\(\\gamma\\).</p>' +

        '<h4>Alexander polynomial \\(\\longleftrightarrow\\) Iwasawa polynomial</h4>' +
        '<p>The Alexander polynomial \\(\\Delta_K(t)\\) is the generator of the first elementary ideal of the ' +
        'Alexander module. The <span class="kl-term" title="Iwasawa polynomial: a distinguished (Weierstrass) generator of the characteristic ideal of a finitely generated torsion Λ-module; its λ, μ invariants govern the growth |A_n| ~ p^{λn + μp^n + ν}.">Iwasawa polynomial</span> is the generator of the characteristic ideal of the Iwasawa ' +
        'module. Both measure the &ldquo;size&rdquo; and torsion of the relevant module over a one-variable ring. ' +
        'Mazur&rsquo;s 1964 observation that these should be analogous was the seed of the entire Morishita ' +
        'programme.</p>' +

        '<h4>Branched cover \\(\\longleftrightarrow\\) cyclotomic field</h4>' +
        '<p>The \\(n\\)-fold branched cover \\(\\Sigma_n(K) \\to S^3\\) is obtained by taking the \\(n\\)-fold ' +
        'cyclic cover of the complement and gluing back along the branch locus. Its arithmetic analogue is the ' +
        '\\(n\\)-th cyclotomic field \\(\\mathbb{Q}(\\zeta_n)\\), obtained by extracting an \\(n\\)-th root of ' +
        'unity &mdash; a degree-\\(\\varphi(n)\\) extension of \\(\\mathbb{Q}\\) ramified at primes dividing \\(n\\).</p>' +

        '<h4>\\(H_1(\\Sigma_n) \\longleftrightarrow\\) ideal class group</h4>' +
        '<p>\\(H_1(\\Sigma_n(K); \\mathbb{Z})\\) measures how far \\(\\Sigma_n\\) is from being a homology sphere &mdash; ' +
        'it encodes the non-trivial linking inside the branched cover. The ideal class group ' +
        '\\(\\operatorname{Cl}(\\mathbb{Q}(\\zeta_n))\\) measures how far the ring of cyclotomic integers is from ' +
        'being a PID. Both are finite abelian groups of surprising arithmetic depth: the orders of ' +
        'class groups of cyclotomic fields drive Iwasawa theory, just as the orders ' +
        '\\(|H_1(\\Sigma_n)|\\) drive the covering-space invariants of knots.</p>' +

        '<h4>Seifert surface \\(\\longleftrightarrow\\) arithmetic bounding chain</h4>' +
        '<p>A Seifert surface \\(\\Sigma\\) is a 2-chain in \\(S^3\\) with \\(\\partial\\Sigma = K\\). Under the ' +
        'dictionary (a prime is codim-1 in a 3-scheme), the arithmetic analogue is a divisor on an arithmetic ' +
        'surface / ideal class bounding \\((p)\\) up to principal ideals. In Arakelov theory these become ' +
        'literal 2-chains on arithmetic surfaces.</p>' +

        '<h4>Reidemeister torsion \\(\\longleftrightarrow\\) \\(p\\)-adic \\(L\\)-function</h4>' +
        '<p><span class="kl-term" title="Reidemeister torsion τ(X,ρ): an element of K₁(ℂ)/±(det of a basis change) associated to an acyclic chain complex, refining the Euler characteristic. Invariant under simple-homotopy; distinguishes lens spaces.">Reidemeister torsion</span> is a refinement of the Alexander polynomial that tracks sign and base-point ' +
        'information &mdash; a multiplicative analogue of the Euler characteristic. The \\(p\\)-adic ' +
        '<span class="kl-term" title="p-adic L-function L_p(s,χ) (Kubota–Leopoldt): p-adic analytic function interpolating classical L(1−n,χ) at negative integers; characteristic ideal of the Iwasawa module by the main conjecture.">\\(L\\)-function</span> \\(L_p(s, \\chi)\\) is Iwasawa\'s refinement of the classical \\(L\\)-function; its ' +
        'zeros control the Iwasawa module. Main conjectures of Iwasawa theory assert an identity between ' +
        '\\(p\\)-adic \\(L\\)-functions and characteristic ideals &mdash; exactly paralleling the knot-theoretic ' +
        'Turaev theorem identifying Reidemeister torsion with the Alexander polynomial up to units.</p>' +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Further reading</h3>' +
        '<ul>' +
          '<li>M. Morishita, <em>Knots and Primes: An Introduction to Arithmetic Topology</em> ' +
          '(Springer Universitext, 2012). The definitive reference.</li>' +
          '<li>B. Mazur, <em>Remarks on the Alexander polynomial</em>, unpublished notes ca. 1963&ndash;64. ' +
          'The origin of the analogy.</li>' +
          '<li>M. Kapranov, <em>Analogies between the Langlands correspondence and topological quantum ' +
          'field theory</em>, <em>Functional Analysis on the Eve of the 21st Century</em>, Birkh\u00e4user 1995.</li>' +
          '<li>A. Reznikov, <em>Three-manifolds class field theory</em>, Selecta Math. 3 (1997).</li>' +
        '</ul>' +
      '</div>';
  }

  // ───────────────────────────────────────────────────────────────────
  //  Virtual knots (kept mostly as-is)
  // ───────────────────────────────────────────────────────────────────

  function virtualKnotsHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Virtual Knots</h3>' +
        '<p><strong>Virtual knot theory</strong>, introduced by Kauffman in 1999, extends classical knot theory ' +
        'by allowing <em><span class="kl-term" title="Virtual crossing: a crossing with no over/under information, drawn as a circled intersection. Represents an artifact of projection from a thickened surface Σ×[0,1] to the plane.">virtual crossings</span></em> in addition to over/under crossings. Virtual crossings represent ' +
        'artifacts of projection and are drawn as circled intersections.</p>' +
        '<p>Virtual knots arise naturally in several guises:</p>' +
        '<ul style="line-height:1.8;">' +
          '<li>Knots in thickened surfaces \\(\\Sigma_g \\times [0,1]\\) for \\(g \\geq 1\\).</li>' +
          '<li><span class="kl-term" title="Gauss code: the sequence of crossing labels (with over/under and sign) encountered as one traverses a knot diagram once. A Gauss code is realizable as a planar diagram iff the interlacement graph satisfies a planarity condition.">Gauss code</span>s that are not realisable as classical planar diagrams (see the Diagrammatic Encodings ' +
          'sub-tab of the Home tab).</li>' +
          '<li>Abstract knot diagrams modulo generalized Reidemeister moves (adding a &ldquo;detour&rdquo; move ' +
          'for virtual crossings &mdash; the <span class="kl-term" title="Detour move: any arc containing only virtual crossings may be replaced by any other arc with the same endpoints, provided all new crossings are virtual. Together with the classical Reidemeister moves and virtual Reidemeister moves, generates virtual equivalence.">detour move</span>).</li>' +
        '</ul>' +
        '<p>Many classical invariants (Jones, Kauffman bracket, quandle) extend to virtual knots, and there are ' +
        'purely virtual invariants with no classical analogue &mdash; the <em><span class="kl-term" title="Odd writhe J(K): sum of signs of odd crossings (crossings whose Gauss-code linking is odd) in a virtual diagram. Vanishes on classical knots; detects non-classicality.">odd writhe</span></em>, <em>index ' +
        'polynomial</em>, <em>writhe polynomial</em>, and <em>arrow polynomial</em>.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h3>Virtual Knot Explorer</h3>' +
        '<p>The virtual knot explorer below allows you to enter extended Gauss codes, compute invariants, ' +
        'and browse a database of virtual knots.</p>' +
        '<div style="position:relative;width:100%;height:calc(100vh - 320px);min-height:500px;margin-top:1rem;">' +
          '<iframe id="frame-virtual-knots" src="about:blank" data-src="knot-explorer/index.html" ' +
            'style="width:100%;height:100%;border:1px solid var(--border);border-radius:8px;"></iframe>' +
        '</div>' +
      '</div>';
  }

  var virtualFrameLoaded = false;
  function initVirtualFrame() {
    if (virtualFrameLoaded) return;
    var frame = document.getElementById('frame-virtual-knots');
    if (!frame) return;
    frame.src = frame.dataset.src;
    frame.addEventListener('load', function () {
      try {
        frame.contentWindow.switchTab('virtual');
        var doc = frame.contentDocument;
        if (doc) {
          var header = doc.querySelector('header');
          if (header) header.style.display = 'none';
          var tabBar = doc.querySelector('.tab-bar');
          if (tabBar) tabBar.style.display = 'none';
        }
      } catch (e) { /* cross-origin or not loaded */ }
    });
    virtualFrameLoaded = true;
  }

  // ───────────────────────────────────────────────────────────────────
  //  Router
  // ───────────────────────────────────────────────────────────────────

  var RENDERERS = [
    crossingNumberHTML,
    bridgeNumberHTML,
    unknottingNumberHTML,
    threeGenusHTML,
    determinantHTML,
    signatureHTML,
    arfKervaireHTML,
    knotGroupHTML,
    numberTheoryHTML,
    virtualKnotsHTML
  ];

  window.renderMiscellaneous = function (containerEl) {
    var activeTab = 0;
    containerEl.innerHTML = '';

    var controls = document.createElement('div');
    controls.className = 'fk-controls';

    var subtabs = document.createElement('div');
    subtabs.className = 'fk-subtabs';

    var tabBtns = [];
    TABS.forEach(function (name, i) {
      var btn = document.createElement('button');
      btn.className = 'fk-subtab' + (i === 0 ? ' active' : '');
      btn.textContent = name;
      btn.addEventListener('click', function () { switchTab(i); });
      subtabs.appendChild(btn);
      tabBtns.push(btn);
    });
    controls.appendChild(subtabs);
    containerEl.appendChild(controls);

    var content = document.createElement('div');
    content.className = 'fk-content';
    containerEl.appendChild(content);

    function switchTab(idx) {
      activeTab = idx;
      tabBtns.forEach(function (b, i) { b.classList.toggle('active', i === idx); });
      renderTab(idx);
    }

    function renderTab(idx) {
      content.innerHTML = RENDERERS[idx]();
      // Virtual Knots subtab is index 9 (last tab): initialise iframe lazily.
      if (idx === 9) initVirtualFrame();
      try {
        if (typeof renderMathInElement === 'function') {
          renderMathInElement(content, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false
          });
        }
      } catch (e) { /* KaTeX not loaded */ }
    }

    switchTab(0);
  };
})();
