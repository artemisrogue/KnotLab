/**
 * tab-khovanov-rozansky.js -- Khovanov-Rozansky homology (sl(N) + HOMFLY-PT)
 *
 * Exposition-heavy tab:
 *   - sl(N) Khovanov-Rozansky homology via matrix factorizations
 *   - Triply-graded HOMFLY-PT (Khovanov-Rozansky) homology
 *   - Spectral sequences: HOMFLY -> sl(N) -> Khovanov (N=2)
 *   - Readout of stored sl_2 (Jones), sl_3, sl_4, HOMFLY-PT polynomials
 *
 * Globals expected: KNOT_DATA, LINK_DATA, getAllItems, renderMathInElement
 */
(function () {
  'use strict';
  var _init = false;

  function buildUI() {
    var root = document.getElementById('tab-khovanov-rozansky');
    if (!root) return;
    var items = (typeof getAllItems === 'function') ? getAllItems() :
      Object.assign({}, window.KNOT_DATA || {}, window.LINK_DATA || {});

    var html = '';
    html += '<div class="exp-card">';
    html += '<h2>Khovanov&ndash;Rozansky homology</h2>';
    html += '<p>Khovanov&ndash;Rozansky (KR) homology is a family of link homology theories ' +
      'categorifying the \\(\\mathfrak{sl}(N)\\) and HOMFLY-PT polynomials. Introduced in ' +
      'Khovanov&ndash;Rozansky (2008) for \\(\\mathfrak{sl}(N)\\) and extended in ' +
      'Khovanov&ndash;Rozansky (2008b) to a triply-graded theory whose Euler characteristic ' +
      'is the HOMFLY-PT polynomial, these theories subsume Khovanov homology (the ' +
      '\\(N = 2\\) specialization) and knit together quantum-group link polynomials, ' +
      'matrix factorizations, and Soergel bimodules.</p>';
    html += '</div>';

    // ------- sl(N) construction -------
    html += '<div class="exp-card">';
    html += '<h3>\\(\\mathfrak{sl}(N)\\) homology via matrix factorizations</h3>';
    html += '<p>Fix \\(N \\ge 2\\) and the potential \\(W(x) = x^{N+1}/(N+1)\\). A link ' +
      'diagram \\(D\\) is resolved at every crossing into two planar graphs:</p>';
    html += '<ul>' +
      '<li>the <em>oriented resolution</em> (the single smoothing respecting orientations);</li>' +
      '<li>the <em>wide-edge resolution</em> with a 4-valent singular vertex (a <em>MOY graph</em>).</li>' +
      '</ul>';
    html += '<p>To each such planar trivalent graph \\(\\Gamma\\) one assigns a ' +
      '\\(\\mathbb{Z}\\)-graded matrix factorization \\(C(\\Gamma)\\) of the total potential ' +
      '\\(\\sum_e W(x_e) - \\sum_e W(y_e)\\); the two resolutions at a crossing fit into a ' +
      'short complex, and the cube of all resolutions yields a complex of matrix ' +
      'factorizations \\(C(D)\\). Taking homology with respect to the matrix-factorization ' +
      'differential, then homology with respect to the cube differential, gives a ' +
      'bigraded vector space</p>';
    html += '<p style="text-align:center">\\[H_N^{i,j}(L), \\qquad ' +
      '\\chi_q\\bigl(H_N(L)\\bigr) = P_N(L)(q),\\]</p>';
    html += '<p>where \\(P_N(L)(q)\\) is the quantum \\(\\mathfrak{sl}(N)\\) link polynomial ' +
      '(normalized so \\(P_N(\\text{unknot}) = [N]_q = (q^N - q^{-N})/(q - q^{-1})\\)).</p>';
    html += '<p>The \\(N = 2\\) specialization recovers Khovanov homology up to a ' +
      'grading conversion; larger \\(N\\) detects distinct geometric information, e.g. ' +
      'Rasmussen\u2019s \\(s_N\\) concordance invariants refine \\(s = s_2\\).</p>';
    html += '</div>';

    // ------- HOMFLY-PT homology -------
    html += '<div class="exp-card">';
    html += '<h3>Triply-graded HOMFLY-PT homology</h3>';
    html += '<p>A separate KR construction produces a <em>triply-graded</em> homology ' +
      '\\(\\mathcal{H}^{i,j,k}(L)\\) (Khovanov&ndash;Rozansky 2008b; Rasmussen 2015) with ' +
      'Euler characteristic</p>';
    html += '<p style="text-align:center">\\[\\sum_{i,j,k} (-1)^k \\, a^i q^j \\, ' +
      '\\dim \\mathcal{H}^{i,j,k}(L) \\;=\\; P(L)(a,q),\\]</p>';
    html += '<p>the HOMFLY-PT polynomial. Concretely, \\(\\mathcal{H}\\) can be computed ' +
      'from the Hochschild homology of Rouquier complexes of Soergel bimodules attached to ' +
      'braid words (Khovanov 2007). It categorifies quantum \\(\\mathfrak{sl}(\\infty)\\) and ' +
      'specializes at \\(a = q^N\\) to yield \\(\\mathfrak{sl}(N)\\) homology via a ' +
      'spectral sequence.</p>';
    html += '</div>';

    // ------- Spectral sequences -------
    html += '<div class="exp-card">';
    html += '<h3>Spectral sequences between theories</h3>';
    html += '<p>The theories assemble into a layered picture:</p>';
    html += '<p style="text-align:center">\\[\\mathcal{H}(L) \\;\\xRightarrow{a = q^N}\\; ' +
      'H_N(L) \\;\\xRightarrow{N = 2}\\; Kh(L).\\]</p>';
    html += '<p>Specifically:</p>' +
      '<ul>' +
        '<li><em>HOMFLY \\(\\to\\) \\(\\mathfrak{sl}(N)\\):</em> Rasmussen (2015) constructs ' +
          'a differential \\(d_N\\) on \\(\\mathcal{H}\\) of \\((a,q,k)\\)-tridegree depending ' +
          'on \\(N\\); the \\(E_\\infty\\) page gives \\(H_N\\). Setting \\(a = q^N\\) on ' +
          'Euler characteristics recovers \\(P_N\\) from HOMFLY-PT.</li>' +
        '<li><em>\\(\\mathfrak{sl}(N) \\to \\mathfrak{sl}(M)\\) for \\(M \\mid N\\):</em> Lewark ' +
          'and others construct spectral sequences connecting different \\(N\\); the colimits ' +
          'link back to HOMFLY-PT.</li>' +
        '<li><em>\\(\\mathfrak{sl}(N) \\to \\)Lee:</em> the deformation ' +
          '\\(W(x) = x^{N+1}/(N+1) + \\epsilon\\,x\\) produces a Lee-type deformation of ' +
          '\\(H_N\\), with rank \\(N^{c}\\) over \\(\\mathbb{Q}\\) and Rasmussen invariants ' +
          '\\(s_N\\).</li>' +
        '<li><em>Khovanov \\(\\to\\) Heegaard&ndash;Floer:</em> Rasmussen (2005) and ' +
          'Ozsv\u00e1th&ndash;Szab\u00f3 (2005) construct a spectral sequence from ' +
          '\\(Kh(L)\\) to \\(\\widehat{HF}(\\Sigma(L))\\), the Heegaard&ndash;Floer homology ' +
          'of the double branched cover. This is the analogue of the Lee spectral sequence ' +
          'living on the Heegaard&ndash;Floer side.</li>' +
      '</ul>';
    html += '</div>';

    // ------- Readout from DB -------
    html += '<div class="exp-card">';
    html += '<h3>Computed polynomials</h3>';
    html += '<p>The database stores decategorified polynomials. Categorified KR homology ' +
      'tables for these knots and links are not computed in the browser; the intent of ' +
      'this tab is pedagogical.</p>';
    html += '<p>Select a knot or link to display its stored ' +
      '\\(\\mathfrak{sl}(2), \\mathfrak{sl}(3), \\mathfrak{sl}(4)\\) (quantum) and ' +
      'HOMFLY-PT polynomials:</p>';
    html += '<div style="margin:0.5rem 0">';
    html += '  <label>Knot/Link: <select id="kr-sel"></select></label>';
    html += '  <button id="kr-go" class="exp-btn" style="margin-left:0.8rem">Show</button>';
    html += '</div>';
    html += '<div id="kr-out"></div>';
    html += '</div>';

    // ------- References -------
    html += '<div class="exp-card">';
    html += '<h3>References</h3>';
    html += '<ul style="font-size:0.9rem">';
    html += '<li>Khovanov, M.; Rozansky, L. <em>Matrix factorizations and link homology.</em> Fund. Math. 199 (2008).</li>';
    html += '<li>Khovanov, M.; Rozansky, L. <em>Matrix factorizations and link homology II.</em> Geom. Topol. 12 (2008).</li>';
    html += '<li>Khovanov, M. <em>Triply-graded link homology and Hochschild homology of Soergel bimodules.</em> Internat. J. Math. 18 (2007).</li>';
    html += '<li>Rasmussen, J. <em>Some differentials on Khovanov&ndash;Rozansky homology.</em> Geom. Topol. 19 (2015).</li>';
    html += '<li>Mackaay, M.; Sto\u0161i\u0107, M.; Vaz, P. <em>\\(\\mathfrak{sl}(N)\\)-link homology using foams and the Kapustin&ndash;Li formula.</em> Geom. Topol. 13 (2009).</li>';
    html += '<li>Lewark, L. <em>Rasmussen\u2019s spectral sequences and the \\(\\mathfrak{sl}_N\\)-concordance invariants.</em> Adv. Math. 260 (2014).</li>';
    html += '</ul>';
    html += '</div>';

    root.innerHTML = html;

    // Populate selector
    var sel = document.getElementById('kr-sel');
    var names = Object.keys(items).sort(function (a, b) {
      var ca = parseInt(items[a].crossings) || 0;
      var cb = parseInt(items[b].crossings) || 0;
      return ca - cb || a.localeCompare(b);
    });
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      var d = items[n];
      var opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n + ' (' + (parseInt(d.crossings) || 0) + ' cr.)';
      sel.appendChild(opt);
    }
    sel.value = '3_1';

    function render() {
      var n = sel.value;
      var d = items[n];
      if (!d) return;
      var out = document.getElementById('kr-out');
      var rows = '';
      function row(label, val) {
        if (!val) return '';
        return '<tr><td style="padding:4px 12px;border-bottom:1px solid #ddd;font-weight:600">' +
          label + '</td><td style="padding:4px 12px;border-bottom:1px solid #ddd">\\(' + val + '\\)</td></tr>';
      }
      rows += row('\\(P_{\\mathfrak{sl}(2)}(q) = V(q)\\)', d.jones_latex);
      rows += row('\\(P_{\\mathfrak{sl}(3)}(q)\\)', d.sl3_latex);
      rows += row('\\(P_{\\mathfrak{sl}(4)}(q)\\)', d.sl4_latex);
      rows += row('\\(P_{\\mathrm{HOMFLY}}(a, q)\\)', d.homfly_latex);
      if (!rows) {
        out.innerHTML = '<p>No stored polynomials for ' + n + '.</p>';
      } else {
        out.innerHTML = '<table style="border-collapse:collapse;margin:0.5rem 0">' + rows + '</table>';
      }
      if (window.renderMathInElement) {
        try { window.renderMathInElement(out, { delimiters: [
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false }
        ]}); } catch (e) {}
      }
    }
    document.getElementById('kr-go').addEventListener('click', render);
    sel.addEventListener('change', render);
    render();

    // Render KaTeX across the tab body
    if (window.renderMathInElement) {
      try { window.renderMathInElement(root, { delimiters: [
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '$', right: '$', display: false }
      ]}); } catch (e) {}
    }
  }

  window.initKhovanovRozanskyTab = function () {
    if (_init) return;
    _init = true;
    buildUI();
  };
})();
