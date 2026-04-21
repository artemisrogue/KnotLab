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
          <details class="kl-proof">\
            <summary>Proof sketch: \\(d^2 = 0\\) on the Khovanov complex</summary>\
            <p>Sketch. The differential is a signed sum of edge maps in the resolution cube \\(\\{0,1\\}^n\\); each edge flips a single crossing from 0-smoothing to 1-smoothing and induces either a <em>merge</em> \\(m: A \\otimes A \\to A\\) or a <em>split</em> \\(\\Delta: A \\to A \\otimes A\\) on the Frobenius algebra \\(A = \\mathbb{Z}[X]/(X^2)\\). Each 2-face of the cube is one of three local types (two crossings far apart; two crossings sharing one circle; two crossings sharing two circles). A finite case check on \\(A\\) &mdash; using \\(m(\\Delta\\otimes\\mathrm{id}) = \\Delta m\\) (Frobenius identity) and \\(m\\Delta = X\\otimes 1 + 1\\otimes X\\) &mdash; shows each 2-face commutes up to sign. Assigning signs by declaring edge \\(\\xi \\to \\xi \\cup \\{i\\}\\) to have sign \\((-1)^{|\\xi \\cap \\{1,\\ldots,i-1\\}|}\\) makes <em>all</em> 2-faces anticommute, hence \\(d^2 = 0\\). See Khovanov (2000) \u00a75 or Bar-Natan (2002).</p>\
          </details>\
          <p>Reidemeister&rsquo;s theorem reduces invariance under ambient isotopy to producing, for each of R1, R2, R3, an explicit chain homotopy equivalence between the Khovanov complexes of the two local diagrams. Each of the three proofs below writes down the local complex inside the R-move disc and exhibits a deformation retraction; all homotopies are local and explicit, so invariance extends to functoriality on cobordisms. General references: Khovanov (2000); Bar-Natan, <em>Algebr. Geom. Topol.</em> 2 (2002); Lipshitz&ndash;Sarkar notes.</p>\
          <details class="kl-proof">\
            <summary>Proof sketch: R1 invariance &mdash; delooping the twist</summary>\
            <p>The local R1 twist disc contains one extra crossing, whose two resolutions are (i) a diagram identical to the untwisted arc with an extra isolated circle, and (ii) the untwisted arc itself. The 0- and 1-resolution complexes therefore differ by tensoring with the Frobenius algebra \\(A = \\mathbb{Z}[x]/(x^2)\\) on the extra circle. Bar-Natan&rsquo;s <em>delooping</em> isomorphism rewrites that extra circle as a direct sum of two shifted copies of the empty diagram:</p>\
            <div class="formula-box">$$A \\;\\cong\\; q\\,\\mathbf{1}[1] \\;\\oplus\\; q^{-1}\\,\\mathbf{1},$$</div>\
            <p>and the saddle map that joined the small circle to the long arc becomes, in the delooped basis, an isomorphism on one of the two summands. Gauss-eliminating that isomorphic pair kills both, leaving exactly the untwisted arc complex (with the correct overall grading shift, once the writhe normalization is applied). This is an explicit deformation retraction, not merely a quasi-isomorphism.</p>\
          </details>\
          <details class="kl-proof">\
            <summary>Proof sketch: R2 invariance &mdash; Gaussian elimination of a cancelling pair</summary>\
            <p>The R2 disc has two crossings of opposite sign; its cube of resolutions is the 2-dimensional square</p>\
            <div class="formula-box">$$\\begin{array}{ccc} C_{00} & \\longrightarrow & C_{10} \\\\ \\downarrow & & \\downarrow \\\\ C_{01} & \\longrightarrow & C_{11} \\end{array}$$</div>\
            <p>A direct inspection shows that one of the four corners (say \\(C_{10}\\)) is isomorphic to one of its neighbours (say \\(C_{11}\\)) via the differential between them &mdash; both consist of the same pair of arcs with the same circle decoration, and the saddle between them is the identity on that circle. The general principle of <em>Gaussian elimination of chain complexes</em> (Bar-Natan 2007) then says that whenever two summands are connected by an isomorphism differential, the entire complex is chain-homotopy equivalent to the complex with those two summands and the iso differential deleted. Applying this once leaves exactly the complex of the two parallel arcs. Again the homotopy is explicit and local.</p>\
          </details>\
          <details class="kl-proof">\
            <summary>Proof sketch: R3 invariance &mdash; reducing to R2 by a braid-like slide</summary>\
            <p>Bar-Natan&rsquo;s proof of R3 invariance reduces it to R2 rather than verifying it by hand. The two sides of the R3 move share the same outer three strands and differ by sliding one strand across the crossing of the other two. In both the left and right R3 diagrams one can identify, in the cube of resolutions, a 2&times;2 sub-square whose corners are related by an R2-style pair of cancelling crossings. Gaussian-eliminating that R2 sub-square on each side produces two simplified complexes that are manifestly identical (they have the same underlying diagram with identical circle decorations and identical saddle maps). Composing the two R2-style homotopy equivalences gives the R3 chain homotopy equivalence. No new local move is needed &mdash; this is exactly Bar-Natan&rsquo;s observation that, at the level of the local cube of resolutions, R3 <em>is</em> R2 done twice.</p>\
          </details>\
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
        </div>\
        <div class="expo-panel">\
          <h3>7. Grid homology: combinatorial HFK</h3>\
          <p>One of the most striking developments in the subject is the\
          <strong>combinatorial reformulation</strong> of knot Floer homology by\
          Manolescu&ndash;Ozsv&aacute;th&ndash;Sarkar (2009). Rather than counting pseudo-holomorphic disks,\
          one works with a purely combinatorial chain complex built from\
          <span class="kl-term" title="Grid diagram: a finite n×n toroidal grid with exactly one X and one O marker in each row and each column; connecting O→X vertically and X→O horizontally (with appropriate over/under conventions) presents a link L. Every link admits grid presentations.">grid diagrams</span>.</p>\
          <p><strong>Grid diagrams.</strong> An \\(n \\times n\\) toroidal grid carrying one \\(X\\) and one\
          \\(O\\) in every row and every column defines an oriented link \\(L \\subset S^3\\) (connect each\
          \\(O\\) to the \\(X\\) in its column vertically and each \\(X\\) to the \\(O\\) in its row horizontally).</p>\
          <p><strong>Generators of \\(GC^-(K)\\).</strong> A\
          <span class="kl-term" title="Perfect matching / generator of grid homology: a set of n points, one in each row and each column of the toroidal grid. Equivalently, a permutation in S_n. The grid complex GC⁻ is free over 𝔽[U₁,…,U_n] on these n! generators.">perfect matching</span>\
          chooses \\(n\\) points on the grid, one on each horizontal and each vertical circle &mdash;\
          equivalently a permutation in \\(S_n\\). There are \\(n!\\) such generators.</p>\
          <p><strong>Differential.</strong> The boundary counts\
          <span class="kl-term" title="Empty rectangle: an embedded rectangle on the toroidal grid whose interior contains no X-marker, no O-marker, and no generator point. Empty rectangles connecting two generators that differ by a transposition are counted by the grid differential; ∂² = 0 because rectangles compose in pairs.">empty rectangles</span>\
          on the torus: embedded rectangles with corners on the two generators, whose interior contains\
          no \\(X\\), no \\(O\\), and no marker of either generator. The equation \\(\\partial^2 = 0\\) is a\
          short combinatorial argument about pairs of rectangles composing in two ways.</p>\
          <div class="formula-box">\
            $$H_\\ast(GC^-(K),\\,\\partial) \\;\\cong\\; \\mathrm{HFK}^-(K) \\qquad\\text{(MOS 2009).}$$\
          </div>\
          <p><strong>Micro-example: right-handed trefoil \\(3_1\\).</strong> A minimal\
          <span class="kl-term" title="Grid homology: the (bi)graded homology of the grid chain complex GC⁻ (or its hat/minus/infinity variants). Isomorphic to knot Floer homology HFK; computable by hand for small grids and by software (HFKcalc, KnotKit) for moderate ones.">grid homology</span>\
          presentation of \\(3_1\\) uses a \\(5 \\times 5\\) grid, giving \\(5! = 120\\) generators. Despite\
          that count, the homology collapses to the known</p>\
          <div class="formula-box">\
            $$\\widehat{\\mathrm{HFK}}(3_1) \\;=\\; \\mathbb{Z}_{(-1,-2)}\\, \\oplus\\, \\mathbb{Z}_{(0,-1)}\\, \\oplus\\, \\mathbb{Z}_{(1,0)} \\qquad (\\text{bigrading}\\ (s,m)),$$\
          </div>\
          <p>i.e.&nbsp;rank 3, supported in Alexander gradings \\(\\{-1, 0, 1\\}\\) and Maslov gradings\
          \\(\\{-2, -1, 0\\}\\). Note the top Alexander degree is \\(g(3_1) = 1\\) (genus one) with rank 1 &mdash;\
          reflecting that \\(3_1\\) is fibered.</p>\
          <p><strong>Why this matters.</strong> Grid homology is, as of today, the only version of any\
          knot homology theory admitting a fully combinatorial \\(\\partial^2 = 0\\) proof. It enabled direct\
          software implementations (HFKcalc, KnotKit, GridLink) and lifted knot Floer homology from an\
          analytic object to a hand-computable one.</p>\
          <details class="kl-example">\
            <summary>Warm-up: a \\(3 \\times 3\\) grid for the unknot</summary>\
            <p>Place \\(X\\)-markers at \\((1,1), (2,2), (3,3)\\) and \\(O\\)-markers at \\((1,2), (2,3), (3,1)\\)\
            on a \\(3 \\times 3\\) torus. This presents the unknot \\(U\\). (The trefoil has grid number \\(5\\);\
            a 3\u00d73 grid is the smallest possible and only presents the unknot.) There are \\(3! = 6\\) generators.\
            <div style="text-align:center;margin:0.8rem 0;">\
              <svg width="210" height="210" viewBox="0 0 210 210" xmlns="http://www.w3.org/2000/svg" aria-label="3 by 3 grid diagram for the unknot">\
                <rect x="15" y="15" width="180" height="180" fill="#fafafa" stroke="#222" stroke-width="1.6"/>\
                <line x1="75"  y1="15" x2="75"  y2="195" stroke="#888" stroke-width="1"/>\
                <line x1="135" y1="15" x2="135" y2="195" stroke="#888" stroke-width="1"/>\
                <line x1="15"  y1="75"  x2="195" y2="75"  stroke="#888" stroke-width="1"/>\
                <line x1="15"  y1="135" x2="195" y2="135" stroke="#888" stroke-width="1"/>\
                <text x="45"  y="8"  font-size="11" fill="#555" text-anchor="middle">1</text>\
                <text x="105" y="8"  font-size="11" fill="#555" text-anchor="middle">2</text>\
                <text x="165" y="8"  font-size="11" fill="#555" text-anchor="middle">3</text>\
                <text x="8"   y="49"  font-size="11" fill="#555" text-anchor="middle">1</text>\
                <text x="8"   y="109" font-size="11" fill="#555" text-anchor="middle">2</text>\
                <text x="8"   y="169" font-size="11" fill="#555" text-anchor="middle">3</text>\
                <!-- X markers at (col, row): (1,1) (2,2) (3,3).  Row index increases downward. -->\
                <text x="45"  y="55"  font-size="22" fill="#b84900" font-weight="700" text-anchor="middle">X</text>\
                <text x="105" y="115" font-size="22" fill="#b84900" font-weight="700" text-anchor="middle">X</text>\
                <text x="165" y="175" font-size="22" fill="#b84900" font-weight="700" text-anchor="middle">X</text>\
                <!-- O markers at (1,2) (2,3) (3,1) -->\
                <text x="45"  y="115" font-size="22" fill="#1a6aa5" font-weight="700" text-anchor="middle">O</text>\
                <text x="105" y="175" font-size="22" fill="#1a6aa5" font-weight="700" text-anchor="middle">O</text>\
                <text x="165" y="55"  font-size="22" fill="#1a6aa5" font-weight="700" text-anchor="middle">O</text>\
              </svg>\
              <div style="font-size:0.85rem;color:#555;">A 3\u00d73 toroidal grid presenting the unknot: one X and one O per row and per column. Connecting O\u2192X in each column vertically and X\u2192O in each row horizontally (with X overstrands) yields a single closed curve that resolves to the unknot after R1/R2 moves.</div>\
            </div>\
            After identifying empty rectangles that connect pairs of generators (there are exactly two\
            non-degenerate families up to the torus action), the differential reduces the\
            complex to a single surviving generator in Alexander grading \\(0\\), Maslov grading \\(0\\):</p>\
            <div class="formula-box">\
              $$\\widehat{\\mathrm{HFK}}(U) \\;\\cong\\; \\mathbb{Z}_{(0,0)}.$$\
            </div>\
            <p>This is already a non-trivial computation by hand, and illustrates how the\
            \\(n!\\) generators collapse through the rectangle count to recover the tiny expected answer.</p>\
          </details>\
        </div>\
        <div class="expo-panel">\
          <h3>8. Concordance invariants beyond \\(\\tau\\): \\(\\Upsilon\\), \\(\\nu^+\\), \\(\\varepsilon\\)</h3>\
          <p>The \\(\\tau\\) invariant (Panel 4) is only the first in a family of concordance invariants\
          extracted from the knot Floer complex\
          <span class="kl-term" title="CFK∞: the ℤ-filtered, ℤ-graded chain complex underlying knot Floer homology, free over 𝔽[U, U⁻¹] with two filtrations (algebraic and Alexander). The full stable-equivalence class of CFK∞ is a knot-concordance invariant and refines τ, Υ, ν⁺, ε.">\\(\\mathrm{CFK}^\\infty(K)\\)</span>.</p>\
          <h4>\\(\\Upsilon_K(t)\\): the Ozsv&aacute;th&ndash;Stipsicz&ndash;Szab&oacute; upsilon invariant</h4>\
          <p>For \\(t \\in [0, 2]\\), the\
          <span class="kl-term" title="Υ-invariant Υ_K(t) (Ozsváth–Stipsicz–Szabó 2017): a piecewise-linear concordance homomorphism from the smooth concordance group C to the space of PL functions on [0,2], defined from t-modified Alexander filtrations on CFK∞. Refines τ via Υ′_K(0⁺) = −τ(K).">\\(\\Upsilon\\)-invariant</span>\
          is defined from a one-parameter family of \\(t\\)-modified filtrations on \\(\\mathrm{CFK}^\\infty\\):</p>\
          <div class="formula-box">\
            $$\\Upsilon_K(t) \\;=\\; -\\max\\!\\Bigl\\{\\, s \\;:\\; \\mathcal{F}_s^{\\,t}\\,\\mathrm{CFK}^\\infty(K) \\longrightarrow \\widehat{\\mathrm{HF}}(S^3) = \\mathbb{Z}\\ \\text{is surjective} \\,\\Bigr\\}.$$\
          </div>\
          <p>Key properties:</p>\
          <ul>\
            <li>\\(\\Upsilon_K\\) is piecewise-linear on \\([0, 2]\\) with \\(\\Upsilon_K(0) = \\Upsilon_K(2) = 0\\).</li>\
            <li>4-genus bound: \\(\\,|\\Upsilon_K(t)| \\;\\leq\\; t\\,g_4(K)\\,\\) for \\(t \\in [0,1]\\).</li>\
            <li>\\(\\Upsilon\\) is a homomorphism from the smooth concordance group \\(\\mathcal{C}\\) to the PL\
            function space: \\(\\Upsilon_{K_1 \\# K_2} = \\Upsilon_{K_1} + \\Upsilon_{K_2}\\).</li>\
            <li>Derivative at 0 recovers \\(\\tau\\): \\(\\;\\Upsilon_K&rsquo;(0^+) = -\\tau(K)\\).</li>\
            <li>\\(\\Upsilon\\) distinguishes concordance classes that \\(\\tau\\) cannot &mdash; e.g.\
            the \\((2,3)\\)-cable of the trefoil vs. the \\((2,3)\\)-cable of the unknot share the same \\(\\tau\\)\
            but differ on some \\(\\Upsilon_K(t)\\).</li>\
          </ul>\
          <h4>\\(\\nu^+(K)\\): Hom&ndash;Wu&rsquo;s sharpened 4-genus bound</h4>\
          <p>The\
          <span class="kl-term" title="ν⁺(K) (Hom–Wu 2016): integer concordance invariant defined from the minus-flavour knot Floer complex CFK⁻ and the U-action, satisfying τ(K) ≤ ν⁺(K) ≤ g₄(K); often strictly sharper than τ as a 4-genus bound.">\\(\\nu^+\\)</span>-invariant\
          (Hom&ndash;Wu, 2016) is defined from\
          <span class="kl-term" title="CFK⁻: the &lsquo;minus&rsquo; flavour of the knot Floer complex, a free chain complex over 𝔽[U] whose U-action lowers Alexander grading by 1. Quotient by U gives ĈFK; inverting U gives CFK∞.">\\(\\mathrm{CFK}^-(K)\\)</span>\
          and the\
          <span class="kl-term" title="U-action: the action of the formal variable U on CFK⁻ (or CFK∞) coming from the Heegaard basepoint; lowers Maslov grading by 2 and Alexander grading by 1. Central to the definition of Heegaard Floer d-invariants, ν⁺, and the Υ construction.">\\(U\\)-action</span>. It satisfies</p>\
          <div class="formula-box">\
            $$\\tau(K) \\;\\leq\\; \\nu^+(K) \\;\\leq\\; g_4(K),$$\
          </div>\
          <p>and in many cases the inequalities are strict, giving a genuinely sharper lower bound on the\
          smooth 4-genus than \\(\\tau\\) alone.</p>\
          <h4>\\(\\varepsilon(K) \\in \\{-1, 0, +1\\}\\): Hom&rsquo;s epsilon invariant</h4>\
          <p>Hom (2014) introduced the\
          <span class="kl-term" title="ε-invariant ε(K) (Hom 2014): integer ∈ {−1, 0, +1} extracted from the stable-equivalence class of CFK∞ via a bordered-Floer analysis of cables. A complete invariant for staircase (thin) knots and determines the behaviour of τ under cabling.">\\(\\varepsilon\\)-invariant</span>,\
          a concordance invariant taking values in \\(\\{-1, 0, +1\\}\\), extracted from the\
          <span class="kl-term" title="Stable equivalence: the equivalence relation on filtered chain complexes generated by filtered chain homotopy equivalence and direct-sum with acyclic trivial complexes. The stable-equivalence class of CFK∞(K) is a concordance invariant and is the natural home of τ, Υ, ν⁺, ε.">stable-equivalence</span>\
          class of \\(\\mathrm{CFK}^\\infty(K)\\) &mdash; in fact it is a\
          <span class="kl-term" title="Hom invariant: the concordance homomorphism ε : 𝒞 → {−1, 0, +1}-valued monoid constructed by Hom (2014); together with τ it controls much of the behaviour of CFK∞ under connected sum and cabling.">complete invariant</span>\
          for &ldquo;staircase&rdquo; (thin) knots, i.e. knots whose \\(\\mathrm{CFK}^\\infty\\) has the simplest\
          possible shape. \\(\\varepsilon\\) determines exactly when the bound \\(|\\tau| \\leq g_4\\) is tight\
          after cabling, and is essential for computing \\(\\tau\\) of cables and satellites.</p>\
          <details class="kl-example">\
            <summary>A small table: \\(\\tau,\\ \\nu^+,\\ \\varepsilon,\\ \\Upsilon\\) for a few knots</summary>\
            <div class="formula-box">\
              $$\\begin{array}{|c|c|c|c|c|}\
                \\hline\
                K & \\tau(K) & \\nu^+(K) & \\varepsilon(K) & \\Upsilon_K(1) \\\\\
                \\hline\
                3_1 = T(2,3) & 1 & 1 & +1 & -1 \\\\\
                4_1 & 0 & 0 & 0 & 0 \\\\\
                5_2 & 1 & 1 & +1 & -1 \\\\\
                T(2,5) & 2 & 2 & +1 & -2 \\\\\
                \\hline\
              \\end{array}$$\
            </div>\
            <p>The thin knots \\(3_1, 4_1, 5_2\\) are fully controlled by \\((\\tau, \\varepsilon)\\); for\
            thicker knots one needs the full function \\(\\Upsilon_K(t)\\) to separate concordance classes.</p>\
          </details>\
        </div>\
        <div class="expo-panel">\
          <h3>9. Link Floer \\(\\widehat{\\mathrm{HFL}}\\) and bordered Floer</h3>\
          <h4>Link Floer homology</h4>\
          <p>Ozsv&aacute;th&ndash;Szab&oacute; (2008) extended knot Floer homology to oriented multi-component\
          links: the\
          <span class="kl-term" title="Link Floer homology HFL (Ozsváth–Szabó 2008): a multi-graded homology theory assigning to an oriented n-component link L ⊂ S³ a finitely-generated abelian group ĤFL(L) whose graded Euler characteristic is (up to a normalization factor) the multivariable Alexander polynomial Δ_L(t₁,…,t_n).">link Floer homology</span>\
          \\(\\widehat{\\mathrm{HFL}}(L)\\) is a multi-graded abelian group with Alexander grading indexed by\
          (classes of) Seifert surfaces for each component. Its graded Euler characteristic categorifies\
          the\
          <span class="kl-term" title="Multivariable Alexander polynomial Δ_L(t₁,…,t_n): a polynomial invariant of an oriented n-component link L ⊂ S³, generalizing the single-variable Alexander polynomial and defined via the Alexander module of the universal abelian cover of the link complement. Graded Euler characteristic of ĤFL.">multivariable Alexander polynomial</span>:</p>\
          <div class="formula-box">\
            $$\\chi\\!\\bigl(\\widehat{\\mathrm{HFL}}(L)\\bigr) \\;\\doteq\\; \\Delta_L(t_1, \\ldots, t_n)\\, \\prod_{i=1}^{n}\\bigl(t_i^{1/2} - t_i^{-1/2}\\bigr)^{\\,\\varepsilon_n},$$\
          </div>\
          <p>with a normalization factor \\(\\varepsilon_n\\) depending on conventions (commonly\
          \\(\\varepsilon_n = 1\\) for \\(n \\geq 2\\) and absorbed for \\(n = 1\\) to recover the knot case).\
          As with HFK, the full homology detects link-theoretic data (Thurston norm, fiberedness of\
          multi-component fibrations) far beyond what \\(\\Delta_L\\) alone can see.</p>\
          <h4>Bordered Heegaard Floer homology</h4>\
          <p>Lipshitz&ndash;Ozsv&aacute;th&ndash;Thurston (2018) built a full\
          <span class="kl-term" title="Bordered Floer homology (Lipshitz–Ozsváth–Thurston 2018): an extension of Heegaard Floer homology to 3-manifolds with parametrized boundary, packaged as A∞-modules and type-D structures over a differential graded (or A∞) algebra 𝒜(F) of the boundary surface F. Gluing is via A∞ tensor product.">bordered Floer package</span>\
          that turns HF̂ into a cut-and-paste theory for 3-manifolds with boundary. The structure is:</p>\
          <ul>\
            <li>To each parametrized surface \\(F\\), assign an\
            <span class="kl-term" title="A∞-algebra: an algebra A with higher multiplications μ_n : A^{⊗n} → A of degree 2−n satisfying quadratic A∞-relations; generalizes dg-algebras (where μ_n = 0 for n ≥ 3). The natural algebraic setting for bordered Floer homology of surfaces.">\\(A_\\infty\\)-algebra</span>\
            \\(\\mathcal{A}(F)\\). For the torus boundary one obtains a specific small DG algebra\
            <span class="kl-term" title="Torus algebra 𝒜(T²) (bordered Floer): the specific associative DG algebra (in fact a finite-dimensional A∞-algebra) that bordered Heegaard Floer homology assigns to a genus-1 parametrized surface. Generators correspond to matched Reeb chords on the pointed matched circle; used to compute τ, ε, Υ of cables.">\\(\\mathcal{A}(T^2)\\)</span>.</li>\
            <li>To a bordered 3-manifold \\(Y\\) with \\(\\partial Y = F\\), assign an\
            \\(A_\\infty\\)-module \\(\\widehat{\\mathrm{CFA}}(Y)\\) over \\(\\mathcal{A}(F)\\) and a\
            <span class="kl-term" title="Type-D module / structure (bordered Floer): a left module ĈFD(Y) over 𝒜(F) encoded as a chain complex with a structure map δ₁ : X → 𝒜 ⊗ X satisfying a quadratic compatibility; equivalent to a curved A∞-module structure. One half of the bordered Floer package.">type-D module</span>\
            \\(\\widehat{\\mathrm{CFD}}(Y)\\).</li>\
            <li>Decomposition \\(Y = Y_1 \\cup_F Y_2\\) recovers the closed invariant via the\
            <span class="kl-term" title="Pairing theorem (Lipshitz–Ozsváth–Thurston): for Y = Y₁ ∪_F Y₂, ĈF(Y) ≃ ĈFA(Y₁) ⊗_{𝒜(F)} ĈFD(Y₂) (A∞-tensor / box tensor). Reduces Heegaard Floer computations to gluing of bordered pieces.">pairing theorem</span>:</li>\
          </ul>\
          <div class="formula-box">\
            $$\\widehat{\\mathrm{CF}}(Y) \\;\\simeq\\; \\widehat{\\mathrm{CFA}}(Y_1) \\,\\boxtimes_{\\mathcal{A}(F)}\\, \\widehat{\\mathrm{CFD}}(Y_2).$$\
          </div>\
          <p>Applied to knot complements (bordered by a torus), bordered Floer enables explicit\
          computations of \\(\\tau\\), \\(\\varepsilon\\), and \\(\\Upsilon\\) for <em>cables and satellites</em> &mdash;\
          Hom&rsquo;s 2014 formula for \\(\\tau(K_{p,q})\\) in terms of \\(\\tau(K), \\varepsilon(K), p, q\\) is the\
          prototype application.</p>\
          <p><em>Cross-reference.</em> The bordered package also supplies the algebraic foundation for\
          Szab&oacute;&rsquo;s 2015 combinatorial differential on the cube of resolutions &mdash; see the\
          <em>Spectral Sequences</em> sub-tab, Ozsv&aacute;th&ndash;Szab&oacute; panel, where the\
          Khovanov\\(\\,\\to\\,\\)HF̂ spectral sequence is discussed.</p>\
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
        </div>\
        <div class="expo-panel">\
          <h3>MOY Calculus: The Decategorified Skeleton</h3>\
          <p>Before categorifying, one needs a clean diagrammatic model of the\
          \\(\\mathfrak{sl}(N)\\) <em>quantum polynomial</em> itself. Murakami, Ohtsuki and Yamada (1998)\
          gave exactly this: a state-sum on colored <span class="kl-term" title="Trivalent graph: a planar graph whose vertices all have degree 3. In MOY calculus, edges are labeled by positive integers (representations of U_q(sl_N)) and vertices encode projections V_a ⊗ V_b → V_{a+b} and their duals.">trivalent graphs</span>\
          whose vertices are projections between tensor products of fundamental representations.</p>\
          <p><strong>Rules.</strong> Edges are labeled by positive integers \\(a \\in \\{1, \\ldots, N-1\\}\\) (the\
          exterior powers \\(\\Lambda^a V\\) of the defining representation \\(V = \\mathbb{C}^N\\) of\
          \\(U_q(\\mathfrak{sl}_N)\\)). A trivalent vertex joins edges of labels \\((a, b, a+b)\\) and encodes\
          the projection \\(\\Lambda^a V \\otimes \\Lambda^b V \\twoheadrightarrow \\Lambda^{a+b} V\\) or its\
          dual. Closed <span class="kl-term" title="MOY state: a labeled (oriented, trivalent) closed planar graph appearing as a resolution of a link diagram in MOY calculus. Each MOY state evaluates to a rational function in q via the local MOY relations (circle, digon, square).">MOY state</span>s evaluate via local relations involving\
          <span class="kl-term" title="Quantum integer [k] = (q^k − q^{−k})/(q − q^{−1}); evaluates to k at q = 1, appears as the quantum dimension of representations of U_q(sl_N) and as the loop-value in MOY calculus.">quantum integers</span>\
          \\([k] = (q^k - q^{-k})/(q - q^{-1})\\).</p>\
          <div class="formula-box">\
            $$\\langle \\bigcirc_a \\rangle \\;=\\; \\binom{N}{a}_{\\!q}, \\qquad\
            \\langle \\text{digon}(a,b) \\rangle \\;=\\; \\binom{N - a}{b}_{\\!q}\\,\\langle\\,\\cdot\\,\\rangle,$$\
          </div>\
          <p>and the <strong>square relation</strong> writes a 4-valent &ldquo;square&rdquo; state as a\
          \\(q\\)-weighted sum of its two planar resolutions (&ldquo;I&rdquo; and &ldquo;H&rdquo;).</p>\
          <p><strong>Crossings.</strong> Each crossing in an oriented link diagram is resolved as a\
          \\(q\\)-linear combination of two MOY states:</p>\
          <div class="formula-box">\
            $$\\bigl\\langle \\raisebox{-1pt}{\\(\\times\\)} \\bigr\\rangle \\;=\\; q^{\\,1/N}\\bigl\\langle \\mathrm{I} \\bigr\\rangle \\;-\\; q^{-1 + 1/N}\\bigl\\langle \\mathrm{H} \\bigr\\rangle,$$\
          </div>\
          <p>(with the inverse for the opposite crossing), the \\(q^{1/N}\\) normalization ensuring framing\
          invariance. Summing over all crossings and evaluating with the circle/digon/square rules gives\
          the <strong>quantum \\(\\mathfrak{sl}(N)\\) polynomial</strong> \\(P_N(K; q)\\), i.e.&nbsp;the\
          specialization of HOMFLY at \\(a = q^N\\). MOY calculus is the decategorified skeleton of\
          Khovanov&ndash;Rozansky homology: replace each MOY state by a graded vector space, and each local\
          relation becomes a <em>categorical</em> decomposition.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Matrix Factorizations: Building KR from the MOY Skeleton</h3>\
          <p>Khovanov&ndash;Rozansky (2008) upgrade MOY calculus to a chain complex by assigning, to each\
          edge of a MOY graph, a <span class="kl-term" title="Matrix factorization of a potential W in a ring R: a ℤ/2-graded free R-module P = P⁰ ⊕ P¹ with an odd map d : P → P such that d² = W · id. The homotopy category of MFs is a triangulated category; for isolated singularities it is equivalent to the singularity category of R/(W).">matrix factorization</span>\
          of a fixed <span class="kl-term" title="Potential: the polynomial W in a matrix factorization d² = W · id. For KR sl(N) homology, W is a sum of terms x_i^{N+1} over edge-endpoint variables; its critical locus governs the homological behavior.">potential</span> \\(W\\).</p>\
          <p><strong>Definition.</strong> A matrix factorization of \\(W \\in R\\) is a pair of free\
          \\(R\\)-modules \\(P^0, P^1\\) with maps\
          \\(d^0 : P^0 \\to P^1\\) and \\(d^1 : P^1 \\to P^0\\) satisfying</p>\
          <div class="formula-box">\
            $$d^1 \\circ d^0 \\;=\\; W \\cdot \\mathrm{id}_{P^0}, \\qquad d^0 \\circ d^1 \\;=\\; W \\cdot \\mathrm{id}_{P^1}.$$\
          </div>\
          <p>Equivalently, a &#8484;/2-graded module with an odd endomorphism \\(d\\) satisfying \\(d^2 = W \\cdot \\mathrm{id}\\).\
          When \\(W\\) has isolated singularities, the homotopy category of matrix factorizations is\
          equivalent (Orlov) to the singularity category of the hypersurface \\(\\{W = 0\\}\\) &mdash; the\
          <span class="kl-term" title="Jacobi algebra of a potential W: Jac(W) = R/(∂_i W); for W = x^{N+1} over one variable this is ℂ[x]/(x^N), the cohomology of ℂℙ^{N−1}. Appears as the Hochschild-type invariant of the corresponding matrix factorization.">Jacobi algebra</span>\
          \\(\\mathrm{Jac}(W) = R/(\\partial_i W)\\) is the key invariant.</p>\
          <p><strong>KR setup.</strong> For sl\\((N)\\) homology the potential is\
          \\(W = \\sum_e x_e^{N+1}\\) summed over the endpoint variables of each MOY edge\
          (for each vertex, one instead uses \\(W = x_1^{N+1} + x_2^{N+1} - x_3^{N+1}\\) with appropriate\
          signs from edge orientations). To each MOY edge one associates the &ldquo;Koszul-type&rdquo;\
          matrix factorization\
          \\(P = \\{R \\xrightarrow{\\pi} R \\xrightarrow{x^{N+1}/\\pi} R\\}\\) for a chosen factorization\
          \\(\\pi\\) of \\(x^{N+1}\\). Each MOY crossing then becomes a cone between the two resolution\
          matrix factorizations (&ldquo;I&rdquo; and &ldquo;H&rdquo;), producing a chain complex of matrix\
          factorizations whose total cohomology is\
          \\(\\mathrm{KR}_N(K)\\). The graded Euler characteristic collapses the category back to the MOY\
          polynomial \\(P_N(K; q)\\) &mdash; categorification in action.</p>\
          <p><strong>The \\(N \\to \\infty\\) limit: triply-graded HOMFLY homology.</strong> The stable limit\
          of the KR construction replaces matrix factorizations by\
          <span class="kl-term" title="Soergel bimodule: a summand of tensor products of R ⊗_{R^{s_i}} R over a polynomial ring R = ℂ[x_1,…,x_n], where s_i are simple reflections. Soergel (2007) proved these categorify the Hecke algebra; their homotopy category contains the Rouquier complexes that categorify braids.">Soergel bimodule</span>\
          Rouquier complexes, and Hochschild homology replaces the matrix-factorization cohomology. The\
          output is the <span class="kl-term" title="Triply-graded HOMFLY homology HHH(K): Khovanov&rsquo;s categorification (2007) of the HOMFLY-PT polynomial, via Hochschild homology of the Rouquier complex of a braid whose closure is K, in the category of Soergel bimodules. Bears three gradings (homological, q-grading, and Hochschild/a-grading).">triply-graded HOMFLY homology</span>\
          \\(\\mathrm{HHH}(K)\\) (Khovanov 2007, Khovanov&ndash;Rozansky 2008):</p>\
          <div class="formula-box">\
            $$\\mathrm{HHH}(K) \\;=\\; \\mathrm{HH}_*\\bigl(\\mathrm{Rouquier}(\\beta)\\bigr), \\qquad \\hat\\beta = K,$$\
          </div>\
          <p>with three independent gradings (homological, \\(q\\)-grading, Hochschild / \\(a\\)-grading)\
          whose graded Euler characteristic is the HOMFLY-PT polynomial \\(P_K(a, q)\\). Rasmussen&rsquo;s\
          spectral sequences \\(\\mathrm{HHH}(K) \\Rightarrow \\mathrm{KR}_N(K)\\), driven by differentials\
          \\(d_N\\) coming from the potential \\(W = x^{N+1}\\), collapse the Hochschild grading for each\
          fixed finite \\(N\\) and recover the sl\\((N)\\) homology; see the Spectral Sequences sub-tab.</p>\
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
          <details class="kl-proof">\
            <summary>Proof sketch: \\(\\mathrm{Kh}_{\\mathrm{Lee}}(K) \\cong \\mathbb{Q}^2\\)</summary>\
            <p>Sketch. Lee&rsquo;s deformed Frobenius algebra over \\(\\mathbb{Q}\\) has comultiplication\
            \\(\\Delta(1) = 1 \\otimes x + x \\otimes 1\\) and \\(\\Delta(x) = x \\otimes x + 1 \\otimes 1\\). The element\
            \\(1\\) is no longer nilpotent: the change of basis \\(\\mathbf{a} = x\\), \\(\\mathbf{b} = 1 - x\\)\
            diagonalises the algebra as \\(\\mathbb{Q}\\mathbf{a} \\oplus \\mathbb{Q}\\mathbf{b}\\), two copies of\
            \\(\\mathbb{Q}\\) with orthogonal idempotents.</p>\
            <p>On an \\(n\\)-crossing diagram, each complete resolution is a disjoint union of circles, so its\
            Lee chain group splits as a tensor of \\(\\mathbb{Q}\\mathbf{a} \\oplus \\mathbb{Q}\\mathbf{b}\\) factors.\
            Lee shows the homology is supported on the <em>oriented resolution</em>: label each Seifert circle\
            by \\(\\mathbf{a}\\) or \\(\\mathbf{b}\\) according to a canonical orientation rule, producing two\
            generators \\(\\mathfrak{s}_+, \\mathfrak{s}_-\\). A direct computation shows all other contributions\
            cancel, leaving \\(\\mathrm{Kh}_{\\mathrm{Lee}}(K) \\cong \\mathbb{Q}^2\\). The \\(q\\)-filtration degrees\
            of \\(\\mathfrak{s}_\\pm\\) are \\(s(K) \\pm 1\\) by definition.</p>\
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
          <h3>Ozsv&aacute;th&ndash;Szab&oacute; Branched-Cover Spectral Sequence (full depth)</h3>\
          <p>Ozsv&aacute;th&ndash;Szab&oacute; (2005, math/0309170): for a link \\(L \\subset S^3\\), the reduced\
          Khovanov homology of the mirror \\(\\overline{L}\\) carries a spectral sequence converging to the\
          Heegaard Floer homology of the\
          <span class="kl-term" title="Double branched cover Σ(L): the closed 3-manifold obtained as the double cover of S³ branched along the link L. Classical construction; turns link invariants of L into 3-manifold invariants of Σ(L).">double branched cover</span>\
          \\(\\Sigma(L)\\):</p>\
          <div class="formula-box">$$E_2 \\;=\\; \\widetilde{\\mathrm{Kh}}\\bigl(\\overline{L}; \\mathbb{F}_2\\bigr) \\;\\Longrightarrow\\; E_\\infty \\;=\\; \\widehat{HF}\\bigl(-\\Sigma(L); \\mathbb{F}_2\\bigr).$$</div>\
          <p><strong>Construction (sketch).</strong> A diagram with \\(n\\) crossings gives a\
          <span class="kl-term" title="Cube of resolutions: the 2^n-vertex cube whose vertices are the complete resolutions of a link diagram (0- and 1-smoothings at each crossing) and whose edges are crossing-change cobordisms. The Khovanov complex arises by applying a TQFT-like functor to this cube.">cube of resolutions</span>\
          \\(\\{0,1\\}^n\\). Applying the branched-cover construction vertex-by-vertex produces a cube of 3-manifolds\
          (each an \\(L\\)-space of some lens-space type for the all-0 and all-1 resolutions) linked by two-handle\
          cobordisms. Ozsv&aacute;th&ndash;Szab&oacute;&rsquo;s <em>link surgery formula</em> turns this cube into a filtered\
          complex in Heegaard Floer theory; the associated spectral sequence has \\(E_2\\) identified with reduced\
          Khovanov homology of the mirror. Baldwin (2011, arXiv:0809.3293) subsequently proved that <em>every</em>\
          page \\(E_k\\), \\(k \\ge 2\\), is itself an invariant of \\(L\\) &mdash; not merely the abutment.</p>\
          <p><strong>Szab&oacute;&rsquo;s geometric differentials (2015, arXiv:1010.4252).</strong> The higher differentials\
          \\(d_r\\), \\(r \\ge 2\\), had originally been defined only up to naturality statements via holomorphic-disk\
          counts. Szab&oacute; gave a <em>purely combinatorial</em>, diagrammatic definition of a family\
          \\(\\{d_r^{\\mathrm{Sz}}\\}\\) on the Khovanov cube via configurations of decorated arcs:</p>\
          <ul>\
            <li>\\(d_1\\) is the ordinary Khovanov differential on \\(\\widetilde{CKh}(\\overline{L})\\);</li>\
            <li>\\(d_2\\) counts certain &ldquo;resolution configurations&rdquo; &mdash; pairs of arcs joining active circles in a resolved diagram &mdash; with coefficients in \\(\\mathbb{F}_2\\);</li>\
            <li>\\(d_r\\), \\(r \\ge 3\\), counts configurations of \\(r\\) arcs satisfying explicit compatibility (passive-circle / dual-graph) conditions.</li>\
          </ul>\
          <p>The total map \\(D = d_1 + d_2 + \\cdots\\) squares to zero, and its homology over \\(\\mathbb{F}_2\\) is\
          conjecturally isomorphic to \\(\\widehat{HF}(-\\Sigma(L))\\); this has been verified for all links up to\
          12 crossings and proved in broad families.</p>\
          <details class="kl-example">\
            <summary>Worked example: the trefoil \\(3_1\\)</summary>\
            <p>For the right-handed trefoil \\(L = 3_1\\), reduced Khovanov homology over \\(\\mathbb{F}_2\\) has\
            total rank \\(3\\): generators in bigradings \\((0,2), (2,5), (3,7)\\) (mirror conventions adjusted).\
            The double branched cover is the lens space \\(\\Sigma(3_1) = L(3,1)\\), and\
            \\(\\widehat{HF}(L(3,1); \\mathbb{F}_2) \\cong \\mathbb{F}_2^{|H_1|} = \\mathbb{F}_2^3\\) since lens\
            spaces are <span class="kl-term" title="L-space: a rational homology 3-sphere Y with rk ĤF(Y) = |H_1(Y;Z)|, the minimum possible. Lens spaces, Seifert-fibered spaces with no horizontal foliation, and double branched covers of quasi-alternating links are all L-spaces.">L-spaces</span>.\
            The spectral sequence has \\(E_2 = \\mathbb{F}_2^3 = E_\\infty\\): it <em>collapses at \\(E_2\\)</em>. This is a\
            general phenomenon for <span class="kl-term" title="Quasi-alternating link: smallest class of links containing the unknot and closed under a skein-type recursion with nondegenerate determinant. Introduced by Ozsváth-Szabó; their double branched covers are L-spaces and their reduced Khovanov homology is thin.">quasi-alternating</span>\
            links (which include all alternating links): ranks agree on the nose, no higher differentials.</p>\
          </details>\
          <details class="kl-example">\
            <summary>Worked example: the figure-eight \\(4_1\\)</summary>\
            <p>The figure-eight is amphichiral and alternating, so \\(\\overline{4_1} = 4_1\\). Reduced Khovanov\
            homology has total \\(\\mathbb{F}_2\\)-rank \\(5\\), concentrated on a thin diagonal. The double branched\
            cover is \\(\\Sigma(4_1) = L(5,2)\\), again a lens space, and\
            \\(\\widehat{HF}(L(5,2); \\mathbb{F}_2) = \\mathbb{F}_2^5\\). The spectral sequence again collapses at\
            \\(E_2\\): \\(5 = 5\\). These small cases illustrate a theorem of Ozsv&aacute;th&ndash;Szab&oacute;: for\
            quasi-alternating \\(L\\), \\(\\operatorname{rk} \\widetilde{\\mathrm{Kh}}(L) = |\\det(L)| = \\operatorname{rk}\\widehat{HF}(\\Sigma(L))\\),\
            forcing \\(E_2 = E_\\infty\\). The first examples where strict inequality occurs (so \\(d_r \\ne 0\\)\
            for some \\(r \\ge 2\\)) are non-quasi-alternating knots such as the \\((3,5,7)\\)-pretzel.</p>\
          </details>\
          <details class="kl-proof">\
            <summary>Bloom&rsquo;s monopole analogue (2011, arXiv:0909.0816)</summary>\
            <p>Bloom constructed an analogous spectral sequence with target the monopole (Seiberg&ndash;Witten)\
            Floer homology of \\(\\Sigma(L)\\):\
            \\(\\;\\widetilde{\\mathrm{Kh}}(\\overline{L}) \\Longrightarrow \\widehat{HM}(\\Sigma(L))\\).\
            Via Kutluhan&ndash;Lee&ndash;Taubes / Colin&ndash;Ghiggini&ndash;Honda equivalence of monopole and Heegaard\
            Floer homology, this is consistent with the Ozsv&aacute;th&ndash;Szab&oacute; sequence, but is built from\
            a genuinely different (gauge-theoretic) surgery formula, and Bloom proves that the pages \\(E_k\\) for\
            \\(k \\ge 2\\) depend only on the <em>mutation equivalence class</em> of \\(L\\) &mdash; giving the first\
            strong evidence that the whole tower is mutation-invariant.</p>\
          </details>\
          <p><em>Cross-ref:</em> see the Knot Floer Homology sub-tab for the definition of \\(\\widehat{HF}\\) and its relatives.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>What Khovanov Sees vs What Knot Floer Sees</h3>\
          <p>Both \\(\\mathrm{Kh}(K)\\) and \\(\\widehat{HFK}(K)\\) categorify classical polynomials, but they\
          see the knot through very different lenses. The following table summarises the structural contrast;\
          entries are well-established theorems unless explicitly flagged &ldquo;conjectural&rdquo;.</p>\
          <table class="kl-table">\
            <thead>\
              <tr><th>Feature</th><th>Khovanov homology \\(\\mathrm{Kh}(K)\\)</th><th>Knot Floer homology \\(\\widehat{HFK}(K)\\)</th></tr>\
            </thead>\
            <tbody>\
              <tr>\
                <td>Bigrading</td>\
                <td><span class="kl-term" title="Quantum grading q: the internal grading on Khovanov chain groups coming from the q-graded TQFT structure; categorifies the q-variable of the Jones polynomial.">quantum \\(q\\)</span> and <span class="kl-term" title="Homological grading i: the cohomological grading along the cube of resolutions in the Khovanov complex.">homological \\(i\\)</span></td>\
                <td><span class="kl-term" title="Alexander grading A: grading on ĤFK coming from the relative Spin^c structure on the knot complement; categorifies the exponent in the Alexander polynomial.">Alexander \\(A\\)</span> and <span class="kl-term" title="Maslov grading M: the absolute Z-grading on ĤFK coming from the Maslov index of holomorphic disks; categorifies the homological variable.">Maslov \\(M\\)</span></td>\
              </tr>\
              <tr>\
                <td>Categorifies</td>\
                <td>Jones polynomial: \\(\\chi_q(\\mathrm{Kh}(K)) = (q + q^{-1}) V_K(q^2)\\)</td>\
                <td>Alexander polynomial: \\(\\chi_A(\\widehat{HFK}(K)) = \\Delta_K(t)\\)</td>\
              </tr>\
              <tr>\
                <td>Mirror</td>\
                <td>\\(\\mathrm{Kh}^{i,j}(\\overline{K}) \\cong \\mathrm{Kh}^{-i,-j}(K)^\\vee\\)</td>\
                <td>\\(\\widehat{HFK}_m(\\overline{K}, a) \\cong \\widehat{HFK}^{m-2a}(K, -a)\\) (dual)</td>\
              </tr>\
              <tr>\
                <td>Reverse (orientation)</td>\
                <td>invariant for knots; for links depends on component orientations</td>\
                <td>invariant; \\(\\widehat{HFK}\\) does not distinguish \\(K\\) from \\(K^{\\mathrm{rev}}\\) (known)</td>\
              </tr>\
              <tr>\
                <td>Concordance invariant</td>\
                <td>\\(s(K) \\in 2\\mathbb{Z}\\) (Rasmussen), \\(|s| \\le 2 g_4\\)</td>\
                <td>\\(\\tau(K) \\in \\mathbb{Z}\\) (Ozsv&aacute;th&ndash;Szab&oacute;), \\(|\\tau| \\le g_4\\)</td>\
              </tr>\
              <tr>\
                <td>Detection: unknot</td>\
                <td>yes (Kronheimer&ndash;Mrowka 2011, via instantons)</td>\
                <td>yes (Ozsv&aacute;th&ndash;Szab&oacute; 2004, from \\(g(K) = 0 \\Leftrightarrow \\widehat{HFK} = \\mathbb{Z}\\))</td>\
              </tr>\
              <tr>\
                <td>Detection: trefoils, figure-eight</td>\
                <td>yes, trefoils (Baldwin&ndash;Sivek), figure-eight (Baldwin&ndash;Dowlin&ndash;Levine&ndash;Sivek 2021)</td>\
                <td>yes (same authors / earlier arguments using fiberedness)</td>\
              </tr>\
              <tr>\
                <td>Detection: Hopf link</td>\
                <td>yes (Baldwin&ndash;Sivek 2020 for \\(T(2,2)\\))</td>\
                <td>yes</td>\
              </tr>\
              <tr>\
                <td>Detection: Seifert genus</td>\
                <td>not known to detect \\(g(K)\\)</td>\
                <td><strong>yes</strong>: \\(g(K) = \\max\\{\\,a : \\widehat{HFK}(K,a) \\ne 0\\,\\}\\) (Ozsv&aacute;th&ndash;Szab&oacute;)</td>\
              </tr>\
              <tr>\
                <td>Detection: fiberedness</td>\
                <td>not known to detect</td>\
                <td><strong>yes</strong>: \\(K\\) fibered \\(\\Leftrightarrow \\widehat{HFK}(K, g(K)) \\cong \\mathbb{Z}\\) (Ni 2007)</td>\
              </tr>\
              <tr>\
                <td>Computational complexity</td>\
                <td>exponential in crossing number (cube of \\(2^n\\) resolutions); polynomial-time hard but fast in practice via Bar-Natan&rsquo;s scanning algorithm; computed to \\(\\sim 20\\) crossings</td>\
                <td>no combinatorial definition until grid homology (Manolescu&ndash;Ozsv&aacute;th&ndash;Sarkar 2009); grid complexes are very large but polynomial-space; bordered Floer gives efficient algorithms</td>\
              </tr>\
              <tr>\
                <td>Gauge-theoretic cousin</td>\
                <td>instanton \\(I^\\natural\\) via Kronheimer&ndash;Mrowka spectral sequence</td>\
                <td>monopole \\(\\widehat{HM}\\) via Kutluhan&ndash;Lee&ndash;Taubes (isomorphism, not spectral sequence)</td>\
              </tr>\
              <tr>\
                <td>Categorification target</td>\
                <td>Jones / quantum \\(\\mathfrak{sl}_2\\) representation theory</td>\
                <td>Heegaard Floer / symplectic geometry of symmetric products</td>\
              </tr>\
            </tbody>\
          </table>\
          <p><strong>A striking asymmetry.</strong> Knot Floer homology <em>detects</em> both the Seifert genus and\
          fiberedness outright; Khovanov homology detects neither directly, but compensates by detecting the\
          smooth slice genus only up to the factor of 2 inherent in \\(|s| \\le 2g_4\\), and by supplying\
          the combinatorial proof of the Milnor conjecture. The philosophical reading &mdash; made precise below &mdash;\
          is that Khovanov homology is a <em>shadow along one direction</em> of a larger triply-graded theory,\
          while knot Floer is the shadow along a different (transverse) direction.</p>\
        </div>\
        <div class="expo-panel">\
          <h3>Conjectural Unification: Both Are Shadows of HHH</h3>\
          <p>The central organising conjecture of modern categorified knot theory, due to\
          <span class="kl-term" title="Dunfield–Gukov–Rasmussen 2006 (math/0505662): proposed a triply-graded knot homology unifying all sl(N) Khovanov–Rozansky homologies and knot Floer homology via families of anticommuting differentials d_N (N ≥ 1) and d_0.">Dunfield&ndash;Gukov&ndash;Rasmussen (2006)</span>,\
          posits a single <em>triply-graded</em> homology theory from which both Khovanov and knot Floer\
          homology descend as spectral-sequence collapses. Let</p>\
          <div class="formula-box">$$\\mathcal{H}(K) \\;=\\; \\mathrm{HHH}(K) \\;=\\; \\bigoplus_{i,j,k} \\mathcal{H}^{i,j,k}(K)$$</div>\
          <p>denote the <span class="kl-term" title="Triply-graded Khovanov–Rozansky homology HHH: the Hochschild homology of Hochschild homology (hence &lsquo;HHH&rsquo;) of the Rouquier complex of Soergel bimodules associated to a braid closure. Triply graded; categorifies the HOMFLY-PT polynomial. Computed in closed form for torus links by Hogancamp–Mellit and Elias–Hogancamp.">triply-graded Khovanov&ndash;Rozansky (HHH) homology</span> &mdash;\
          obtained as Hochschild homology of the Hochschild homology of the\
          <span class="kl-term" title="Rouquier complex: a complex of Soergel bimodules associated to a braid word, with homotopy type an invariant of the braid. Introduced by Rouquier (math/0409593) as a categorification of the braid group; Khovanov&rsquo;s 2007 observation that its Hochschild homology gives the triply graded HOMFLY homology.">Rouquier complex</span>\
          of Soergel bimodules for a braid representative (Khovanov 2007). Its graded Euler characteristic is the\
          <span class="kl-term" title="HOMFLY-PT polynomial: two-variable generalization of the Jones and Alexander polynomials (Freyd–Yetter–Hoste–Lickorish–Millett–Ocneanu 1985; Przytycki–Traczyk 1987). Specializations at specific values of a recover Jones (a = q^2) and, after suitable substitutions, the Alexander polynomial.">HOMFLY-PT polynomial</span>\
          \\(P_K(a, q)\\).</p>\
          <p><strong>The DGR conjectural picture.</strong> \\(\\mathrm{HHH}(K)\\) carries a family of\
          <em>anticommuting</em> differentials \\(\\{d_N\\}_{N \\in \\mathbb{Z}}\\) of tridegrees determined by \\(N\\),\
          with the following properties:</p>\
          <ul>\
            <li>For \\(N \\ge 1\\): the homology \\(H(\\mathrm{HHH}(K), d_N)\\) is isomorphic to\
                \\(\\mathfrak{sl}(N)\\) Khovanov&ndash;Rozansky homology \\(\\mathrm{KR}_N(K)\\). In particular\
                \\(d_2\\) recovers ordinary Khovanov homology \\(\\mathrm{Kh}(K)\\).</li>\
            <li>For \\(N = 0\\): the differential \\(d_0\\) gives\
                \\(H(\\mathrm{HHH}(K), d_0) \\cong \\widehat{HFK}(K)\\). This is the conjectural bridge\
                from HHH to <span class="kl-term" title="Knot Floer homology ĤFK: bigraded homology theory categorifying the Alexander polynomial; defined by Ozsváth-Szabó and independently Rasmussen.">knot Floer homology</span>.</li>\
            <li>A further differential \\(d_{-N}\\) (Gukov&ndash;Stosic 2012) gives <em>mirror</em> \\(\\mathfrak{sl}(N)\\) homology,\
                encoding the functoriality under \\(K \\leftrightarrow \\overline{K}\\).</li>\
          </ul>\
          <p>The\
          <span class="kl-term" title="Superpolynomial P(a, q, t): the triply graded Poincaré polynomial of HHH(K), conjectured by Dunfield–Gukov–Rasmussen to unify the sl(N) Khovanov–Rozansky and knot Floer Poincaré polynomials.">superpolynomial</span>\
          \\(\\mathcal{P}_K(a, q, t) = \\sum_{i,j,k} t^i a^j q^k \\dim \\mathcal{H}^{i,j,k}(K)\\)\
          thus encodes the Poincar&eacute; polynomials of \\(\\mathrm{Kh}\\), every \\(\\mathrm{KR}_N\\), and \\(\\widehat{HFK}\\)\
          as collapses onto appropriate slices.</p>\
          <p><strong>Status of the conjectures.</strong> As of 2026 the situation is nuanced and worth stating carefully:</p>\
          <ul>\
            <li>The differentials \\(d_N\\) (\\(N \\ge 1\\)) on HHH, and the isomorphism\
                \\(H(\\mathrm{HHH}, d_N) \\cong \\mathrm{KR}_N\\), were constructed rigorously by Rasmussen (2006, arXiv:math/0607544);\
                the \\(N \\ge 1\\) side of DGR is a <em>theorem</em>.</li>\
            <li>The conjectural \\(d_0\\) identifying \\(H(\\mathrm{HHH}, d_0)\\) with \\(\\widehat{HFK}\\)\
                <strong>remains open in full generality</strong>. It is verified for two-bridge knots, small\
                torus knots, and knots with at most \\(\\sim 10\\) crossings by computer calculation, and it is\
                supported by matching of ranks and superpolynomials in all known examples.</li>\
            <li>Gukov&ndash;Stosic (2012, arXiv:1112.0030) extended the framework to\
                <span class="kl-term" title="Colored HOMFLY homology: categorification of colored HOMFLY-PT polynomial, where the knot is decorated with a Young diagram (or representation of sl(N)). Triply graded for each color; conjecturally forms a tower indexed by partitions.">colored HOMFLY homology</span>\
                \\(\\mathcal{H}_\\lambda(K)\\) indexed by partitions \\(\\lambda\\), with colored differentials and a\
                refined (quadruply-graded) superpolynomial; this is the closest framework to physical\
                BPS-state counts.</li>\
            <li>The explicit computation of \\(\\mathrm{HHH}\\) for torus links was achieved by\
                Hogancamp&ndash;Mellit (2019, arXiv:1909.00418) and Elias&ndash;Hogancamp (2019, arXiv:1603.00407),\
                verifying the Gorsky&ndash;Oblomkov&ndash;Rasmussen&ndash;Shende conjectures for these families.</li>\
            <li>Gorsky&ndash;Negut&ndash;Rasmussen (2016, arXiv:1608.07308) provided a geometric model for HHH via\
                <span class="kl-term" title="Flag Hilbert scheme: parameter space of flags of ideals of colength n in the plane; central to the geometric realization of Khovanov–Rozansky homology and to the &lsquo;Hilbert scheme&rsquo; side of Gorsky&ndash;Negut&ndash;Rasmussen&rsquo;s conjectures.">flag Hilbert schemes</span>\
                of points in \\(\\mathbb{C}^2\\), tying the categorified story to the algebraic geometry of\
                Hilbert schemes and to the shuffle algebra.</li>\
          </ul>\
          <p><strong>Picture.</strong> One may summarise the current (2026) consensus as follows:</p>\
          <div class="formula-box">$$\\begin{array}{c} \\mathrm{HHH}(K) \\\\[2pt] \\swarrow \\quad \\big\\downarrow \\quad \\searrow \\\\[2pt] \\mathrm{KR}_2 = \\mathrm{Kh} \\quad \\mathrm{KR}_N \\; (N \\ge 3) \\quad \\widehat{HFK} \\\\[2pt] (\\text{theorem, Rasmussen}) \\quad\\quad\\quad\\quad (\\text{conjectural, DGR}) \\end{array}$$</div>\
          <p>Both Khovanov and knot Floer homologies are, in this view, projections of a single triply-graded\
          object to orthogonal axes &mdash; explaining both their strong structural parallels (categorification,\
          spectral sequences, concordance invariants, detection theorems) and their stubborn resistance to\
          direct comparison.</p>\
          <p><em>Attributional caveat.</em> The unification statement is a <strong>conjecture</strong> of\
          Dunfield&ndash;Gukov&ndash;Rasmussen; the \\(d_0 \\to \\widehat{HFK}\\) piece is not known to hold for all knots.\
          The \\(d_N \\to \\mathrm{KR}_N\\) piece (\\(N \\ge 1\\)) is a theorem of Rasmussen.</p>\
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
