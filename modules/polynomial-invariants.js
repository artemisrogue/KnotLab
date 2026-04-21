/**
 * polynomial-invariants.js — Polynomial Invariants module for KnotLab
 * Exposes window.renderPolynomialInvariants(containerEl)
 */
(function () {
  'use strict';

  const SUB_TABS = [
    { id: 'alexander', label: 'Seifert Surfaces & the Alexander Polynomial' },
    { id: 'jones',     label: 'Jones Polynomial' },
    { id: 'homflypt',  label: 'HOMFLY-PT Polynomial' },
    { id: 'quantum',   label: 'Quantum Link Invariants' },
    { id: 'others',    label: 'Other Polynomial Invariants' }
  ];

  // Track the active Three.js viewer across sub-tab switches so we can dispose it.
  var activeSeifertViewer = null;

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

      // Dispose any previously active Seifert 3D viewer before rendering the
      // next sub-tab, so animation frames and WebGL contexts are released.
      if (activeSeifertViewer) {
        try { activeSeifertViewer.dispose(); } catch (e) { /* noop */ }
        activeSeifertViewer = null;
      }

      if (state.subTab === 'alexander')  renderAlexander(content);
      else if (state.subTab === 'jones') renderJones(content);
      else if (state.subTab === 'homflypt') renderHomflypt(content);
      else if (state.subTab === 'quantum') renderQuantum(content);
      else if (state.subTab === 'others') renderOthers(content);
    }

    function mathRender(el) {
      if (typeof renderMathInElement === 'function') renderMathInElement(el);
    }

    // ── Seifert Surfaces & the Alexander Polynomial (merged) ──
    function renderAlexander(el) {
      el.innerHTML =
        '<div class="expo-panel">' +
          '<h3>1. The Alexander polynomial, and why it needs a surface</h3>' +
          '<p>Introduced by J.W. Alexander in 1928, the <strong>Alexander polynomial</strong> ' +
          '\\(\\Delta_K(t)\\in\\mathbb{Z}[t,t^{-1}]\\) was the first polynomial invariant of knots. ' +
          'There are several equivalent definitions — Fox\u2019s free differential calculus, the order of ' +
          'the first homology of the infinite cyclic cover, a skein relation \u2014 but the one that makes ' +
          'the geometry visible goes through a <em><span class="kl-term" title="An oriented, compact, connected surface Σ ⊂ S³ whose oriented boundary is the link K. Every oriented link bounds one.">Seifert surface</span></em>:</p>' +
          '<div class="formula-box">$$\\Delta_K(t) \\;=\\; \\det\\!\\bigl(V - t\\,V^{\\mathsf{T}}\\bigr),$$</div>' +
          '<p>where \\(V\\) is the <span class="kl-term" title="Matrix V_{ij} = lk(α_i⁺, α_j) of linking numbers between a basis {α_i} of H_1(Σ;ℤ) and its positive pushoffs off the Seifert surface Σ.">Seifert matrix</span> of any Seifert surface for \\(K\\). To understand the ' +
          'right-hand side we first need that surface.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>2. What is a Seifert surface?</h3>' +
          '<p>A <strong>Seifert surface</strong> for an oriented knot or link \\(K\\subset S^3\\) is a ' +
          'compact, connected, <em>orientable</em> surface \\(\\Sigma\\) whose oriented boundary is \\(K\\). ' +
          'Every oriented link bounds one; the construction below, due to <span class="kl-term" title="Seifert\'s algorithm: orient the diagram, smooth every crossing according to orientation to get Seifert circles, fill each with a disk at a distinct height, and attach a half-twisted band at each former crossing.">Seifert\u2019s algorithm</span> (1934), produces one ' +
          'algorithmically from any diagram.</p>' +
          '<details class="kl-proof">' +
            '<summary>Why every oriented link bounds an orientable surface</summary>' +
            '<p>Pick a diagram \\(D\\) of \\(K\\) and orient every arc. At each crossing, ' +
            '<em>smooth according to the orientation</em>: replace the crossing by the unique pair of ' +
            'arcs that respects the arrows and no longer crosses. The result is a disjoint union of ' +
            'oriented circles in the plane \u2014 the <em>Seifert circles</em> of \\(D\\).</p>' +
            '<p>Each Seifert circle bounds a disk. Place the disks at slightly different heights so they ' +
            'do not intersect. At the location of each original crossing, attach a band between the two ' +
            'disks whose Seifert circles met there, with a half-twist whose sign matches the crossing. ' +
            'The resulting surface is orientable (each disk carries a consistent orientation from the ' +
            'plane, and a half-twisted band preserves it), and its boundary is exactly \\(K\\). ' +
            '\\(\\blacksquare\\)</p>' +
          '</details>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>3. Seifert\u2019s algorithm on the trefoil</h3>' +
          '<p>We run the algorithm on the right-handed trefoil \\(3_1\\), presented as the closure of the ' +
          'braid \\(\\sigma_1^3\\) on two strands. The three panels below show, in order: the oriented ' +
          'diagram, the smoothed diagram, and the disks\u2013and\u2013bands surface in perspective.</p>' +
          '<div class="kl-diagram">' + seifertAlgorithmSVG() + '</div>' +
          '<ol>' +
            '<li><strong>Orient &amp; diagram.</strong> Both strands of the braid run downward; the ' +
            'closure arcs on the left and right complete a single oriented knot.</li>' +
            '<li><strong>Smooth.</strong> The two braid strands, once smoothed, become two ' +
            '<em>concentric</em> oriented circles in the plane. The three former crossings now sit ' +
            'between these circles; they are where the bands will go.</li>' +
            '<li><strong>Build the surface.</strong> The outer Seifert circle bounds a disk; so does the ' +
            'inner one. Place the two disks at different heights. At each of the three former crossing ' +
            'positions, attach a band between the two disks with a positive (right-handed) half-twist.</li>' +
          '</ol>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>4. The result: a genus-1 surface bounded by \\(3_1\\)</h3>' +
          '<p>For the trefoil we have \\(s=2\\) Seifert circles and \\(c=3\\) bands, so the Euler ' +
          'characteristic is \\(\\chi = s - c = -1\\). With one boundary component,</p>' +
          '<div class="formula-box">$$g \\;=\\; \\tfrac{1}{2}\\bigl(2 - \\chi - \\#\\partial\\bigr) ' +
            '\\;=\\; \\tfrac{1}{2}(2 - (-1) - 1) \\;=\\; 1.$$</div>' +
          '<p>Drag to rotate the surface below. The outer disk sits at the bottom, the inner disk floats ' +
          'above it, and three half-twisted bands connect them. The boundary curve, highlighted in ' +
          'orange, is the trefoil.</p>' +
          '<div class="kl-interactive">' +
            '<div id="pi-seifert-3d" style="width:100%;max-width:640px;height:420px;margin:0 auto;"></div>' +
            '<div class="kl-controls" style="justify-content:center">' +
              '<label><input type="checkbox" id="pi-seifert-show-boundary" checked> Highlight boundary (the knot \\(3_1\\))</label>' +
              '<label><input type="checkbox" id="pi-seifert-show-bands" checked> Show bands</label>' +
              '<label><input type="checkbox" id="pi-seifert-show-disks" checked> Show disks</label>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>5. The Seifert matrix</h3>' +
          '<p>Fix a Seifert surface \\(\\Sigma\\) of genus \\(g\\). Its first homology ' +
          '\\(H_1(\\Sigma;\\mathbb{Z})\\) is free of rank \\(2g\\); choose a basis of oriented cycles ' +
          '\\(\\{\\alpha_1,\\ldots,\\alpha_{2g}\\}\\). For each pair \\((\\alpha_i,\\alpha_j)\\), push ' +
          '\\(\\alpha_i\\) off \\(\\Sigma\\) in the positive normal direction to obtain a cycle ' +
          '\\(\\alpha_i^+\\subset S^3\\setminus\\Sigma\\), and define</p>' +
          '<div class="formula-box">$$V_{ij} \\;=\\; \\operatorname{lk}\\!\\bigl(\\alpha_i^+,\\alpha_j\\bigr).$$</div>' +
          '<p>The matrix \\(V=(V_{ij})\\) is the <strong>Seifert matrix</strong> of \\(\\Sigma\\). For the ' +
          'trefoil surface above, a convenient basis consists of two cycles running through two of the ' +
          'three bands; the resulting Seifert matrix is</p>' +
          '<div class="formula-box">$$V_{3_1} \\;=\\; \\begin{pmatrix}-1 & 1 \\\\ 0 & -1\\end{pmatrix}.$$</div>' +
          '<details class="kl-proof">' +
            '<summary>Where \\(V\\) comes from</summary>' +
            '<p>Concretely, \\(\\alpha_1,\\alpha_2\\) are simple closed loops on the twisted-band trefoil surface, each running along the disc and through exactly two of the three half-twisted bands (so that together they span \\(H_1(\\Sigma)=\\mathbb{Z}^2\\)). The diagonal entries are self-linking numbers of the push-off: \\(V_{ii} = \\operatorname{lk}(\\alpha_i^+,\\alpha_i)\\) equals the framing induced by \\(\\Sigma\\) on \\(\\alpha_i\\), which picks up one full \\(-1\\) twist for each left-handed half-twisted band the loop traverses &mdash; here two half-twists share sign and combine, giving \\(V_{11}=V_{22}=-1\\).</p>' +
            '<p>The off-diagonal entries \\(V_{12}=\\operatorname{lk}(\\alpha_1^+,\\alpha_2)\\) and \\(V_{21}=\\operatorname{lk}(\\alpha_2^+,\\alpha_1)\\) differ by exactly \\(1\\) because \\(\\alpha_1\\) and \\(\\alpha_2\\) cross the middle shared band once: on one side of \\(\\Sigma\\) the push-off links \\(\\alpha_2\\) with linking number \\(1\\), while the opposite push-off links it with linking number \\(0\\). This asymmetry \\(V - V^{\\mathsf T} = \\bigl(\\begin{smallmatrix}0&1\\\\-1&0\\end{smallmatrix}\\bigr)\\) is exactly the intersection form on \\(\\Sigma\\), as it must be.</p>' +
          '</details>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>6. From \\(V\\) to \\(\\Delta_K(t)\\)</h3>' +
          '<p>With the Seifert matrix in hand, the Alexander polynomial is</p>' +
          '<div class="formula-box">$$\\Delta_K(t) \\;=\\; \\det\\!\\bigl(V - t\\,V^{\\mathsf{T}}\\bigr).$$</div>' +
          '<p>Computing on the trefoil:</p>' +
          '<div class="formula-box">$$V - t\\,V^{\\mathsf{T}} = \\begin{pmatrix}-1+t & 1 \\\\ -t & -1+t\\end{pmatrix}' +
            ', \\qquad \\det = (t-1)^2 + t = t^2 - t + 1.$$</div>' +
          '<p>Normalizing symmetrically by dividing by \\(t\\) gives the familiar form</p>' +
          '<div class="formula-box">$$\\Delta_{3_1}(t) \\;=\\; t - 1 + t^{-1}.$$</div>' +
          '<p>The polynomial itself does not depend on the choice of surface or basis: different choices ' +
          'are related by S-equivalence, which preserves \\(\\det(V-tV^{\\mathsf{T}})\\) up to units ' +
          '\\(\\pm t^n\\).</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>6. The skein relation &mdash; computing \\(\\Delta_K\\) without a Seifert surface</h3>' +
          '<p>Independently of any surface, Conway (1969) showed that \\(\\Delta_K\\) is uniquely determined ' +
          'by its value on the unknot and a purely <em>local</em> <span class="kl-term" title="A linear relation among three link diagrams L₊, L₋, L₀ that differ only inside a small disc (positive crossing, negative crossing, oriented smoothing).">skein relation</span> among three oriented link ' +
          'diagrams that agree everywhere except inside a small disc:</p>' +
          '<ul>' +
            '<li>\\(L_+\\): positive crossing inside the disc,</li>' +
            '<li>\\(L_-\\): the same diagram but with that crossing flipped,</li>' +
            '<li>\\(L_0\\): the oriented smoothing (no crossing).</li>' +
          '</ul>' +
          '<div class="formula-box">' +
            '$$\\Delta_{L_+}(t) \\;-\\; \\Delta_{L_-}(t) \\;=\\; \\bigl(t^{1/2} - t^{-1/2}\\bigr)\\,\\Delta_{L_0}(t), ' +
            '\\qquad \\Delta_{\\bigcirc}(t) = 1.$$' +
          '</div>' +
          '<p>Compare the Jones skein \\(q^{-1}V_{L_+} - q\\,V_{L_-} = (q^{1/2} - q^{-1/2})V_{L_0}\\): the ' +
          'Alexander relation is its ungraded cousin, recovered from HOMFLY-PT at \\(a = 1\\).</p>' +
          '<details class="kl-example">' +
            '<summary>Worked example: \\(\\Delta(3_1)\\) from the skein relation</summary>' +
            '<p>Pick any crossing of the standard trefoil diagram \\(L = 3_1\\) and treat it as \\(L_+\\). ' +
            'Flipping it gives \\(L_- = \\) unknot. Smoothing it gives \\(L_0 = \\) Hopf link (two circles ' +
            'linked once). So the skein relation yields</p>' +
            '<div class="formula-box">$$\\Delta_{3_1}(t) - \\Delta_{\\text{unknot}}(t) = (t^{1/2} - t^{-1/2})\\,\\Delta_{\\text{Hopf}}(t).$$</div>' +
            '<p>A second application of the skein to the Hopf link (flip one crossing to get two unlinked ' +
            'circles; smooth to get one unknot) gives \\(\\Delta_{\\text{Hopf}}(t) = t^{1/2} - t^{-1/2}\\) ' +
            '(using the convention \\(\\Delta_{\\bigcirc \\sqcup \\bigcirc}(t) = 0\\)). (Sign depends on orientation of the Hopf link; the other orientation gives the negative. Either choice makes the trefoil computation below come out correctly because only the square appears.) Substituting back:</p>' +
            '<div class="formula-box">$$\\Delta_{3_1}(t) \\;=\\; 1 + (t^{1/2} - t^{-1/2})^2 \\;=\\; t - 1 + t^{-1}. \\checkmark$$</div>' +
            '<p>This matches the Seifert-matrix computation above &mdash; now obtained without ever drawing a ' +
            'Seifert surface.</p>' +
          '</details>' +
          '<p><strong>Conway\u2019s renormalization.</strong> Substituting \\(z = t^{1/2} - t^{-1/2}\\) clears ' +
          'the square roots and produces the <em><span class="kl-term" title="The Alexander polynomial rewritten in z = t^{1/2} − t^{-1/2}: a genuine polynomial ∇_K(z) ∈ ℤ[z] with skein ∇(L₊) − ∇(L₋) = z∇(L₀).">Conway polynomial</span></em> \\(\\nabla_K(z) \\in \\mathbb{Z}[z]\\), ' +
          'which satisfies</p>' +
          '<div class="formula-box">$$\\nabla_{L_+}(z) - \\nabla_{L_-}(z) = z\\,\\nabla_{L_0}(z), \\qquad \\nabla_{\\bigcirc}(z) = 1.$$</div>' +
          '<p>For the trefoil \\(\\nabla_{3_1}(z) = z^2 + 1\\). More on \\(\\nabla\\) in the <em>Others</em> ' +
          'sub-tab.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>8. What the polynomial sees (and what it doesn\u2019t)</h3>' +
          '<ul>' +
            '<li><strong>Symmetry.</strong> \\(\\Delta_K(t) = \\Delta_K(t^{-1})\\), always.</li>' +
            '<li><strong>Determinant.</strong> \\(\\Delta_K(-1) = \\pm\\det(K)\\).</li>' +
            '<li><strong>Genus bound.</strong> \\(\\deg \\Delta_K \\le 2g(K)\\). For the trefoil ' +
            '\\(\\deg\\Delta = 2\\), confirming genus \\(1\\). For <span class="kl-term" title="A knot K is fibered if its complement S³ ∖ K fibers over S¹ with fiber a Seifert surface for K. Equivalently, Δ_K is monic of degree 2g(K).">fibered knots</span> this is an equality.</li>' +
            '<li><strong>Blind spots.</strong> \\(\\Delta_K\\) does not detect <span class="kl-term" title="A knot is chiral if it is not isotopic to its mirror image; amphichiral otherwise. Detection requires invariants sensitive to crossing signs.">chirality</span>: the right- and ' +
            'left-handed trefoils share the same Alexander polynomial. It also cannot distinguish the ' +
            'unknot from every knot \u2014 the Conway knot and Kinoshita\u2013Terasaka knot both have ' +
            '\\(\\Delta = 1\\).</li>' +
          '</ul>' +
          '<p><em>Interact with Alexander polynomials for 500+ knots in the Knot Explorer tab.</em></p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>Caveats and further directions</h3>' +
          '<div class="kl-note">' +
            '<div class="kl-head">Seifert\u2019s algorithm is not genus-optimal.</div>' +
            'Different diagrams of the same knot generally yield surfaces of different genera. The ' +
            'algorithm gives a genus upper bound; for alternating knots this bound is sharp (Crowell, ' +
            'Murasugi), but in general it is not.' +
          '</div>' +
          '<div class="kl-note">' +
            '<div class="kl-head">Minimal-genus detection.</div>' +
            'Knot Floer homology (Ozsv\u00e1th\u2013Szab\u00f3) detects the genus exactly, and its graded ' +
            'Euler characteristic recovers \\(\\Delta_K\\). See the <em>Homological Invariants</em> tab.' +
          '</div>' +
          '<div class="kl-note">' +
            '<div class="kl-head">Oriented vs. unoriented.</div>' +
            'Seifert\u2019s construction requires an orientation. Unorientable spanning surfaces (e.g. ' +
            'M\u00f6bius bands spanning the trefoil) lead to a separate theory: the non-orientable ' +
            '4-genus and the Gordon\u2013Litherland pairing.' +
          '</div>' +
        '</div>';

      mathRender(el);

      // Wire up the 3D viewer after the DOM has settled.
      setTimeout(function () {
        var host = document.getElementById('pi-seifert-3d');
        if (!host) return;
        activeSeifertViewer = buildSeifertViewer(host);
        if (!activeSeifertViewer) return;
        var cb1 = document.getElementById('pi-seifert-show-boundary');
        var cb2 = document.getElementById('pi-seifert-show-bands');
        var cb3 = document.getElementById('pi-seifert-show-disks');
        function sync() {
          if (!activeSeifertViewer) return;
          activeSeifertViewer.setVisibility({
            boundary: !!(cb1 && cb1.checked),
            bands:    !!(cb2 && cb2.checked),
            disks:    !!(cb3 && cb3.checked)
          });
        }
        if (cb1) cb1.addEventListener('change', sync);
        if (cb2) cb2.addEventListener('change', sync);
        if (cb3) cb3.addEventListener('change', sync);
      }, 0);
    }

    /* ── SVG: Seifert's algorithm on the σ₁³ trefoil ────────────────
       Panel 1: the braid σ₁³ with closure arcs (oriented, both strands
                running downward inside the braid box).
       Panel 2: smoothing result — two concentric oriented circles.
       Panel 3: disks + 3 half-twisted bands in perspective.                */
    function seifertAlgorithmSVG() {
      // ── Panel 1: σ₁³ with braid closure ──
      // Two strands, crossings at y = 40, 80, 120 (top→bottom). σ_1
      // means strand 1 (left) crosses OVER strand 2 (right).
      // x-left ≈ -18, x-right ≈ +18 inside the braid; strands swap at
      // each crossing. With three σ_1 crossings, the strand that starts
      // at top-left ends at bottom-right (odd permutation), so closure
      // by left and right arcs gives a single component — the trefoil.
      function braidPanel() {
        var XL = -18, XR = 18, yTop = 10, yBot = 150;
        var cys = [40, 80, 120];                 // crossing y-centers
        var g = '<g stroke="#1f3a5f" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">';
        // Build a sequence of y-anchors where strands swap.
        // At each crossing, one strand goes left→right, the other right→left;
        // for σ_1 (positive), the left strand is the OVER-strand.
        // We draw both strands as polylines with a small gap on the UNDER-strand
        // at the crossing, to indicate the over/under.
        // Strand positions between crossings:
        //   before c0: left, right
        //   after  c0: right, left
        //   after  c1: left, right
        //   after  c2: right, left
        // So strand "1" (starts left) goes L,R,L,R (at top, then after c0, c1, c2).
        //     strand "2" (starts right) goes R,L,R,L.
        // For positive σ_1, at each crossing the LEFT-coming strand is OVER.
        // Strand 1 comes from left before c0 (OVER), from right before c1 (UNDER),
        //    from left before c2 (OVER). So strand 1 is OVER at c0, c2; UNDER at c1.
        // Strand 2 is UNDER at c0, c2; OVER at c1.
        var gap = 7;
        function strandPath(startSide, overCrossings) {
          // startSide: 'L' or 'R'; overCrossings: set of crossing indices where strand is over.
          var curX = (startSide === 'L') ? XL : XR;
          var d = 'M ' + curX + ',' + yTop;
          for (var k = 0; k < cys.length; k++) {
            var cy = cys[k];
            var nextX = (curX === XL) ? XR : XL;
            var isOver = overCrossings.indexOf(k) !== -1;
            if (isOver) {
              // Smooth S-curve through the crossing
              d += ' C ' + curX + ',' + (cy - 8) + ' ' + nextX + ',' + (cy + 8) + ' ' + nextX + ',' + (cy + 12);
            } else {
              // Two sub-arcs with a gap across the crossing line
              // Arc 1: from above to just before crossing
              d += ' C ' + curX + ',' + (cy - 10) + ' ' + ((curX+nextX)/2 - (curX<nextX?gap*0.3:-gap*0.3)) + ',' + (cy - gap) + ' ' + ((curX+nextX)/2 - (curX<nextX?gap:-gap)*0.5) + ',' + (cy - gap*0.4);
              // Move (lift pen) across the gap
              d += ' M ' + ((curX+nextX)/2 + (curX<nextX?gap:-gap)*0.5) + ',' + (cy + gap*0.4);
              d += ' C ' + ((curX+nextX)/2 + (curX<nextX?gap*0.3:-gap*0.3)) + ',' + (cy + gap) + ' ' + nextX + ',' + (cy + 10) + ' ' + nextX + ',' + (cy + 12);
            }
            curX = nextX;
          }
          d += ' L ' + curX + ',' + yBot;
          return d;
        }
        // Strand 1: starts Left, over at crossings 0 and 2.
        g += '<path d="' + strandPath('L', [0, 2]) + '" />';
        // Strand 2: starts Right, over at crossing 1.
        g += '<path d="' + strandPath('R', [1]) + '" />';
        g += '</g>';

        // Braid closure arcs on the left (outside the braid box) and right.
        // Top arcs: connect (XL, yTop) to (XR, yTop) going UP and around
        //   via left side and right side.
        // Bottom arcs: connect (XL, yBot) to (XR, yBot) similarly.
        // Strand 1 ends at bottom-right; strand 2 ends at bottom-left.
        // Standard braid closure: each top point connects to the bottom point
        //   at the same x-position, via an arc on the outside.
        // Left closure: arc from (XL, yTop) curving LEFT down to (XL, yBot).
        // Right closure: arc from (XR, yTop) curving RIGHT down to (XR, yBot).
        var closure = '<g stroke="#1f3a5f" stroke-width="3" fill="none" stroke-linecap="round">' +
          '<path d="M ' + XL + ',' + yTop + ' C ' + (XL - 32) + ',' + yTop + ' ' + (XL - 32) + ',' + yBot + ' ' + XL + ',' + yBot + '" />' +
          '<path d="M ' + XR + ',' + yTop + ' C ' + (XR + 32) + ',' + yTop + ' ' + (XR + 32) + ',' + yBot + ' ' + XR + ',' + yBot + '" />' +
        '</g>';

        // Orientation arrows — both braid strands run DOWNWARD through the braid,
        // so we put a down-pointing triangle on each strand just below yTop. The
        // closure arcs then flow UP on the outsides (not annotated, to keep the
        // figure uncluttered; the arrows inside the braid fix the overall
        // orientation of the knot).
        var arrow = '<g fill="#b84900" stroke="#b84900">' +
          '<polygon points="' + XL + ',24 ' + (XL-5) + ',16 ' + (XL+5) + ',16" />' +
          '<polygon points="' + XR + ',24 ' + (XR-5) + ',16 ' + (XR+5) + ',16" />' +
        '</g>';

        return '<g transform="translate(90,40)">' +
          g + closure + arrow +
          '<text x="0" y="180" text-anchor="middle" font-size="13" fill="#333">(1) braid \u03C3\u2081\u00B3 with closure</text>' +
        '</g>';
      }

      // ── Panel 2: smoothed — two concentric circles ──
      function smoothedPanel() {
        var cx = 0, cy = 75;
        return '<g transform="translate(280,40)">' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="58" stroke="#1f3a5f" stroke-width="3" fill="none" />' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="28" stroke="#1f3a5f" stroke-width="3" fill="none" />' +
          // Orientation arrows — tangent to each circle at 3 o'clock, pointing UP
          // (CCW on screen: matches the braid closure's overall orientation after
          // oriented smoothing). Upward triangle at (x=R, y=75): apex above, base below.
          '<g fill="#b84900" stroke="#b84900">' +
            // Outer circle r=58, at (58,75): apex (58,67), base (52,79)-(64,79)
            '<polygon points="58,67 52,79 64,79" />' +
            // Inner circle r=28, at (28,75): apex (28,67), base (23,79)-(33,79)
            '<polygon points="28,67 23,79 33,79" />' +
          '</g>' +
          // Three dots marking former crossing locations (between the circles)
          '<g fill="#888">' +
            '<circle cx="0"   cy="32"  r="2.5" />' +
            '<circle cx="37"  cy="96"  r="2.5" />' +
            '<circle cx="-37" cy="96"  r="2.5" />' +
          '</g>' +
          '<text x="0" y="180" text-anchor="middle" font-size="13" fill="#333">(2) smooth \u2192 two Seifert circles</text>' +
        '</g>';
      }

      // ── Panel 3: disks + 3 half-twisted bands in perspective ──
      // Perspective: y-axis is vertical on screen. Outer disk at low y,
      // inner disk at higher y. Each disk is an ellipse seen obliquely.
      // Bands connect corresponding angular positions on the two disk rims,
      // drawn as quadrilaterals with a small crossing line to hint at the twist.
      function disksAndBandsPanel() {
        var R_out = 58, r_out = 15;           // outer disk ellipse semi-axes
        var R_in  = 28, r_in  = 7;            // inner disk ellipse semi-axes
        var cxOut = 0, cyOut = 120;           // outer disk centered lower
        var cxIn  = 0, cyIn  = 35;            // inner disk centered higher
        // Three band anchor angles (on both disks): 90° (front), 210°, 330°.
        // In the oblique view, a point at angle θ on ellipse (cx,cy,R,r) is
        //   (cx + R cos θ, cy + r sin θ). We put bands at θ1=90° (front center),
        //   θ2=210°, θ3=330°.
        function ellipsePt(cx, cy, R, r, thetaDeg) {
          var t = thetaDeg * Math.PI / 180;
          return [cx + R * Math.cos(t), cy + r * Math.sin(t)];
        }
        // Angular half-width (degrees) of band attachment on each disk rim.
        var dwOut = 14, dwIn = 22;
        var angles = [90, 210, 330];
        var bandsSvg = '<g stroke="#7a4d15" stroke-width="1.5">';
        for (var k = 0; k < angles.length; k++) {
          var a = angles[k];
          // Four corners of the band quadrilateral:
          //   outer-left (s=+1 at t=0)  at outer rim angle a+dwOut
          //   outer-right (s=-1 at t=0) at outer rim angle a-dwOut
          //   inner-left  (s=+1 at t=1) at inner rim angle a-dwIn  (half-twist swaps)
          //   inner-right (s=-1 at t=1) at inner rim angle a+dwIn
          var pOL = ellipsePt(cxOut, cyOut, R_out, r_out, a + dwOut);
          var pOR = ellipsePt(cxOut, cyOut, R_out, r_out, a - dwOut);
          var pIL = ellipsePt(cxIn,  cyIn,  R_in,  r_in,  a - dwIn);
          var pIR = ellipsePt(cxIn,  cyIn,  R_in,  r_in,  a + dwIn);
          // Polygon: outer-left → inner-left → inner-right → outer-right
          var poly = pOL[0].toFixed(1)+','+pOL[1].toFixed(1)+' '+
                     pIL[0].toFixed(1)+','+pIL[1].toFixed(1)+' '+
                     pIR[0].toFixed(1)+','+pIR[1].toFixed(1)+' '+
                     pOR[0].toFixed(1)+','+pOR[1].toFixed(1);
          // Back band (a=90°? no, a=210° and 330° are back-ish; front is 90°)
          // Actually in our projection the front of each disk is θ=90° (bottom).
          // Bands at angles 210° and 330° are on the back/side; mark them dimmer.
          var opacity = (a === 90) ? 0.95 : 0.75;
          bandsSvg += '<polygon points="' + poly + '" fill="#efb97a" fill-opacity="' + opacity + '" />';
          // Small crossing-marker inside the band to suggest the half-twist
          var mid1x = (pOL[0] + pIR[0]) / 2, mid1y = (pOL[1] + pIR[1]) / 2;
          var mid2x = (pOR[0] + pIL[0]) / 2, mid2y = (pOR[1] + pIL[1]) / 2;
          bandsSvg += '<line x1="' + mid1x.toFixed(1) + '" y1="' + mid1y.toFixed(1) +
                      '" x2="' + mid2x.toFixed(1) + '" y2="' + mid2y.toFixed(1) +
                      '" stroke="#7a4d15" stroke-width="0.8" stroke-dasharray="2,2" opacity="' + opacity + '" />';
        }
        bandsSvg += '</g>';
        // Draw order: back half of outer disk → bands → front half of outer disk →
        // inner disk → inner disk rim highlight. For simplicity draw outer as full
        // ellipse, bands over it, then inner over bands.
        var outerDisk = '<ellipse cx="' + cxOut + '" cy="' + cyOut + '" rx="' + R_out +
                        '" ry="' + r_out + '" fill="#cfe3f5" stroke="#1f3a5f" stroke-width="2" />';
        var innerDisk = '<ellipse cx="' + cxIn + '" cy="' + cyIn + '" rx="' + R_in +
                        '" ry="' + r_in + '" fill="#e6f1fb" stroke="#1f3a5f" stroke-width="2" />';
        // Orientation arrows on each disk rim, CCW on screen, matching Panel 2.
        // Outer disk at (cxOut,cyOut)=(0,120), rx=58 ry=15: right rim point (58,120),
        //   tangent up on screen → upward triangle apex (58,112) base (52,124)-(64,124).
        // Inner disk at (cxIn,cyIn)=(0,35), rx=28 ry=7: right rim point (28,35),
        //   tangent up → upward triangle apex (28,28) base (23,40)-(33,40).
        var diskArrows = '<g fill="#b84900" stroke="#b84900">' +
          '<polygon points="58,112 52,124 64,124" />' +
          '<polygon points="28,28 23,40 33,40" />' +
        '</g>';
        return '<g transform="translate(490,40)">' +
          outerDisk + bandsSvg + innerDisk + diskArrows +
          '<text x="0" y="180" text-anchor="middle" font-size="13" fill="#333">(3) disks + 3 half-twisted bands</text>' +
        '</g>';
      }

      return '<svg viewBox="0 0 600 240" width="100%" style="max-width:720px;display:block;margin:0 auto">' +
        braidPanel() + smoothedPanel() + disksAndBandsPanel() +
        '</svg>' +
        '<div class="kl-diagram-caption">Seifert\u2019s algorithm on the closure of \\(\\sigma_1^3\\). ' +
        'Two Seifert circles (the two braid strands, closed up) \u2192 two disks \u2192 three ' +
        'half-twisted bands. \\(\\chi = 2 - 3 = -1\\), genus \\(1\\).</div>';
    }

    /* ── Three.js Seifert surface for the trefoil ────────────────────
       Correct topology from Seifert's algorithm on σ₁³:
         • Two CONCENTRIC disks (outer radius R_out, inner radius R_in)
           placed at DIFFERENT heights (y = 0 and y = h) so they do not
           physically intersect even though in the plane they would nest.
         • Three half-twisted bands connecting the outer disk's rim to
           the inner disk's rim at angles 0°, 120°, 240°.
         • Boundary curve: traced out as alternating disk-rim arcs and
           band free-edges. Every half-twist flips which side of the
           band the boundary is on, so the resulting curve is a single
           component — the trefoil.                                        */
    function buildSeifertViewer(host) {
      if (typeof THREE === 'undefined') {
        host.innerHTML = '<p style="text-align:center;color:#888;padding:2rem">' +
          'Three.js is not loaded in this context.</p>';
        return null;
      }
      host.innerHTML = '';
      var width = host.clientWidth || 600;
      var height = host.clientHeight || 420;

      var scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf8f8f8);
      var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(5.5, 4.5, 5.5);
      camera.lookAt(0, 0.8, 0);

      var canvas = document.createElement('canvas');
      canvas.style.width = '100%'; canvas.style.height = '100%';
      host.appendChild(canvas);
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(width, height, false);

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      var dir = new THREE.DirectionalLight(0xffffff, 0.7);
      dir.position.set(4, 6, 4); scene.add(dir);
      var dir2 = new THREE.DirectionalLight(0xffffff, 0.35);
      dir2.position.set(-4, -2, -3); scene.add(dir2);

      var controls = null;
      var OrbitCtrl = THREE.OrbitControls || window.OrbitControls;
      if (OrbitCtrl) {
        controls = new OrbitCtrl(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.target.set(0, 0.8, 0);
      }

      // Geometry parameters
      var R_out = 2.4;        // outer Seifert-circle radius
      var R_in  = 1.2;        // inner Seifert-circle radius
      var yOut  = 0.0;        // outer disk height
      var yIn   = 1.6;        // inner disk height
      var bandW = 0.35;       // band half-width
      var bandSegT = 32;
      var twoPi = Math.PI * 2;
      // Angular half-widths of band attachment on each disk rim (small → band
      // meets the rim almost as a point; we pick comparable arc-lengths).
      var dAngOut = bandW / R_out;
      var dAngIn  = bandW / R_in;

      var disksGroup    = new THREE.Group();
      var bandsGroup    = new THREE.Group();
      var boundaryGroup = new THREE.Group();
      scene.add(disksGroup, bandsGroup, boundaryGroup);

      // --- Two concentric disks ---
      var diskMat = new THREE.MeshPhongMaterial({
        color: 0xb8d2ea, side: THREE.DoubleSide,
        transparent: true, opacity: 0.75, shininess: 20
      });
      function makeDisk(radius, y) {
        var geom = new THREE.CylinderGeometry(radius, radius, 0.04, 64, 1, false);
        var m = new THREE.Mesh(geom, diskMat);
        m.position.y = y;
        return m;
      }
      disksGroup.add(makeDisk(R_out, yOut));
      disksGroup.add(makeDisk(R_in,  yIn));

      // --- Three half-twisted bands at 0°, 120°, 240° ---
      var bandMat = new THREE.MeshPhongMaterial({
        color: 0xe6b35a, side: THREE.DoubleSide, shininess: 15
      });

      // Band centerline goes from outer-rim(θ₀) to inner-rim(θ₀). Cross-section
      // vector rotates by π as t: 0→1 (half-twist).
      //   C(t)    = ((1-t)R_out + t R_in) * (cos θ₀, 0, sin θ₀) + (0, y(t), 0)
      //   where y(t) = (1-t)yOut + t yIn.
      //   Cross-section at (t, s∈[-1,1]):
      //     tangentDir = (-sin θ₀, 0, cos θ₀)
      //     verticalDir = (0, 1, 0)
      //     offset(t,s) = s·bandW·(cos(π t)·tangentDir + sin(π t)·verticalDir)
      //   (A little arc-correction: we also shift the angle by the tangential
      //    component of the offset so the band edges actually meet the disk rim.)
      function makeBand(theta0) {
        var segS = 2, segT = bandSegT;
        var positions = [], indices = [];
        var ct0 = Math.cos(theta0), st0 = Math.sin(theta0);
        for (var j = 0; j <= segT; j++) {
          var t = j / segT;
          var R_t = (1 - t) * R_out + t * R_in;
          var y_t = (1 - t) * yOut + t * yIn;
          var twist = Math.PI * t;
          var cT = Math.cos(twist), sT = Math.sin(twist);
          for (var i = 0; i <= segS; i++) {
            var s = (i / segS) * 2 - 1;
            // Tangential offset (along the circle direction at angle θ₀)
            var tangOff = s * bandW * cT;          // arc-length along rim
            var vertOff = s * bandW * sT;
            // Apply tangential offset as an angular shift around the central axis
            var theta = theta0 + tangOff / R_t;
            var px = R_t * Math.cos(theta);
            var pz = R_t * Math.sin(theta);
            var py = y_t + vertOff;
            positions.push(px, py, pz);
          }
        }
        var vertsPerRow = segS + 1;
        for (var jj = 0; jj < segT; jj++) {
          for (var ii = 0; ii < segS; ii++) {
            var a = jj * vertsPerRow + ii;
            var b = a + 1;
            var c = a + vertsPerRow;
            var d = c + 1;
            indices.push(a, c, b, b, c, d);
          }
        }
        var geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setIndex(indices);
        geom.computeVertexNormals();
        return new THREE.Mesh(geom, bandMat);
      }

      var bandAngles = [0, twoPi / 3, 2 * twoPi / 3];
      for (var k = 0; k < 3; k++) {
        bandsGroup.add(makeBand(bandAngles[k]));
      }

      // --- Boundary curve ---
      // The surface boundary alternates between rim-arcs on the two disks and
      // band free-edges. Due to each band's half-twist, when we enter a band
      // at s=+1 (one edge) on the outer rim and travel t: 0→1, we come out
      // on the OTHER angular side of the inner rim (since cos(π)=−1 flips the
      // sign of the tangential offset). Tracing alternately, the boundary
      // visits every arc and every band-edge before closing up — 1 component.
      function bandEdgePoint(theta0, s, t) {
        var R_t = (1 - t) * R_out + t * R_in;
        var y_t = (1 - t) * yOut + t * yIn;
        var twist = Math.PI * t;
        var cT = Math.cos(twist), sT = Math.sin(twist);
        var tangOff = s * bandW * cT;
        var vertOff = s * bandW * sT;
        var theta = theta0 + tangOff / R_t;
        return new THREE.Vector3(R_t * Math.cos(theta), y_t + vertOff, R_t * Math.sin(theta));
      }
      function outerRimPt(theta) {
        return new THREE.Vector3(R_out * Math.cos(theta), yOut, R_out * Math.sin(theta));
      }
      function innerRimPt(theta) {
        return new THREE.Vector3(R_in  * Math.cos(theta), yIn,  R_in  * Math.sin(theta));
      }

      function buildBoundary() {
        var pts = [];
        var nArc = 60, nBand = 24;
        function arc(fn, a0, a1) {
          // Walk from angle a0 to a1 (a1 may be > a0 or < a0; we go linearly).
          for (var i = 0; i <= nArc; i++) {
            var u = i / nArc;
            pts.push(fn(a0 + (a1 - a0) * u));
          }
        }
        function bandEdge(theta0, s, t0, t1) {
          for (var i = 0; i <= nBand; i++) {
            var u = i / nBand;
            pts.push(bandEdgePoint(theta0, s, t0 + (t1 - t0) * u));
          }
        }
        // See trace derivation: start on outer rim at angle +dAngOut (just past
        // band 0's right edge), walk outer CCW to band 1 left, cross down on
        // band 1 at s=-1, emerge at inner angle θ₁+dAngIn (due to twist flip),
        // walk inner CCW, etc. Twelve segments total (6 arcs + 6 band-edges).
        var a0 = 0, a1 = twoPi / 3, a2 = 2 * twoPi / 3;

        // 1) outer rim a0+dAngOut → a1−dAngOut
        arc(outerRimPt, a0 + dAngOut, a1 - dAngOut);
        // 2) band 1 at s = −1, t: 0 → 1
        bandEdge(a1, -1, 0, 1);
        // After: at inner angle a1 + dAngIn  (cos(π)·(−1) = +1 → +dAngIn)
        // 3) inner rim a1+dAngIn → a2−dAngIn
        arc(innerRimPt, a1 + dAngIn, a2 - dAngIn);
        // 4) band 2 at s = +1, t: 1 → 0   (we're on "+1 inner edge" per mapping)
        //    Wait: at t=1, bandEdgePoint(θ, s=+1, 1) has tangOff = cos(π)·bandW = −bandW
        //    → theta = θ − dAngIn. So to be at a2 − dAngIn we need s=+1. ✓
        bandEdge(a2, +1, 1, 0);
        // After: at outer angle a2 + dAngOut  (s=+1 at t=0 → +dAngOut)
        // 5) outer rim a2+dAngOut → a0+twoPi−dAngOut (= −dAngOut mod 2π)
        arc(outerRimPt, a2 + dAngOut, a0 + twoPi - dAngOut);
        // 6) band 0 at s = −1, t: 0 → 1   (outer angle −dAngOut means s=−1 at t=0)
        bandEdge(a0, -1, 0, 1);
        // After: at inner angle a0 + dAngIn
        // 7) inner rim a0+dAngIn → a1−dAngIn
        arc(innerRimPt, a0 + dAngIn, a1 - dAngIn);
        // 8) band 1 at s = +1, t: 1 → 0
        bandEdge(a1, +1, 1, 0);
        // After: outer angle a1 + dAngOut
        // 9) outer rim a1+dAngOut → a2−dAngOut
        arc(outerRimPt, a1 + dAngOut, a2 - dAngOut);
        // 10) band 2 at s = −1, t: 0 → 1
        bandEdge(a2, -1, 0, 1);
        // After: inner angle a2 + dAngIn
        // 11) inner rim a2+dAngIn → a0+twoPi−dAngIn
        arc(innerRimPt, a2 + dAngIn, a0 + twoPi - dAngIn);
        // 12) band 0 at s = +1, t: 1 → 0
        bandEdge(a0, +1, 1, 0);
        // After: outer angle a0 + dAngOut — back to start, curve closes.
        return pts;
      }

      try {
        var boundaryPts = buildBoundary();
        var curve = new THREE.CatmullRomCurve3(boundaryPts, true);
        var tubeGeom = new THREE.TubeGeometry(curve, 600, 0.06, 12, true);
        var tubeMat  = new THREE.MeshPhongMaterial({ color: 0xb84900, shininess: 40 });
        boundaryGroup.add(new THREE.Mesh(tubeGeom, tubeMat));
      } catch (err) {
        // Fallback: a (2,3) torus knot roughly the right size
        var tkGeom = new THREE.TorusKnotGeometry(1.8, 0.06, 300, 10, 2, 3);
        boundaryGroup.add(new THREE.Mesh(tkGeom, new THREE.MeshPhongMaterial({ color: 0xb84900 })));
      }

      var running = true, animId = null;
      function animate() {
        if (!running) return;
        animId = requestAnimationFrame(animate);
        if (controls) controls.update();
        renderer.render(scene, camera);
      }
      animate();

      function disposeGroup(g) {
        while (g.children.length) {
          var m = g.children.pop();
          if (m.geometry) m.geometry.dispose();
          if (m.material) m.material.dispose();
        }
      }

      return {
        setVisibility: function (flags) {
          disksGroup.visible    = !!flags.disks;
          bandsGroup.visible    = !!flags.bands;
          boundaryGroup.visible = !!flags.boundary;
        },
        dispose: function () {
          running = false;
          if (animId) cancelAnimationFrame(animId);
          disposeGroup(disksGroup);
          disposeGroup(bandsGroup);
          disposeGroup(boundaryGroup);
          if (controls) controls.dispose();
          renderer.dispose();
          if (host.contains(canvas)) host.removeChild(canvas);
        }
      };
    }

    // ── Jones Polynomial ──────────────────────────────────────
    function renderJones(el) {
      el.innerHTML =
        '<div class="expo-panel">' +
          '<h3>1. Discovery &mdash; a quantum invariant from an operator algebra</h3>' +
          '<p>Vaughan Jones discovered the Jones polynomial in 1984 while studying ' +
          'representations of the <span class="kl-term" title="The group of braids on n strands under concatenation; generators σ₁,…,σₙ₋₁ with braid and commutation relations.">braid group</span> \\(B_n\\) inside a family of von Neumann algebras now called ' +
          '<strong>Temperley&ndash;Lieb algebras</strong>. The discovery was a total surprise &mdash; nothing ' +
          'about type \\(\\mathrm{II}_1\\) subfactors suggested a new knot invariant, let alone one that detects ' +
          'chirality where the Alexander polynomial fails. Jones was awarded the Fields Medal in 1990, ' +
          'and the discovery kicked off <em>quantum topology</em>: within three years Witten reinterpreted ' +
          'the invariant via Chern&ndash;Simons gauge theory (see the Quantum sub-tab), and ' +
          'Reshetikhin&ndash;Turaev gave a combinatorial construction from quantum groups.</p>' +
          '<p>The Jones polynomial \\(V_K(q) \\in \\mathbb{Z}[q^{\\pm 1/2}]\\) is an oriented link invariant. ' +
          'It normalizes so that \\(V_{\\mathrm{unknot}}(q) = 1\\), and for a disjoint union \\(L_1 \\sqcup L_2\\) ' +
          'one has \\(V_{L_1 \\sqcup L_2} = (-q^{1/2} - q^{-1/2})\\,V_{L_1}\\,V_{L_2}\\).</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>2. The <span class="kl-term" title="Kauffman bracket ⟨D⟩ ∈ ℤ[A^±1]: a state sum on an unoriented diagram D; invariant under R II and R III, multiplies by −A^{±3} under R I.">Kauffman bracket</span> &mdash; a <span class="kl-term" title="State sum: an invariant written as a sum over all ways (states) of resolving every crossing of a diagram, weighted by local terms.">state-sum</span> construction</h3>' +
          '<p>In 1987 Louis Kauffman gave an elementary, purely diagrammatic construction of \\(V_K\\) ' +
          'that requires neither operator algebras nor quantum groups. For an unoriented link diagram ' +
          '\\(D\\), the <strong>bracket polynomial</strong> \\(\\langle D\\rangle \\in \\mathbb{Z}[A^{\\pm 1}]\\) ' +
          'is defined by three local rules:</p>' +
          '<div class="formula-box" style="display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-size:1.05em">' +
            '<span>\\(\\Big\\langle\\)</span>' +
            '<svg width="36" height="36" viewBox="0 0 36 36" aria-label="crossing">' +
              '<line x1="4" y1="4" x2="32" y2="32" stroke="#222" stroke-width="2.4"/>' +
              '<line x1="32" y1="4" x2="4" y2="32" stroke="#fff" stroke-width="6"/>' +
              '<line x1="32" y1="4" x2="4" y2="32" stroke="#222" stroke-width="2.4"/>' +
            '</svg>' +
            '<span>\\(\\Big\\rangle \\;=\\; A\\,\\Big\\langle\\)</span>' +
            '<svg width="36" height="36" viewBox="0 0 36 36" aria-label="horizontal smoothing">' +
              '<path d="M4,4 Q18,22 32,4" fill="none" stroke="#222" stroke-width="2.4"/>' +
              '<path d="M4,32 Q18,14 32,32" fill="none" stroke="#222" stroke-width="2.4"/>' +
            '</svg>' +
            '<span>\\(\\Big\\rangle \\;+\\; A^{-1}\\,\\Big\\langle\\)</span>' +
            '<svg width="36" height="36" viewBox="0 0 36 36" aria-label="vertical smoothing">' +
              '<path d="M4,4 Q22,18 4,32" fill="none" stroke="#222" stroke-width="2.4"/>' +
              '<path d="M32,4 Q14,18 32,32" fill="none" stroke="#222" stroke-width="2.4"/>' +
            '</svg>' +
            '<span>\\(\\Big\\rangle\\)</span>' +
          '</div>' +
          '<p style="text-align:center;color:#555;font-size:0.92em">(each crossing is replaced by ' +
          '\\(A\\) times the horizontal (\\(A\\)-)smoothing plus \\(A^{-1}\\) times the vertical (\\(B\\)-)smoothing)</p>' +
          '<div class="formula-box">' +
            '$$\\langle D \\sqcup \\bigcirc\\rangle \\;=\\; (-A^2 - A^{-2})\\,\\langle D\\rangle, \\qquad ' +
            '\\langle \\bigcirc\\rangle \\;=\\; 1.$$' +
          '</div>' +
          '<p>Applied recursively, each crossing has two smoothings, so a diagram with \\(c\\) crossings ' +
          'gives a sum over \\(2^c\\) <em>states</em> \\(s\\) (a choice of smoothing at each crossing). If ' +
          '\\(a(s)\\) and \\(b(s)\\) count the \\(A\\)- and \\(A^{-1}\\)-smoothings and \\(|s|\\) is the number ' +
          'of resulting loops,</p>' +
          '<div class="formula-box">' +
            '$$\\langle D\\rangle \\;=\\; \\sum_{s \\in \\{0,1\\}^c} A^{a(s) - b(s)}\\,(-A^2 - A^{-2})^{|s| - 1}.$$' +
          '</div>' +
          '<p>The bracket is invariant under <span class="kl-term" title="The three local diagram moves (R I: kink, R II: poke, R III: triangle) whose equivalence classes coincide with ambient isotopy of knots.">Reidemeister</span> II and III but picks up a factor \\(-A^{\\pm 3}\\) ' +
          'under R I. To fix this, orient the diagram and divide out the <em><span class="kl-term" title="Writhe w(D): the sum over crossings of the signed crossing number ε(c) ∈ {±1}, using the right-hand rule for oriented strands.">writhe</span></em> ' +
          '\\(w(D) = \\sum_c \\varepsilon(c)\\):</p>' +
          '<div class="formula-box">' +
            '$$V_K(q) \\;=\\; \\bigl(-A\\bigr)^{-3w(D)}\\,\\langle D\\rangle \\bigg|_{A \\,=\\, q^{-1/4}}.$$' +
          '</div>' +
          '<details class="kl-proof"><summary>Why \\(\\langle\\cdot\\rangle\\) is invariant under R2 and R3</summary>' +
            '<p>Apply the Kauffman skein to both crossings of an R2 tangle. Expanding the four resolutions and using \\(d = -A^2 - A^{-2}\\) for any closed circle that appears, one checks directly that the \\(\\langle\\!\\asymp\\!\\rangle\\) coefficient collapses to \\(A\\cdot A + A^{-1}\\cdot A^{-1}\\cdot d + (\\text{loop terms}) = 0\\) and the \\(\\langle\\!)(\\!\\rangle\\) coefficient collapses to \\(1\\). (Concretely: the relation \\(d\\cdot A^2 + A^4 = -1\\) combined with its \\(A\\leftrightarrow A^{-1}\\) partner forces the cancellation.) Hence \\(\\langle\\cdot\\rangle\\) is R2-invariant. ' +
            'R3-invariance then follows by Kauffman\u2019s short argument: apply R2 to slide one strand across the other two inside the R3 triangle, and the three resulting diagrams have equal brackets by the R2 identity just proved.</p>' +
          '</details>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>3. Worked example: the right-handed trefoil \\(3_1\\)</h3>' +
          '<p>The standard three-crossing diagram of the trefoil has writhe \\(w = 3\\) and ' +
          '\\(2^3 = 8\\) states. Writing \\(d = -A^2 - A^{-2}\\) for the loop factor and summing ' +
          '\\(A^{a(s)-b(s)} d^{|s|-1}\\) over all smoothings yields</p>' +
          '<div class="formula-box">' +
            '$$\\langle 3_1\\rangle \\;=\\; -A^{5} - A^{-3} + A^{-7}.$$' +
          '</div>' +
          '<p>Dividing by \\((-A)^{3w} = (-A)^{9}\\) and substituting \\(A = q^{-1/4}\\):</p>' +
          '<div class="formula-box">' +
            '$$V_{3_1}(q) \\;=\\; -q^{-4} + q^{-3} + q^{-1}.$$' +
          '</div>' +
          '<p>The mirror trefoil \\(\\overline{3_1}\\) has \\(V(q) = -q^4 + q^3 + q\\) &mdash; obtained by ' +
          'substituting \\(q \\to q^{-1}\\) &mdash; so the Jones polynomial <em>distinguishes a knot from its ' +
          'mirror</em>. The Alexander polynomial cannot do this: ' +
          '\\(\\Delta_{3_1}(t) = \\Delta_{\\overline{3_1}}(t) = t - 1 + t^{-1}\\).</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>4. The skein relation</h3>' +
          '<p>An equivalent way to characterize \\(V_K\\) is through its oriented <em>skein relation</em>. ' +
          'Write \\(L_+, L_-, L_0\\) for three link diagrams that differ only inside a small disc:</p>' +
          '<ul>' +
            '<li>\\(L_+\\): positive crossing</li>' +
            '<li>\\(L_-\\): negative crossing</li>' +
            '<li>\\(L_0\\): oriented smoothing (no crossing)</li>' +
          '</ul>' +
          '<div class="formula-box">' +
            '$$q^{-1}\\,V_{L_+}(q) \\;-\\; q\\,V_{L_-}(q) \\;=\\; \\bigl(q^{1/2} - q^{-1/2}\\bigr)\\,V_{L_0}(q).$$' +
          '</div>' +
          '<p>Together with \\(V_{\\bigcirc}(q) = 1\\) this uniquely determines \\(V_K\\) for every link &mdash; ' +
          'you can compute by picking any crossing, applying the relation, and inducting on a complexity ' +
          'measure that decreases under skein moves.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>5. Interactive: Jones polynomials of small knots</h3>' +
          '<p>Jones polynomials are tabulated in the KnotInfo and KnotAtlas databases. Select a knot below ' +
          'to see its Jones polynomial alongside the Alexander polynomial for comparison.</p>' +
          '<div class="kl-interactive">' +
            '<div class="kl-controls">' +
              '<label>Knot: ' +
              '<select id="pi-jones-knot">' +
                '<option value="unknot">unknot</option>' +
                '<option value="3_1" selected>3\u2081 (trefoil, right-handed)</option>' +
                '<option value="3_1m">3\u2081 mirror (left-handed)</option>' +
                '<option value="4_1">4\u2081 (figure-eight)</option>' +
                '<option value="5_1">5\u2081 (cinquefoil)</option>' +
                '<option value="5_2">5\u2082</option>' +
                '<option value="6_1">6\u2081</option>' +
                '<option value="6_2">6\u2082</option>' +
                '<option value="6_3">6\u2083</option>' +
                '<option value="7_1">7\u2081</option>' +
                '<option value="L2a1">L2a1 (Hopf link, positive)</option>' +
              '</select></label>' +
            '</div>' +
            '<div class="kl-readout" id="pi-jones-readout"></div>' +
          '</div>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>6. What the Jones polynomial sees &mdash; and what it misses</h3>' +
          '<ul>' +
            '<li><strong>Chirality.</strong> \\(V_{\\overline K}(q) = V_K(q^{-1})\\), so any knot with a ' +
            'non-palindromic Jones polynomial is chiral. Example: \\(3_1\\) is chiral; \\(4_1\\) (figure-eight) ' +
            'has a palindromic Jones polynomial and is in fact <span class="kl-term" title="A knot isotopic to its mirror image; equivalently, admits an orientation-reversing self-homeomorphism of S³ sending K to itself.">amphichiral</span>.</li>' +
            '<li><strong>Orientation-independence.</strong> \\(V_K\\) depends only on the unoriented knot.</li>' +
            '<li><strong>Span &amp; Tait conjectures.</strong> Kauffman, Murasugi, and Thistlethwaite used ' +
            '\\(V_K\\) to resolve long-standing conjectures of Tait (1898): an alternating knot achieves ' +
            'its crossing number on any reduced alternating diagram, and two reduced alternating diagrams ' +
            'of the same knot differ by flypes.</li>' +
            '<li><strong>Unknot detection?</strong> Whether \\(V_K(q) = 1\\) implies \\(K\\) is the unknot ' +
            'is <em>open</em>. The analogous question for the <span class="kl-term" title="Family {J_n(K;q)} of Jones invariants coming from the (n+1)-dimensional irrep of U_q(sl₂); J_1 is the Jones polynomial. Central to the Volume Conjecture.">colored Jones polynomial</span> family and for Khovanov homology is resolved affirmatively ' +
            'by Kronheimer&ndash;Mrowka (2011) via instanton homology.</li>' +
            '<li><strong>Mutation.</strong> The Jones polynomial cannot distinguish mutant knots ' +
            '(e.g. the Conway and Kinoshita&ndash;Terasaka knots share \\(V_K\\)). Khovanov homology ' +
            'sometimes can.</li>' +
          '</ul>' +
          '<p><em>Explore Jones polynomials and domain-coloring plots of \\(V_K\\) on the unit circle ' +
          'in the Knot Explorer tab.</em></p>' +
        '</div>';

      mathRender(el);

      var jonesTable = {
        unknot: { v: '\\(1\\)',                                                 a: '\\(1\\)',             note: 'trivial' },
        '3_1':  { v: '\\(-q^{-4} + q^{-3} + q^{-1}\\)',                         a: '\\(t - 1 + t^{-1}\\)', note: 'right-handed; chiral' },
        '3_1m': { v: '\\(-q^{4} + q^{3} + q\\)',                                 a: '\\(t - 1 + t^{-1}\\)', note: 'mirror; note \\(V\\) swaps \\(q \\leftrightarrow q^{-1}\\)' },
        '4_1':  { v: '\\(q^{-2} - q^{-1} + 1 - q + q^{2}\\)',                    a: '\\(-t + 3 - t^{-1}\\)', note: 'palindromic; amphichiral' },
        '5_1':  { v: '\\(-q^{-7} + q^{-6} - q^{-5} + q^{-4} + q^{-2}\\)',        a: '\\(t^2 - t + 1 - t^{-1} + t^{-2}\\)', note: '(2,5)-torus knot' },
        '5_2':  { v: '\\(-q^{-6} + q^{-5} - q^{-4} + 2q^{-3} - q^{-2} + q^{-1}\\)', a: '\\(2t - 3 + 2t^{-1}\\)', note: 'chiral' },
        '6_1':  { v: '\\(q^{-4} - q^{-3} + q^{-2} - 2q^{-1} + 2 - q + q^{2}\\)', a: '\\(-2t + 5 - 2t^{-1}\\)', note: 'slice; \\(\\Delta(-1) = 9\\)' },
        '6_2':  { v: '\\(q^{-5} - 2q^{-4} + 2q^{-3} - 2q^{-2} + 2q^{-1} - 1 + q\\)', a: '\\(-t^2 + 3t - 3 + 3t^{-1} - t^{-2}\\)', note: '' },
        '6_3':  { v: '\\(-q^{-3} + 2q^{-2} - 2q^{-1} + 3 - 2q + 2q^{2} - q^{3}\\)', a: '\\(t^2 - 3t + 5 - 3t^{-1} + t^{-2}\\)', note: 'palindromic; amphichiral' },
        '7_1':  { v: '\\(-q^{-10} + q^{-9} - q^{-8} + q^{-7} - q^{-6} + q^{-5} + q^{-3}\\)', a: '\\(t^3 - t^2 + t - 1 + t^{-1} - t^{-2} + t^{-3}\\)', note: '(2,7)-torus knot' },
        'L2a1': { v: '\\(-q^{-5/2} - q^{-1/2}\\)',                                a: '(link)',               note: 'Hopf link (positive); \\(V\\) has half-integer exponents (odd components)' }
      };
      var sel = document.getElementById('pi-jones-knot');
      var out = document.getElementById('pi-jones-readout');
      function updateJones() {
        if (!sel || !out) return;
        var row = jonesTable[sel.value] || jonesTable['3_1'];
        out.innerHTML =
          '<div><strong>Jones \\(V_K(q)\\):</strong> ' + row.v + '</div>' +
          '<div style="margin-top:0.4rem"><strong>Alexander \\(\\Delta_K(t)\\):</strong> ' + row.a + '</div>' +
          (row.note ? '<div style="margin-top:0.4rem;color:#555"><em>' + row.note + '</em></div>' : '');
        mathRender(out);
      }
      if (sel) sel.addEventListener('change', updateJones);
      updateJones();
    }

    // ── HOMFLY-PT Polynomial ──────────────────────────────────
    function renderHomflypt(el) {
      el.innerHTML =
        '<div class="expo-panel">' +
          '<h3>1. A two-variable unification</h3>' +
          '<p>Within a year of Jones\u2019s 1984 discovery, six groups independently constructed a ' +
          '<em>two-variable</em> oriented link invariant that specializes to both the Alexander and Jones ' +
          'polynomials: <strong>H</strong>oste, <strong>O</strong>cneanu, <strong>M</strong>illett, ' +
          '<strong>F</strong>reyd, <strong>L</strong>ickorish, <strong>Y</strong>etter (all 1985), and ' +
          'independently <strong>P</strong>rzytycki &amp; <strong>T</strong>raczyk (1987). The combined ' +
          'acronym is HOMFLY-PT.</p>' +
          '<p>The polynomial \\(P_K(a, z) \\in \\mathbb{Z}[a^{\\pm 1}, z^{\\pm 1}]\\) is uniquely ' +
          'determined by</p>' +
          '<div class="formula-box">' +
            '$$P_{\\bigcirc}(a,z) = 1, \\qquad a^{-1}\\,P_{L_+} - a\\,P_{L_-} = z\\,P_{L_0}.$$' +
          '</div>' +
          '<p>Existence is the content of the theorem: any quantity satisfying these two rules on every ' +
          'link diagram is well-defined and independent of the order of skein reductions. The proof ' +
          '(Lickorish&ndash;Millett, Przytycki&ndash;Traczyk) uses the Alexander theorem that every ' +
          'oriented link is the <span class="kl-term" title="Braid closure: join the top endpoints of an n-strand braid β ∈ B_n to the corresponding bottom endpoints by parallel arcs to obtain an oriented link β̂ ⊂ S³.">closure of a braid</span>, and checks invariance under <span class="kl-term" title="Two braid moves (conjugation β ↦ αβα⁻¹ in B_n, and stabilization β ↦ βσ_n^{±1} in B_{n+1}) whose equivalence classes correspond bijectively to oriented links.">Markov moves</span>.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>2. Specializations</h3>' +
          '<p>Because the skein relation is a single equation in two variables, setting ' +
          '\\((a, z)\\) along various curves recovers the earlier one-variable invariants:</p>' +
          '<ul>' +
            '<li><strong>Alexander:</strong> \\(\\;a = 1, \\; z = t^{1/2} - t^{-1/2}\\;\\) gives ' +
            '\\(P_K(1, t^{1/2} - t^{-1/2}) = \\Delta_K(t)\\). The Conway skein ' +
            '\\(\\nabla(L_+) - \\nabla(L_-) = z\\,\\nabla(L_0)\\) emerges at \\(a = 1\\) already.</li>' +
            '<li><strong>Jones:</strong> \\(\\;a = q^{-1}, \\; z = q^{1/2} - q^{-1/2}\\;\\) gives ' +
            '\\(P_K = V_K(q)\\). (Other conventions place \\(a = q\\) or \\(a = q^{N}\\); the three ' +
            'common normalizations agree up to the substitution above.)</li>' +
            '<li><strong>\\(\\mathfrak{sl}_N\\) polynomials:</strong> \\(\\;a = q^{N}, \\; z = q - q^{-1}\\;\\) ' +
            'gives the Reshetikhin&ndash;Turaev invariant of \\(\\mathfrak{sl}_N\\) in its fundamental ' +
            'representation. For \\(N=2\\) this is Jones; for \\(N=3\\) it is the Kuperberg ' +
            '\\(A_2\\) spider invariant; for \\(N \\to 0\\) it degenerates to Alexander.</li>' +
          '</ul>' +
          '<p>So HOMFLY-PT parametrizes a whole one-parameter family of quantum \\(\\mathfrak{sl}_N\\) ' +
          'invariants by a single combinatorial object.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>3. Worked example: the right-handed trefoil \\(3_1\\)</h3>' +
          '<p>Writing \\(P_{3_1}(a, z)\\) and applying the skein relation to one of its three crossings ' +
          '(the resulting \\(L_-\\) is the unknot and \\(L_0\\) is the Hopf link \\(L_+^{\\mathrm{Hopf}}\\)) ' +
          'gives, after the second reduction,</p>' +
          '<div class="formula-box">' +
            '$$P_{3_1}(a, z) \\;=\\; -a^{4} + a^{2} z^{2} + 2a^{2}.$$' +
          '</div>' +
          '<p>Check the specializations:</p>' +
          '<ul>' +
            '<li>\\(a = 1, \\; z = t^{1/2} - t^{-1/2}\\Rightarrow z^2 = t - 2 + t^{-1}\\): ' +
            '\\(P = -1 + (t - 2 + t^{-1}) + 2 = t - 1 + t^{-1} = \\Delta_{3_1}(t).\\) \u2713</li>' +
            '<li>\\(a = q^{-1}, \\; z = q^{1/2} - q^{-1/2}\\Rightarrow z^2 = q - 2 + q^{-1}\\): ' +
            'a direct substitution gives \\(V_{3_1}(q) = -q^{-4} + q^{-3} + q^{-1}\\). \u2713</li>' +
          '</ul>' +
          '<p>The mirror trefoil has \\(P_{\\overline{3_1}}(a,z) = P_{3_1}(a^{-1}, z)\\), so HOMFLY-PT ' +
          'detects chirality (unlike Alexander, like Jones).</p>' +
          '<details class="kl-example">' +
            '<summary>Actual skein reduction</summary>' +
            '<p><strong>(i)</strong> Use Convention B \\(a^{-1}P_{L_+} - a\\,P_{L_-} = z\\,P_{L_0}\\). At one crossing of \\(3_1\\): flipping it unknots the diagram (\\(L_- = \\bigcirc\\)), smoothing it gives the positive Hopf link \\(H\\), so</p>' +
            '<div class="formula-box">$$a^{-1}P(3_1) \\;-\\; a\\,P(\\bigcirc) \\;=\\; z\\,P(H), \\qquad P(\\bigcirc)=1.$$</div>' +
            '<p><strong>(ii)</strong> Apply the skein at one crossing of \\(H\\) itself: flipping gives the two-component unlink \\(\\bigcirc\\sqcup\\bigcirc\\), smoothing gives the unknot. The standard normalization for disjoint unions is \\(P(\\bigcirc\\sqcup\\bigcirc) = \\tfrac{a^{-1}-a}{z}\\,P(\\bigcirc) = \\tfrac{a^{-1}-a}{z}\\). Hence</p>' +
            '<div class="formula-box">$$a^{-1}P(H) \\;-\\; a\\cdot\\tfrac{a^{-1}-a}{z} \\;=\\; z\\cdot 1 \\quad\\Longrightarrow\\quad P(H) \\;=\\; a\\,z \\;+\\; \\tfrac{a - a^{3}}{z}.$$</div>' +
            '<p><strong>(iii)</strong> Substitute back: \\(P(3_1) = a^2 + a\\,z\\,P(H) = a^2 + a\\,z\\bigl(az + \\tfrac{a-a^3}{z}\\bigr) = a^2 + a^2 z^2 + a^2 - a^4 = -a^{4} + a^{2}z^{2} + 2a^{2},\\) matching the tabulated value above. \u2713</p>' +
          '</details>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>4. Interactive: HOMFLY-PT of small knots</h3>' +
          '<p>Select a knot to see its HOMFLY-PT polynomial \\(P_K(a,z)\\) together with the Alexander ' +
          'and Jones specializations derived from it.</p>' +
          '<div class="kl-interactive">' +
            '<div class="kl-controls">' +
              '<label>Knot: ' +
              '<select id="pi-homfly-knot">' +
                '<option value="unknot">unknot</option>' +
                '<option value="3_1" selected>3\u2081 (trefoil)</option>' +
                '<option value="4_1">4\u2081 (figure-eight)</option>' +
                '<option value="5_1">5\u2081</option>' +
                '<option value="5_2">5\u2082</option>' +
                '<option value="6_1">6\u2081</option>' +
                '<option value="6_2">6\u2082</option>' +
                '<option value="6_3">6\u2083</option>' +
              '</select></label>' +
            '</div>' +
            '<div class="kl-readout" id="pi-homfly-readout"></div>' +
          '</div>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>5. Strength &mdash; and what HOMFLY-PT still cannot see</h3>' +
          '<ul>' +
            '<li><strong>Stronger than Alexander \\(\\cup\\) Jones.</strong> The pair ' +
            '\\((5_1, 10_{132})\\) share the same Alexander <em>and</em> Jones polynomials but have ' +
            'different HOMFLY-PT.</li>' +
            '<li><strong>Morton&ndash;Franks&ndash;Williams inequality.</strong> If \\(\\beta(K)\\) is the ' +
            'braid index then ' +
            '\\(\\tfrac{1}{2}(\\mathrm{breadth}_a P_K) + 1 \\;\\leq\\; \\beta(K),\\) often sharp. This was ' +
            'the first general tool to compute braid indices of complicated knots.</li>' +
            '<li><strong>Mutation invariance.</strong> HOMFLY-PT cannot distinguish mutant knots ' +
            '(Conway \\(\\leftrightarrow\\) Kinoshita&ndash;Terasaka). Khovanov and Khovanov&ndash;Rozansky ' +
            'homologies categorify HOMFLY-PT and sometimes detect mutation.</li>' +
            '<li><strong>Categorification.</strong> Khovanov&ndash;Rozansky (2005) built a triply-graded ' +
            'homology theory whose graded Euler characteristic is \\(P_K(a, z)\\), generalizing ' +
            'Khovanov homology. See the Homological Invariants tab.</li>' +
          '</ul>' +
        '</div>';

      mathRender(el);

      var homflyTable = {
        unknot: { p: '\\(1\\)',                                                      d: '\\(1\\)',           j: '\\(1\\)' },
        '3_1':  { p: '\\(-a^{4} + a^{2} z^{2} + 2 a^{2}\\)',                         d: '\\(t - 1 + t^{-1}\\)', j: '\\(-q^{-4} + q^{-3} + q^{-1}\\)' },
        '4_1':  { p: '\\(a^{-2} - 1 + a^{2} - z^{2}\\)',                             d: '\\(-t + 3 - t^{-1}\\)', j: '\\(q^{-2} - q^{-1} + 1 - q + q^{2}\\)' },
        '5_1':  { p: '\\(a^{4} z^{4} + (4 a^{4} - a^{6}) z^{2} + 3 a^{4} - 2 a^{6}\\)', d: '\\(t^{2} - t + 1 - t^{-1} + t^{-2}\\)', j: '\\(-q^{-7} + q^{-6} - q^{-5} + q^{-4} + q^{-2}\\)' },
        '5_2':  { p: '\\(a^{2} + a^{4} - a^{6} + (a^{2} + a^{4})z^{2}\\)',            d: '\\(2t - 3 + 2 t^{-1}\\)', j: '\\(-q^{-6} + q^{-5} - q^{-4} + 2q^{-3} - q^{-2} + q^{-1}\\)' },
        '6_1':  { p: '\\(2 a^{-2} - 3 - 5 z^{2} - z^{4} + 2 a^{2} + 3 a^{2} z^{2} + a^{2} z^{4}\\)', d: '\\(-2t + 5 - 2 t^{-1}\\)', j: '\\(q^{-4} - q^{-3} + q^{-2} - 2q^{-1} + 2 - q + q^{2}\\)' },
        '6_2':  { p: '\\(2 + z^{2} - 2 a^{2} - 3 a^{2} z^{2} - a^{2} z^{4} + a^{4} + a^{4} z^{2}\\)', d: '\\(-t^{2} + 3t - 3 + 3t^{-1} - t^{-2}\\)', j: '\\(q^{-5} - 2q^{-4} + 2q^{-3} - 2q^{-2} + 2q^{-1} - 1 + q\\)' },
        '6_3':  { p: '\\(-a^{-2} - a^{-2} z^{2} + 3 + 3 z^{2} + z^{4} - a^{2} - a^{2} z^{2}\\)', d: '\\(t^{2} - 3t + 5 - 3t^{-1} + t^{-2}\\)', j: '\\(-q^{-3} + 2q^{-2} - 2q^{-1} + 3 - 2q + 2q^{2} - q^{3}\\)' }
      };
      var hSel = document.getElementById('pi-homfly-knot');
      var hOut = document.getElementById('pi-homfly-readout');
      function updateHomfly() {
        if (!hSel || !hOut) return;
        var row = homflyTable[hSel.value] || homflyTable['3_1'];
        hOut.innerHTML =
          '<div><strong>HOMFLY-PT \\(P_K(a,z)\\):</strong> ' + row.p + '</div>' +
          '<div style="margin-top:0.4rem"><strong>\\(a=1,\\;z = t^{1/2}-t^{-1/2}\\Rightarrow \\Delta_K(t)\\):</strong> ' + row.d + '</div>' +
          '<div style="margin-top:0.4rem"><strong>\\(a=q^{-1},\\;z = q^{1/2}-q^{-1/2}\\Rightarrow V_K(q)\\):</strong> ' + row.j + '</div>';
        mathRender(hOut);
      }
      if (hSel) hSel.addEventListener('change', updateHomfly);
      updateHomfly();
    }

    // ── Quantum Link Invariants ───────────────────────────────
    function renderQuantum(el) {
      el.innerHTML =
        '<div class="expo-panel">' +
          '<h3>1. Why &ldquo;quantum&rdquo;?</h3>' +
          '<p>The Jones polynomial was the first of a huge family of invariants built from ' +
          '<strong><span class="kl-term" title="A quantum group U_q(𝔤) is a Hopf-algebra deformation of the universal enveloping algebra U(𝔤); its ribbon category of representations supplies the algebraic data for link invariants.">quantum groups</span></strong> &mdash; <span class="kl-term" title="An associative algebra with compatible comultiplication, counit, and antipode; the algebraic structure underlying group-like symmetries and their deformations.">Hopf-algebra</span> deformations \\(U_q(\\mathfrak{g})\\) of ' +
          'the universal enveloping algebra of a simple Lie algebra, with \\(q\\) a formal parameter. ' +
          'At \\(q = 1\\) one recovers ordinary representation theory; at \\(q\\) generic the category of ' +
          'finite-dimensional \\(U_q(\\mathfrak{g})\\)-modules acquires a non-trivial <em>braiding</em>, ' +
          'which is exactly the algebraic ingredient needed to define link invariants.</p>' +
          '<p>Reshetikhin&ndash;Turaev (1990) turned this observation into a functor</p>' +
          '<div class="formula-box">' +
            '$$Z_{\\mathfrak{g},R} : \\{\\text{oriented framed tangles}\\} \\longrightarrow ' +
            '\\{\\text{finite-dim } \\mathbb{C}(q)\\text{-modules}\\}.$$' +
          '</div>' +
          '<p>Restricted to closed links, \\(Z_{\\mathfrak{g},R}(K) \\in \\mathbb{C}(q)\\) is the ' +
          '<strong>quantum \\((\\mathfrak{g}, R)\\) invariant</strong>.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>2. The R-matrix and braid representations</h3>' +
          '<p>Each crossing is assigned a linear map built from the <em><span class="kl-term" title="Universal R-matrix: an invertible element R ∈ U_q(𝔤)⊗̂U_q(𝔤) satisfying the Yang-Baxter equation and implementing the braiding on representations.">universal R-matrix</span></em> ' +
          '\\(R \\in U_q(\\mathfrak{g}) \\widehat{\\otimes} U_q(\\mathfrak{g})\\). The operator ' +
          '\\(R_{ij}\\) acts on the \\(i\\)-th and \\(j\\)-th tensor factors and satisfies the ' +
          '<strong><span class="kl-term" title="R₁₂ R₁₃ R₂₃ = R₂₃ R₁₃ R₁₂ in End(V⊗V⊗V); the algebraic form of the Reidemeister III move.">Yang&ndash;Baxter equation</span></strong></p>' +
          '<div class="formula-box">' +
            '$$R_{12}\\,R_{13}\\,R_{23} \\;=\\; R_{23}\\,R_{13}\\,R_{12},$$' +
          '</div>' +
          '<p>which is precisely the algebraic form of the Reidemeister III move. Together with ' +
          '\\(R_{i,i+1}\\) being invertible (Reidemeister II) and the quantum trace ' +
          '\\(\\mathrm{tr}_q(x) = \\mathrm{tr}(K_{2\\rho}\\,x)\\) making a closed diagram well-defined ' +
          '(Reidemeister I, up to <span class="kl-term" title="A framing of a knot K is a trivialization of its normal bundle (equivalently, a choice of nonvanishing transverse vector field), recorded as an integer self-linking number for knots in S³.">framing</span>), one has a representation of the braid group \\(B_n\\) and ' +
          'hence an invariant of the closure.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>3. The canonical zoo</h3>' +
          '<table class="dict-table" style="width:100%">' +
            '<thead><tr><th>\\((\\mathfrak{g}, R)\\)</th><th>Invariant</th><th>Notes</th></tr></thead>' +
            '<tbody>' +
              '<tr><td>\\(\\mathfrak{sl}_2,\\; V_2\\)</td><td>Jones polynomial</td><td>fundamental rep; unique Hopf link crossing formula</td></tr>' +
              '<tr><td>\\(\\mathfrak{sl}_2,\\; V_{n+1}\\)</td><td>\\(n\\)-colored Jones \\(J_n(K;q)\\)</td><td>irrep of dim \\(n+1\\); recovers Jones at \\(n=1\\)</td></tr>' +
              '<tr><td>\\(\\mathfrak{sl}_N,\\; V_N\\)</td><td>\\(\\mathfrak{sl}_N\\) polynomial</td><td>specialization \\(a = q^N\\) of HOMFLY-PT</td></tr>' +
              '<tr><td>\\(\\mathfrak{so}_N\\) or \\(\\mathfrak{sp}_{2N}\\)</td><td>Kauffman polynomial</td><td>two-variable, \\(B_n/C_n/D_n\\) types</td></tr>' +
              '<tr><td>\\(\\mathfrak{g}_2\\)</td><td>Kuperberg \\(G_2\\) invariant</td><td>spider calculus</td></tr>' +
              '<tr><td>all \\(\\mathfrak{sl}_N,\\; N \\to 0\\)</td><td>Alexander polynomial</td><td>super-quantum group \\(U_q(\\mathfrak{gl}(1|1))\\)</td></tr>' +
            '</tbody>' +
          '</table>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>4. Colored Jones &amp; the Volume Conjecture</h3>' +
          '<p>The colored Jones polynomials \\(J_n(K; q)\\) are indexed by the dimension \\(n\\) of the ' +
          '\\(\\mathfrak{sl}_2\\) irrep. <strong>Kashaev&rsquo;s</strong> invariant is ' +
          '\\(\\langle K\\rangle_N = J_N(K; e^{2\\pi i/N})\\). The <strong><span class="kl-term" title="Conjecture (Kashaev 1997, H. & J. Murakami 2001): for a hyperbolic knot K, 2π·lim_{N→∞} log|J_N(K; e^{2πi/N})|/N equals the hyperbolic volume of S³ ∖ K.">Volume Conjecture</span></strong> ' +
          '(Kashaev 1997, Murakami&ndash;Murakami 2001) asserts</p>' +
          '<div class="formula-box">' +
            '$$2\\pi\\lim_{N \\to \\infty} \\frac{\\log\\,|J_N(K;\\,e^{2\\pi i/N})|}{N} \\;=\\; \\operatorname{Vol}(S^3 \\setminus K),$$' +
          '</div>' +
          '<p>where the right-hand side is the hyperbolic volume of the knot complement (zero for non-hyperbolic ' +
          'knots). Proved for the figure-eight knot (Ekholm, and later Murakami) and a handful of others; ' +
          'open in general. It is the most striking bridge between quantum topology and hyperbolic geometry.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>5. <span class="kl-term" title="3d gauge theory with action (k/4π)∫Tr(A∧dA + ⅔A∧A∧A); topological (no metric), and Witten (1989) showed its Wilson-loop expectation values reproduce the Jones polynomial and its cousins.">Chern&ndash;Simons</span> <span class="kl-term" title="Topological quantum field theory: a symmetric monoidal functor from the cobordism category to vector spaces, assigning numbers to closed manifolds and vector spaces to their boundaries.">TQFT</span> (Witten 1989)</h3>' +
          '<p>Witten reinterpreted the Jones polynomial as an observable in a 3d topological gauge theory. ' +
          'For a compact gauge group \\(G\\) at level \\(k \\in \\mathbb{Z}_{>0}\\), the Chern&ndash;Simons ' +
          'action on a 3-manifold \\(M\\) is</p>' +
          '<div class="formula-box">' +
            '$$S_{\\mathrm{CS}}[A] \\;=\\; \\frac{k}{4\\pi}\\int_M \\mathrm{Tr}\\!\\left(A \\wedge dA + \\tfrac{2}{3}\\,A \\wedge A \\wedge A\\right),$$' +
          '</div>' +
          '<p>and the expectation value of a Wilson loop \\(W_R(K) = \\mathrm{Tr}_R \\mathcal{P}\\exp\\oint_K A\\) is</p>' +
          '<div class="formula-box">' +
            '$$\\langle W_R(K)\\rangle_k \\;=\\; \\frac{\\int \\mathcal{D}A\\;W_R(K)\\,e^{iS_{\\mathrm{CS}}[A]}}{\\int \\mathcal{D}A\\;e^{iS_{\\mathrm{CS}}[A]}}.$$' +
          '</div>' +
          '<p>For \\(G = SU(2)\\), \\(R\\) the fundamental representation, and \\(q = e^{2\\pi i/(k+2)}\\), ' +
          '\\(\\langle W(K)\\rangle_k = V_K(q)\\). The Reshetikhin&ndash;Turaev construction makes this ' +
          'path integral rigorous as a 3d topological quantum field theory; in the cobordism picture ' +
          'crossings, braids, and Dehn surgery all acquire algebraic counterparts in the modular tensor ' +
          'category of \\(U_q(\\mathfrak{sl}_2)\\).</p>' +
          '<p>The Chern&ndash;Simons perspective directly motivates the Volume Conjecture: in the ' +
          'classical \\(k \\to \\infty\\) limit with an appropriate analytic continuation, the saddle points ' +
          'of the action are flat \\(SL_2(\\mathbb{C})\\) connections on \\(S^3 \\setminus K\\), whose values ' +
          'encode hyperbolic volume.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>6. Interactive: colored Jones of the trefoil</h3>' +
          '<p>Each \\(J_n(3_1;q)\\) is a Laurent polynomial in \\(q\\), tabulated below. ' +
          'The compact Habiro closed form ' +
          '\\(J_n(3_1;q) = \\sum_{k=0}^{n-1} q^{k(n-1)} \\prod_{j=1}^{k}(1 - q^{j-n})\\) ' +
          'is valid as an identity in the cyclotomic completion ' +
          '\\(\\widehat{\\mathbb{Z}[q]} = \\varprojlim_n \\mathbb{Z}[q]/((q;q)_n)\\) ' +
          '(and on the nose at roots of unity); to get a genuine Laurent polynomial, expand each inner product ' +
          '\\(\\prod_{j=1}^{k}(1 - q^{j-n})\\) and collect. The first few:</p>' +
          '<div class="kl-interactive">' +
            '<div class="kl-controls">' +
              '<label>Color \\(n\\): ' +
              '<select id="pi-quantum-n">' +
                '<option value="1">1 (fundamental = Jones)</option>' +
                '<option value="2" selected>2</option>' +
                '<option value="3">3</option>' +
                '<option value="4">4</option>' +
                '<option value="5">5</option>' +
              '</select></label>' +
            '</div>' +
            '<div class="kl-readout" id="pi-quantum-readout"></div>' +
          '</div>' +
        '</div>';

      mathRender(el);

      // Colored Jones of right-handed trefoil (standard normalization: unknot = 1).
      // Values from Habiro's formula; see e.g. Murakami-Murakami (2001) or KnotAtlas.
      var cjTable = {
        '1': '\\(-q^{-4} + q^{-3} + q^{-1}\\)',
        '2': '\\(-q^{-12} + q^{-11} - q^{-9} + q^{-8} + q^{-6} - q^{-5} + q^{-4} + q^{-2}\\)',
        '3': '\\(-q^{-24} + q^{-23} - q^{-21} + q^{-20} - q^{-19} + q^{-18} - q^{-16} + q^{-15} + q^{-13} - q^{-12} + q^{-11} + q^{-10} - q^{-9} + q^{-8} + q^{-6} + q^{-3}\\)',
        '4': '\\(J_4(3_1; q)\\) has 32 terms; leading \\(-q^{-40} + q^{-39} + \\cdots + q^{-6}\\)',
        '5': '\\(J_5(3_1; q)\\) is a degree-\\((5N-4)\\) Laurent polynomial with \\(\\approx 60\\) terms'
      };
      var qsel = document.getElementById('pi-quantum-n');
      var qout = document.getElementById('pi-quantum-readout');
      function updateQuantum() {
        if (!qsel || !qout) return;
        var n = qsel.value;
        qout.innerHTML =
          '<div><strong>\\(J_{' + n + '}(3_1; q)\\):</strong> ' + cjTable[n] + '</div>' +
          '<div style="margin-top:0.4rem;color:#555"><em>At \\(q = e^{2\\pi i/N}\\) and \\(N \\to \\infty\\) ' +
          'the growth rate of \\(|J_N|\\) is conjecturally \\(2\\pi\\) times the hyperbolic volume of the complement; ' +
          'for the trefoil (non-hyperbolic) the volume is \\(0\\) and growth is sub-exponential.</em></div>';
        mathRender(qout);
      }
      if (qsel) qsel.addEventListener('change', updateQuantum);
      updateQuantum();
    }

    // ── Others ────────────────────────────────────────────────
    function renderOthers(el) {
      el.innerHTML =
        '<div class="expo-panel">' +
          '<h3>1. The Conway polynomial \\(\\nabla_K(z)\\)</h3>' +
          '<p>Conway (1970) normalized the Alexander polynomial so that it becomes a true polynomial ' +
          'with integer coefficients. \\(\\nabla_K(z) \\in \\mathbb{Z}[z]\\) is determined by</p>' +
          '<div class="formula-box">' +
            '$$\\nabla_{\\bigcirc}(z) = 1, \\qquad \\nabla_{L_+}(z) - \\nabla_{L_-}(z) = z\\,\\nabla_{L_0}(z).$$' +
          '</div>' +
          '<p>The translation to Alexander is \\(\\Delta_K(t) = \\nabla_K\\!\\left(t^{1/2} - t^{-1/2}\\right)\\). ' +
          'For the trefoil \\(\\nabla_{3_1}(z) = z^2 + 1\\); note ' +
          '\\((t^{1/2} - t^{-1/2})^2 + 1 = t - 1 + t^{-1}\\). Conway built the earliest systematic skein-based ' +
          'tabulation from this relation; it is today the cleanest way to see Alexander\u2019s skein structure ' +
          'without going through Seifert matrices.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>2. The <span class="kl-term" title="Kauffman polynomial F_K(a,z) (1990): two-variable unoriented link invariant from a regular-isotopy state sum; RT-invariant for U_q(so_N)/U_q(sp_{2N}) in the defining representation.">Kauffman polynomial F</span> \\(F_K(a, z)\\)</h3>' +
          '<p>Introduced by Kauffman (1990), the <strong>Kauffman polynomial</strong> is a two-variable ' +
          'invariant of unoriented links, constructed via a state-sum on diagrams modulo regular isotopy ' +
          '(Reidemeister II and III). One builds an auxiliary Laurent polynomial \\(\\Lambda_K(a, z)\\) ' +
          'from the relations</p>' +
          '<div class="formula-box">' +
            '$$\\Lambda_{L_+} + \\Lambda_{L_-} = z\\,(\\Lambda_{L_0} + \\Lambda_{L_\\infty}), \\qquad ' +
            '\\Lambda_{\\bigcirc \\sqcup D} = \\tfrac{a + a^{-1} - z}{z}\\,\\Lambda_D, \\qquad ' +
            '\\Lambda_{\\bigcirc} = 1,$$' +
          '</div>' +
          '<p>with a normalization under the Reidemeister I move: \\(\\Lambda(L_{\\mathrm{curl}\\pm}) = a^{\\pm 1}\\Lambda(L)\\). ' +
          'The final invariant is \\(F_K(a, z) = a^{-w(D)}\\Lambda_D(a, z)\\), where \\(w(D)\\) is the writhe. ' +
          'The Kauffman polynomial specializes to the Jones polynomial at \\((a, z) = (-q^{-3}, q + q^{-1})\\). ' +
          'It is <em>independent</em> of HOMFLY-PT: there exist pairs of knots distinguished by Kauffman ' +
          'but not HOMFLY-PT, and vice versa.</p>' +
          '<p>The quantum-group origin: \\(F_K\\) is the Reshetikhin&ndash;Turaev invariant for ' +
          '\\(U_q(\\mathfrak{so}_N)\\) or \\(U_q(\\mathfrak{sp}_{2N})\\) in its fundamental representation, with ' +
          'the two variables tracking \\(N\\) and \\(q\\).</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>3. <span class="kl-term" title="Vassiliev (finite-type) invariants: knot invariants that vanish on singular knots with sufficiently many double points, once extended by the skein v(×) = v(L₊) − v(L₋).">Vassiliev</span> (<span class="kl-term" title="An invariant v is of finite type (order ≤ n) if its n+1-fold extension to singular knots is zero; the graded pieces V_n/V_{n-1} are finite-dimensional.">finite-type</span>) invariants</h3>' +
          '<p>A knot invariant \\(v\\) with values in an abelian group extends to singular knots ' +
          '(immersed curves with finitely many transverse double points) by the ' +
          '<strong>Vassiliev skein relation</strong></p>' +
          '<div class="formula-box">' +
            '$$v(L_\\times) \\;=\\; v(L_+) - v(L_-).$$' +
          '</div>' +
          '<p>Apply it once for each double point. \\(v\\) is of <em>finite type \\(n\\)</em> (or ' +
          '<em>order \\(\\leq n\\)</em>) if it vanishes on every singular knot with more than \\(n\\) ' +
          'double points. The filtration</p>' +
          '<div class="formula-box">' +
            '$$\\mathcal{V}_0 \\subset \\mathcal{V}_1 \\subset \\mathcal{V}_2 \\subset \\cdots$$' +
          '</div>' +
          '<p>on the space of all rational-valued knot invariants has finite-dimensional graded pieces. ' +
          '<em>Every</em> coefficient of \\(V_K\\), \\(\\Delta_K\\), \\(P_K(a,z)\\), or \\(F_K(a,z)\\) when ' +
          'expanded near a suitable point is a finite-type invariant; in this sense Vassiliev invariants ' +
          'are the universal target for all classical polynomial invariants.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>4. <span class="kl-term" title="Weight system: a linear functional on the space of chord diagrams satisfying the 4T (and, unframed, 1T) relations. The symbol of a finite-type invariant of order n is its weight system.">Weight systems</span> and <span class="kl-term" title="Chord diagram of order n: an oriented circle with n chords connecting 2n marked points, considered up to orientation-preserving diffeomorphism of the circle.">chord diagrams</span></h3>' +
          '<p>The symbol of a finite-type invariant of order \\(n\\) is a function \\(w\\) on ' +
          '<strong>chord diagrams</strong> with \\(n\\) chords (pairings on \\(2n\\) points of an oriented ' +
          'circle). It satisfies the <strong><span class="kl-term" title="Four-term relation: the fundamental local relation w(D_1) − w(D_2) − w(D_3) + w(D_4) = 0 among four chord diagrams differing by moving one chord endpoint past a neighbor.">4T relation</span></strong></p>' +
          '<div class="formula-box">' +
            '$$w(D_1) - w(D_2) - w(D_3) + w(D_4) = 0,$$' +
          '</div>' +
          '<p>(schematic: a local move on four chord endpoints) together with the framing-independence ' +
          '<strong>1T relation</strong> for the unframed setting. The space \\(\\mathcal{A}(\\bigcirc)\\) ' +
          'of chord diagrams modulo 4T is a commutative bialgebra under disjoint union, and its graded ' +
          'dual is the full space of finite-type invariants.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>5. The <span class="kl-term" title="Kontsevich integral (1993): a universal ℚ-valued finite-type invariant Z(K) ∈ 𝒜(S¹), defined by iterated integrals against a Morse presentation of K; every rational Vassiliev invariant factors through it.">Kontsevich integral</span> &mdash; a universal finite-type invariant</h3>' +
          '<p>Kontsevich (1993) defined a formal series</p>' +
          '<div class="formula-box">' +
            '$$Z(K) \\;=\\; \\sum_{m=0}^{\\infty} \\frac{1}{(2\\pi i)^m} \\int_{t_1 < \\cdots < t_m} \\sum_{P} ' +
            '(-1)^{\\downarrow P} D_P \\prod_{j=1}^{m} \\frac{dz_j - dz_j\'}{z_j - z_j\'} \\;\\in\\; \\mathcal{A}(\\bigcirc),$$' +
          '</div>' +
          '<p>depending on a Morse-theoretic presentation of \\(K \\subset \\mathbb{R}^2_{z} \\times \\mathbb{R}_t\\). ' +
          'The integral is manifestly defined in \\(\\mathcal{A}(\\bigcirc)\\) (chord diagrams modulo 4T). ' +
          'Its degree-\\(n\\) part is a universal order-\\(n\\) invariant: every \\(\\mathbb{Q}\\)-valued Vassiliev ' +
          'invariant factors through \\(Z\\) uniquely. Composing \\(Z\\) with the <em>Lie algebra weight system</em> ' +
          'for \\((\\mathfrak{g}, R)\\) recovers the \\((\\mathfrak{g}, R)\\) quantum invariant (Le&ndash;Murakami, ' +
          'Kontsevich): every quantum invariant is a specialization of \\(Z\\). This places all polynomial ' +
          'and quantum invariants on the same footing.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>6. <span class="kl-term" title="ω ↦ σ_ω(K) for ω ∈ S¹∖{1}: a step function on the unit circle refining the classical signature σ(K) = σ_{−1}(K); each value is a smooth concordance invariant.">Signature function</span> \\(\\sigma_\\omega(K)\\) and <span class="kl-term" title="Levine-Tristram signatures σ_ω(K) = sign((1−ω)V + (1−ω̄)V^T) for a Seifert matrix V; produce 4-genus and sliceness obstructions.">Levine&ndash;Tristram invariants</span></h3>' +
          '<p>Most polynomial invariants so far are <em>topological</em> (isotopy invariants); one can also ' +
          'make <em>concordance</em> invariants from Seifert matrices. For \\(\\omega \\in S^1 \\setminus \\{1\\}\\), ' +
          'the <strong>Levine&ndash;Tristram signature</strong> is</p>' +
          '<div class="formula-box">' +
            '$$\\sigma_\\omega(K) \\;=\\; \\operatorname{sign}\\bigl((1-\\omega)\\,V + (1-\\bar\\omega)\\,V^{T}\\bigr),$$' +
          '</div>' +
          '<p>where \\(V\\) is any Seifert matrix. The function \\(\\omega \\mapsto \\sigma_\\omega(K)\\) is a step ' +
          'function on \\(S^1\\) with jumps at the zeros of \\(\\Delta_K\\) on the unit circle. Specializing to ' +
          '\\(\\omega = -1\\) recovers the ordinary signature \\(\\sigma(K) = \\sigma_{-1}(K)\\). Each ' +
          '\\(\\sigma_\\omega\\) is a <em>smooth concordance</em> invariant, giving lower bounds on the ' +
          '4-genus and obstructions to <span class="kl-term" title="A knot K ⊂ S³ is slice (smoothly) if it bounds a smoothly embedded disk in B⁴; topologically slice if it bounds a locally flat disk.">sliceness</span>.</p>' +
        '</div>' +

        '<div class="expo-panel">' +
          '<h3>7. Further polynomial families</h3>' +
          '<ul>' +
            '<li><strong><span class="kl-term" title="Brandt-Lickorish-Millett / Ho polynomial Q_K(z): a one-variable unoriented invariant, obtainable as the specialization F_K(1, z) of the Kauffman polynomial.">BLM / Ho polynomial</span></strong> (Brandt&ndash;Lickorish&ndash;Millett, Ho 1985): an unoriented ' +
            'one-variable specialization of the Kauffman polynomial, \\(Q_K(z) = F_K(1, z)\\).</li>' +
            '<li><strong><span class="kl-term" title="Akutsu-Deguchi-Ohtsuki invariants: a family of knot polynomials from nilpotent (non-semisimple) representations of U_q(sl₂) at roots of unity; generalize Alexander and feed into the Costantino-Geer-Patureau-Mirand non-semisimple TQFT.">Akutsu&ndash;Deguchi&ndash;Ohtsuki (ADO) polynomials</span></strong>: \\(N\\)-th roots of unity ' +
            'values of the colored Jones, the \\(\\mathfrak{sl}_2\\) analogue of the ADO / Nahm-sum invariants ' +
            'and an input to the non-semisimple TQFT of Costantino&ndash;Geer&ndash;Patureau-Mirand.</li>' +
            '<li><strong>Multi-variable Alexander \\(\\Delta_L(t_1,\\ldots,t_n)\\)</strong>: for an \\(n\\)-component ' +
            'link, extracted from the Alexander module of the maximal abelian cover \\(H_1(\\widetilde{L})\\). ' +
            'Vanishes identically on boundary links and carries more information than the one-variable version.</li>' +
          '</ul>' +
          '<p>All of the above fit as specializations or refinements of the Kontsevich / Reshetikhin&ndash;Turaev ' +
          'machinery &mdash; the central unifying theme of 20th-century quantum topology.</p>' +
        '</div>';
      mathRender(el);
    }

    render();
  };
})();
