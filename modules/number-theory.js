/**
 * number-theory.js — Number Theory (Arithmetic Topology) module for KnotLab
 * Exposes window.renderNumberTheory(containerEl)
 *
 * Sub-tabs follow Morishita's dictionary entries between knot theory and
 * arithmetic. Every sub-tab is rendered as a two-column layout:
 *   left  = knot-theoretic side,
 *   right = number-theoretic side.
 *
 * HOUSE RULE: all tooltip title="..." text is plain Unicode only — no LaTeX,
 * no ASCII apostrophes (use &rsquo; / &lsquo; or Unicode \u2019).
 */
(function () {
  'use strict';

  var SUB_TABS = [
    'Overview',
    'Spec(Z) & Primes',
    'Complement & \u03c0\u2081',
    'Meridian / Longitude',
    'Linking & Reciprocity',
    'Alexander \u2194 Iwasawa',
    'Branched Covers & Class Groups',
    'Torsion & L-functions',
    'Further Reading'
  ];

  // Two-column helper: builds a grid with knot-theoretic content on the left,
  // number-theoretic on the right.
  function twoCol(leftHTML, rightHTML) {
    return '' +
      '<div class="kl-nt-twocol" style="display:grid;grid-template-columns:1fr 1fr;gap:1.5em;margin-bottom:1.25em">' +
        '<div class="kl-nt-left"  style="border-left:3px solid #2171b5;padding-left:0.9em">' +
          '<div style="font-size:0.82em;color:#2171b5;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:0.4em">Knot theory</div>' +
          leftHTML +
        '</div>' +
        '<div class="kl-nt-right" style="border-left:3px solid #c04000;padding-left:0.9em">' +
          '<div style="font-size:0.82em;color:#c04000;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:0.4em">Number theory</div>' +
          rightHTML +
        '</div>' +
      '</div>';
  }

  // ───────────────────────────────────────────────────────────────────
  //  Sub-tab panels
  // ───────────────────────────────────────────────────────────────────

  function overviewHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Knots and Primes &mdash; Arithmetic Topology</h3>' +
        '<p>A striking analogy, now called <strong>arithmetic topology</strong>, relates the topology of ' +
        'knots in \\(S^3\\) to the arithmetic of prime numbers in \\(\\operatorname{Spec}(\\mathbb{Z})\\). ' +
        'Noticed in fragments by Mazur, Manin, Mumford, Kapranov, and Reznikov in the 1960s&ndash;90s and ' +
        'codified as a systematic dictionary by <span class="kl-term" title="Masanori Morishita: Japanese number theorist who codified the knot\u2013prime analogy in the 2000s; author of Knots and Primes (Springer, 2012).">Masanori Morishita</span>, the analogy is not a theorem ' +
        'but a remarkably fruitful heuristic: concepts on one side translate into concepts on the other, ' +
        'and many (though not all) theorems carry across.</p>' +
        '<p>The central identification is</p>' +
        '<div class="formula-box">$$\\text{knot } K \\subset S^3 \\;\\longleftrightarrow\\; \\text{prime } (p) \\subset \\operatorname{Spec}(\\mathbb{Z}).$$</div>' +
      '</div>' +

      // Paired-columns intro
      twoCol(
        '<p>Topologically, \\(S^3\\) is the simplest closed \\(3\\)-manifold: simply-connected, ' +
        'homogeneous, and the base of all knot theory. A <span class="kl-term" title="Knot: a smooth embedding S\u00b9 \u21aa S\u00b3 (or its image), considered up to ambient isotopy. A 1-dimensional submanifold of S\u00b3.">knot</span> \\(K \\subset S^3\\) is a smoothly embedded ' +
        'circle; the geometry of the <span class="kl-term" title="Knot complement: the open 3-manifold S\u00b3 \u2216 K obtained by deleting a knot; determines K up to mirror by the Gordon\u2013Luecke theorem.">complement</span> \\(S^3 \\setminus K\\) ' +
        'carries everything about \\(K\\) (Gordon&ndash;Luecke).</p>',

        '<p>Arithmetically, ' +
        '<span class="kl-term" title="Spec(\u2124): the prime spectrum of the integers; as a scheme it consists of the generic point (0) and one closed point (p) for every prime p. Behaves like a 3-dimensional arithmetic manifold.">\\(\\operatorname{Spec}(\\mathbb{Z})\\)</span> is the universal base ' +
        'in number theory: trivial unramified fundamental group (' +
        '<span class="kl-term" title="Minkowski (1891): the discriminant of every number field \u2260 \u211a has absolute value > 1; hence every non-trivial extension of \u211a is ramified at some prime.">Minkowski&rsquo;s theorem</span>), ' +
        'and a prime \\((p)\\) is a closed point. The ' +
        '<span class="kl-term" title="\u00c9tale fundamental group \u03c0\u2081\u1d49\u1d57(X,x\u0304): profinite group classifying finite \u00e9tale covers of a scheme X. For Spec(\u2124) trivial; for Spec(\u2124[1/p]) the Galois group of the maximal extension of \u211a unramified outside p.">\u00e9tale \\(\\pi_1\\)</span> plays the role of the topological \\(\\pi_1\\).</p>'
      ) +

      // Morishita's dictionary (formerly its own subtab; folded into Overview)
      '<div class="expo-panel">' +
        '<h3>Morishita&rsquo;s dictionary &mdash; the entries at a glance</h3>' +
        '<p>The following table summarises the main entries of the dictionary. Each row pairs a ' +
        'knot-theoretic object or invariant with its number-theoretic counterpart; the remaining sub-tabs ' +
        'expand each row into a two-column discussion.</p>' +
        '<table class="dict-table" style="width:100%;border-collapse:collapse">' +
          '<thead><tr style="border-bottom:1.5px solid #333">' +
            '<th style="padding:6px 10px;text-align:left;color:#2171b5">Knot theory / 3-manifolds</th>' +
            '<th style="padding:6px 10px;text-align:left;color:#c04000">Number theory / arithmetic</th>' +
          '</tr></thead>' +
          '<tbody>' +
            '<tr><td style="padding:4px 10px">\\(S^3\\)</td><td style="padding:4px 10px">\\(\\operatorname{Spec}(\\mathbb{Z})\\)</td></tr>' +
            '<tr><td style="padding:4px 10px">Knot \\(K \\subset S^3\\)</td><td style="padding:4px 10px">Prime ideal \\((p) \\subset \\operatorname{Spec}(\\mathbb{Z})\\)</td></tr>' +
            '<tr><td style="padding:4px 10px">Link \\(L = K_1 \\cup \\cdots \\cup K_n\\)</td><td style="padding:4px 10px">Finite set of primes \\(\\{p_1,\\ldots,p_n\\}\\)</td></tr>' +
            '<tr><td style="padding:4px 10px">Knot complement \\(S^3 \\setminus K\\)</td><td style="padding:4px 10px">\\(\\operatorname{Spec}(\\mathbb{Z}) \\setminus \\{(p)\\} = \\operatorname{Spec}(\\mathbb{Z}[1/p])\\)</td></tr>' +
            '<tr><td style="padding:4px 10px">Knot group \\(\\pi_1(S^3 \\setminus K)\\)</td><td style="padding:4px 10px">\u00c9tale fundamental group \\(\\pi_1^{\\mathrm{\u00e9t}}(\\operatorname{Spec}(\\mathbb{Z}[1/p]))\\)</td></tr>' +
            '<tr><td style="padding:4px 10px">Meridian of \\(K\\)</td><td style="padding:4px 10px">Inertia element \\(I_p\\) at \\(p\\)</td></tr>' +
            '<tr><td style="padding:4px 10px">Longitude of \\(K\\)</td><td style="padding:4px 10px">Frobenius element \\(\\mathrm{Frob}_p\\)</td></tr>' +
            '<tr><td style="padding:4px 10px">Linking number \\(\\operatorname{lk}(K,L) \\bmod 2\\)</td><td style="padding:4px 10px">Legendre symbol \\(\\left(\\tfrac{p}{q}\\right)\\)</td></tr>' +
            '<tr><td style="padding:4px 10px">Triple linking (Milnor) \\(\\mu(K_1,K_2,K_3)\\)</td><td style="padding:4px 10px">R\u00e9dei symbol \\([p_1,p_2,p_3]\\)</td></tr>' +
            '<tr><td style="padding:4px 10px">Infinite cyclic cover of \\(S^3 \\setminus K\\)</td><td style="padding:4px 10px">Maximal pro-\\(p\\) extension unramified outside \\(p\\)</td></tr>' +
            '<tr><td style="padding:4px 10px">Alexander polynomial \\(\\Delta_K(t)\\)</td><td style="padding:4px 10px">Iwasawa polynomial of the \\(\\mathbb{Z}_p\\)-extension</td></tr>' +
            '<tr><td style="padding:4px 10px">Branched cyclic cover \\(\\Sigma_n(K)\\)</td><td style="padding:4px 10px">Ring of integers of the \\(n\\)-th cyclotomic field</td></tr>' +
            '<tr><td style="padding:4px 10px">\\(H_1(\\Sigma_n(K);\\mathbb{Z})\\)</td><td style="padding:4px 10px">Ideal class group of the extension</td></tr>' +
            '<tr><td style="padding:4px 10px">Seifert surface for \\(K\\)</td><td style="padding:4px 10px">Arithmetic 1-chain bounding \\((p)\\)</td></tr>' +
            '<tr><td style="padding:4px 10px"><span class="kl-term" title="Reidemeister torsion \u03c4(X,\u03c1): K\u2081-valued invariant of an acyclic chain complex over a twisted coefficient system; refines the Euler characteristic and distinguishes lens spaces.">Reidemeister torsion</span></td><td style="padding:4px 10px"><span class="kl-term" title="p-adic L-function L_p(s,\u03c7) (Kubota\u2013Leopoldt): p-adic analytic function interpolating L(1\u2212n,\u03c7); by the Iwasawa main conjecture it generates the characteristic ideal of the Iwasawa module.">\\(p\\)-adic \\(L\\)-function</span></td></tr>' +
          '</tbody>' +
        '</table>' +
        '<p style="margin-top:0.9em;font-size:0.95em;color:#555">Navigate the sub-tabs above to work through ' +
        'the dictionary entry by entry.</p>' +
      '</div>';
  }

  function specZHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>\\(S^3\\) \\(\\longleftrightarrow\\) \\(\\operatorname{Spec}(\\mathbb{Z})\\)</h3>' +
        twoCol(
          '<p>\\(S^3\\) is the <strong>simply-connected closed 3-manifold</strong>: ' +
          '\\(\\pi_1(S^3) = 1\\), so every connected cover is trivial. All knots and links live in this ' +
          'single ambient space &mdash; an &ldquo;absolute&rdquo; geometric universe.</p>' +
          '<p>Geometrically \\(S^3\\) has a round metric of constant curvature \\(+1\\); topologically it ' +
          'is the one-point compactification of \\(\\mathbb{R}^3\\), the boundary of a 4-ball, and the unit ' +
          'quaternions under multiplication. The ' +
          '<span class="kl-term" title="Poincar\u00e9 duality on a closed oriented n-manifold: H^k(M) \u2245 H_{n\u2212k}(M); for S\u00b3 it matches H\u2070 with H\u00b3 and H\u00b9 with H\u00b2.">Poincar\u00e9 duality</span> on \\(S^3\\) identifies \\(H^k \\cong H_{3-k}\\), an ' +
          'input into the knot-complement exact sequences.</p>',

          '<p>\\(\\operatorname{Spec}(\\mathbb{Z})\\) is the <strong>terminal object</strong> in commutative ' +
          'arithmetic geometry: every scheme has a unique map to it. It has <em>no non-trivial unramified ' +
          'covers</em> (Minkowski); equivalently ' +
          '\\(\\pi_1^{\\mathrm{\u00e9t}}(\\operatorname{Spec}(\\mathbb{Z})) = 1\\).</p>' +
          '<p>Krull dimension is \\(1\\), but in the Grothendieck / Artin&ndash;Verdier view ' +
          '\\(\\operatorname{Spec}(\\mathbb{Z})\\) behaves like a ' +
          '<strong>\\(3\\)-dimensional arithmetic manifold</strong>: its ' +
          '<span class="kl-term" title="\u00c9tale cohomology H\u00b9_\u00e9t(X,F): derived functors of global sections in the \u00e9tale topology; generalises singular cohomology to schemes and coincides with Galois cohomology in the arithmetic case.">\u00e9tale cohomology</span> ' +
          'satisfies a duality \\(H^i_{\\mathrm{\u00e9t}}(X, \\mathscr{F}) \\cong H^{3-i}_{\\mathrm{\u00e9t}}(X, \\mathscr{F}^\\vee)\\) ' +
          'mimicking Poincar\u00e9 duality in dimension 3.</p>'
        ) +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Knot \\(\\longleftrightarrow\\) prime</h3>' +
        twoCol(
          '<p>A <span class="kl-term" title="Submanifold: a subset of S\u00b3 that is itself a manifold and whose inclusion is a smooth embedding. A knot is codimension 2.">codimension-2 submanifold</span> of \\(S^3\\): the simplest possible non-trivial ' +
          '1-dimensional object. Two knots are equivalent iff ambient-isotopic, the topological analogue of ' +
          'the algebraic notion of &ldquo;same prime.&rdquo;</p>' +
          '<p>The <strong>tubular neighbourhood</strong> \\(N(K) \\cong S^1 \\times D^2\\) is a local model ' +
          'at the knot; the boundary torus \\(\\partial N(K)\\) carries the ' +
          '<span class="kl-term" title="Meridian \u03bc: a small oriented loop on \u2202N(K) bounding a disk inside N(K); generates H\u2081(S\u00b3 \u2216 K) = \u2124.">meridian</span> \\(\\mu\\) and ' +
          '<span class="kl-term" title="Longitude \u03bb: the null-homologous parallel copy of K on \u2202N(K) (Seifert-surface framing); commutes with \u03bc and generates the longitudinal direction.">longitude</span> \\(\\lambda\\).</p>',

          '<p>A <strong>closed point</strong> of \\(\\operatorname{Spec}(\\mathbb{Z})\\) with residue field ' +
          '\\(\\mathbb{F}_p\\). Although \\((p)\\) is codimension 1 in the ring, under the 3-dimensional ' +
          'arithmetic-manifold heuristic it plays the role of a codimension-2 submanifold.</p>' +
          '<p>The <strong>local ring</strong> \\(\\mathbb{Z}_{(p)}\\) (or the completion \\(\\mathbb{Z}_p\\)) ' +
          'is the arithmetic analogue of the tubular neighbourhood; its fraction field ' +
          '\\(\\mathbb{Q}_p\\) carries the local ' +
          '<span class="kl-term" title="Local Galois group Gal(\u211a\u0304_p / \u211a_p): Galois group of the algebraic closure of \u211a_p; extension 1 \u2192 I_p \u2192 Gal(\u211a\u0304_p/\u211a_p) \u2192 Gal(F\u0304_p/\u211a\u0304_p) \u2192 1 where I_p is inertia and the quotient is generated by Frobenius.">Galois group</span>, the arithmetic counterpart of \\(\\pi_1(\\partial N(K))\\).</p>'
        ) +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Link \\(\\longleftrightarrow\\) finite set of primes</h3>' +
        twoCol(
          '<p>A <strong>link</strong> is a disjoint union of knots \\(L = K_1 \\sqcup \\cdots \\sqcup K_n\\). ' +
          'Components can be nontrivially linked even if each component is individually an unknot &mdash; the ' +
          'classical Hopf and Borromean examples. <span class="kl-term" title="Linking number lk(K,L) \u2208 \u2124: signed count of crossings of K over L in any diagram; equivalently the degree of the Gauss linking map \u2202N(K) \u00d7 L \u2192 S\u00b2.">Linking numbers</span> and higher Milnor ' +
          'invariants measure the linking.</p>',

          '<p>A <strong>finite set of primes</strong> \\(\\{p_1,\\ldots,p_n\\}\\). Individually trivial ' +
          '(each prime is just a point), but arithmetically they can be &ldquo;linked&rdquo; through ' +
          '<span class="kl-term" title="Power-residue symbol (a/p)_n: \u2208 \u03bc_n, equals the image of a^{(N(p)\u22121)/n} in the residue field; generalises the Legendre symbol to higher-degree reciprocity.">power-residue symbols</span> and ' +
          '<span class="kl-term" title="R\u00e9dei symbol [p\u2081,p\u2082,p\u2083] \u2208 \u2124/2: a ternary refinement of the Legendre symbol, non-zero iff the three primes are arithmetically \u2018Borromean\u2019.">R\u00e9dei triples</span> &mdash; the subject of the Linking &amp; Reciprocity sub-tab.</p>'
        ) +
      '</div>';
  }

  function complementPi1HTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Complement \\(\\longleftrightarrow \\operatorname{Spec}(\\mathbb{Z}[1/p])\\)</h3>' +
        twoCol(
          '<p>The <strong>knot complement</strong> \\(X_K := S^3 \\setminus K\\) is an open ' +
          '3-manifold; passing to \\(S^3 \\setminus N(K)\\) gives a compact manifold with torus boundary. ' +
          'By the Gordon&ndash;Luecke theorem (1989), \\(X_K\\) determines \\(K\\) up to mirror.</p>' +
          '<p>Its <span class="kl-term" title="Knot group G(K) := \u03c0\u2081(S\u00b3 \u2216 K): deficiency-1 finitely presented group with abelianisation \u2124; a Wirtinger presentation has one generator per arc of a diagram and one relation per crossing.">knot group</span> \\(G(K) = \\pi_1(X_K)\\) has abelianisation \\(\\mathbb{Z}\\), ' +
          'generated by any meridian; the abelianisation map\u00a0' +
          '\\(\\varphi\\colon G(K) \\twoheadrightarrow \\mathbb{Z}\\) is the ' +
          '<span class="kl-term" title="Orientation map: sends every meridian to 1 \u2208 \u2124; the resulting \u2124-cover is the infinite cyclic cover X\u0303 underlying the Alexander module.">orientation map</span> ' +
          'classifying the infinite cyclic cover.</p>',

          '<p>The <strong>localisation</strong> \\(\\operatorname{Spec}(\\mathbb{Z}[1/p])\\) is ' +
          '\\(\\operatorname{Spec}(\\mathbb{Z})\\) with the single point \\((p)\\) removed. Its \u00e9tale ' +
          'fundamental group is the Galois group ' +
          '\\(G_{\\mathbb{Q}, \\{p\\}} := \\mathrm{Gal}(\\mathbb{Q}^{\\{p\\}}/\\mathbb{Q})\\) of the maximal ' +
          'extension of \\(\\mathbb{Q}\\) unramified outside \\(p\\).</p>' +
          '<p>Its <strong>abelianisation</strong> is ' +
          '\\(\\hat{\\mathbb{Z}}^{\\times}_{(p)}\\), matching the topological \\(\\mathbb{Z}\\) after ' +
          'profinite completion. The arithmetic of quadratic, cubic, \u2026, cyclotomic extensions unramified ' +
          'outside \\(p\\) is packaged into this group.</p>'
        ) +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Knot group \\(\\longleftrightarrow\\) \u00e9tale fundamental group</h3>' +
        twoCol(
          '<p>The knot group encodes every cover of the complement. Classical theorems of Papakyriakopoulos ' +
          '(<em>Dehn&rsquo;s lemma</em>, <em>sphere theorem</em>) and Thurston (geometrisation) make ' +
          'knot groups remarkably rigid: most are <span class="kl-term" title="Word-hyperbolic group (Gromov): finitely generated group whose Cayley graph is \u03b4-hyperbolic; equivalently has a linear isoperimetric inequality and biautomatic decision algorithms.">word-hyperbolic</span>, and the peripheral torus ' +
          '\\(\\pi_1(\\partial N(K)) \\cong \\mathbb{Z}^2\\) is detectable inside \\(G(K)\\).</p>' +
          '<p>Representation varieties ' +
          '\\(\\mathrm{Hom}(G(K), \\mathrm{SL}_2(\\mathbb{C}))//\\mathrm{SL}_2\\) &mdash; character varieties ' +
          '&mdash; are the hunting ground for \\(A\\)-polynomials and quantum invariants.</p>',

          '<p>\\(G_{\\mathbb{Q},\\{p\\}} = \\pi_1^{\\mathrm{\u00e9t}}(\\operatorname{Spec}(\\mathbb{Z}[1/p]))\\) ' +
          'encodes every finite extension of \\(\\mathbb{Q}\\) unramified outside \\(p\\). It is uncountably ' +
          'large and far from understood, but its abelian, metabelian, and pro-\\(p\\) quotients are ' +
          'accessible via <span class="kl-term" title="Class field theory: describes abelian extensions of a number field in terms of id\u00e8le class groups; gives a canonical isomorphism between Gal(K_{ab}/K) and (a quotient of) the id\u00e8le class group.">class field theory</span> and ' +
          '<span class="kl-term" title="Iwasawa theory: systematic study of \u2124_p-extensions and their Galois modules; central tools are the Iwasawa algebra \u039b = \u2124_p[[T]] and characteristic ideals.">Iwasawa theory</span>.</p>' +
          '<p>Classical number-theoretic theorems &mdash; ' +
          '<span class="kl-term" title="\u010cebotarev density theorem: for a Galois extension L/\u211a with group G, the density of primes whose Frobenius conjugacy class equals a fixed C \u2282 G is |C|/|G|.">\u010cebotarev density</span>, Kronecker&ndash;Weber, Iwasawa ' +
          '\u2014 all have topological shadows under Morishita&rsquo;s dictionary.</p>'
        ) +
      '</div>';
  }

  function meridianLongitudeHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Peripheral data: (meridian, longitude) \\(\\longleftrightarrow\\) (inertia, Frobenius)</h3>' +
        '<p>The cleanest entry of the whole dictionary. On each side there is a local, codimension-2 ' +
        'neighbourhood carrying two canonical generators.</p>' +
        twoCol(
          '<p>At a knot \\(K\\), the boundary torus \\(\\partial N(K) \\cong T^2\\) has first homology ' +
          '\\(\\mathbb{Z}^2\\), generated by</p>' +
          '<ul>' +
            '<li>the <span class="kl-term" title="Meridian \u03bc: a simple closed curve on \u2202N(K) bounding a disk inside N(K); well-defined up to isotopy and orientation; generates H\u2081(S\u00b3 \u2216 K) = \u2124 under inclusion.">meridian</span> \\(\\mu\\) &mdash; a small loop encircling \\(K\\), bounding a ' +
            'disk in \\(N(K)\\);</li>' +
            '<li>the <span class="kl-term" title="Longitude \u03bb: the unique curve on \u2202N(K) that is null-homologous in S\u00b3 \u2216 K; equivalently, the boundary of a Seifert surface intersected with \u2202N(K). Together with \u03bc forms a basis of H\u2081(\u2202N(K)).">longitude</span> \\(\\lambda\\) &mdash; a parallel copy of \\(K\\) chosen to be ' +
            'null-homologous in the complement (Seifert-surface framing).</li>' +
          '</ul>' +
          '<p>Under inclusion \\(\\partial N(K) \\hookrightarrow X_K\\), the meridian \\(\\mu\\) generates ' +
          'the abelianisation \\(H_1(X_K) = \\mathbb{Z}\\); the longitude \\(\\lambda\\) lies in the ' +
          'commutator subgroup and encodes the <em>linking</em> of \\(K\\) with its own Seifert surface. ' +
          'The peripheral pair \\((\\mu, \\lambda)\\) determines \\(K\\) via the ' +
          '<span class="kl-term" title="Waldhausen (1968): two Haken 3-manifolds are homeomorphic iff there is a \u03c0\u2081-isomorphism respecting peripheral structure; for knot complements this gives the peripheral-system classification.">peripheral structure</span>.</p>',

          '<p>At a prime \\(p\\) in a Galois extension \\(L/\\mathbb{Q}\\), the ' +
          '<span class="kl-term" title="Decomposition group D_p \u2282 Gal(L/\u211a): stabiliser of a chosen prime \ud835\udd13|p in L; fits in 1 \u2192 I_p \u2192 D_p \u2192 Gal(k(\ud835\udd13)/\u211a_p) \u2192 1.">decomposition group</span> \\(D_p \\subset \\mathrm{Gal}(L/\\mathbb{Q})\\) sits in an ' +
          'exact sequence</p>' +
          '<div class="formula-box">$$1 \\to I_p \\to D_p \\to \\mathrm{Gal}(k(\\mathfrak{p})/\\mathbb{F}_p) \\to 1$$</div>' +
          '<ul>' +
            '<li>the <span class="kl-term" title="Inertia subgroup I_p: kernel of D_p \u2192 Gal(k(\ud835\udd13)/\u211a_p); measures ramification. Trivial \u21d4 p unramified in L.">inertia subgroup</span> \\(I_p\\) &mdash; measures ramification;</li>' +
            '<li>the <span class="kl-term" title="Frobenius Frob_p: the canonical generator of D_p/I_p acting as x \u21a6 x^p on the residue field k(\ud835\udd13); well-defined up to conjugacy and inertia.">Frobenius</span> element \\(\\mathrm{Frob}_p \\in D_p/I_p\\) &mdash; ' +
            'acts as \\(x \\mapsto x^p\\) on the residue field.</li>' +
          '</ul>' +
          '<p>The meridian lives in the kernel of the map from the peripheral group to the orientation ' +
          '\\(\\mathbb{Z}\\), exactly as inertia lies in the kernel to the residue Galois group. ' +
          'Meridian \\(\\leftrightarrow\\) inertia, longitude \\(\\leftrightarrow\\) Frobenius.</p>'
        ) +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Why the match is tight</h3>' +
        twoCol(
          '<p>A meridian \\(\\mu\\) has ' +
          '<span class="kl-term" title="Linking number lk(\u03bc, K) = 1: the meridian loops around K exactly once; this is the topological meaning of inertia having residue-field image Frobenius.">linking number</span> \\(+1\\) with \\(K\\) &mdash; it is the ' +
          '&ldquo;unit generator&rdquo; of the local picture. The longitude, being null-homologous, is ' +
          'the Seifert-surface framing and determines the self-linking.</p>',

          '<p>Inertia at an unramified prime is trivial; the Frobenius alone generates \\(D_p\\) &mdash; ' +
          'exactly as at an unknotted prime (meridian loops a &ldquo;clean&rdquo; fibre) the longitude alone ' +
          'acts. Ramification in \\(L/\\mathbb{Q}\\) is the arithmetic analogue of a non-trivial meridional ' +
          'holonomy.</p>'
        ) +
      '</div>';
  }

  function linkingReciprocityHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Linking number \\(\\longleftrightarrow\\) Legendre symbol</h3>' +
        twoCol(
          '<p>For two disjoint knots \\(K, L \\subset S^3\\), the ' +
          '<span class="kl-term" title="Linking number lk(K,L) \u2208 \u2124: signed count of crossings of K over L in any diagram; equivalently the degree of the Gauss map or \u222b\u222b of the Gauss integrand.">linking number</span> \\(\\operatorname{lk}(K,L) \\in \\mathbb{Z}\\) ' +
          'measures their winding. Mod 2 it becomes a \\(\\mathbb{Z}/2\\)-invariant &mdash; did \\(K\\) ' +
          'bound a surface missing \\(L\\) or not?</p>' +
          '<div class="formula-box">' +
            '$$\\operatorname{lk}(K, L) \\;\\equiv\\; \\begin{cases} 0 & K \\text{ bounds in } S^3 \\setminus L \\\\ 1 & \\text{otherwise}\\end{cases} \\pmod 2$$' +
          '</div>' +
          '<p><span class="kl-term" title="Symmetry of the linking number: lk(K,L) = lk(L,K) for any two disjoint oriented knots in an oriented 3-manifold. Follows from the symmetry of the Gauss integral.">Symmetry</span>: \\(\\operatorname{lk}(K,L) = \\operatorname{lk}(L,K)\\). ' +
          'The mod-2 version is the topological template for quadratic reciprocity.</p>',

          '<p>For odd primes \\(p \\ne q\\), the ' +
          '<span class="kl-term" title="Legendre symbol (a/p): \u00b11 depending on whether a is a non-zero quadratic residue mod p; 0 if p | a. Completely multiplicative in a.">Legendre symbol</span> ' +
          '\\(\\left(\\tfrac{p}{q}\\right) \\in \\{\\pm 1\\}\\) measures whether \\(p\\) is a square mod ' +
          '\\(q\\).</p>' +
          '<p><strong><span class="kl-term" title="Quadratic reciprocity (Gauss 1796): (p/q)(q/p) = (\u22121)^{(p\u22121)(q\u22121)/4} for distinct odd primes p,q. Equivalently (p/q) = (q/p) unless both p,q \u2261 3 mod 4, in which case they differ in sign.">Quadratic reciprocity</span></strong> (Gauss 1796):</p>' +
          '<div class="formula-box">$$\\left(\\tfrac{p}{q}\\right)\\!\\left(\\tfrac{q}{p}\\right) \\;=\\; (-1)^{\\frac{p-1}{2}\\cdot\\frac{q-1}{2}}.$$</div>' +
          '<p>This is the mod-2 linking-symmetry of primes, with an arithmetic sign correction when both ' +
          'are \\(\\equiv 3 \\pmod 4\\).</p>'
        ) +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Triple linking \\(\\longleftrightarrow\\) R\u00e9dei symbol</h3>' +
        twoCol(
          '<p>Milnor&rsquo;s triple ' +
          '<span class="kl-term" title="Milnor \u03bc\u0304-invariant \u03bc(K\u2081,K\u2082,K\u2083) \u2208 \u2124: the lowest-order link-homotopy invariant beyond pairwise linking; detects Borromean rings when all pairwise linkings vanish.">\u03bc-invariant</span> \\(\\mu_{123}(L) \\in \\mathbb{Z}\\) is the first link-homotopy ' +
          'invariant beyond pairwise linking. For the ' +
          '<span class="kl-term" title="Borromean rings: a three-component link in which every two-component sublink is trivial, but the full link is non-trivial; detected by triple Milnor invariant = \u00b11.">Borromean rings</span> it equals \\(\\pm 1\\), witnessing the ' +
          'classic &ldquo;any two unlink, but all three do not.&rdquo;</p>' +
          '<p>More formally, \\(\\mu_{123}\\) is extracted from Massey products of meridians in the ' +
          'cohomology of the complement.</p>',

          '<p>The <strong><span class="kl-term" title="R\u00e9dei symbol [p\u2081,p\u2082,p\u2083] \u2208 \u2124/2: defined when all three pairwise Legendre symbols vanish; measures whether a Borromean-type ternary extension \u2018splits.\u2019 Discovered by L. R\u00e9dei in the 1930s.">R\u00e9dei symbol</span></strong> ' +
          '\\([p_1, p_2, p_3] \\in \\mathbb{Z}/2\\) is the arithmetic analogue: a mod-2 ternary refinement ' +
          'of the Legendre symbol, defined when all pairwise Legendre symbols vanish and detecting whether ' +
          'the three primes are &ldquo;arithmetically Borromean.&rdquo;</p>' +
          '<p>Morishita (2004) showed \\([p_1, p_2, p_3]\\) is literally the mod-2 triple Massey product in ' +
          '\\(H^*(G_{\\mathbb{Q},\\{p_1,p_2,p_3\\}}, \\mathbb{F}_2)\\) &mdash; the arithmetic Massey product ' +
          'matching the topological one by construction.</p>'
        ) +
      '</div>';
  }

  function alexanderIwasawaHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Infinite cyclic cover \\(\\longleftrightarrow\\) \\(\\mathbb{Z}_p\\)-extension</h3>' +
        twoCol(
          '<p>The orientation map \\(\\varphi\\colon \\pi_1(X_K) \\twoheadrightarrow \\mathbb{Z}\\) ' +
          'classifies a regular \\(\\mathbb{Z}\\)-cover \\(\\widetilde X_K \\to X_K\\) &mdash; the ' +
          '<strong>infinite cyclic cover</strong>. Geometrically it is \\(X_K\\) cut along a Seifert ' +
          'surface and glued infinitely along the resulting copies.</p>' +
          '<p>Its first homology is the <span class="kl-term" title="Alexander module A(K) = H\u2081(X\u0303; \u2124): finitely generated torsion module over \u039b = \u2124[t, t\u207b\u00b9] with t the deck transformation.">Alexander module</span></p>' +
          '<div class="formula-box">$$A(K) \\;=\\; H_1(\\widetilde X_K; \\mathbb{Z}),$$</div>' +
          '<p>a finitely generated torsion module over ' +
          '\\(\\Lambda = \\mathbb{Z}[t, t^{-1}]\\), with \\(t\\) acting as the deck transformation.</p>',

          '<p>The <strong>cyclotomic</strong> \\(\\mathbb{Z}_p\\)-extension ' +
          '\\(\\mathbb{Q}_{\\infty}/\\mathbb{Q}\\) is obtained by adjoining all \\(p^n\\)-th roots of ' +
          'unity and taking the unique \\(\\mathbb{Z}_p\\)-tower inside. Its Galois group is ' +
          '\\(\\Gamma \\cong \\mathbb{Z}_p\\), generated by a topological generator \\(\\gamma\\).</p>' +
          '<p>Letting \\(A_n\\) be the \\(p\\)-part of the ideal class group of the \\(n\\)-th layer, the ' +
          '<span class="kl-term" title="Iwasawa module X_\u221e := lim A_n: projective limit of p-parts of class groups along the \u2124_p-tower; a finitely generated torsion module over \u039b_p = \u2124_p[[T]] with T = \u03b3 \u2212 1.">Iwasawa module</span> is</p>' +
          '<div class="formula-box">$$X_{\\infty} \\;=\\; \\varprojlim_n A_n,$$</div>' +
          '<p>a finitely generated module over the ' +
          '<span class="kl-term" title="Iwasawa algebra \u039b_p = \u2124_p[[T]] \u2245 \u2124_p[[\u0393]]: completed group algebra of \u0393, a regular local 2-dimensional ring; topologically generated by T = \u03b3 \u2212 1.">Iwasawa algebra</span> \\(\\Lambda_p = \\mathbb{Z}_p[\\![T]\\!]\\), ' +
          '\\(T = \\gamma - 1\\).</p>'
        ) +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Alexander polynomial \\(\\longleftrightarrow\\) Iwasawa polynomial</h3>' +
        twoCol(
          '<p>The <strong>Alexander polynomial</strong> \\(\\Delta_K(t) \\in \\Lambda\\) generates (up to ' +
          'units \\(\\pm t^k\\)) the first elementary ideal of \\(A(K)\\):</p>' +
          '<div class="formula-box">$$E_1(A(K)) \\;=\\; (\\Delta_K(t)).$$</div>' +
          '<p>It satisfies \\(\\Delta_K(1) = \\pm 1\\) and the ' +
          '<span class="kl-term" title="Reciprocity of \u0394_K: \u0394_K(t\u207b\u00b9) = \u00b1 t\u207b\u1d48 \u0394_K(t) where d = deg \u0394_K; follows from Poincar\u00e9 duality on the Alexander module.">reciprocity</span> ' +
          '\\(\\Delta_K(t^{-1}) = \\pm t^{-d}\\Delta_K(t)\\).</p>',

          '<p>The <strong><span class="kl-term" title="Iwasawa polynomial f(T): distinguished (Weierstrass) generator of the characteristic ideal of X_\u221e; factors as p^\u03bc \u00b7 distinguished with \u03bc \u2265 0 and deg = \u03bb. Invariants (\u03bc, \u03bb, \u03bd) govern |A_n| \u223c p^{\u03bb n + \u03bc p\u207f + \u03bd}.">Iwasawa polynomial</span></strong> \\(f(T)\\) is a ' +
          'distinguished Weierstrass generator of the characteristic ideal ' +
          '\\(\\mathrm{char}(X_{\\infty}) \\subset \\Lambda_p\\). Its \\(\\lambda, \\mu, \\nu\\) invariants ' +
          'govern the growth of \\(|A_n|\\) as</p>' +
          '<div class="formula-box">$$|A_n| \\;=\\; p^{\\lambda n + \\mu p^n + \\nu}, \\qquad n \\gg 0.$$</div>' +
          '<p>Mazur&rsquo;s 1964 observation that \\(\\Delta_K\\) and \\(f(T)\\) should be analogous was ' +
          'the seed of the whole programme.</p>'
        ) +
      '</div>';
  }

  function branchedCoversHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Cyclic branched cover \\(\\longleftrightarrow\\) cyclotomic field</h3>' +
        twoCol(
          '<p>The <strong>\\(n\\)-fold cyclic branched cover</strong> \\(\\Sigma_n(K) \\to S^3\\) is ' +
          'constructed from the \\(n\\)-fold cover of the complement \\(X_K \\to X_K^{(n)}\\) (corresponding ' +
          'to \\(\\pi_1(X_K) \\twoheadrightarrow \\mathbb{Z} \\twoheadrightarrow \\mathbb{Z}/n\\)) by gluing ' +
          'back solid tori over the branch locus \\(K\\). When \\(K\\) is the unknot, ' +
          '\\(\\Sigma_n = S^3\\) for all \\(n\\); for the trefoil, \\(\\Sigma_2(3_1) = L(3,1)\\) (a lens ' +
          'space), and \\(\\Sigma_3(3_1) = S^3/Q_8\\) (a Brieskorn sphere).</p>',

          '<p>The <strong>\\(n\\)-th cyclotomic field</strong> ' +
          '\\(\\mathbb{Q}(\\zeta_n) = \\mathbb{Q}[x]/(\\Phi_n(x))\\), where \\(\\zeta_n = e^{2\\pi i/n}\\), ' +
          'is obtained from \\(\\mathbb{Q}\\) by adjoining a primitive \\(n\\)-th root of unity. Its ring ' +
          'of integers is \\(\\mathbb{Z}[\\zeta_n]\\); the degree \\([\\mathbb{Q}(\\zeta_n):\\mathbb{Q}] = \\varphi(n)\\) ' +
          'and the extension is <span class="kl-term" title="Ramified prime: a prime p at which the factorisation (p) = \ud835\udd13\u2081^{e\u2081}\u22ef has some e_i > 1 in the ring of integers of the extension; for \u2124[\u03b6_n] the ramified primes are exactly those dividing n.">ramified exactly at primes dividing \\(n\\)</span>.</p>'
        ) +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>\\(H_1(\\Sigma_n) \\longleftrightarrow\\) ideal class group</h3>' +
        twoCol(
          '<p>\\(H_1(\\Sigma_n(K); \\mathbb{Z})\\) is a finite abelian group (for \\(\\gcd(n, \\Delta_K(1)) = 1\\)); ' +
          'its order is</p>' +
          '<div class="formula-box">$$|H_1(\\Sigma_n)| \\;=\\; \\prod_{j=1}^{n-1} |\\Delta_K(\\zeta_n^j)|,$$</div>' +
          '<p>a classical formula relating the branched-cover homology to values of the Alexander polynomial ' +
          'at roots of unity. It measures how far \\(\\Sigma_n\\) is from being a ' +
          '<span class="kl-term" title="Homology sphere: a closed 3-manifold with the same homology as S\u00b3; equivalently H\u2081 = 0. Poincar\u00e9 homology sphere is the canonical example.">homology sphere</span>.</p>',

          '<p>The <strong><span class="kl-term" title="Ideal class group Cl(O_K): (fractional ideals of O_K)/(principal ideals); finite abelian group measuring how far O_K is from being a PID.">ideal class group</span></strong> ' +
          '\\(\\operatorname{Cl}(\\mathbb{Q}(\\zeta_n)) = \\mathrm{Cl}(\\mathbb{Z}[\\zeta_n])\\) measures how ' +
          'far \\(\\mathbb{Z}[\\zeta_n]\\) is from being a PID. Its \\(p\\)-parts for \\(p \\mid n\\) are ' +
          'governed by Iwasawa theory and by the Herbrand&ndash;Ribet and Mazur&ndash;Wiles theorems, which ' +
          'factor the class number through Bernoulli numbers.</p>' +
          '<p>The orders \\(|\\mathrm{Cl}|\\) are the arithmetic shadows of \\(|H_1(\\Sigma_n)|\\).</p>'
        ) +
      '</div>';
  }

  function torsionLFnHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Seifert surface \\(\\longleftrightarrow\\) arithmetic bounding chain</h3>' +
        twoCol(
          '<p>A <strong><span class="kl-term" title="Seifert surface \u03a3: a compact oriented surface in S\u00b3 with \u2202\u03a3 = K; exists by the Seifert algorithm (1934) and is unique up to stabilisation.">Seifert surface</span></strong> ' +
          '\\(\\Sigma \\subset S^3\\) is a compact oriented 2-chain with \\(\\partial\\Sigma = K\\). It ' +
          'exists for every knot (Seifert&rsquo;s algorithm), gives a ' +
          '<span class="kl-term" title="Seifert genus g(K): minimal genus among all Seifert surfaces; a powerful knot invariant that bounds the unknotting and slice genera.">Seifert genus</span> \\(g(K)\\), and is the starting point for the ' +
          'Alexander matrix \\(V - tV^T\\).</p>',

          '<p>Under the Morishita dictionary, a prime \\((p)\\) is &ldquo;codimension 1&rdquo; in the ' +
          '3-arithmetic-manifold view &mdash; its bounding chain would be a divisor on an ' +
          '<span class="kl-term" title="Arakelov arithmetic surface: a regular 2-dimensional scheme fibred over Spec(O_K), compactified at archimedean places via Hermitian line bundles; Arakelov (1974) made intersection theory work on such.">arithmetic surface</span>, or an ideal class bounding \\((p)\\) modulo principal ideals. ' +
          'In Arakelov theory these become literal 2-chains, and the arithmetic analogue of the Seifert ' +
          'matrix underlies \\(p\\)-adic height pairings.</p>'
        ) +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Reidemeister torsion \\(\\longleftrightarrow\\) \\(p\\)-adic \\(L\\)-function</h3>' +
        twoCol(
          '<p><span class="kl-term" title="Reidemeister torsion \u03c4(X,\u03c1): an element of K\u2081(\u211a(t))/\u00b1(det of a basis change) associated to an acyclic chain complex; refines the Euler characteristic and distinguishes lens spaces (Reidemeister 1935).">Reidemeister torsion</span> \\(\\tau(X_K, \\rho)\\) is a ' +
          'refinement of the Alexander polynomial that tracks sign and base-point information &mdash; a ' +
          'multiplicative analogue of the Euler characteristic, defined from an acyclic chain complex over ' +
          'a twisted coefficient system.</p>' +
          '<p>By a theorem of Turaev, ' +
          '\\(\\tau(X_K, \\mathrm{id}) = \\Delta_K(t)/(t - 1)\\) up to units of \\(\\Lambda\\); so Reidemeister ' +
          'torsion <em>is</em> the Alexander polynomial, refined.</p>',

          '<p>The <strong><span class="kl-term" title="p-adic L-function L_p(s,\u03c7) (Kubota\u2013Leopoldt 1964): p-adic analytic function interpolating the classical L(1\u2212n,\u03c7) at negative integers (with an Euler factor at p removed).">\\(p\\)-adic \\(L\\)-function</span></strong> ' +
          '\\(L_p(s, \\chi)\\) is Iwasawa&rsquo;s refinement of the classical Dirichlet \\(L\\)-function: a ' +
          'p-adic continuous function whose values at negative integers agree with those of the complex ' +
          '\\(L\\)-function (after removing the Euler factor at \\(p\\)).</p>' +
          '<p>The <span class="kl-term" title="Iwasawa main conjecture: L_p(s,\u03c7) (a measure on \u0393) equals a generator of the characteristic ideal char\u039b(X_\u221e^\u03c7); proved by Mazur\u2013Wiles (1984) over \u211a and Wiles (1990) over totally real fields.">Iwasawa main conjecture</span> ' +
          '(Mazur&ndash;Wiles 1984) says \\(L_p \\doteq \\mathrm{char}(X_\\infty^\\chi)\\), matching Turaev&rsquo;s theorem ' +
          '\\(\\tau = \\Delta_K \\text{ (up to units)}\\) under the dictionary.</p>'
        ) +
      '</div>';
  }

  function furtherReadingHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Further reading</h3>' +
        twoCol(
          '<p><strong>Knot-theory side.</strong></p>' +
          '<ul>' +
            '<li>D. Rolfsen, <em>Knots and Links</em>, AMS Chelsea 1976. The classical knot-theory reference; ' +
            'Chapters 5&ndash;8 cover the Alexander module and branched covers in a compatible style.</li>' +
            '<li>J. Milnor, <em>Infinite cyclic coverings</em>, in <em>Conference on the Topology of Manifolds</em> ' +
            '(1968). The source for the Alexander-module construction and its basic properties.</li>' +
            '<li>V. Turaev, <em>Introduction to combinatorial torsions</em>, Lectures in Mathematics ETH Z\u00fcrich, ' +
            'Birkh\u00e4user 2001. The canonical reference for Reidemeister torsion.</li>' +
          '</ul>',

          '<p><strong>Arithmetic side.</strong></p>' +
          '<ul>' +
            '<li>M. Morishita, <em>Knots and Primes: An Introduction to Arithmetic Topology</em> ' +
            '(Springer Universitext, 2012). The definitive reference for the entire dictionary.</li>' +
            '<li>B. Mazur, <em>Remarks on the Alexander polynomial</em>, unpublished notes ca. 1963&ndash;64. ' +
            'The origin of the analogy.</li>' +
            '<li>J. Coates and R. Sujatha, <em>Cyclotomic Fields and Zeta Values</em>, Springer 2006. Modern ' +
            'introduction to Iwasawa theory; matches the knot-theory material point by point.</li>' +
            '<li>M. Kapranov, <em>Analogies between the Langlands correspondence and topological quantum ' +
            'field theory</em>, <em>Functional Analysis on the Eve of the 21st Century</em>, Birkh\u00e4user 1995.</li>' +
            '<li>A. Reznikov, <em>Three-manifolds class field theory</em>, Selecta Math. 3 (1997).</li>' +
          '</ul>'
        ) +
      '</div>';
  }

  // ───────────────────────────────────────────────────────────────────
  //  Router
  // ───────────────────────────────────────────────────────────────────

  var RENDERERS = [
    overviewHTML,
    specZHTML,
    complementPi1HTML,
    meridianLongitudeHTML,
    linkingReciprocityHTML,
    alexanderIwasawaHTML,
    branchedCoversHTML,
    torsionLFnHTML,
    furtherReadingHTML
  ];

  window.renderNumberTheory = function (containerEl) {
    var activeTab = 0;
    containerEl.innerHTML = '';

    var controls = document.createElement('div');
    controls.className = 'fk-controls';

    var subtabs = document.createElement('div');
    subtabs.className = 'fk-subtabs';

    var tabBtns = [];
    SUB_TABS.forEach(function (name, i) {
      var btn = document.createElement('button');
      btn.className = 'fk-subtab' + (i === 0 ? ' active' : '');
      btn.innerHTML = name;
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
