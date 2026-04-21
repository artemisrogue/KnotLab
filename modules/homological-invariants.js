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
    { id: 'specseq',   label: 'Spectral Sequences' },
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
      else if (state.subTab === 'specseq')   renderSpecseq(content);
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
          <em>categorification</em> of the <span class="kl-term" title="Jones polynomial V_K(q) ∈ ℤ[q^{±1/2}]: Laurent polynomial invariant (Jones 1984) defined via the Temperley–Lieb/Hecke algebra or the Kauffman bracket skein relation. Distinguishes infinitely many knot pairs but not all.">Jones polynomial</span>. Rather than assigning a polynomial\
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
          <details class="kl-example">\
            <summary>Worked mini-example: \\(\\mathrm{Kh}(\\text{unknot})\\)</summary>\
            <p>The crossing-less diagram of the unknot has \\(n=0\\), so the cube \\(\\{0,1\\}^0\\) has a single vertex carrying one circle, hence one copy of the Frobenius algebra \\(A = \\mathbb{Z}[X]/(X^2)\\) with generators \\(1\\) in \\(q\\)-degree \\(+1\\) and \\(X\\) in \\(q\\)-degree \\(-1\\). The chain complex is concentrated in homological degree \\(0\\) with no differentials, so</p>\
            <div class="formula-box">$$\\mathrm{Kh}(\\bigcirc) \\;=\\; \\mathbb{Z}_{(0,1)} \\;\\oplus\\; \\mathbb{Z}_{(0,-1)}.$$</div>\
            <p>The graded Euler characteristic is \\(q + q^{-1} = V_{\\bigcirc}(q)\\), confirming categorification.</p>\
          </details>\
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
          <p>The <span class="kl-term" title="Rasmussen s-invariant (Rasmussen 2004): even integer from the Lee spectral sequence collapse page on Khovanov homology; concordance homomorphism with |s(K)| ≤ 2g₄(K). Equals 2τ for many classes but not all.">Rasmussen \\(s\\)-invariant</span> is a concordance invariant \\(s(K)\\) extracted\
          from the <span class="kl-term" title="Lee spectral sequence (Lee 2005): deformation of the Khovanov differential by adding a term dual to 1, collapsing to a 2-dimensional space per component. The filtration grading on the surviving generators defines the Rasmussen s-invariant.">Lee spectral sequence</span> on Khovanov homology. This invariant provides a\
          lower bound for the <em>slice genus</em> (smooth 4-ball genus):</p>\
          <div class="formula-box">\
            $$\\frac{|s(K)|}{2} \\;\\leq\\; g_4(K)$$\
          </div>\
          <p>The \\(s\\)-invariant gives a purely combinatorial proof of the <span class="kl-term" title="Milnor conjecture: g₄(T_{p,q}) = (p−1)(q−1)/2 for the (p,q)-torus knot. Proved by Kronheimer–Mrowka (1993) using gauge theory; reproved combinatorially by Rasmussen (2004) via the s-invariant.">Milnor conjecture</span>\
          on the slice genus of <span class="kl-term" title="Torus knot T(p,q): lies on a standard torus in S³, wrapping p and q times; fibered, Seifert genus (p−1)(q−1)/2.">torus knot</span>s, originally proved by Kronheimer&ndash;Mrowka (1993) via gauge theory.</p>\
          <p><em>Explore Khovanov homology computations for 500+ knots in the Knot Explorer tab.</em></p>\
        </div>';
      mathRender(el);
    }

    // ── Knot Floer Homology ──────────────────────────────────
    function renderFloer(el) {
      el.innerHTML = '\
        <div class="expo-panel">\
          <h3>1. What knot Floer homology is</h3>\
          <p><strong>Knot Floer homology</strong> was independently developed by Ozsv&aacute;th&ndash;Szab&oacute;\
          and Rasmussen in 2003&ndash;2004. It arises from <em>Heegaard Floer homology</em>, a powerful\
          package of invariants for closed 3-manifolds defined via pseudo-holomorphic disks in\
          symmetric products of Heegaard surfaces.</p>\
          <p>To a knot \\(K \\subset S^3\\), the theory associates a <strong>bigraded abelian group</strong></p>\
          <div class="formula-box">\
            $$\\widehat{\\mathrm{HFK}}(K) \\;=\\; \\bigoplus_{m,\\,s} \\widehat{\\mathrm{HFK}}_{m}(K,\\,s),$$\
          </div>\
          <p>where \\(m\\) is the <em>Maslov</em> (homological) grading and \\(s\\) is the\
          <em>Alexander</em> grading. It is defined by counting pseudo-holomorphic disks in a Heegaard\
          diagram adapted to \\((S^3, K)\\). Its graded Euler characteristic recovers the\
          <span class="kl-term" title="Alexander polynomial Δ_K(t) ∈ ℤ[t,t⁻¹]: first polynomial knot invariant (Alexander 1928); det(tV−Vᵀ) up to units, symmetric under t ↔ t⁻¹, with Δ_K(1)=±1.">Alexander polynomial</span>:</p>\
          <div class="formula-box">\
            $$\\Delta_K(q) \\;=\\; \\sum_{m,\\,s} (-1)^{m}\\, q^{\\,s}\\, \\mathrm{rk}\\,\\widehat{\\mathrm{HFK}}_{m}(K,\\,s).$$\
          </div>\
          <p>In this sense \\(\\widehat{\\mathrm{HFK}}\\) <strong>categorifies</strong> \\(\\Delta_K\\):\
          polynomial coefficients are replaced by ranks of graded homology groups.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>2. Genus detection (Ozsv&aacute;th&ndash;Szab&oacute;)</h3>\
          <p>A landmark theorem &mdash; not a definition &mdash; is that knot Floer homology <strong>detects the\
          <span class="kl-term" title="Seifert genus g(K): the minimum genus over all Seifert surfaces (orientable surfaces in S³ with boundary K). Additive under connected sum; zero iff K is the unknot.">Seifert genus</span></strong>:</p>\
          <div class="formula-box">\
            $$g(K) \\;=\\; \\max\\!\\bigl\\{\\, s \\;:\\; \\widehat{\\mathrm{HFK}}(K,\\,s) \\neq 0 \\,\\bigr\\}\\qquad \\text{(Ozsv\u00e1th\u2013Szab\u00f3, 2004).}$$\
          </div>\
          <p>The Alexander polynomial gives only the bound \\(\\deg \\Delta_K \\leq 2 g(K)\\), often strict.\
          The categorified invariant sees the genus on the nose. See the\
          <em>Alexander Module</em> sub-tab of Polynomial Invariants for the decategorified picture that\
          \\(\\widehat{\\mathrm{HFK}}\\) lifts.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>3. Fibered knot detection (Ni)</h3>\
          <p>Yi Ni (2007) proved an even sharper structural statement: \\(K\\) is\
          <span class="kl-term" title="Fibered knot: the complement S³∖K fibers over S¹; the fiber is a minimal-genus Seifert surface, and the monodromy of the fibration determines the knot.">fibered</span> if and only if the top Alexander group is as small as possible,</p>\
          <div class="formula-box">\
            $$K \\text{ is fibered} \\iff \\widehat{\\mathrm{HFK}}\\!\\bigl(K,\\,g(K)\\bigr) \\;\\cong\\; \\mathbb{Z}.$$\
          </div>\
          <p>No analogue of this result is known for any classical polynomial invariant.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>4. The <span class="kl-term" title="Ozsváth–Szabó τ invariant (2003): integer concordance homomorphism from the Alexander filtration on CFK̂(K); |τ(K)| ≤ g₄(K), with equality for positive knots and torus knots.">\\(\\tau\\)</span> invariant and the Alexander filtration</h3>\
          <p>The chain complex \\(\\widehat{\\mathrm{CFK}}(K)\\) is not merely bigraded: it carries an\
          increasing <strong><span class="kl-term" title="Alexander filtration: the filtration of CFK^∞(K) (or CFK̂(K)) by the Alexander grading A; its associated graded recovers ĤFK. τ(K) is the minimum Alexander level at which the filtration contains a generator mapping to a generator of ĤF(S³) = ℤ.">Alexander filtration</span></strong>\
          \\(\\cdots \\subset \\mathcal{F}_{s-1} \\subset \\mathcal{F}_{s} \\subset \\cdots\\) whose associated\
          graded recovers \\(\\widehat{\\mathrm{HFK}}\\). The invariant \\(\\tau(K)\\) is defined directly from this\
          filtration:</p>\
          <div class="formula-box">\
            $$\\tau(K) \\;=\\; \\min\\!\\Bigl\\{\\, s \\;:\\; \\mathcal{F}_{s}\\,\\widehat{\\mathrm{CFK}}(K) \\longrightarrow \\widehat{\\mathrm{HF}}(S^3) = \\mathbb{Z} \\text{ is surjective} \\,\\Bigr\\}.$$\
          </div>\
          <p>Equivalently, \\(\\tau(K)\\) is the minimal Alexander grading at which the filtered complex\
          already \u201csees\u201d the generator of \\(\\widehat{\\mathrm{HF}}(S^3)\\). It satisfies the\
          4-genus bound</p>\
          <div class="formula-box">\
            $$|\\tau(K)| \\;\\leq\\; g_4(K),$$\
          </div>\
          <p>where \\(g_4(K)\\) is the smooth 4-ball genus.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>5. Concordance homomorphism and the Milnor conjecture</h3>\
          <p>The map</p>\
          <div class="formula-box">\
            $$\\tau \\colon \\mathcal{C} \\longrightarrow \\mathbb{Z}$$\
          </div>\
          <p>is a <strong>group homomorphism</strong> from the smooth knot concordance group\
          \\(\\mathcal{C}\\) (additive under connected sum). For the \\((p,q)\\)-<span class="kl-term" title="Torus knot T(p,q): lies on a standard torus in S³, wrapping p and q times; fibered, Seifert genus (p−1)(q−1)/2.">torus knot</span></p>\
          <div class="formula-box">\
            $$\\tau(T_{p,q}) \\;=\\; \\frac{(p-1)(q-1)}{2},$$\
          </div>\
          <p>which together with the bound \\(|\\tau| \\leq g_4\\) reproves the\
          <span class="kl-term" title="Milnor conjecture: g₄(T_{p,q}) = (p−1)(q−1)/2 for the (p,q)-torus knot. Proved by Kronheimer–Mrowka (1993) using gauge theory; reproved combinatorially by Rasmussen (2004) via the s-invariant.">Milnor conjecture</span> \\(g_4(T_{p,q}) = (p-1)(q-1)/2\\) (originally Kronheimer&ndash;Mrowka 1993 via gauge theory).</p>\
          <details class="kl-example">\
            <summary>\\(\\tau\\) vs.\u00a0Rasmussen\u2019s \\(s\\): when they differ</summary>\
            <p>Rasmussen\u2019s \\(s\\)-invariant is the Khovanov-theoretic analogue of \\(2\\tau\\), and on many\
            classes (torus knots, positive knots, quasi-positive knots) one has \\(s(K) = 2\\tau(K)\\).\
            However the two invariants are genuinely different homomorphisms. The first explicit pair\
            of knots with \\(s(K) \\neq 2\\tau(K)\\) was produced by <strong>Hedden&ndash;Ording (2008)</strong>,\
            ending a period during which it was unclear whether the two invariants agreed on all knots.\
            The discrepancy demonstrates that the Khovanov and Heegaard-Floer worlds, though\
            parallel, are not equivalent.</p>\
          </details>\
        </div>\
        <div class="expo-panel">\
          <h3>6. The categorification slogan</h3>\
          <p>The pattern is clean and uniform:</p>\
          <div class="formula-box">\
            $$\\begin{array}{ccc}\
              \\text{Khovanov homology} & \\text{categorifies} & \\text{Jones polynomial } V_K(q) \\\\\
              \\widehat{\\mathrm{HFK}}(K) & \\text{categorifies} & \\text{Alexander polynomial } \\Delta_K(q)\
            \\end{array}$$\
          </div>\
          <p>Each theory assigns a bigraded chain complex whose graded Euler characteristic is the\
          corresponding polynomial, and each exposes structure (genus, fiberedness, 4-genus bounds,\
          concordance homomorphisms) invisible to the polynomial alone.</p>\
        </div>';
      mathRender(el);
    }

    // ── Khovanov-Rozansky Homology ───────────────────────────
    function renderKR(el) {
      el.innerHTML = '\
        <div class="expo-panel">\
          <h3>The \\(\\mathfrak{sl}(N)\\) Generalization</h3>\
          <p>This family of homology theories, due to Khovanov and Rozansky,\
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

    // ── Spectral Sequences ───────────────────────────────────
    function renderSpecseq(el) {
      el.innerHTML = '\
        <div class="expo-panel">\
          <h3>What is a Spectral Sequence?</h3>\
          <p>A <span class="kl-term" title="Spectral sequence: a sequence of bigraded pages (E_r, d_r) with d_r a differential, E_{r+1} = H(E_r, d_r), converging to the graded pieces of a filtered target. Standard bookkeeping device for computing homology of a filtered complex or double complex.">spectral sequence</span> is a bookkeeping device for computing the homology of a\
          <span class="kl-term" title="Filtration: an increasing (or decreasing) sequence of subcomplexes F_p C ⊂ C whose union is C. Induces a spectral sequence with E_1 = H(gr F C) converging (under mild hypotheses) to H(C).">filtration</span>ed\
          chain complex (or double complex) by successive approximations. One obtains a family of pages\
          \\(E_r\\) (the <span class="kl-term" title="E_r page: the r-th approximation in a spectral sequence; a bigraded vector space equipped with a differential d_r. Successive pages refine one another: E_{r+1} = H(E_r, d_r).">E_r page</span>), each carrying a <span class="kl-term" title="d_r differential: the differential on the E_r page of a spectral sequence, of bidegree (r, 1−r) (homological conventions) or similar. Its homology gives E_{r+1}. Longer-length differentials detect deeper filtration data.">differential \\(d_r\\)</span> of\
          increasing length; successive homology yields \\(E_{r+1}\\), and the <span class="kl-term" title="E_∞ page: the stable limit of a spectral sequence; isomorphic (under convergence) to the associated graded of the filtered target.">E_∞ page</span> is the\
          associated graded of the target. We do not prove the exact-couple construction here &mdash; see\
          Weibel, <em>An Introduction to Homological Algebra</em>, or McCleary, <em>A User&rsquo;s Guide to\
          Spectral Sequences</em>.</p>\
          <p><strong>Why this matters for knot theory.</strong> Virtually every knot homology carries a natural\
          filtration &mdash; Lee&rsquo;s deformation of the Khovanov differential, Bar-Natan&rsquo;s universal deformation,\
          Alexander filtrations on \\(\\widehat{CFK}\\), equivariant or branched-cover filtrations, the\
          instanton/Khovanov comparison. Each filtration yields a spectral sequence, and each spectral\
          sequence is a <em>theorem</em> relating two invariants: one on the \\(E_2\\) page, another at \\(E_\\infty\\).</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Lee Spectral Sequence &amp; the Rasmussen \\(s\\)-Invariant</h3>\
          <p>Lee (2005) perturbed the Khovanov differential by a term shifting \\(q\\)-grading, producing\
          <span class="kl-term" title="Lee homology: the homology of Khovanov&rsquo;s chain complex with differential deformed by Lee&rsquo;s extra term (dual to 1 on the Frobenius algebra). For a knot, Kh_Lee(K) ≅ ℚ² regardless of K; the q-gradings of the surviving generators encode the Rasmussen s-invariant.">Lee homology</span> \\(\\mathrm{Kh}_{\\mathrm{Lee}}(K)\\). The striking result: for every knot,\
          \\(\\mathrm{Kh}_{\\mathrm{Lee}}(K) \\cong \\mathbb{Q}^2\\) as a vector space. As an abstract group it is\
          trivial &mdash; but the <em>\\(q\\)-grading</em> on the two surviving generators encodes deep information.</p>\
          <p>The Lee perturbation is a filtered chain map, yielding a spectral sequence:</p>\
          <div class="formula-box">$$E_2 \\;=\\; \\mathrm{Kh}(K;\\mathbb{Q}) \\;\\Longrightarrow\\; E_\\infty \\;=\\; \\mathrm{Kh}_{\\mathrm{Lee}}(K) \\;\\cong\\; \\mathbb{Q}^2.$$</div>\
          <p>The higher differentials \\(d_r\\) shift bigrading \\((1, 4r)\\). The two \\(E_\\infty\\) generators\
          \\(\\mathfrak{s}_\\pm\\) sit in \\(q\\)-gradings \\(s(K) \\pm 1\\) for a unique even integer \\(s(K)\\) &mdash; the\
          <span class="kl-term" title="Rasmussen s-invariant (Rasmussen 2010): even-integer concordance invariant extracted from the q-gradings of the two surviving generators on the E_∞ page of the Lee spectral sequence. Concordance homomorphism with |s(K)| ≤ 2g_4(K); gives a combinatorial proof of the Milnor conjecture for torus knots.">Rasmussen \\(s\\)-invariant</span>.</p>\
          <p><strong>Theorem (Rasmussen 2010).</strong> \\(|s(K)| \\le 2 g_4(K)\\), with equality for positive knots.\
          In particular, for torus knots:</p>\
          <div class="formula-box">$$s(T_{p,q}) \\;=\\; (p-1)(q-1) \\;=\\; 2 g_4(T_{p,q}),$$</div>\
          <p>giving a re-proof of the <strong>Milnor conjecture</strong> entirely without gauge theory. This\
          matches \\(|2\\tau|\\) for positive torus knots and is the flagship combinatorial application of\
          Khovanov homology to smooth 4-manifold topology.</p>\
          <details class="kl-example">\
            <summary>Worked example: \\(s(T_{2,3}) = 2\\) and the trefoil</summary>\
            <p>For the right-handed trefoil \\(T_{2,3} = 3_1\\), the formula gives \\(s(3_1) = (2-1)(3-1) = 2\\). The\
            unknotting number \\(u(3_1) = 1\\) forces \\(g_4(3_1) \\le 1\\), and \\(g_3(3_1) = 1\\) with \\(g_4 \\le g_3\\) gives\
            \\(g_4 \\le 1\\). Rasmussen&rsquo;s bound reads \\(2 = |s| \\le 2 g_4 \\le 2\\), so \\(g_4(3_1) = 1\\)\
            &mdash; equality throughout.</p>\
          </details>\
          <p><em>Cross-ref:</em> see the Khovanov Homology sub-tab for the Lee remark and \\(s\\)-invariant tooltip.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Bar-Natan Spectral Sequence</h3>\
          <p>Bar-Natan (2005) considered the universal deformation of Khovanov over \\(\\mathbb{Z}[h,t]\\)\
          (equivalently \\(\\mathbb{Q}[H]\\)). Specializations recover familiar theories:</p>\
          <ul>\
            <li>\\((h,t) = (0,0)\\): ordinary <strong>Khovanov homology</strong>;</li>\
            <li>\\((h,t) = (0,1)\\): <strong>Lee homology</strong>;</li>\
            <li>\\((h,t) = (1,0)\\): <span class="kl-term" title="Bar-Natan homology Kh_BN: the specialization (h,t)=(1,0) of the universal Khovanov deformation. For a knot, free of rank 2 over the ground ring; its s-invariant agrees with Rasmussen&rsquo;s over ℚ but differs over 𝔽_2 (Lipshitz–Sarkar).">Bar-Natan homology</span> \\(\\mathrm{Kh}_{\\mathrm{BN}}(K)\\).</li>\
          </ul>\
          <p>The filtration on the universal complex yields a spectral sequence</p>\
          <div class="formula-box">$$E_2 \\;=\\; \\mathrm{Kh}(K) \\;\\Longrightarrow\\; \\mathrm{Kh}_{\\mathrm{BN}}(K).$$</div>\
          <p>For any knot, \\(\\mathrm{Kh}_{\\mathrm{BN}}(K) \\cong \\mathbb{Z}^2\\); the filtration gradings on the two\
          surviving generators define an invariant \\(s_{\\mathrm{BN}}\\). Over \\(\\mathbb{Q}\\) this agrees with\
          Rasmussen&rsquo;s \\(s\\); over \\(\\mathbb{F}_2\\) <em>they differ</em>, and Lipshitz&ndash;Sarkar showed\
          \\(s_{\\mathrm{BN}}^{\\mathbb{F}_2}\\) detects features invisible to Lee.</p>\
          <p><strong>Unifying viewpoint.</strong> The family \\(\\mathrm{Kh}_{h,t}\\) interpolates between these\
          specializations; each choice of \\((h,t)\\) is a different spectral sequence, each with its own\
          slice-genus bound.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Ozsv&aacute;th&ndash;Szab&oacute; Branched-Cover Spectral Sequence</h3>\
          <p>Ozsv&aacute;th&ndash;Szab&oacute; (2005): for a link \\(L\\), the reduced Khovanov homology of the\
          mirror carries a spectral sequence converging to Heegaard Floer homology of the\
          <span class="kl-term" title="Double branched cover Σ(L): the closed 3-manifold obtained as the double cover of S³ branched along the link L. Classical construction; turns link invariants of L into 3-manifold invariants of Σ(L).">double branched cover</span>:</p>\
          <div class="formula-box">$$\\widetilde{\\mathrm{Kh}}(\\overline{L}; \\mathbb{F}_2) \\;\\Longrightarrow\\; \\widehat{HF}\\bigl(\\Sigma(L); \\mathbb{F}_2\\bigr).$$</div>\
          <p>This implies rank inequalities \\(\\operatorname{rk} \\widehat{HF}(\\Sigma(L)) \\le \\operatorname{rk} \\widetilde{\\mathrm{Kh}}(L)\\)\
          and was refined by Baldwin, Levine, and others to\
          <span class="kl-term" title="Heegaard Floer homology (Ozsváth–Szabó): package of 3- and 4-manifold invariants defined via Lagrangian Floer homology on symmetric products of Heegaard surfaces. ĤF is the &lsquo;hat&rsquo; flavor.">Heegaard Floer</span> spectral sequences with target branched covers of more general manifolds.\
          Szab&oacute; (2015) gave a combinatorial, bordered-Floer-inspired formula for the higher\
          differentials \\(d_r\\), \\(r \\ge 2\\).</p>\
          <p>This was a key piece of evidence that Khovanov homology &ldquo;sees&rdquo; 3-manifold topology,\
          not merely knot data &mdash; and it launched an industry of categorified spectral sequences.</p>\
          <p><em>Cross-ref:</em> see the Knot Floer Homology sub-tab for the definition of \\(\\widehat{HF}\\) and its relatives.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Khovanov&ndash;Rozansky \\(\\mathfrak{sl}(N)\\) Spectral Sequences</h3>\
          <p>Rasmussen constructs, for each \\(N \\ge 2\\), a spectral sequence</p>\
          <div class="formula-box">$$\\mathrm{Kh}(K) \\;\\Longrightarrow\\; \\mathrm{KR}_N(K),$$</div>\
          <p>and a tower of comparisons \\(\\mathrm{KR}_N(K) \\Longrightarrow \\mathrm{KR}_{N-1}(K)\\), assembling\
          into an infinite family indexed by rank. At the top sits the triply-graded HOMFLY homology\
          \\(\\mathrm{HHH}(K)\\); Gukov&ndash;Sto&scaron;i&cacute;, Rasmussen, and Gorsky&ndash;Rasmussen showed that\
          \\(\\mathrm{HHH}(K)\\) degenerates to the \\(\\mathfrak{sl}(N)\\) homologies by collapsing one grading\
          along a differential \\(d_N\\):</p>\
          <div class="formula-box">$$\\mathrm{HHH}(K) \\;\\xrightarrow{\\;d_N\\;}\\; \\mathrm{KR}_N(K).$$</div>\
          <p>Each page yields its own <span class="kl-term" title="Concordance invariant: a knot invariant depending only on the smooth (or topological) concordance class. Examples: τ, s, s_N, υ, Υ. Gives lower bounds on the slice genus g_4.">concordance invariant</span> \\(s_N(K)\\), refining Rasmussen&rsquo;s\
          \\(s = s_2\\) to an infinite tower \\(\\{s_N\\}_{N \\ge 2}\\) of slice-genus bounds.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Instanton &amp; Monopole Spectral Sequences</h3>\
          <p>Kronheimer&ndash;Mrowka (2011) constructed a spectral sequence from <span class="kl-term" title="Reduced Khovanov homology: variant of Khovanov homology obtained by pinning a basepoint and quotienting by X at that point. Bigraded like Kh but with one fewer copy of ℤ[X]/(X²); closely related to the full theory via a splitting.">reduced Khovanov homology</span>\
          to <span class="kl-term" title="Instanton knot homology I^♮ (Kronheimer–Mrowka): knot homology defined via gauge theory on the knot complement with singular boundary conditions. Detects the unknot. Related to Khovanov homology by a spectral sequence.">instanton knot homology</span>:</p>\
          <div class="formula-box">$$\\mathrm{Kh}^r(K; \\mathbb{C}) \\;\\Longrightarrow\\; I^{\\natural}(K).$$</div>\
          <p><strong>Corollary (Kronheimer&ndash;Mrowka).</strong> If \\(\\mathrm{Kh}^r(K) = \\mathbb{C}\\) then\
          \\(I^{\\natural}(K) = \\mathbb{C}\\), so \\(K\\) is the unknot by the gauge-theoretic unknot-detection\
          theorem. Hence <strong>Khovanov homology detects the unknot</strong> &mdash; one of the deepest\
          applications in the subject.</p>\
          <p>There are analogous <span class="kl-term" title="Monopole Floer homology (Kronheimer–Mrowka): Seiberg–Witten-theoretic 3-manifold invariant; three flavors HM̂, ȞM, H̄M. Equivalent to Heegaard Floer by theorems of Kutluhan–Lee–Taubes and Colin–Ghiggini–Honda.">monopole Floer</span> spectral sequences (Bloom;\
          Bloom&ndash;Sarkar) of the form \\(\\mathrm{Kh}(\\overline{L}) \\Rightarrow \\widehat{HM}(\\Sigma(L))\\), and\
          Bar-Natan\\(\\Rightarrow\\)instanton sequences (Daemi&ndash;Scaduto) linking the universal deformation\
          to gauge theory.</p>\
          <p><em>Cross-ref:</em> the Khovanov unknot-detection remark appears in the Comments sub-tab under &ldquo;Open Questions&rdquo;.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Summary Table</h3>\
          <table class="kl-table">\
            <thead>\
              <tr><th>Name</th><th>Source (\\(E_2\\))</th><th>Target (\\(E_\\infty\\))</th><th>Key corollary / invariant</th></tr>\
            </thead>\
            <tbody>\
              <tr><td>Lee</td><td>\\(\\mathrm{Kh}(K;\\mathbb{Q})\\)</td><td>\\(\\mathbb{Q}^2\\)</td><td>Rasmussen \\(s\\); \\(|s| \\le 2 g_4\\)</td></tr>\
              <tr><td>Bar-Natan</td><td>\\(\\mathrm{Kh}(K)\\)</td><td>\\(\\mathrm{Kh}_{\\mathrm{BN}} \\cong \\mathbb{Z}^2\\)</td><td>\\(s_{\\mathrm{BN}}\\); char-2 refinement</td></tr>\
              <tr><td>OS branched cover</td><td>\\(\\widetilde{\\mathrm{Kh}}(\\overline{L}; \\mathbb{F}_2)\\)</td><td>\\(\\widehat{HF}(\\Sigma(L); \\mathbb{F}_2)\\)</td><td>rank ineq.; 3-mfd topology</td></tr>\
              <tr><td>KR \\(\\mathfrak{sl}(N)\\)</td><td>\\(\\mathrm{Kh}(K)\\)</td><td>\\(\\mathrm{KR}_N(K)\\)</td><td>\\(s_N\\); HHH tower</td></tr>\
              <tr><td>Instanton</td><td>\\(\\mathrm{Kh}^r(K; \\mathbb{C})\\)</td><td>\\(I^{\\natural}(K)\\)</td><td>Kh detects the unknot</td></tr>\
              <tr><td>Monopole</td><td>reduced \\(\\mathrm{Kh}\\)</td><td>\\(\\widehat{HM}(\\Sigma(K))\\)</td><td>analogous detection results</td></tr>\
            </tbody>\
          </table>\
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
          <p><strong>Unknot detection:</strong> Khovanov homology is known to detect the unknot,\
          via a spectral sequence from Khovanov homology to the instanton Floer homology of\
          the branched double cover. Whether a purely combinatorial proof exists remains open.</p>\
          <p><strong>Functoriality:</strong> Khovanov homology is expected to define a functor from a cobordism\
          category of knots to graded vector spaces. Significant progress has been made, though\
          subtleties around sign conventions persist.</p>\
          <p><strong>Spectral sequences</strong> provide bridges between different theories &mdash; for instance,\
          from Khovanov homology to knot Floer homology, and from Khovanov&ndash;Rozansky to\
          Khovanov via specialization.</p>\
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
