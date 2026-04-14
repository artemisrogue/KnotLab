/**
 * homological-invariants.js — Homological Invariants module for KnotLab
 * Exposes window.renderHomologicalInvariants(containerEl)
 */
(function () {
  'use strict';

  var SUB_TABS = [
    { id: 'khovanov',  label: 'Khovanov Homology' },
    { id: 'floer',     label: 'Knot Floer Homology' },
    { id: 'kr',        label: 'Khovanov-Rozansky Homology' },
    { id: 'comments',  label: 'Comments' }
  ];

  window.renderHomologicalInvariants = function (containerEl) {
    var state = { subTab: 'khovanov' };

    function render() {
      var tabHtml = SUB_TABS.map(function (t) {
        return '<button class="fk-subtab ' + (state.subTab === t.id ? 'active' : '') +
               '" data-tab="' + t.id + '">' + t.label + '</button>';
      }).join('');

      containerEl.innerHTML =
        '<div class="fk-controls"><div class="fk-subtabs">' + tabHtml + '</div></div>' +
        '<div id="hi-content" class="fk-content"></div>';

      containerEl.querySelectorAll('.fk-subtab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.subTab = btn.dataset.tab;
          render();
        });
      });

      var content = document.getElementById('hi-content');

      if (state.subTab === 'khovanov')       renderKhovanov(content);
      else if (state.subTab === 'floer')     renderFloer(content);
      else if (state.subTab === 'kr')        renderKR(content);
      else if (state.subTab === 'comments')  renderComments(content);
    }

    function mathRender(el) {
      if (typeof renderMathInElement === 'function') renderMathInElement(el);
    }

    // ── Khovanov Homology ────────────────────────────────────
    function renderKhovanov(el) {
      el.innerHTML = '\
        <div class="expo-panel">\
          <h3>Origins &amp; Definition</h3>\
          <p>Introduced by <strong>Mikhail Khovanov in 2000</strong>, Khovanov homology is a\
          <em>categorification</em> of the Jones polynomial. Rather than assigning a polynomial\
          to a knot, it assigns a bigraded chain complex whose homology groups\
          \\(\\mathrm{Kh}^{i,j}(K)\\) are themselves knot invariants.</p>\
          <p>The construction starts from an oriented knot diagram. At each crossing <code>X[a,b,c,d]</code>\
          (arcs listed counterclockwise from the incoming under-arc: <em>a</em> = incoming under, <em>c</em> = outgoing under,\
          with over-arcs <em>b</em>, <em>d</em> and over-strand oriented <em>b → d</em> iff the crossing is positive)\
          the crossing is replaced either by the\
          <strong>0-smoothing (A)</strong> <em>a↔d, b↔c</em> or the <strong>1-smoothing (B)</strong> <em>a↔b, c↔d</em>,\
          producing \\(2^n\\) resolutions indexed by \\(\\{0,1\\}^n\\). Each vertex of this cube\
          carries a graded vector space built from the Frobenius algebra \\(A = \\mathbb{Z}[X]/(X^2)\\),\
          and the edges give differential maps. Homological degree is shifted by the number of negative\
          crossings: standing on the under-strand facing its direction of travel, the crossing is \\(+1\\) if the\
          over-strand passes right-to-left and \\(-1\\) if left-to-right\
          (equivalently \\(\\varepsilon = \\operatorname{sign}\\,\\det[\\mathbf{u}_{\\text{under}}, \\mathbf{u}_{\\text{over}}]\\)).</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Recovering the Jones Polynomial</h3>\
          <p>The graded Euler characteristic of Khovanov homology recovers the Jones polynomial:</p>\
          <div class="formula-box">\
            $$V_K(q) \\;=\\; \\sum_{i,j} (-1)^{i}\\, q^{\\,j}\\, \\dim\\, \\mathrm{Kh}^{i,j}(K)$$\
          </div>\
          <p>Khovanov homology is <strong>strictly stronger</strong> than the Jones polynomial &mdash;\
          it can distinguish knots that share the same Jones polynomial. For example, it separates\
          certain mutant knot pairs that the Jones polynomial cannot tell apart.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>The Rasmussen \\(s\\)-Invariant</h3>\
          <p>Rasmussen (2004) extracted a concordance invariant \\(s(K)\\) from the Lee spectral\
          sequence on Khovanov homology. This invariant provides a lower bound for the\
          <em>slice genus</em> (smooth 4-ball genus):</p>\
          <div class="formula-box">\
            $$\\frac{|s(K)|}{2} \\;\\leq\\; g_4(K)$$\
          </div>\
          <p>Using \\(s\\), Rasmussen gave a purely combinatorial proof of the <strong>Milnor conjecture</strong>\
          on the slice genus of torus knots, originally proved by Kronheimer&ndash;Mrowka using gauge theory.</p>\
          <p><em>Explore Khovanov homology computations for 500+ knots in the Knot Explorer tab.</em></p>\
        </div>';
      mathRender(el);
    }

    // ── Knot Floer Homology ──────────────────────────────────
    function renderFloer(el) {
      el.innerHTML = '\
        <div class="expo-panel">\
          <h3>Origins &amp; Construction</h3>\
          <p><strong>Knot Floer homology</strong> was independently developed by Ozsv&aacute;th&ndash;Szab&oacute;\
          and Rasmussen in 2003&ndash;2004. It arises from <em>Heegaard Floer homology</em>, a powerful\
          package of invariants for closed 3-manifolds defined via pseudo-holomorphic disks in\
          symmetric products of Heegaard surfaces.</p>\
          <p>To a knot \\(K \\subset S^3\\), the theory associates a bigraded abelian group\
          \\(\\widehat{\\mathrm{HFK}}(K)\\) whose graded Euler characteristic recovers the\
          <strong>Alexander polynomial</strong>:</p>\
          <div class="formula-box">\
            $$\\Delta_K(t) \\;=\\; \\sum_{j} \\chi\\!\\bigl(\\widehat{\\mathrm{HFK}}^{\\,*,j}(K)\\bigr)\\, t^{\\,j}$$\
          </div>\
        </div>\
        <div class="expo-panel">\
          <h3>Genus Detection &amp; Fibered Knots</h3>\
          <p>One of the deepest results about knot Floer homology is that it <strong>detects the\
          Seifert genus</strong> of a knot (Ozsv&aacute;th&ndash;Szab&oacute;):</p>\
          <div class="formula-box">\
            $$g(K) \\;=\\; \\max\\!\\bigl\\{\\, j \\;:\\; \\widehat{\\mathrm{HFK}}^{\\,*,j}(K) \\neq 0 \\,\\bigr\\}$$\
          </div>\
          <p>Furthermore, knot Floer homology <strong>detects fibered knots</strong>: \\(K\\) is fibered if and\
          only if \\(\\widehat{\\mathrm{HFK}}(K, g(K)) \\cong \\mathbb{Z}\\). This is a remarkable structural\
          result with no analogue for classical polynomial invariants.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>The \\(\\tau\\) Invariant</h3>\
          <p>The invariant \\(\\tau(K)\\), extracted from a filtration on \\(\\widehat{\\mathrm{HFK}}\\),\
          defines a <strong>concordance homomorphism</strong>:</p>\
          <div class="formula-box">\
            $$\\tau \\colon \\mathcal{C} \\to \\mathbb{Z}, \\qquad |\\tau(K)| \\leq g_4(K)$$\
          </div>\
          <p>Here \\(\\mathcal{C}\\) is the smooth knot concordance group and \\(g_4(K)\\) is the\
          4-ball genus. Like Rasmussen&rsquo;s \\(s\\)-invariant, \\(\\tau\\) gives a lower bound\
          for the slice genus, though the two invariants can differ.</p>\
        </div>';
      mathRender(el);
    }

    // ── Khovanov-Rozansky Homology ───────────────────────────
    function renderKR(el) {
      el.innerHTML = '\
        <div class="expo-panel">\
          <h3>The \\(\\mathfrak{sl}(N)\\) Generalization</h3>\
          <p>Introduced by Khovanov and Rozansky (2004&ndash;2008), this family of homology theories\
          generalizes Khovanov homology to the \\(\\mathfrak{sl}(N)\\) setting. For each \\(N \\geq 2\\),\
          one obtains a triply-graded homology theory \\(\\mathrm{HKR}_N(K)\\) whose graded Euler\
          characteristic recovers the \\(\\mathfrak{sl}(N)\\) quantum polynomial.</p>\
          <p>The case \\(N = 2\\) recovers ordinary <strong>Khovanov homology</strong>. The stable limit\
          as \\(N \\to \\infty\\) yields the <strong>HOMFLY-PT homology</strong> (also called triply-graded\
          homology), which categorifies the HOMFLY-PT polynomial.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Matrix Factorizations</h3>\
          <p>Unlike Khovanov homology, which uses a direct chain complex from a cube of resolutions,\
          the Khovanov&ndash;Rozansky construction relies on <strong>matrix factorizations</strong> &mdash;\
          pairs of square matrices \\((d_0, d_1)\\) satisfying \\(d_0 d_1 = d_1 d_0 = W \\cdot \\mathrm{Id}\\)\
          for a potential \\(W\\).</p>\
          <p>For the \\(\\mathfrak{sl}(N)\\) theory the potential is \\(W = x^{N+1}\\). Each crossing in the\
          knot diagram contributes a matrix factorization, and these are assembled via tensor products\
          to produce the overall chain complex.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Connections to Algebraic Geometry</h3>\
          <p>Khovanov&ndash;Rozansky homology has deep ties to algebraic geometry. Work of Khovanov,\
          Cautis&ndash;Kamnitzer, and others connects these invariants to:</p>\
          <ul>\
            <li><strong>Hilbert schemes</strong> of points on surfaces</li>\
            <li><strong>Coherent sheaves</strong> and derived categories</li>\
            <li><strong>Soergel bimodules</strong> and categorical representation theory</li>\
          </ul>\
          <p>These geometric perspectives have led to new computational techniques and structural\
          results, including proofs of various conjectures about the homology of torus knots.</p>\
        </div>';
      mathRender(el);
    }

    // ── Comments ─────────────────────────────────────────────
    function renderComments(el) {
      el.innerHTML = '\
        <div class="expo-panel">\
          <h3>The Categorification Program</h3>\
          <p>All the homology theories in this section are instances of a broad <strong>categorification\
          program</strong>: classical polynomial invariants are &ldquo;lifted&rdquo; to richer algebraic\
          structures (chain complexes, derived categories) whose decategorification &mdash; typically via\
          a graded Euler characteristic &mdash; recovers the original polynomial.</p>\
          <p>This pattern is strikingly uniform:</p>\
          <ul>\
            <li>Khovanov homology categorifies the <strong>Jones polynomial</strong></li>\
            <li>Knot Floer homology categorifies the <strong>Alexander polynomial</strong></li>\
            <li>Khovanov&ndash;Rozansky homology categorifies the <strong>HOMFLY-PT polynomial</strong></li>\
          </ul>\
        </div>\
        <div class="expo-panel">\
          <h3>Open Questions &amp; Connections</h3>\
          <p><strong>Unknot detection:</strong> Does Khovanov homology detect the unknot? Kronheimer&ndash;Mrowka\
          (2011) proved that it does, using a spectral sequence from Khovanov homology to the\
          instanton Floer homology of the branched double cover. Whether a purely combinatorial\
          proof exists remains open.</p>\
          <p><strong>Functoriality:</strong> Khovanov homology is expected to define a functor from a cobordism\
          category of knots to graded vector spaces. Significant progress has been made (Jacobsson,\
          Bar-Natan, Clark&ndash;Morrison&ndash;Walker), though subtleties around sign conventions persist.</p>\
          <p><strong>Spectral sequences</strong> provide bridges between different theories &mdash; for instance,\
          from Khovanov homology to knot Floer homology (Ozsv&aacute;th&ndash;Szab&oacute;), and from\
          Khovanov&ndash;Rozansky to Khovanov via specialization.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Future Directions</h3>\
          <p>The interplay between homological knot invariants and physics (topological quantum field\
          theory, BPS states, string theory) continues to generate new conjectures and computational\
          tools. Connections to <em>Fukaya categories</em> and <em>symplectic geometry</em> offer\
          promising avenues for unifying these invariants.</p>\
          <p><em>More content and interactive computations to come.</em></p>\
        </div>';
      mathRender(el);
    }

    render();
  };
})();
