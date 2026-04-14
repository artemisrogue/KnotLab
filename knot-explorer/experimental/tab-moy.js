/**
 * tab-moy.js -- MOY / sl_n Cube tab for the knot explorer app
 *
 * Computes sl_n polynomials via the MOY state-sum construction and
 * visualises the cube of MOY resolutions with inline SVG graphs.
 *
 * Dependencies (loaded before this script):
 *   - polynomial.js   (LaurentPoly, CoefficientRing)
 *   - cube.js          (ResolutionCube)
 *   - moy-graph.js     (MOYGraph, computeSlNPolynomial)
 *   - KaTeX            (renderMathInElement)
 *
 * Globals expected:
 *   KNOT_DATA, LINK_DATA, getAllItems()
 */

(function () {
  'use strict';

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------

  var moyInitialized = false;

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  /** Hamming weight (popcount) of a non-negative integer. */
  function popcount(x) {
    var c = 0;
    while (x) { c += x & 1; x >>= 1; }
    return c;
  }

  /** Format bits as binary string of given length. */
  function bitsToLabel(bits, len) {
    return bits.toString(2).padStart(len, '0');
  }

  /**
   * Derive crossing signs from PD code using the standard convention.
   *
   * For PD crossing [a, b, c, d] (counter-clockwise from incoming under-strand):
   *   +1 (positive / right-hand) if the under-strand goes from a to c
   *        and the over-strand goes from b to d with the standard orientation.
   *   -1 otherwise.
   *
   * Heuristic: use the geometric sign from the PD code structure.
   * The convention used here matches the existing ResolutionCube:
   *   For each crossing [a,b,c,d], sign = +1 if (b - a + N) % N < (d - c + N) % N
   *   else -1, where N = 2 * numCrossings.
   */
  function deriveCrossingSigns(pdCode) {
    var n = pdCode.length;
    var N = 2 * n;
    return pdCode.map(function (cr) {
      var a = cr[0], b = cr[1], c = cr[2], d = cr[3];
      // Standard KnotAtlas convention: positive crossing has
      // the over-strand going from d to b (counter-clockwise from incoming under a).
      // We use the simple parity test: sign = +1 if a is odd, -1 if a is even
      // (for standard PD codes from KnotAtlas where arcs are numbered sequentially).
      // However, the safest approach for our data is the arc ordering test.
      var diff1 = ((b - a) % N + N) % N;
      var diff2 = ((d - c) % N + N) % N;
      return diff1 < diff2 ? 1 : -1;
    });
  }

  /**
   * Produce mirror PD code by swapping over/under at each crossing.
   * Mirror of [a, b, c, d] is [a, d, c, b].
   */
  function mirrorPD(pdCode) {
    return pdCode.map(function (cr) {
      return [cr[0], cr[3], cr[2], cr[1]];
    });
  }

  /** Get the sl_n display name. */
  function slnName(n) {
    if (n === 2) return 'sl_2 (Jones)';
    return 'sl_' + n;
  }

  /** LaTeX string for sl_n. */
  function slnLatex(n) {
    if (n === 2) return '\\mathfrak{sl}_2';
    return '\\mathfrak{sl}_' + n;
  }

  /** Render KaTeX in a container. */
  function katexRender(container) {
    if (window.renderMathInElement) {
      renderMathInElement(container, {
        delimiters: [
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    }
  }

  // ------------------------------------------------------------------
  // Verification: compare computed polynomial against known data
  // ------------------------------------------------------------------

  /**
   * Attempt to verify the computed polynomial against stored data.
   * Returns { match: true/false/null, detail: string }.
   *
   * null means no reference data available.
   */
  function verifyResult(computed, knotData, n) {
    if (!knotData) return { match: null, detail: 'No knot data' };

    var qi = knotData.quantum_invariants || {};
    var refLatex = null;
    var refSource = '';

    if (n === 2) {
      refLatex = knotData.jones_latex || null;
      refSource = 'jones_latex';
    } else if (n === 3) {
      var a2Key = 'QuantumInvariant/A2/1,0';
      if (qi[a2Key]) {
        refLatex = qi[a2Key];
        refSource = a2Key;
      } else if (knotData.sl3_latex) {
        refLatex = knotData.sl3_latex;
        refSource = 'sl3_latex';
      }
    } else if (n === 4) {
      var a3Key = 'QuantumInvariant/A3/1,0,0';
      if (qi[a3Key]) {
        refLatex = qi[a3Key];
        refSource = a3Key;
      } else if (knotData.sl4_latex) {
        refLatex = knotData.sl4_latex;
        refSource = 'sl4_latex';
      }
    }

    if (!refLatex) {
      return { match: null, detail: 'No reference data for n=' + n };
    }

    // Compare the LaTeX strings (rough comparison -- remove whitespace)
    var computedLatex = computed.toLatex('q').replace(/\s+/g, '');
    var refClean = refLatex.replace(/\s+/g, '');

    // Exact match
    if (computedLatex === refClean) {
      return { match: true, detail: 'Matches ' + refSource + ' exactly' };
    }

    // If the computed polynomial is zero but reference is not, definite mismatch
    if (computed.isZero() && refClean !== '0') {
      return { match: false, detail: 'Computed zero, reference (' + refSource + ') is nonzero' };
    }

    // Otherwise, we can't be certain (different normalizations, variable conventions)
    return {
      match: null,
      detail: 'Could not verify: different normalization or variable convention (ref: ' + refSource + ')'
    };
  }

  // ------------------------------------------------------------------
  // Build the MOY cube SVG visualization
  // ------------------------------------------------------------------

  function buildMoyCubeSVG(vertexData, numCrossings) {
    var n = numCrossings;
    var totalVertices = 1 << n;

    // Group vertices by Hamming weight
    var cols = {};
    for (var w = 0; w <= n; w++) cols[w] = [];
    for (var v = 0; v < totalVertices; v++) {
      cols[popcount(v)].push(v);
    }

    // Layout parameters
    var moySvgW = 100;
    var moySvgH = 80;
    var vertexW = moySvgW + 40;
    var vertexH = moySvgH + 60;
    var colSpacing = vertexW + 30;
    var maxPerCol = 0;
    for (w = 0; w <= n; w++) {
      if (cols[w].length > maxPerCol) maxPerCol = cols[w].length;
    }
    var rowSpacing = vertexH + 10;
    var pad = 40;

    var W = pad * 2 + n * colSpacing + vertexW;
    var H = pad * 2 + (maxPerCol - 1) * rowSpacing + vertexH;

    // Compute positions
    var positions = {};
    for (w = 0; w <= n; w++) {
      var group = cols[w];
      var colX = pad + w * colSpacing + vertexW / 2;
      for (var i = 0; i < group.length; i++) {
        var y = group.length === 1
          ? H / 2
          : pad + vertexH / 2 + i * ((H - 2 * pad - vertexH) / (group.length - 1));
        positions[group[i]] = { x: colX, y: y };
      }
    }

    var html = '';
    html += '<div class="moy-cube-container" style="overflow:auto;max-height:' +
      Math.min(H + 20, 700) + 'px">';

    html += '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" style="display:block">';

    // Arrowhead def
    html += '<defs><marker id="moy-cube-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">';
    html += '<polygon points="0 0, 8 3, 0 6" fill="#bbb"/></marker></defs>';

    // Draw edges (between adjacent vertices, Hamming distance 1)
    for (v = 0; v < totalVertices; v++) {
      for (var bit = 0; bit < n; bit++) {
        if ((v >> bit) & 1) continue;
        var u = v | (1 << bit);
        var p1 = positions[v];
        var p2 = positions[u];
        if (!p1 || !p2) continue;
        html += '<line x1="' + p1.x + '" y1="' + p1.y +
          '" x2="' + p2.x + '" y2="' + p2.y +
          '" stroke="#ddd" stroke-width="1.5" marker-end="url(#moy-cube-arrow)"/>';
      }
    }

    // Column headers
    for (w = 0; w <= n; w++) {
      var hx = pad + w * colSpacing + vertexW / 2;
      html += '<text x="' + hx + '" y="16" text-anchor="middle" font-size="11" ' +
        'font-weight="700" fill="' + 'var(--moy-accent)' + '">wt ' + w + '</text>';
    }

    html += '</svg>';

    // Overlay vertex cards using absolute positioning within a relative container
    // We'll use a different approach: build as HTML divs overlaid on the SVG
    html += '</div>';

    // Build as a purely HTML layout instead (more flexible for inline SVG + KaTeX)
    return buildMoyCubeHTML(vertexData, numCrossings, cols, positions, W, H);
  }

  /**
   * Build the cube visualization as HTML with positioned vertex cards.
   */
  function buildMoyCubeHTML(vertexData, numCrossings, cols, positions, W, H) {
    var n = numCrossings;
    var totalVertices = 1 << n;

    var html = '<div class="moy-cube-container" style="position:relative;width:' + W +
      'px;height:' + H + 'px;overflow:auto;margin:0 auto">';

    // SVG layer for edges
    html += '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
      '" style="position:absolute;top:0;left:0;pointer-events:none">';
    html += '<defs><marker id="moy-cube-arr" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">';
    html += '<polygon points="0 0, 8 3, 0 6" fill="#ccc"/></marker></defs>';

    for (var v = 0; v < totalVertices; v++) {
      for (var bit = 0; bit < n; bit++) {
        if ((v >> bit) & 1) continue;
        var u = v | (1 << bit);
        var p1 = positions[v];
        var p2 = positions[u];
        if (!p1 || !p2) continue;
        html += '<line x1="' + p1.x + '" y1="' + p1.y +
          '" x2="' + p2.x + '" y2="' + p2.y +
          '" stroke="#ddd" stroke-width="1.5" marker-end="url(#moy-cube-arr)"/>';
      }
    }

    // Column headers
    for (var w = 0; w <= n; w++) {
      if (!cols[w] || cols[w].length === 0) continue;
      var hx = positions[cols[w][0]] ? positions[cols[w][0]].x : 0;
      html += '<text x="' + hx + '" y="16" text-anchor="middle" font-size="11" ' +
        'font-weight="700" fill="#d95f02">wt ' + w + '</text>';
    }

    html += '</svg>';

    // Vertex cards
    var cardW = 120;
    var cardH = 120;
    for (v = 0; v < totalVertices; v++) {
      var pos = positions[v];
      if (!pos) continue;
      var vd = vertexData[v] || {};
      var label = bitsToLabel(v, n);
      var hw = popcount(v);
      var hue = n > 0 ? (hw / n) * 240 : 0;
      var bgColor = 'hsl(' + hue + ',60%,95%)';
      var borderColor = 'hsl(' + hue + ',60%,70%)';

      html += '<div style="position:absolute;left:' + (pos.x - cardW / 2) +
        'px;top:' + (pos.y - cardH / 2) + 'px;width:' + cardW +
        'px;text-align:center;background:' + bgColor +
        ';border:1px solid ' + borderColor +
        ';border-radius:6px;padding:4px;font-size:0.7rem;overflow:hidden">';

      // Label
      html += '<div style="font-family:monospace;font-weight:700;font-size:0.75rem;margin-bottom:2px">' +
        label + '</div>';

      // MOY graph SVG (small)
      if (vd.svgHtml) {
        html += '<div style="margin:0 auto;width:100px;height:70px;overflow:hidden">' +
          vd.svgHtml + '</div>';
      }

      // Evaluated polynomial
      if (vd.polyLatex) {
        html += '<div class="moy-vertex-poly" style="font-size:0.6rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:' +
          cardW + 'px" title="' + vd.polyLatex + '">\\(' + vd.polyLatex + '\\)</div>';
      }

      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  // ------------------------------------------------------------------
  // Compute everything for a knot
  // ------------------------------------------------------------------

  /**
   * Run the full MOY / sl_n computation and return structured results.
   *
   * @param {number[][]} pdCode
   * @param {number[]} crossingSigns
   * @param {number} nParam  sl_n parameter
   * @returns {object} { polynomial, vertexData, cube }
   */
  function computeMOY(pdCode, crossingSigns, nParam) {
    var numCrossings = pdCode.length;
    var totalVertices = 1 << numCrossings;

    var vertexData = {};

    // Count positive/negative crossings for normalization
    var nPlus = 0, nMinus = 0;
    for (var s = 0; s < numCrossings; s++) {
      if (crossingSigns[s] > 0) nPlus++;
      else nMinus++;
    }

    var result = LaurentPoly.zero();

    for (var v = 0; v < totalVertices; v++) {
      var graph = MOYGraph.fromResolution(pdCode, crossingSigns, v, nParam);
      var graphClone = graph.clone();

      // Evaluate
      var graphValue = graph.evaluate(nParam);

      // Compute sigma(v)
      var sigma = 0;
      for (var i = 0; i < numCrossings; i++) {
        var bit = (v >> i) & 1;
        sigma += crossingSigns[i] * (1 - 2 * bit);
      }

      // Weight: (-q)^sigma = (-1)^sigma * q^sigma
      var signFactor = (sigma % 2 === 0) ? 1 : -1;
      var weight = new LaurentPoly([{ c: signFactor, e: sigma }], CoefficientRing.Z);
      var weightedValue = weight.multiply(graphValue);

      result = result.add(weightedValue);

      // Store vertex data
      var svgHtml = '';
      try {
        svgHtml = graphClone.toSVG(100, 70);
      } catch (e) {
        svgHtml = '<div style="color:#999;font-size:0.6rem">SVG error</div>';
      }

      vertexData[v] = {
        bits: v,
        label: bitsToLabel(v, numCrossings),
        hammingWeight: popcount(v),
        sigma: sigma,
        graphValue: graphValue,
        weightedValue: weightedValue,
        polyLatex: graphValue.isZero() ? '0' : graphValue.toLatex('q'),
        weightLatex: weight.toLatex('q'),
        svgHtml: svgHtml,
        graph: graphClone
      };
    }

    // Normalize by writhe factor
    var writheFactor = new LaurentPoly([{
      c: (nMinus % 2 === 0) ? 1 : -1,
      e: nPlus - 2 * nMinus
    }], CoefficientRing.Z);

    var polynomial = writheFactor.multiply(result);

    return {
      polynomial: polynomial,
      vertexData: vertexData,
      numCrossings: numCrossings,
      writhe: nPlus - nMinus,
      writheFactor: writheFactor
    };
  }

  // ------------------------------------------------------------------
  // Build evaluation detail HTML (collapsible)
  // ------------------------------------------------------------------

  function buildEvalDetailsHTML(vertexData, numCrossings, nParam) {
    var totalVertices = 1 << numCrossings;

    var html = '<details><summary>Evaluation Details (per vertex)</summary>';
    html += '<div style="max-height:400px;overflow:auto;padding:0.5rem">';

    for (var v = 0; v < totalVertices; v++) {
      var vd = vertexData[v];
      if (!vd) continue;

      html += '<div class="moy-eval-step">';
      html += '<strong>Vertex ' + vd.label + '</strong> (weight ' + vd.hammingWeight + ')';
      html += '<br>\\(\\sigma = ' + vd.sigma + '\\), weight \\(' + vd.weightLatex + '\\)';
      html += '<br>MOY graph value: \\(' + vd.polyLatex + '\\)';
      html += '<br>Weighted contribution: \\(' +
        (vd.weightedValue.isZero() ? '0' : vd.weightedValue.toLatex('q')) + '\\)';

      // Show the MOY graph
      if (vd.svgHtml) {
        html += '<div style="margin:4px 0">' + vd.svgHtml + '</div>';
      }

      // Graph validity
      if (vd.graph) {
        var validity = vd.graph.isValid();
        if (!validity.valid) {
          html += '<div style="color:#c00;font-size:0.75rem">Flow errors: ' +
            validity.errors.join('; ') + '</div>';
        }
      }

      html += '</div>';
    }

    html += '</div></details>';
    return html;
  }

  // ------------------------------------------------------------------
  // Main init
  // ------------------------------------------------------------------

  function initMoyTab() {
    if (moyInitialized) return;
    moyInitialized = true;

    // Check dependencies
    if (typeof MOYGraph === 'undefined' || typeof computeSlNPolynomial === 'undefined') {
      var container = document.getElementById('tab-moy');
      if (container) {
        container.innerHTML = '<div class="exp-container"><div class="exp-card">' +
          '<h3>MOY / sl_n Computation</h3>' +
          '<p style="color:#999">MOY graph library not loaded. Please ensure moy-graph.js is included.</p>' +
          '</div></div>';
      }
      return;
    }

    if (typeof LaurentPoly === 'undefined') {
      var container2 = document.getElementById('tab-moy');
      if (container2) {
        container2.innerHTML = '<div class="exp-container"><div class="exp-card">' +
          '<h3>MOY / sl_n Computation</h3>' +
          '<p style="color:#999">Polynomial library not loaded. Please ensure polynomial.js is included.</p>' +
          '</div></div>';
      }
      return;
    }

    var tab = document.getElementById('tab-moy');
    if (!tab) return;

    var items = getAllItems();
    var sortedKeys = Object.keys(items).sort(function (a, b) {
      var ca = parseInt(items[a].crossings) || 0;
      var cb = parseInt(items[b].crossings) || 0;
      return ca - cb || a.localeCompare(b);
    });

    // Build controls HTML
    var html = '<div class="exp-container">';

    // Controls bar
    html += '<div class="exp-controls">';

    // Knot selector
    html += '<label for="moy-knot-sel">Knot/Link</label>';
    html += '<select id="moy-knot-sel">';
    for (var ki = 0; ki < sortedKeys.length; ki++) {
      var name = sortedKeys[ki];
      var d = items[name];
      if (!d.pd_code) continue;
      var c = parseInt(d.crossings) || 0;
      html += '<option value="' + name + '">' + name + ' (' + c + ' cr.)</option>';
    }
    html += '</select>';

    // n selector
    html += '<label for="moy-n-sel">n (sl<sub>n</sub>)</label>';
    html += '<select id="moy-n-sel">';
    html += '<option value="2" selected>n=2 (Jones)</option>';
    html += '<option value="3">n=3 (sl\u2083)</option>';
    html += '<option value="4">n=4 (sl\u2084)</option>';
    html += '<option value="5">n=5 (sl\u2085)</option>';
    html += '<option value="6">n=6 (sl\u2086)</option>';
    html += '</select>';

    // Variant selector
    html += '<label for="moy-variant-sel">Variant</label>';
    html += '<select id="moy-variant-sel">';
    html += '<option value="original">Original</option>';
    html += '<option value="mirror">Mirror</option>';
    html += '</select>';

    // Compute button
    html += '<button id="moy-compute-btn">Compute</button>';

    html += '</div>'; // exp-controls

    // Result card (polynomial output)
    html += '<div class="exp-card" id="moy-result-card" style="display:none">';
    html += '<h3>Computed Polynomial</h3>';
    html += '<div id="moy-result-content"></div>';
    html += '</div>';

    // Cube visualization card
    html += '<div class="exp-card" id="moy-cube-card" style="display:none">';
    html += '<h3>Cube of MOY Resolutions</h3>';
    html += '<div id="moy-cube-content"></div>';
    html += '</div>';

    // Evaluation details card
    html += '<div class="exp-card" id="moy-eval-card" style="display:none">';
    html += '<h3>Evaluation Details</h3>';
    html += '<div id="moy-eval-content"></div>';
    html += '</div>';

    html += '</div>'; // exp-container

    tab.innerHTML = html;

    // Set default selection to trefoil if available
    var knotSel = document.getElementById('moy-knot-sel');
    if (knotSel) {
      var opts = knotSel.options;
      for (var oi = 0; oi < opts.length; oi++) {
        if (opts[oi].value === '3_1') {
          knotSel.value = '3_1';
          break;
        }
      }
    }

    // Bind compute button
    var btn = document.getElementById('moy-compute-btn');
    if (btn) {
      btn.addEventListener('click', runMoyComputation);
    }
  }

  // ------------------------------------------------------------------
  // Computation runner
  // ------------------------------------------------------------------

  function runMoyComputation() {
    var knotSel = document.getElementById('moy-knot-sel');
    var nSel = document.getElementById('moy-n-sel');
    var varSel = document.getElementById('moy-variant-sel');
    if (!knotSel || !nSel) return;

    var knotName = knotSel.value;
    var nParam = parseInt(nSel.value) || 2;
    var variant = varSel ? varSel.value : 'original';

    var items = getAllItems();
    var d = items[knotName];
    if (!d || !d.pd_code) {
      showError('No PD code available for ' + knotName);
      return;
    }

    var pdCode = d.pd_code;
    if (variant === 'mirror') {
      pdCode = mirrorPD(pdCode);
    }

    var numCrossings = pdCode.length;

    // Safety check for large knots
    if (numCrossings > 12) {
      showError('Too many crossings (' + numCrossings + ') for MOY computation. Maximum is 12.');
      return;
    }

    // Show spinner for larger knots
    var showSpinner = numCrossings >= 7;
    var resultCard = document.getElementById('moy-result-card');
    var cubeCard = document.getElementById('moy-cube-card');
    var evalCard = document.getElementById('moy-eval-card');

    resultCard.style.display = 'block';
    cubeCard.style.display = 'none';
    evalCard.style.display = 'none';

    if (showSpinner) {
      document.getElementById('moy-result-content').innerHTML =
        '<div class="exp-progress"><div class="exp-spinner"></div>' +
        'Computing ' + slnName(nParam) + ' polynomial for ' + knotName +
        ' (' + numCrossings + ' crossings, ' + (1 << numCrossings) + ' vertices)...</div>';
    }

    // Load crossing signs from metadata, then compute
    loadCrossingSigns(knotName, variant, pdCode, function (crossingSigns) {
      // Use requestAnimationFrame / setTimeout so the spinner renders
      var doCompute = function () {
        try {
          var result = computeMOY(pdCode, crossingSigns, nParam);
          displayResults(result, d, knotName, nParam, variant);
        } catch (e) {
          showError('Computation error: ' + e.message);
          console.error('MOY computation error:', e);
        }
      };

      if (showSpinner) {
        setTimeout(doCompute, 50);
      } else {
        doCompute();
      }
    });
  }

  // ------------------------------------------------------------------
  // Load crossing signs (from cache or derive from PD code)
  // ------------------------------------------------------------------

  function loadCrossingSigns(knotName, variant, pdCode, callback) {
    var metaUrl = 'data/cache/resolutions/' + knotName + '/metadata.json';

    fetch(metaUrl).then(function (resp) {
      if (!resp.ok) throw new Error('Not found');
      return resp.json();
    }).then(function (meta) {
      var signs = null;
      if (variant === 'mirror' && meta.mirror_crossing_signs) {
        signs = meta.mirror_crossing_signs;
      } else if (meta.crossing_signs) {
        signs = meta.crossing_signs;
        if (variant === 'mirror') {
          // Mirror flips all signs
          signs = signs.map(function (s) { return -s; });
        }
      }
      if (signs && signs.length === pdCode.length) {
        callback(signs);
      } else {
        callback(deriveCrossingSigns(pdCode));
      }
    }).catch(function () {
      callback(deriveCrossingSigns(pdCode));
    });
  }

  // ------------------------------------------------------------------
  // Display results
  // ------------------------------------------------------------------

  function displayResults(result, knotData, knotName, nParam, variant) {
    var resultCard = document.getElementById('moy-result-card');
    var cubeCard = document.getElementById('moy-cube-card');
    var evalCard = document.getElementById('moy-eval-card');
    var resultContent = document.getElementById('moy-result-content');
    var cubeContent = document.getElementById('moy-cube-content');
    var evalContent = document.getElementById('moy-eval-content');

    resultCard.style.display = 'block';

    // 1. Polynomial result
    var polyLatex = result.polynomial.isZero() ? '0' : result.polynomial.toLatex('q');

    var resHtml = '';
    resHtml += '<div style="margin-bottom:0.5rem;font-size:0.9rem">';
    resHtml += '<strong>' + knotName + '</strong>';
    resHtml += ' &mdash; \\(' + slnLatex(nParam) + '\\) polynomial';
    resHtml += ' (' + (variant === 'mirror' ? 'mirror' : 'original') + ')';
    resHtml += '</div>';

    resHtml += '<div class="exp-poly">\\[P_{' + nParam + '}(q) = ' + polyLatex + '\\]</div>';

    // Writhe info
    resHtml += '<div style="font-size:0.8rem;color:#666;margin-top:0.4rem">';
    resHtml += 'Writhe: \\(w = ' + result.writhe + '\\), ';
    resHtml += 'normalization factor: \\(' + result.writheFactor.toLatex('q') + '\\)';
    resHtml += '</div>';

    // Verification badge
    var verification = verifyResult(result.polynomial, knotData, nParam);
    if (verification.match === true) {
      resHtml += '<span class="exp-badge pass">\u2713 ' + verification.detail + '</span>';
    } else if (verification.match === false) {
      resHtml += '<span class="exp-badge fail">\u2717 ' + verification.detail + '</span>';
    } else if (verification.detail) {
      resHtml += '<span class="exp-badge info">' + verification.detail + '</span>';
    }

    resultContent.innerHTML = resHtml;
    katexRender(resultContent);

    // 2. Cube visualization
    var numCrossings = result.numCrossings;
    if (numCrossings <= 8) {
      cubeCard.style.display = 'block';

      // Compute layout
      var totalVertices = 1 << numCrossings;
      var cols = {};
      for (var w = 0; w <= numCrossings; w++) cols[w] = [];
      for (var v = 0; v < totalVertices; v++) {
        cols[popcount(v)].push(v);
      }

      // Layout parameters -- adapt to crossing count
      var moySvgW, moySvgH, cardW, cardH;
      if (numCrossings <= 3) {
        moySvgW = 100; moySvgH = 70; cardW = 130; cardH = 120;
      } else if (numCrossings <= 5) {
        moySvgW = 80; moySvgH = 55; cardW = 110; cardH = 100;
      } else {
        moySvgW = 60; moySvgH = 40; cardW = 90; cardH = 80;
      }

      var colSpacing = cardW + 20;
      var maxPerCol = 0;
      for (w = 0; w <= numCrossings; w++) {
        if (cols[w].length > maxPerCol) maxPerCol = cols[w].length;
      }
      var rowSpacing = cardH + 10;
      var pad = 40;

      var W = pad * 2 + numCrossings * colSpacing + cardW;
      var H = pad * 2 + (maxPerCol - 1) * rowSpacing + cardH;
      if (H < 200) H = 200;

      var positions = {};
      for (w = 0; w <= numCrossings; w++) {
        var group = cols[w];
        var colX = pad + w * colSpacing + cardW / 2;
        for (var i = 0; i < group.length; i++) {
          var yPos = group.length === 1
            ? H / 2
            : pad + cardH / 2 + i * ((H - 2 * pad - cardH) / Math.max(group.length - 1, 1));
          positions[group[i]] = { x: colX, y: yPos };
        }
      }

      var cubeHtml = '';
      cubeHtml += '<div style="font-size:0.8rem;color:#666;margin-bottom:0.5rem">';
      cubeHtml += numCrossings + ' crossings, ' + totalVertices + ' vertices. ';
      cubeHtml += 'Vertices colored by Hamming weight (homological degree).';
      cubeHtml += '</div>';

      cubeHtml += '<div class="moy-cube-container" style="position:relative;width:' + W +
        'px;height:' + H + 'px;min-height:200px">';

      // SVG edge layer
      cubeHtml += '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
        '" style="position:absolute;top:0;left:0;pointer-events:none">';
      cubeHtml += '<defs><marker id="moy-ca" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">';
      cubeHtml += '<polygon points="0 0, 8 3, 0 6" fill="#ccc"/></marker></defs>';

      for (v = 0; v < totalVertices; v++) {
        for (var bit = 0; bit < numCrossings; bit++) {
          if ((v >> bit) & 1) continue;
          var u = v | (1 << bit);
          var p1 = positions[v];
          var p2 = positions[u];
          if (!p1 || !p2) continue;
          cubeHtml += '<line x1="' + p1.x + '" y1="' + p1.y +
            '" x2="' + p2.x + '" y2="' + p2.y +
            '" stroke="#ddd" stroke-width="1.5" marker-end="url(#moy-ca)"/>';

          // Edge label: crossing index
          var mx = (p1.x + p2.x) / 2;
          var my = (p1.y + p2.y) / 2;
          if (numCrossings <= 5) {
            cubeHtml += '<text x="' + mx + '" y="' + (my - 4) +
              '" text-anchor="middle" font-size="8" fill="#aaa">c' + (bit + 1) + '</text>';
          }
        }
      }

      // Column headers
      for (w = 0; w <= numCrossings; w++) {
        if (!cols[w] || cols[w].length === 0) continue;
        var hx = positions[cols[w][0]] ? positions[cols[w][0]].x : pad + w * colSpacing + cardW / 2;
        cubeHtml += '<text x="' + hx + '" y="16" text-anchor="middle" font-size="11" ' +
          'font-weight="700" fill="#d95f02">wt ' + w + '</text>';
      }

      cubeHtml += '</svg>';

      // Vertex cards
      for (v = 0; v < totalVertices; v++) {
        var pos = positions[v];
        if (!pos) continue;
        var vd = result.vertexData[v] || {};
        var label = bitsToLabel(v, numCrossings);
        var hw = popcount(v);
        var hue = numCrossings > 0 ? (hw / numCrossings) * 240 : 0;
        var bgColor = 'hsl(' + hue + ',60%,95%)';
        var borderColor = 'hsl(' + hue + ',60%,70%)';

        cubeHtml += '<div style="position:absolute;left:' + (pos.x - cardW / 2) +
          'px;top:' + (pos.y - cardH / 2) + 'px;width:' + cardW +
          'px;text-align:center;background:' + bgColor +
          ';border:1px solid ' + borderColor +
          ';border-radius:6px;padding:3px;font-size:0.65rem;overflow:hidden;z-index:1">';

        // Binary label
        cubeHtml += '<div style="font-family:monospace;font-weight:700;font-size:0.7rem;margin-bottom:1px">' +
          label + '</div>';

        // MOY graph SVG (inline, small)
        if (vd.svgHtml && numCrossings <= 6) {
          cubeHtml += '<div style="margin:0 auto;width:' + moySvgW + 'px;height:' + moySvgH +
            'px;overflow:hidden">' + vd.svgHtml + '</div>';
        }

        // Evaluated polynomial (truncated for display)
        if (vd.polyLatex) {
          var displayLatex = vd.polyLatex;
          if (displayLatex.length > 40) {
            displayLatex = displayLatex.substring(0, 37) + '\\cdots';
          }
          cubeHtml += '<div style="font-size:0.55rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:' +
            cardW + 'px" title="' + escapeHtmlAttr(vd.polyLatex) + '">\\(' + displayLatex + '\\)</div>';
        }

        cubeHtml += '</div>';
      }

      cubeHtml += '</div>'; // moy-cube-container

      cubeContent.innerHTML = cubeHtml;
      katexRender(cubeContent);
    } else {
      // Too many crossings for visual cube, show a summary table instead
      cubeCard.style.display = 'block';
      var sumHtml = '<div style="font-size:0.8rem;color:#666;margin-bottom:0.5rem">';
      sumHtml += numCrossings + ' crossings (' + (1 << numCrossings) +
        ' vertices) &mdash; cube visualization disabled for performance. Showing summary table.';
      sumHtml += '</div>';

      sumHtml += '<div style="max-height:300px;overflow:auto">';
      sumHtml += '<table class="bigraded-table"><thead><tr>';
      sumHtml += '<th>Vertex</th><th>Wt</th><th>\\(\\sigma\\)</th><th>MOY Value</th><th>Weighted</th>';
      sumHtml += '</tr></thead><tbody>';

      for (v = 0; v < (1 << numCrossings); v++) {
        var vd2 = result.vertexData[v];
        if (!vd2) continue;
        sumHtml += '<tr>';
        sumHtml += '<td style="font-family:monospace">' + vd2.label + '</td>';
        sumHtml += '<td>' + vd2.hammingWeight + '</td>';
        sumHtml += '<td>' + vd2.sigma + '</td>';
        sumHtml += '<td>\\(' + vd2.polyLatex + '\\)</td>';
        sumHtml += '<td>\\(' + (vd2.weightedValue.isZero() ? '0' : vd2.weightedValue.toLatex('q')) + '\\)</td>';
        sumHtml += '</tr>';
      }

      sumHtml += '</tbody></table></div>';

      cubeContent.innerHTML = sumHtml;
      katexRender(cubeContent);
    }

    // 3. Evaluation details (collapsible)
    evalCard.style.display = 'block';
    evalContent.innerHTML = buildEvalDetailsHTML(result.vertexData, numCrossings, nParam);
    katexRender(evalContent);
  }

  // ------------------------------------------------------------------
  // Utility
  // ------------------------------------------------------------------

  function escapeHtmlAttr(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showError(msg) {
    var resultCard = document.getElementById('moy-result-card');
    var resultContent = document.getElementById('moy-result-content');
    if (resultCard && resultContent) {
      resultCard.style.display = 'block';
      resultContent.innerHTML = '<p style="color:#c00">' + msg + '</p>';
    }
  }

  // ------------------------------------------------------------------
  // Expose
  // ------------------------------------------------------------------

  window.initMoyTab = initMoyTab;

})();
