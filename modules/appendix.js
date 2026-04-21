/**
 * appendix.js — Appendix module for KnotLab
 * Exposes window.renderAppendix(containerEl)
 */
(function () {
  'use strict';

  var HISTORY_ENTRIES = [
    {
      era: 'Ancient and Early History',
      text: 'Knots have been used for millennia in Celtic and Chinese decorative arts, as well as in seamanship and practical applications. Johann Benedict <span class="kl-term" title="Listing (1847) coined the word \'topology\' and wrote the first treatise on knots, Vorstudien zur Topologie.">Listing</span>&rsquo;s 1847 <em>Vorstudien zur Topologie</em> gave the first mathematical treatment, but the subject gained momentum in the 1860s when Lord <span class="kl-term" title="William Thomson (Lord Kelvin), 1867: atoms are knotted vortex tubes in the luminiferous ether. Abandoned as physics but launched the mathematical classification of knots.">Kelvin&rsquo;s vortex-atom theory</span> hypothesised that atoms were knotted vortices in the luminiferous ether. Although the physical theory was eventually abandoned, it motivated the first systematic mathematical investigation of knot types.'
    },
    {
      era: 'Tait and Tabulation',
      text: 'Inspired by Kelvin\'s programme, Peter Guthrie Tait (with contributions from Thomas Kirkman and Charles Little) produced the first systematic <span class="kl-term" title="Tait\'s tables (1876\u20131885): the first systematic enumeration of prime knots up to 10 crossings, later extended by Little.">tabulation of knots</span> through 10 crossings between 1876 and 1885. Tait also formulated three conjectures about reduced alternating diagrams\u2014minimal crossing number, invariance of the writhe, and flyping equivalence\u2014which remained open until the 1987\u20131993 proofs by Kauffman, Murasugi, Thistlethwaite (crossing number and writhe, 1987) and Menasco\u2013Thistlethwaite (the flyping conjecture, 1993) using the Jones polynomial.'
    },
    {
      era: 'Reidemeister and Combinatorial Topology',
      text: 'In 1927, Kurt Reidemeister proved that two knot diagrams represent the same knot if and only if they are related by planar isotopy and a finite sequence of three local moves, now called <span class="kl-term" title="Reidemeister (1927): two diagrams represent the same knot iff related by planar isotopy and three local moves R1, R2, R3. Proved independently by Alexander\u2013Briggs in 1926.">Reidemeister moves</span> (independently obtained by Alexander and Briggs in 1926). This foundational result placed knot equivalence on a rigorous combinatorial footing and gave mathematicians a concrete framework for proving invariance of knot properties.'
    },
    {
      era: 'Alexander Polynomial',
      text: 'James Waddell Alexander introduced the first polynomial invariant of knots in 1928, computed from the knot group or a Seifert matrix. Five years earlier, in his 1923 paper, Alexander had proved that <span class="kl-term" title="Alexander (1923): every tame link in S\u00b3 is ambient isotopic to the closure of a braid on some finite number of strands.">every link is the closure of a braid</span>. The Alexander polynomial provided a powerful tool for distinguishing knots, though it cannot detect chirality or distinguish all knot types (e.g. it fails to separate the trefoil from its mirror).'
    },
    {
      era: 'Mid-20th Century',
      text: 'A. A. Markov&rsquo;s 1936 theorem complemented Alexander&rsquo;s: two braids have isotopic closures if and only if they are related by conjugation and stabilisation (<span class="kl-term" title="Markov (1936): two braids have ambient-isotopic closures iff related by a finite sequence of Markov moves\u2014conjugation within B_n and stabilisation B_n \u2194 B_{n+1}.">Markov moves</span>), reducing knot equivalence to an algebraic problem on the braid groups. Later, Ralph Fox developed Fox calculus and the knot group approach, providing algebraic tools for studying knot complements. John Milnor introduced higher linking invariants for multi-component links. Seifert surfaces\u2014orientable surfaces bounded by a knot\u2014became a central construction, enabling the definition of the Seifert matrix and related invariants.'
    },
    {
      era: 'Jones Polynomial',
      text: 'In 1984 Vaughan Jones discovered a new polynomial invariant via von Neumann algebras and braid group representations. The Jones polynomial was revolutionary: it could distinguish knots that the Alexander polynomial could not, such as the trefoil from its mirror image. Within two years a two-variable generalisation, the HOMFLY-PT polynomial (1985\u20131987), was found independently by six groups and encompasses both the Alexander and Jones polynomials.'
    },
    {
      era: 'Tait Conjectures Resolved',
      text: 'In 1987, Kauffman, Murasugi and Thistlethwaite independently used the Jones polynomial (via the Kauffman bracket) to prove Tait&rsquo;s first two conjectures: a reduced alternating diagram has the minimal crossing number, and two reduced alternating diagrams of the same knot have the same writhe. The third (flyping) conjecture was settled by Menasco and Thistlethwaite in 1993.'
    },
    {
      era: 'Vassiliev Invariants and Quantum Groups',
      text: 'Around 1990, Victor Vassiliev introduced finite-type invariants, providing a unified framework for understanding polynomial knot invariants; Kontsevich&rsquo;s 1993 integral realised the universal such invariant. Independently, Reshetikhin and Turaev (1990\u20131991) connected knot invariants to quantum groups and <span class="kl-term" title="Topological Quantum Field Theory: Atiyah\u2013Segal axiomatised functor from the cobordism category to Vect_k; for 3d Chern\u2013Simons it produces the Jones polynomial and its colored variants.">topological quantum field theory (TQFT)</span>, revealing deep links between low-dimensional topology and mathematical physics.'
    },
    {
      era: 'Khovanov Homology',
      text: 'In 1999\u20132000, Mikhail Khovanov categorified the Jones polynomial, constructing a bigraded homology theory whose graded Euler characteristic recovers the Jones polynomial. Khovanov homology is a strictly stronger invariant than the Jones polynomial and opened the door to "categorification" as a major programme in modern mathematics.'
    },
    {
      era: 'Modern Developments',
      text: 'Knot Floer homology, introduced by Ozsv\u00e1th\u2013Szab\u00f3 and independently by Rasmussen, provides another powerful categorified invariant with deep connections to gauge theory and symplectic geometry. Knot theory now finds applications far beyond pure mathematics, including DNA topology, molecular chemistry, and connections to string theory and quantum computing.'
    }
  ];

  function historyHTML() {
    var html = '<div class="expo-panel"><h3>A Brief History of Knot Theory</h3>';
    HISTORY_ENTRIES.forEach(function (entry) {
      html += '<p><strong>' + entry.era + '</strong></p>';
      html += '<p>' + entry.text + '</p>';
    });
    html += '</div>';
    return html;
  }

  function physicsHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Knot Theory and Physics</h3>' +
        '<p>Knot theory has deep and surprising connections to theoretical physics, ' +
        'many of which emerged in the late 20th century and continue to drive research today.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Chern-Simons Theory and the Jones Polynomial</h4>' +
        '<p>In his 1989 paper <em>Quantum field theory and the Jones polynomial</em>, ' +
        '<span class="kl-term" title="Edward Witten (1989) gave a 3d quantum-field-theoretic interpretation of the Jones polynomial via SU(2) Chern\u2013Simons theory; awarded the Fields Medal in 1990.">Edward Witten</span> gave a groundbreaking reinterpretation of the Jones polynomial ' +
        'by showing that it arises naturally as the <span class="kl-term" title="Functional integral \u222B D\u2061A exp(iS[A]) weighted by the Chern\u2013Simons action; for closed 3-manifolds it defines the Reshetikhin\u2013Turaev 3-manifold invariant.">partition function</span> ' +
        'of <span class="kl-term" title="Chern\u2013Simons theory: a 3d topological gauge theory with action S = (k/4\u03c0)\u222B tr(A\u2227dA + (2/3)A\u2227A\u2227A); the level k \u2208 \u2124 quantises the coupling.">Chern-Simons gauge theory</span>. ' +
        'Specifically, the expectation value of a <span class="kl-term" title="Wilson loop W_R(K) = tr_R P exp\u222E_K A: the trace of the holonomy of a connection A along a loop K in representation R. Its Chern\u2013Simons expectation value is the colored Jones polynomial.">Wilson loop</span> observable in \\(SU(2)\\) Chern-Simons ' +
        'theory at level \\(k\\) reproduces the Jones polynomial evaluated at \\(q = e^{2\\pi i/(k+2)}\\). ' +
        'This insight earned Witten the Fields Medal in 1990 and opened an entirely new bridge between ' +
        'topology and quantum field theory.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Topological Quantum Field Theory</h4>' +
        '<p>Witten\'s work catalysed the development of topological quantum field theories (TQFTs), ' +
        'axiomatised by Atiyah (1988) building on Segal\'s conformal-field-theory axioms. A TQFT assigns vector spaces to surfaces and linear maps to cobordisms, ' +
        'providing a functorial framework in which knot and 3-manifold invariants emerge from the ' +
        'algebraic structure of quantum groups and modular tensor categories.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Statistical Mechanics and the Yang-Baxter Equation</h4>' +
        '<p>The Yang-Baxter equation, central to exactly solvable models in statistical mechanics, ' +
        'is intimately related to braid group representations. Solutions of the Yang-Baxter equation ' +
        '(called \\(R\\)-matrices) yield knot invariants via the theory of quantum groups, unifying ' +
        'concepts from lattice models, spin chains, and knot polynomials.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Anyons and Topological Quantum Computation</h4>' +
        '<p>In two-dimensional systems, quasi-particle excitations called anyons obey braid statistics ' +
        'rather than the usual bosonic or fermionic exchange statistics. The braiding of non-abelian ' +
        'anyons can encode quantum gates, forming the basis of topological quantum computation\u2014a ' +
        'paradigm in which information is protected from local errors by the topological nature of ' +
        'the braid group.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>DNA Topology and Polymer Physics</h4>' +
        '<p>Closed circular DNA is a double helix whose two strands are linked; the integer <span class="kl-term" title="For closed circular DNA, Lk is the integer linking number of the two sugar\u2013phosphate strands; it splits as Lk = Tw + Wr by the C\u0103lug\u0103reanu\u2013White\u2013Fuller theorem.">linking number in DNA</span> decomposes by the C&#259;lug&#259;reanu&ndash;White&ndash;Fuller theorem as \\(\\mathrm{Lk} = \\mathrm{Tw} + \\mathrm{Wr}\\), separating helical twist from superhelical writhe. Cells regulate this linking deficit using <span class="kl-term" title="DNA topoisomerases: type I enzymes pass one strand through a transient single-strand break (\u0394Lk = \u00b11); type II enzymes pass an entire duplex through a double-strand break (\u0394Lk = \u00b12), unknotting and decatenating DNA.">topoisomerases</span>, enzymes that change \\(\\mathrm{Lk}\\) in controlled integer steps. Type II topoisomerases are also responsible for unlinking <span class="kl-term" title="Catenane: a link of two or more closed rings (from Latin catena, \'chain\'). In biology, the Hopf-linked daughter chromosomes produced after replication must be decatenated by topoisomerase IV before cell division.">catenanes</span> of daughter DNA molecules after replication.</p>' +
        '<p>At a different scale, <span class="kl-term" title="Polymer physics treats long flexible chains statistically; a random ring polymer is almost surely knotted (Delbr\u00fcck\u2013Frisch\u2013Wasserman conjecture, proved by Sumners\u2013Whittington 1988) and knot type influences its radius of gyration and dynamics.">polymer physics</span> studies long flexible molecules (DNA plasmids, synthetic ring polymers, proteins) whose statistical properties depend on topology: knotted chains are more compact than unknotted ones at equal contour length, and knot spectra in long random walks obey universal asymptotics.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<p><em>More content to come.</em></p>' +
      '</div>';
  }

  function numberTheoryHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Knot Theory and Number Theory</h3>' +
        '<p>A striking and somewhat mysterious analogy exists between knot theory and number theory, ' +
        'often gathered under the banner of <strong>arithmetic topology</strong>.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Knots and Primes</h4>' +
        '<p>The central analogy identifies knots in \\(S^3\\) with prime numbers in \\(\\operatorname{Spec}(\\mathbb{Z})\\). ' +
        'Under this dictionary, the 3-sphere plays the role of \\(\\operatorname{Spec}(\\mathbb{Z})\\), ' +
        'linking numbers of two knots correspond to Legendre symbols \\(\\left(\\frac{p}{q}\\right)\\), ' +
        'and the knot group \\(\\pi_1(S^3 \\setminus K)\\) mirrors the \u00e9tale fundamental group of ' +
        '\\(\\operatorname{Spec}(\\mathbb{Z}) \\setminus \\{p\\}\\).</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Morishita\'s Dictionary</h4>' +
        '<p>The correspondence can be made remarkably explicit. The following dictionary, ' +
        'assembled by Mazur, Kapranov, Reznikov, Morishita and others, lists the standard ' +
        'translations between objects in 3-dimensional topology and in arithmetic.</p>' +
        '<table class="dict-table">' +
          '<thead><tr><th>Knot theory / 3-manifolds</th><th>Number theory / arithmetic</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>\\(S^3\\)</td><td>\\(\\operatorname{Spec}(\\mathbb{Z})\\)</td></tr>' +
            '<tr><td>Knot \\(K \\subset S^3\\)</td><td>Prime ideal \\((p) \\subset \\operatorname{Spec}(\\mathbb{Z})\\)</td></tr>' +
            '<tr><td>Link \\(L = K_1 \\cup \\cdots \\cup K_n\\)</td><td>Finite set of primes \\(\\{p_1,\\ldots,p_n\\}\\)</td></tr>' +
            '<tr><td>Knot complement \\(S^3 \\setminus K\\)</td><td>\\(\\operatorname{Spec}(\\mathbb{Z}) \\setminus \\{p\\} = \\operatorname{Spec}(\\mathbb{Z}[1/p])\\)</td></tr>' +
            '<tr><td>Knot group \\(\\pi_1(S^3 \\setminus K)\\)</td><td>\u00c9tale fundamental group \\(\\pi_1^{\\mathrm{et}}(\\operatorname{Spec}(\\mathbb{Z}[1/p]))\\)</td></tr>' +
            '<tr><td>Meridian of \\(K\\)</td><td>Inertia element at \\(p\\)</td></tr>' +
            '<tr><td>Longitude of \\(K\\)</td><td>Frobenius element at \\(p\\)</td></tr>' +
            '<tr><td>Linking number \\(\\operatorname{lk}(K,L) \\bmod 2\\)</td><td>Legendre symbol \\(\\left(\\frac{p}{q}\\right)\\)</td></tr>' +
            '<tr><td>Triple linking (Milnor) \\(\\mu(K_1,K_2,K_3)\\)</td><td>R\u00e9dei symbol \\([p_1,p_2,p_3]\\)</td></tr>' +
            '<tr><td>Infinite cyclic cover of \\(S^3 \\setminus K\\)</td><td>Maximal unramified \\(\\mathbb{Z}_p\\)-extension of \\(\\mathbb{Q}\\) outside \\(p\\)</td></tr>' +
            '<tr><td>Alexander polynomial \\(\\Delta_K(t)\\)</td><td>Iwasawa polynomial of the \\(\\mathbb{Z}_p\\)-extension</td></tr>' +
            '<tr><td>Branched cyclic cover \\(\\Sigma_n(K)\\)</td><td>Cyclotomic field \\(\\mathbb{Q}(\\zeta_n)\\) (ramified at \\(p\\))</td></tr>' +
            '<tr><td>\\(H_1(\\Sigma_n(K);\\mathbb{Z})\\)</td><td>Ideal class group of the extension</td></tr>' +
            '<tr><td>Seifert surface for \\(K\\)</td><td>Arithmetic surface / chain bounding \\((p)\\)</td></tr>' +
            '<tr><td>Reidemeister torsion</td><td>\\(p\\)-adic \\(L\\)-function</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>\u00c9tale Fundamental Groups and Knot Groups</h4>' +
        '<p>Just as the fundamental group of a knot complement governs the topology of the knot, ' +
        'the \u00e9tale fundamental group of the spectrum of a number ring (with a prime removed) ' +
        'governs its arithmetic. Both groups share structural features: they are finitely generated, ' +
        'have natural abelianisations related to homology or class groups, and admit parallel ' +
        'constructions of covering spaces and extensions.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Iwasawa Theory Parallels</h4>' +
        '<p>Iwasawa theory studies the behaviour of arithmetic objects in towers of number field ' +
        'extensions, producing module-theoretic invariants that are strikingly analogous to the ' +
        'Alexander polynomial of a knot. In particular, the Iwasawa polynomial of a ' +
        '\\(\\mathbb{Z}_p\\)-extension parallels the Alexander polynomial arising from the infinite ' +
        'cyclic cover of a knot complement, a connection made precise by Mazur and further ' +
        'developed by Morishita and others.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<p><em>More content to come.</em></p>' +
      '</div>';
  }

  function definitionsHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Glossary of Definitions</h3>' +
        '<p>A collection of key definitions used throughout KnotLab.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Knot</h4>' +
        '<p>A smooth (or PL) embedding \\(K : S^1 \\hookrightarrow S^3\\) (or \\(\\mathbb{R}^3\\)).</p>' +
        '<h4>Link</h4>' +
        '<p>A smooth embedding \\(L : S^1 \\sqcup \\cdots \\sqcup S^1 \\hookrightarrow S^3\\), i.e. a disjoint union of knots.</p>' +
        '<h4>Ambient Isotopy</h4>' +
        '<p>A continuous family of homeomorphisms \\(h_t : S^3 \\to S^3\\), \\(t \\in [0,1]\\), with \\(h_0 = \\mathrm{id}\\).</p>' +
        '<h4>Knot Diagram</h4>' +
        '<p>A regular projection of a knot to \\(\\mathbb{R}^2\\) with transverse double points, equipped with over/under crossing information.</p>' +
        '<h4>Reidemeister Moves</h4>' +
        '<p>Three local moves (RI, RII, RIII) on knot diagrams. Two diagrams represent the same knot iff they are related by a finite sequence of these moves.</p>' +
        '<h4>Knot Invariant</h4>' +
        '<p>A function from the set of knots to some algebraic object that assigns equal values to ambient isotopic knots.</p>' +
        '<h4>Crossing Number</h4>' +
        '<p>\\(c(K)\\): the minimum number of crossings over all diagrams of \\(K\\).</p>' +
        '<h4>Seifert Surface</h4>' +
        '<p>A compact orientable surface \\(\\Sigma \\subset S^3\\) with \\(\\partial \\Sigma = K\\).</p>' +
        '<h4>Seifert Matrix</h4>' +
        '<p>A matrix \\(V\\) recording the linking numbers of a basis of \\(H_1(\\Sigma)\\) with their push-offs.</p>' +
        '<h4>Knot Group</h4>' +
        '<p>\\(\\pi_1(S^3 \\setminus K)\\): the fundamental group of the knot complement.</p>' +
        '<h4>Linking Number</h4>' +
        '<p>An integer \\(\\mathrm{Lk}(K, L)\\) measuring how many times two curves \\(K\\) and \\(L\\) wind around each other.</p>' +
        '<h4>Writhe</h4>' +
        '<p>For a diagram \\(D\\), \\(w(D) = \\sum_c \\varepsilon(c)\\), the sum of crossing signs. The writhe depends on the diagram (it changes by \\(\\pm 1\\) under R1) and is therefore <em>not</em> an invariant of the knot itself. For a smooth embedded curve \\(K \\subset \\mathbb{R}^3\\), the writhe \\(\\mathrm{Wr}(K)\\) is the average of \\(w(D_{\\mathbf{v}})\\) over all projection directions; the self-linking of a framed knot with blackboard framing of diagram \\(D\\) equals \\(w(D)\\).</p>' +
        '<h4>Framing</h4>' +
        '<p>A choice of non-vanishing normal vector field along a knot, equivalently a choice of longitude on the boundary torus.</p>' +
        '<h4>Concordance</h4>' +
        '<p>Two knots \\(K_0, K_1\\) are concordant if there exists a smooth annulus \\(S^1 \\times [0,1] \\hookrightarrow S^3 \\times [0,1]\\) connecting them.</p>' +
        '<h4>Slice Knot</h4>' +
        '<p>A knot that bounds a smooth disk in \\(B^4\\). Equivalently, concordant to the unknot.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<p><em>This glossary will be expanded as new modules are added.</em></p>' +
      '</div>';
  }

  // Number Theory was moved to the Miscellaneous tab (Morishita's dictionary
  // sub-tab) where it sits alongside the other algebraic / group-theoretic
  // invariants. The numberTheoryHTML function is intentionally left in this
  // file (unreferenced) as historical reference; TAB_NAMES no longer lists it.
  var TAB_NAMES = ['History', 'Physics', 'Definitions'];
  var TAB_RENDERERS = [historyHTML, physicsHTML, definitionsHTML];

  window.renderAppendix = function (containerEl) {
    containerEl.innerHTML = '';

    var controls = document.createElement('div');
    controls.className = 'fk-controls';

    var subtabs = document.createElement('div');
    subtabs.className = 'fk-subtabs';

    var tabBtns = [];
    TAB_NAMES.forEach(function (name, i) {
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

    var activeTab = 0;

    function switchTab(idx) {
      activeTab = idx;
      tabBtns.forEach(function (b, i) {
        b.classList.toggle('active', i === idx);
      });
      renderTab(idx);
    }

    function renderTab(idx) {
      content.innerHTML = TAB_RENDERERS[idx]();
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

    renderTab(0);
  };
})();
