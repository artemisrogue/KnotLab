// ============================================================
// Gauss Linking Integral — Pure JS/Plotly module
// Ported from Gauss_link R/Shiny app
// ============================================================

(function () {
  'use strict';

  // ── Vector helpers ──
  function cross(a, b) {
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  }
  function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
  function vsub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
  function vadd(a, b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
  function vscale(a, s) { return [a[0]*s, a[1]*s, a[2]*s]; }
  function vnorm(v) { return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]); }
  function normalize(v) { const l = vnorm(v); return l > 1e-12 ? vscale(v, 1/l) : [0,0,0]; }
  function linspace(a, b, n) {
    const arr = new Array(n);
    for (let i = 0; i < n; i++) arr[i] = a + (b-a)*i/(n-1);
    return arr;
  }

  // ── Curve definitions ──
  function evalCurve(curve, tVals) {
    return tVals.map(t => [curve.x(t), curve.y(t), curve.z(t)]);
  }

  function evalDeriv(curve, tVals, dt) {
    dt = dt || 1e-6;
    return tVals.map(t => [
      (curve.x(t+dt) - curve.x(t-dt)) / (2*dt),
      (curve.y(t+dt) - curve.y(t-dt)) / (2*dt),
      (curve.z(t+dt) - curve.z(t-dt)) / (2*dt)
    ]);
  }

  const PI = Math.PI, TAU = 2*PI;

  const LINKS = {
    unlink: {
      name: 'Unlink', expectedLk: 0, type: 'link',
      components: [
        { name: 'K', color: '#2171b5', x: t=>Math.cos(t), y: t=>Math.sin(t), z: t=>0, t_range: [0,TAU] },
        { name: 'L', color: '#d6604d', x: t=>Math.cos(t)+3, y: t=>Math.sin(t), z: t=>0, t_range: [0,TAU] }
      ]
    },
    hopf_pos: {
      name: 'Hopf Link (+1)', expectedLk: 1, type: 'link',
      components: [
        { name: 'K', color: '#2171b5', x: t=>Math.cos(t), y: t=>Math.sin(t), z: t=>0, t_range: [0,TAU] },
        { name: 'L', color: '#d6604d', x: t=>1+Math.cos(t), y: t=>-Math.sin(t)*Math.sin(PI/6), z: t=>-Math.sin(t)*Math.cos(PI/6), t_range: [0,TAU] }
      ]
    },
    hopf_neg: {
      name: 'Hopf Link (−1)', expectedLk: -1, type: 'link',
      components: [
        { name: 'K', color: '#2171b5', x: t=>Math.cos(t), y: t=>Math.sin(t), z: t=>0, t_range: [0,TAU] },
        { name: 'L', color: '#d6604d', x: t=>1+Math.cos(t), y: t=>Math.sin(t)*Math.sin(PI/6), z: t=>Math.sin(t)*Math.cos(PI/6), t_range: [0,TAU] }
      ]
    },
    whitehead: {
      name: 'Whitehead Link (Lk=0)', expectedLk: 0, type: 'link',
      components: [
        { name: 'K', color: '#2171b5', x: t=>Math.cos(t), y: t=>Math.sin(t), z: t=>0, t_range: [0,TAU] },
        { name: 'L', color: '#d6604d', x: t=>(1+0.6*Math.cos(2*t))*Math.cos(t), y: t=>(1+0.6*Math.cos(2*t))*Math.sin(t), z: t=>0.6*Math.sin(2*t), t_range: [0,TAU] }
      ]
    },
    solomon: {
      name: "Solomon's Link (Lk=2)", expectedLk: 2, type: 'link',
      components: [
        { name: 'K', color: '#2171b5', x: t=>Math.cos(t), y: t=>Math.sin(t), z: t=>0, t_range: [0,TAU] },
        { name: 'L', color: '#d6604d', x: t=>(1+0.5*Math.cos(2*t))*Math.cos(t), y: t=>(1+0.5*Math.cos(2*t))*Math.sin(t), z: t=>0.5*Math.sin(2*t), t_range: [0,TAU] }
      ]
    },
    torus_2_4: {
      name: 'Torus Link T(2,4)', expectedLk: 4, type: 'link',
      components: [
        { name: 'K', color: '#2171b5', x: t=>(2+Math.cos(2*t))*Math.cos(t), y: t=>(2+Math.cos(2*t))*Math.sin(t), z: t=>Math.sin(2*t), t_range: [0,TAU*2] },
        { name: 'L', color: '#d6604d', x: t=>(2+Math.cos(2*t+PI))*Math.cos(t), y: t=>(2+Math.cos(2*t+PI))*Math.sin(t), z: t=>Math.sin(2*t+PI), t_range: [0,TAU*2] }
      ]
    },
    trefoil: {
      name: 'Trefoil (knot)', expectedLk: null, type: 'knot',
      components: [
        { name: 'K', color: '#2171b5', x: t=>Math.sin(t)+2*Math.sin(2*t), y: t=>Math.cos(t)-2*Math.cos(2*t), z: t=>-Math.sin(3*t), t_range: [0,TAU] }
      ]
    },
    figure_eight: {
      name: 'Figure-Eight (knot)', expectedLk: null, type: 'knot',
      components: [
        { name: 'K', color: '#2171b5', x: t=>(2+Math.cos(2*t))*Math.cos(3*t), y: t=>(2+Math.cos(2*t))*Math.sin(3*t), z: t=>Math.sin(4*t), t_range: [0,TAU] }
      ]
    },
    borromean: {
      name: 'Borromean Rings', expectedLk: 0, type: 'link',
      components: [
        { name: 'K1', color: '#2171b5', x: t=>1.6*Math.cos(t), y: t=>0.6*Math.sin(t), z: t=>0.3*Math.sin(2*t), t_range: [0,TAU] },
        { name: 'K2', color: '#d6604d', x: t=>0.6*Math.sin(t), y: t=>0.3*Math.sin(2*t), z: t=>1.6*Math.cos(t), t_range: [0,TAU] },
        { name: 'K3', color: '#4daf4a', x: t=>0.3*Math.sin(2*t), y: t=>1.6*Math.cos(t), z: t=>0.6*Math.sin(t), t_range: [0,TAU] }
      ]
    }
  };

  // ── Gauss linking integral (numerical) ──
  function gaussLinkingNumber(c1, c2, nPoints) {
    nPoints = nPoints || 200;
    const t1 = linspace(c1.t_range[0], c1.t_range[1], nPoints);
    const t2 = linspace(c2.t_range[0], c2.t_range[1], nPoints);
    const dt1 = (c1.t_range[1]-c1.t_range[0]) / (nPoints-1);
    const dt2 = (c2.t_range[1]-c2.t_range[0]) / (nPoints-1);
    const pts1 = evalCurve(c1, t1), der1 = evalDeriv(c1, t1);
    const pts2 = evalCurve(c2, t2), der2 = evalDeriv(c2, t2);

    const integrand = [];
    let sum = 0;

    for (let i = 0; i < nPoints; i++) {
      const row = [];
      for (let j = 0; j < nPoints; j++) {
        const diff = vsub(pts1[i], pts2[j]);
        const dist = vnorm(diff);
        if (dist < 1e-12) { row.push(0); continue; }
        const cr = cross(der1[i], der2[j]);
        const val = dot(diff, cr) / (dist * dist * dist);
        row.push(val);
        sum += val;
      }
      integrand.push(row);
    }

    const value = sum * dt1 * dt2 / (4 * PI);
    return { value, rounded: Math.round(value), integrand, t1, t2 };
  }

  // ── Writhe computation ──
  function computeWrithe(curve, nPoints, epsFrac) {
    nPoints = nPoints || 200; epsFrac = epsFrac || 0.02;
    const t = linspace(curve.t_range[0], curve.t_range[1], nPoints);
    const dt = (curve.t_range[1]-curve.t_range[0]) / (nPoints-1);
    const pts = evalCurve(curve, t), der = evalDeriv(curve, t);
    const eps = Math.floor(epsFrac * nPoints);

    const integrand = [];
    let sum = 0;

    for (let i = 0; i < nPoints; i++) {
      const row = [];
      for (let j = 0; j < nPoints; j++) {
        if (Math.abs(i-j) < eps || Math.abs(i-j) > nPoints-eps) {
          row.push(0); continue;
        }
        const diff = vsub(pts[i], pts[j]);
        const dist = vnorm(diff);
        if (dist < 1e-12) { row.push(0); continue; }
        const cr = cross(der[i], der[j]);
        const val = dot(diff, cr) / (dist*dist*dist);
        row.push(val);
        sum += val;
      }
      integrand.push(row);
    }

    const value = sum * dt * dt / (4*PI);
    return { value, integrand, t };
  }

  // ── Twist computation ──
  function computeTwist(curve, framingAngle, nPoints) {
    nPoints = nPoints || 200; framingAngle = framingAngle || 0;
    const t = linspace(curve.t_range[0], curve.t_range[1], nPoints);
    const dt = (curve.t_range[1]-curve.t_range[0]) / (nPoints-1);
    const pts = evalCurve(curve, t), der = evalDeriv(curve, t);

    // Compute TNB frame
    const T = der.map(d => normalize(d));
    const N = [], B = [];

    // Initial normal
    let seed = [1,0,0];
    if (Math.abs(dot(seed, T[0])) > 0.9) seed = [0,1,0];
    let n0 = vsub(seed, vscale(T[0], dot(seed, T[0])));
    n0 = normalize(n0);
    N.push(n0); B.push(cross(T[0], n0));

    for (let i = 1; i < nPoints; i++) {
      let ni = vsub(N[i-1], vscale(T[i], dot(N[i-1], T[i])));
      ni = normalize(ni);
      N.push(ni); B.push(cross(T[i], ni));
    }

    // Apply framing rotation
    const tRange = curve.t_range[1] - curve.t_range[0];
    const Nf = [], Bf = [];
    for (let i = 0; i < nPoints; i++) {
      const frac = (t[i] - curve.t_range[0]) / tRange;
      const angle = framingAngle * frac;
      const c = Math.cos(angle), s = Math.sin(angle);
      Nf.push(vadd(vscale(N[i], c), vscale(B[i], s)));
      Bf.push(vadd(vscale(N[i], -s), vscale(B[i], c)));
    }

    // Twist integral: (1/2π) ∮ (T×Nf)·(dNf/dt) dt
    let twistSum = 0;
    for (let i = 0; i < nPoints - 1; i++) {
      const dNf = vscale(vsub(Nf[i+1], Nf[i]), 1/dt);
      const TxN = cross(T[i], Nf[i]);
      twistSum += dot(TxN, dNf) * dt;
    }

    return { value: twistSum / TAU, T, N: Nf, B: Bf, t };
  }

  // ── Push-off curve ──
  function pushOff(curve, epsilon, framingAngle, nPoints) {
    epsilon = epsilon || 0.15; nPoints = nPoints || 200;
    const tw = computeTwist(curve, framingAngle, nPoints);
    const t = tw.t;
    const pts = evalCurve(curve, t);
    const pushPts = pts.map((p, i) => vadd(p, vscale(tw.N[i], epsilon)));
    return { pts: pushPts, t, twist: tw.value };
  }

  // ── Convergence test ──
  function convergenceTest(c1, c2, resolutions) {
    resolutions = resolutions || [50, 100, 200, 400];
    return resolutions.map(n => {
      const r = gaussLinkingNumber(c1, c2, n);
      return { n, value: r.value, rounded: r.rounded, error: Math.abs(r.value - r.rounded) };
    });
  }

  // ── Crossing detection (2D) ──
  function findCrossings2D(pts1, pts2, proj) {
    proj = proj || 'xy';
    const ax = proj === 'yz' ? [1,2,0] : proj === 'xz' ? [0,2,1] : [0,1,2];
    const crossings = [];
    const step = 2; // skip some segments for speed

    for (let i = 0; i < pts1.length - 1; i += step) {
      for (let j = 0; j < pts2.length - 1; j += step) {
        const p1 = [pts1[i][ax[0]], pts1[i][ax[1]]];
        const p2 = [pts1[i+1][ax[0]], pts1[i+1][ax[1]]];
        const p3 = [pts2[j][ax[0]], pts2[j][ax[1]]];
        const p4 = [pts2[j+1][ax[0]], pts2[j+1][ax[1]]];

        const d1 = [p2[0]-p1[0], p2[1]-p1[1]];
        const d2 = [p4[0]-p3[0], p4[1]-p3[1]];
        const det = d1[0]*d2[1] - d1[1]*d2[0];
        if (Math.abs(det) < 1e-10) continue;

        const dp = [p3[0]-p1[0], p3[1]-p1[1]];
        const t = (dp[0]*d2[1] - dp[1]*d2[0]) / det;
        const s = (dp[0]*d1[1] - dp[1]*d1[0]) / det;

        if (t >= 0 && t <= 1 && s >= 0 && s <= 1) {
          const cx = p1[0] + t*d1[0], cy = p1[1] + t*d1[1];
          const z1 = pts1[i][ax[2]] + t*(pts1[i+1][ax[2]] - pts1[i][ax[2]]);
          const z2 = pts2[j][ax[2]] + s*(pts2[j+1][ax[2]] - pts2[j][ax[2]]);
          const sign = Math.sign(det) * (z1 > z2 ? 1 : -1);
          crossings.push({ x: cx, y: cy, sign });
        }
      }
    }
    return crossings;
  }

  // ── Render functions ──
  function build3DLayout(title) {
    return {
      title: { text: title, font: { size: 14 } },
      paper_bgcolor: '#f5f5f5',
      margin: { l: 0, r: 0, t: 45, b: 0 },
      scene: { aspectmode: 'data', bgcolor: '#f5f5f5',
        xaxis: { visible: false }, yaxis: { visible: false }, zaxis: { visible: false } },
      showlegend: true,
      legend: { x: 0.02, y: 0.98 }
    };
  }

  function plot3DLink(divId, link) {
    const traces = [];
    link.components.forEach(comp => {
      const t = linspace(comp.t_range[0], comp.t_range[1], 500);
      const pts = evalCurve(comp, t);
      traces.push({
        type: 'scatter3d', mode: 'lines',
        x: pts.map(p=>p[0]), y: pts.map(p=>p[1]), z: pts.map(p=>p[2]),
        line: { color: comp.color, width: 6 },
        name: comp.name, hoverinfo: 'name'
      });
    });
    Plotly.newPlot(divId, traces, build3DLayout(link.name), { responsive: true });
  }

  function plotHeatmap(divId, integrand, t1, t2, title) {
    Plotly.newPlot(divId, [{
      type: 'heatmap', z: integrand,
      x: t2, y: t1,
      colorscale: [[0,'#2166ac'],[0.25,'#92c5de'],[0.5,'#f7f7f7'],[0.75,'#f4a582'],[1,'#b2182b']],
      zmid: 0, showscale: true, hoverinfo: 'z',
      colorbar: { title: 'Integrand', len: 0.6 }
    }], {
      title: { text: title, font: { size: 13 } },
      xaxis: { title: 's (curve 2)' },
      yaxis: { title: 't (curve 1)' },
      paper_bgcolor: '#f5f5f5', plot_bgcolor: '#fff',
      margin: { l: 60, r: 20, t: 40, b: 50 }
    }, { responsive: true });
  }

  function plotRibbon(divId, curve, pushPts, basePts, title) {
    const traces = [];
    traces.push({
      type: 'scatter3d', mode: 'lines',
      x: basePts.map(p=>p[0]), y: basePts.map(p=>p[1]), z: basePts.map(p=>p[2]),
      line: { color: '#2171b5', width: 5 }, name: 'K (base)', hoverinfo: 'name'
    });
    traces.push({
      type: 'scatter3d', mode: 'lines',
      x: pushPts.map(p=>p[0]), y: pushPts.map(p=>p[1]), z: pushPts.map(p=>p[2]),
      line: { color: '#d6604d', width: 4 }, name: "K' (push-off)", hoverinfo: 'name'
    });
    // Connecting strips
    for (let i = 0; i < basePts.length; i += Math.floor(basePts.length / 30)) {
      traces.push({
        type: 'scatter3d', mode: 'lines',
        x: [basePts[i][0], pushPts[i][0]], y: [basePts[i][1], pushPts[i][1]], z: [basePts[i][2], pushPts[i][2]],
        line: { color: '#aaa', width: 1 }, showlegend: false, hoverinfo: 'none'
      });
    }
    Plotly.newPlot(divId, traces, build3DLayout(title), { responsive: true });
  }

  // ── Main render ──
  window.renderGaussLinking = function(containerEl) {
    let state = {
      subTab: 'formula',
      selectedLink: 'hopf_pos',
      resolution: 150,
      framingTwist: 0,
      pushDist: 0.15,
      computed: null
    };

    const SUB_TABS = [
      { id: 'formula', label: 'The Formula' },
      { id: 'fk-reidemeister', label: 'Reidemeister & Framing' }
    ];

    function render() {
      const tabHtml = SUB_TABS.map(t =>
        `<button class="fk-subtab ${state.subTab===t.id?'active':''}" data-tab="${t.id}">${t.label}</button>`
      ).join('');

      containerEl.innerHTML = `
        <div class="fk-controls"><div class="fk-subtabs">${tabHtml}</div></div>
        <div id="gl-content" class="fk-content"></div>
      `;

      containerEl.querySelectorAll('.fk-subtab').forEach(btn => {
        btn.addEventListener('click', () => { state.subTab = btn.dataset.tab; render(); });
      });

      const content = document.getElementById('gl-content');

      if (state.subTab === 'formula') renderFormulaCombined(content);
      else if (state.subTab.startsWith('fk-')) renderFramedKnotsEmbed(content, state.subTab);
    }

    function renderFormula(el) {
      el.innerHTML = `
        <div class="expo-panel">
          <h3>The Gauss Linking Integral</h3>
          <p>In 1833, Gauss discovered that the <em>linking number</em> of two closed curves
          \\(K\\) and \\(L\\) in \\(\\mathbb{R}^3\\) can be computed by a double integral:</p>
          <div class="formula-box">
            $$\\mathrm{Lk}(K, L) = \\frac{1}{4\\pi}\\oint_K\\oint_L \\frac{(\\mathbf{r}_1 - \\mathbf{r}_2) \\cdot (d\\mathbf{r}_1 \\times d\\mathbf{r}_2)}{|\\mathbf{r}_1 - \\mathbf{r}_2|^3}$$
          </div>
          <h3>From Electromagnetism</h3>
          <p>The formula arises naturally from <strong>Ampère's law</strong> and <strong>Biot–Savart's law</strong>.
          Consider a steady current \\(I\\) flowing through a closed loop \\(L\\). The magnetic field at a point
          \\(\\mathbf{r}\\) is given by Biot–Savart:</p>
          <div class="formula-box">
            $$\\mathbf{B}(\\mathbf{r}) = \\frac{\\mu_0 I}{4\\pi}\\oint_L \\frac{d\\mathbf{r}_2 \\times (\\mathbf{r} - \\mathbf{r}_2)}{|\\mathbf{r} - \\mathbf{r}_2|^3}$$
          </div>
          <p>By Ampère's law, the circulation of \\(\\mathbf{B}\\) around another loop \\(K\\) counts
          how many times \\(K\\) passes through \\(L\\) — precisely the linking number.</p>
          <h3>The Gauss Map</h3>
          <p>Equivalently, the linking number is the <strong>degree</strong> of the Gauss map
          \\(G: T^2 \\to S^2\\) defined by:</p>
          <div class="formula-box">
            $$G(t, s) = \\frac{\\gamma_1(t) - \\gamma_2(s)}{|\\gamma_1(t) - \\gamma_2(s)|}$$
          </div>
          <p>The degree counts (with sign) how many times the image covers the sphere.
          Since degrees are integers, \\(\\mathrm{Lk}(K,L) \\in \\mathbb{Z}\\).</p>
        </div>
      `;
      if (typeof renderMathInElement === 'function') renderMathInElement(el);
    }

    function renderCompute(el) {
      const linkOpts = Object.entries(LINKS)
        .filter(([_,v]) => v.type === 'link')
        .map(([k,v]) => `<option value="${k}" ${state.selectedLink===k?'selected':''}>${v.name} (Lk=${v.expectedLk})</option>`)
        .join('');

      el.innerHTML = `
        <div class="gl-compute-layout">
          <div class="gl-controls-panel">
            <label>Select link:</label>
            <select id="gl-link-select">${linkOpts}</select>
            <label>Resolution: <strong id="gl-res-val">${state.resolution}</strong></label>
            <input type="range" min="50" max="400" step="10" value="${state.resolution}" id="gl-resolution">
            <button class="btn-accent" id="gl-compute-btn" style="margin-top:0.75rem;">Compute</button>
            <div id="gl-result" class="gl-result"></div>
          </div>
          <div class="gl-plots">
            <div id="gl-3d-plot" style="height:400px;"></div>
            <div id="gl-heatmap" style="height:380px;margin-top:1rem;"></div>
          </div>
        </div>
      `;

      const link = LINKS[state.selectedLink];
      plot3DLink('gl-3d-plot', link);

      document.getElementById('gl-link-select').addEventListener('change', e => {
        state.selectedLink = e.target.value;
        state.computed = null;
        render();
      });
      document.getElementById('gl-resolution').addEventListener('input', e => {
        state.resolution = +e.target.value;
        document.getElementById('gl-res-val').textContent = state.resolution;
      });

      document.getElementById('gl-compute-btn').addEventListener('click', () => {
        const link = LINKS[state.selectedLink];
        const c1 = link.components[0], c2 = link.components[1];
        const resultDiv = document.getElementById('gl-result');
        resultDiv.innerHTML = '<p class="status-wait">Computing...</p>';

        setTimeout(() => {
          const result = gaussLinkingNumber(c1, c2, state.resolution);
          state.computed = result;

          resultDiv.innerHTML = `
            <div class="result-badge">Lk = ${result.rounded}</div>
            <table class="result-table">
              <tr><td>Raw integral</td><td>${result.value.toFixed(6)}</td></tr>
              <tr><td>Rounded</td><td>${result.rounded}</td></tr>
              <tr><td>Error</td><td>${Math.abs(result.value - result.rounded).toExponential(3)}</td></tr>
              <tr><td>Expected</td><td>${link.expectedLk}</td></tr>
            </table>
          `;

          plotHeatmap('gl-heatmap', result.integrand, result.t1, result.t2,
            `Integrand heatmap — integral = ${result.value.toFixed(4)}`);
        }, 50);
      });
    }

    function renderWrithe(el) {
      const knotOpts = Object.entries(LINKS)
        .filter(([_,v]) => v.type === 'knot')
        .map(([k,v]) => `<option value="${k}">${v.name}</option>`)
        .join('');

      el.innerHTML = `
        <div class="expo-panel">
          <h3>Writhe</h3>
          <p>The <strong>writhe</strong> of a knot \\(K\\) is defined by the same Gauss integral,
          but with both integration curves equal to \\(K\\):</p>
          <div class="formula-box">
            $$\\mathrm{Wr}(K) = \\frac{1}{4\\pi}\\oint_K\\oint_K \\frac{(\\mathbf{r}(t) - \\mathbf{r}(s)) \\cdot (\\dot{\\mathbf{r}}(t) \\times \\dot{\\mathbf{r}}(s))}{|\\mathbf{r}(t) - \\mathbf{r}(s)|^3}\\,dt\\,ds$$
          </div>
          <p>Unlike the linking number, writhe is <strong>not an integer</strong>. It measures the
          average diagram writhe over all projection directions.</p>
        </div>
        <div class="gl-controls-panel" style="margin-top:1rem;">
          <label>Select knot:</label>
          <select id="gl-writhe-select">${knotOpts}</select>
          <button class="btn-accent" id="gl-writhe-btn" style="margin-top:0.5rem;">Compute Writhe</button>
          <div id="gl-writhe-result" class="gl-result"></div>
        </div>
        <div id="gl-writhe-heatmap" style="height:380px;margin-top:1rem;"></div>
      `;

      if (typeof renderMathInElement === 'function') renderMathInElement(el);

      document.getElementById('gl-writhe-btn').addEventListener('click', () => {
        const key = document.getElementById('gl-writhe-select').value;
        const curve = LINKS[key].components[0];
        const resultDiv = document.getElementById('gl-writhe-result');
        resultDiv.innerHTML = '<p class="status-wait">Computing...</p>';

        setTimeout(() => {
          const wr = computeWrithe(curve, 200);
          resultDiv.innerHTML = `
            <div class="result-badge" style="background:#e67e22;">Wr = ${wr.value.toFixed(4)}</div>
            <p style="font-size:0.85rem;color:var(--text-muted);">Writhe is generally not an integer.
            Nearest integer: ${Math.round(wr.value)}, fractional part: ${(wr.value - Math.round(wr.value)).toFixed(4)}</p>
          `;
          plotHeatmap('gl-writhe-heatmap', wr.integrand, wr.t, wr.t,
            `Writhe integrand — Wr = ${wr.value.toFixed(4)}`);
        }, 50);
      });
    }

    function renderFraming(el) {
      const knotOpts = Object.entries(LINKS)
        .filter(([_,v]) => v.type === 'knot')
        .map(([k,v]) => `<option value="${k}">${v.name}</option>`)
        .join('');

      el.innerHTML = `
        <div class="expo-panel">
          <h3>The Călugăreanu–White–Fuller Theorem</h3>
          <div class="formula-box">
            $$\\mathrm{Lk}(K, K') = \\mathrm{Wr}(K) + \\mathrm{Tw}(K, \\mathbf{n})$$
          </div>
          <p>For a knot \\(K\\) with framing normal \\(\\mathbf{n}\\) and push-off \\(K' = K + \\varepsilon\\mathbf{n}\\),
          the self-linking number decomposes into <strong>writhe</strong> (geometry of the embedding)
          and <strong>twist</strong> (rotation of the normal field).</p>
        </div>
        <div class="gl-controls-panel" style="margin-top:1rem;">
          <label>Base knot:</label>
          <select id="gl-frame-select">${knotOpts}</select>
          <label>Additional twist: <strong id="gl-tw-val">${state.framingTwist}</strong> turns</label>
          <input type="range" min="-5" max="5" value="${state.framingTwist}" id="gl-twist-slider">
          <label>Push-off distance: <strong id="gl-eps-val">${state.pushDist}</strong></label>
          <input type="range" min="0.05" max="0.4" step="0.01" value="${state.pushDist}" id="gl-eps-slider">
          <button class="btn-accent" id="gl-frame-btn" style="margin-top:0.5rem;">Compute Decomposition</button>
          <div id="gl-frame-result" class="gl-result"></div>
        </div>
        <div id="gl-ribbon-plot" style="height:450px;margin-top:1rem;"></div>
      `;

      if (typeof renderMathInElement === 'function') renderMathInElement(el);

      document.getElementById('gl-twist-slider').addEventListener('input', e => {
        state.framingTwist = +e.target.value;
        document.getElementById('gl-tw-val').textContent = state.framingTwist;
      });
      document.getElementById('gl-eps-slider').addEventListener('input', e => {
        state.pushDist = +e.target.value;
        document.getElementById('gl-eps-val').textContent = state.pushDist;
      });

      document.getElementById('gl-frame-btn').addEventListener('click', () => {
        const key = document.getElementById('gl-frame-select').value;
        const curve = LINKS[key].components[0];
        const resultDiv = document.getElementById('gl-frame-result');
        resultDiv.innerHTML = '<p class="status-wait">Computing...</p>';

        setTimeout(() => {
          const framingAngle = state.framingTwist * TAU;
          const wr = computeWrithe(curve, 200);
          const tw = computeTwist(curve, framingAngle, 200);
          const lk = wr.value + tw.value;

          const t = linspace(curve.t_range[0], curve.t_range[1], 200);
          const basePts = evalCurve(curve, t);
          const po = pushOff(curve, state.pushDist, framingAngle, 200);

          resultDiv.innerHTML = `
            <table class="result-table">
              <tr><td>Wr</td><td>${wr.value.toFixed(4)}</td></tr>
              <tr><td>Tw</td><td>${tw.value.toFixed(4)}</td></tr>
              <tr><td>Wr + Tw</td><td>${lk.toFixed(4)}</td></tr>
              <tr><td><strong>Lk (rounded)</strong></td><td><strong>${Math.round(lk)}</strong></td></tr>
            </table>
          `;

          plotRibbon('gl-ribbon-plot', curve, po.pts, basePts,
            `Lk = ${Math.round(lk)} — Wr = ${wr.value.toFixed(2)}, Tw = ${tw.value.toFixed(2)}`);
        }, 50);
      });
    }

    function renderInteger(el) {
      el.innerHTML = `
        <div class="expo-panel">
          <h3>Why is the Linking Number Always an Integer?</h3>
          <h4>Proof 1: Degree of the Gauss Map</h4>
          <p>The Gauss map \\(G: T^2 \\to S^2\\) is a smooth map between compact oriented manifolds.
          Its <strong>degree</strong> — the signed count of preimages of a regular value — is always
          an integer. By Sard's theorem, regular values are generic. The Gauss linking integral computes
          exactly this degree.</p>
          <h4>Proof 2: Combinatorial (Crossing Signs)</h4>
          <p>Project the link to a generic 2D plane. Each crossing involves one strand from \\(K\\) and one from \\(L\\).
          The <strong>crossing sign</strong> \\(\\varepsilon_i = \\pm 1\\) is determined by the right-hand rule.
          Then:</p>
          <div class="formula-box">
            $$\\mathrm{Lk}(K, L) = \\frac{1}{2}\\sum_{i} \\varepsilon_i$$
          </div>
          <p>Each crossing contributes the same sign regardless of which strand is over/under, so the sum
          is always even, making the linking number an integer.</p>
          <h4>Proof 3: Seifert Surfaces</h4>
          <p>For any knot \\(L\\), there exists an oriented surface \\(\\Sigma\\) with \\(\\partial\\Sigma = L\\)
          (a <strong>Seifert surface</strong>). The linking number equals the algebraic intersection number:</p>
          <div class="formula-box">
            $$\\mathrm{Lk}(K, L) = K \\cdot \\Sigma_L = \\sum_{p \\in K \\cap \\Sigma_L} \\varepsilon(p)$$
          </div>
          <p>Intersection numbers of closed curves with surfaces are always integers, completing the proof.</p>
        </div>
      `;
      if (typeof renderMathInElement === 'function') renderMathInElement(el);
    }

    // ── Framed Knots embed ──
    // ── Combined formula page ──
    function renderFormulaCombined(el) {
      // Build link and knot option HTML for controls
      const linkOpts = Object.entries(LINKS)
        .filter(([_,v]) => v.type === 'link')
        .map(([k,v]) => `<option value="${k}" ${state.selectedLink===k?'selected':''}>${v.name} (Lk=${v.expectedLk})</option>`)
        .join('');
      const knotOpts = Object.entries(LINKS)
        .filter(([_,v]) => v.type === 'knot')
        .map(([k,v]) => `<option value="${k}">${v.name}</option>`)
        .join('');

      el.innerHTML = `
        <div class="expo-panel">
          <h3>The Gauss Linking Integral</h3>
          <p>In 1833, Gauss discovered that the <em>linking number</em> of two closed curves
          \\(K\\) and \\(L\\) in \\(\\mathbb{R}^3\\) can be computed by a double integral:</p>
          <div class="formula-box">
            $$\\mathrm{Lk}(K, L) = \\frac{1}{4\\pi}\\oint_K\\oint_L \\frac{(\\mathbf{r}_1 - \\mathbf{r}_2) \\cdot (d\\mathbf{r}_1 \\times d\\mathbf{r}_2)}{|\\mathbf{r}_1 - \\mathbf{r}_2|^3}$$
          </div>
          <h3>From Electromagnetism</h3>
          <p>The formula arises naturally from <strong>Amp&egrave;re&rsquo;s law</strong> and <strong>Biot&ndash;Savart&rsquo;s law</strong>.
          Consider a steady current \\(I\\) flowing through a closed loop \\(L\\). The magnetic field at a point
          \\(\\mathbf{r}\\) is given by Biot&ndash;Savart:</p>
          <div class="formula-box">
            $$\\mathbf{B}(\\mathbf{r}) = \\frac{\\mu_0 I}{4\\pi}\\oint_L \\frac{d\\mathbf{r}_2 \\times (\\mathbf{r} - \\mathbf{r}_2)}{|\\mathbf{r} - \\mathbf{r}_2|^3}$$
          </div>
          <p>By Amp&egrave;re&rsquo;s law, the circulation of \\(\\mathbf{B}\\) around another loop \\(K\\) counts
          how many times \\(K\\) passes through \\(L\\) &mdash; precisely the linking number.</p>
        </div>

        <div class="expo-panel">
          <h3>The Gauss Map</h3>
          <p>Equivalently, the linking number is the <strong>degree</strong> of the Gauss map
          \\(G: T^2 \\to S^2\\) defined by:</p>
          <div class="formula-box">
            $$G(t, s) = \\frac{\\gamma_1(t) - \\gamma_2(s)}{|\\gamma_1(t) - \\gamma_2(s)|}$$
          </div>
          <p>The degree counts (with sign) how many times the image covers the sphere.
          Since degrees are integers, \\(\\mathrm{Lk}(K,L) \\in \\mathbb{Z}\\).</p>
        </div>

        <div class="expo-panel">
          <h3>Interactive Computation</h3>
          <p>Select a link below and compute its linking number numerically via the Gauss integral.
          The heatmap shows the integrand \\(\\frac{(\\mathbf{r}_1 - \\mathbf{r}_2) \\cdot (d\\mathbf{r}_1 \\times d\\mathbf{r}_2)}{|\\mathbf{r}_1 - \\mathbf{r}_2|^3}\\) as a function of the parameters \\((t,s)\\).</p>
          <div class="gl-compute-layout">
            <div class="gl-controls-panel">
              <label>Select link:</label>
              <select id="gl-link-select">${linkOpts}</select>
              <label>Resolution: <strong id="gl-res-val">${state.resolution}</strong></label>
              <input type="range" min="50" max="400" step="10" value="${state.resolution}" id="gl-resolution">
              <button class="btn-accent" id="gl-compute-btn" style="margin-top:0.75rem;">Compute</button>
              <div id="gl-result" class="gl-result"></div>
            </div>
            <div class="gl-plots">
              <div id="gl-3d-plot" style="height:400px;"></div>
              <div id="gl-heatmap" style="height:380px;margin-top:1rem;"></div>
            </div>
          </div>
        </div>

        <div class="expo-panel">
          <h3>Writhe</h3>
          <p>The <strong>writhe</strong> of a knot \\(K\\) is defined by the same Gauss integral,
          but with both integration curves equal to \\(K\\):</p>
          <div class="formula-box">
            $$\\mathrm{Wr}(K) = \\frac{1}{4\\pi}\\oint_K\\oint_K \\frac{(\\mathbf{r}(t) - \\mathbf{r}(s)) \\cdot (\\dot{\\mathbf{r}}(t) \\times \\dot{\\mathbf{r}}(s))}{|\\mathbf{r}(t) - \\mathbf{r}(s)|^3}\\,dt\\,ds$$
          </div>
          <p>Unlike the linking number, writhe is <strong>not an integer</strong>. It measures the
          average diagram writhe over all projection directions.</p>
          <div class="gl-controls-panel" style="margin-top:1rem;">
            <label>Select knot:</label>
            <select id="gl-writhe-select">${knotOpts}</select>
            <button class="btn-accent" id="gl-writhe-btn" style="margin-top:0.5rem;">Compute Writhe</button>
            <div id="gl-writhe-result" class="gl-result"></div>
          </div>
          <div id="gl-writhe-heatmap" style="height:380px;margin-top:1rem;"></div>
        </div>

        <div class="expo-panel">
          <h3>The Călugăreanu&ndash;White&ndash;Fuller Theorem</h3>
          <div class="formula-box">
            $$\\mathrm{Lk}(K, K') = \\mathrm{Wr}(K) + \\mathrm{Tw}(K, \\mathbf{n})$$
          </div>
          <p>For a knot \\(K\\) with framing normal \\(\\mathbf{n}\\) and push-off \\(K' = K + \\varepsilon\\mathbf{n}\\),
          the self-linking number decomposes into <strong>writhe</strong> (geometry of the embedding)
          and <strong>twist</strong> (rotation of the normal field).</p>
          <div class="gl-controls-panel" style="margin-top:1rem;">
            <label>Base knot:</label>
            <select id="gl-frame-select">${knotOpts}</select>
            <label>Additional twist: <strong id="gl-tw-val">${state.framingTwist}</strong> turns</label>
            <input type="range" min="-5" max="5" value="${state.framingTwist}" id="gl-twist-slider">
            <label>Push-off distance: <strong id="gl-eps-val">${state.pushDist}</strong></label>
            <input type="range" min="0.05" max="0.4" step="0.01" value="${state.pushDist}" id="gl-eps-slider">
            <button class="btn-accent" id="gl-frame-btn" style="margin-top:0.5rem;">Compute Decomposition</button>
            <div id="gl-frame-result" class="gl-result"></div>
          </div>
          <div id="gl-ribbon-plot" style="height:450px;margin-top:1rem;"></div>
        </div>

        <div class="expo-panel">
          <h3>Why is the Linking Number Always an Integer?</h3>
          <h4>Proof 1: Degree of the Gauss Map</h4>
          <p>The Gauss map \\(G: T^2 \\to S^2\\) is a smooth map between compact oriented manifolds.
          Its <strong>degree</strong> &mdash; the signed count of preimages of a regular value &mdash; is always
          an integer. By Sard&rsquo;s theorem, regular values are generic. The Gauss linking integral computes
          exactly this degree.</p>
          <h4>Proof 2: Combinatorial (Crossing Signs)</h4>
          <p>Project the link to a generic 2D plane. Each crossing involves one strand from \\(K\\) and one from \\(L\\).
          The <strong>crossing sign</strong> \\(\\varepsilon_i = \\pm 1\\) is determined by the right-hand rule.
          Then:</p>
          <div class="formula-box">
            $$\\mathrm{Lk}(K, L) = \\frac{1}{2}\\sum_{i} \\varepsilon_i$$
          </div>
          <p>Each crossing contributes the same sign regardless of which strand is over/under, so the sum
          is always even, making the linking number an integer.</p>
          <h4>Proof 3: Seifert Surfaces</h4>
          <p>For any knot \\(L\\), there exists an oriented surface \\(\\Sigma\\) with \\(\\partial\\Sigma = L\\)
          (a <strong>Seifert surface</strong>). The linking number equals the algebraic intersection number:</p>
          <div class="formula-box">
            $$\\mathrm{Lk}(K, L) = K \\cdot \\Sigma_L = \\sum_{p \\in K \\cap \\Sigma_L} \\varepsilon(p)$$
          </div>
          <p>Intersection numbers of closed curves with surfaces are always integers, completing the proof.</p>
        </div>
      `;

      // Set up interactive elements
      if (typeof renderMathInElement === 'function') renderMathInElement(el);

      // --- Linking number computation ---
      const link = LINKS[state.selectedLink];
      plot3DLink('gl-3d-plot', link);

      document.getElementById('gl-link-select').addEventListener('change', e => {
        state.selectedLink = e.target.value;
        state.computed = null;
        const newLink = LINKS[state.selectedLink];
        plot3DLink('gl-3d-plot', newLink);
        document.getElementById('gl-result').innerHTML = '';
        document.getElementById('gl-heatmap').innerHTML = '';
      });
      document.getElementById('gl-resolution').addEventListener('input', e => {
        state.resolution = +e.target.value;
        document.getElementById('gl-res-val').textContent = state.resolution;
      });
      document.getElementById('gl-compute-btn').addEventListener('click', () => {
        const lnk = LINKS[state.selectedLink];
        const c1 = lnk.components[0], c2 = lnk.components[1];
        const resultDiv = document.getElementById('gl-result');
        resultDiv.innerHTML = '<p class="status-wait">Computing...</p>';
        setTimeout(() => {
          const result = gaussLinkingNumber(c1, c2, state.resolution);
          state.computed = result;
          resultDiv.innerHTML = `
            <div class="result-badge">Lk = ${result.rounded}</div>
            <table class="result-table">
              <tr><td>Raw integral</td><td>${result.value.toFixed(6)}</td></tr>
              <tr><td>Rounded</td><td>${result.rounded}</td></tr>
              <tr><td>Error</td><td>${Math.abs(result.value - result.rounded).toExponential(3)}</td></tr>
              <tr><td>Expected</td><td>${lnk.expectedLk}</td></tr>
            </table>
          `;
          plotHeatmap('gl-heatmap', result.integrand, result.t1, result.t2,
            'Integrand heatmap — integral = ' + result.value.toFixed(4));
        }, 50);
      });

      // --- Writhe computation ---
      document.getElementById('gl-writhe-btn').addEventListener('click', () => {
        const key = document.getElementById('gl-writhe-select').value;
        const curve = LINKS[key].components[0];
        const resultDiv = document.getElementById('gl-writhe-result');
        resultDiv.innerHTML = '<p class="status-wait">Computing...</p>';
        setTimeout(() => {
          const wr = computeWrithe(curve, 200);
          resultDiv.innerHTML = `
            <div class="result-badge" style="background:#e67e22;">Wr = ${wr.value.toFixed(4)}</div>
            <p style="font-size:0.85rem;color:var(--text-muted);">Writhe is generally not an integer.
            Nearest integer: ${Math.round(wr.value)}, fractional part: ${(wr.value - Math.round(wr.value)).toFixed(4)}</p>
          `;
          plotHeatmap('gl-writhe-heatmap', wr.integrand, wr.t, wr.t,
            'Writhe integrand — Wr = ' + wr.value.toFixed(4));
        }, 50);
      });

      // --- Framing decomposition ---
      document.getElementById('gl-twist-slider').addEventListener('input', e => {
        state.framingTwist = +e.target.value;
        document.getElementById('gl-tw-val').textContent = state.framingTwist;
      });
      document.getElementById('gl-eps-slider').addEventListener('input', e => {
        state.pushDist = +e.target.value;
        document.getElementById('gl-eps-val').textContent = state.pushDist;
      });
      document.getElementById('gl-frame-btn').addEventListener('click', () => {
        const key = document.getElementById('gl-frame-select').value;
        const curve = LINKS[key].components[0];
        const resultDiv = document.getElementById('gl-frame-result');
        resultDiv.innerHTML = '<p class="status-wait">Computing...</p>';
        setTimeout(() => {
          const framingAngle = state.framingTwist * TAU;
          const wr = computeWrithe(curve, 200);
          const tw = computeTwist(curve, framingAngle, 200);
          const lk = wr.value + tw.value;
          const t = linspace(curve.t_range[0], curve.t_range[1], 200);
          const basePts = evalCurve(curve, t);
          const po = pushOff(curve, state.pushDist, framingAngle, 200);
          resultDiv.innerHTML = `
            <table class="result-table">
              <tr><td>Wr</td><td>${wr.value.toFixed(4)}</td></tr>
              <tr><td>Tw</td><td>${tw.value.toFixed(4)}</td></tr>
              <tr><td>Wr + Tw</td><td>${lk.toFixed(4)}</td></tr>
              <tr><td><strong>Lk (rounded)</strong></td><td><strong>${Math.round(lk)}</strong></td></tr>
            </table>
          `;
          plotRibbon('gl-ribbon-plot', curve, po.pts, basePts,
            'Lk = ' + Math.round(lk) + ' — Wr = ' + wr.value.toFixed(2) + ', Tw = ' + tw.value.toFixed(2));
        }, 50);
      });
    }

    var fkSubTabMap = {
      'fk-reidemeister': 'r1'
    };

    function renderFramedKnotsEmbed(el, subTab) {
      var expoHtml = '';
      if (subTab === 'fk-reidemeister') {
        expoHtml = `
          <div class="expo-panel" style="margin-bottom:1rem;">
            <h3>Reidemeister Moves and Framing</h3>
            <p>A <strong>framed knot</strong> is a knot equipped with a smooth choice of normal vector
            at every point &mdash; equivalently, a ribbon or thin strip tied into a knot. The framing
            keeps track of how many times the ribbon twists as it travels along the knot.</p>
            <p>The three Reidemeister moves interact differently with framing:</p>
            <ul style="line-height:1.8;">
              <li><strong>RI</strong> (twist/untwist) <em>changes</em> the framing by &plusmn;1. A framed knot invariant
              must therefore be invariant only under RII and RIII, or must account for the twist introduced by RI.
              This is why the <em>Kauffman bracket</em> is not a knot invariant until corrected by the writhe.</li>
              <li><strong>RII</strong> (poke/unpoke) preserves the framing. Two crossings are added or removed simultaneously,
              contributing opposite signs that cancel.</li>
              <li><strong>RIII</strong> (slide) preserves the framing. No crossings are created or destroyed,
              so the total twist is unchanged.</li>
            </ul>
            <p>The visualizations below show how framing appears on tubes and surfaces
            around knots and links. You can adjust the number of strands and twists to see
            how the framing changes the geometry of the ribbon.</p>
          </div>
        `;
      }
      el.innerHTML = expoHtml + '<div id="fk-embed-root" style="margin:0 -1.5rem;"></div>';
      var root = document.getElementById('fk-embed-root');
      if (typeof window._fkRenderInto === 'function') {
        window._fkRenderInto(root, fkSubTabMap[subTab] || 'cylinder');
      } else {
        el.innerHTML = '<div class="expo-panel"><p>Loading framed knots module...</p></div>';
      }
    }

    render();
  };
})();
