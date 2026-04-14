/**
 * polynomial-invariants.js — Polynomial Invariants module for KnotLab
 * Exposes window.renderPolynomialInvariants(containerEl)
 */
(function () {
  'use strict';

  const SUB_TABS = [
    { id: 'alexander', label: 'Alexander Polynomial' },
    { id: 'jones',     label: 'Jones Polynomial' },
    { id: 'homflypt',  label: 'HOMFLY-PT Polynomial' },
    { id: 'quantum',   label: 'Quantum Link Invariants' },
    { id: 'others',    label: 'Other Polynomial Invariants' }
  ];

  window.renderPolynomialInvariants = function (containerEl) {
    var state = { subTab: 'alexander' };

    function render() {
      var tabHtml = SUB_TABS.map(function (t) {
        return '<button class="fk-subtab ' + (state.subTab === t.id ? 'active' : '') +
               '" data-tab="' + t.id + '">' + t.label + '</button>';
      }).join('');

      containerEl.innerHTML =
        '<div class="fk-controls"><div class="fk-subtabs">' + tabHtml + '</div></div>' +
        '<div id="pi-content" class="fk-content"></div>';

      containerEl.querySelectorAll('.fk-subtab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.subTab = btn.dataset.tab;
          render();
        });
      });

      var content = document.getElementById('pi-content');

      if (state.subTab === 'alexander')  renderAlexander(content);
      else if (state.subTab === 'jones') renderJones(content);
      else if (state.subTab === 'homflypt') renderHomflypt(content);
      else if (state.subTab === 'quantum') renderQuantum(content);
      else if (state.subTab === 'others') renderOthers(content);
    }

    function mathRender(el) {
      if (typeof renderMathInElement === 'function') renderMathInElement(el);
    }

    // ── Alexander Polynomial ──────────────────────────────────
    function renderAlexander(el) {
      el.innerHTML = '\
        <div class="expo-panel">\
          <h3>History &amp; Definition</h3>\
          <p>The <strong>Alexander polynomial</strong> was introduced by J.W. Alexander in 1928 and was the\
          first polynomial invariant of knots. It can be defined via the <em>Seifert matrix</em> or\
          through Fox&rsquo;s free differential calculus.</p>\
          <p>Given a Seifert matrix \\(V\\) for a knot \\(K\\), the Alexander polynomial is:</p>\
          <div class="formula-box">\
            $$\\Delta_K(t) \\;=\\; \\det\\!\\bigl(V - t\\,V^{\\mathsf{T}}\\bigr)$$\
          </div>\
          <p>normalized so that \\(\\Delta_{\\text{unknot}}(t) = 1\\).</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Skein Relation &amp; Properties</h3>\
          <p>The Alexander polynomial satisfies the following skein relation:</p>\
          <div class="formula-box">\
            $$\\Delta(L_+) - \\Delta(L_-) \\;=\\; \\bigl(t^{1/2} - t^{-1/2}\\bigr)\\,\\Delta(L_0)$$\
          </div>\
          <p><strong>Properties:</strong></p>\
          <ul>\
            <li>Always a symmetric Laurent polynomial: \\(\\Delta(t) = \\Delta(t^{-1})\\).</li>\
            <li>Evaluating at \\(t = -1\\) gives \\(\\pm\\det(K)\\), the determinant of the knot.</li>\
            <li><em>Limitation:</em> cannot distinguish the trefoil from its mirror image&mdash;it does\
            not detect chirality.</li>\
          </ul>\
          <p><em>Interact with Alexander polynomials for 500+ knots in the Knot Explorer tab.</em></p>\
        </div>';
      mathRender(el);
    }

    // ── Jones Polynomial ──────────────────────────────────────
    function renderJones(el) {
      el.innerHTML = '\
        <div class="expo-panel">\
          <h3>Discovery &amp; Construction</h3>\
          <p>The <strong>Jones polynomial</strong> was discovered by Vaughan Jones in 1984, arising from\
          representations of braid groups into von Neumann algebras. It can also be constructed\
          via the <em>Kauffman bracket</em>: starting from a link diagram \\(D\\), one computes the\
          bracket polynomial \\(\\langle D\\rangle\\) and corrects by the writhe \\(w(D)\\) to obtain</p>\
          <div class="formula-box">\
            $$V_K(q) \\;=\\; (-A)^{-3\\,w(D)}\\,\\langle D\\rangle \\quad\\text{where } q = A^{-4}$$\
          </div>\
        </div>\
        <div class="expo-panel">\
          <h3>Skein Relation &amp; Properties</h3>\
          <p>The Jones polynomial satisfies a skein relation:</p>\
          <div class="formula-box">\
            $$q^{-1}\\,V_{L_+}(q) \\;-\\; q\\,V_{L_-}(q) \\;=\\; \\bigl(q^{1/2} - q^{-1/2}\\bigr)\\,V_{L_0}(q)$$\
          </div>\
          <p><strong>Key properties:</strong></p>\
          <ul>\
            <li>Unlike the Alexander polynomial, the Jones polynomial <em>can</em> detect chirality:\
            the trefoil and its mirror image have different Jones polynomials.</li>\
            <li>It satisfies the so-called &ldquo;Jones conjecture&rdquo; relating the polynomial\
            to the braid index of the knot.</li>\
          </ul>\
          <p><em>Explore Jones polynomials and their domain coloring plots in the Knot Explorer tab.</em></p>\
        </div>';
      mathRender(el);
    }

    // ── HOMFLY-PT Polynomial ──────────────────────────────────
    function renderHomflypt(el) {
      el.innerHTML = '\
        <div class="expo-panel">\
          <h3>A Two-Variable Generalization</h3>\
          <p>The <strong>HOMFLY-PT polynomial</strong> was discovered independently by several groups\
          in 1985: Hoste, Ocneanu, Millett, Freyd, Lickorish, and Yetter, as well as Przytycki\
          and Traczyk. It is a two-variable polynomial \\(P(a, z)\\) that simultaneously\
          generalizes both the Alexander and Jones polynomials.</p>\
          <p>It is defined by the skein relation:</p>\
          <div class="formula-box">\
            $$a\\,P(L_+) \\;-\\; a^{-1}\\,P(L_-) \\;=\\; z\\,P(L_0)$$\
          </div>\
          <p>with the normalization \\(P(\\text{unknot}) = 1\\).</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Specializations</h3>\
          <p>The HOMFLY-PT polynomial recovers the classical invariants as special cases:</p>\
          <ul>\
            <li><strong>Alexander polynomial:</strong> set \\(a = 1\\), so\
            \\(P(1, z) = \\Delta_K(t)\\) with \\(z = t^{1/2} - t^{-1/2}\\).</li>\
            <li><strong>Jones polynomial:</strong> set \\(a = q\\) and \\(z = q^{1/2} - q^{-1/2}\\).</li>\
          </ul>\
          <p>The HOMFLY-PT polynomial is <em>strictly stronger</em> than either the Alexander or\
          Jones polynomial individually&mdash;there exist pairs of knots distinguished by\
          HOMFLY-PT but not by Alexander or Jones alone.</p>\
        </div>';
      mathRender(el);
    }

    // ── Quantum Link Invariants ───────────────────────────────
    function renderQuantum(el) {
      el.innerHTML = '\
        <div class="expo-panel">\
          <h3>Reshetikhin&ndash;Turaev Construction</h3>\
          <p>In the late 1980s, Reshetikhin and Turaev showed how to construct link invariants\
          from <strong>quantum groups</strong> and representation theory. For each simple Lie algebra\
          \\(\\mathfrak{g}\\) and finite-dimensional representation \\(R\\), one obtains a quantum\
          invariant of links.</p>\
          <ul>\
            <li>\\(\\mathfrak{sl}(2)\\), fundamental representation \\(\\longrightarrow\\) Jones polynomial</li>\
            <li>\\(\\mathfrak{sl}(N)\\), fundamental representation \\(\\longrightarrow\\)\
            \\(\\mathfrak{sl}(N)\\) polynomial (specialization of HOMFLY-PT)</li>\
          </ul>\
        </div>\
        <div class="expo-panel">\
          <h3>Colored Jones &amp; Chern&ndash;Simons Theory</h3>\
          <p>The <strong>colored Jones polynomials</strong> arise by using higher-dimensional\
          representations of \\(\\mathfrak{sl}(2)\\). The \\(n\\)-colored Jones polynomial\
          \\(J_n(K; q)\\) uses the \\(n\\)-dimensional irreducible representation.</p>\
          <p>Witten (1989) showed that these quantum invariants have a beautiful\
          interpretation via <strong>Chern&ndash;Simons gauge theory</strong>: the Jones polynomial\
          equals a path integral</p>\
          <div class="formula-box">\
            $$V_K(q) \\;=\\; \\int \\mathcal{D}A\\; \\mathrm{Tr}\\,\\mathcal{P}\\exp\\!\\oint_K A\\;\
            \\exp\\!\\Bigl(\\frac{ik}{4\\pi}\\int_M \\mathrm{Tr}\\bigl(A \\wedge dA + \\tfrac{2}{3}\
            A \\wedge A \\wedge A\\bigr)\\Bigr)$$\
          </div>\
          <p>where \\(k\\) is the level and \\(q = e^{2\\pi i/(k+2)}\\).</p>\
        </div>';
      mathRender(el);
    }

    // ── Others ────────────────────────────────────────────────
    function renderOthers(el) {
      el.innerHTML = '\
        <div class="expo-panel">\
          <h3>Kauffman &amp; Conway Polynomials</h3>\
          <p>The <strong>Kauffman polynomial</strong> \\(F(a, z)\\) is another two-variable polynomial\
          invariant, defined via regular isotopy of unoriented diagrams. It is independent of the\
          HOMFLY-PT polynomial and can sometimes distinguish knots that HOMFLY-PT cannot.</p>\
          <p>The <strong>Conway polynomial</strong> \\(\\nabla_K(z)\\) is a renormalized version of the\
          Alexander polynomial satisfying the skein relation</p>\
          <div class="formula-box">\
            $$\\nabla(L_+) - \\nabla(L_-) \\;=\\; z\\,\\nabla(L_0)$$\
          </div>\
          <p>with integer coefficients.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Finite-Type (Vassiliev) Invariants</h3>\
          <p><strong>Vassiliev invariants</strong> (or finite-type invariants) provide a unifying\
          framework for polynomial knot invariants. A knot invariant \\(v\\) is of <em>finite type\
          \\(n\\)</em> if it vanishes on all singular knots with more than \\(n\\) double points.</p>\
          <p>The coefficients of the Jones, Alexander, and HOMFLY-PT polynomials all give rise\
          to finite-type invariants. The <strong>Kontsevich integral</strong> serves as a\
          &ldquo;universal&rdquo; finite-type invariant&mdash;every Vassiliev invariant factors\
          through it.</p>\
          <p><em>More content to come.</em></p>\
        </div>';
      mathRender(el);
    }

    render();
  };
})();
