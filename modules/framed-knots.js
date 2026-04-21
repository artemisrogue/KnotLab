// ============================================================
// Framed Knots & Reidemeister Moves — Pure JS/Plotly module
// Ported from framed_knots_explorer.R
//
// Usage in KnotLab:
//   This module is NOT mounted as its own top-level tab. It is embedded
//   inside the "Linking" tab (gauss-linking.js) via window._fkRenderInto,
//   which delegates to the sub-tab router below. Index.html loads this
//   file; gauss-linking.js calls _fkRenderInto(container, 'cylinder' | …).
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
          // directions at crossing, for over/under rendering
          const overD = z1 > z2 ? d1 : d2;
          const underD = z1 > z2 ? d2 : d1;
          crossings.push({ x: cx, y: cy, overI, underI: overI === i ? j : i, sign,
                           z1, z2, overD, underD });
        }
      }
    }
    return crossings;
  }

  // Multi-strand crossings: all self + pairwise between distinct strands
  function findCrossingsMulti(strandPts, proj) {
    proj = proj || 'xy';
    const ax = proj === 'yz' ? [1,2,0] : proj === 'xz' ? [0,2,1] : [0,1,2];
    const crossings = [];
    const segIntersect = (pts1, i, pts2, j, sameStrand) => {
      const p1 = [pts1[i][ax[0]], pts1[i][ax[1]]];
      const p2 = [pts1[i+1][ax[0]], pts1[i+1][ax[1]]];
      const p3 = [pts2[j][ax[0]], pts2[j][ax[1]]];
      const p4 = [pts2[j+1][ax[0]], pts2[j+1][ax[1]]];
      const d1 = [p2[0]-p1[0], p2[1]-p1[1]];
      const d2 = [p4[0]-p3[0], p4[1]-p3[1]];
      const det = d1[0]*d2[1] - d1[1]*d2[0];
      if (Math.abs(det) < 1e-10) return null;
      const dp = [p3[0]-p1[0], p3[1]-p1[1]];
      const t = (dp[0]*d2[1] - dp[1]*d2[0]) / det;
      const s = (dp[0]*d1[1] - dp[1]*d1[0]) / det;
      if (t < 0 || t > 1 || s < 0 || s > 1) return null;
      const cx = p1[0] + t*d1[0], cy = p1[1] + t*d1[1];
      const z1 = pts1[i][ax[2]] + t*(pts1[i+1][ax[2]] - pts1[i][ax[2]]);
      const z2 = pts2[j][ax[2]] + s*(pts2[j+1][ax[2]] - pts2[j][ax[2]]);
      const sign = Math.sign(det) * (z1 > z2 ? 1 : -1);
      const overD = z1 > z2 ? d1 : d2;
      const underD = z1 > z2 ? d2 : d1;
      return { x: cx, y: cy, sign, z1, z2, overD, underD };
    };
    for (let a = 0; a < strandPts.length; a++) {
      const pa = strandPts[a];
      // self-crossings (skip near-diagonal)
      for (let i = 0; i < pa.length-1; i++) {
        for (let j = i+15; j < pa.length-1; j++) {
          const c = segIntersect(pa, i, pa, j, true); if (c) crossings.push(c);
        }
      }
      for (let b = a+1; b < strandPts.length; b++) {
        const pb = strandPts[b];
        for (let i = 0; i < pa.length-1; i++) {
          for (let j = 0; j < pb.length-1; j++) {
            const c = segIntersect(pa, i, pb, j, false); if (c) crossings.push(c);
          }
        }
      }
    }
    return crossings;
  }

  function render2DProjectionMulti(divId, strandPts, crossings, proj, title, opts) {
    opts = opts || {};
    const ax = proj === 'yz' ? [1,2] : proj === 'xz' ? [0,2] : [0,1];
    const traces = [];
    const strandColor = i => COLORS[i % COLORS.length];
    strandPts.forEach((sp, i) => {
      traces.push({
        type: 'scatter', mode: 'lines',
        x: sp.map(p => p[ax[0]]), y: sp.map(p => p[ax[1]]),
        line: { color: strandColor(i), width: 3 },
        hoverinfo: 'none', showlegend: false
      });
    });
    // Optional core curve overlaid on projection
    if (opts.core) {
      traces.push({
        type: 'scatter', mode: 'lines',
        x: opts.core.map(p => p[ax[0]]), y: opts.core.map(p => p[ax[1]]),
        line: { color: '#1a365d', width: 4, dash: 'dot' },
        hoverinfo: 'none', showlegend: false
      });
    }
    // Orientation arrows on each strand (and core)
    if (opts.orientation) {
      strandPts.forEach((sp, i) => {
        const step = Math.max(10, Math.floor(sp.length / 8));
        const ax0 = [], ay0 = [];
        for (let j = 0; j < sp.length - 1; j += step) {
          ax0.push(sp[j][ax[0]]); ay0.push(sp[j][ax[1]]);
        }
        traces.push({
          type: 'scatter', mode: 'markers', x: ax0, y: ay0,
          marker: { symbol: 'triangle-up', size: 10, color: strandColor(i),
                    line: { width: 1, color: '#000' } },
          hoverinfo: 'none', showlegend: false
        });
      });
    }
    // Over/under rendering: mask + overlay
    const gap = 0.35, overLen = 0.55;
    (crossings || []).forEach(c => {
      if (!c.overD || !c.underD) return;
      const uLen = Math.hypot(c.underD[ax[0]], c.underD[ax[1]]) || 1;
      const oLen = Math.hypot(c.overD[ax[0]], c.overD[ax[1]]) || 1;
      const ux = c.underD[ax[0]]/uLen, uy = c.underD[ax[1]]/uLen;
      const ox = c.overD[ax[0]]/oLen, oy = c.overD[ax[1]]/oLen;
      traces.push({
        type: 'scatter', mode: 'lines',
        x: [c.x - gap*ux, c.x + gap*ux], y: [c.y - gap*uy, c.y + gap*uy],
        line: { color: '#fff', width: 8 }, hoverinfo: 'none', showlegend: false
      });
      traces.push({
        type: 'scatter', mode: 'lines',
        x: [c.x - overLen*ox, c.x + overLen*ox], y: [c.y - overLen*oy, c.y + overLen*oy],
        line: { color: '#333', width: 3 }, hoverinfo: 'none', showlegend: false
      });
    });
    const signAnnots = (crossings || []).map(c => ({
      x: c.x, y: c.y, text: c.sign > 0 ? '+' : '−', showarrow: false,
      xshift: 14, yshift: 14,
      font: { size: 12, color: c.sign > 0 ? '#2ecc71' : '#e74c3c' }
    }));
    Plotly.newPlot(divId, traces, {
      title: { text: title, font: { size: 13 } },
      xaxis: { scaleanchor: 'y', scaleratio: 1 },
      yaxis: {},
      paper_bgcolor: '#f5f5f5', plot_bgcolor: '#fff',
      showlegend: false, margin: { l: 40, r: 20, t: 40, b: 40 },
      annotations: signAnnots
    }, { responsive: true });
  }

  // ── Reidemeister strand generators (with animation-parameter α∈[0,1]) ──
  // R1 (open): a single open strand that grows one self-crossing loop as α→1.
  function r1StrandsOpen(nt, alpha, side) {
    alpha = (alpha === undefined) ? 1 : alpha;
    side = (side === undefined) ? 1 : side; // +1 loop above, -1 loop below
    const nS1 = Math.floor(nt*0.35), nL = Math.floor(nt*0.3);
    const nS2 = nt - nS1 - nL;
    const s = [];
    for (let i = 0; i < nS1; i++) {
      const t = -5 + 4.2*i/(nS1-1);
      s.push([t, 0, 0]);
    }
    for (let i = 0; i < nL; i++) {
      const u = 2*Math.PI*i/(nL-1);
      const baseX = -0.8 + 1.6*i/(nL-1);
      const x = baseX + alpha*0.9*Math.cos(u - Math.PI/2);
      // Loop vertex always points in +y (same direction for both variants);
      // the sign of the crossing is distinguished by the z-sign only.
      const y = alpha*(0.9 + 0.9*Math.sin(u - Math.PI/2));
      const z = side * alpha*0.35*Math.sin(u);
      s.push([x, y, z]);
    }
    for (let i = 0; i < nS2; i++) {
      const t = 0.8 + 4.2*i/(nS2-1);
      s.push([t, 0, 0]);
    }
    return [s];
  }

  function r2Strands(nt, alpha) {
    alpha = (alpha === undefined) ? 1 : alpha;
    const t = linspace(-5, 5, nt);
    const s1 = t.map(ti => [ti, 0, 0]);
    const s2 = t.map(ti => {
      const dip = alpha * 6.0 * Math.exp(-ti*ti);
      return [ti, 3.0 - dip, 1.5];
    });
    return [s1, s2];
  }

  function r3Strands(nt, alpha) {
    alpha = (alpha === undefined) ? 1 : alpha;
    const u = linspace(0, 1, nt);
    const s1 = u.map(ui => [-4+8*ui, -4+8*ui, 1.2]);
    const s2 = u.map(ui => [4-8*ui, -4+8*ui, -1.2]);
    const yShift = -2.0 + 4.0*alpha;
    const s3 = u.map(ui => [-4+8*ui, yShift, 0]);
    return [s1, s2, s3];
  }

  // Reidemeister animation: smoothly play move forward, pause, reverse, pause.
  // Camera stays fixed — the user can rotate interactively.
  function renderReidemeisterAnimation(divId, moveType, opts) {
    opts = opts || {};
    const side = opts.side || 1;
    const title = opts.title || '';
    const frameMs = (moveType === 'r1seq') ? 70 : 140;
    const nt = 201;
    const fwd = 32, pause = 10; // smooth sweep + short hold
    const total = 2*(fwd + pause);
    // For R1 and R2 we start in the "complicated" state so the move is a simplification.
    const startComplicated = (moveType === 'r1' || moveType === 'r1both' || moveType === 'r2');
    // Scripted R1 sequence: (side, |a|) keyframes going
    //   (+1,1) → (+1,0) → (+1,1) → (+1,0) → (-1,1) and then reversed.
    const r1SeqKeys = [
      [+1, 1.0], [+1, 0.0], [+1, 1.0], [+1, 0.0], [-1, 1.0]
    ];
    function stepFn(a) {
      if (moveType === 'r1')    return r1StrandsOpen(nt, a, side);
      if (moveType === 'r1both') {
        // Two side-by-side variants in one scene, offset along z.
        const A = r1StrandsOpen(nt, a, +1).map(s => s.map(p => [p[0], p[1], p[2] + 2.4]));
        const B = r1StrandsOpen(nt, a, -1).map(s => s.map(p => [p[0], p[1], p[2] - 2.4]));
        return A.concat(B);
      }
      if (moveType === 'r2')    return r2Strands(nt, a);
      return r3Strands(nt, a);
    }
    function alphaAt(f) {
      let a;
      if (f < fwd)                  a = f / (fwd - 1);
      else if (f < fwd + pause)     a = 1;
      else if (f < 2*fwd + pause)   a = 1 - (f - fwd - pause) / (fwd - 1);
      else                          a = 0;
      // If starting kinked, invert so α=1 displays as the "before" state.
      return startComplicated ? 1 - a : a;
    }
    const framesData = [];
    if (moveType === 'r1seq') {
      // Interpolate through r1SeqKeys forward then reverse (ping-pong the whole thing).
      const perSeg = 22;
      const seq = [];
      for (let k = 0; k < r1SeqKeys.length - 1; k++) {
        const [sA, aA] = r1SeqKeys[k];
        const [sB, aB] = r1SeqKeys[k+1];
        for (let p = 0; p < perSeg; p++) {
          const u = p / (perSeg - 1);
          // keep side from start of segment (both endpoints share side except the last segment)
          // For segments where sA != sB (side flip), the magnitude is 0 at one end so
          // the visible strand is straight — interpolate alpha linearly and switch side at u=0.5.
          // For a side-flip segment the starting magnitude is 0 (straight strand),
          // so switching to the destination side at u=0 causes no visible jump.
          let side_ = (sA === sB) ? sA : sB;
          let a = aA + (aB - aA) * u;
          seq.push([side_, a]);
        }
      }
      const reverse = seq.slice().reverse();
      // small pause at each end
      for (let h = 0; h < 8; h++) reverse.push(reverse[reverse.length-1]);
      for (let h = 0; h < 8; h++) seq.unshift(seq[0]);
      const full = seq.concat(reverse);
      for (let f = 0; f < full.length; f++) {
        const [sd, a] = full[f];
        const strands = r1StrandsOpen(nt, a, sd);
        framesData.push({
          name: 'f'+f,
          data: strands.map((s, i) => ({
            type: 'scatter3d', mode: 'lines',
            x: s.map(p=>p[0]), y: s.map(p=>p[1]), z: s.map(p=>p[2]),
            line: { color: COLORS[i], width: 6 }, hoverinfo: 'none'
          }))
        });
      }
    } else {
      for (let f = 0; f < total; f++) {
        const strands = stepFn(alphaAt(f));
        framesData.push({
          name: 'f'+f,
          data: strands.map((s, i) => ({
            type: 'scatter3d', mode: 'lines',
            x: s.map(p=>p[0]), y: s.map(p=>p[1]), z: s.map(p=>p[2]),
            line: { color: COLORS[i], width: 6 }, hoverinfo: 'none'
          }))
        });
      }
    }
    const cam = (moveType === 'r3')
      ? { eye: { x: 0.0, y: -0.2, z: 2.2 } }
      : { eye: { x: 1.4, y: -1.9, z: 1.1 } };
    Plotly.newPlot(divId, framesData[0].data, {
      title: title ? { text: title, font: { size: 12 } } : undefined,
      paper_bgcolor: '#f5f5f5', margin: { l:0, r:0, t: title ? 26 : 6, b:0 },
      scene: { aspectmode: 'data', bgcolor: '#f5f5f5',
               xaxis:{visible:false}, yaxis:{visible:false}, zaxis:{visible:false},
               camera: cam },
      showlegend: false,
      updatemenus: [{
        type: 'buttons', showactive: false, x: 0.05, y: 0,
        buttons: [
          { label: '▶ Play', method: 'animate',
            args: [null, { mode: 'immediate', fromcurrent: true,
                           frame: { duration: frameMs, redraw: true },
                           transition: { duration: 0 } }] },
          { label: '❚❚ Pause', method: 'animate',
            args: [[null], { mode: 'immediate',
                             frame: { duration: 0, redraw: false },
                             transition: { duration: 0 } }] }
        ]
      }]
    }, { responsive: true }).then(() => {
      Plotly.addFrames(divId, framesData);
      // Do not autoplay — user must press Play.
    });
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

  // Add directional cones along a 3D polyline to visualise orientation.
  function addOrientationCones3D(traces, pts, nCones) {
    nCones = nCones || 8;
    if (!pts || pts.length < 2) return;
    const step = Math.max(1, Math.floor(pts.length / nCones));
    const x = [], y = [], z = [], u = [], v = [], w = [];
    for (let i = 0; i < pts.length - 1; i += step) {
      const dx = pts[i+1][0] - pts[i][0];
      const dy = pts[i+1][1] - pts[i][1];
      const dz = pts[i+1][2] - pts[i][2];
      x.push(pts[i][0]); y.push(pts[i][1]); z.push(pts[i][2]);
      u.push(dx); v.push(dy); w.push(dz);
    }
    traces.push({
      type: 'cone', x, y, z, u, v, w,
      sizemode: 'absolute', sizeref: 0.14, anchor: 'tail',
      showscale: false, colorscale: [[0,'#1a365d'],[1,'#1a365d']],
      hoverinfo: 'none'
    });
  }

  // ── Render a curve-based tab ──
  function renderCurveTab(container, curveKey, params) {
    const { k, n, mode, hideTube, mirror, orientation } = params;
    const divId = container.id + '-plot3d';
    const divId2d = container.id + '-plot2d';

    // Build the content
    const notes = {
      cylinder: `
        <div class="expo-panel" style="margin-bottom:0.75rem;">
          <p>The <strong>cylinder</strong> is the simplest model of a framed arc: the straight core
          runs along the axis, and \\(k\\) evenly-spaced strands wrap its surface with \\(n\\) full
          twists distributed along the length. The core carries an <em>orientation</em> (direction of
          increasing height); the strands inherit this direction. With \\(k=0\\) only the core is
          visible, which is what a framed <em>un</em>twisted arc looks like. Increasing \\(n\\) adds
          extra rotations of the framing — the analogue of changing the push-off direction of a
          framed knot. Since a cylinder is simply connected, distinct framings here differ by an
          integer number of full rotations around the core.</p>
        </div>`,
      torus: `
        <div class="expo-panel" style="margin-bottom:0.75rem;">
          <p>A <strong>torus link</strong> \\(T(k,n)\\) winds \\(k\\) times around the core circle and
          \\(n\\) times through the hole. Orienting every strand in the direction of increasing
          \\(\\theta\\) gives the link an oriented structure. At each apparent crossing in the
          XY-projection, the strand with larger \\(z\\) passes <em>over</em>; the under-strand is drawn
          with a small gap. The sign of each crossing is computed from the oriented tangents via the
          right-hand rule and summed to give the writhe of the projection. When \\(\\gcd(k,n)=1\\) the
          \\(k\\) strands join into a single knot; otherwise \\(T(k,n)\\) is a link of
          \\(\\gcd(k,n)\\) components. The dashed circle in the 2D projection is the core of the
          torus.</p>
        </div>`,
      trefoil: `
        <div class="expo-panel" style="margin-bottom:0.75rem;">
          <p>The <strong>trefoil</strong> is the simplest nontrivial knot. Its standard 3-lobed
          embedding in \\(\\mathbb{R}^3\\) has three crossings, all of the same sign; the projection
          shown below exhibits that writhe explicitly as three over/under crossings. The translucent
          tube carries a framing wound \\(k\\) times around the core with \\(n\\) extra twists —
          turning on the orientation switch draws arrows along the core in the direction of
          increasing parameter. Changing \\(n\\) changes the framing (and hence the self-linking
          number of the framed trefoil); deforming the embedding changes the writhe and twist
          individually, but their sum remains \\(\\mathrm{Lk}(K)\\) by the CWF theorem.</p>
        </div>`
    };
    const note = notes[curveKey] || '';
    container.innerHTML = note + `
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
      if (!hideTube) {
        const surf = curveDef.surface(r, L, 60, 40);
        traces.push(surfaceTrace(surf, { opacity: 0.25 }));
      }
      // Core (axis of cylinder)
      const coreN = 60;
      const coreZ = []; for (let i = 0; i < coreN; i++) coreZ.push(L*i/(coreN-1));
      const corePts = coreZ.map(z => [0, 0, z]);
      traces.push({
        type: 'scatter3d', mode: 'lines',
        x: coreZ.map(()=>0), y: coreZ.map(()=>0), z: coreZ,
        line: { color: '#1a365d', width: 7 }, hoverinfo: 'none', name: 'core'
      });
      if (orientation) addOrientationCones3D(traces, corePts, 4);
      if (k > 0) {
        const strands = curveDef.strands(r, L, k, n, 401);
        strands.forEach((s, i) => traces.push(lineTrace(s, COLORS[i % COLORS.length], 5)));
      }
      // 2D projection (side view, XZ) for cylinder — cleaner than looking down axis
      const proj = 'xz';
      const strandPtsCyl = k > 0 ? curveDef.strands(r, L, k, n, 401).map(s =>
        s.x.map((_,idx) => [s.x[idx], s.y[idx], s.z[idx]])) : [];
      const crossingsCyl = k > 0 ? findCrossingsMulti(strandPtsCyl, proj) : [];
      const wrCyl = crossingsCyl.reduce((a,c)=>a+c.sign,0);
      render2DProjectionMulti(divId2d, strandPtsCyl, crossingsCyl, proj,
        `Side projection — ${crossingsCyl.length} crossings, writhe = ${wrCyl}`,
        { core: corePts, orientation: orientation });
      title += ` (k=${k}, n=${n})`;
    }
    else if (curveKey === 'torus') {
      const R = 3, r = 1;
      if (!hideTube) {
        const surf = curveDef.surface(R, r, 60, 40);
        traces.push(surfaceTrace(surf, { opacity: 0.25 }));
      }
      // Core (central circle of torus)
      const coreN = 200;
      const coreX = [], coreY = [], coreZ = [];
      const corePts = [];
      for (let i = 0; i < coreN; i++) {
        const th = 2*Math.PI*i/(coreN-1);
        const px = R*Math.cos(th), py = R*Math.sin(th);
        coreX.push(px); coreY.push(py); coreZ.push(0);
        corePts.push([px, py, 0]);
      }
      traces.push({
        type: 'scatter3d', mode: 'lines',
        x: coreX, y: coreY, z: coreZ,
        line: { color: '#1a365d', width: 7 }, hoverinfo: 'none', name: 'core'
      });
      if (orientation) addOrientationCones3D(traces, corePts, 6);
      if (k > 0) {
        const strands = curveDef.strands(R, r, k, n, 501);
        strands.forEach((s, i) => traces.push(lineTrace(s, COLORS[i % COLORS.length], 5)));
        // 2D projection (XY) with over/under crossings — detect between strands
        const strandPts = strands.map(s => s.x.map((_, idx) => [s.x[idx], s.y[idx], s.z[idx]]));
        const crossings = findCrossingsMulti(strandPts, 'xy');
        const writhe = crossings.reduce((a, c) => a + c.sign, 0);
        render2DProjectionMulti(divId2d, strandPts, crossings, 'xy',
          `XY Projection — ${crossings.length} crossings, writhe = ${writhe}`,
          { core: corePts, orientation: orientation });
      } else {
        // Just core + orientation
        render2DProjectionMulti(divId2d, [], [], 'xy',
          'XY Projection — core only',
          { core: corePts, orientation: orientation });
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
      if (k > 0) {
        const strands = tubeStrands(mirPts, frame, tubeR, k, n, true);
        strands.forEach((s, i) => traces.push(lineTrace(s, COLORS[i % COLORS.length], 4)));
      }
      // Core curve
      traces.push({
        type: 'scatter3d', mode: 'lines',
        x: mirPts.map(p => p[0]), y: mirPts.map(p => p[1]), z: mirPts.map(p => p[2]),
        line: { color: '#1a365d', width: 7 },
        hoverinfo: 'none'
      });
      if (orientation) addOrientationCones3D(traces, mirPts, 8);

      title += ` (k=${k}, n=${n})`;

      // 2D projection with crossings + core overlay
      const crossings = findCrossings(mirPts, 'xy');
      const writhe = crossings.reduce((s, c) => s + c.sign, 0);
      render2DProjection(divId2d, mirPts, crossings, 'xy',
        `XY Projection — writhe = ${writhe}, crossings = ${crossings.length}`,
        { color: '#1a365d', orientation: orientation });
    }

    Plotly.newPlot(divId, traces, build3DLayout(title), { responsive: true });
  }

  // ── 2D projection plot: shows over/under, not just signs ──
  // Draws the projected curve, then "breaks" the under-strand at each crossing
  // with a white mask segment and redraws a short over-strand segment on top.
  function render2DProjection(divId, pts, crossings, proj, title, opts) {
    opts = opts || {};
    const ax = proj === 'yz' ? [1,2] : proj === 'xz' ? [0,2] : [0,1];
    const x = pts.map(p => p[ax[0]]), y = pts.map(p => p[ax[1]]);
    const traces = [{
      type: 'scatter', mode: 'lines',
      x, y,
      line: { color: opts.color || '#2171b5', width: 3 },
      hoverinfo: 'none', showlegend: false
    }];

    // Over/under rendering
    const gap = opts.gap || 0.35; // half-length of the mask on the under strand
    const overLen = opts.overLen || 0.55;
    (crossings || []).forEach(c => {
      const uD = c.underD, oD = c.overD;
      if (!uD || !oD) return;
      const uLen = Math.hypot(uD[ax[0]], uD[ax[1]]) || 1;
      const oLen = Math.hypot(oD[ax[0]], oD[ax[1]]) || 1;
      const ux = uD[ax[0]]/uLen, uy = uD[ax[1]]/uLen;
      const ox = oD[ax[0]]/oLen, oy = oD[ax[1]]/oLen;
      // Mask on under-strand (white gap)
      traces.push({
        type: 'scatter', mode: 'lines',
        x: [c.x - gap*ux, c.x + gap*ux],
        y: [c.y - gap*uy, c.y + gap*uy],
        line: { color: '#fff', width: 8 },
        hoverinfo: 'none', showlegend: false
      });
      // Redraw over-strand short segment
      traces.push({
        type: 'scatter', mode: 'lines',
        x: [c.x - overLen*ox, c.x + overLen*ox],
        y: [c.y - overLen*oy, c.y + overLen*oy],
        line: { color: opts.color || '#2171b5', width: 3 },
        hoverinfo: 'none', showlegend: false
      });
    });

    // Orientation arrows along the curve
    if (opts.orientation) {
      const arrX = [], arrY = [], arrU = [], arrV = [];
      const step = Math.max(10, Math.floor(pts.length / 8));
      for (let i = 0; i < pts.length - 1; i += step) {
        arrX.push(pts[i][ax[0]]); arrY.push(pts[i][ax[1]]);
        arrU.push(pts[i+1][ax[0]] - pts[i][ax[0]]);
        arrV.push(pts[i+1][ax[1]] - pts[i][ax[1]]);
      }
      // Represent arrows as annotation-free markers with direction triangles
      traces.push({
        type: 'scatter', mode: 'markers',
        x: arrX, y: arrY,
        marker: { symbol: 'triangle-up', size: 12, color: opts.color || '#2171b5',
                  line: { width: 1, color: '#000' } },
        hoverinfo: 'none', showlegend: false
      });
    }

    // Small +/- indicators near each crossing (offset, not on the crossing itself)
    const signAnnots = (crossings || []).map(c => ({
      x: c.x, y: c.y, text: c.sign > 0 ? '+' : '−', showarrow: false,
      xshift: 14, yshift: 14,
      font: { size: 12, color: c.sign > 0 ? '#2ecc71' : '#e74c3c' }
    }));

    Plotly.newPlot(divId, traces, {
      title: { text: title, font: { size: 13 } },
      xaxis: { scaleanchor: 'y', scaleratio: 1 },
      yaxis: {},
      paper_bgcolor: '#f5f5f5', plot_bgcolor: '#fff',
      showlegend: false, margin: { l: 40, r: 20, t: 40, b: 40 },
      annotations: signAnnots
    }, { responsive: true });
  }

  // ── Reidemeister comparison plot ──
  function renderReidemeisterTab(container, moveType, params) {
    const divBefore = container.id + '-before';
    const divAfter = container.id + '-after';
    const divAnim = container.id + '-anim';

    const notes = {
      writhe: `<div class="expo-panel" style="margin-bottom:0.75rem;">
        <h3>Writhe Explorer</h3>
        <p>This demo compares a smooth round unknot (writhe = 0) with the same unknot deformed to
        contain a single curl (writhe = ±1). It is <em>not</em> an instance of Reidemeister I in the
        strict sense — the curves here are <strong>closed</strong> and we are illustrating how writhe
        of a closed embedded curve changes as the curve is deformed through a self-crossing.</p>
        <p>For the actual Reidemeister I move (on open strands / knot diagrams), see the
        <em>Reidemeister I</em> sub-tab.</p>
        </div>`,
      r1: `<div class="expo-panel" style="margin-bottom:0.75rem;">
        <h3>Reidemeister I</h3>
        <p>The <strong>R1 move</strong> adds or removes a single curl on an open strand of a knot
        diagram. A curl contributes \\(\\pm 1\\) to the writhe of the projection and \\(\\pm 1\\) to
        the self-linking of any framed knot containing it, so R1 is <em>not</em> an equivalence for
        framed knots or for the Kauffman bracket.</p>
        </div>`,
      r2: `<div class="expo-panel" style="margin-bottom:0.75rem;">
        <h3>Reidemeister II</h3>
        <p>The <strong>R2 move</strong> creates or destroys a pair of crossings of opposite sign
        between two otherwise-parallel strands. The net contribution to writhe is zero, so R2 is an
        equivalence of framed knots.</p>
        </div>`,
      r3: `<div class="expo-panel" style="margin-bottom:0.75rem;">
        <h3>Reidemeister III</h3>
        <p>The <strong>R3 move</strong> slides one strand past the crossing of two others. No
        crossings are created or destroyed and every crossing keeps its sign; writhe and framing are
        preserved.</p>
        </div>`
    };

    container.innerHTML = (notes[moveType] || '') + `
      <div style="display:flex;gap:1rem;flex-wrap:wrap;">
        <div id="${divBefore}" style="flex:1;min-width:450px;height:500px;"></div>
        <div id="${divAfter}" style="flex:1;min-width:450px;height:500px;"></div>
      </div>
      <div id="${divAnim}" style="margin-top:1rem;height:420px;"></div>
    `;
    if (typeof renderMathInElement === 'function') renderMathInElement(container);

    function plotStrands(divId, strandPts, title) {
      const traces = [];
      strandPts.forEach((strand, i) => {
        traces.push({
          type: 'scatter3d', mode: 'lines',
          x: strand.map(p => p[0]), y: strand.map(p => p[1]), z: strand.map(p => p[2]),
          line: { color: COLORS[i], width: 5 },
          hoverinfo: 'none'
        });
        // Orientation arrows at t \u2248 0.3 and t \u2248 0.7 along each strand
        if (params.orientation && strand.length > 4) {
          const fracs = [0.3, 0.7];
          const xs = [], ys = [], zs = [], us = [], vs = [], ws = [];
          fracs.forEach(fr => {
            const idx = Math.min(strand.length - 2, Math.max(1, Math.floor(fr * (strand.length - 1))));
            const p0 = strand[idx], p1 = strand[idx + 1];
            xs.push(p0[0]); ys.push(p0[1]); zs.push(p0[2]);
            us.push(p1[0] - p0[0]); vs.push(p1[1] - p0[1]); ws.push(p1[2] - p0[2]);
          });
          traces.push({
            type: 'cone', x: xs, y: ys, z: zs, u: us, v: vs, w: ws,
            sizemode: 'absolute', sizeref: 0.05, anchor: 'tail',
            colorscale: [[0, COLORS[i]], [1, COLORS[i]]], showscale: false,
            hoverinfo: 'none'
          });
        }
      });
      Plotly.newPlot(divId, traces, build3DLayout(title), { responsive: true });
    }

    if (moveType === 'writhe') {
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
        line:{color:'#1a365d',width:7}, hoverinfo:'none'});
      traces2.push({ type:'scatter3d', mode:'lines',
        x:kinked.pts.map(p=>p[0]), y:kinked.pts.map(p=>p[1]), z:kinked.pts.map(p=>p[2]),
        line:{color:'#1a365d',width:7}, hoverinfo:'none'});
      if (params.orientation) {
        addOrientationCones3D(traces1, smooth.pts, 8);
        addOrientationCones3D(traces2, kinked.pts, 8);
      }
      if (params.k > 0) {
        tubeStrands(smooth.pts, frame1, 0.3, params.k, params.n, true)
          .forEach((s,i) => traces1.push(lineTrace(s, COLORS[i%COLORS.length], 4)));
        tubeStrands(kinked.pts, frame2, 0.3, params.k, params.n, true)
          .forEach((s,i) => traces2.push(lineTrace(s, COLORS[i%COLORS.length], 4)));
      }
      Plotly.newPlot(divBefore, traces1, build3DLayout('Smooth unknot — writhe = 0'), {responsive:true});
      Plotly.newPlot(divAfter, traces2, build3DLayout('Kinked unknot — writhe = ±1'), {responsive:true});
      // No animation for writhe explorer
      const animEl = document.getElementById(divAnim);
      if (animEl) animEl.style.display = 'none';
    }
    else if (moveType === 'r1') {
      plotStrands(divBefore, r1StrandsOpen(401, 0), 'Before R1 — straight strand');
      plotStrands(divAfter, r1StrandsOpen(401, 1), 'After R1 — one curl, Δw = ±1');
      renderReidemeisterAnimation(divAnim, 'r1');
    }
    else if (moveType === 'r2') {
      plotStrands(divBefore, r2Strands(401, 0), 'Before R2 — no crossings');
      plotStrands(divAfter, r2Strands(401, 1), 'After R2 — opposite-sign crossings, Δw = 0');
      renderReidemeisterAnimation(divAnim, 'r2');
    }
    else if (moveType === 'r3') {
      plotStrands(divBefore, r3Strands(401, 0), 'Before R3');
      plotStrands(divAfter, r3Strands(401, 1), 'After R3 — same writhe');
      renderReidemeisterAnimation(divAnim, 'r3');
    }
  }

  // ── Main render function ──
  window.renderFramedKnots = function(containerEl) {
    // State
    let state = { k: 0, n: 0, mode: 'discrete', hideTube: false, mirror: false,
                  orientation: true, subTab: 'cylinder' };

    const SUB_TABS = [
      { id: 'cylinder', label: 'Cylinder' },
      { id: 'torus', label: 'Torus' },
      { id: 'trefoil', label: 'Trefoil' },
      { id: 'writhe', label: 'Writhe Explorer' },
    ];

    function render() {
      const controlsHtml = `
        <div id="fk-rmoves-host"></div>
        <div class="expo-panel expo-2col" style="margin-bottom:1rem;">
          <h3>Orientation, Framing and Crossings</h3>
          <p>Every strand below carries an <strong>orientation</strong>: a consistent direction of travel
          along the curve. Turn on the <em>Orientation</em> switch in the sidebar to draw arrows on the
          3D core and on the 2D projection so this direction is visible. Reversing the orientation of
          any strand flips the sign of every crossing it participates in.</p>
          <p>A <span class="kl-term" title="Framing: a continuous unit normal field n along K; equivalently a trivialisation of the normal bundle or a thin ribbon with core K. The set of framings is a \u2124-torsor under adding full twists.">framing</span> is an extra piece of data on top of the oriented curve: a unit
          normal vector field \\(\\mathbf{n}\\) perpendicular to the tangent at each point, equivalently
          the edge of a thin <span class="kl-term" title="Ribbon: an embedded annulus S\u00b9\u00d7[0,1] \u21aa \u211d\u00b3 (or S\u00b3) whose core circle is K. Framed knots are in bijection with isotopy classes of such ribbons.">ribbon</span> whose centerline is the knot. We visualise it below as coloured
          strands wound \\(k\\) times around a translucent tube with \\(n\\) extra full twists. Setting
          \\(k=0\\) leaves just the core curve. The framing selects which transverse direction the
          push-off \\(K'=K+\\varepsilon\\mathbf{n}\\) points; this is exactly the framing used in the
          C&#259;lug&#259;reanu&ndash;White&ndash;Fuller decomposition
          \\(\\mathrm{Lk}(K)=\\mathrm{Wr}(K)+\\mathrm{Tw}(K,\\mathbf{n})\\) from the previous sub-tab.</p>
          <p>The 2D projections under each example show <strong>over/under crossings</strong>: at each
          apparent intersection, the strand with larger \\(z\\) is drawn as a continuous segment on top,
          while the under-strand is broken by a small gap. The sign of each crossing is computed from
          the oriented tangents via the right-hand rule; the sum of signs is the writhe of the
          projection.</p>
        </div>
        <div class="fk-controls">
          <div class="fk-subtabs">
            ${SUB_TABS.map(t => `<button class="fk-subtab ${state.subTab===t.id?'active':''}" data-tab="${t.id}">${t.label}</button>`).join('')}
          </div>
          <div class="fk-sidebar">
            <label>Strands k:
              <input type="number" min="0" max="12" step="1" value="${state.k}" id="fk-k" style="width:4rem;">
            </label>
            <label>Twists n:
              <input type="number" min="-6" max="6" step="1" value="${state.n}" id="fk-n" style="width:4rem;">
            </label>
            <label><input type="checkbox" id="fk-hidetube" ${state.hideTube?'checked':''}> Hide tube</label>
            <label><input type="checkbox" id="fk-orient" ${state.orientation?'checked':''}> Orientation</label>
            <label><input type="checkbox" id="fk-mirror" ${state.mirror?'checked':''}> Mirror (z → −z)</label>
          </div>
        </div>
        <div id="fk-content" class="fk-content"></div>
      `;

      containerEl.innerHTML = controlsHtml;
      if (typeof renderMathInElement === 'function') renderMathInElement(containerEl);

      // Wire controls
      containerEl.querySelectorAll('.fk-subtab').forEach(btn => {
        btn.addEventListener('click', () => { state.subTab = btn.dataset.tab; render(); });
      });
      document.getElementById('fk-k').addEventListener('change', e => {
        state.k = Math.max(0, Math.min(12, Math.round(+e.target.value || 0))); render();
      });
      document.getElementById('fk-n').addEventListener('change', e => {
        state.n = Math.max(-6, Math.min(6, Math.round(+e.target.value || 0))); render();
      });
      document.getElementById('fk-hidetube').addEventListener('change', e => {
        state.hideTube = e.target.checked; render();
      });
      document.getElementById('fk-orient').addEventListener('change', e => {
        state.orientation = e.target.checked; render();
      });
      document.getElementById('fk-mirror').addEventListener('change', e => {
        state.mirror = e.target.checked; render();
      });

      // Render content
      const content = document.getElementById('fk-content');

      // Build the collected R-moves section at the very top
      const rHost = document.getElementById('fk-rmoves-host');
      if (rHost) renderReidemeisterMovesSection(rHost);

      if (state.subTab === 'writhe') {
        renderReidemeisterTab(content, state.subTab, state);
      } else {
        renderCurveTab(content, state.subTab, state);
      }
      // Always append the isotopy hierarchy below the main content
      var isoDiv = document.createElement('div');
      isoDiv.style.marginTop = '2rem';
      renderIsotopyTab(isoDiv);
      content.appendChild(isoDiv);
      if (typeof renderMathInElement === 'function') renderMathInElement(isoDiv);
    }

    render();
  };

  // ── Collected Reidemeister moves section (placed at top of the tab) ──
  // Uses a module-level cache so state (active sub-tab) survives re-renders.
  var _rmvState = { subTab: 'r1' };
  function renderReidemeisterMovesSection(container) {
    const id = 'fk-rmv';
    const active = _rmvState.subTab;
    const tabs = [
      { id: 'r1', label: 'Reidemeister I' },
      { id: 'r2', label: 'Reidemeister II' },
      { id: 'r3', label: 'Reidemeister III' }
    ];
    container.innerHTML = `
      <div class="expo-panel expo-2col" style="margin-bottom:1rem;">
        <h3>Reidemeister Moves in 2D &mdash; Planar Diagrams</h3>
        <p>A <strong>knot diagram</strong> is a generic projection of a knot to a plane, with an
        over/under annotation at each transverse self-intersection. Two knots in \\(\\mathbb{R}^3\\)
        are ambient-isotopic iff their diagrams are related by planar isotopy plus a finite sequence
        of three local rewrites &mdash; the <strong>Reidemeister moves</strong>. Each move redraws a small
        disk of the diagram while everything outside is held fixed, so the moves capture exactly the
        combinatorial difference between isotopic embeddings.</p>
        <p><strong>R1</strong> inserts or removes a single curl on a strand, changing the writhe of
        the projection by \\(\\pm 1\\). <strong>R2</strong> pushes two parallel strands together to
        create a pair of opposite-sign crossings, or pulls such a pair apart &mdash; net writhe
        \\(0\\). <strong>R3</strong> slides one strand past the crossing of two others, preserving
        every crossing sign. R2 and R3 together generate <em>regular isotopy</em>, which preserves
        both writhe and framing; the full group including R1 is ambient isotopy.</p>
      </div>

      <div class="expo-panel" style="margin-bottom:1rem;">
        <h3>Reidemeister Moves in 3D &mdash; Framed Ribbons</h3>
        <p>In three dimensions the three moves act on embedded <strong>ribbons</strong> rather than
        diagrams. A framed knot is a knot together with a unit normal field \\(\\mathbf{n}\\)
        &mdash; equivalently a thin ribbon whose core is \\(K\\) and whose edge is the push-off
        \\(K'=K+\\varepsilon\\mathbf{n}\\). R2 and R3 lift to ambient isotopies of the ribbon and so
        preserve self-linking; R1 does <em>not</em>, because a curl forces the ribbon to make an
        extra full twist as it contracts through the crossing, changing
        \\(\\mathrm{Lk}(K,K')\\) by \\(\\pm 1\\). The animations below play each move as a smooth
        deformation of the 3D strand, pause at the simplified configuration, and then reverse.</p>
        <div class="fk-subtabs" style="margin-top:0.75rem;">
          ${tabs.map(t => `<button class="fk-subtab fk-rmv-tab ${active===t.id?'active':''}" data-rmv="${t.id}">${t.label}</button>`).join('')}
        </div>
        <div id="${id}-body" style="margin-top:0.75rem;"></div>
      </div>
    `;
    if (typeof renderMathInElement === 'function') renderMathInElement(container);

    container.querySelectorAll('.fk-rmv-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _rmvState.subTab = btn.dataset.rmv;
        renderReidemeisterMovesSection(container);
      });
    });

    const body = document.getElementById(id+'-body');
    renderRMoveBody(body, active, id);
  }

  function renderRMoveBody(body, which, id) {
    function plotStatic(divId, strands, title) {
      const traces = strands.map((s, i) => ({
        type: 'scatter3d', mode: 'lines',
        x: s.map(p=>p[0]), y: s.map(p=>p[1]), z: s.map(p=>p[2]),
        line: { color: COLORS[i], width: 5 }, hoverinfo: 'none'
      }));
      Plotly.newPlot(divId, traces, build3DLayout(title), { responsive: true });
    }

    if (which === 'r1') {
      body.innerHTML = `
        <p style="margin:0 0 0.6rem 0;">The two diagrams below compare a twisted strand (a curl of
        sign \\(+1\\)) with its untwisted version. Both loops point in the same direction; the sign
        of the crossing is encoded purely in which arc passes over the other (i.e. the \\(z\\)
        order). The animation runs a scripted sequence on a single strand: start twisted
        (\\(+\\)), untwist, retwist (\\(+\\)), untwist again, then twist the other way to a
        \\(-\\) crossing — keeping the loop vertex pointing the same direction throughout — and
        finally plays the whole thing in reverse. Pressing Play advances the timeline; the move
        never starts automatically.</p>
        <div class="fk-rmv-pair" style="margin-bottom:0.5rem;">
          <div id="${id}-r1-before" style="height:260px;"></div>
          <div id="${id}-r1-after" style="height:260px;"></div>
        </div>
        <div id="${id}-r1seq-anim" style="height:380px;"></div>
      `;
      if (typeof renderMathInElement === 'function') renderMathInElement(body);
      plotStatic(id+'-r1-before', r1StrandsOpen(401, 1, +1), 'Twisted (+ crossing)');
      plotStatic(id+'-r1-after',  r1StrandsOpen(401, 0, +1), 'Untwisted');
      renderReidemeisterAnimation(id+'-r1seq-anim', 'r1seq');
    } else if (which === 'r2') {
      body.innerHTML = `
        <p style="margin:0 0 0.6rem 0;">Two parallel strands start crossed (one pair of
        opposite-sign crossings) and the R2 move pulls them apart to produce a crossing-free pair,
        pauses, then pushes them back together. Net writhe change is zero so framing is preserved
        &mdash; R2 is an equivalence for framed knots.</p>
        <div class="fk-rmv-pair" style="margin-bottom:0.5rem;">
          <div id="${id}-r2-before" style="height:260px;"></div>
          <div id="${id}-r2-after" style="height:260px;"></div>
        </div>
        <div id="${id}-r2-anim" style="height:360px;"></div>
      `;
      plotStatic(id+'-r2-before', r2Strands(401, 1), 'Before — opposite-sign pair');
      plotStatic(id+'-r2-after',  r2Strands(401, 0), 'After — no crossings');
      renderReidemeisterAnimation(id+'-r2-anim', 'r2');
    } else {
      body.innerHTML = `
        <p style="margin:0 0 0.6rem 0;">A strand slides across the crossing of two others. Every
        crossing sign is preserved, so writhe and framing are unchanged. The animation performs the
        slide, pauses, then reverses it.</p>
        <div class="fk-rmv-pair" style="margin-bottom:0.5rem;">
          <div id="${id}-r3-before" style="height:260px;"></div>
          <div id="${id}-r3-after" style="height:260px;"></div>
        </div>
        <div id="${id}-r3-anim" style="height:360px;"></div>
      `;
      plotStatic(id+'-r3-before', r3Strands(401, 0), 'Before');
      plotStatic(id+'-r3-after',  r3Strands(401, 1), 'After — same crossing signs');
      renderReidemeisterAnimation(id+'-r3-anim', 'r3');
    }
  }

  // Legacy container-consumer retained (unused after refactor)
  function __renderReidemeisterMovesOld(container) {
    const id = 'fk-rmv-' + Math.random().toString(36).slice(2,8);
    container.innerHTML = `
      <div class="expo-panel expo-2col" style="margin-bottom:1rem;">
        <h3>Reidemeister Moves in 2D</h3>
        <p>Two knot diagrams represent ambient-isotopic knots in \\(\\mathbb{R}^3\\) iff they are
        related by a finite sequence of planar isotopies and three local moves on the diagram,
        the <strong>Reidemeister moves</strong> R1, R2, R3. Each move is a rewrite rule on a small
        disk of the diagram leaving everything outside the disk untouched.</p>
        <p><strong>R1</strong> adds or removes a single curl on a strand, changing the writhe of
        the projection by \\(\\pm 1\\). <strong>R2</strong> creates or destroys an adjacent pair of
        opposite-sign crossings between two strands; net writhe change is \\(0\\).
        <strong>R3</strong> slides one strand across the crossing of two others, preserving all
        crossing signs.</p>
        <p>For framed knots (equivalently for the Kauffman bracket / Jones polynomial) R1 is
        forbidden, because it changes self-linking by \\(\\pm 1\\); R2 and R3 generate
        <em>regular isotopy</em>, which preserves both writhe and framing.</p>
      </div>

      <div class="expo-panel" style="margin-bottom:1rem;">
        <h3>Reidemeister I &mdash; un-kinking a curl</h3>
        <p style="margin-top:0;">The R1 move has two variants distinguished by which side of the
        strand the curl lies on (and, independently, by the sign of the crossing). Below we show
        the loop-above and loop-below variants. In each animation the kinked strand is
        <em>un-kinked</em> to the straight strand, paused, then returned. The writhe of the
        diagram changes by \\(\\pm 1\\) at the moment the loop contracts through the crossing;
        that single unit is exactly the R1 anomaly of the Kauffman bracket and the reason framed
        knot invariants cannot allow R1.</p>
        <div class="fk-rmv-row">
          <div class="fk-rmv-cell">
            <div class="fk-rmv-pair">
              <div id="${id}-r1a-before"></div>
              <div id="${id}-r1a-after"></div>
            </div>
            <div id="${id}-r1a-anim" class="fk-rmv-anim"></div>
            <div class="fk-rmv-caption">Variant A — loop above (Δw = +1 when kinking)</div>
          </div>
          <div class="fk-rmv-cell">
            <div class="fk-rmv-pair">
              <div id="${id}-r1b-before"></div>
              <div id="${id}-r1b-after"></div>
            </div>
            <div id="${id}-r1b-anim" class="fk-rmv-anim"></div>
            <div class="fk-rmv-caption">Variant B — loop below (Δw = −1 when kinking)</div>
          </div>
        </div>
      </div>

      <div class="expo-panel" style="margin-bottom:1rem;">
        <h3>Reidemeister II</h3>
        <p style="margin-top:0;">Two parallel strands are pushed together to create a pair of
        opposite-sign crossings, then pulled apart again. The net writhe is zero so framing is
        preserved.</p>
        <div class="fk-rmv-cell">
          <div class="fk-rmv-pair">
            <div id="${id}-r2-before"></div>
            <div id="${id}-r2-after"></div>
          </div>
          <div id="${id}-r2-anim" class="fk-rmv-anim"></div>
        </div>
      </div>

      <div class="expo-panel" style="margin-bottom:1rem;">
        <h3>Reidemeister III</h3>
        <p style="margin-top:0;">A strand slides across the crossing of two others. Every
        crossing sign is preserved, so writhe and framing are unchanged.</p>
        <div class="fk-rmv-cell">
          <div class="fk-rmv-pair">
            <div id="${id}-r3-before"></div>
            <div id="${id}-r3-after"></div>
          </div>
          <div id="${id}-r3-anim" class="fk-rmv-anim"></div>
        </div>
      </div>
    `;
    if (typeof renderMathInElement === 'function') renderMathInElement(container);

    function plotStatic(divId, strands, title) {
      const traces = strands.map((s, i) => ({
        type: 'scatter3d', mode: 'lines',
        x: s.map(p=>p[0]), y: s.map(p=>p[1]), z: s.map(p=>p[2]),
        line: { color: COLORS[i], width: 5 }, hoverinfo: 'none'
      }));
      Plotly.newPlot(divId, traces, build3DLayout(title), { responsive: true });
    }

    // R1 variant A (loop above): before = kinked, after = straight
    plotStatic(id+'-r1a-before', r1StrandsOpen(401, 1, +1), 'Before — kinked');
    plotStatic(id+'-r1a-after',  r1StrandsOpen(401, 0, +1), 'After — straight');
    renderReidemeisterAnimation(id+'-r1a-anim', 'r1', { side: +1 });
    // R1 variant B (loop below)
    plotStatic(id+'-r1b-before', r1StrandsOpen(401, 1, -1), 'Before — kinked');
    plotStatic(id+'-r1b-after',  r1StrandsOpen(401, 0, -1), 'After — straight');
    renderReidemeisterAnimation(id+'-r1b-anim', 'r1', { side: -1 });
    // R2 & R3
    plotStatic(id+'-r2-before', r2Strands(401, 0), 'Before — no crossings');
    plotStatic(id+'-r2-after',  r2Strands(401, 1), 'After — opposite-sign pair');
    renderReidemeisterAnimation(id+'-r2-anim', 'r2');
    plotStatic(id+'-r3-before', r3Strands(401, 0), 'Before');
    plotStatic(id+'-r3-after',  r3Strands(401, 1), 'After — same crossing signs');
    renderReidemeisterAnimation(id+'-r3-anim', 'r3');
  }

  function renderIsotopyTab(container) {
    container.innerHTML = `
      <div class="expo-panel expo-2col">
        <h3>What is a Framed Knot, Really?</h3>
        <p>A <strong>knot</strong> is an embedded circle \\(K \\subset \\mathbb{R}^3\\) (or \\(S^3\\)).
        A <strong>framed knot</strong> is a knot together with a continuous, nowhere-zero normal
        vector field \\(\\mathbf{n}(s)\\) along \\(K\\). Equivalently, a framed knot is a thin
        <em>ribbon</em> \\(R \\subset \\mathbb{R}^3\\) whose core is \\(K\\) and whose two edges are
        \\(K\\) and its push-off \\(K' = K + \\varepsilon\\mathbf{n}\\). A framed knot diagram is a
        knot diagram together with an integer <em>framing number</em> at each component, often drawn
        as a <span class="kl-term" title="Blackboard framing: the framing whose normal lies in the plane of the diagram. Its self-linking equals the diagram writhe w(D); every R1 move shifts it by \u00b11.">&ldquo;blackboard framing&rdquo;</span>: take the normal \\(\\mathbf{n}\\) to be the constant outward
        direction orthogonal to the plane of the page, then count extra full twists.</p>
        <p>Two framings \\(\\mathbf{n}_1, \\mathbf{n}_2\\) on the same knot differ by an integer
        number of full turns around the tangent — so the set of framings on a fixed \\(K\\) is an
        \\(\\mathbb{Z}\\)-torsor, with the change-of-framing given by the integer
        \\(\\mathrm{Tw}(K,\\mathbf{n}_2) - \\mathrm{Tw}(K,\\mathbf{n}_1)\\). The distinguished <span class="kl-term" title="Seifert framing (\u2261 0-framing, canonical framing): the unique framing with self-linking zero, equivalently the one whose push-off bounds a Seifert surface disjoint from K.">Seifert framing</span>
        is the one with self-linking zero: it is the unique framing for which the
        push-off \\(K'\\) bounds a Seifert surface disjoint from \\(K\\).</p>
        <p>Framings show up wherever one needs a &ldquo;thickening&rdquo; of a 1-dimensional object:
        <span class="kl-term" title="Dehn surgery: remove a tubular neighbourhood of a framed link L \u2282 S\u00b3 and glue solid tori back in according to the framings; by Lickorish\u2013Wallace every closed oriented 3-manifold arises this way.">Dehn surgery</span> on a framed link presents every closed oriented 3-manifold,
        with the framing specifying how a solid torus is glued back in;
        <strong>Chern&ndash;Simons / quantum invariants</strong> such as the Kauffman bracket or
        Jones polynomial naturally live on framed links, and the R1-anomaly they exhibit is exactly
        the framing dependence; and <strong>Vassiliev / finite-type invariants</strong> of framed
        knots form a graded algebra related by the Kontsevich integral to the algebra of chord
        diagrams with directed chords. A knot invariant is equivalent to a framed-knot invariant that
        is insensitive to the framing — exactly what the writhe correction does for the Kauffman
        bracket.</p>
        <p>Under the CWF decomposition of the previous sub-tab, a framing on \\(K\\) splits the
        integer \\(\\mathrm{Lk}(K)\\) as \\(\\mathrm{Wr}(K) + \\mathrm{Tw}(K,\\mathbf{n})\\): the writhe
        is geometric (depends on the embedding of \\(K\\) in space) and the twist is framing-dependent
        (depends on \\(\\mathbf{n}\\) along \\(K\\)). The Reidemeister moves below are exactly the
        combinatorial translations of how writhe and twist can be traded without changing \\(K\\).</p>
      </div>
      <div class="expo-panel">
        <h3>Hierarchy of Equivalences</h3>
        <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;margin:1rem 0;flex-wrap:wrap;">
          <div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:0.85rem 1.1rem;text-align:center;min-width:130px;box-shadow:0 1px 4px rgba(0,0,0,0.06);"><strong>Ambient Isotopy</strong><br><small style="color:#666;">R1 + R2 + R3<br>Forgets writhe</small></div>
          <span style="font-size:1.4rem;color:#2171b5;">⊃</span>
          <div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:0.85rem 1.1rem;text-align:center;min-width:130px;box-shadow:0 1px 4px rgba(0,0,0,0.06);"><strong>Regular Isotopy</strong><br><small style="color:#666;">R2 + R3 only<br>Preserves writhe = framing</small></div>
          <span style="font-size:1.4rem;color:#2171b5;">⊃</span>
          <div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:0.85rem 1.1rem;text-align:center;min-width:130px;box-shadow:0 1px 4px rgba(0,0,0,0.06);"><strong>Framed Isotopy</strong><br><small style="color:#666;">Oriented + framed<br>Full ribbon structure</small></div>
        </div>
        <h3>Applications</h3>
        <p>Framed links present 3-manifolds via <span class="kl-term" title="Surgery: cut out a tubular neighbourhood and glue it back differently. In dimension 3, integer Dehn surgery on framed links presents every closed oriented 3-manifold.">surgery</span>. The surgery coefficient \\(p/q\\)
        is determined by the framing. <span class="kl-term" title="Kirby calculus (Kirby 1978): two framed links in S\u00b3 give diffeomorphic closed oriented 3-manifolds iff they are related by a finite sequence of Kirby moves (handle slides and \u00b11-stabilisations).">Kirby calculus</span> (Kirby, 1978) states that two framed links give diffeomorphic
        3-manifolds iff they are related by Kirby moves: <span class="kl-term" title="Handle slide: replace a component K\u1d62 by K\u1d62 + K\u2c7c (band-summed along a chosen band), leaving the diffeomorphism type of the surgered 3-manifold unchanged.">handle slides</span> and \\(\\pm 1\\)-stabilisation.</p>
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
