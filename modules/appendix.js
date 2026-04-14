/**
 * appendix.js — Appendix module for KnotLab
 * Exposes window.renderAppendix(containerEl)
 */
(function () {
  'use strict';

  var HISTORY_ENTRIES = [
    {
      era: 'Ancient and Early History',
      text: 'Knots have been used for millennia in Celtic and Chinese decorative arts, as well as in seamanship and practical applications. The scientific study of knots began in earnest when Lord Kelvin proposed his vortex atom theory in 1867, hypothesising that atoms were knotted vortices in the luminiferous ether. Although the physical theory was eventually abandoned, it motivated the first systematic mathematical investigation of knot types.'
    },
    {
      era: 'Tait and Tabulation (1876\u20131900)',
      text: 'Inspired by Kelvin\'s programme, Peter Guthrie Tait began the first systematic tabulation of knots, producing tables of distinct knot types up to 10 crossings. Tait also formulated several conjectures about alternating knots\u2014regarding their crossing number, writhe, and flyping equivalence\u2014that would remain unproven for over a century.'
    },
    {
      era: 'Reidemeister and Combinatorial Topology (1927)',
      text: 'Kurt Reidemeister proved that two knot diagrams represent the same knot if and only if they are related by a finite sequence of three local moves, now called Reidemeister moves. This foundational result placed knot equivalence on a rigorous combinatorial footing and gave mathematicians a concrete framework for proving invariance of knot properties.'
    },
    {
      era: 'Alexander Polynomial (1928)',
      text: 'James Waddell Alexander introduced the first polynomial invariant of knots, computed from the knot group or a Seifert matrix. The Alexander polynomial provided a powerful tool for distinguishing knots, though it could not detect chirality or distinguish all knot types.'
    },
    {
      era: 'Mid-20th Century',
      text: 'Ralph Fox developed Fox calculus and the knot group approach, providing algebraic tools for studying knot complements. John Milnor introduced linking invariants for multi-component links. Seifert surfaces\u2014orientable surfaces bounded by a knot\u2014became a central construction, enabling the definition of the Seifert matrix and related invariants.'
    },
    {
      era: 'Jones Polynomial (1984)',
      text: 'Vaughan Jones discovered a new polynomial invariant via von Neumann algebras and braid group representations. The Jones polynomial was revolutionary: it could distinguish knots that the Alexander polynomial could not, such as the trefoil from its mirror image. This discovery led to the HOMFLY-PT polynomial, a two-variable generalisation encompassing both the Alexander and Jones polynomials.'
    },
    {
      era: 'Tait Conjectures Resolved (1987\u20131993)',
      text: 'Using the Jones polynomial and the Kauffman bracket, Murasugi, Thistlethwaite, and Menasco proved Tait\'s century-old conjectures about alternating knots. These results confirmed that alternating diagrams with minimal crossings are indeed minimal, and that the writhe of a reduced alternating diagram is a knot invariant.'
    },
    {
      era: 'Vassiliev Invariants and Quantum Groups (1990s)',
      text: 'Victor Vassiliev introduced finite-type invariants, providing a unified framework for understanding polynomial knot invariants. Independently, Reshetikhin and Turaev connected knot invariants to quantum groups and topological quantum field theory (TQFT), revealing deep links between low-dimensional topology and mathematical physics.'
    },
    {
      era: 'Khovanov Homology (2000)',
      text: 'Mikhail Khovanov categorified the Jones polynomial, constructing a bigraded homology theory whose graded Euler characteristic recovers the Jones polynomial. Khovanov homology is a strictly stronger invariant than the Jones polynomial and opened the door to "categorification" as a major programme in modern mathematics.'
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
        '<p>In 1989, Edward Witten gave a groundbreaking reinterpretation of the Jones polynomial ' +
        'by showing that it arises naturally as a path integral in Chern-Simons gauge theory. ' +
        'Specifically, the expectation value of a Wilson loop observable in \\(SU(2)\\) Chern-Simons ' +
        'theory at level \\(k\\) reproduces the Jones polynomial evaluated at \\(q = e^{2\\pi i/(k+2)}\\). ' +
        'This insight earned Witten the Fields Medal and opened an entirely new bridge between ' +
        'topology and quantum field theory.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Topological Quantum Field Theory</h4>' +
        '<p>Witten\'s work catalysed the development of topological quantum field theories (TQFTs), ' +
        'axiomatised by Atiyah. A TQFT assigns vector spaces to surfaces and linear maps to cobordisms, ' +
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
        '<p>Three local moves (RI, RII, RIII) on knot diagrams. Two diagrams represent the same knot iff they are related by a finite sequence of these moves (Reidemeister, 1927).</p>' +
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
        '<p>The sum of signed crossings in a knot diagram: \\(w(D) = \\sum_c \\varepsilon(c)\\).</p>' +
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

  function referencesHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>References</h3>' +
        '<p>Key references for the material covered in KnotLab.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Textbooks</h4>' +
        '<ul style="line-height:2;">' +
          '<li>D. Rolfsen, <em>Knots and Links</em>, AMS Chelsea Publishing, 2003.</li>' +
          '<li>W.B.R. Lickorish, <em>An Introduction to Knot Theory</em>, Springer GTM 175, 1997.</li>' +
          '<li>C. Adams, <em>The Knot Book</em>, AMS, 2004. (Introductory.)</li>' +
          '<li>P. Cromwell, <em>Knots and Links</em>, Cambridge University Press, 2004.</li>' +
          '<li>D. Bar-Natan, "On Khovanov\'s categorification of the Jones polynomial," <em>Algebraic & Geometric Topology</em> 2 (2002), 337\u2013370.</li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Original Papers</h4>' +
        '<ul style="line-height:2;">' +
          '<li>J.W. Alexander, "Topological invariants of knots and links," <em>Trans. AMS</em> 30 (1928), 275\u2013306.</li>' +
          '<li>V.F.R. Jones, "A polynomial invariant for knots via von Neumann algebras," <em>Bull. AMS</em> 12 (1985), 103\u2013111.</li>' +
          '<li>M. Khovanov, "A categorification of the Jones polynomial," <em>Duke Math. J.</em> 101 (2000), 359\u2013426.</li>' +
          '<li>P. Ozsv\u00e1th and Z. Szab\u00f3, "Holomorphic disks and knot invariants," <em>Adv. Math.</em> 186 (2004), 58\u2013116.</li>' +
          '<li>E. Witten, "Quantum field theory and the Jones polynomial," <em>Comm. Math. Phys.</em> 121 (1989), 351\u2013399.</li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Online Resources</h4>' +
        '<ul style="line-height:2;">' +
          '<li>KnotInfo: <code>knotinfo.math.indiana.edu</code></li>' +
          '<li>The Knot Atlas: <code>katlas.org</code></li>' +
          '<li>LinkInfo: <code>linkinfo.sitehost.iu.edu</code></li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<p><em>Additional references will be added as new modules are developed.</em></p>' +
      '</div>';
  }

  var TAB_NAMES = ['History', 'Physics', 'Number Theory', 'Definitions', 'References'];
  var TAB_RENDERERS = [historyHTML, physicsHTML, numberTheoryHTML, definitionsHTML, referencesHTML];

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
