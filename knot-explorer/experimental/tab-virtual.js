/**
 * tab-virtual.js -- Virtual Knots tab for the knot explorer
 *
 * Provides UI for entering extended Gauss codes of virtual knots/links,
 * computing invariants (Jones polynomial, odd writhe, index polynomial,
 * writhe polynomial, arrow polynomial, affine index polynomial, parity
 * bracket), rendering SVG diagrams, and browsing a pre-loaded database.
 *
 * Depends on:
 *   - polynomial.js   (LaurentPoly, CoefficientRing)
 *   - gauss-code.js   (parseGaussCode, gaussWrithe, isRealizable, ...)
 *   - virtual-invariants.js (VirtualInvariants)
 *   - KaTeX (renderMathInElement)
 */

(function () {
  'use strict';

  // ================================================================
  //  State
  // ================================================================

  var db = null;           // virtual-knots.json contents (keyed by id)
  var currentGC = null;    // parsed Gauss code for the active knot
  var currentId = null;    // database id of the currently selected knot (or null)

  // ================================================================
  //  Helpers
  // ================================================================

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') node.className = attrs[k];
        else if (k === 'textContent') node.textContent = attrs[k];
        else if (k === 'innerHTML') node.innerHTML = attrs[k];
        else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (typeof children === 'string') {
      node.textContent = children;
    } else if (Array.isArray(children)) {
      children.forEach(function (c) { if (c) node.appendChild(c); });
    }
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  /** Safely run KaTeX renderMathInElement if available. */
  function renderMath(container) {
    if (typeof renderMathInElement === 'function') {
      try {
        renderMathInElement(container, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      } catch (_) { /* ignore */ }
    }
  }

  /** Check whether the library modules we need are loaded. */
  function hasGaussCode() {
    return typeof parseGaussCode === 'function';
  }

  function hasVirtualInvariants() {
    return typeof VirtualInvariants !== 'undefined';
  }

  /** Create a badge span. cls is 'pass', 'fail', or 'info'. */
  function badge(text, cls) {
    return el('span', { className: 'exp-badge ' + cls, textContent: text });
  }

  // ================================================================
  //  SVG Diagram Renderer (improved planar layout)
  // ================================================================

  /**
   * Render a virtual knot diagram as SVG from a parsed Gauss code.
   *
   * Layout: crossings placed on a circle with smooth cubic Bezier arcs
   * between consecutive appearances. Classical crossings show over/under
   * with a gap; virtual crossings show a circle marker.
   */
  function renderDiagram(gc, options) {
    options = options || {};
    var SVG_SIZE = options.size || 400;
    var CX = SVG_SIZE / 2;
    var CY = SVG_SIZE / 2;
    var RADIUS = SVG_SIZE * 0.35;
    var VIRTUAL_R = 7;
    var GAP = 10;

    var seq = [];
    gc.components.forEach(function (comp) {
      comp.forEach(function (c) { seq.push(c); });
    });

    var n = seq.length;
    if (n === 0) return el('div', { textContent: 'No crossings to display.' });

    // Position each appearance on the circle
    var positions = [];
    for (var i = 0; i < n; i++) {
      var angle = (2 * Math.PI * i) / n - Math.PI / 2;
      positions.push({
        x: CX + RADIUS * Math.cos(angle),
        y: CY + RADIUS * Math.sin(angle)
      });
    }

    // For each crossing id, find its two positions
    var idPositions = {};
    for (var j = 0; j < n; j++) {
      var cid = seq[j].id;
      if (!idPositions[cid]) idPositions[cid] = [];
      idPositions[cid].push(j);
    }

    // Build SVG
    var svg = svgEl('svg', {
      width: SVG_SIZE, height: SVG_SIZE,
      viewBox: '0 0 ' + SVG_SIZE + ' ' + SVG_SIZE,
      style: 'max-width:100%;height:auto;'
    });

    // Defs
    var defs = svgEl('defs');
    var marker = svgEl('marker', {
      id: 'vk-arrow2', markerWidth: '8', markerHeight: '6',
      refX: '8', refY: '3', orient: 'auto', markerUnits: 'strokeWidth'
    });
    marker.appendChild(svgEl('path', { d: 'M0,0 L8,3 L0,6 Z', fill: '#333' }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Component colors for links
    var compColors = ['#333', '#2171b5', '#d6604d', '#6a3d9a', '#e6ab02'];

    // Draw arcs between consecutive appearances using cubic Beziers
    var globalIdx = 0;
    gc.components.forEach(function (comp, compIdx) {
      var compLen = comp.length;
      var color = compColors[compIdx % compColors.length];

      for (var ci = 0; ci < compLen; ci++) {
        var fromIdx = globalIdx + ci;
        var toIdx = globalIdx + ((ci + 1) % compLen);
        var p1 = positions[fromIdx];
        var p2 = positions[toIdx];

        // Compute cubic Bezier control points for smooth curves
        // Tangent at each point follows the circle
        var a1 = (2 * Math.PI * fromIdx) / n - Math.PI / 2;
        var a2 = (2 * Math.PI * toIdx) / n - Math.PI / 2;
        var segLen = Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
        var tension = segLen * 0.35;

        // Tangent direction at each point (perpendicular to radius = along circle)
        var cp1x = p1.x + tension * Math.cos(a1 + Math.PI / 2);
        var cp1y = p1.y + tension * Math.sin(a1 + Math.PI / 2);
        var cp2x = p2.x - tension * Math.cos(a2 + Math.PI / 2);
        var cp2y = p2.y - tension * Math.sin(a2 + Math.PI / 2);

        var arc = svgEl('path', {
          d: 'M' + p1.x.toFixed(1) + ',' + p1.y.toFixed(1) +
             ' C' + cp1x.toFixed(1) + ',' + cp1y.toFixed(1) +
             ' ' + cp2x.toFixed(1) + ',' + cp2y.toFixed(1) +
             ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1),
          fill: 'none',
          stroke: color,
          'stroke-width': '2.5',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        });
        svg.appendChild(arc);

        // Orientation arrow at midpoint of every other arc
        if (ci % 2 === 0) {
          var mt = 0.5;
          var mx = (1-mt)*(1-mt)*(1-mt)*p1.x + 3*(1-mt)*(1-mt)*mt*cp1x + 3*(1-mt)*mt*mt*cp2x + mt*mt*mt*p2.x;
          var my = (1-mt)*(1-mt)*(1-mt)*p1.y + 3*(1-mt)*(1-mt)*mt*cp1y + 3*(1-mt)*mt*mt*cp2y + mt*mt*mt*p2.y;
          var dt = 0.02;
          var mx2 = (1-mt-dt)*(1-mt-dt)*(1-mt-dt)*p1.x + 3*(1-mt-dt)*(1-mt-dt)*(mt+dt)*cp1x + 3*(1-mt-dt)*(mt+dt)*(mt+dt)*cp2x + (mt+dt)*(mt+dt)*(mt+dt)*p2.x;
          var my2 = (1-mt-dt)*(1-mt-dt)*(1-mt-dt)*p1.y + 3*(1-mt-dt)*(1-mt-dt)*(mt+dt)*cp1y + 3*(1-mt-dt)*(mt+dt)*(mt+dt)*cp2y + (mt+dt)*(mt+dt)*(mt+dt)*p2.y;
          var aa = Math.atan2(my2 - my, mx2 - mx);
          var as = 5;
          svg.appendChild(svgEl('polygon', {
            points: mx.toFixed(1)+','+my.toFixed(1)+' '+
                    (mx-as*Math.cos(aa-0.45)).toFixed(1)+','+(my-as*Math.sin(aa-0.45)).toFixed(1)+' '+
                    (mx-as*Math.cos(aa+0.45)).toFixed(1)+','+(my-as*Math.sin(aa+0.45)).toFixed(1),
            fill: color, opacity: '0.7'
          }));
        }
      }
      globalIdx += compLen;
    });

    // Draw crossing decorations on top
    Object.keys(idPositions).forEach(function (idStr) {
      var poses = idPositions[idStr];
      if (poses.length !== 2) return;

      var isVirtual = seq[poses[0]].isVirtual;

      var cx = (positions[poses[0]].x + positions[poses[1]].x) / 2;
      var cy = (positions[poses[0]].y + positions[poses[1]].y) / 2;

      if (isVirtual) {
        // Virtual crossing: circle marker
        svg.appendChild(svgEl('circle', {
          cx: cx.toFixed(1), cy: cy.toFixed(1), r: VIRTUAL_R,
          fill: '#fff', stroke: 'var(--virtual-accent, #1b9e77)', 'stroke-width': '2.5'
        }));
      } else {
        // Classical crossing: white background circle, then sign
        svg.appendChild(svgEl('circle', {
          cx: cx.toFixed(1), cy: cy.toFixed(1), r: (GAP).toFixed(1),
          fill: '#fff', stroke: '#ccc', 'stroke-width': '1'
        }));
        var signChar = seq[poses[0]].sign > 0 ? '+' : '\u2212';
        var lbl = svgEl('text', {
          x: cx.toFixed(1), y: (cy + 4).toFixed(1),
          'text-anchor': 'middle', 'font-size': '11', 'font-weight': '700', fill: '#333'
        });
        lbl.textContent = signChar;
        svg.appendChild(lbl);
      }

      // Crossing ID label
      var labelOffset = 16;
      var dx = cx - CX;
      var dy = cy - CY;
      var dd = Math.sqrt(dx*dx + dy*dy) || 1;
      var tx = cx + (dx/dd) * labelOffset;
      var ty = cy + (dy/dd) * labelOffset;
      var idLbl = svgEl('text', {
        x: tx.toFixed(1), y: (ty + 3).toFixed(1),
        'text-anchor': 'middle', 'font-size': '9', 'font-weight': '600',
        fill: isVirtual ? 'var(--virtual-accent)' : '#888'
      });
      idLbl.textContent = idStr + (isVirtual ? 'v' : '');
      svg.appendChild(idLbl);
    });

    return svg;
  }

  // ================================================================
  //  Invariant computation
  // ================================================================

  function computeInvariants(gc, container) {
    container.innerHTML = '';

    if (!hasGaussCode()) {
      container.appendChild(el('div', {
        className: 'exp-card',
        innerHTML: '<h3>Library Not Loaded</h3>' +
          '<p>gauss-code.js is not available. Cannot compute invariants.</p>'
      }));
      return;
    }

    var dbEntry = currentId && db ? db[currentId] : null;

    // Basic info card
    var infoCard = el('div', { className: 'exp-card' });
    infoCard.appendChild(el('h3', {}, 'Crossing Information'));
    var infoContent = el('div');
    infoContent.innerHTML =
      '<p><strong>Classical crossings:</strong> ' + gc.numClassical + '</p>' +
      '<p><strong>Virtual crossings:</strong> ' + gc.numVirtual + '</p>' +
      '<p><strong>Components:</strong> ' + gc.components.length + '</p>' +
      '<p><strong>Writhe:</strong> ' + gaussWrithe(gc) + '</p>';

    var realizable = isRealizable(gc);
    var realizeLine = el('p');
    realizeLine.appendChild(el('strong', {}, 'Classical realizability: '));
    realizeLine.appendChild(document.createTextNode(realizable ? 'Yes' : 'No'));
    if (!realizable) {
      realizeLine.appendChild(badge('genuinely virtual', 'info'));
    }
    infoContent.appendChild(realizeLine);
    infoCard.appendChild(infoContent);
    container.appendChild(infoCard);

    // If VirtualInvariants is not loaded, show message and return
    if (!hasVirtualInvariants()) {
      container.appendChild(el('div', {
        className: 'exp-card',
        innerHTML: '<h3>Invariant Library Not Loaded</h3>' +
          '<p>virtual-invariants.js is not available. Only basic crossing information is shown above.</p>'
      }));
      return;
    }

    // Jones Polynomial
    buildInvariantCard(container, 'Jones Polynomial $V(q)$', function (body) {
      var expo = el('div', { className: 'vk-inv-expo' });
      expo.innerHTML =
        '<p>The <strong>Jones polynomial</strong> $V(q) \\in \\mathbb{Z}[q^{\\pm 1}]$ is computed ' +
        'from the <strong>Kauffman bracket</strong> via the state sum formula:</p>' +
        '$$\\langle K \\rangle = \\sum_{v \\in \\{0,1\\}^n} A^{\\sigma(v)} (-A^2 - A^{-2})^{c(v)-1}$$' +
        '<p>where $\\sigma(v)$ is the sign exponent and $c(v)$ is the number of circles in resolution $v$. ' +
        'The Jones polynomial is then $V(q) = (-1)^w A^{-3w} \\langle K \\rangle \\big|_{A=q^{-1/4}}$.</p>' +
        '<p>For virtual knots, <strong>virtual crossings are inert</strong>: they do not participate in the ' +
        'state sum. The bracket is computed using only the classical crossings. This means the Jones polynomial ' +
        'of a virtual knot is invariant under generalized Reidemeister moves but may fail to distinguish ' +
        'virtual knots that differ only in their virtual crossing structure.</p>';
      body.appendChild(expo);
      try {
        var jones = VirtualInvariants.jonesPolynomial(gc);
        var polyDiv = el('div', { className: 'exp-poly' });
        polyDiv.innerHTML = '$V(q) = ' + jones.toLatex('q') + '$';
        if (dbEntry && dbEntry.jones) {
          var expected = LaurentPoly.fromLatex(dbEntry.jones);
          if (jones.equals(expected)) polyDiv.appendChild(badge('\u2713 matches database', 'pass'));
          else polyDiv.appendChild(badge('\u2717 differs', 'fail'));
        }
        body.appendChild(polyDiv);
      } catch (err) {
        body.appendChild(el('p', { textContent: 'Error: ' + err.message }));
      }
      renderMath(body);
    });

    // Writhe
    buildInvariantCard(container, 'Writhe $w(K)$', function (body) {
      var expo = el('div', { className: 'vk-inv-expo' });
      expo.innerHTML =
        '<p>The <strong>writhe</strong> $w(K) = \\sum_c \\epsilon(c)$ is the sum of the signs of all classical ' +
        'crossings. It is <em>not</em> a knot invariant (it changes under Reidemeister I moves), but it ' +
        'plays a crucial role in normalizing the Kauffman bracket to obtain the Jones polynomial.</p>' +
        '<p>For oriented diagrams, the crossing sign $\\epsilon(c) = \\pm 1$ is determined by the ' +
        'orientation of the two strands at the crossing, using the right-hand rule.</p>';
      body.appendChild(expo);
      var w = gaussWrithe(gc);
      var wDiv = el('div', { className: 'exp-poly' });
      wDiv.innerHTML = '$w(K) = ' + w + '$';
      body.appendChild(wDiv);
      renderMath(body);
    });

    // Odd Writhe
    buildInvariantCard(container, 'Odd Writhe $J(K)$', function (body) {
      var expo = el('div', { className: 'vk-inv-expo' });
      expo.innerHTML =
        '<p>The <strong>odd writhe</strong> (or <em>J-invariant</em>) is defined by:</p>' +
        '$$J(K) = \\sum_{c \\text{ odd}} \\epsilon(c)$$' +
        '<p>where the sum is over all <strong>odd crossings</strong>. A classical crossing $c$ is <em>odd</em> ' +
        'if the number of crossings encountered when traversing the knot from one passage of $c$ to the other ' +
        '(along either arc) is odd. Otherwise it is <em>even</em>.</p>' +
        '<p>The odd writhe is a <strong>virtual knot invariant</strong> (unchanged under all generalized ' +
        'Reidemeister moves). For classical knots, every crossing is even, so $J(K) = 0$ for any classical ' +
        'knot. Thus:</p>' +
        '<div class="vk-highlight-box"><strong>Classicality test:</strong> If $J(K) \\neq 0$, then $K$ is ' +
        'genuinely virtual \u2014 it cannot be equivalent to any classical knot.</div>';
      body.appendChild(expo);
      try {
        var ow = VirtualInvariants.oddWrithe(gc);
        var owDiv = el('div', { className: 'exp-poly' });
        owDiv.innerHTML = '$J(K) = ' + ow + '$';
        if (dbEntry && typeof dbEntry.odd_writhe === 'number') {
          if (ow === dbEntry.odd_writhe) owDiv.appendChild(badge('\u2713 matches', 'pass'));
          else owDiv.appendChild(badge('\u2717 differs', 'fail'));
        }
        body.appendChild(owDiv);
        if (ow !== 0) {
          body.appendChild(el('p', {}));
          body.lastChild.appendChild(badge('genuinely virtual', 'info'));
          body.lastChild.appendChild(document.createTextNode(' Non-zero odd writhe proves this is genuinely virtual.'));
        }
      } catch (err) {
        body.appendChild(el('p', { textContent: 'Error: ' + err.message }));
      }
      renderMath(body);
    });

    // Index Polynomial
    buildInvariantCard(container, 'Index Polynomial $f_K(t)$', function (body) {
      var expo = el('div', { className: 'vk-inv-expo' });
      expo.innerHTML =
        '<p>The <strong>index</strong> of a classical crossing $c$ in a virtual knot diagram is an integer ' +
        'defined as follows. Starting at crossing $c$, traverse the knot in one direction, counting $+1$ for ' +
        'each crossing where you pass over and $-1$ for each crossing where you pass under, until you return ' +
        'to $c$ from the other strand. The result is $\\text{ind}(c)$.</p>' +
        '<p>The <strong>index polynomial</strong> is:</p>' +
        '$$f_K(t) = \\sum_{c} \\epsilon(c) \\cdot t^{\\text{ind}(c)}$$' +
        '<p>For classical knots, every crossing has index 0, so $f_K(t) = w(K)$ (the writhe, a constant). ' +
        'A non-constant index polynomial proves the knot is virtual.</p>' +
        '<p>The index polynomial is invariant under all generalized Reidemeister moves (including virtual moves).</p>';
      body.appendChild(expo);
      try {
        var fp = VirtualInvariants.indexPolynomial(gc);
        var polyDiv = el('div', { className: 'exp-poly' });
        polyDiv.innerHTML = '$f_K(t) = ' + fp.toLatex('t') + '$';
        if (dbEntry && dbEntry.index_polynomial) {
          var expected = LaurentPoly.fromLatex(dbEntry.index_polynomial.replace(/t/g, 'q'));
          var computed = new LaurentPoly(fp._terms, fp.ring);
          if (computed.equals(expected)) polyDiv.appendChild(badge('\u2713 matches', 'pass'));
        }
        body.appendChild(polyDiv);
      } catch (err) {
        body.appendChild(el('p', { textContent: 'Error: ' + err.message }));
      }
      renderMath(body);
    });

    // Writhe Polynomial
    buildInvariantCard(container, 'Writhe Polynomial $W_K(t)$', function (body) {
      var expo = el('div', { className: 'vk-inv-expo' });
      expo.innerHTML =
        '<p>The <strong>writhe polynomial</strong> refines the odd writhe by recording crossing signs ' +
        'stratified by index value:</p>' +
        '$$W_K(t) = \\sum_{c \\text{ odd}} \\epsilon(c) \\cdot t^{\\text{ind}(c)}$$' +
        '<p>Note this sums only over <em>odd</em> crossings (unlike the index polynomial which sums over all ' +
        'crossings). Evaluating at $t = 1$ gives $W_K(1) = J(K)$, the odd writhe.</p>' +
        '<p>The writhe polynomial is strictly stronger than the odd writhe: there exist virtual knots with ' +
        '$J(K) = 0$ but $W_K(t) \\neq 0$.</p>';
      body.appendChild(expo);
      try {
        var wp = VirtualInvariants.writhePolynomial(gc);
        var polyDiv = el('div', { className: 'exp-poly' });
        polyDiv.innerHTML = '$W_K(t) = ' + wp.toLatex('t') + '$';
        body.appendChild(polyDiv);
      } catch (err) {
        body.appendChild(el('p', { textContent: 'Error: ' + err.message }));
      }
      renderMath(body);
    });

    // Arrow Polynomial
    buildInvariantCard(container, 'Arrow Polynomial $\\langle K \\rangle_{\\text{arrow}}$', function (body) {
      var expo = el('div', { className: 'vk-inv-expo' });
      expo.innerHTML =
        '<p>The <strong>arrow polynomial</strong> (Dye\u2013Kauffman, 2009) is a two-variable ' +
        'polynomial in $A$ and $K$ that extends the Kauffman bracket to virtual knots. It is defined via ' +
        'a state sum similar to the bracket, but each state carries an additional <strong>arrow count</strong> ' +
        'based on the incidence structure of virtual crossings in the smoothed diagram.</p>' +
        '<p>Setting $K = 1$ recovers the ordinary Kauffman bracket. The arrow polynomial can detect virtual ' +
        'knots that are invisible to the Jones polynomial (they share the same Jones polynomial as the unknot).</p>' +
        '<p>The arrow polynomial is invariant under all generalized Reidemeister moves.</p>';
      body.appendChild(expo);
      try {
        var ap = VirtualInvariants.arrowPolynomial(gc);
        var polyDiv = el('div', { className: 'exp-poly' });
        if (ap.poly && ap.poly.toLatex) {
          polyDiv.innerHTML = '$\\langle K \\rangle_{\\text{arrow}} = ' + ap.poly.toLatex('A') + '$';
        } else if (typeof ap === 'string') {
          polyDiv.textContent = ap;
        } else {
          polyDiv.textContent = JSON.stringify(ap);
        }
        if (dbEntry && dbEntry.arrow_polynomial_nontrivial) polyDiv.appendChild(badge('non-trivial', 'info'));
        body.appendChild(polyDiv);
      } catch (err) {
        body.appendChild(el('p', { textContent: 'Error: ' + err.message }));
      }
      renderMath(body);
    });

    // Affine Index Polynomial
    buildInvariantCard(container, 'Affine Index Polynomial $P_K(t)$', function (body) {
      var expo = el('div', { className: 'vk-inv-expo' });
      expo.innerHTML =
        '<p>The <strong>affine index polynomial</strong> (Kauffman, 2012) strengthens the index polynomial ' +
        'by using an <strong>affine labeling</strong>. Instead of the simple index, each crossing is assigned ' +
        'an <em>affine index</em> computed from a labeling of the arcs that is consistent with crossing relations.</p>' +
        '<p>Specifically, label each arc $a$ with an integer $\\ell(a)$ such that at each classical crossing, ' +
        'the labels satisfy $\\ell(a_{\\text{out,over}}) - \\ell(a_{\\text{in,over}}) = \\epsilon(c)$ and ' +
        'the under-strand labels are equal. The affine index of crossing $c$ is ' +
        '$\\text{aff}(c) = \\ell(a_{\\text{in,over}}) - \\ell(a_{\\text{in,under}})$.</p>' +
        '$$P_K(t) = \\sum_c \\epsilon(c)(t^{\\text{aff}(c)} - 1)$$' +
        '<p>The subtraction of 1 ensures classical knots have $P_K(t) = 0$. The affine index polynomial is ' +
        '<strong>strictly stronger</strong> than the index polynomial.</p>';
      body.appendChild(expo);
      try {
        var aip = VirtualInvariants.affineIndexPolynomial(gc);
        var polyDiv = el('div', { className: 'exp-poly' });
        polyDiv.innerHTML = '$P_K(t) = ' + aip.toLatex('t') + '$';
        body.appendChild(polyDiv);
      } catch (err) {
        body.appendChild(el('p', { textContent: 'Error: ' + err.message }));
      }
      renderMath(body);
    });

    // Parity Bracket
    buildInvariantCard(container, 'Parity Bracket', function (body) {
      var expo = el('div', { className: 'vk-inv-expo' });
      expo.innerHTML =
        '<p>The <strong>parity bracket</strong> (Manturov, 2010) extends the Kauffman bracket by treating ' +
        '<em>even</em> and <em>odd</em> crossings differently. When computing the state sum, even crossings ' +
        'are smoothed as usual, but odd crossings are left unsmoothed (treated as "graphical" vertices).</p>' +
        '<p>The result lives in a module of graphs with polynomial coefficients, rather than a simple polynomial. ' +
        'The parity bracket can detect virtual knots invisible to both the Jones polynomial and the arrow ' +
        'polynomial.</p>' +
        '<p>The parity projection $\\pi(K)$ replaces all even crossings with virtual crossings, producing a ' +
        '"purely odd" virtual knot that is a virtual knot invariant.</p>';
      body.appendChild(expo);
      try {
        var pb = VirtualInvariants.parityBracket(gc);
        var polyDiv = el('div', { className: 'exp-poly' });
        if (typeof pb === 'string') polyDiv.innerHTML = pb;
        else if (pb && pb.toLatex) polyDiv.innerHTML = '$' + pb.toLatex('A') + '$';
        else polyDiv.textContent = JSON.stringify(pb);
        if (dbEntry && dbEntry.parity_nontrivial) polyDiv.appendChild(badge('parity-enhanced', 'info'));
        body.appendChild(polyDiv);
      } catch (err) {
        body.appendChild(el('p', { textContent: 'Error: ' + err.message }));
      }
      renderMath(body);
    });

    // Classical comparison
    if (realizable && gc.numVirtual === 0) {
      buildInvariantCard(container, 'Classical Comparison', function (body) {
        body.innerHTML =
          '<p>This Gauss code is <strong>classically realizable</strong> \u2014 it can be represented as a ' +
          'planar knot diagram with no virtual crossings. All virtual-specific invariants (odd writhe, ' +
          'index polynomial, affine index polynomial, writhe polynomial) will necessarily be trivial.</p>' +
          '<p>For classical knots, the Jones polynomial, Alexander polynomial, and Khovanov homology (available ' +
          'in the other tabs) are the primary invariants. The virtual invariants shown above confirm ' +
          'classicality when they vanish.</p>';
        renderMath(body);
      });
    }
  }

  /** Create a collapsible invariant card and append to container. */
  function buildInvariantCard(container, title, fillBody) {
    var card = el('div', { className: 'exp-card' });
    var details = el('details');
    details.setAttribute('open', '');
    var summary = el('summary');
    summary.innerHTML = title;
    details.appendChild(summary);
    var body = el('div');
    fillBody(body);
    details.appendChild(body);
    card.appendChild(details);
    container.appendChild(card);
  }

  // ================================================================
  //  Main compute handler
  // ================================================================

  function doCompute(gaussStr) {
    var diagramContainer = document.getElementById('vk-diagram');
    var resultsContainer = document.getElementById('vk-results');

    if (!gaussStr || !gaussStr.trim()) {
      diagramContainer.innerHTML = '<p style="color:var(--text-muted,#666)">Enter a Gauss code above and click Compute.</p>';
      resultsContainer.innerHTML = '';
      return;
    }

    if (!hasGaussCode()) {
      diagramContainer.innerHTML = '';
      resultsContainer.innerHTML =
        '<div class="exp-card"><h3>Error</h3>' +
        '<p>gauss-code.js is not loaded. Please ensure the library files are included.</p></div>';
      return;
    }

    try {
      currentGC = parseGaussCode(gaussStr);
    } catch (err) {
      diagramContainer.innerHTML = '';
      resultsContainer.innerHTML =
        '<div class="exp-card"><h3>Parse Error</h3><p>' + err.message + '</p></div>';
      return;
    }

    // Render diagram
    diagramContainer.innerHTML = '';
    var svg = renderDiagram(currentGC);
    diagramContainer.appendChild(svg);

    // Compute invariants
    computeInvariants(currentGC, resultsContainer);
  }

  // ================================================================
  //  Database browser
  // ================================================================

  function buildLibrary(libraryContainer) {
    if (!db) {
      libraryContainer.innerHTML = '<p>Database not loaded.</p>';
      return;
    }

    var ids = Object.keys(db).sort(function (a, b) {
      var pa = a.split('.').map(Number);
      var pb = b.split('.').map(Number);
      return (pa[0] - pb[0]) || (pa[1] - pb[1]);
    });

    var list = el('div', { className: 'vk-library-list' });

    ids.forEach(function (id) {
      var entry = db[id];
      var btn = el('button', {
        className: 'vk-library-btn',
        textContent: id + (entry.name ? ' ' + entry.name : ''),
        title: entry.note || '',
        onClick: function () {
          // Deactivate all buttons
          list.querySelectorAll('.vk-library-btn').forEach(function (b) {
            b.classList.remove('active');
          });
          btn.classList.add('active');

          // Load into textarea and compute
          currentId = id;
          var textarea = document.getElementById('vk-gauss-input');
          if (textarea) textarea.value = entry.gauss_code;
          doCompute(entry.gauss_code);
        }
      });
      list.appendChild(btn);
    });

    libraryContainer.appendChild(list);
  }

  /** Populate the library dropdown (select element). */
  function populateDropdown(select) {
    // Clear existing options beyond the placeholder
    while (select.options.length > 1) select.remove(1);

    if (!db) return;

    var ids = Object.keys(db).sort(function (a, b) {
      var pa = a.split('.').map(Number);
      var pb = b.split('.').map(Number);
      return (pa[0] - pb[0]) || (pa[1] - pb[1]);
    });

    ids.forEach(function (id) {
      var entry = db[id];
      var opt = el('option', { value: id });
      opt.textContent = id + ' \u2014 ' + (entry.name || 'Virtual Knot ' + id);
      select.appendChild(opt);
    });
  }

  // ================================================================
  //  Pedagogy: Virtual Knot Theory
  // ================================================================

  function buildPedagogySection() {
    var card = el('div', { className: 'exp-card' });
    card.appendChild(el('h3', {}, 'Introduction to Virtual Knot Theory'));

    var content = el('div', { className: 'vk-pedagogy' });
    content.innerHTML =
      '<p>A <strong>virtual knot diagram</strong> is a knot diagram in the plane that has two kinds of crossings: ' +
      '<em>classical crossings</em> (the usual over/under crossings) and <em>virtual crossings</em> ' +
      '(marked with a small circle). Virtual knot theory was introduced by Kauffman (1999) as a ' +
      'natural extension of classical knot theory, motivated by the study of knots in thickened surfaces ' +
      'and by Gauss codes that cannot be realized by planar diagrams.</p>' +

      '<p>Every classical knot has a Gauss code, but not every Gauss code comes from a classical knot. ' +
      'Virtual crossings are introduced precisely to fill this gap: they allow any abstract Gauss code to ' +
      'be represented as a diagram in the plane.</p>';

    // ---- Virtual Reidemeister moves ----
    var rmSection = el('details');
    rmSection.setAttribute('open', '');
    rmSection.appendChild(el('summary', { style: 'font-weight:600;font-size:1.05rem;cursor:pointer;' },
      'Virtual Reidemeister Moves'));

    var rmBody = el('div', { style: 'padding:0.5rem 0;' });
    rmBody.innerHTML =
      '<p>Two virtual knot diagrams represent the same virtual knot if and only if they are related by a ' +
      'sequence of <strong>generalized Reidemeister moves</strong>. These consist of:</p>' +

      '<h4>Classical Reidemeister Moves (R1\u2013R3)</h4>' +
      '<p>The three standard Reidemeister moves, applied only at classical crossings:</p>' +
      '<ul>' +
      '<li><strong>R1:</strong> Add or remove a classical kink (curl)</li>' +
      '<li><strong>R2:</strong> Add or remove two adjacent classical crossings on two strands</li>' +
      '<li><strong>R3:</strong> Slide a strand over or under a classical crossing</li>' +
      '</ul>' +

      '<h4>Virtual Reidemeister Moves (V1\u2013V3)</h4>' +
      '<p>Analogues of R1\u2013R3 for virtual crossings:</p>' +
      '<ul>' +
      '<li><strong>V1:</strong> Add or remove a virtual kink</li>' +
      '<li><strong>V2:</strong> Add or remove two adjacent virtual crossings</li>' +
      '<li><strong>V3:</strong> Slide a strand past a virtual crossing (the virtual analog of R3)</li>' +
      '</ul>' +

      '<h4>Mixed Move (V4)</h4>' +
      '<p>The <strong>semivirtual move V4</strong> (also called the "detour move") allows a strand passing ' +
      'through a virtual crossing to slide past an adjacent classical crossing. This is the key move that ' +
      'connects the classical and virtual crossing types.</p>' +

      '<p>Goussarov, Polyak, and Viro proved a fundamental result: <em>if two classical knot diagrams are ' +
      'related by generalized Reidemeister moves (possibly passing through virtual diagrams), then they are ' +
      'already related by classical Reidemeister moves alone.</em> This means classical knot theory ' +
      'embeds faithfully into virtual knot theory.</p>';

    // SVG illustrations of the moves
    rmBody.appendChild(buildReidemeisterSVGs());

    rmSection.appendChild(rmBody);
    content.appendChild(rmSection);

    // ---- Forbidden Moves ----
    var fmSection = el('details');
    fmSection.setAttribute('open', '');
    fmSection.appendChild(el('summary', { style: 'font-weight:600;font-size:1.05rem;cursor:pointer;' },
      'Forbidden Moves'));

    var fmBody = el('div', { style: 'padding:0.5rem 0;' });
    fmBody.innerHTML =
      '<p>Beyond the generalized Reidemeister moves, there are two additional "forbidden" moves that can be ' +
      'considered:</p>' +

      '<h4>Forbidden Move F1 (Overpass)</h4>' +
      '<p>Slide a strand <em>over</em> a classical crossing past an adjacent virtual crossing. ' +
      'This move is forbidden in virtual knot theory but defines <strong>welded knot theory</strong> ' +
      'when allowed.</p>' +

      '<h4>Forbidden Move F2 (Underpass)</h4>' +
      '<p>Slide a strand <em>under</em> a classical crossing past an adjacent virtual crossing.</p>' +

      '<div class="vk-warning-box">' +
      '<strong>Key theorem (Kanenobu\u2013Nelson):</strong> If <em>both</em> F1 and F2 are allowed, ' +
      'then every virtual knot becomes equivalent to the unknot. The theory collapses completely.' +
      '</div>' +

      '<p>However, allowing <strong>only F1</strong> gives <strong>welded knot theory</strong>, which is ' +
      'nontrivial and strictly extends classical knot theory. The classical knot group $G_K$ is an invariant ' +
      'of welded knots, and welded equivalence of classical knots implies classical equivalence.</p>' +

      '<p>This asymmetry between F1 and F2 is remarkable: it means the "over" and "under" directions ' +
      'play fundamentally different roles in virtual knot theory.</p>';

    fmSection.appendChild(fmBody);
    content.appendChild(fmSection);

    // ---- Virtual Knot Group ----
    var vgSection = el('details');
    vgSection.setAttribute('open', '');
    vgSection.appendChild(el('summary', { style: 'font-weight:600;font-size:1.05rem;cursor:pointer;' },
      'The Virtual Knot Group'));

    var vgBody = el('div', { style: 'padding:0.5rem 0;' });
    vgBody.innerHTML =
      '<p>The <strong>virtual knot group</strong> $VG_K$ generalizes the classical knot group $G_K$ ' +
      'by incorporating virtual crossing information. It is defined as follows:</p>' +

      '<h4>Generators</h4>' +
      '<p>Label every <em>short arc</em> of the diagram (each arc between two consecutive crossings, ' +
      'including virtual crossings) as a generator. Additionally, introduce two auxiliary generators ' +
      '$s$ and $q$ with $[s, q] = 1$ (i.e., $s$ and $q$ commute).</p>' +

      '<h4>Relations</h4>' +
      '<p>At each crossing, impose two relations:</p>' +

      '<p><strong>Positive classical crossing</strong> (arcs $x, y, z, w$):</p>' +
      '$$z = x y s x^{-1} s^{-1}, \\quad w = s x s^{-1}$$' +

      '<p><strong>Negative classical crossing</strong>:</p>' +
      '$$z = s^{-1} x^{-1} s y x, \\quad w = s^{-1} x s$$' +

      '<p><strong>Virtual crossing</strong>:</p>' +
      '$$z = q^{-1} y q, \\quad w = q x q^{-1}$$' +

      '<h4>Properties</h4>' +
      '<ul>' +
      '<li>The abelianization of $VG_K$ is $\\mathbb{Z}^3$, generated by $s$, $t$ (the meridian), and $q$.</li>' +
      '<li>Setting $s = 1 = q$ recovers the classical knot group $G_K$.</li>' +
      '<li>Setting $s = q$ gives the <strong>welded knot group</strong> $WG_K$.</li>' +
      '</ul>' +

      '<h4>The Virtual Alexander Polynomial</h4>' +
      '<p>Applying Fox calculus to the presentation of $VG_K$ yields the <strong>virtual Alexander polynomial</strong> ' +
      '$H_K(s, t, q) \\in \\mathbb{Z}[s^{\\pm 1}, t^{\\pm 1}, q^{\\pm 1}]$, defined as the GCD of the ' +
      '$(n-1) \\times (n-1)$ minors of the Jacobian matrix.</p>' +

      '<div class="vk-highlight-box">' +
      '<strong>Classicality obstruction:</strong> For any classical knot, $H_K(s, t, q) = 0$. ' +
      'Therefore, a non-vanishing virtual Alexander polynomial proves a knot is genuinely virtual.' +
      '</div>' +

      '<p>The $q$-width of $H_K$ also provides a lower bound on the <strong>virtual crossing number</strong> ' +
      '$v(K)$, i.e., the minimum number of virtual crossings needed in any diagram of $K$.</p>' +

      '<h4>Relation to Other Polynomials</h4>' +
      '<p>Setting $q = 1$ gives $H_K(s, t, 1) = G_K(s, t)$, the <strong>generalized Alexander polynomial</strong> ' +
      'of Sawollek\u2013Kauffman\u2013Radford (also known as the $\\Xi$ polynomial). This two-variable polynomial is itself ' +
      'a classicality test.</p>';

    vgSection.appendChild(vgBody);
    content.appendChild(vgSection);

    // ---- References ----
    var refSection = el('details');
    refSection.appendChild(el('summary', { style: 'font-weight:600;font-size:1.05rem;cursor:pointer;' },
      'References'));
    var refBody = el('div', { style: 'padding:0.5rem 0;font-size:0.9rem;' });
    refBody.innerHTML =
      '<ul>' +
      '<li>Kauffman, L. H. (1999). "Virtual knot theory." <em>European J. Combinatorics</em> 20(7), 663\u2013690.</li>' +
      '<li>Goussarov, M., Polyak, M., Viro, O. (2000). "Finite type invariants of classical and virtual knots." <em>Topology</em> 39, 1045\u20131068.</li>' +
      '<li>Boden, H. U., Dies, E., Gaudreau, A. I., Gerlings, A., Harper, E., Nicas, A. J. (2015). "Alexander invariants for virtual knots." <em>J. Knot Theory Ramif.</em> 24(3).</li>' +
      '<li>Kanenobu, T. (2001). "Forbidden moves unknot a virtual knot." <em>J. Knot Theory Ramif.</em> 10(1), 89\u201396.</li>' +
      '<li>Nelson, S. (2001). "Unknotting virtual knots with Gauss diagram forbidden moves." <em>J. Knot Theory Ramif.</em> 10(6), 931\u2013935.</li>' +
      '</ul>';
    refSection.appendChild(refBody);
    content.appendChild(refSection);

    card.appendChild(content);
    renderMath(card);
    return card;
  }

  /** Build small SVG illustrations of Reidemeister moves. */
  function buildReidemeisterSVGs() {
    var container = el('div', { className: 'vk-rm-illustrations' });

    // Helper to create a small SVG
    function miniSvg(w, h) {
      var s = svgEl('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h });
      s.style.margin = '0.3rem';
      s.style.border = '1px solid #e0e0e0';
      s.style.borderRadius = '4px';
      s.style.background = '#fff';
      return s;
    }

    // V1: virtual kink
    var v1 = miniSvg(120, 60);
    // Left side: straight line
    v1.appendChild(svgEl('line', { x1: '10', y1: '30', x2: '45', y2: '30', stroke: '#333', 'stroke-width': '2' }));
    // Arrow
    v1.appendChild(svgEl('text', { x: '50', y: '35', 'font-size': '14', fill: '#666', 'text-anchor': 'middle' }));
    v1.lastChild.textContent = '\u2194';
    // Right side: loop with virtual crossing
    v1.appendChild(svgEl('path', {
      d: 'M65,30 C65,10 105,10 105,30 C105,50 65,50 65,30',
      fill: 'none', stroke: '#333', 'stroke-width': '2'
    }));
    v1.appendChild(svgEl('circle', { cx: '85', cy: '15', r: '4', fill: 'none', stroke: 'var(--virtual-accent)', 'stroke-width': '2' }));
    var v1Label = el('div', { style: 'text-align:center;font-size:0.8rem;color:var(--text-muted);' }, 'V1: Virtual kink');
    container.appendChild(el('div', { className: 'vk-rm-item' }, [v1, v1Label]));

    // V2: two virtual crossings cancel
    var v2 = miniSvg(120, 60);
    v2.appendChild(svgEl('line', { x1: '10', y1: '20', x2: '50', y2: '20', stroke: '#333', 'stroke-width': '2' }));
    v2.appendChild(svgEl('line', { x1: '10', y1: '40', x2: '50', y2: '40', stroke: '#333', 'stroke-width': '2' }));
    v2.appendChild(svgEl('text', { x: '60', y: '35', 'font-size': '14', fill: '#666' }));
    v2.lastChild.textContent = '\u2194';
    // Right side: two strands crossing twice with virtual markers
    v2.appendChild(svgEl('line', { x1: '70', y1: '20', x2: '90', y2: '40', stroke: '#333', 'stroke-width': '2' }));
    v2.appendChild(svgEl('line', { x1: '70', y1: '40', x2: '90', y2: '20', stroke: '#333', 'stroke-width': '2' }));
    v2.appendChild(svgEl('circle', { cx: '80', cy: '30', r: '4', fill: 'none', stroke: 'var(--virtual-accent)', 'stroke-width': '2' }));
    v2.appendChild(svgEl('line', { x1: '90', y1: '20', x2: '110', y2: '40', stroke: '#333', 'stroke-width': '2' }));
    v2.appendChild(svgEl('line', { x1: '90', y1: '40', x2: '110', y2: '20', stroke: '#333', 'stroke-width': '2' }));
    v2.appendChild(svgEl('circle', { cx: '100', cy: '30', r: '4', fill: 'none', stroke: 'var(--virtual-accent)', 'stroke-width': '2' }));
    var v2Label = el('div', { style: 'text-align:center;font-size:0.8rem;color:var(--text-muted);' }, 'V2: Virtual cancellation');
    container.appendChild(el('div', { className: 'vk-rm-item' }, [v2, v2Label]));

    // V4: mixed move
    var v4 = miniSvg(140, 60);
    // Left side: virtual crossing next to classical crossing
    v4.appendChild(svgEl('line', { x1: '10', y1: '20', x2: '60', y2: '20', stroke: '#333', 'stroke-width': '2' }));
    v4.appendChild(svgEl('line', { x1: '25', y1: '10', x2: '25', y2: '50', stroke: '#333', 'stroke-width': '2' }));
    v4.appendChild(svgEl('circle', { cx: '25', cy: '20', r: '4', fill: 'none', stroke: 'var(--virtual-accent)', 'stroke-width': '2' }));
    v4.appendChild(svgEl('line', { x1: '45', y1: '10', x2: '45', y2: '50', stroke: '#333', 'stroke-width': '2' }));
    // classical gap
    v4.appendChild(svgEl('line', { x1: '42', y1: '17', x2: '48', y2: '23', stroke: '#fff', 'stroke-width': '5' }));
    v4.appendChild(svgEl('line', { x1: '10', y1: '20', x2: '60', y2: '20', stroke: '#333', 'stroke-width': '2' }));
    // Arrow
    v4.appendChild(svgEl('text', { x: '70', y: '35', 'font-size': '14', fill: '#666' }));
    v4.lastChild.textContent = '\u2194';
    // Right side: swapped positions
    v4.appendChild(svgEl('line', { x1: '80', y1: '20', x2: '130', y2: '20', stroke: '#333', 'stroke-width': '2' }));
    v4.appendChild(svgEl('line', { x1: '95', y1: '10', x2: '95', y2: '50', stroke: '#333', 'stroke-width': '2' }));
    v4.appendChild(svgEl('line', { x1: '92', y1: '17', x2: '98', y2: '23', stroke: '#fff', 'stroke-width': '5' }));
    v4.appendChild(svgEl('line', { x1: '80', y1: '20', x2: '130', y2: '20', stroke: '#333', 'stroke-width': '2' }));
    v4.appendChild(svgEl('line', { x1: '115', y1: '10', x2: '115', y2: '50', stroke: '#333', 'stroke-width': '2' }));
    v4.appendChild(svgEl('circle', { cx: '115', cy: '20', r: '4', fill: 'none', stroke: 'var(--virtual-accent)', 'stroke-width': '2' }));
    var v4Label = el('div', { style: 'text-align:center;font-size:0.8rem;color:var(--text-muted);' }, 'V4: Mixed / detour move');
    container.appendChild(el('div', { className: 'vk-rm-item' }, [v4, v4Label]));

    return container;
  }

  // ================================================================
  //  Init
  // ================================================================

  function initVirtualTab() {
    var root = document.getElementById('tab-virtual');
    if (!root) {
      console.warn('tab-virtual: #tab-virtual container not found');
      return;
    }
    root.innerHTML = '';

    var container = el('div', { className: 'exp-container' });
    var builder = null;
    var textarea, select, builderStatus, pdOutput, selControls;

    // ============================================================
    //  Section 1: Interactive Diagram Builder (collapsible, open)
    // ============================================================
    var builderDetails = el('details', { className: 'exp-card vk-section' });
    builderDetails.setAttribute('open', '');
    builderDetails.appendChild(el('summary', { className: 'vk-section-title' }, 'Interactive Diagram Builder'));

    var builderBody = el('div', { style: 'padding-top:0.5rem;' });

    // Toolbar
    var toolbar = el('div', { className: 'db-toolbar' });
    var tools = [
      { id: 'select', label: 'Select / Move', icon: '\u2702' },
      { id: 'addClassical', label: 'Add Classical Crossing', icon: '\u2573' },
      { id: 'addVirtual', label: 'Add Virtual Crossing', icon: '\u25cb' },
      { id: 'connect', label: 'Connect Ports', icon: '\u2194' },
      { id: 'delete', label: 'Delete', icon: '\u2716' }
    ];
    var toolBtns = {};
    tools.forEach(function (t) {
      var btn = el('button', {
        className: 'db-tool-btn' + (t.id === 'select' ? ' active' : ''),
        title: t.label,
        textContent: t.icon + ' ' + t.label,
        onClick: function () {
          Object.keys(toolBtns).forEach(function (k) { toolBtns[k].classList.remove('active'); });
          btn.classList.add('active');
          if (builder) builder.setTool(t.id);
        }
      });
      toolBtns[t.id] = btn;
      toolbar.appendChild(btn);
    });
    var signToggle = el('button', {
      className: 'db-tool-btn',
      title: 'Toggle crossing sign for new crossings',
      textContent: 'Sign: +',
      onClick: function () {
        if (builder) {
          var s = builder._defaultSign > 0 ? -1 : 1;
          builder.setDefaultSign(s);
          signToggle.textContent = 'Sign: ' + (s > 0 ? '+' : '\u2212');
        }
      }
    });
    toolbar.appendChild(signToggle);
    builderBody.appendChild(toolbar);

    // Action buttons
    var actionBar = el('div', { className: 'db-actions' });

    actionBar.appendChild(el('button', {
      textContent: 'Compute Invariants',
      className: 'db-action-btn db-action-primary',
      onClick: function () {
        if (builder && builder.isComplete()) {
          var gc = builder.toGaussCode();
          textarea.value = gc;
          doCompute(gc);
        } else if (builder) {
          alert('Connect all ports before computing invariants.');
        }
      }
    }));

    actionBar.appendChild(el('button', {
      textContent: 'Export \u2192 Gauss Code',
      className: 'db-action-btn',
      onClick: function () {
        if (builder) {
          var gc = builder.toGaussCode();
          textarea.value = gc;
        }
      }
    }));

    actionBar.appendChild(el('button', {
      textContent: 'Export \u2192 PD Code',
      className: 'db-action-btn',
      onClick: function () {
        if (builder) pdOutput.textContent = 'PD Code: ' + builder.toPDCode();
      }
    }));

    actionBar.appendChild(el('button', {
      textContent: 'Clear',
      className: 'db-action-btn db-action-clear',
      onClick: function () {
        if (builder) builder.clear();
        if (builderStatus) builderStatus.textContent = '';
        if (pdOutput) pdOutput.textContent = '';
      }
    }));
    builderBody.appendChild(actionBar);

    // Selected crossing controls
    selControls = el('div', { className: 'db-sel-controls', style: 'display:none;' });
    selControls.innerHTML = '<strong>Selected crossing:</strong> ';
    selControls.appendChild(el('button', {
      textContent: 'Rotate 90\u00b0', className: 'db-action-btn',
      onClick: function () { if (builder && builder._selectedCrossing) builder.rotateCrossing(builder._selectedCrossing); }
    }));
    selControls.appendChild(el('button', {
      textContent: 'Toggle Sign', className: 'db-action-btn',
      onClick: function () { if (builder && builder._selectedCrossing) builder.toggleSign(builder._selectedCrossing); }
    }));
    selControls.appendChild(el('button', {
      textContent: 'Delete', className: 'db-action-btn db-action-clear',
      onClick: function () { if (builder && builder._selectedCrossing) builder.removeCrossing(builder._selectedCrossing); }
    }));
    builderBody.appendChild(selControls);

    // SVG container
    var builderSvgDiv = el('div', { className: 'db-svg-container' });
    builderBody.appendChild(builderSvgDiv);

    // Status and PD output
    builderStatus = el('div', { className: 'db-status' });
    builderBody.appendChild(builderStatus);
    pdOutput = el('div', { className: 'db-pd-output' });
    builderBody.appendChild(pdOutput);

    builderDetails.appendChild(builderBody);
    container.appendChild(builderDetails);

    // ============================================================
    //  Section 2: Gauss Code / PD Code Input (collapsible)
    // ============================================================
    var inputDetails = el('details', { className: 'exp-card vk-section' });
    inputDetails.setAttribute('open', '');
    inputDetails.appendChild(el('summary', { className: 'vk-section-title' }, 'Gauss Code / PD Code Input'));

    var inputBody = el('div', { style: 'padding-top:0.5rem;' });
    var inputArea = el('div', { className: 'vk-input-area' });

    textarea = el('textarea', {
      id: 'vk-gauss-input', rows: '3',
      placeholder: 'Enter extended Gauss code, e.g.  1 -2v 3 -1 2v -3'
    });
    inputArea.appendChild(textarea);

    var controlsCol = el('div', { style: 'display:flex;flex-direction:column;gap:0.5rem;' });
    select = el('select', { id: 'vk-library-select' });
    select.appendChild(el('option', { value: '' }, '\u2014 Load from library \u2014'));
    controlsCol.appendChild(select);

    var inputBtns = el('div', { style: 'display:flex;gap:0.4rem;flex-wrap:wrap;' });
    var computeBtn = el('button', {
      textContent: 'Compute',
      className: 'db-action-btn db-action-primary',
      onClick: function () {
        currentId = select.value || null;
        doCompute(textarea.value.trim());
      }
    });
    inputBtns.appendChild(computeBtn);

    inputBtns.appendChild(el('button', {
      textContent: 'Load into Builder',
      className: 'db-action-btn',
      onClick: function () {
        if (builder && textarea.value.trim()) {
          builder.fromGaussCode(textarea.value.trim());
          builderDetails.setAttribute('open', '');
        }
      }
    }));

    inputBtns.appendChild(el('button', {
      textContent: 'Import PD Code',
      className: 'db-action-btn',
      onClick: function () {
        if (builder) {
          var pd = prompt('Enter PD code, e.g. [[1,5,2,4],[3,1,4,6],[5,3,6,2]]');
          if (pd) { builder.fromPDCode(pd); builderDetails.setAttribute('open', ''); }
        }
      }
    }));
    controlsCol.appendChild(inputBtns);
    inputArea.appendChild(controlsCol);
    inputBody.appendChild(inputArea);

    // Help text
    var help = el('details', { style: 'margin-top:0.8rem;' });
    help.appendChild(el('summary', {
      style: 'cursor:pointer;font-size:0.85rem;color:var(--text-muted,#666);'
    }, 'Gauss code format help'));
    var helpBody = el('div', { style: 'font-size:0.85rem;padding:0.5rem 0;color:var(--text-muted,#666);' });
    helpBody.innerHTML =
      '<p><strong>Knots:</strong> List crossing labels separated by spaces. ' +
      'Positive numbers = over-crossing, negative = under-crossing. ' +
      'Append <code>v</code> for virtual crossings.</p>' +
      '<p>Example: <code>1 -2v 3 -1 2v -3</code> (virtual trefoil)</p>' +
      '<p><strong>Links:</strong> Enclose each component in braces, separated by commas.</p>' +
      '<p>Example: <code>{1 -2v}, {-1 2v}</code></p>' +
      '<p>Each crossing label must appear exactly twice in the full code.</p>';
    help.appendChild(helpBody);
    inputBody.appendChild(help);

    inputDetails.appendChild(inputBody);
    container.appendChild(inputDetails);

    // ============================================================
    //  Section 3: Diagram display with orientation controls
    // ============================================================
    var diagramCard = el('div', { className: 'exp-card' });
    diagramCard.appendChild(el('h3', {}, 'Knot Diagram'));

    // Orientation controls
    var orientBar = el('div', { className: 'db-actions', style: 'margin-bottom:0.5rem;' });
    orientBar.appendChild(el('span', { style: 'font-size:0.85rem;font-weight:600;margin-right:0.3rem;' }, 'Orientation:'));
    var orientSelect = el('select', { style: 'font-size:0.85rem;padding:0.2rem 0.4rem;border-radius:4px;border:1px solid var(--border);' });
    orientSelect.appendChild(el('option', { value: 'standard' }, 'Standard'));
    orientSelect.appendChild(el('option', { value: 'reverse' }, 'Reverse'));
    orientSelect.appendChild(el('option', { value: 'mirror' }, 'Mirror'));
    orientBar.appendChild(orientSelect);
    orientSelect.addEventListener('change', function () {
      // Re-render diagram with selected orientation
      if (currentGC) {
        var diagramDiv = document.getElementById('vk-diagram');
        if (diagramDiv) {
          diagramDiv.innerHTML = '';
          var opts = {};
          if (orientSelect.value === 'reverse') opts.reverse = true;
          if (orientSelect.value === 'mirror') opts.mirror = true;
          diagramDiv.appendChild(renderDiagram(currentGC, opts));
        }
      }
    });
    diagramCard.appendChild(orientBar);

    var diagramDiv = el('div', { className: 'vk-diagram-container', id: 'vk-diagram' });
    diagramDiv.innerHTML = '<p style="color:var(--text-muted,#666)">Build a diagram above or enter a Gauss code to see it rendered here.</p>';
    diagramCard.appendChild(diagramDiv);
    container.appendChild(diagramCard);

    // ============================================================
    //  Section 4: Invariant results
    // ============================================================
    var resultsDiv = el('div', { id: 'vk-results' });
    container.appendChild(resultsDiv);

    // ============================================================
    //  Section 5: Database browser
    // ============================================================
    var browserCard = el('div', { className: 'exp-card' });
    browserCard.appendChild(el('h3', {}, 'Virtual Knot Database'));
    var libraryDiv = el('div', { id: 'vk-library' });
    libraryDiv.innerHTML = '<div class="exp-progress"><div class="exp-spinner"></div>Loading database\u2026</div>';
    browserCard.appendChild(libraryDiv);
    container.appendChild(browserCard);

    // ============================================================
    //  Section 6: Pedagogy
    // ============================================================
    container.appendChild(buildPedagogySection());

    root.appendChild(container);

    // ============================================================
    //  Initialize builder and wire events
    // ============================================================
    setTimeout(function () {
      if (typeof DiagramBuilder === 'function') {
        builder = new DiagramBuilder(builderSvgDiv, {
          width: 600, height: 400,
          onChange: function (b) {
            builderStatus.textContent = 'Crossings: ' + b.getCrossingCount() +
              ' (classical: ' + b.getClassicalCount() + ', virtual: ' + b.getVirtualCount() + ')' +
              (b.isComplete() ? ' \u2014 diagram complete' : ' \u2014 connect all ports to complete');
            selControls.style.display = b._selectedCrossing ? 'block' : 'none';
          }
        });
      } else {
        builderSvgDiv.innerHTML = '<p style="color:var(--text-muted)">diagram-builder.js not loaded.</p>';
      }
    }, 0);

    // Wire dropdown
    select.addEventListener('change', function () {
      var id = select.value;
      if (!id || !db || !db[id]) return;
      currentId = id;
      textarea.value = db[id].gauss_code;
      doCompute(db[id].gauss_code);
      var btns = libraryDiv.querySelectorAll('.vk-library-btn');
      btns.forEach(function (b) { b.classList.remove('active'); });
      btns.forEach(function (b) { if (b.textContent.indexOf(id) === 0) b.classList.add('active'); });
    });

    // Load database
    fetch('experimental/data/virtual-knots.json')
      .then(function (resp) { if (!resp.ok) throw new Error('HTTP ' + resp.status); return resp.json(); })
      .then(function (data) {
        db = data;
        populateDropdown(select);
        libraryDiv.innerHTML = '';
        buildLibrary(libraryDiv);
      })
      .catch(function (err) {
        console.warn('tab-virtual: failed to load virtual-knots.json:', err);
        libraryDiv.innerHTML = '<p style="color:var(--text-muted,#666)">Could not load virtual knot database. You can still enter Gauss codes manually.</p>';
      });
  }

  // ================================================================
  //  Expose
  // ================================================================

  window.initVirtualTab = initVirtualTab;

})();
