/**
 * tab-khovanov-complex.js -- Pedagogical Khovanov Complex Tab
 *
 * A step-by-step walkthrough of how the Khovanov chain complex is
 * constructed from the cube of resolutions, including:
 *
 *   1. Crossing signs and writhe from the PD code
 *   2. The resolution cube with algebraic labels on each vertex
 *      (generator spaces V^{⊗c(v)} with basis enumeration)
 *   3. Per-vertex Kauffman bracket contributions A^{σ(v)} · d^{c(v)-1}
 *   4. Edge maps (merge = multiplication, split = comultiplication)
 *      with Koszul signs and explicit matrix entries
 *   5. Assembly into the bigraded chain complex C^{i,j}
 *   6. Differential matrices with labeled rows/columns
 *   7. Homology computation via Smith normal form
 *   8. Graded Euler characteristic and the Jones polynomial
 *
 * Designed to be readable by a first-year graduate student.
 *
 * Dependencies: polynomial.js, matrix.js, cube.js, frobenius.js,
 *               chain-complex.js, KaTeX
 *
 * Globals expected: KNOT_DATA, LINK_DATA, getAllItems,
 *                   ResolutionCube, FrobeniusAlgebra, CoefficientRing,
 *                   LaurentPoly, IntMatrix, buildKhovanovComplex,
 *                   BigradedChainComplex
 */

(function () {
  'use strict';

  var _initialized = false;

  // ===================================================================
  // Crossing signs from PD (duplicated here for self-containment)
  // ===================================================================

  function crossingSignsFromPD(pdCode) {
    var n = pdCode.length;
    if (n === 0) return [];
    var totalArcs = 2 * n;
    var parent = [];
    for (var i = 0; i < totalArcs; i++) parent[i] = i;
    function find(x) {
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    }
    function unite(x, y) { parent[find(x)] = find(y); }
    for (var i = 0; i < n; i++) {
      unite(pdCode[i][0], pdCode[i][2]);
      unite(pdCode[i][1], pdCode[i][3]);
    }
    var groups = {};
    for (var i = 0; i < totalArcs; i++) {
      var root = find(i);
      if (!groups[root]) groups[root] = [];
      groups[root].push(i);
    }
    var nextArc = new Array(totalArcs);
    var roots = Object.keys(groups);
    for (var gi = 0; gi < roots.length; gi++) {
      var arcs = groups[roots[gi]];
      arcs.sort(function (a, b) { return a - b; });
      for (var j = 0; j < arcs.length; j++) {
        nextArc[arcs[j]] = arcs[(j + 1) % arcs.length];
      }
    }
    var signs = [];
    for (var i = 0; i < n; i++) {
      var b = pdCode[i][1], d = pdCode[i][3];
      if (nextArc[b] === d) signs.push(+1);
      else if (nextArc[d] === b) signs.push(-1);
      else return null;
    }
    return signs;
  }

  // ===================================================================
  // Helper: binary label for a vertex
  // ===================================================================

  function binLabel(v, n) {
    var s = v.toString(2);
    while (s.length < n) s = '0' + s;
    return s;
  }

  function hammingWeight(v) {
    var w = 0;
    while (v) { w += v & 1; v >>= 1; }
    return w;
  }

  // ===================================================================
  // Helper: enumerate generators {1, x}^⊗c
  // ===================================================================

  function enumerateGens(c) {
    var total = 1 << c;
    var gens = [];
    for (var g = 0; g < total; g++) {
      var gen = [];
      for (var k = 0; k < c; k++) {
        gen.push((g >> k) & 1); // 0 = '1', 1 = 'x'
      }
      gens.push(gen);
    }
    return gens;
  }

  function genLabel(gen) {
    return gen.map(function (b) { return b === 0 ? '\\mathbf{1}' : 'x'; }).join(' \\otimes ');
  }

  function genLabelShort(gen) {
    return gen.map(function (b) { return b === 0 ? '1' : 'x'; }).join('');
  }

  // ===================================================================
  // Quantum grading of a generator
  // ===================================================================

  function quantumGrading(gen, vWeight, nPlus, nMinus) {
    // j = vWeight + n+ - 2n- + sum of gradings
    // grading: '1' has degree +1, 'x' has degree -1
    var gradSum = 0;
    for (var k = 0; k < gen.length; k++) {
      gradSum += (gen[k] === 0) ? 1 : -1;
    }
    return vWeight + nPlus - 2 * nMinus + gradSum;
  }

  // ===================================================================
  // Build the annotated cube data for display
  // ===================================================================

  function buildAnnotatedCube(pdCode, crossingSigns, algebra) {
    var n = pdCode.length;
    var cube = new ResolutionCube(pdCode, crossingSigns);
    var totalVerts = 1 << n;

    var nPlus = 0, nMinus = 0;
    for (var i = 0; i < n; i++) {
      if (crossingSigns[i] > 0) nPlus++; else nMinus++;
    }

    var vertices = [];
    for (var v = 0; v < totalVerts; v++) {
      var circles = cube.getCircles(v);
      var c = circles.length;
      var label = binLabel(v, n);
      var weight = hammingWeight(v);
      var sigma = n - 2 * weight; // for dummy signs bracket: sigma = n - 2|v|
      var iDeg = weight - nMinus; // homological grading

      var gens = enumerateGens(c);
      var genInfo = gens.map(function (gen) {
        return {
          gen: gen,
          label: genLabel(gen),
          labelShort: genLabelShort(gen),
          j: quantumGrading(gen, weight, nPlus, nMinus)
        };
      });

      vertices.push({
        bits: v,
        label: label,
        weight: weight,
        circles: c,
        sigma: sigma,
        iDeg: iDeg,
        gens: genInfo
      });
    }

    // Build edge data
    var edges = [];
    for (var v = 0; v < totalVerts; v++) {
      for (var bit = 0; bit < n; bit++) {
        var w = v ^ (1 << bit);
        if (w <= v) continue;
        // Edge goes from lower weight to higher weight
        var src = (v & (1 << bit)) ? w : v;
        var tgt = (v & (1 << bit)) ? v : w;

        var edgeInfo = cube.edgeType(src, bit);
        // Koszul sign: count 1-bits below position 'bit' in src
        var koszul = 1;
        for (var k = 0; k < bit; k++) {
          if ((src >> k) & 1) koszul *= -1;
        }

        edges.push({
          src: src,
          tgt: tgt,
          bit: bit,
          type: edgeInfo.type, // 'merge' or 'split'
          koszulSign: koszul,
          srcLabel: binLabel(src, n),
          tgtLabel: binLabel(tgt, n)
        });
      }
    }

    return {
      n: n,
      nPlus: nPlus,
      nMinus: nMinus,
      writhe: nPlus - nMinus,
      vertices: vertices,
      edges: edges,
      cube: cube
    };
  }

  // ===================================================================
  // Build annotated SVG cube graph
  // ===================================================================

  function buildAnnotatedCubeSVG(cubeData) {
    var n = cubeData.n;
    var verts = cubeData.vertices;

    // Layout parameters
    var isLarge = n > 5;
    var r = isLarge ? (n > 7 ? 5 : 8) : 18;
    var showDetail = n <= 6;
    var colSpacing = isLarge ? Math.max(80, 900 / (n + 1)) : 160;
    var maxPerCol = 0;
    var cols = {};
    for (var vi = 0; vi < verts.length; vi++) {
      var w = verts[vi].weight;
      if (!cols[w]) cols[w] = [];
      cols[w].push(verts[vi]);
      if (cols[w].length > maxPerCol) maxPerCol = cols[w].length;
    }

    var rowSpacing = isLarge ? Math.max(r * 3, 14) : 60;
    var pad = isLarge ? 30 : 50;
    var W = pad * 2 + n * colSpacing;
    var H = pad * 2 + (maxPerCol - 1) * rowSpacing + r * 2;
    if (showDetail) H = Math.max(H, 400);

    var positions = {};
    for (var w = 0; w <= n; w++) {
      var group = cols[w] || [];
      var colX = pad + w * colSpacing;
      var rH = group.length > 1 ? (H - 2 * pad) / (group.length - 1) : 0;
      for (var i = 0; i < group.length; i++) {
        var y = group.length === 1 ? H / 2 : pad + i * rH;
        positions[group[i].bits] = { x: colX, y: y };
      }
    }

    var svgH = Math.min(H, 700);
    var html = '<div style="overflow:auto;max-height:' + (svgH + 20) +
      'px;border:1px solid #ddd;border-radius:8px;margin:1rem 0;background:#fefefe">';
    var svg = '<svg width="' + W + '" height="' + H + '" style="display:block">';

    // Draw edges with labels (clickable for path mode)
    var edgeWidth = isLarge ? 0.7 : 1.5;
    for (var ei = 0; ei < cubeData.edges.length; ei++) {
      var e = cubeData.edges[ei];
      var p1 = positions[e.src], p2 = positions[e.tgt];
      if (!p1 || !p2) continue;
      var color = e.type === 'merge' ? '#2171b5' : '#d6604d';
      var lo = Math.min(e.src, e.tgt), hi = Math.max(e.src, e.tgt);
      // Invisible wide hit target for path mode edge clicking
      svg += '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x +
        '" y2="' + p2.y + '" stroke="transparent" stroke-width="12" style="cursor:pointer" ' +
        'onclick="khcEdgeClick(' + lo + ',' + hi + ',' + e.bit + ')"/>';
      svg += '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x +
        '" y2="' + p2.y + '" stroke="' + color + '" stroke-width="' +
        edgeWidth + '" opacity="0.6" id="khc-edge-' + lo + '-' + hi +
        '" data-orig-width="' + edgeWidth + '" style="pointer-events:none"/>';

      // Edge label at midpoint
      if (showDetail) {
        var mx = (p1.x + p2.x) / 2;
        var my = (p1.y + p2.y) / 2 - 4;
        var signChar = e.koszulSign > 0 ? '+' : '−';
        var typeChar = e.type === 'merge' ? 'm' : 'Δ';
        svg += '<text x="' + mx + '" y="' + my +
          '" text-anchor="middle" font-size="7" fill="' + color +
          '" font-style="italic" style="pointer-events:none">' + signChar + typeChar + '</text>';
      }
    }

    // Draw vertices (clickable for neighborhood view)
    for (var vi = 0; vi < verts.length; vi++) {
      var v = verts[vi];
      var p = positions[v.bits];
      if (!p) continue;
      var hue = (v.weight / Math.max(n, 1)) * 240;
      svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + r +
        '" fill="hsl(' + hue + ',60%,88%)" stroke="hsl(' + hue +
        ',60%,50%)" stroke-width="' + (isLarge ? 1 : 2) +
        '" style="cursor:pointer" onclick="openCubeVertexView(' + v.bits + ')"/>';

      if (n <= 7) {
        var fs = n <= 4 ? 10 : (n <= 6 ? 8 : 6);
        svg += '<text x="' + p.x + '" y="' + (p.y + 3) +
          '" text-anchor="middle" font-size="' + fs +
          '" font-family="monospace" font-weight="700" fill="#333" style="pointer-events:none">' +
          v.label + '</text>';
        // Circle count below
        svg += '<text x="' + p.x + '" y="' + (p.y + r + 10) +
          '" text-anchor="middle" font-size="' + (fs - 1) +
          '" fill="#888" style="pointer-events:none">' + v.circles + '○ i=' + v.iDeg + '</text>';
      }
    }

    // Column headers
    for (var w = 0; w <= n; w++) {
      var colX = pad + w * colSpacing;
      svg += '<text x="' + colX +
        '" y="14" text-anchor="middle" font-size="9" font-weight="700" fill="#2171b5">' +
        'wt ' + w + ' (i=' + (w - cubeData.nMinus) + ')</text>';
    }

    svg += '</svg>';
    return html + svg + '</div>';
  }

  // ===================================================================
  // Render the full pedagogical walkthrough
  // ===================================================================

  function renderKhovanovComplex(knotName, d, pdCode, variant, algebraName, ringName) {
    var resultsDiv = document.getElementById('khc-results');

    // Mirror variant: swap b <-> d
    if (variant === 'mirror') {
      pdCode = pdCode.map(function (x) { return [x[0], x[3], x[2], x[1]]; });
    }

    var n = pdCode.length;
    if (n > 10) {
      resultsDiv.innerHTML = '<div class="exp-card"><p>Too many crossings (' +
        n + ') for detailed display. Select a knot with ≤10 crossings.</p></div>';
      return;
    }

    // Get crossing signs from PD
    var crossingSigns = crossingSignsFromPD(pdCode);
    if (!crossingSigns) {
      resultsDiv.innerHTML = '<div class="exp-card"><p>Could not determine crossing signs from PD code.</p></div>';
      return;
    }

    // Select algebra
    var algebra = FrobeniusAlgebra.Khovanov;
    if (algebraName === 'Lee') algebra = FrobeniusAlgebra.Lee;
    else if (algebraName === 'BarNatan') algebra = FrobeniusAlgebra.BarNatan;

    // Select ring
    var ring = CoefficientRing.Z;
    if (ringName === 'Q') ring = CoefficientRing.Q;
    else if (ringName === 'F2') ring = CoefficientRing.Fp(2);
    else if (ringName === 'F3') ring = CoefficientRing.Fp(3);

    var cubeData = buildAnnotatedCube(pdCode, crossingSigns, algebra);

    // Store cube state so openCubeVertexView (from cube tab) works
    var cubeVerts = [];
    for (var vi = 0; vi < cubeData.vertices.length; vi++) {
      var vd = cubeData.vertices[vi];
      cubeVerts.push({ bits: vd.bits, label: vd.label, circles: vd.circles });
    }
    window._cubeState = {
      vertices: cubeVerts,
      n: n,
      knotName: knotName,
      variant: variant === 'mirror' ? 'mirror' : 'original'
    };

    // Reset path mode state
    window._khcPathMode = false;
    window._khcPath = [];

    var html = '';

    // ─────────────────────────────────────────────────────────────────
    // Section 1: Setup
    // ─────────────────────────────────────────────────────────────────

    html += '<div class="exp-card">';
    html += '<h3>Step 1: The Diagram and Its Crossings</h3>';
    html += '<p>We begin with the PD code for <strong>' + knotName + '</strong>' +
      (variant === 'mirror' ? ' (mirror)' : '') +
      ', which has <strong>' + n + ' crossings</strong>.</p>';

    html += '<p>Each crossing \\([a,b,c,d]\\) lists arc labels counterclockwise ' +
      'from the incoming under-arc: \\(a\\) = incoming under, \\(c\\) = outgoing under, ' +
      '\\(b\\) and \\(d\\) are the over-arcs. Standing on the under-strand facing its direction ' +
      'of travel, the crossing is \\(+1\\) if the over-strand passes right-to-left, \\(-1\\) if left-to-right ' +
      '(equivalently \\(\\varepsilon = \\operatorname{sign}\\,\\det[\\mathbf{u}_{\\text{under}},\\mathbf{u}_{\\text{over}}]\\)):</p>';
    html += '<ul style="margin:0.5em 0 0.5em 1.5em;font-size:0.9em">';
    html += '<li><strong>Positive (+1)</strong>: over-strand oriented \\(b \\to d\\)</li>';
    html += '<li><strong>Negative (−1)</strong>: over-strand oriented \\(d \\to b\\)</li>';
    html += '</ul>';

    html += '<table style="margin:0.5em 0;font-size:0.85em;border-collapse:collapse">';
    html += '<tr><th style="padding:2px 8px;border:1px solid #ccc">Crossing</th>' +
      '<th style="padding:2px 8px;border:1px solid #ccc">PD</th>' +
      '<th style="padding:2px 8px;border:1px solid #ccc">Sign</th></tr>';
    for (var i = 0; i < n; i++) {
      var signStr = crossingSigns[i] > 0 ? '+1' : '−1';
      var signColor = crossingSigns[i] > 0 ? '#2e7d32' : '#c62828';
      html += '<tr><td style="padding:2px 8px;border:1px solid #ccc">' + (i + 1) +
        '</td><td style="padding:2px 8px;border:1px solid #ccc;font-family:monospace">[' +
        pdCode[i].join(', ') + ']</td><td style="padding:2px 8px;border:1px solid #ccc;color:' +
        signColor + ';font-weight:bold">' + signStr + '</td></tr>';
    }
    html += '</table>';

    html += '<p>Writhe: \\(w = n_+ - n_- = ' + cubeData.nPlus + ' - ' +
      cubeData.nMinus + ' = ' + cubeData.writhe + '\\)</p>';
    html += '</div>';

    // ─────────────────────────────────────────────────────────────────
    // Section 2: Resolution Cube with Algebraic Labels
    // ─────────────────────────────────────────────────────────────────

    html += '<div class="exp-card">';
    html += '<h3>Step 2: The Resolution Cube</h3>';
    html += '<p>Each of the \\(2^{' + n + '} = ' + (1 << n) +
      '\\) vertices corresponds to a choice of 0-smoothing or 1-smoothing at ' +
      'each crossing. The vertex label \\(v = v_1 v_2 \\cdots v_n\\) records ' +
      'which smoothing was chosen (0 or 1) at each crossing.</p>';

    html += '<p>At each vertex, the resolved diagram consists of disjoint circles. ' +
      'We assign to each circle a copy of the Frobenius algebra \\(V = \\text{span}\\{\\mathbf{1}, x\\}\\), ' +
      'so the generator space at vertex \\(v\\) is \\(V^{\\otimes c(v)}\\) where \\(c(v)\\) is the circle count.</p>';

    // Cube SVG
    html += buildAnnotatedCubeSVG(cubeData);

    // Legend
    html += '<div style="font-size:0.8em;margin:0.5em 0;color:#666">';
    html += '<span style="color:#2171b5">■</span> Blue edges = merge (multiplication \\(m\\)) &nbsp; ';
    html += '<span style="color:#d6604d">■</span> Red edges = split (comultiplication \\(\\Delta\\)) &nbsp; ';
    html += '<em>Click a vertex to see its neighborhood; click edges in path mode to compose cobordisms.</em></div>';

    // Path mode controls
    html += '<div id="khc-path-controls" style="text-align:center;margin:0.5rem auto;max-width:fit-content">';
    html += '<button id="khc-path-toggle" onclick="khcTogglePathMode()" style="padding:0.35rem 0.9rem;border:1.5px solid var(--accent,#1976d2);border-radius:6px;background:transparent;color:var(--accent,#1976d2);font-weight:600;font-size:0.85rem;cursor:pointer">Path Mode</button>';
    html += '<span id="khc-path-info" style="display:none;margin-left:0.7rem;font-size:0.85rem;color:#555">';
    html += 'Click edges to build a path. <button onclick="khcClearPath()" style="padding:2px 8px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:0.8rem">Clear</button></span>';
    html += '<div id="khc-path-display" style="display:none;margin-top:0.5rem;font-size:0.85rem;color:#333"></div>';
    html += '<button id="khc-path-view-btn" style="display:none;margin-top:0.5rem;padding:0.4rem 1rem;border:none;border-radius:6px;background:var(--accent,#1976d2);color:#fff;font-weight:600;font-size:0.9rem;cursor:pointer" onclick="openCompositeCobordism()">View Composite Cobordism</button>';
    html += '</div>';

    // Vertex detail table (for small n)
    if (n <= 6) {
      html += '<details><summary style="cursor:pointer;font-weight:600;margin:0.5em 0">' +
        'Vertex Details (click to expand)</summary>';
      html += '<table style="font-size:0.82em;border-collapse:collapse;margin:0.5em 0">';
      html += '<tr><th style="padding:2px 6px;border:1px solid #ccc">Vertex</th>' +
        '<th style="padding:2px 6px;border:1px solid #ccc">|v|</th>' +
        '<th style="padding:2px 6px;border:1px solid #ccc">c(v)</th>' +
        '<th style="padding:2px 6px;border:1px solid #ccc">i = |v| − n₋</th>' +
        '<th style="padding:2px 6px;border:1px solid #ccc">σ(v) = n − 2|v|</th>' +
        '<th style="padding:2px 6px;border:1px solid #ccc">Bracket contrib.</th>' +
        '<th style="padding:2px 6px;border:1px solid #ccc">Generators (with j-grading)</th></tr>';

      for (var vi = 0; vi < cubeData.vertices.length; vi++) {
        var v = cubeData.vertices[vi];
        // Bracket contribution: A^sigma * d^(c-1)
        var bracketStr = 'A^{' + v.sigma + '} \\cdot d^{' + (v.circles - 1) + '}';

        var genStrs = [];
        for (var gi = 0; gi < v.gens.length && gi < 16; gi++) {
          genStrs.push('\\(' + v.gens[gi].label + '\\) (j=' + v.gens[gi].j + ')');
        }
        if (v.gens.length > 16) genStrs.push('... (' + v.gens.length + ' total)');

        html += '<tr><td style="padding:2px 6px;border:1px solid #ccc;font-family:monospace">' +
          v.label + '</td>' +
          '<td style="padding:2px 6px;border:1px solid #ccc">' + v.weight + '</td>' +
          '<td style="padding:2px 6px;border:1px solid #ccc">' + v.circles + '</td>' +
          '<td style="padding:2px 6px;border:1px solid #ccc">' + v.iDeg + '</td>' +
          '<td style="padding:2px 6px;border:1px solid #ccc">' + v.sigma + '</td>' +
          '<td style="padding:2px 6px;border:1px solid #ccc">\\(' + bracketStr + '\\)</td>' +
          '<td style="padding:2px 6px;border:1px solid #ccc;font-size:0.85em">' +
          genStrs.join(', ') + '</td></tr>';
      }
      html += '</table></details>';
    }
    html += '</div>';

    // ─────────────────────────────────────────────────────────────────
    // Section 3: Frobenius Algebra
    // ─────────────────────────────────────────────────────────────────

    html += '<div class="exp-card">';
    html += '<h3>Step 3: The Frobenius Algebra (' + algebraName + ')</h3>';
    html += '<p>The Khovanov chain complex is built from a 2-dimensional ' +
      'commutative Frobenius algebra \\(A = \\text{span}\\{\\mathbf{1}, x\\}\\) ' +
      'equipped with multiplication \\(m: A \\otimes A \\to A\\) and ' +
      'comultiplication \\(\\Delta: A \\to A \\otimes A\\).</p>';

    if (algebraName === 'Khovanov') {
      html += '<p><strong>Khovanov algebra</strong> (\\(x^2 = 0\\)):</p>';
      html += '<div class="exp-poly">\\(m(\\mathbf{1}, \\mathbf{1}) = \\mathbf{1}, \\quad ' +
        'm(\\mathbf{1}, x) = m(x, \\mathbf{1}) = x, \\quad m(x, x) = 0\\)</div>';
      html += '<div class="exp-poly">\\(\\Delta(\\mathbf{1}) = \\mathbf{1} \\otimes x + x \\otimes \\mathbf{1}, \\quad ' +
        '\\Delta(x) = x \\otimes x\\)</div>';
      html += '<p>This algebra categorifies the Jones polynomial: its graded Euler ' +
        'characteristic recovers \\(\\hat{J}(q) = (q + q^{-1}) V(q^{-2})\\).</p>';
    } else if (algebraName === 'Lee') {
      html += '<p><strong>Lee algebra</strong> (\\(x^2 = 1\\)):</p>';
      html += '<div class="exp-poly">\\(m(\\mathbf{1}, \\mathbf{1}) = \\mathbf{1}, \\quad ' +
        'm(\\mathbf{1}, x) = m(x, \\mathbf{1}) = x, \\quad m(x, x) = \\mathbf{1}\\)</div>';
      html += '<div class="exp-poly">\\(\\Delta(\\mathbf{1}) = \\mathbf{1} \\otimes x + x \\otimes \\mathbf{1}, \\quad ' +
        '\\Delta(x) = x \\otimes x + \\mathbf{1} \\otimes \\mathbf{1}\\)</div>';
      html += '<p>Lee\'s deformation breaks the quantum grading. Over \\(\\mathbb{Q}\\), ' +
        'the homology collapses to rank \\(2^c\\) (where \\(c\\) is the number of link components). ' +
        'The Rasmussen \\(s\\)-invariant is extracted from the surviving generators.</p>';
    } else if (algebraName === 'BarNatan') {
      html += '<p><strong>Bar-Natan algebra</strong> (\\(x^2 = x\\)):</p>';
      html += '<div class="exp-poly">\\(m(\\mathbf{1}, \\mathbf{1}) = \\mathbf{1}, \\quad ' +
        'm(\\mathbf{1}, x) = m(x, \\mathbf{1}) = x, \\quad m(x, x) = x\\)</div>';
      html += '<div class="exp-poly">\\(\\Delta(\\mathbf{1}) = \\mathbf{1} \\otimes x + x \\otimes \\mathbf{1} - ' +
        '\\mathbf{1} \\otimes \\mathbf{1}, \\quad \\Delta(x) = x \\otimes x\\)</div>';
      html += '<p>Bar-Natan\'s deformation is another filtered theory. Like Lee homology, ' +
        'it collapses over \\(\\mathbb{Q}\\) to rank \\(2^c\\). Over \\(\\mathbb{F}_2\\), ' +
        'it coincides with Khovanov homology (the deformation term vanishes mod 2).</p>';
    }

    // Disclaimer for Lee/Bar-Natan in bigraded display
    if (algebraName !== 'Khovanov') {
      html += '<div style="margin-top:0.5em;padding:0.7em;background:#fff3e0;border-left:4px solid #ff9800;border-radius:4px;font-size:0.88em">';
      html += '<p style="margin:0;font-weight:600">⚠ Bigraded display limitation</p>';
      html += '<p style="margin:0.3em 0 0 0">This tab shows the <em>bigraded</em> chain complex, which preserves the quantum grading \\(j\\). ' +
        'The ' + algebraName + ' deformation includes differential terms that cross \\(j\\)-gradings by \\(\\pm 2\\). ' +
        'These cross-grading terms are <strong>not shown</strong> in the matrices below — the bigraded homology displayed here ' +
        'equals Khovanov homology, not the true ' + algebraName + ' homology.</p>';
      html += '<p style="margin:0.3em 0 0 0">For the correct ' + algebraName + ' homology (rank collapse over \\(\\mathbb{Q}\\), ' +
        's-invariant), see the <strong>Homological</strong> tab, which uses a filtered (singly-graded) complex.</p>';
      html += '</div>';
    }

    html += '</div>';

    // ─────────────────────────────────────────────────────────────────
    // Section 4: Edge Maps (Differentials)
    // ─────────────────────────────────────────────────────────────────

    html += '<div class="exp-card">';
    html += '<h3>Step 4: Edge Maps and Koszul Signs</h3>';
    html += '<p>Each edge of the cube corresponds to changing one smoothing from 0 to 1. ' +
      'This either <strong>merges</strong> two circles into one (apply \\(m\\)) or ' +
      '<strong>splits</strong> one circle into two (apply \\(\\Delta\\)).</p>';

    html += '<p>To ensure \\(d^2 = 0\\), each face of the cube must anticommute. ' +
      'The <strong>Koszul sign</strong> for the edge that flips bit \\(k\\) at vertex \\(v\\) is:</p>';
    html += '<div class="exp-poly">\\(\\varepsilon(v, k) = (-1)^{\\sum_{j < k} v_j}\\)</div>';
    html += '<p>That is, the sign is \\((-1)\\) raised to the number of 1-bits in \\(v\\) ' +
      'to the right of position \\(k\\).</p>';

    // Show a few edge computations for small n
    if (n <= 5) {
      html += '<details open><summary style="cursor:pointer;font-weight:600">Edge Map Details</summary>';
      html += '<table style="font-size:0.82em;border-collapse:collapse;margin:0.5em 0">';
      html += '<tr><th style="padding:2px 6px;border:1px solid #ccc">Edge</th>' +
        '<th style="padding:2px 6px;border:1px solid #ccc">Bit</th>' +
        '<th style="padding:2px 6px;border:1px solid #ccc">Type</th>' +
        '<th style="padding:2px 6px;border:1px solid #ccc">Koszul</th>' +
        '<th style="padding:2px 6px;border:1px solid #ccc">Map</th></tr>';

      for (var ei = 0; ei < cubeData.edges.length; ei++) {
        var e = cubeData.edges[ei];
        var mapStr = e.type === 'merge' ? 'm' : '\\Delta';
        var signStr = e.koszulSign > 0 ? '+1' : '−1';
        html += '<tr><td style="padding:2px 6px;border:1px solid #ccc;font-family:monospace">' +
          e.srcLabel + ' → ' + e.tgtLabel + '</td>' +
          '<td style="padding:2px 6px;border:1px solid #ccc">' + e.bit + '</td>' +
          '<td style="padding:2px 6px;border:1px solid #ccc;color:' +
          (e.type === 'merge' ? '#2171b5' : '#d6604d') + '">' + e.type + '</td>' +
          '<td style="padding:2px 6px;border:1px solid #ccc">' + signStr + '</td>' +
          '<td style="padding:2px 6px;border:1px solid #ccc">\\(' + signStr.replace('−', '-') +
          ' \\cdot ' + mapStr + '\\)</td></tr>';
      }
      html += '</table></details>';
    }
    html += '</div>';

    // ─────────────────────────────────────────────────────────────────
    // Section 5: Build the actual chain complex
    // ─────────────────────────────────────────────────────────────────

    var complex = buildKhovanovComplex(pdCode, crossingSigns, algebra, ring);
    var bounds = complex.getBounds();
    var verification = complex.verify();

    html += '<div class="exp-card">';
    html += '<h3>Step 5: The Bigraded Chain Complex \\(C^{i,j}\\)</h3>';
    html += '<p>Generators from all vertices at the same homological grading \\(i = |v| - n_-\\) ' +
      'are assembled into chain groups \\(C^{i,j}\\), where \\(j\\) is the quantum grading. ' +
      'The differential \\(d: C^{i,j} \\to C^{i+1,j}\\) preserves \\(j\\) and increases \\(i\\) by 1.</p>';

    html += '<p>\\(d^2 = 0\\) check: <span style="color:' +
      (verification.valid ? '#2e7d32' : '#c62828') + ';font-weight:bold">' +
      (verification.valid ? '✓ verified' : '✗ FAILED') + '</span></p>';

    // Chain group ranks table
    html += '<p><strong>Chain group ranks</strong> \\(\\dim C^{i,j}\\):</p>';
    html += renderBigradedRankTable(complex, bounds);

    // Differential matrices
    if (n <= 6) {
      html += '<details><summary style="cursor:pointer;font-weight:600;margin:0.5em 0">' +
        'Differential Matrices (click to expand)</summary>';
      for (var i = bounds.iMin; i < bounds.iMax; i++) {
        for (var j = bounds.jMin; j <= bounds.jMax; j++) {
          var key = i + ',' + j;
          var mat = complex.differentials[key];
          if (!mat) continue;
          html += '<div style="margin:0.5em 0;padding:0.5em;background:#f8f8f8;border-radius:4px;font-size:0.85em">';
          html += '<strong>\\(d^{' + i + ',' + j + '}\\)</strong>: ' +
            mat.rows + '×' + mat.cols;
          if (mat.rows <= 12 && mat.cols <= 12) {
            html += '<pre style="margin:0.3em 0;font-size:0.8em">' +
              formatMatrix(mat) + '</pre>';
          } else {
            html += ' <em>(too large to display)</em>';
          }
          html += '</div>';
        }
      }
      html += '</details>';
    }
    html += '</div>';

    // ─────────────────────────────────────────────────────────────────
    // Section 6: Homology
    // ─────────────────────────────────────────────────────────────────

    var homMap = complex.homology(ring);
    // Convert Map to plain object for easier iteration
    var hom = {};
    homMap.forEach(function (val, key) { hom[key] = val; });

    html += '<div class="exp-card">';
    html += '<h3>Step 6: Khovanov Homology \\(Kh^{i,j}\\)</h3>';
    html += '<p>Homology is computed as \\(Kh^{i,j} = \\ker d^{i,j} / \\text{im}\\, d^{i-1,j}\\) ' +
      'over ';
    if (ringName === 'Z') html += '\\(\\mathbb{Z}\\)';
    else if (ringName === 'Q') html += '\\(\\mathbb{Q}\\)';
    else html += '\\(\\mathbb{F}_{' + ringName.replace('F', '') + '}\\)';
    html += '.</p>';

    if (ringName === 'Z') {
      html += '<p>Over \\(\\mathbb{Z}\\), homology groups may have both free and torsion parts: ' +
        '\\(Kh^{i,j} \\cong \\mathbb{Z}^r \\oplus \\bigoplus_k \\mathbb{Z}/p_k\\). ' +
        'Torsion appears in pink cells below.</p>';
    }

    html += renderHomologyTable(hom, bounds, ring, ringName);

    // Summarize
    var totalRank = 0, totalTorsion = 0;
    var torsionDetails = [];
    for (var key in hom) {
      if (!hom.hasOwnProperty(key)) continue;
      totalRank += hom[key].rank || 0;
      var tor = hom[key].torsion || [];
      totalTorsion += tor.length;
      if (tor.length > 0) {
        torsionDetails.push({ bidegree: key, torsion: tor });
      }
    }
    html += '<p>Total rank: ' + totalRank;
    if (totalTorsion > 0) html += ', torsion summands: ' + totalTorsion;
    html += '</p>';

    // Torsion explanation
    if (torsionDetails.length > 0 && ringName === 'Z') {
      html += '<div style="margin-top:0.5em;padding:0.7em;background:#fce4ec;border-radius:6px;font-size:0.88em">';
      html += '<p style="margin:0 0 0.4em 0;font-weight:600">Torsion in Khovanov Homology</p>';
      html += '<p style="margin:0 0 0.4em 0">Torsion elements are elements \\(\\alpha \\in Kh^{i,j}\\) ' +
        'with \\(p \\cdot \\alpha = 0\\) for some prime \\(p\\). They are invisible to the Jones ' +
        'polynomial (the Euler characteristic only sees free rank), making them <em>strictly finer</em> ' +
        'invariants. Khovanov homology torsion is almost always 2-torsion (\\(\\mathbb{Z}/2\\)).</p>';
      html += '<ul style="margin:0.3em 0 0 1.2em">';
      for (var ti = 0; ti < torsionDetails.length; ti++) {
        var td = torsionDetails[ti];
        var parts = td.bidegree.split(',');
        var torStrs = td.torsion.map(function (p) { return '\\(\\mathbb{Z}/' + p + '\\)'; });
        html += '<li>\\(Kh^{' + parts[0] + ',' + parts[1] + '}\\) contains ' +
          torStrs.join(' \\(\\oplus\\) ') + '</li>';
      }
      html += '</ul>';
      html += '<p style="margin:0.4em 0 0 0;font-size:0.92em">To see torsion "disappear," switch to ' +
        '\\(\\mathbb{Q}\\) coefficients (tensoring with \\(\\mathbb{Q}\\) kills all torsion). ' +
        'To detect \\(p\\)-torsion, compute over \\(\\mathbb{F}_p\\) and compare ranks with \\(\\mathbb{Q}\\): ' +
        'any rank increase signals \\(p\\)-torsion by the Universal Coefficient Theorem.</p>';
      html += '</div>';
    } else if (totalTorsion === 0 && ringName === 'Z') {
      html += '<p style="font-size:0.88em;color:#555"><em>No torsion detected over \\(\\mathbb{Z}\\). ' +
        'This is typical for alternating knots with few crossings. ' +
        'The first torsion in Rolfsen\'s table appears for the trefoil \\(3_1\\) at \\(Kh^{-3,-7} \\cong \\mathbb{Z}/2\\).</em></p>';
    }
    html += '</div>';

    // ─────────────────────────────────────────────────────────────────
    // Section 7: Graded Euler Characteristic and Jones Polynomial
    // ─────────────────────────────────────────────────────────────────

    html += '<div class="exp-card">';
    html += '<h3>Step 7: Graded Euler Characteristic → Jones Polynomial</h3>';

    html += '<p>The <strong>graded Euler characteristic</strong> of the chain complex is:</p>';
    html += '<div class="exp-poly">\\(\\chi_q(CKh) = \\sum_{i,j} (-1)^i \\cdot q^j \\cdot \\dim C^{i,j}\\)</div>';

    html += '<p>A fundamental theorem: this equals the <strong>unnormalized Jones polynomial</strong>:</p>';
    html += '<div class="exp-poly">\\(\\chi_q(CKh) = \\hat{J}(q) = (q + q^{-1}) \\cdot V(q^{-2})\\)</div>';
    html += '<p>where \\(V(q)\\) is the Jones polynomial. For links with \\(c\\) components, ' +
      'a sign factor \\((-1)^{c-1}\\) appears in the formula.</p>';

    html += '<p>This identity is the <em>decategorification</em> of Khovanov homology: ' +
      'the homology groups "remember" more than the polynomial, but their alternating ' +
      'sum recovers it. In particular, any knot invariant derived from \\(Kh\\) (such as ' +
      'the Rasmussen \\(s\\)-invariant from Lee homology) is <em>strictly stronger</em> ' +
      'than the Jones polynomial.</p>';

    // Compute Euler characteristic from chain groups
    var eulerFromChain = complex.gradedEulerCharacteristic(false, ring);
    if (eulerFromChain) {
      html += '<p>\\(\\chi_q(CKh) = ' + eulerFromChain.toLatex() + '\\)</p>';
    }

    html += '</div>';

    // ─────────────────────────────────────────────────────────────────
    // Section 8: Frobenius Algebra Comparison (if not Khovanov)
    // ─────────────────────────────────────────────────────────────────

    if (algebraName !== 'Khovanov') {
      html += '<div class="exp-card">';
      html += '<h3>Comparing with Khovanov Homology</h3>';
      html += '<p>The ' + algebraName + ' deformation changes the Frobenius algebra ' +
        'relations, which changes the differential matrices and therefore the homology. ';
      if (algebraName === 'Lee') {
        html += 'The Lee deformation (\\(x^2 = 1\\) instead of \\(x^2 = 0\\)) breaks the ' +
          'quantum grading, and over \\(\\mathbb{Q}\\) the homology collapses to rank ' +
          '\\(2^c\\) where \\(c\\) is the number of link components. The Rasmussen \\(s\\)-invariant ' +
          'is defined as the average of the quantum gradings of the two surviving generators.</p>';
      } else {
        html += 'The Bar-Natan deformation (\\(x^2 = x\\) instead of \\(x^2 = 0\\)) also ' +
          'causes the homology to collapse over \\(\\mathbb{Q}\\). Notably, over \\(\\mathbb{F}_2\\) ' +
          'the deformation term vanishes (\\(x^2 = x \\Rightarrow x^2 - x = 0\\) is automatic in ' +
          'characteristic 2), so Bar-Natan homology over \\(\\mathbb{F}_2\\) equals Khovanov homology over \\(\\mathbb{F}_2\\).</p>';
      }
      html += '</div>';
    }

    resultsDiv.innerHTML = html;
    // Render KaTeX
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(resultsDiv, {
        delimiters: [
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ]
      });
    }
  }

  // ===================================================================
  // Render helpers
  // ===================================================================

  function renderBigradedRankTable(complex, bounds) {
    // Standard convention: rows = j (quantum, descending), columns = i (homological)
    var html = '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:0.82em;margin:0.5em 0">';
    html += '<tr><th style="padding:3px 6px;border:1px solid #ccc;background:#eee">j \\ i</th>';
    for (var i = bounds.iMin; i <= bounds.iMax; i++) {
      html += '<th style="padding:3px 6px;border:1px solid #ccc;background:#eee">' + i + '</th>';
    }
    html += '</tr>';

    for (var j = bounds.jMax; j >= bounds.jMin; j--) {
      html += '<tr><th style="padding:3px 6px;border:1px solid #ccc;background:#eee">' + j + '</th>';
      for (var i = bounds.iMin; i <= bounds.iMax; i++) {
        var key = i + ',' + j;
        var rank = complex.groups[key] || 0;
        var bg = rank > 0 ? '#e8f5e9' : '#fff';
        html += '<td style="padding:3px 6px;border:1px solid #ccc;text-align:center;background:' +
          bg + '">' + (rank > 0 ? rank : '·') + '</td>';
      }
      html += '</tr>';
    }
    html += '</table></div>';
    return html;
  }

  function renderHomologyTable(hom, bounds, ring, ringName) {
    // Standard convention: rows = j (quantum, descending), columns = i (homological)
    var html = '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:0.82em;margin:0.5em 0">';
    html += '<tr><th style="padding:3px 6px;border:1px solid #ccc;background:#eee">j \\ i</th>';
    for (var i = bounds.iMin; i <= bounds.iMax; i++) {
      html += '<th style="padding:3px 6px;border:1px solid #ccc;background:#eee">' + i + '</th>';
    }
    html += '</tr>';

    for (var j = bounds.jMax; j >= bounds.jMin; j--) {
      html += '<tr><th style="padding:3px 6px;border:1px solid #ccc;background:#eee">' + j + '</th>';
      for (var i = bounds.iMin; i <= bounds.iMax; i++) {
        var key = i + ',' + j;
        var h = hom[key];
        var text = '·';
        var bg = '#fff';
        if (h) {
          var r = h.rank || 0;
          var t = h.torsion || [];
          if (r > 0 || t.length > 0) {
            var parts = [];
            if (r > 0) {
              if (ringName === 'Z') parts.push('ℤ' + (r > 1 ? '<sup>' + r + '</sup>' : ''));
              else if (ringName === 'Q') parts.push('ℚ' + (r > 1 ? '<sup>' + r + '</sup>' : ''));
              else parts.push('𝔽' + (r > 1 ? '<sup>' + r + '</sup>' : ''));
              bg = '#fffde7';
            }
            for (var ti = 0; ti < t.length; ti++) {
              parts.push('ℤ/' + t[ti]);
              bg = '#fce4ec';
            }
            text = parts.join(' ⊕ ');
          }
        }
        html += '<td style="padding:3px 6px;border:1px solid #ccc;text-align:center;background:' +
          bg + ';font-size:0.9em">' + text + '</td>';
      }
      html += '</tr>';
    }
    html += '</table></div>';
    return html;
  }

  function formatMatrix(mat) {
    var lines = [];
    for (var r = 0; r < mat.rows; r++) {
      var row = [];
      for (var c = 0; c < mat.cols; c++) {
        var v = mat.get(r, c);
        var s = String(v);
        while (s.length < 3) s = ' ' + s;
        row.push(s);
      }
      lines.push('  [ ' + row.join(' ') + ' ]');
    }
    return lines.join('\n');
  }

  // ===================================================================
  // Tab initialization
  // ===================================================================

  function initKhovanovComplexTab() {
    if (_initialized) return;
    _initialized = true;

    var container = document.getElementById('tab-khovanov-complex');
    if (!container) return;

    container.innerHTML =
      '<div style="padding:1rem">' +
      '<h2 style="margin-bottom:0.3rem">Khovanov Complex — Step by Step</h2>' +
      '<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem">' +
      'A pedagogical walkthrough of how the Khovanov chain complex is constructed from ' +
      'the cube of resolutions, and how its graded Euler characteristic recovers the Jones polynomial.</p>' +
      '<div class="cor-controls" style="margin-bottom:1rem">' +
      '  <label><strong>Knot/Link:</strong> <select id="khc-knot-sel"></select></label>' +
      '  <label><strong>Variant:</strong> <select id="khc-variant-sel">' +
      '    <option value="original">Original</option><option value="mirror">Mirror</option></select></label>' +
      '  <label><strong>Algebra:</strong> <select id="khc-algebra-sel">' +
      '    <option value="Khovanov">Khovanov (x²=0)</option>' +
      '    <option value="Lee">Lee (x²=1)</option>' +
      '    <option value="BarNatan">Bar-Natan (x²=x)</option></select></label>' +
      '  <label><strong>Ring:</strong> <select id="khc-ring-sel">' +
      '    <option value="Z">ℤ</option><option value="Q">ℚ</option>' +
      '    <option value="F2">𝔽₂</option><option value="F3">𝔽₃</option></select></label>' +
      '  <button onclick="updateKhovanovComplex()" style="padding:6px 16px;border:1px solid #888;border-radius:4px;cursor:pointer">Compute</button>' +
      '</div>' +
      '<div id="khc-results"></div>' +
      '</div>';

    // Populate selector
    var sel = document.getElementById('khc-knot-sel');
    var items = getAllItems();
    var sorted = Object.keys(items).sort(function (a, b) {
      var ca = parseInt(items[a].crossings) || 0;
      var cb = parseInt(items[b].crossings) || 0;
      return ca - cb || a.localeCompare(b);
    });
    for (var si = 0; si < sorted.length; si++) {
      var name = sorted[si];
      var d = items[name];
      var c = parseInt(d.crossings) || 0;
      if (!d.pd_code || d.pd_code.length === 0) continue;
      if (c > 10) continue; // Only show knots suitable for detailed display
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name + ' (' + c + ' crossings)';
      sel.appendChild(opt);
    }
  }

  // Global function for the Compute button
  window.updateKhovanovComplex = function () {
    var knotName = document.getElementById('khc-knot-sel').value;
    var variant = document.getElementById('khc-variant-sel').value;
    var algebraName = document.getElementById('khc-algebra-sel').value;
    var ringName = document.getElementById('khc-ring-sel').value;

    var items = getAllItems();
    var d = items[knotName];
    if (!d || !d.pd_code || d.pd_code.length === 0) {
      document.getElementById('khc-results').innerHTML =
        '<p>No PD code available for ' + knotName + '.</p>';
      return;
    }

    renderKhovanovComplex(knotName, d, d.pd_code.slice(), variant, algebraName, ringName);
  };

  window.initKhovanovComplexTab = initKhovanovComplexTab;

  // ===================================================================
  // Path mode functions (mirrors cube tab behavior)
  // ===================================================================

  window.khcTogglePathMode = function () {
    window._khcPathMode = !window._khcPathMode;
    var btn = document.getElementById('khc-path-toggle');
    var info = document.getElementById('khc-path-info');
    if (window._khcPathMode) {
      btn.style.background = 'var(--accent,#1976d2)';
      btn.style.color = '#fff';
      btn.textContent = 'Path Mode ✓';
      info.style.display = 'inline';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--accent,#1976d2)';
      btn.textContent = 'Path Mode';
      info.style.display = 'none';
      khcClearPath();
    }
  };

  window.khcClearPath = function () {
    var path = window._khcPath || [];
    for (var i = 0; i < path.length; i++) {
      var e = path[i];
      var line = document.getElementById('khc-edge-' + Math.min(e.srcBits, e.tgtBits) + '-' + Math.max(e.srcBits, e.tgtBits));
      if (line) {
        line.setAttribute('stroke', line.dataset.origColor || '#ddd');
        line.setAttribute('stroke-width', line.dataset.origWidth || '1.5');
      }
    }
    window._khcPath = [];
    khcUpdatePathDisplay();
  };

  window.khcEdgeClick = function (lo, hi, changedBit) {
    if (!window._khcPathMode) {
      // Not in path mode: clicking edge opens vertex view of lower vertex
      if (typeof openCubeVertexView === 'function') openCubeVertexView(lo);
      return;
    }
    // Path mode: also feed into existing cobordism path infrastructure
    var path = window._khcPath;
    if (path.length > 0) {
      var lastEdge = path[path.length - 1];
      if (lo !== lastEdge.tgtBits && hi !== lastEdge.tgtBits) {
        var display = document.getElementById('khc-path-display');
        if (display) {
          display.style.display = 'block';
          var st = window._cubeState;
          var nn = st ? st.n : 8;
          display.innerHTML = '<span style="color:#c62828">Edge must start at ' +
            lastEdge.tgtBits.toString(2).padStart(nn, '0') + '</span>';
          setTimeout(function () { khcUpdatePathDisplay(); }, 1500);
        }
        return;
      }
    }
    if (path.some(function (e) { return e.srcBits === lo && e.tgtBits === hi; })) return;
    path.push({ srcBits: lo, tgtBits: hi, changedBit: changedBit });
    // Also sync with global cobordism path for composite cobordism viewer
    window._cobordismPath = path;
    khcUpdatePathDisplay();
    khcHighlightPath();
  };

  function khcUpdatePathDisplay() {
    var path = window._khcPath;
    var display = document.getElementById('khc-path-display');
    var viewBtn = document.getElementById('khc-path-view-btn');
    if (!display) return;
    if (path.length === 0) {
      display.style.display = 'none';
      if (viewBtn) viewBtn.style.display = 'none';
      return;
    }
    display.style.display = 'block';
    var st = window._cubeState;
    var nn = st ? st.n : 8;
    var labels = [path[0].srcBits.toString(2).padStart(nn, '0')];
    for (var i = 0; i < path.length; i++) {
      labels.push('<span style="color:var(--accent,#1976d2)">→<sub>c' + (path[i].changedBit + 1) +
        '</sub></span> ' + path[i].tgtBits.toString(2).padStart(nn, '0'));
    }
    display.innerHTML = '<strong>Path:</strong> ' + labels.join(' ');
    if (viewBtn) viewBtn.style.display = path.length >= 1 ? 'inline-block' : 'none';
  }

  function khcHighlightPath() {
    // Reset all khc edges
    var allEdges = document.querySelectorAll('[id^="khc-edge-"]');
    for (var i = 0; i < allEdges.length; i++) {
      var el = allEdges[i];
      // Restore original color
      var origColor = el.dataset.origColor;
      if (!origColor) {
        origColor = el.getAttribute('stroke');
        el.dataset.origColor = origColor;
      }
      el.setAttribute('stroke', origColor);
      el.setAttribute('stroke-width', el.dataset.origWidth || '1.5');
    }
    // Highlight path edges
    var path = window._khcPath;
    for (var i = 0; i < path.length; i++) {
      var e = path[i];
      var lo = Math.min(e.srcBits, e.tgtBits), hi = Math.max(e.srcBits, e.tgtBits);
      var line = document.getElementById('khc-edge-' + lo + '-' + hi);
      if (line) {
        var hue = (i / Math.max(path.length - 1, 1)) * 240;
        line.setAttribute('stroke', 'hsl(' + hue + ', 70%, 50%)');
        line.setAttribute('stroke-width', '3');
      }
    }
  }

})();
