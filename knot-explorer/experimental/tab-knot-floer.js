/**
 * tab-knot-floer.js -- Knot Floer homology (Ozsvath-Szabo / Rasmussen)
 *
 * Exposition-heavy tab:
 *   - Heegaard-diagram construction of CFK^\infty
 *   - Bigraded homology \widehat{HFK}(L) categorifying the Alexander polynomial
 *   - Concordance invariants: tau, Upsilon, epsilon, nu, Upsilon-from-CFK
 *   - Spectral sequence Kh(mirror L) => \widehat{HF}(\Sigma(L))
 *   - Readout of stored Alexander polynomial, signature, and three-genus
 *
 * Globals expected: KNOT_DATA, LINK_DATA, getAllItems, renderMathInElement
 */
(function () {
  'use strict';
  var _init = false;

  function buildUI() {
    var root = document.getElementById('tab-knot-floer');
    if (!root) return;
    var items = (typeof getAllItems === 'function') ? getAllItems() :
      Object.assign({}, window.KNOT_DATA || {}, window.LINK_DATA || {});

    var html = '';

    html += '<div class="exp-card">';
    html += '<h2>Knot Floer homology</h2>';
    html += '<p>Knot Floer homology, introduced independently by Ozsv\u00e1th&ndash;Szab\u00f3 (2004) ' +
      'and Rasmussen (2003), is a package of link invariants ' +
      '\\(\\widehat{HFK}^{i}(L, s)\\) (and variants \\(HFK^-, HFK^\\infty\\)) extracted from a ' +
      'pseudo-holomorphic-disk count on a Heegaard diagram for \\(L\\). It categorifies the ' +
      'Alexander polynomial, detects the Seifert genus and fiberedness, and supplies ' +
      'concordance invariants \\(\\tau, \\nu, \\Upsilon, \\varepsilon\\) of deep power.</p>';
    html += '</div>';

    // ------- Construction -------
    html += '<div class="exp-card">';
    html += '<h3>Heegaard-diagram construction</h3>';
    html += '<p>Present \\(L \\subset S^3\\) via a doubly-pointed Heegaard diagram ' +
      '\\((\\Sigma_g, \\boldsymbol{\\alpha}, \\boldsymbol{\\beta}, w, z)\\), where ' +
      '\\(\\boldsymbol{\\alpha}, \\boldsymbol{\\beta}\\) are \\(g\\)-tuples of disjoint ' +
      'simple closed curves and \\(w, z\\) are basepoints encoding the knot. The chain complex</p>';
    html += '<p style="text-align:center">\\[\\widehat{CFK}(\\Sigma, \\boldsymbol{\\alpha}, ' +
      '\\boldsymbol{\\beta}, w, z)\\]</p>';
    html += '<p>is freely generated over \\(\\mathbb{F}_2\\) by intersection points ' +
      '\\(\\mathbf{x} \\in \\mathbb{T}_\\alpha \\cap \\mathbb{T}_\\beta\\) in the symmetric ' +
      'product \\(\\mathrm{Sym}^g(\\Sigma)\\). The differential counts pseudo-holomorphic ' +
      'Whitney disks of Maslov index 1 with \\(n_w = n_z = 0\\):</p>';
    html += '<p style="text-align:center">\\[\\partial \\mathbf{x} = \\sum_{\\mathbf{y}} ' +
      '\\sum_{\\substack{\\phi \\in \\pi_2(\\mathbf{x},\\mathbf{y}) \\\\ \\mu(\\phi)=1,\\ n_w(\\phi)=n_z(\\phi)=0}} ' +
      '\\#\\widehat{\\mathcal{M}}(\\phi) \\cdot \\mathbf{y}.\\]</p>';
    html += '<p>Two gradings descend to homology: a Maslov (homological) grading \\(M\\) and an ' +
      'Alexander grading \\(A = \\tfrac12(n_z - n_w)\\) (on the relative spin-c structure). The ' +
      'bigraded homology \\(\\widehat{HFK}(L) = \\bigoplus_{m, s} \\widehat{HFK}_m(L, s)\\) ' +
      'satisfies</p>';
    html += '<p style="text-align:center">\\[\\sum_{m, s} (-1)^m \\, t^s \\, ' +
      '\\dim_{\\mathbb{F}_2} \\widehat{HFK}_m(L, s) \\;=\\; \\Delta_L(t),\\]</p>';
    html += '<p>categorifying the (symmetrized) Alexander polynomial.</p>';
    html += '</div>';

    // ------- Fundamental properties -------
    html += '<div class="exp-card">';
    html += '<h3>What knot Floer homology sees</h3>';
    html += '<ul>' +
      '<li><em>Genus detection</em> (Ozsv\u00e1th&ndash;Szab\u00f3 2004b): ' +
        '\\(g(K) = \\max\\{s : \\widehat{HFK}(K, s) \\ne 0\\}.\\)</li>' +
      '<li><em>Fiberedness</em> (Ghiggini 2008, Ni 2007): \\(K\\) is fibered iff ' +
        '\\(\\widehat{HFK}(K, g(K)) \\cong \\mathbb{F}_2.\\)</li>' +
      '<li><em>Unknot detection</em>: \\(\\widehat{HFK}(K) \\cong \\mathbb{F}_2\\) in bigrading ' +
        '\\((0,0)\\) iff \\(K\\) is the unknot.</li>' +
      '<li><em>Slice-genus bound</em>: \\(|\\tau(K)| \\le g_4(K).\\)</li>' +
      '</ul>';
    html += '</div>';

    // ------- Concordance invariants -------
    html += '<div class="exp-card">';
    html += '<h3>Concordance invariants from \\(CFK^\\infty\\)</h3>';
    html += '<p>The full complex \\(CFK^\\infty(K)\\) is \\(\\mathbb{Z} \\oplus \\mathbb{Z}\\)-filtered ' +
      'and yields a hierarchy of concordance homomorphisms:</p>';
    html += '<ul>' +
      '<li><em>\\(\\tau(K) \\in \\mathbb{Z}\\)</em> (Ozsv\u00e1th&ndash;Szab\u00f3 2003): smallest ' +
        'Alexander filtration level at which the image of the vertical tower survives in ' +
        '\\(\\widehat{HF}(S^3) \\cong \\mathbb{F}_2\\). A concordance homomorphism bounding ' +
        '\\(g_4\\), and refining the classical slice-Bennequin estimates.</li>' +
      '<li><em>\\(\\Upsilon_K(t): [0,2] \\to \\mathbb{R}\\)</em> (Ozsv\u00e1th&ndash;Stipsicz&ndash;Szab\u00f3 ' +
        '2017): piecewise-linear concordance homomorphism with \\(\\Upsilon_K(1) = -2\\tau(K)\\) ' +
        'and derivative \\(\\Upsilon\\prime_K(0^+)\\) refining \\(\\tau\\). Kernel of ' +
        '\\(\\Upsilon\\) has infinite rank in the smooth concordance group.</li>' +
      '<li><em>\\(\\varepsilon(K) \\in \\{-1, 0, 1\\}\\)</em> (Hom 2014): records whether a ' +
        'particular horizontal/vertical comparison in \\(CFK^\\infty\\) is injective, surjective, ' +
        'or zero. Vanishes on concordance-trivial knots; \\(\\varepsilon(K) = 0 \\Rightarrow ' +
        '\\Upsilon_K \\equiv 0.\\)</li>' +
      '<li><em>\\(\\nu(K), \\nu^+(K)\\)</em>: refinements between \\(\\tau\\) and ' +
        '\\(g_4\\) with sharper bounds in many families.</li>' +
      '</ul>';
    html += '<p>Hom (2014) used \\(\\varepsilon\\) to prove that the smooth concordance group ' +
      '\\(\\mathcal{C}\\) contains a \\(\\mathbb{Z}^\\infty\\) summand.</p>';
    html += '</div>';

    // ------- Spectral sequence -------
    html += '<div class="exp-card">';
    html += '<h3>Spectral sequence from Khovanov homology</h3>';
    html += '<p>Ozsv\u00e1th&ndash;Szab\u00f3 (2005) and Rasmussen (2005) construct a spectral ' +
      'sequence</p>';
    html += '<p style="text-align:center">\\[E_2 = \\widetilde{Kh}(\\overline{L}) ' +
      '\\;\\Longrightarrow\\; \\widehat{HF}(\\Sigma(L))\\]</p>';
    html += '<p>from the reduced Khovanov homology of the mirror link to the hat Heegaard&ndash;Floer ' +
      'homology of the double branched cover. The cube of resolutions of \\(L\\) assembles to a ' +
      'cube of surgery triangles; successive pages correspond to Bar-Natan-type differentials, ' +
      'giving a concrete link between the two homology theories.</p>';
    html += '<p>There is also a surgery spectral sequence connecting \\(\\widehat{HFK}(K)\\) to ' +
      '\\(\\widehat{HF}\\) of Dehn surgeries on \\(K\\) (Ozsv\u00e1th&ndash;Szab\u00f3 mapping cone), ' +
      'which underlies many of the four-manifold applications.</p>';
    html += '</div>';

    // ------- Readout from DB -------
    html += '<div class="exp-card">';
    html += '<h3>Stored invariants</h3>';
    html += '<p>\\(\\widehat{HFK}\\) ranks are not computed in the browser. For each knot we ' +
      'display the Alexander polynomial (decategorification of \\(\\widehat{HFK}\\)), the ' +
      'classical signature \\(\\sigma\\), and the three-genus \\(g_3 = g(K)\\) when stored.</p>';
    html += '<div style="margin:0.5rem 0">';
    html += '  <label>Knot/Link: <select id="hfk-sel"></select></label>';
    html += '  <button id="hfk-go" class="exp-btn" style="margin-left:0.8rem">Show</button>';
    html += '</div>';
    html += '<div id="hfk-out"></div>';
    html += '</div>';

    // ------- References -------
    html += '<div class="exp-card">';
    html += '<h3>References</h3>';
    html += '<ul style="font-size:0.9rem">';
    html += '<li>Ozsv\u00e1th, P.; Szab\u00f3, Z. <em>Holomorphic disks and knot invariants.</em> Adv. Math. 186 (2004).</li>';
    html += '<li>Rasmussen, J. <em>Floer homology and knot complements.</em> Ph.D. thesis, Harvard, 2003.</li>';
    html += '<li>Ozsv\u00e1th, P.; Szab\u00f3, Z. <em>Holomorphic disks and genus bounds.</em> Geom. Topol. 8 (2004).</li>';
    html += '<li>Ozsv\u00e1th, P.; Szab\u00f3, Z. <em>On the Heegaard Floer homology of branched double-covers.</em> Adv. Math. 194 (2005).</li>';
    html += '<li>Ozsv\u00e1th, P.; Stipsicz, A.; Szab\u00f3, Z. <em>Concordance homomorphisms from knot Floer homology.</em> Adv. Math. 315 (2017).</li>';
    html += '<li>Hom, J. <em>Bordered Heegaard Floer homology and the tau-invariant of cables.</em> J. Topol. 7 (2014).</li>';
    html += '<li>Ni, Y. <em>Knot Floer homology detects fibred knots.</em> Invent. Math. 170 (2007).</li>';
    html += '</ul>';
    html += '</div>';

    root.innerHTML = html;

    // Populate selector
    var sel = document.getElementById('hfk-sel');
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
      var out = document.getElementById('hfk-out');
      var rows = '';
      function row(label, val) {
        if (val === undefined || val === null || val === '') return '';
        return '<tr><td style="padding:4px 12px;border-bottom:1px solid #ddd;font-weight:600">' +
          label + '</td><td style="padding:4px 12px;border-bottom:1px solid #ddd">\\(' + val + '\\)</td></tr>';
      }
      function rowRaw(label, val) {
        if (val === undefined || val === null || val === '') return '';
        return '<tr><td style="padding:4px 12px;border-bottom:1px solid #ddd;font-weight:600">' +
          label + '</td><td style="padding:4px 12px;border-bottom:1px solid #ddd">' + val + '</td></tr>';
      }
      rows += row('\\(\\Delta_L(t)\\)', d.alexander_latex);
      if (d.signature !== undefined && d.signature !== null && d.signature !== '') {
        rowRaw; // no-op to keep lint happy
        rows += '<tr><td style="padding:4px 12px;border-bottom:1px solid #ddd;font-weight:600">\\(\\sigma(L)\\)</td>' +
          '<td style="padding:4px 12px;border-bottom:1px solid #ddd">' + d.signature + '</td></tr>';
      }
      if (d.three_genus !== undefined && d.three_genus !== null && d.three_genus !== '') {
        rows += '<tr><td style="padding:4px 12px;border-bottom:1px solid #ddd;font-weight:600">\\(g_3(K)\\)</td>' +
          '<td style="padding:4px 12px;border-bottom:1px solid #ddd">' + d.three_genus + '</td></tr>';
      }
      if (d.four_genus !== undefined && d.four_genus !== null && d.four_genus !== '') {
        rows += '<tr><td style="padding:4px 12px;border-bottom:1px solid #ddd;font-weight:600">\\(g_4(K)\\)</td>' +
          '<td style="padding:4px 12px;border-bottom:1px solid #ddd">' + d.four_genus + '</td></tr>';
      }
      if (!rows) {
        out.innerHTML = '<p>No stored classical invariants for ' + n + '.</p>';
      } else {
        out.innerHTML = '<table style="border-collapse:collapse;margin:0.5rem 0">' + rows + '</table>' +
          '<p style="font-size:0.9rem;color:#555;margin-top:0.5rem">' +
          'Reminder: \\(g_3\\) is detected by \\(\\widehat{HFK}\\) via the top Alexander grading, ' +
          'and \\(|\\tau(K)| \\le g_4(K)\\) whenever \\(\\tau\\) is available.</p>';
      }
      if (window.renderMathInElement) {
        try { window.renderMathInElement(out, { delimiters: [
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false }
        ]}); } catch (e) {}
      }
    }
    document.getElementById('hfk-go').addEventListener('click', render);
    sel.addEventListener('change', render);
    render();

    if (window.renderMathInElement) {
      try { window.renderMathInElement(root, { delimiters: [
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '$', right: '$', display: false }
      ]}); } catch (e) {}
    }
  }

  window.initKnotFloerTab = function () {
    if (_init) return;
    _init = true;
    buildUI();
  };
})();
