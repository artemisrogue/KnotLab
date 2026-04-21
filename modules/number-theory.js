/**
 * number-theory.js — Number Theory (Arithmetic Topology) module for KnotLab
 * Exposes window.renderNumberTheory(containerEl)
 *
 * Sub-tabs follow Morishita's dictionary entries between knot theory and
 * arithmetic. Originally a sub-tab of Miscellaneous; promoted to its own
 * top-level tab.
 */
(function () {
  'use strict';

  var SUB_TABS = [
    'Overview',
    'Dictionary',
    'Spec(Z) & Primes',
    'Complement & \u03c0\u2081',
    'Meridian / Longitude',
    'Linking & Reciprocity',
    'Alexander \u2194 Iwasawa',
    'Branched Covers & Class Groups',
    'Torsion & L-functions',
    'Further Reading'
  ];

  // ───────────────────────────────────────────────────────────────────
  //  Sub-tab panels
  // ───────────────────────────────────────────────────────────────────

  function overviewHTML() {
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
        'between the <span class="kl-term" title="\u00c9tale fundamental group \u03c0\u2081^\u00e9t(X,x\u0304): profinite group classifying finite \u00e9tale covers of X. For Spec(\u2124) it is trivial (Minkowski); for Spec(\u2124[1/p]) it classifies extensions of \u211a unramified outside p.">\u00e9tale fundamental group</span> ' +
        '\\(\\pi_1^{\\mathrm{\u00e9t}}(\\operatorname{Spec}(\\mathbb{Z}))\\) and \\(\\pi_1(S^3)\\), both of which are trivial.</p>' +
        '<p>Navigate the sub-tabs above to work through the dictionary entry by entry.</p>' +
      '</div>';
  }

  function dictionaryHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Morishita&rsquo;s Dictionary</h3>' +
        '<p>The following table summarises the main entries of the dictionary. Each row pairs a knot-theoretic ' +
        'object or invariant with its number-theoretic counterpart; the remaining sub-tabs expand each row.</p>' +
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
      '</div>';
  }

  function specZHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>\\(S^3 \\longleftrightarrow \\operatorname{Spec}(\\mathbb{Z})\\)</h3>' +
        '<p>Both are &ldquo;absolute&rdquo; objects in their categories: \\(S^3\\) is simply-connected and has no ' +
        'non-trivial unramified covers; \\(\\operatorname{Spec}(\\mathbb{Z})\\) has no non-trivial unramified extensions ' +
        '(Minkowski: every number field other than \\(\\mathbb{Q}\\) has ramification). In the Grothendieck view ' +
        '\\(\\operatorname{Spec}(\\mathbb{Z})\\) is a 3-dimensional arithmetic object: \\(\\mathbb{Z}\\) has Krull ' +
        'dimension 1, but \\(\\operatorname{Spec}(\\mathbb{Z})\\) carries \u00e9tale cohomology that is ' +
        '&ldquo;Poincar\u00e9-dual to \\(H^{3-*}\\)&rdquo; in an appropriate sense (Mazur, Artin&ndash;Verdier ' +
        'duality).</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h3>Knot \\(\\longleftrightarrow\\) prime</h3>' +
        '<p>A knot is a codimension-2 submanifold of \\(S^3\\); a prime \\((p)\\) is a codimension-1 closed point ' +
        'of \\(\\operatorname{Spec}(\\mathbb{Z})\\). The dimensional mismatch is resolved by regarding ' +
        '\\(\\operatorname{Spec}(\\mathbb{Z})\\) as a 3-dimensional arithmetic scheme (points of residue field ' +
        '\\(\\mathbb{F}_p\\) behave like 1-cycles). Both \\(K\\) and \\((p)\\) are indecomposable and ' +
        'codimension-2 in the relevant cohomological sense.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h3>Link \\(\\longleftrightarrow\\) finite set of primes</h3>' +
        '<p>Multi-component links parallel finite sets of primes. The &ldquo;linking&rdquo; of different primes ' +
        'shows up in power-residue symbols (quadratic, cubic, ...) just as linking numbers detect how two knots ' +
        'are intertwined.</p>' +
      '</div>';
  }

  function complementPi1HTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Complement \\(\\longleftrightarrow \\operatorname{Spec}(\\mathbb{Z}[1/p])\\)</h3>' +
        '<p>Removing \\(K\\) from \\(S^3\\) gives a non-compact 3-manifold whose fundamental group is the knot ' +
        'group. Inverting \\(p\\) in \\(\\mathbb{Z}\\) gives the localisation \\(\\mathbb{Z}[1/p]\\), whose ' +
        '\u00e9tale fundamental group classifies extensions of \\(\\mathbb{Q}\\) unramified outside \\(p\\). ' +
        'Both are &ldquo;one prime removed&rdquo; objects whose \\(\\pi_1\\) encodes how complicated the removed ' +
        'thing is.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h3>Knot group \\(\\longleftrightarrow\\) \u00e9tale fundamental group</h3>' +
        '<p>The analogy is very tight here. Both groups are finitely generated, have abelianisation ' +
        '\\(\\mathbb{Z}\\) (or \\(\\hat{\\mathbb{Z}}\\) profinitely) and a meaningful notion of meridian. The ' +
        '\u00e9tale \\(\\pi_1\\) governs Galois extensions of \\(\\mathbb{Q}\\) ramified only at \\(p\\); the ' +
        'knot group governs covering spaces of \\(S^3 \\setminus K\\). Many classical number-theoretic theorems ' +
        '(\u010Cebotarev, Minkowski, class field theory) have knot-theoretic shadows via this analogy.</p>' +
      '</div>';
  }

  function meridianLongitudeHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Meridian \\(\\longleftrightarrow\\) inertia, Longitude \\(\\longleftrightarrow\\) Frobenius</h3>' +
        '<p>The meridian \\(\\mu\\) lives in the peripheral subgroup and maps to a generator of the local ' +
        'fundamental group at \\(K\\); the longitude \\(\\lambda\\) is a canonical non-meridional curve. The ' +
        'arithmetic decomposition group \\(D_p \\subset \\pi_1^{\\mathrm{\u00e9t}}\\) at a prime \\(p\\) has an ' +
        '<span class="kl-term" title="Inertia subgroup I_p \u2282 D_p: the kernel of the map D_p \u2192 Gal(k\u0304/k) to the residue-field Galois group; measures ramification at p. Trivial iff p is unramified.">inertia subgroup</span> \\(I_p\\) (generating the ramification) and a ' +
        '<span class="kl-term" title="Frobenius element Frob_p: for an unramified prime p in a Galois extension, the canonical generator of D_p/I_p acting as x \u21a6 x^p on the residue field. Well-defined up to conjugacy.">Frobenius</span> element \\(\\mathrm{Frob}_p \\in D_p/I_p\\) ' +
        '(the action on residue fields, where Frobenius is the canonical automorphism \\(x \\mapsto x^{p}\\)). ' +
        'Under the dictionary meridian \\(\\leftrightarrow\\) inertia and ' +
        'longitude \\(\\leftrightarrow\\) Frobenius &mdash; both pairs are the &ldquo;local&rdquo; generators of ' +
        'their boundary tori.</p>' +
      '</div>';
  }

  function linkingReciprocityHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Linking number \\(\\longleftrightarrow\\) Legendre symbol</h3>' +
        '<p>For knots \\(K, L\\) in \\(S^3\\) the mod-2 linking number \\(\\operatorname{lk}(K,L) \\bmod 2\\) tells ' +
        'whether they are &ldquo;\\(\\mathbb{Z}/2\\)-linked.&rdquo; For primes \\(p, q\\) the ' +
        '<span class="kl-term" title="Legendre symbol (a/p): equals +1 if a is a non-zero quadratic residue mod p, \u22121 if a non-residue, 0 if p|a. Completely multiplicative in a.">Legendre symbol</span> \\(\\left(\\frac{p}{q}\\right)\\) tells whether \\(p\\) is a quadratic residue mod \\(q\\). ' +
        '<strong><span class="kl-term" title="Quadratic reciprocity (Gauss): for distinct odd primes p,q, (p/q)(q/p) = (\u22121)^{(p\u22121)(q\u22121)/4}. The prototype of all reciprocity laws; analogous to symmetry of linking numbers.">Quadratic reciprocity</span></strong></p>' +
        '<div class="formula-box">$$\\left(\\tfrac{p}{q}\\right)\\left(\\tfrac{q}{p}\\right) = (-1)^{\\frac{p-1}{2}\\cdot\\frac{q-1}{2}}$$</div>' +
        '<p>corresponds to the symmetry \\(\\operatorname{lk}(K,L) = \\operatorname{lk}(L,K)\\) &mdash; but with a sign ' +
        'twist when both primes are \\(\\equiv 3 \\pmod 4\\), reflecting a subtle orientation correction.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h3>Triple linking \\(\\longleftrightarrow\\) R\u00e9dei symbol</h3>' +
        '<p>Milnor&rsquo;s triple \\(\\bar\\mu\\)-invariant \\(\\mu_{123}(L)\\) detects Borromean rings &mdash; a ' +
        'three-component link that is non-trivial even though every pair of components is a split link. The ' +
        '<strong><span class="kl-term" title="R\u00e9dei symbol [p\u2081,p\u2082,p\u2083] \u2208 \u2124/2: a ternary mod-2 reciprocity invariant, non-zero iff the three primes are arithmetically \u2018Borromean\u2019.">R\u00e9dei symbol</span></strong> \\([p_1, p_2, p_3] \\in \\mathbb{Z}/2\\) is the arithmetic analogue: a ' +
        'mod-2 ternary reciprocity refinement of Legendre, non-zero iff the three primes are &ldquo;Borromean&rdquo; ' +
        'in an arithmetic sense. Morishita uses this to give a number-theoretic definition of Borromean triples ' +
        'of primes.</p>' +
      '</div>';
  }

  function alexanderIwasawaHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Infinite cyclic cover \\(\\longleftrightarrow\\) \\(\\mathbb{Z}_p\\)-extension</h3>' +
        '<p>The maximal abelian cover of \\(S^3 \\setminus K\\) has deck group \\(\\mathbb{Z}\\), and its ' +
        'first homology is the <span class="kl-term" title="Alexander module: H\u2081 of the infinite cyclic cover X\u0303 of S\u00b3\u2216K, regarded as a \u2124[t,t\u207b\u00b9]-module via the deck transformation. Finitely presented; torsion for knots.">Alexander module</span> \\(H_1(\\widetilde{X}; \\mathbb{Z})\\), a module over ' +
        '\\(\\mathbb{Z}[t, t^{-1}]\\). The arithmetic analogue is the cyclotomic \\(\\mathbb{Z}_p\\)-extension ' +
        '\\(\\mathbb{Q}_\\infty / \\mathbb{Q}\\) (obtained by adjoining all \\(p^n\\)-th roots of unity and ' +
        'restricting to the \\(p\\)-part); its <span class="kl-term" title="Iwasawa module: the inverse limit X_\u221e = lim A_n of p-parts of ideal class groups along the \u2124_p-extension, a compact finitely generated \u039b = \u2124_p[[T]]-module.">Iwasawa module</span> is a module over \\(\\mathbb{Z}_p[\\![T]\\!]\\). ' +
        'Both are modules over a one-variable (completed) group ring with deck action \\(t\\) or \\(\\gamma\\).</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h3>Alexander polynomial \\(\\longleftrightarrow\\) Iwasawa polynomial</h3>' +
        '<p>The Alexander polynomial \\(\\Delta_K(t)\\) is the generator of the first elementary ideal of the ' +
        'Alexander module. The <span class="kl-term" title="Iwasawa polynomial: a distinguished (Weierstrass) generator of the characteristic ideal of a finitely generated torsion \u039b-module; its \u03bb, \u03bc invariants govern the growth |A_n| ~ p^{\u03bbn + \u03bcp^n + \u03bd}.">Iwasawa polynomial</span> is the generator of the characteristic ideal of the Iwasawa ' +
        'module. Both measure the &ldquo;size&rdquo; and torsion of the relevant module over a one-variable ring. ' +
        'Mazur&rsquo;s 1964 observation that these should be analogous was the seed of the entire Morishita ' +
        'programme.</p>' +
      '</div>';
  }

  function branchedCoversHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Branched cover \\(\\longleftrightarrow\\) cyclotomic field</h3>' +
        '<p>The \\(n\\)-fold branched cover \\(\\Sigma_n(K) \\to S^3\\) is obtained by taking the \\(n\\)-fold ' +
        'cyclic cover of the complement and gluing back along the branch locus. Its arithmetic analogue is the ' +
        '\\(n\\)-th cyclotomic field \\(\\mathbb{Q}(\\zeta_n)\\), obtained by extracting an \\(n\\)-th root of ' +
        'unity &mdash; a degree-\\(\\varphi(n)\\) extension of \\(\\mathbb{Q}\\) ramified at primes dividing \\(n\\).</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h3>\\(H_1(\\Sigma_n) \\longleftrightarrow\\) ideal class group</h3>' +
        '<p>\\(H_1(\\Sigma_n(K); \\mathbb{Z})\\) measures how far \\(\\Sigma_n\\) is from being a homology sphere &mdash; ' +
        'it encodes the non-trivial linking inside the branched cover. The ideal class group ' +
        '\\(\\operatorname{Cl}(\\mathbb{Q}(\\zeta_n))\\) measures how far the ring of cyclotomic integers is from ' +
        'being a PID. Both are finite abelian groups of surprising arithmetic depth: the orders of ' +
        'class groups of cyclotomic fields drive Iwasawa theory, just as the orders ' +
        '\\(|H_1(\\Sigma_n)|\\) drive the covering-space invariants of knots.</p>' +
      '</div>';
  }

  function torsionLFnHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Seifert surface \\(\\longleftrightarrow\\) arithmetic bounding chain</h3>' +
        '<p>A Seifert surface \\(\\Sigma\\) is a 2-chain in \\(S^3\\) with \\(\\partial\\Sigma = K\\). Under the ' +
        'dictionary (a prime is codim-1 in a 3-scheme), the arithmetic analogue is a divisor on an arithmetic ' +
        'surface / ideal class bounding \\((p)\\) up to principal ideals. In Arakelov theory these become ' +
        'literal 2-chains on arithmetic surfaces.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h3>Reidemeister torsion \\(\\longleftrightarrow\\) \\(p\\)-adic \\(L\\)-function</h3>' +
        '<p><span class="kl-term" title="Reidemeister torsion \u03c4(X,\u03c1): an element of K\u2081(\u2102)/\u00b1(det of a basis change) associated to an acyclic chain complex, refining the Euler characteristic. Invariant under simple-homotopy; distinguishes lens spaces.">Reidemeister torsion</span> is a refinement of the Alexander polynomial that tracks sign and base-point ' +
        'information &mdash; a multiplicative analogue of the Euler characteristic. The \\(p\\)-adic ' +
        '<span class="kl-term" title="p-adic L-function L_p(s,\u03c7) (Kubota\u2013Leopoldt): p-adic analytic function interpolating classical L(1\u2212n,\u03c7) at negative integers; characteristic ideal of the Iwasawa module by the main conjecture.">\\(L\\)-function</span> \\(L_p(s, \\chi)\\) is Iwasawa&rsquo;s refinement of the classical \\(L\\)-function; its ' +
        'zeros control the Iwasawa module. Main conjectures of Iwasawa theory assert an identity between ' +
        '\\(p\\)-adic \\(L\\)-functions and characteristic ideals &mdash; exactly paralleling the knot-theoretic ' +
        'Turaev theorem identifying Reidemeister torsion with the Alexander polynomial up to units.</p>' +
      '</div>';
  }

  function furtherReadingHTML() {
    return '' +
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
  //  Router
  // ───────────────────────────────────────────────────────────────────

  var RENDERERS = [
    overviewHTML,
    dictionaryHTML,
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
