// ============================================================
// Framed Knots & Reidemeister Moves — Pure JS/Plotly module
// Ported from framed_knots_explorer.R
// ============================================================

(function () {
  'use strict';

  // ── Vector helpers ──
  function normalize(v) {
    const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    return len > 1e-12 ? [v[0]/len, v[1]/len, v[2]/len] : [0,0,0];
  }
  function cross(a, b) {
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  }
  function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
  function vadd(a, b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
  function vsub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
  function vscale(a, s) { return [a[0]*s, a[1]*s, a[2]*s]; }

  // ── Color palette ──
  const COLORS = [
    '#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00',
    '#a65628','#f781bf','#999999','#66c2a5','#fc8d62',
    '#8da0cb','#e78ac3'
  ];

  const RAINBOW_COLORSCALE = [
    [0,'#e41a1c'],[0.167,'#ff7f00'],[0.333,'#ffff33'],
    [0.5,'#4daf4a'],[0.667,'#377eb8'],[0.833,'#984ea3'],[1,'#e41a1c']
  ];
  const SMOOTH_COLORSCALE = [
    [0,'#e41a1c'],[0.25,'#d98a8c'],[0.5,'#ffffbf'],[0.75,'#8cb3d9'],[1,'#377eb8']
  ];
  const RIBBON_COLORSCALE = [
    [0,'#e41a1c'],[0.5,'#ffffbf'],[1,'#377eb8']
  ];

  // ── Parametric curves ──
  function linspace(a, b, n) {
    const arr = new Array(n);
    for (let i = 0; i < n; i++) arr[i] = a + (b - a) * i / (n - 1);
    return arr;
  }

  const CURVES = {
    cylinder: {
      name: 'Cylinder',
      surface: function(r, L, nt, nphi) {
        const t = linspace(0, L, nt), phi = linspace(0, 2*Math.PI, nphi);
        const X = [], Y = [], Z = [];
        for (let i = 0; i < nt; i++) {
          const xr = [], yr = [], zr = [];
          for (let j = 0; j < nphi; j++) {
            xr.push(r * Math.cos(phi[j]));
            yr.push(r * Math.sin(phi[j]));
            zr.push(t[i]);
          }
          X.push(xr); Y.push(yr); Z.push(zr);
        }
        return { X, Y, Z, t, phi };
      },
      strands: function(r, L, k, n, nt) {
        const t = linspace(0, L, nt);
        const strands = [];
        for (let s = 0; s < k; s++) {
          const x = [], y = [], z = [];
          for (let i = 0; i < nt; i++) {
            const angle = 2*Math.PI*s/k + n*2*Math.PI*t[i]/L;
            x.push(r * Math.cos(angle));
            y.push(r * Math.sin(angle));
            z.push(t[i]);
          }
          strands.push({ x, y, z });
        }
        return strands;
      },
      colorFunc: function(t, phi, n, L) {
        return ((phi - n * 2 * Math.PI * t / L) / (2 * Math.PI) % 1 + 1) % 1;
      },
      smoothFunc: function(t, phi, n, L) {
        return (1 - Math.cos(phi - n * 2 * Math.PI * t / L)) / 2;
      }
    },

    torus: {
      name: 'Torus',
      surface: function(R, r, nu, nv) {
        const theta = linspace(0, 2*Math.PI, nu), phi = linspace(0, 2*Math.PI, nv);
        const X = [], Y = [], Z = [];
        for (let i = 0; i < nu; i++) {
          const xr = [], yr = [], zr = [];
          for (let j = 0; j < nv; j++) {
            xr.push((R + r*Math.cos(phi[j])) * Math.cos(theta[i]));
            yr.push((R + r*Math.cos(phi[j])) * Math.sin(theta[i]));
            zr.push(r * Math.sin(phi[j]));
          }
          X.push(xr); Y.push(yr); Z.push(zr);
        }
        return { X, Y, Z, theta, phi };
      },
      strands: function(R, r, k, n, nt) {
        const theta = linspace(0, 2*Math.PI, nt);
        const strands = [];
        for (let s = 0; s < k; s++) {
          const x = [], y = [], z = [];
          for (let i = 0; i < nt; i++) {
            const phi = 2*Math.PI*s/k + n*theta[i];
            x.push((R + r*Math.cos(phi)) * Math.cos(theta[i]));
            y.push((R + r*Math.cos(phi)) * Math.sin(theta[i]));
            z.push(r * Math.sin(phi));
          }
          strands.push({ x, y, z });
        }
        return strands;
      }
    },

    trefoil: {
      name: 'Trefoil Knot',
      curve: function(nt) {
        const t = linspace(0, 2*Math.PI, nt);
        const pts = t.map(ti => [
          Math.sin(ti) + 2*Math.sin(2*ti),
          Math.cos(ti) - 2*Math.cos(2*ti),
          -2.5*Math.sin(3*ti)
        ]);
        return { pts, t };
      }
    },

    smooth_unknot: {
      name: 'Smooth Unknot',
      curve: function(nt) {
        const t = linspace(0, 2*Math.PI, nt);
        return { pts: t.map(ti => [3*Math.cos(ti), 3*Math.sin(ti), 0]), t };
      }
    },

    kinked_unknot: {
      name: 'Kinked Unknot (R1)',
      curve: function(nt) {
        const t = linspace(0, 2*Math.PI, nt);
        return {
          pts: t.map(ti => {
            const r = 1.5 + 3*Math.cos(ti);
            return [r*Math.cos(ti), r*Math.sin(ti), 4*Math.sin(ti)];
          }),
          t
        };
      }
    },

    figure_eight: {
      name: 'Figure-Eight Knot',
      curve: function(nt) {
        const t = linspace(0, 2*Math.PI, nt);
        return {
          pts: t.map(ti => [
            (2+Math.cos(2*ti))*Math.cos(3*ti),
            (2+Math.cos(2*ti))*Math.sin(3*ti),
            2.5*Math.sin(4*ti)
          ]),
          t
        };
      }
    }
  };

  // Torus knot factory
  function torusKnotCurve(p, q, R, r, nt) {
    R = R || 3; r = r || 1.8; nt = nt || 501;
    const t = linspace(0, 2*Math.PI, nt);
    return {
      pts: t.map(ti => [
        (R + r*Math.cos(q*ti))*Math.cos(p*ti),
        (R + r*Math.cos(q*ti))*Math.sin(p*ti),
        r*Math.sin(q*ti)
      ]),
      t
    };
  }

  // ── Frame computation (parallel transport with holonomy correction) ──
  function computeFrame(pts, closed) {
    const n = pts.length;
    const T = [], N = [], B = [];

    // Compute tangent vectors via central differences
    for (let i = 0; i < n; i++) {
      const ip = (i + 1) % n, im = (i - 1 + n) % n;
      T.push(normalize(vsub(pts[ip], pts[im])));
    }

    // Initial normal via Gram-Schmidt
    let seed = [1, 0, 0];
    if (Math.abs(dot(seed, T[0])) > 0.9) seed = [0, 1, 0];
    let n0 = vsub(seed, vscale(T[0], dot(seed, T[0])));
    n0 = normalize(n0);
    N.push(n0);
    B.push(cross(T[0], n0));

    // Parallel transport
    for (let i = 1; i < n; i++) {
      let ni = vsub(N[i-1], vscale(T[i], dot(N[i-1], T[i])));
      ni = normalize(ni);
      if (dot(ni, ni) < 0.5) ni = N[i-1]; // fallback
      N.push(ni);
      B.push(cross(T[i], ni));
    }

    // Holonomy correction for closed curves
    let holonomy = 0;
    if (closed && n > 2) {
      holonomy = Math.atan2(dot(N[n-1], B[0]), dot(N[n-1], N[0]));
      // Redistribute twist
      for (let i = 0; i < n; i++) {
        const angle = -holonomy * i / (n - 1);
        const c = Math.cos(angle), s = Math.sin(angle);
        const ni = vadd(vscale(N[i], c), vscale(B[i], s));
        const bi = vadd(vscale(N[i], -s), vscale(B[i], c));
        N[i] = normalize(ni);
        B[i] = normalize(bi);
      }
    }

    return { T, N, B, holonomy };
  }

  // ── Tube surface from curve + frame ──
  function tubeSurface(pts, frame, r, nphi) {
    r = r || 0.3; nphi = nphi || 30;
    const nt = pts.length;
    const phi = linspace(0, 2*Math.PI, nphi);
    const X = [], Y = [], Z = [];

    for (let i = 0; i < nt; i++) {
      const xr = [], yr = [], zr = [];
      for (let j = 0; j < nphi; j++) {
        const cp = Math.cos(phi[j]), sp = Math.sin(phi[j]);
        const offset = vadd(vscale(frame.N[i], cp * r), vscale(frame.B[i], sp * r));
        const p = vadd(pts[i], offset);
        xr.push(p[0]); yr.push(p[1]); zr.push(p[2]);
      }
      X.push(xr); Y.push(yr); Z.push(zr);
    }
    return { X, Y, Z };
  }

  // ── Tube strands (discrete colored curves on tube surface) ──
  function tubeStrands(pts, frame, r, k, n, closed) {
    const nt = pts.length;
    const strands = [];
    for (let s = 0; s < k; s++) {
      const x = [], y = [], z = [];
      for (let i = 0; i < nt; i++) {
        const t_param = closed ? (2*Math.PI * i / (nt - 1)) : (i / (nt - 1));
        const angle = 2*Math.PI*s/k + n * (closed ? t_param : 2*Math.PI*t_param);
        const cp = Math.cos(angle), sp = Math.sin(angle);
        const offset = vadd(vscale(frame.N[i], cp * r), vscale(frame.B[i], sp * r));
        const p = vadd(pts[i], offset);
        x.push(p[0]); y.push(p[1]); z.push(p[2]);
      }
      strands.push({ x, y, z });
    }
    return strands;
  }

  // ── Crossing detection for 2D projections ──
  function findCrossings(pts, proj, minGap) {
    proj = proj || 'xy'; minGap = minGap || 15;
    const ax = proj === 'yz' ? [1,2,0] : proj === 'xz' ? [0,2,1] : [0,1,2];
    const n = pts.length;
    const crossings = [];

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + minGap; j < n - 1; j++) {
        // 2D line segment intersection
        const p1 = [pts[i][ax[0]], pts[i][ax[1]]];
        const p2 = [pts[i+1][ax[0]], pts[i+1][ax[1]]];
        const p3 = [pts[j][ax[0]], pts[j][ax[1]]];
        const p4 = [pts[j+1][ax[0]], pts[j+1][ax[1]]];

        const d1 = [p2[0]-p1[0], p2[1]-p1[1]];
        const d2 = [p4[0]-p3[0], p4[1]-p3[1]];
        const det = d1[0]*d2[1] - d1[1]*d2[0];
        if (Math.abs(det) < 1e-10) continue;

        const dp = [p3[0]-p1[0], p3[1]-p1[1]];
        const t = (dp[0]*d2[1] - dp[1]*d2[0]) / det;
        const s = (dp[0]*d1[1] - dp[1]*d1[0]) / det;

        if (t >= 0 && t <= 1 && s >= 0 && s <= 1) {
          const cx = p1[0] + t*d1[0], cy = p1[1] + t*d1[1];
          const z1 = pts[i][ax[2]] + t*(pts[i+1][ax[2]] - pts[i][ax[2]]);
          const z2 = pts[j][ax[2]] + s*(pts[j+1][ax[2]] - pts[j][ax[2]]);
          const overI = z1 > z2 ? i : j;
          const sign = Math.sign(det) * (z1 > z2 ? 1 : -1);
          crossings.push({ x: cx, y: cy, overI, underI: overI === i ? j : i, sign, z1, z2 });
        }
      }
    }
    return crossings;
  }

  // ── Reidemeister strand generators ──
  function r2Strands(nt, crossed) {
    const t = linspace(-5, 5, nt);
    const s1 = t.map(ti => [ti, 0, 0]);
    const s2 = t.map(ti => {
      const dip = crossed ? 6.0 * Math.exp(-ti*ti) : 0;
      return [ti, 3.0 - dip, 1.5];
    });
    return [s1, s2];
  }

  function r3Strands(nt, after) {
    const u = linspace(0, 1, nt);
    const s1 = u.map(ui => [-4+8*ui, -4+8*ui, 1.2]);
    const s2 = u.map(ui => [4-8*ui, -4+8*ui, -1.2]);
    const yShift = after ? 2.0 : -2.0;
    const s3 = u.map(ui => [-4+8*ui, yShift, 0]);
    return [s1, s2, s3];
  }

  // ── Build 3D Plotly figure ──
  function build3DLayout(title) {
    return {
      title: { text: title, font: { size: 14 } },
      paper_bgcolor: '#f5f5f5',
      margin: { l: 0, r: 0, t: 40, b: 0 },
      scene: {
        aspectmode: 'data',
        bgcolor: '#f5f5f5',
        xaxis: { visible: false },
        yaxis: { visible: false },
        zaxis: { visible: false }
      },
      showlegend: false
    };
  }

  function surfaceTrace(surf, opts) {
    opts = opts || {};
    const trace = {
      type: 'surface',
      x: surf.X, y: surf.Y, z: surf.Z,
      opacity: opts.opacity || 0.25,
      showscale: false,
      hoverinfo: 'none',
      colorscale: opts.colorscale || [[0,'#b0c4de'],[1,'#b0c4de']]
    };
    if (opts.surfacecolor) trace.surfacecolor = opts.surfacecolor;
    return trace;
  }

  function lineTrace(strand, color, width) {
    return {
      type: 'scatter3d', mode: 'lines',
      x: strand.x, y: strand.y, z: strand.z,
      line: { color: color, width: width || 4 },
      hoverinfo: 'none'
    };
  }

  // ── Render a curve-based tab ──
  function renderCurveTab(container, curveKey, params) {
    const { k, n, mode, hideTube, mirror } = params;
    const divId = container.id + '-plot3d';
    const divId2d = container.id + '-plot2d';

    // Build the content
    container.innerHTML = `
      <div style="display:flex;gap:1rem;flex-wrap:wrap;">
        <div id="${divId}" style="flex:1;min-width:500px;height:550px;"></div>
        <div id="${divId2d}" style="flex:1;min-width:400px;height:550px;"></div>
      </div>
    `;

    const traces = [];
    const curveDef = CURVES[curveKey];
    let title = curveDef.name;

    if (curveKey === 'cylinder') {
      const r = 1, L = 6;
      // Surface
      if (!hideTube) {
        const surf = curveDef.surface(r, L, 60, 40);
        if (mode === 'rainbow') {
          const sc = [];
          for (let i = 0; i < 60; i++) {
            const row = [];
            for (let j = 0; j < 40; j++) {
              row.push(curveDef.colorFunc(surf.t[i], surf.phi[j], n, L));
            }
            sc.push(row);
          }
          traces.push(surfaceTrace(surf, { opacity: 0.85, surfacecolor: sc, colorscale: RAINBOW_COLORSCALE }));
        } else if (mode === 'smooth') {
          const sc = [];
          for (let i = 0; i < 60; i++) {
            const row = [];
            for (let j = 0; j < 40; j++) {
              row.push(curveDef.smoothFunc(surf.t[i], surf.phi[j], n, L));
            }
            sc.push(row);
          }
          traces.push(surfaceTrace(surf, { opacity: 0.85, surfacecolor: sc, colorscale: SMOOTH_COLORSCALE }));
        } else {
          traces.push(surfaceTrace(surf, { opacity: 0.25 }));
        }
      }
      // Discrete strands
      if (mode === 'discrete' && k > 0) {
        const strands = curveDef.strands(r, L, k, n, 401);
        strands.forEach((s, i) => traces.push(lineTrace(s, COLORS[i % COLORS.length], 5)));
      }
      title += ` (k=${k}, n=${n})`;
    }
    else if (curveKey === 'torus') {
      const R = 3, r = 1;
      if (!hideTube) {
        const surf = curveDef.surface(R, r, 60, 40);
        traces.push(surfaceTrace(surf, { opacity: 0.25 }));
      }
      if (mode === 'discrete' && k > 0) {
        const strands = curveDef.strands(R, r, k, n, 501);
        strands.forEach((s, i) => traces.push(lineTrace(s, COLORS[i % COLORS.length], 5)));
      }
      title += ` (k=${k}, n=${n})`;
    }
    else {
      // Generic closed curve (trefoil, unknot, figure-eight, etc.)
      const nt = 501;
      const { pts, t } = curveDef.curve(nt);
      const mirPts = mirror ? pts.map(p => [p[0], p[1], -p[2]]) : pts;
      const frame = computeFrame(mirPts, true);
      const tubeR = 0.3;

      if (!hideTube) {
        const surf = tubeSurface(mirPts, frame, tubeR, 30);
        traces.push(surfaceTrace(surf, { opacity: 0.25 }));
      }
      if (mode === 'discrete' && k > 0) {
        const strands = tubeStrands(mirPts, frame, tubeR, k, n, true);
        strands.forEach((s, i) => traces.push(lineTrace(s, COLORS[i % COLORS.length], 4)));
      }
      // Core curve
      traces.push({
        type: 'scatter3d', mode: 'lines',
        x: mirPts.map(p => p[0]), y: mirPts.map(p => p[1]), z: mirPts.map(p => p[2]),
        line: { color: '#1a365d', width: 3 },
        hoverinfo: 'none'
      });

      title += ` (k=${k}, n=${n})`;

      // 2D projection with crossings
      const crossings = findCrossings(mirPts, 'xy');
      const writhe = crossings.reduce((s, c) => s + c.sign, 0);
      render2DProjection(divId2d, mirPts, crossings, 'xy',
        `XY Projection — writhe = ${writhe}, crossings = ${crossings.length}`);
    }

    Plotly.newPlot(divId, traces, build3DLayout(title), { responsive: true });
  }

  // ── 2D projection plot ──
  function render2DProjection(divId, pts, crossings, proj, title) {
    const ax = proj === 'yz' ? [1,2] : proj === 'xz' ? [0,2] : [0,1];
    const x = pts.map(p => p[ax[0]]), y = pts.map(p => p[ax[1]]);
    const traces = [{
      type: 'scatter', mode: 'lines',
      x, y,
      line: { color: '#2171b5', width: 2 },
      hoverinfo: 'none'
    }];

    // Crossing markers
    if (crossings.length > 0) {
      const posX = [], posY = [], negX = [], negY = [];
      crossings.forEach(c => {
        if (c.sign > 0) { posX.push(c.x); posY.push(c.y); }
        else { negX.push(c.x); negY.push(c.y); }
      });
      if (posX.length) traces.push({
        type: 'scatter', mode: 'markers',
        x: posX, y: posY,
        marker: { symbol: 'circle', size: 10, color: '#2ecc71', line: { width: 2, color: '#222' } },
        name: '+', hoverinfo: 'name'
      });
      if (negX.length) traces.push({
        type: 'scatter', mode: 'markers',
        x: negX, y: negY,
        marker: { symbol: 'x', size: 10, color: '#e74c3c', line: { width: 2 } },
        name: '−', hoverinfo: 'name'
      });
    }

    Plotly.newPlot(divId, traces, {
      title: { text: title, font: { size: 13 } },
      xaxis: { scaleanchor: 'y', scaleratio: 1 },
      yaxis: {},
      paper_bgcolor: '#f5f5f5',
      plot_bgcolor: '#fff',
      showlegend: true,
      margin: { l: 40, r: 20, t: 40, b: 40 }
    }, { responsive: true });
  }

  // ── Reidemeister comparison plot ──
  function renderReidemeisterTab(container, moveType, params) {
    const divBefore = container.id + '-before';
    const divAfter = container.id + '-after';
    container.innerHTML = `
      <div style="display:flex;gap:1rem;flex-wrap:wrap;">
        <div id="${divBefore}" style="flex:1;min-width:450px;height:500px;"></div>
        <div id="${divAfter}" style="flex:1;min-width:450px;height:500px;"></div>
      </div>
    `;

    function plotStrands(divId, strandPts, title) {
      const traces = [];
      strandPts.forEach((strand, i) => {
        traces.push({
          type: 'scatter3d', mode: 'lines',
          x: strand.map(p => p[0]), y: strand.map(p => p[1]), z: strand.map(p => p[2]),
          line: { color: COLORS[i], width: 5 },
          hoverinfo: 'none'
        });
      });
      Plotly.newPlot(divId, traces, build3DLayout(title), { responsive: true });
    }

    if (moveType === 'r1') {
      const smooth = CURVES.smooth_unknot.curve(501);
      const kinked = CURVES.kinked_unknot.curve(701);
      const frame1 = computeFrame(smooth.pts, true);
      const frame2 = computeFrame(kinked.pts, true);
      const traces1 = [], traces2 = [];

      if (!params.hideTube) {
        traces1.push(surfaceTrace(tubeSurface(smooth.pts, frame1, 0.3, 30), { opacity: 0.25 }));
        traces2.push(surfaceTrace(tubeSurface(kinked.pts, frame2, 0.3, 30), { opacity: 0.25 }));
      }
      traces1.push({ type:'scatter3d', mode:'lines',
        x:smooth.pts.map(p=>p[0]), y:smooth.pts.map(p=>p[1]), z:smooth.pts.map(p=>p[2]),
        line:{color:'#2171b5',width:3}, hoverinfo:'none'});
      traces2.push({ type:'scatter3d', mode:'lines',
        x:kinked.pts.map(p=>p[0]), y:kinked.pts.map(p=>p[1]), z:kinked.pts.map(p=>p[2]),
        line:{color:'#2171b5',width:3}, hoverinfo:'none'});

      if (params.mode === 'discrete' && params.k > 0) {
        tubeStrands(smooth.pts, frame1, 0.3, params.k, params.n, true)
          .forEach((s,i) => traces1.push(lineTrace(s, COLORS[i%COLORS.length], 4)));
        tubeStrands(kinked.pts, frame2, 0.3, params.k, params.n, true)
          .forEach((s,i) => traces2.push(lineTrace(s, COLORS[i%COLORS.length], 4)));
      }

      Plotly.newPlot(divBefore, traces1, build3DLayout('Smooth unknot — writhe = 0'), {responsive:true});
      Plotly.newPlot(divAfter, traces2, build3DLayout('Kinked unknot — writhe = ±1'), {responsive:true});
    }
    else if (moveType === 'r2') {
      plotStrands(divBefore, r2Strands(401, false), 'Before R2 — no crossings');
      plotStrands(divAfter, r2Strands(401, true), 'After R2 — opposite-sign crossings, Δw = 0');
    }
    else if (moveType === 'r3') {
      plotStrands(divBefore, r3Strands(401, false), 'Before R3');
      plotStrands(divAfter, r3Strands(401, true), 'After R3 — same writhe');
    }
  }

  // ── Main render function ──
  window.renderFramedKnots = function(containerEl) {
    // State
    let state = { k: 1, n: 0, mode: 'discrete', hideTube: false, mirror: false, subTab: 'cylinder' };

    const SUB_TABS = [
      { id: 'cylinder', label: 'Cylinder' },
      { id: 'torus', label: 'Torus' },
      { id: 'trefoil', label: 'Trefoil' },
      { id: 'r1', label: 'Reidemeister I' },
      { id: 'r2', label: 'Reidemeister II' },
      { id: 'r3', label: 'Reidemeister III' },
    ];

    function render() {
      const controlsHtml = `
        <div class="fk-controls">
          <div class="fk-subtabs">
            ${SUB_TABS.map(t => `<button class="fk-subtab ${state.subTab===t.id?'active':''}" data-tab="${t.id}">${t.label}</button>`).join('')}
          </div>
          <div class="fk-sidebar">
            <label>Strands k: <strong>${state.k}</strong></label>
            <input type="range" min="1" max="12" value="${state.k}" id="fk-k">
            <label>Twists n: <strong>${state.n}</strong></label>
            <input type="range" min="-6" max="6" value="${state.n}" id="fk-n">
            <label>Display mode:</label>
            <select id="fk-mode">
              <option value="discrete" ${state.mode==='discrete'?'selected':''}>Discrete</option>
              <option value="rainbow" ${state.mode==='rainbow'?'selected':''}>Rainbow</option>
              <option value="smooth" ${state.mode==='smooth'?'selected':''}>Smooth</option>
            </select>
            <label><input type="checkbox" id="fk-hidetube" ${state.hideTube?'checked':''}> Hide tube</label>
            <label><input type="checkbox" id="fk-mirror" ${state.mirror?'checked':''}> Mirror (z → −z)</label>
          </div>
        </div>
        <div id="fk-content" class="fk-content"></div>
      `;

      containerEl.innerHTML = controlsHtml;

      // Wire controls
      containerEl.querySelectorAll('.fk-subtab').forEach(btn => {
        btn.addEventListener('click', () => { state.subTab = btn.dataset.tab; render(); });
      });
      document.getElementById('fk-k').addEventListener('input', e => {
        state.k = +e.target.value; render();
      });
      document.getElementById('fk-n').addEventListener('input', e => {
        state.n = +e.target.value; render();
      });
      document.getElementById('fk-mode').addEventListener('change', e => {
        state.mode = e.target.value; render();
      });
      document.getElementById('fk-hidetube').addEventListener('change', e => {
        state.hideTube = e.target.checked; render();
      });
      document.getElementById('fk-mirror').addEventListener('change', e => {
        state.mirror = e.target.checked; render();
      });

      // Render content
      const content = document.getElementById('fk-content');

      if (['r1', 'r2', 'r3'].includes(state.subTab)) {
        renderReidemeisterTab(content, state.subTab, state);
      } else {
        renderCurveTab(content, state.subTab, state);
      }
      // Always append the isotopy hierarchy below the main content
      var isoDiv = document.createElement('div');
      isoDiv.style.marginTop = '2rem';
      renderIsotopyTab(isoDiv);
      content.appendChild(isoDiv);
    }

    render();
  };

  function renderIsotopyTab(container) {
    container.innerHTML = `
      <div class="expo-panel">
        <h3>Hierarchy of Equivalences</h3>
        <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;margin:1rem 0;flex-wrap:wrap;">
          <div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:0.85rem 1.1rem;text-align:center;min-width:130px;box-shadow:0 1px 4px rgba(0,0,0,0.06);"><strong>Ambient Isotopy</strong><br><small style="color:#666;">R1 + R2 + R3<br>Forgets writhe</small></div>
          <span style="font-size:1.4rem;color:#2171b5;">⊃</span>
          <div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:0.85rem 1.1rem;text-align:center;min-width:130px;box-shadow:0 1px 4px rgba(0,0,0,0.06);"><strong>Regular Isotopy</strong><br><small style="color:#666;">R2 + R3 only<br>Preserves writhe = framing</small></div>
          <span style="font-size:1.4rem;color:#2171b5;">⊃</span>
          <div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:0.85rem 1.1rem;text-align:center;min-width:130px;box-shadow:0 1px 4px rgba(0,0,0,0.06);"><strong>Framed Isotopy</strong><br><small style="color:#666;">Oriented + framed<br>Full ribbon structure</small></div>
        </div>
        <h3>Why Framing Matters</h3>
        <p><strong>Reidemeister I</strong> adds or removes a single curl, changing the writhe by ±1. For framed knots,
        this changes the self-linking number. Hence framed isotopy forbids R1.</p>
        <p><strong>Reidemeister II</strong> creates two crossings of opposite sign. The net writhe change is zero,
        so framing is preserved.</p>
        <p><strong>Reidemeister III</strong> slides a strand past a crossing. Each crossing retains its sign,
        so writhe (and framing) is preserved.</p>
        <h3>Applications</h3>
        <p>Framed links present 3-manifolds via <strong>Dehn surgery</strong>. The surgery coefficient p/q
        is determined by the framing. The Kirby theorem states that two framed links give diffeomorphic
        3-manifolds iff they are related by Kirby moves (handle slides and stabilization).</p>
        <p>The <strong>Pontryagin-Thom construction</strong> relates framed cobordism classes to stable homotopy groups:
        Ω<sub>fr</sub><sup>1</sup> ≅ π<sub>1</sub><sup>s</sup>(S<sup>0</sup>) ≅ ℤ/2.</p>
      </div>
    `;
  }

  // Expose a function to render framed knots into an arbitrary container with a preset sub-tab
  window._fkRenderInto = function(containerEl, startTab) {
    window.renderFramedKnots(containerEl);
    // Switch to the requested sub-tab if not the default
    if (startTab && startTab !== 'cylinder') {
      var btn = containerEl.querySelector('.fk-subtab[data-tab="' + startTab + '"]');
      if (btn) btn.click();
    }
  };
})();
