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
      name: 'Figure-Eight 4₁', expectedLk: null, type: 'knot',
      components: [
        { name: 'K', color: '#2171b5', x: t=>(2+Math.cos(2*t))*Math.cos(3*t), y: t=>(2+Math.cos(2*t))*Math.sin(3*t), z: t=>Math.sin(4*t), t_range: [0,TAU] }
      ]
    },
    cinquefoil: {
      name: 'Cinquefoil 5₁ = T(2,5)', expectedLk: null, type: 'knot',
      components: [
        { name: 'K', color: '#2171b5',
          x: t=>(2+Math.cos(5*t))*Math.cos(2*t),
          y: t=>(2+Math.cos(5*t))*Math.sin(2*t),
          z: t=>-Math.sin(5*t),
          t_range: [0,TAU] }
      ]
    },
    knot_5_2: {
      name: 'Three-twist 5₂ (Lissajous)', expectedLk: null, type: 'knot',
      components: [
        { name: 'K', color: '#2171b5',
          x: t=>Math.cos(3*t + 1.5),
          y: t=>Math.cos(2*t + 0.2),
          z: t=>Math.cos(7*t),
          t_range: [0,TAU] }
      ]
    },
    knot_6_1: {
      name: 'Stevedore 6₁ (Lissajous)', expectedLk: null, type: 'knot',
      components: [
        { name: 'K', color: '#2171b5',
          x: t=>Math.cos(3*t + 0.7),
          y: t=>Math.cos(4*t + 0.1),
          z: t=>Math.cos(7*t),
          t_range: [0,TAU] }
      ]
    },
    knot_7_1: {
      name: '7₁ = T(2,7)', expectedLk: null, type: 'knot',
      components: [
        { name: 'K', color: '#2171b5',
          x: t=>(2+Math.cos(7*t))*Math.cos(2*t),
          y: t=>(2+Math.cos(7*t))*Math.sin(2*t),
          z: t=>-Math.sin(7*t),
          t_range: [0,TAU] }
      ]
    },
    knot_7_4: {
      name: '7₄ (Lissajous)', expectedLk: null, type: 'knot',
      components: [
        { name: 'K', color: '#2171b5',
          x: t=>Math.cos(4*t + 2.2),
          y: t=>Math.cos(3*t + 1.1),
          z: t=>Math.cos(11*t),
          t_range: [0,TAU] }
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

    // Rodrigues-style parallel transport: rotate N[i-1] by the minimal rotation
    // carrying T[i-1] to T[i]. Far more accurate than projection-renormalisation
    // and keeps drift low enough that the CWF identity Lk = Wr + Tw holds
    // numerically.
    for (let i = 1; i < nPoints; i++) {
      const t1 = T[i-1], t2 = T[i];
      const ax = cross(t1, t2);
      const sA = vnorm(ax);
      const cA = Math.max(-1, Math.min(1, dot(t1, t2)));
      let ni;
      if (sA < 1e-10) {
        ni = N[i-1];
      } else {
        const k = vscale(ax, 1/sA);
        const v = N[i-1];
        const kxv = cross(k, v);
        const kdv = dot(k, v);
        ni = vadd(vadd(vscale(v, cA), vscale(kxv, sA)), vscale(k, kdv*(1-cA)));
      }
      // re-orthogonalise against T[i] to kill tiny round-off drift
      ni = vsub(ni, vscale(T[i], dot(ni, T[i])));
      ni = normalize(ni);
      N.push(ni); B.push(cross(T[i], ni));
    }

    // Close the parallel-transport frame: measure holonomy angle from N[0] to N[n-1]
    // in the plane perpendicular to T[0] ≈ T[n-1], then subtract a uniform rotation
    // so the framing closes up. Without this correction the Călugăreanu–White–Fuller
    // relation Lk = Wr + Tw fails to produce an integer.
    const T0 = T[0];
    const Nend = N[nPoints-1];
    // signed angle from N[0] to Nend in the plane ⟂ T0, using right-hand rule about T0
    const cosHol = Math.max(-1, Math.min(1, dot(N[0], Nend)));
    const crossHol = cross(N[0], Nend);
    const sinHol = dot(crossHol, T0);
    const holonomy = Math.atan2(sinHol, cosHol); // in (-π, π]

    // Apply framing rotation (closing correction subtracted)
    const tRange = curve.t_range[1] - curve.t_range[0];
    const Nf = [], Bf = [];
    const effectiveAngle = framingAngle - holonomy;
    for (let i = 0; i < nPoints; i++) {
      const frac = (t[i] - curve.t_range[0]) / tRange;
      const angle = effectiveAngle * frac;
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
          <h3>The <span class="kl-term" title="Gauss (1833): lk(K,L) = (1/4\u03c0)\u222e_K\u222e_L (r\u2081\u2212r\u2082)\u00b7(dr\u2081\u00d7dr\u2082)/|r\u2081\u2212r\u2082|\u00b3. The integer degree of the Gauss map T\u00b2 \u2192 S\u00b2.">Gauss Linking Integral</span></h3>
          <p>In 1833, Gauss discovered that the <span class="kl-term" title="Integer-valued ambient-isotopy invariant of a 2-component oriented link; equals half the sum of signed crossings between the two components in any diagram.">linking number</span> of two closed curves
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

          <details class="kl-proof">
            <summary>Proof sketch: linking number is an isotopy invariant (R-move check)</summary>
            <p>Sketch. By Reidemeister's theorem it suffices to check the combinatorial formula \\(\\mathrm{Lk}(K,L) = \\tfrac12 \\sum_c \\varepsilon(c)\\) (where \\(c\\) ranges over crossings between \\(K\\) and \\(L\\)) under R1, R2, R3. <strong>R1</strong> involves a self-crossing of one component; it changes no \\(K\\)\u2013\\(L\\) crossing, so \\(\\mathrm{Lk}\\) is unchanged. <strong>R2</strong> (on strands of different components) creates or destroys two mixed crossings of opposite signs, so \\(\\sum\\varepsilon\\) is unchanged. <strong>R3</strong> permutes three crossings without changing any sign, so \\(\\sum\\varepsilon\\) is unchanged. Thus \\(\\mathrm{Lk}(K,L)\\) depends only on the isotopy class of the 2-component link.</p>
          </details>

          <details class="kl-proof">
            <summary>Proof sketch: the Gauss integral equals the degree of the Gauss map</summary>
            <p>Sketch. Let \\(\\omega\\) be the unit area 2-form on \\(S^2\\), normalized so that \\(\\int_{S^2}\\omega = 1\\). For any smooth map \\(G: T^2 \\to S^2\\), \\(\\deg G = \\int_{T^2} G^*\\omega\\) by a standard de\u2009Rham argument. Pulling back the standard area form \\(\\omega = \\tfrac{1}{4\\pi}(x\\,dy\\wedge dz + \\text{cyc.})\\) on \\(S^2\\) along the unit-vector Gauss map \\(G(t,s) = (\\gamma_1(t)-\\gamma_2(s))/|\\gamma_1(t)-\\gamma_2(s)|\\) gives, after a short computation using \\(\\partial_t G, \\partial_s G\\) and the identity \\(d(\\mathbf{r}/|\\mathbf{r}|^3) = 0\\),</p>
            <div class="formula-box">$$G^*\\omega \\;=\\; \\frac{1}{4\\pi}\\,\\frac{(\\gamma_1-\\gamma_2)\\cdot(\\dot\\gamma_1\\times\\dot\\gamma_2)}{|\\gamma_1-\\gamma_2|^3}\\,dt\\wedge ds.$$</div>
            <p>Integrating over \\(T^2 = S^1\\times S^1\\) recovers Gauss's integral; equality with \\(\\deg G\\) then gives the integer result. (See Bott\u2013Tu or Spivak for the general degree formula.)</p>
          </details>
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
          <h3><span class="kl-term" title="Writhe Wr(K): (1/4\u03c0)\u222e\u222e self-Gauss integral on K; equals the average of the diagram writhe over all projection directions (Fuller). Depends on the embedding, NOT a knot invariant.">Writhe</span></h3>
          <p>The <strong>writhe</strong> of a smooth embedded curve \\(K\\) is defined by the same Gauss integral,
          but with both integration curves equal to \\(K\\):</p>
          <div class="formula-box">
            $$\\mathrm{Wr}(K) = \\frac{1}{4\\pi}\\oint_K\\oint_K \\frac{(\\mathbf{r}(t) - \\mathbf{r}(s)) \\cdot (\\dot{\\mathbf{r}}(t) \\times \\dot{\\mathbf{r}}(s))}{|\\mathbf{r}(t) - \\mathbf{r}(s)|^3}\\,dt\\,ds.$$
          </div>
          <p>Unlike the linking number, writhe is <strong>not an integer</strong> and is <strong>not an
          invariant of the knot type</strong>: it depends on the embedding of \\(K\\) in space and changes continuously as the curve is deformed (jumping by \\(\\pm 2\\) through a self-crossing). By Fuller&rsquo;s theorem, \\(\\mathrm{Wr}(K)\\) equals the average of the diagram writhe \\(w(D_{\\mathbf{v}})\\) over all projection directions \\(\\mathbf{v} \\in S^2\\). The self-linking of a framed knot taken with its <span class="kl-term" title="Blackboard framing: the normal field lying in the projection plane. Its self-linking number equals the diagram writhe w(D) = \u2211\u03b5(c).">blackboard framing</span> equals the integer diagram writhe \\(w(D)\\).</p>

          <details class="kl-proof">
            <summary>Proof sketch: writhe is not a knot invariant \u2014 R1 changes it by \\(\\pm 1\\)</summary>
            <p>Sketch. Writhe of a diagram \\(D\\) is \\(w(D) = \\sum_c \\varepsilon(c)\\). Under <strong>R2</strong>, two cancelling-sign crossings are added/removed, so \\(w\\) is unchanged. Under <strong>R3</strong>, the three crossings are permuted without changing signs, so \\(w\\) is unchanged. Under <strong>R1</strong>, exactly one crossing of sign \\(\\varepsilon \\in \\{\\pm 1\\}\\) is added or removed, so \\(w\\) changes by \\(\\pm 1\\). Since ambient-isotopy equivalence of diagrams is generated by R1, R2, R3, the function \\(w\\) is an invariant only of <em>regular</em> isotopy (the subgroup generated by R2 and R3), not of ambient isotopy.</p>
          </details>

          <details class="kl-proof">
            <summary>Proof sketch: Fuller's theorem \\(\\mathrm{Wr}(K) = \\tfrac{1}{4\\pi}\\int_{S^2} w(D_{\\mathbf{v}})\\,dA\\)</summary>
            <p>Sketch (Fuller 1971). For each generic direction \\(\\mathbf{v} \\in S^2\\), the projected diagram writhe is \\(w(D_{\\mathbf{v}}) = \\sum_c \\varepsilon(c;\\mathbf{v})\\). For a pair of points \\(\\mathbf{r}(t),\\mathbf{r}(s)\\) on \\(K\\), the set of directions \\(\\mathbf{v}\\) for which they project onto a crossing is a great circle in \\(S^2\\) with area zero; each crossing contributes \\(\\varepsilon = \\mathrm{sign}\\,\\det[\\dot{\\mathbf{r}}(t),\\dot{\\mathbf{r}}(s),\\mathbf{v}]\\) on one hemisphere. Averaging over \\(\\mathbf{v}\\in S^2\\) with the uniform measure and interchanging the order of integration, the contribution of the pair \\((t,s)\\) reduces to the solid angle swept by the chord direction \\((\\mathbf{r}(t)-\\mathbf{r}(s))/|\\mathbf{r}(t)-\\mathbf{r}(s)|\\); this is precisely the Gauss-integrand of \\(\\mathrm{Wr}(K)\\) divided by \\(4\\pi\\). Details: Fuller (1971), Proc.\u2009Natl.\u2009Acad.\u2009Sci. 68, 815.</p>
          </details>
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

          <details class="kl-proof">
            <summary>Proof sketch: C&#259;lug&#259;reanu\u2013White\u2013Fuller \\(\\mathrm{Lk}(K,K') = \\mathrm{Wr}(K) + \\mathrm{Tw}(K,\\mathbf{n})\\)</summary>
            <p>Sketch. Apply the Gauss integral formula to the pair \\((K, K'=K+\\varepsilon\\mathbf{n})\\). Split the integrand \\((\\mathbf{r}_1-\\mathbf{r}_2)\\cdot(d\\mathbf{r}_1\\times d\\mathbf{r}_2)/|\\mathbf{r}_1-\\mathbf{r}_2|^3\\) into a <em>diagonal</em> contribution (from \\(t\\approx s\\) on \\(K\\), where the two points are \\(\\varepsilon\\)-separated along \\(\\mathbf{n}\\)) and an <em>off-diagonal</em> remainder. As \\(\\varepsilon \\to 0\\), the off-diagonal piece limits to the diagonal-excised self-Gauss integral of \\(K\\), i.e. \\(\\mathrm{Wr}(K)\\). The diagonal piece localises to a tubular neighbourhood and computes, via a Frenet-like expansion, the total rotation of \\(\\mathbf{n}\\) about the tangent \\(\\mathbf{T}\\):</p>
            <div class="formula-box">$$\\mathrm{Tw}(K,\\mathbf{n}) \\;=\\; \\frac{1}{2\\pi}\\oint_K (\\mathbf{T}\\times\\mathbf{n})\\cdot \\frac{d\\mathbf{n}}{ds}\\,ds.$$</div>
            <p>Summing the two pieces and noting that \\(\\mathrm{Lk}(K,K')\\) is continuous in \\(\\varepsilon\\) (hence independent of \\(\\varepsilon\\) as it is integer-valued) yields CWF. Original references: C&#259;lug&#259;reanu (1959\u201361), White (1969), Fuller (1971).</p>
          </details>
        </div>
        <div class="gl-controls-panel" style="margin-top:1rem;">
          <label>Base knot:</label>
          <select id="gl-frame-select">${knotOpts}</select>
          <label>Additional twist: <strong id="gl-tw-val">${state.framingTwist}</strong> turns</label>
          <input type="range" min="-5" max="5" value="${state.framingTwist}" id="gl-twist-slider">
          <label>Push-off distance: <strong id="gl-eps-val">${state.pushDist}</strong></label>
          <input type="range" min="0.01" max="0.1" step="0.005" value="${state.pushDist}" id="gl-eps-slider">
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
          The <strong>crossing sign</strong> \\(\\varepsilon_i = \\pm 1\\) is determined as follows: stand on the under-strand
          facing its direction of travel — if the over-strand passes from your right to your left, the crossing is
          \\(+1\\); left to right, \\(-1\\). Equivalently, writing the tangent vectors as 2D vectors,
          \\(\\varepsilon_i = \\operatorname{sign}\\bigl(\\det[\\,\\mathbf{u}_{\\text{under}},\\,\\mathbf{u}_{\\text{over}}\\,]\\bigr)\\).
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
          <p>In 1833, Gauss discovered that the <em>linking number</em> of two disjoint closed curves
          \\(K\\) and \\(L\\) in \\(\\mathbb{R}^3\\) can be computed by a double integral:</p>
          <div class="formula-box">
            $$\\mathrm{Lk}(K, L) = \\frac{1}{4\\pi}\\oint_K\\oint_L \\frac{(\\mathbf{r}_1 - \\mathbf{r}_2) \\cdot (d\\mathbf{r}_1 \\times d\\mathbf{r}_2)}{|\\mathbf{r}_1 - \\mathbf{r}_2|^3}.$$
          </div>
          <h4>From Electromagnetism</h4>
          <p>The formula arises naturally from <strong>Amp&egrave;re&rsquo;s law</strong> and <strong>Biot&ndash;Savart&rsquo;s law</strong>.
          For a steady current \\(I\\) in a closed loop \\(L\\), Biot&ndash;Savart gives the magnetic field</p>
          <div class="formula-box">
            $$\\mathbf{B}(\\mathbf{r}) = \\frac{\\mu_0 I}{4\\pi}\\oint_L \\frac{d\\mathbf{r}_2 \\times (\\mathbf{r} - \\mathbf{r}_2)}{|\\mathbf{r} - \\mathbf{r}_2|^3},$$
          </div>
          <p>and Amp&egrave;re&rsquo;s law says that the circulation of \\(\\mathbf{B}\\) around another loop \\(K\\) counts
          how many times \\(K\\) passes through \\(L\\) &mdash; the linking number.</p>
          <h4>The Gauss Map</h4>
          <p>Equivalently, \\(\\mathrm{Lk}(K,L)\\) is the <strong>degree</strong> of the Gauss map
          \\(G: T^2 \\to S^2\\), \\(G(t,s) = (\\gamma_1(t)-\\gamma_2(s))/|\\gamma_1(t)-\\gamma_2(s)|\\).
          The degree is always an integer, which is why \\(\\mathrm{Lk}\\in\\mathbb{Z}\\).</p>
          <h4>Interactive: two-component linking number</h4>
          <p>Select a 2-component link below and compute its linking number numerically via the
          Gauss integral. The heatmap shows the integrand
          \\(\\frac{(\\mathbf{r}_1-\\mathbf{r}_2)\\cdot(d\\mathbf{r}_1\\times d\\mathbf{r}_2)}{|\\mathbf{r}_1-\\mathbf{r}_2|^3}\\)
          as a function of \\((t,s)\\).</p>
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

          <h4>From two components to one: self-linking</h4>
          <p>The Gauss integral requires two <em>disjoint</em> loops, so it does not directly apply
          to a single knot \\(K\\). If we try to set \\(L = K\\) we divide by zero on the diagonal
          and the integral diverges. To recover an integer invariant of one knot we need a second
          copy of it — a <strong>push-off</strong> \\(K' = K + \\varepsilon\\,\\mathbf{n}\\) displaced by
          a small distance in a direction \\(\\mathbf{n}\\) transverse to \\(K\\). The integer
          \\(\\mathrm{Lk}(K,K')\\) is the <span class="kl-term" title="Self-linking number sl(K,n) = lk(K, K+\u03b5n): integer depending on knot AND framing. Equals Wr(K) + Tw(K,n) by C\u0103lug\u0103reanu\u2013White\u2013Fuller.">self-linking number</span> of \\(K\\) (often written
          \\(\\mathrm{Lk}(K)\\) or \\(\\mathrm{sl}(K)\\)).</p>
          <p>Crucially, \\(\\mathrm{Lk}(K)\\) depends on the choice of \\(\\mathbf{n}\\): a different
          <span class="kl-term" title="Framing: a continuous unit normal field n along K, equivalently a trivialisation of the normal bundle. The set of framings on K is a \u2124-torsor under adding full twists.">framing</span> can rotate the push-off so that it winds around \\(K\\) a different
          integer number of times. A framed knot \\((K,\\mathbf{n})\\) is a knot together with this
          transverse field, and \\(\\mathrm{Lk}(K)\\) is a framed-isotopy invariant, not an unoriented
          knot invariant.</p>
          <h4>Interactive: self-linking via &epsilon;-push-off</h4>
          <p>Pick a knot, a framing (number of extra full turns of \\(\\mathbf{n}\\) around
          \\(K\\)), and a push-off distance \\(\\varepsilon\\). We then apply the two-component Gauss
          integral directly to \\(K\\) and \\(K'=K+\\varepsilon\\mathbf{n}\\) &mdash; no CWF required.
          The result is an integer (up to discretisation error) equal to the self-linking number of
          \\((K,\\mathbf{n})\\). Adding one full turn to the framing changes the result by exactly
          \\(\\pm 1\\).</p>
          <div class="gl-compute-layout">
            <div class="gl-controls-panel">
              <label>Knot:</label>
              <select id="gl-sl-knot">${knotOpts}</select>
              <label>Extra turns of framing: <strong id="gl-sl-tw-val">${state.framingTwist}</strong></label>
              <input type="range" min="-5" max="5" step="1" value="${state.framingTwist}" id="gl-sl-tw">
              <label>Push-off \\(\\varepsilon\\): <strong id="gl-sl-eps-val">${state.pushDist}</strong></label>
              <input type="range" min="0.01" max="0.1" step="0.005" value="${state.pushDist}" id="gl-sl-eps">
              <button class="btn-accent" id="gl-sl-btn" style="margin-top:0.75rem;">Compute self-linking</button>
              <div id="gl-sl-result" class="gl-result"></div>
            </div>
            <div class="gl-plots">
              <div id="gl-sl-plot" style="height:420px;"></div>
            </div>
          </div>
          <div class="gl-sl-epsplots" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;">
            <div id="gl-sl-rawplot" style="height:260px;"></div>
            <div id="gl-sl-errplot" style="height:260px;"></div>
          </div>
          <p style="margin-top:0.4rem;font-size:0.85rem;color:var(--text-muted);max-width:none;text-align:left;">
          <em>Note on the plot axes:</em> the x-axis shows \\(\\varepsilon\\) with direction
          reversed &mdash; larger \\(\\varepsilon\\) is on the left, \\(\\varepsilon\\to 0\\) is on
          the right &mdash; so reading left&nbsp;→&nbsp;right traces the limit of shrinking
          push-off, and the accuracy collapse appears as a rightward tail.</p>
          <p style="margin-top:0.75rem;font-size:0.95rem;max-width:none;text-align:left;">
          <strong>Why the accuracy has a limit.</strong> Topologically \\(\\mathrm{Lk}(K,K')\\) is
          independent of \\(\\varepsilon\\) for all \\(\\varepsilon\\) small enough that \\(K'\\)
          is disjoint from \\(K\\); the raw integral should therefore sit on a horizontal line
          at the integer self-linking. It does not, because the Gauss kernel
          \\(1/|r_1-r_2|^3\\) concentrates more and more sharply on the diagonal as
          \\(\\varepsilon\\to 0\\): along \\(\\{(t,t)\\}\\) the denominator is \\(\\varepsilon^3\\)
          and the integrand spikes like \\(1/\\varepsilon^2\\) over a ridge of width \\(\\sim
          \\varepsilon\\). Our Riemann sum uses a fixed grid spacing
          \\(h = 2\\pi/N\\). While \\(\\varepsilon \\gtrsim h\\) the ridge is resolved by many
          grid cells and we recover the integer; once \\(\\varepsilon \\lesssim h\\) the sum sees
          only a single cell on the ridge and collapses. That is the tail you see at the
          left end of both plots. Raising \\(N\\) shifts the cliff leftward but never
          removes it — it is a property of any trapezoid-like quadrature of a
          near-singular integrand. The Călugăreanu–White–Fuller decomposition avoids this
          altogether by analytically separating the singular piece (absorbed into the
          writhe integral with a diagonal excision) from a smooth twist integral.</p>

          <p>To understand \\(\\mathrm{Lk}(K)\\) we decompose the Gauss integral as
          \\(\\varepsilon\\to 0\\) into two geometric pieces. The part that does <em>not</em> see the
          framing is the <strong>writhe</strong> \\(\\mathrm{Wr}(K)\\) — the Gauss self-integral
          regularised on the diagonal, a continuous function of the embedded curve. The part that
          <em>does</em> see the framing is the <strong>twist</strong>
          \\(\\mathrm{Tw}(K,\\mathbf{n})\\) — how many times \\(\\mathbf{n}\\) rotates about the tangent
          as we go once around the loop. Neither is an integer separately, but the theorem of
          <strong>C&#259;lug&#259;reanu&ndash;White&ndash;Fuller</strong> asserts that their sum always is:
          \\(\\mathrm{Lk}(K) = \\mathrm{Wr}(K) + \\mathrm{Tw}(K,\\mathbf{n})\\). Bending \\(K\\) trades
          writhe for twist and back; only the sum is topological.</p>
        </div>

        <div class="expo-panel" style="margin-bottom:0;">
          <h3>The Călugăreanu–White–Fuller Decomposition</h3>
          <p>Self-linking \\(\\mathrm{Lk}(K)\\) is a discrete integer, yet it arises from an embedding
          and a framing that can both be deformed continuously. The resolution is that
          \\(\\mathrm{Lk}(K)\\) splits into two continuous real-valued pieces that are individually
          non-topological but whose sum is always an integer. The <strong>writhe</strong>
          \\(\\mathrm{Wr}(K)\\) depends only on the embedded curve \\(K\\) in space (not on the
          framing) and measures its average signed crossing number. The <strong>twist</strong>
          \\(\\mathrm{Tw}(K,\\mathbf{n})\\) depends only on the framing \\(\\mathbf{n}\\) along
          \\(K\\) and counts how many times \\(\\mathbf{n}\\) rotates about the tangent as we go
          once around the loop. Deforming \\(K\\) trades writhe for twist — only the sum is
          preserved.</p>
          <div class="gl-three-col" style="margin-top:1rem;">
            <div class="gl-col">
            <h3>Writhe \\(\\mathrm{Wr}(K)\\)</h3>
            <div class="formula-box">
              $$\\mathrm{Wr}(K) = \\tfrac{1}{4\\pi}\\!\\oint_K\\!\\oint_K \\tfrac{(\\mathbf{r}(t)-\\mathbf{r}(s))\\cdot(\\dot{\\mathbf{r}}(t)\\times\\dot{\\mathbf{r}}(s))}{|\\mathbf{r}(t)-\\mathbf{r}(s)|^3}\\,dt\\,ds$$
            </div>
            <p>The Gauss integral applied twice to the same curve (regularised on the diagonal).
            A continuous, generally non-integer geometric property of the embedding. By Fuller's theorem
            it equals the average signed crossing number over all projection directions,
            \\(\\mathrm{Wr}(K) = \\tfrac{1}{4\\pi}\\!\\int_{S^2}\\! w(D_{\\mathbf{v}})\\,dA(\\mathbf{v})\\).
            Jumps by \\(\\pm 2\\) through a self-crossing.</p>
          </div>

          <div class="gl-col">
            <h3>Twist \\(\\mathrm{Tw}(K,\\mathbf{n})\\)</h3>
            <div class="formula-box">
              $$\\mathrm{Tw}(K,\\mathbf{n}) = \\tfrac{1}{2\\pi}\\!\\oint_K (\\mathbf{T}\\times\\mathbf{n})\\cdot\\tfrac{d\\mathbf{n}}{ds}\\,ds$$
            </div>
            <p>A property of the framing, not of \\(K\\) alone. Counts the total rotation of
            \\(\\mathbf{n}\\) about the tangent \\(\\mathbf{T}\\) as we traverse the loop. Continuous,
            generally non-integer; giving \\(\\mathbf{n}\\) one extra full turn changes \\(\\mathrm{Tw}\\)
            by exactly \\(+1\\). A planar circle with constant framing
            \\(\\mathbf{n}\\equiv\\hat{\\mathbf{z}}\\) has \\(\\mathrm{Tw}=0\\).</p>
          </div>

          <div class="gl-col">
            <h3>C&#259;lug&#259;reanu&ndash;White&ndash;Fuller</h3>
            <div class="formula-box">
              $$\\mathrm{Lk}(K) = \\mathrm{Wr}(K) + \\mathrm{Tw}(K,\\mathbf{n})$$
            </div>
            <p>Decomposes the integer \\(\\mathrm{Lk}(K)\\) into two continuous real-valued pieces.
            Writhe is intrinsic to the embedding of \\(K\\); twist is intrinsic to the framing.
            The sum is topological; individually, each changes as \\(K\\) is deformed.
            <em>Why doesn't the drawn ribbon close up at the seam?</em> The ribbon is plotted on a single
            period \\([t_0,t_0+2\\pi)\\); around the loop, \\(\\mathbf{n}\\) rotates by
            \\(2\\pi\\cdot\\mathrm{Tw}\\) about \\(\\mathbf{T}\\), and that rotation is what makes the two
            drawn endpoints disagree. Closure is topological, not visual.</p>
          </div>
        </div>

        <div class="expo-panel gl-unified">
          <h3>Unified Interactive Computation</h3>
          <p>Choose a knot and a framing below; the app computes all four quantities at once and
          renders the corresponding plot under each column.</p>
          <div class="gl-unified-controls">
            <div><label>Knot:</label>
              <select id="gl-uni-knot">${knotOpts}</select></div>
            <div><label>Extra turns of framing: <strong id="gl-tw-val">${state.framingTwist}</strong></label>
              <input type="range" min="-5" max="5" value="${state.framingTwist}" id="gl-twist-slider"></div>
            <div><label>Push-off \\(\\varepsilon\\): <strong id="gl-eps-val">${state.pushDist}</strong></label>
              <input type="range" min="0.01" max="0.1" step="0.005" value="${state.pushDist}" id="gl-eps-slider"></div>
            <div><button class="btn-accent" id="gl-uni-btn">Compute All</button></div>
          </div>
          <div class="gl-three-col gl-unified-plots">
            <div class="gl-col"><h4 style="margin-top:0;">\\(\\mathrm{Wr}(K)\\)</h4>
              <div id="gl-uni-wr" class="gl-result"></div>
              <div id="gl-writhe-heatmap" style="height:260px;margin-top:0.5rem;"></div>
              <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.4rem;">
              Heatmap of the writhe integrand
              \\(\\frac{(\\mathbf{r}(t)-\\mathbf{r}(s))\\cdot(\\dot{\\mathbf{r}}(t)\\times\\dot{\\mathbf{r}}(s))}{|\\mathbf{r}(t)-\\mathbf{r}(s)|^3}\\)
              over \\((t,s)\\in[0,2\\pi]^2\\). A small neighbourhood of the diagonal
              \\(t=s\\) is excised because the kernel is singular there; away from the
              diagonal the red/blue ridges are the contributions of the near-crossings of
              the projected curve, with colour indicating sign. The integral of the whole
              picture (divided by \\(4\\pi\\)) is \\(\\mathrm{Wr}(K)\\).</p></div>
            <div class="gl-col"><h4 style="margin-top:0;">\\(\\mathrm{Tw}(K,\\mathbf{n})\\)</h4>
              <div id="gl-uni-tw" class="gl-result"></div>
              <div id="gl-twist-plot" style="height:260px;margin-top:0.5rem;"></div>
              <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.4rem;">
              Pointwise twist density
              \\(\\frac{1}{2\\pi}(\\mathbf{T}\\times\\mathbf{n})\\cdot\\frac{d\\mathbf{n}}{ds}\\)
              along the parameter \\(t\\). It measures how fast the framing \\(\\mathbf{n}\\)
              is rotating about the tangent at each point; positive values are right-handed
              twist, negative values left-handed. Its integral around the loop is the total
              twist \\(\\mathrm{Tw}(K,\\mathbf{n})\\). A constant nonzero density means the
              framing turns uniformly; a density that oscillates around zero means curvature
              of \\(K\\) is forcing local twisting that cancels globally.</p></div>
            <div class="gl-col"><h4 style="margin-top:0;">CWF decomposition</h4>
              <div id="gl-uni-cwf" class="gl-result"></div>
              <div id="gl-ribbon-plot" style="height:260px;margin-top:0.5rem;"></div></div>
          </div>
        </div>
        </div><!-- /CWF wrapping expo-panel -->

        <div class="expo-panel">
          <h3>Why is the Linking Number Always an Integer?</h3>
          <h4>Proof 1: Degree of the Gauss Map</h4>
          <p>The Gauss map \\(G: T^2 \\to S^2\\) is a smooth map between compact oriented manifolds.
          Its <strong>degree</strong> &mdash; the signed count of preimages of a regular value &mdash; is always
          an integer. By Sard&rsquo;s theorem, regular values are generic. The Gauss linking integral computes
          exactly this degree.</p>
          <h4>Proof 2: Combinatorial (Crossing Signs)</h4>
          <p>Project the link to a generic 2D plane. Each crossing involves one strand from \\(K\\) and one from \\(L\\).
          The <strong>crossing sign</strong> \\(\\varepsilon_i = \\pm 1\\) is determined as follows: stand on the under-strand
          facing its direction of travel — if the over-strand passes from your right to your left, the crossing is
          \\(+1\\); left to right, \\(-1\\). Equivalently, writing the tangent vectors as 2D vectors,
          \\(\\varepsilon_i = \\operatorname{sign}\\bigl(\\det[\\,\\mathbf{u}_{\\text{under}},\\,\\mathbf{u}_{\\text{over}}\\,]\\bigr)\\).
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

      // --- Self-linking via ε-push-off (intro section) ---
      (function wireSelfLinking() {
        const twEl = document.getElementById('gl-sl-tw');
        const epsEl = document.getElementById('gl-sl-eps');
        const twVal = document.getElementById('gl-sl-tw-val');
        const epsVal = document.getElementById('gl-sl-eps-val');
        if (!twEl) return;
        twEl.addEventListener('input', e => {
          state.framingTwist = +e.target.value;
          twVal.textContent = state.framingTwist;
          // keep the lower-section slider in sync if present
          const twSlider = document.getElementById('gl-twist-slider');
          const twValLo = document.getElementById('gl-tw-val');
          if (twSlider) twSlider.value = state.framingTwist;
          if (twValLo) twValLo.textContent = state.framingTwist;
        });
        epsEl.addEventListener('input', e => {
          state.pushDist = +e.target.value;
          epsVal.textContent = state.pushDist;
          const epsSlider = document.getElementById('gl-eps-slider');
          const epsValLo = document.getElementById('gl-eps-val');
          if (epsSlider) epsSlider.value = state.pushDist;
          if (epsValLo) epsValLo.textContent = state.pushDist;
        });
        document.getElementById('gl-sl-btn').addEventListener('click', () => {
          const key = document.getElementById('gl-sl-knot').value;
          const curve = LINKS[key].components[0];
          const out = document.getElementById('gl-sl-result');
          out.innerHTML = '<p class="status-wait">Computing...</p>';
          setTimeout(() => {
            const N = 2000;
            const framingAngle = state.framingTwist * TAU;
            const tArr = linspace(curve.t_range[0], curve.t_range[1], N);
            const basePts = evalCurve(curve, tArr);
            const baseDer = evalDeriv(curve, tArr);
            const dt = (curve.t_range[1]-curve.t_range[0])/(N-1);

            // Lk at user's chosen ε
            function slAt(eps) {
              const po = pushOff(curve, eps, framingAngle, N);
              const poPts = po.pts;
              const poDer = [];
              for (let i = 0; i < N; i++) {
                const ip = Math.min(N-1, i+1), im = Math.max(0, i-1);
                const denom = (ip-im)*dt || dt;
                poDer.push([
                  (poPts[ip][0]-poPts[im][0])/denom,
                  (poPts[ip][1]-poPts[im][1])/denom,
                  (poPts[ip][2]-poPts[im][2])/denom
                ]);
              }
              let sum = 0;
              for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                  const dx = basePts[i][0]-poPts[j][0];
                  const dy = basePts[i][1]-poPts[j][1];
                  const dz = basePts[i][2]-poPts[j][2];
                  const d2 = dx*dx+dy*dy+dz*dz;
                  if (d2 < 1e-14) continue;
                  const cr = cross(baseDer[i], poDer[j]);
                  sum += (dx*cr[0]+dy*cr[1]+dz*cr[2]) / Math.pow(d2, 1.5);
                }
              }
              return { value: sum * dt * dt / (4 * PI), poPts };
            }

            const main = slAt(state.pushDist);
            const slInt = Math.round(main.value);
            out.innerHTML = `
              <div class="result-badge">Lk(K) = ${slInt}</div>
              <table class="result-table">
                <tr><td>Raw integral</td><td>${main.value.toFixed(6)}</td></tr>
                <tr><td>Rounded</td><td>${slInt}</td></tr>
                <tr><td>Error</td><td>${Math.abs(main.value-slInt).toExponential(3)}</td></tr>
                <tr><td>Framing turns</td><td>${state.framingTwist}</td></tr>
              </table>`;

            // Build animation frames: ε sweeps through a range (ping-pong).
            // Precompute the Lk integral at each ε so the readout can update live.
            const epsValues = [];
            const nFwd = 24;
            const epsMin = 0.01, epsMax = 0.1;
            for (let i = 0; i < nFwd; i++) epsValues.push(epsMin + (epsMax-epsMin)*i/(nFwd-1));
            for (let i = nFwd-2; i > 0; i--) epsValues.push(epsValues[i]);
            const slAtEps = epsValues.map(e => slAt(e));

            // 2D summary plots: raw integral and signed error vs -ε so that
            // accuracy visibly improves as we move to the right (smaller |ε|
            // on the left, larger on the right → error collapses toward 0).
            const epsFwd = epsValues.slice(0, nFwd);
            const rawFwd = slAtEps.slice(0, nFwd).map(r => r.value);
            const errFwd = rawFwd.map(v => v - Math.round(v));
            const rawMax = Math.max(1e-3, ...rawFwd.map(v => Math.abs(v)));
            const errMax = Math.max(1e-3, ...errFwd.map(v => Math.abs(v)));
            // Plot against +ε but reverse the x-axis so ε → 0 sits on the right
            // and accuracy visibly improves as you read left → right.
            Plotly.newPlot('gl-sl-rawplot', [{
              type:'scatter', mode:'lines+markers',
              x: epsFwd, y: rawFwd,
              line:{ color:'#2171b5', width:2 },
              marker:{ size:5 }
            }], {
              title:{ text:'Raw Gauss integral vs ε (axis reversed)', font:{size:12} },
              xaxis:{ title:'ε', autorange:'reversed' },
              yaxis:{ title:'Lk (raw)', range:[-rawMax, rawMax] },
              margin:{ l:55, r:15, t:35, b:45 },
              paper_bgcolor:'#f5f5f5', plot_bgcolor:'#fff',
              shapes: [{
                type:'line', x0: epsMin, x1: epsMax,
                y0: Math.round(main.value), y1: Math.round(main.value),
                line:{ color:'#aaa', width:1, dash:'dash' }
              }]
            }, { responsive:true });
            Plotly.newPlot('gl-sl-errplot', [{
              type:'scatter', mode:'lines+markers',
              x: epsFwd, y: errFwd,
              line:{ color:'#d6604d', width:2 },
              marker:{ size:5 }
            }], {
              title:{ text:'Signed error (raw − rounded) vs ε (axis reversed)', font:{size:12} },
              xaxis:{ title:'ε', autorange:'reversed' },
              yaxis:{ title:'error', range:[-errMax, errMax] },
              margin:{ l:55, r:15, t:35, b:45 },
              paper_bgcolor:'#f5f5f5', plot_bgcolor:'#fff'
            }, { responsive:true });

            const divId = 'gl-sl-plot';
            const baseXs = basePts.map(p=>p[0]);
            const baseYs = basePts.map(p=>p[1]);
            const baseZs = basePts.map(p=>p[2]);
            // Compute a padded axis range that includes K and the largest push-off.
            // Using the full range avoids Plotly auto-ranging cropping the curve.
            const allPoPts = slAtEps.map(r => r.poPts);
            let xmn=Infinity,xmx=-Infinity,ymn=Infinity,ymx=-Infinity,zmn=Infinity,zmx=-Infinity;
            function track(pts){pts.forEach(p=>{
              if(p[0]<xmn)xmn=p[0]; if(p[0]>xmx)xmx=p[0];
              if(p[1]<ymn)ymn=p[1]; if(p[1]>ymx)ymx=p[1];
              if(p[2]<zmn)zmn=p[2]; if(p[2]>zmx)zmx=p[2];
            });}
            track(basePts); allPoPts.forEach(track);
            const pad = 0.15 * Math.max(xmx-xmn, ymx-ymn, zmx-zmn);
            const axR = {
              x:[xmn-pad,xmx+pad], y:[ymn-pad,ymx+pad], z:[zmn-pad,zmx+pad]
            };
            function framesForPts(po) {
              const traces = [];
              traces.push({ type:'scatter3d', mode:'lines',
                x: baseXs, y: baseYs, z: baseZs,
                line:{ color:'#2171b5', width: 5 }, name: 'K', hoverinfo:'name' });
              traces.push({ type:'scatter3d', mode:'lines',
                x: po.map(p=>p[0]), y: po.map(p=>p[1]), z: po.map(p=>p[2]),
                line:{ color:'#d6604d', width: 4 }, name: "K'", hoverinfo:'name' });
              const step = Math.max(1, Math.floor(N/30));
              const rx=[], ry=[], rz=[];
              for (let i = 0; i < N; i += step) {
                rx.push(basePts[i][0], po[i][0], null);
                ry.push(basePts[i][1], po[i][1], null);
                rz.push(basePts[i][2], po[i][2], null);
              }
              traces.push({ type:'scatter3d', mode:'lines',
                x: rx, y: ry, z: rz,
                line:{ color:'#aaa', width:1 }, showlegend:false, hoverinfo:'none' });
              return traces;
            }
            const frames = epsValues.map((e, i) => ({
              name: 'e'+i, data: framesForPts(slAtEps[i].poPts)
            }));
            const layout = {
              title: { text: 'K and K′ = K + ε n  (Lk ≈ ' + slInt + ')', font:{size:13} },
              paper_bgcolor: '#f5f5f5', margin: { l:0, r:0, t:40, b:0 },
              scene: {
                aspectmode: 'cube', bgcolor: '#f5f5f5',
                xaxis: { range: axR.x }, yaxis: { range: axR.y }, zaxis: { range: axR.z }
              },
              showlegend: true,
              updatemenus: [{
                type:'buttons', showactive:false, x: 0.05, y: 0,
                buttons: [
                  { label:'▶ Play ε sweep', method:'animate',
                    args:[null, { mode:'immediate', fromcurrent:true,
                                  frame:{duration:120, redraw:true},
                                  transition:{duration:0} }] },
                  { label:'❚❚ Pause', method:'animate',
                    args:[[null], { mode:'immediate',
                                    frame:{duration:0, redraw:false},
                                    transition:{duration:0} }] }
                ]
              }]
            };
            Plotly.newPlot(divId, frames[0].data, layout, { responsive: true })
              .then(() => {
                Plotly.addFrames(divId, frames);
                const gd = document.getElementById(divId);
                // Update the readout live as ε sweeps.
                gd.on('plotly_animatingframe', ev => {
                  const nm = ev && ev.frame && ev.frame.name;
                  if (!nm) return;
                  const idx = parseInt(nm.slice(1), 10);
                  if (isNaN(idx)) return;
                  const r = slAtEps[idx];
                  const eps = epsValues[idx];
                  const rInt = Math.round(r.value);
                  out.innerHTML = `
                    <div class="result-badge">Lk(K) = ${rInt}</div>
                    <table class="result-table">
                      <tr><td>ε (current)</td><td>${eps.toFixed(3)}</td></tr>
                      <tr><td>Raw integral</td><td>${r.value.toFixed(6)}</td></tr>
                      <tr><td>Rounded</td><td>${rInt}</td></tr>
                      <tr><td>Error</td><td>${Math.abs(r.value-rInt).toExponential(3)}</td></tr>
                      <tr><td>Framing turns</td><td>${state.framingTwist}</td></tr>
                    </table>`;
                });
              });
          }, 50);
        });
      })();

      // --- Unified knot computation (Wr, Tw, CWF) ---
      document.getElementById('gl-twist-slider').addEventListener('input', e => {
        state.framingTwist = +e.target.value;
        document.getElementById('gl-tw-val').textContent = state.framingTwist;
      });
      document.getElementById('gl-eps-slider').addEventListener('input', e => {
        state.pushDist = +e.target.value;
        document.getElementById('gl-eps-val').textContent = state.pushDist;
      });
      document.getElementById('gl-uni-btn').addEventListener('click', () => {
        const key = document.getElementById('gl-uni-knot').value;
        const curve = LINKS[key].components[0];
        const wrDiv = document.getElementById('gl-uni-wr');
        const twDiv = document.getElementById('gl-uni-tw');
        const cwfDiv = document.getElementById('gl-uni-cwf');
        wrDiv.innerHTML = twDiv.innerHTML = cwfDiv.innerHTML =
          '<p class="status-wait">Computing...</p>';
        setTimeout(() => {
          const framingAngle = state.framingTwist * TAU;
          const N_CWF = 2000;
          const wr = computeWrithe(curve, N_CWF);
          const tw = computeTwist(curve, framingAngle, N_CWF);
          const lk = wr.value + tw.value;
          const tArr = linspace(curve.t_range[0], curve.t_range[1], N_CWF);
          const basePts = evalCurve(curve, tArr);
          const po = pushOff(curve, state.pushDist, framingAngle, N_CWF);

          // Compute self-linking independently via the two-component Gauss
          // integral between K and K' = K + εn (push-off). This is the
          // ground-truth integer that Wr + Tw should agree with.
          const baseDer = evalDeriv(curve, tArr);
          const poPts = po.pts;
          const dt_cwf = (curve.t_range[1]-curve.t_range[0])/(N_CWF-1);
          const poDer = [];
          for (let i = 0; i < N_CWF; i++) {
            const ip = Math.min(N_CWF-1, i+1), im = Math.max(0, i-1);
            const denom = (ip-im)*dt_cwf || dt_cwf;
            poDer.push([
              (poPts[ip][0]-poPts[im][0])/denom,
              (poPts[ip][1]-poPts[im][1])/denom,
              (poPts[ip][2]-poPts[im][2])/denom
            ]);
          }
          let gsum = 0;
          for (let i = 0; i < N_CWF; i++) {
            for (let j = 0; j < N_CWF; j++) {
              const dx = basePts[i][0]-poPts[j][0];
              const dy = basePts[i][1]-poPts[j][1];
              const dz = basePts[i][2]-poPts[j][2];
              const d2 = dx*dx+dy*dy+dz*dz;
              if (d2 < 1e-14) continue;
              const cr = cross(baseDer[i], poDer[j]);
              gsum += (dx*cr[0]+dy*cr[1]+dz*cr[2]) / Math.pow(d2, 1.5);
            }
          }
          const lkPush = gsum * dt_cwf * dt_cwf / (4 * PI);

          wrDiv.innerHTML = `
            <div class="result-badge" style="background:#e67e22;">Wr = ${wr.value.toFixed(4)}</div>
            <p style="font-size:0.85rem;color:var(--text-muted);">Generally not an integer.
            Nearest integer: ${Math.round(wr.value)}.</p>`;
          twDiv.innerHTML = `
            <div class="result-badge" style="background:#8e44ad;">Tw = ${tw.value.toFixed(4)}</div>
            <p style="font-size:0.85rem;color:var(--text-muted);">Extra turns of the framing:
            ${state.framingTwist}.</p>`;
          cwfDiv.innerHTML = `
            <table class="result-table">
              <tr><td>Wr</td><td>${wr.value.toFixed(4)}</td></tr>
              <tr><td>Tw</td><td>${tw.value.toFixed(4)}</td></tr>
              <tr><td>Wr + Tw</td><td>${lk.toFixed(4)}</td></tr>
              <tr><td><strong>Lk (rounded Wr+Tw)</strong></td><td><strong>${Math.round(lk)}</strong></td></tr>
              <tr><td>Lk via push-off ε=${state.pushDist}</td><td>${lkPush.toFixed(4)} → <strong>${Math.round(lkPush)}</strong></td></tr>
            </table>`;

          plotHeatmap('gl-writhe-heatmap', wr.integrand, wr.t, wr.t,
            'Writhe integrand (t,s)');

          // Twist integrand density along t: (T×Nf)·dNf/ds
          const dens = [];
          for (let i = 0; i < tw.T.length - 1; i++) {
            const dN = [tw.N[i+1][0]-tw.N[i][0], tw.N[i+1][1]-tw.N[i][1], tw.N[i+1][2]-tw.N[i][2]];
            const Tv = tw.T[i], Nv = tw.N[i];
            const TxN = [Tv[1]*Nv[2]-Tv[2]*Nv[1], Tv[2]*Nv[0]-Tv[0]*Nv[2], Tv[0]*Nv[1]-Tv[1]*Nv[0]];
            dens.push((TxN[0]*dN[0]+TxN[1]*dN[1]+TxN[2]*dN[2]) / (2*Math.PI));
          }
          if (typeof Plotly !== 'undefined') {
            Plotly.newPlot('gl-twist-plot', [{
              type: 'scatter', mode: 'lines',
              x: tw.t.slice(0, dens.length), y: dens,
              line: { color: '#8e44ad', width: 2 }
            }], {
              title: { text: 'Twist integrand density along t', font: { size: 12 } },
              xaxis: { title: 't' }, yaxis: { title: '(T×n)·dn/ds / 2π' },
              margin: { l: 50, r: 20, t: 35, b: 40 },
              paper_bgcolor: '#f5f5f5', plot_bgcolor: '#fff'
            }, { responsive: true });
          }

          plotRibbon('gl-ribbon-plot', curve, po.pts, basePts,
            'Lk = ' + Math.round(lk) + '  (Wr=' + wr.value.toFixed(2) + ', Tw=' + tw.value.toFixed(2) + ')');
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
            ${(function(){
              var S = window._reidemeisterSVGs || {};
              var row = 'display:flex;gap:1rem;align-items:center;margin:0.75rem 0;padding:0.5rem 0;border-top:1px solid #eee;';
              var svgcol = 'flex:0 0 340px;text-align:center;';
              var txtcol = 'flex:1;line-height:1.6;';
              return `
              <div style="${row}border-top:none;">
                <div style="${svgcol}">${S.RI ? S.RI() : ''}</div>
                <div style="${txtcol}"><strong>RI</strong> (twist/untwist) <em>changes</em> the framing by &plusmn;1. A framed knot invariant must therefore be invariant only under RII and RIII, or must account for the twist introduced by RI. This is why the <em>Kauffman bracket</em> is not a knot invariant until corrected by the writhe.</div>
              </div>
              <div style="${row}">
                <div style="${svgcol}">${S.RII ? S.RII() : ''}</div>
                <div style="${txtcol}"><strong>RII</strong> (poke/unpoke) preserves the framing. Two crossings are added or removed simultaneously, contributing opposite signs that cancel.</div>
              </div>
              <div style="${row}">
                <div style="${svgcol}">${S.RIII ? S.RIII() : ''}</div>
                <div style="${txtcol}"><strong>RIII</strong> (slide) preserves the framing. No crossings are created or destroyed, so the total twist is unchanged.</div>
              </div>`;
            })()}
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
