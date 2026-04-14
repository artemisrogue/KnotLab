/**
 * miscellaneous.js — Miscellaneous module for KnotLab
 * Exposes window.renderMiscellaneous(containerEl)
 */
(function () {
  'use strict';

  var TABS = ['Numerical Invariants', 'The Knot Group', 'Virtual Knots'];

  function numericalInvariantsHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Numerical Invariants of Knots</h3>' +
        '<p>Numerical invariants assign an integer (or sometimes a rational number) to each knot. ' +
        'They are typically easy to state but can be extremely difficult to compute. ' +
        'This page collects the most commonly encountered numerical invariants.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Crossing Number</h4>' +
        '<p>The <strong>crossing number</strong> \\(c(K)\\) of a knot \\(K\\) is the minimum number of crossings ' +
        'over all diagrams representing \\(K\\). The Rolfsen table organizes knots by crossing number. ' +
        'Computing the crossing number requires considering all possible diagrams, making it ' +
        'notoriously difficult in general.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Unknotting Number</h4>' +
        '<p>The <strong>unknotting number</strong> \\(u(K)\\) is the minimum number of crossing changes ' +
        '(switching an over-crossing to an under-crossing or vice versa) needed to convert \\(K\\) ' +
        'into the unknot. For example, \\(u(3_1) = 1\\) and \\(u(5_1) = 2\\). Upper bounds come from ' +
        'explicit unknotting sequences; lower bounds from invariants like the signature or \\(s\\)-invariant.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Bridge Number</h4>' +
        '<p>The <strong>bridge number</strong> \\(b(K)\\) is the minimum, over all regular projections, of the ' +
        'number of local maxima of the knot. Every knot with bridge number 1 is the unknot. ' +
        'The trefoil has bridge number 2 (it is a 2-bridge knot). Schubert classified 2-bridge knots ' +
        'via continued fractions.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Three-Genus (Seifert Genus)</h4>' +
        '<p>The <strong>three-genus</strong> \\(g(K)\\) is the minimal genus among all Seifert surfaces bounded by \\(K\\). ' +
        'The unknot is the only knot with genus 0. The genus satisfies \\(g(K_1 \\# K_2) = g(K_1) + g(K_2)\\), ' +
        'making it additive under connected sum. Knot Floer homology detects the genus.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Signature</h4>' +
        '<p>The <strong>signature</strong> \\(\\sigma(K)\\) is the signature (number of positive eigenvalues minus ' +
        'number of negative eigenvalues) of the symmetrized Seifert matrix \\(V + V^T\\). ' +
        'It is always even for knots, provides a lower bound on the unknotting number ' +
        '(\\(|\\sigma(K)| \\leq 2u(K)\\)), and is a concordance invariant.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Determinant</h4>' +
        '<p>The <strong>determinant</strong> \\(\\det(K) = |\\Delta_K(-1)|\\) equals the absolute value of the Alexander ' +
        'polynomial evaluated at \\(t = -1\\), or equivalently \\(|\\det(V + V^T)|\\). It is always a positive ' +
        'odd integer for knots. The determinant also equals the order of the first homology of the ' +
        'double branched cover of \\(S^3\\) branched along \\(K\\).</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Arf Invariant</h4>' +
        '<p>The <strong>Arf invariant</strong> \\(\\mathrm{Arf}(K) \\in \\{0, 1\\}\\) is defined via the Seifert form ' +
        'on a Seifert surface. It equals \\(\\Delta_K(-1) \\pmod{2}\\). The Arf invariant vanishes for ' +
        'slice knots (knots bounding smooth disks in \\(B^4\\)).</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<p><em>These invariants are computed for 500+ knots in the Knot Explorer tab.</em></p>' +
      '</div>';
  }

  function virtualKnotsHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>Virtual Knots</h3>' +
        '<p><strong>Virtual knot theory</strong>, introduced by Kauffman in 1999, extends classical knot theory ' +
        'by allowing <em>virtual crossings</em> in addition to the usual over/under crossings. ' +
        'Virtual crossings represent artifacts of projection and are drawn as circled intersections.</p>' +
        '<p>Virtual knots arise naturally in several contexts:</p>' +
        '<ul style="line-height:1.8;">' +
          '<li>Knots in thickened surfaces \\(\\Sigma \\times [0,1]\\), where \\(\\Sigma\\) has genus \\(\\geq 1\\).</li>' +
          '<li>Gauss codes that are not realizable as classical knot diagrams in the plane.</li>' +
          '<li>Abstract knot diagrams modulo generalized Reidemeister moves (including a detour move for virtual crossings).</li>' +
        '</ul>' +
        '<p>Many classical invariants extend to virtual knots, but there are also purely virtual invariants ' +
        'such as the <em>odd writhe</em>, <em>index polynomial</em>, <em>writhe polynomial</em>, ' +
        'and <em>arrow polynomial</em>.</p>' +
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
        // Hide the header and tab bar in the iframe
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

  function knotGroupHTML() {
    return '' +
      '<div class="expo-panel">' +
        '<h3>The Knot Group</h3>' +
        '<p>The <strong>knot group</strong> of a knot \\(K\\) is the fundamental group of its complement:</p>' +
        '<div class="formula-box">' +
          '$$\\pi_1(S^3 \\setminus K)$$' +
        '</div>' +
        '<p>This is one of the most important knot invariants. The knot group contains a great deal ' +
        'of topological information about the knot and its complement.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Wirtinger Presentation</h4>' +
        '<p>Given a knot diagram with \\(n\\) crossings, the <strong>Wirtinger presentation</strong> gives a ' +
        'presentation of the knot group with \\(n\\) generators (one per arc) and \\(n\\) relations ' +
        '(one per crossing). At each crossing, if arc \\(x_k\\) passes over the crossing between ' +
        'arcs \\(x_i\\) and \\(x_j\\), the relation is:</p>' +
        '<div class="formula-box">' +
          '$$x_j = x_k^{-1} x_i x_k$$' +
        '</div>' +
        '<p>One relation is always redundant, so the presentation has \\(n\\) generators and \\(n-1\\) relations.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Examples</h4>' +
        '<ul style="line-height:2;">' +
          '<li><strong>Unknot:</strong> \\(\\pi_1(S^3 \\setminus 0_1) \\cong \\mathbb{Z}\\).</li>' +
          '<li><strong>Trefoil:</strong> \\(\\pi_1(S^3 \\setminus 3_1) \\cong \\langle a, b \\mid a^2 = b^3 \\rangle\\), ' +
          'isomorphic to the braid group \\(B_3\\).</li>' +
          '<li><strong>Figure-eight:</strong> \\(\\pi_1(S^3 \\setminus 4_1) \\cong \\langle a, b \\mid a b^{-1} a^{-1} b a = b a b^{-1} a^{-1} b \\rangle\\).</li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Properties</h4>' +
        '<p>The knot group has several remarkable properties:</p>' +
        '<ul style="line-height:1.8;">' +
          '<li>The abelianization is always \\(\\mathbb{Z}\\), generated by the meridian.</li>' +
          '<li>The knot group detects the unknot: \\(K\\) is trivial iff \\(\\pi_1(S^3 \\setminus K) \\cong \\mathbb{Z}\\).</li>' +
          '<li>The <strong>Gordon\u2013Luecke theorem</strong> (1989) states that the knot complement determines the knot ' +
          'up to mirror image. Combined with peripheral structure, the knot group is a complete invariant for prime knots.</li>' +
          '<li>The Alexander polynomial can be derived from the knot group via Fox calculus.</li>' +
        '</ul>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<h4>Peripheral System</h4>' +
        '<p>The <strong>peripheral system</strong> consists of the knot group together with a distinguished pair ' +
        'of elements: the <em>meridian</em> \\(\\mu\\) (a small loop linking the knot once) and the ' +
        '<em>longitude</em> \\(\\lambda\\) (a curve on the boundary of a tubular neighbourhood that is ' +
        'homologically trivial in the complement). The peripheral system is a complete invariant for ' +
        'prime knots.</p>' +
      '</div>' +
      '<div class="expo-panel">' +
        '<p><em>More content to come.</em></p>' +
      '</div>';
  }

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
      tabBtns.forEach(function (b, i) {
        b.classList.toggle('active', i === idx);
      });
      renderTab(idx);
    }

    function renderTab(idx) {
      content.innerHTML = (idx === 0) ? numericalInvariantsHTML() : (idx === 1) ? knotGroupHTML() : virtualKnotsHTML();
      if (idx === 2) initVirtualFrame();
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
