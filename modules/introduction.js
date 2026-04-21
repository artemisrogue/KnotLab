/**
 * introduction.js — Introduction to Knot Theory module for KnotLab
 * Exposes window.renderIntroduction(containerEl)
 */
(function () {
  'use strict';

  /* ── Parametric knot coordinate generators ── */
  const KNOT_COORDS = {
    '0_1': function (n) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = (2 * Math.PI * i) / n;
        pts.push({ x: 2 * Math.cos(t), y: 2 * Math.sin(t), z: 0 });
      }
      return [pts];
    },
    '3_1': function (n) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = (2 * Math.PI * i) / n;
        const r = 2 + Math.cos(3 * t);
        pts.push({ x: r * Math.cos(2 * t), y: r * Math.sin(2 * t), z: Math.sin(3 * t) });
      }
      return [pts];
    },
    '4_1': function (n) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = (2 * Math.PI * i) / n;
        const r = 2 + Math.cos(2 * t);
        pts.push({ x: r * Math.cos(3 * t), y: r * Math.sin(3 * t), z: Math.sin(4 * t) });
      }
      return [pts];
    },
    '5_1': function (n) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = (2 * Math.PI * i) / n;
        const r = 2 + Math.cos(5 * t);
        pts.push({ x: r * Math.cos(2 * t), y: r * Math.sin(2 * t), z: Math.sin(5 * t) });
      }
      return [pts];
    },
    '5_2': function (n) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = (2 * Math.PI * i) / n;
        const r = 2 + 0.8 * Math.cos(3 * t);
        pts.push({ x: r * Math.cos(5 * t), y: r * Math.sin(5 * t), z: 0.8 * Math.sin(3 * t) });
      }
      return [pts];
    },
    '7_1': function (n) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = (2 * Math.PI * i) / n;
        const r = 2 + Math.cos(7 * t);
        pts.push({ x: r * Math.cos(2 * t), y: r * Math.sin(2 * t), z: Math.sin(7 * t) });
      }
      return [pts];
    },
    'L2a1': function (n) {
      const c1 = [], c2 = [];
      for (let i = 0; i < n; i++) {
        const t = (2 * Math.PI * i) / n;
        c1.push({ x: Math.cos(t), y: Math.sin(t), z: 0 });
        c2.push({ x: 1 + Math.cos(t), y: 0, z: Math.sin(t) });
      }
      return [c1, c2];
    }
  };

  /* ── Braid word to 3D coordinates ── */
  function braidTo3D(braidWord, numStrands) {
    const perm = [];
    for (let i = 0; i < numStrands; i++) perm.push(i);
    const strandPoints = [];
    for (let i = 0; i < numStrands; i++) strandPoints.push([{ x: i, y: 0, z: 0 }]);

    const yStep = 2;
    let y = 0;

    for (const gen of braidWord) {
      const idx = Math.abs(gen) - 1;
      const sign = gen > 0 ? 1 : -1;
      y += yStep;
      const sA = perm[idx], sB = perm[idx + 1];
      const over = sign > 0 ? sA : sB;
      const under = sign > 0 ? sB : sA;
      const midY = y - yStep / 2;
      const midX = idx + 0.5;
      strandPoints[over].push({ x: midX, y: midY, z: 0.5 });
      strandPoints[under].push({ x: midX, y: midY, z: -0.5 });
      for (let i = 0; i < numStrands; i++) {
        if (i === idx || i === idx + 1) continue;
        strandPoints[perm[i]].push({ x: i, y: y, z: 0 });
      }
      strandPoints[over].push({ x: idx + 1, y: y, z: 0 });
      strandPoints[under].push({ x: idx, y: y, z: 0 });
      perm[idx] = sB;
      perm[idx + 1] = sA;
    }

    y += yStep;
    for (let i = 0; i < numStrands; i++) {
      strandPoints[perm[i]].push({ x: i, y: y, z: 0 });
    }

    // Close braid: trace cycles in permutation, inserting a proper closure arc
    // between EVERY strand-top and the next strand's bottom. Arcs are routed
    // through +Z (behind the braid plane) with per-arc depth spread so arcs
    // never cut through the braid body and do not intersect one another.
    const visited = new Array(numStrands).fill(false);
    const components = [];
    const zBase = 1.0;
    const zSpread = 1.5;
    let arcIndex = 0;
    for (let i = 0; i < numStrands; i++) {
      if (visited[i]) continue;
      const cycle = [];
      let cur = i;
      while (!visited[cur]) {
        visited[cur] = true;
        cycle.push(cur);
        cur = perm[cur];
      }
      const allPts = [];
      for (let k = 0; k < cycle.length; k++) {
        const s = cycle[k];
        const nextS = cycle[(k + 1) % cycle.length];
        // This strand's path (already ordered bottom→top)
        for (const p of strandPoints[s]) allPts.push(p);
        // Insert smooth arc from top of strand s to bottom of strand nextS
        const topPt = strandPoints[s][strandPoints[s].length - 1];
        const botPt = strandPoints[nextS][0];
        const zHigh = zBase + (numStrands > 1 ? (arcIndex / (numStrands - 1)) * zSpread : 0);
        arcIndex++;
        const xMid = (topPt.x + botPt.x) / 2;
        const yMid = (topPt.y + botPt.y) / 2;
        // Three control points lift the curve out to +Z, sweep past the top
        // and bottom of the braid, and approach the next strand's foot:
        allPts.push({ x: topPt.x, y: topPt.y + 0.6, z: zHigh * 0.5 });
        allPts.push({ x: xMid,    y: yMid,          z: zHigh });
        allPts.push({ x: botPt.x, y: botPt.y - 0.6, z: zHigh * 0.5 });
      }
      components.push(allPts);
    }
    return components;
  }

  /* ── 3D Viewer ── */
  function create3DViewer(container, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.style.borderRadius = '8px';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f8f8);
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(4, 3, 5);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(width, height);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 5, 5);
    scene.add(dir);

    const OrbitCtrl = THREE.OrbitControls || (window.OrbitControls);
    let controls = null;
    if (OrbitCtrl) {
      controls = new OrbitCtrl(camera, canvas);
      controls.enableDamping = true;
    }

    let meshes = [];
    let animId = null;
    let running = true;

    function animate() {
      if (!running) return;
      animId = requestAnimationFrame(animate);
      if (controls) controls.update();
      renderer.render(scene, camera);
    }
    animate();

    function clearMeshes() {
      for (const m of meshes) {
        scene.remove(m);
        if (m.geometry) m.geometry.dispose();
        if (m.material) m.material.dispose();
      }
      meshes = [];
    }

    function loadFromComponents(components) {
      clearMeshes();
      const colors = [0x2171b5, 0xd94801, 0x238b45, 0x6a3d9a];
      // Center the geometry
      let allX = [], allY = [], allZ = [];
      for (const comp of components) {
        for (const p of comp) { allX.push(p.x); allY.push(p.y); allZ.push(p.z); }
      }
      const cx = (Math.min(...allX) + Math.max(...allX)) / 2;
      const cy = (Math.min(...allY) + Math.max(...allY)) / 2;
      const cz = (Math.min(...allZ) + Math.max(...allZ)) / 2;
      const spanX = (Math.max(...allX) - Math.min(...allX)) || 1;
      const spanY = (Math.max(...allY) - Math.min(...allY)) || 1;
      const spanZ = (Math.max(...allZ) - Math.min(...allZ)) || 1;
      // Capped per-axis normalization: fit the longest span into 2.2, and
      // stretch the narrow axes — but at most 2.5× the uniform scale, so that
      // tight braid strands don't get crushed together relative to tube radius.
      const maxSpan = Math.max(spanX, spanY, spanZ);
      const base = 2.2 / maxSpan;
      const cap = 2.5 * base;
      const sx = Math.min(2.2 / spanX, cap);
      const sy = Math.min(2.2 / spanY, cap);
      const sz = Math.min(2.2 / spanZ, cap);

      for (let ci = 0; ci < components.length; ci++) {
        const pts = components[ci].map(p =>
          new THREE.Vector3((p.x - cx) * sx, (p.y - cy) * sy, (p.z - cz) * sz)
        );
        const curve = new THREE.CatmullRomCurve3(pts, true);
        const geo = new THREE.TubeGeometry(curve, 256, 0.035, 12, true);
        const mat = new THREE.MeshPhongMaterial({ color: colors[ci % colors.length] });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        meshes.push(mesh);
      }
      camera.position.set(4, 3, 5);
      if (controls) controls.reset();
    }

    return {
      loadKnot: function (name, data, mirror) {
        var components;
        const gen = KNOT_COORDS[name];
        if (gen) {
          components = gen(200);
        } else if (data && data.braid_word && data.braid_word.length > 0) {
          let numStrands = 0;
          for (const g of data.braid_word) numStrands = Math.max(numStrands, Math.abs(g) + 1);
          if (numStrands < 2) numStrands = 2;
          components = braidTo3D(data.braid_word, numStrands);
        } else {
          components = KNOT_COORDS['0_1'](200);
        }
        if (mirror) {
          for (const comp of components) {
            for (const p of comp) { p.x = -p.x; }
          }
        }
        loadFromComponents(components);
      },
      stop: function () { running = false; if (animId) cancelAnimationFrame(animId); },
      start: function () { if (!running) { running = true; animate(); } },
      dispose: function () {
        running = false;
        if (animId) cancelAnimationFrame(animId);
        clearMeshes();
        if (controls) controls.dispose();
        renderer.dispose();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  /* ── Reidemeister move SVGs ── */
  function svgRI() {
    // RI: A strand with a loop/twist on the left, straight strand on the right.
    // The loop crosses over itself — the over-strand is continuous, the under-strand has a gap.
    return `<svg width="320" height="120" viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Left: strand enters, forms a loop, and exits -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <!-- Under-strand (drawn first, with gap at crossing): enters from left, loops up and back -->
      <path d="M25,75 Q55,75 65,55 Q72,40 65,28 Q55,18 45,28 Q38,38 45,50" stroke="white" stroke-width="7"/>
      <path d="M25,75 Q55,75 65,55 Q72,40 65,28 Q55,18 45,28 Q38,38 45,50" stroke="#2171b5" stroke-width="3"/>
      <!-- Erase the crossing gap on the under-strand -->
      <line x1="50" y1="58" x2="60" y2="68" stroke="white" stroke-width="8"/>
      <!-- Over-strand: continues from loop downward and exits right -->
      <path d="M45,50 Q52,62 60,68 Q70,78 85,75 L115,75" stroke="#2171b5" stroke-width="3"/>
    </g>
    <!-- Arrow -->
    <text x="135" y="68" font-size="28" fill="#555">\u21C4</text>
    <!-- Right: straight strand -->
    <line x1="190" y1="75" x2="300" y2="75" stroke="#2171b5" stroke-width="3" stroke-linecap="round"/>
    <text x="110" y="110" font-size="13" fill="#666" font-weight="600">RI: twist / untwist</text>
  </svg>`;
  }

  function svgRII() {
    // RII: Two strands that cross each other twice on the left, two parallel strands on the right.
    // At both crossings, the top strand passes OVER (bottom strand has gaps).
    return `<svg width="320" height="120" viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke-linecap="round">
      <!-- Bottom strand (under at both crossings) — draw full path in white first for gap -->
      <path d="M20,85 C45,85 55,50 75,50 C95,50 105,85 130,85" stroke="white" stroke-width="7"/>
      <path d="M20,85 C45,85 55,50 75,50 C95,50 105,85 130,85" stroke="#d94801" stroke-width="3"/>
      <!-- Erase gaps where top strand crosses over -->
      <line x1="43" y1="68" x2="55" y2="58" stroke="white" stroke-width="8"/>
      <line x1="95" y1="58" x2="107" y2="68" stroke="white" stroke-width="8"/>
      <!-- Top strand (over at both crossings) -->
      <path d="M20,35 C45,35 55,70 75,70 C95,70 105,35 130,35" stroke="#2171b5" stroke-width="3"/>
    </g>
    <!-- Arrow -->
    <text x="145" y="68" font-size="28" fill="#555">\u21C4</text>
    <!-- Right: two parallel strands -->
    <g stroke-width="3" stroke-linecap="round" fill="none">
      <line x1="195" y1="35" x2="305" y2="35" stroke="#2171b5"/>
      <line x1="195" y1="85" x2="305" y2="85" stroke="#d94801"/>
    </g>
    <text x="110" y="110" font-size="13" fill="#666" font-weight="600">RII: poke / unpoke</text>
  </svg>`;
  }

  function svgRIII() {
    // RIII: Three strands forming a triangle of crossings. One strand slides past the crossing of the other two.
    // Left: strand C (horizontal) passes OVER the X formed by strands A and B.
    // Right: strand C has moved to the other side of the X.
    // At the X crossing, strand A (top-left to bottom-right) goes OVER strand B (bottom-left to top-right).
    return `<svg width="340" height="120" viewBox="0 0 340 120" xmlns="http://www.w3.org/2000/svg">
    <!-- LEFT SIDE -->
    <g fill="none" stroke-linecap="round">
      <!-- Strand B (bottom-left to top-right, UNDER strand A at the X) -->
      <path d="M15,95 L90,20" stroke="white" stroke-width="7"/>
      <path d="M15,95 L90,20" stroke="#4daf4a" stroke-width="3"/>
      <!-- Gap in B where A crosses over -->
      <line x1="44" y1="64" x2="58" y2="50" stroke="white" stroke-width="8"/>
      <!-- Strand A (top-left to bottom-right, OVER strand B) -->
      <path d="M15,20 L90,95" stroke="#2171b5" stroke-width="3"/>
      <!-- Now erase gaps where strand C crosses over both A and B -->
      <line x1="14" y1="30" x2="91" y2="30" stroke="white" stroke-width="8"/>
      <!-- Strand C (horizontal, OVER everything, positioned at top) -->
      <line x1="10" y1="30" x2="95" y2="30" stroke="#d94801" stroke-width="3"/>
    </g>
    <!-- Arrow -->
    <text x="115" y="62" font-size="28" fill="#555">\u21C4</text>
    <!-- RIGHT SIDE: C has slid to the bottom -->
    <g fill="none" stroke-linecap="round">
      <!-- Strand B (bottom-left to top-right, UNDER strand A at the X) -->
      <path d="M175,95 L250,20" stroke="white" stroke-width="7"/>
      <path d="M175,95 L250,20" stroke="#4daf4a" stroke-width="3"/>
      <!-- Gap in B where A crosses over -->
      <line x1="204" y1="64" x2="218" y2="50" stroke="white" stroke-width="8"/>
      <!-- Strand A (top-left to bottom-right, OVER strand B) -->
      <path d="M175,20 L250,95" stroke="#2171b5" stroke-width="3"/>
      <!-- Erase gaps where C crosses over both A and B -->
      <line x1="174" y1="85" x2="251" y2="85" stroke="white" stroke-width="8"/>
      <!-- Strand C (horizontal, OVER everything, positioned at bottom) -->
      <line x1="170" y1="85" x2="255" y2="85" stroke="#d94801" stroke-width="3"/>
    </g>
    <text x="105" y="110" font-size="13" fill="#666" font-weight="600">RIII: slide a strand past a crossing</text>
  </svg>`;
  }

  // Expose for reuse in other tabs (e.g. Linking → Reidemeister & Framing).
  window._reidemeisterSVGs = { RI: svgRI, RII: svgRII, RIII: svgRIII };

  /* ── Knot selector widget ── */
  function createKnotSelector(parent, knotsData, linksData, viewer) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:8px;display:flex;flex-direction:column;gap:6px;align-items:center;';

    const radioRow = document.createElement('div');
    radioRow.style.cssText = 'display:flex;gap:12px;align-items:center;';
    const rKnot = document.createElement('label');
    rKnot.innerHTML = '<input type="radio" name="ktype_' + Math.random().toString(36).slice(2) + '" value="knot" checked> Knot';
    const rLink = document.createElement('label');
    rLink.innerHTML = '<input type="radio" name="' + rKnot.querySelector('input').name + '" value="link"> Link';
    radioRow.appendChild(rKnot);
    radioRow.appendChild(rLink);
    wrap.appendChild(radioRow);

    const select = document.createElement('select');
    select.style.cssText = 'padding:4px 8px;border-radius:4px;border:1px solid #ccc;font-size:14px;max-width:220px;';
    wrap.appendChild(select);

    const mirrorLabel = document.createElement('label');
    mirrorLabel.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:14px;';
    mirrorLabel.innerHTML = '<input type="checkbox"> Mirror';
    wrap.appendChild(mirrorLabel);
    const mirrorCheck = mirrorLabel.querySelector('input');

    parent.appendChild(wrap);

    const subscriptMap = { '0': '\u2080', '1': '\u2081', '2': '\u2082', '3': '\u2083', '4': '\u2084', '5': '\u2085', '6': '\u2086', '7': '\u2087', '8': '\u2088', '9': '\u2089' };
    function sub(s) { return s.replace(/(\d+)_(\d+)/g, function (m, a, b) { return a + b.split('').map(c => subscriptMap[c] || c).join(''); }); }

    function populateSelect(type) {
      select.innerHTML = '';
      const data = type === 'knot' ? knotsData : linksData;
      const keys = Object.keys(data).filter(function(k) {
        return parseInt(data[k].crossings) <= 5;
      }).sort(function (a, b) {
        return (parseInt(data[a].crossings) || 0) - (parseInt(data[b].crossings) || 0);
      });
      for (const k of keys) {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = sub(k) + (data[k].name && data[k].name !== k ? ' ' + data[k].name : '');
        select.appendChild(opt);
      }
      if (keys.length > 0) loadEntry(type, keys[0]);
    }

    function loadEntry(type, key) {
      const data = type === 'knot' ? knotsData : linksData;
      viewer.loadKnot(key, data[key], mirrorCheck.checked);
    }

    const radios = [rKnot.querySelector('input'), rLink.querySelector('input')];
    function getType() { return radios[0].checked ? 'knot' : 'link'; }

    radios.forEach(function (r) {
      r.addEventListener('change', function () { populateSelect(getType()); });
    });
    select.addEventListener('change', function () { loadEntry(getType(), select.value); });
    mirrorCheck.addEventListener('change', function() { loadEntry(getType(), select.value); });

    populateSelect('knot');
    return { getType: getType, getKey: function () { return select.value; } };
  }

  /* ── Home / Introduction sub-tab (landing page) ── */
  function renderHome(el) {
    el.innerHTML = `
    <div class="home-container">
      <section class="home-hero">
        <h2>KnotLab</h2>
        <p>
          A graduate-level interactive reference and teaching tool for knot theory &mdash;
          from Reidemeister moves to Khovanov homology, with live computations, 3D renderings,
          and a complete Rolfsen table of prime knots through 12 crossings.
        </p>
        <p>
          Built for graduate students learning the subject, researchers assembling talks,
          and professors who want working demonstrations at hand during lecture.
        </p>
      </section>

      <section class="home-section">
        <h3>Navigation map</h3>
        <p>Seven top-level tabs. Click any card to jump directly.</p>
        <div class="kl-nav-grid">
          <button class="kl-nav-card" data-goto="home" type="button">
            <h4>Home <span class="kl-pill kl-pill-ready">you are here</span></h4>
            <p>3D knot visualizer, Knots &amp; Links gallery, knot diagrams, diagrammatic encodings (Gauss codes, PD codes, DT), braid words and closures, and a Reidemeister-move explorer.</p>
            <span class="kl-nav-status">6 sub-tabs: Overview &middot; Knots &amp; Links &middot; Diagrams &middot; Encodings &middot; Braids &middot; Invariants</span>
          </button>
          <button class="kl-nav-card" data-goto="knot-explorer" type="button">
            <h4>Knot Explorer <span class="kl-pill kl-pill-ready">data</span></h4>
            <p>Searchable database of all prime knots up to 12 crossings, with diagrams, braid words, Gauss codes, and pre-computed polynomial and numerical invariants.</p>
            <span class="kl-nav-status">Tables &middot; Invariant lookup &middot; Cube of Resolutions</span>
          </button>
          <button class="kl-nav-card" data-goto="polynomial-invariants" type="button">
            <h4>Polynomial Invariants <span class="kl-pill kl-pill-wip">expanding</span></h4>
            <p>Alexander, Jones, HOMFLY-PT, quantum / Reshetikhin&ndash;Turaev, Kauffman F, Vassiliev (finite-type), Conway, and colored Jones. Skein relations, state sums, and worked examples.</p>
            <span class="kl-nav-status">Alexander &middot; Jones &middot; HOMFLY-PT &middot; Quantum &middot; Others</span>
          </button>
          <button class="kl-nav-card" data-goto="homological-invariants" type="button">
            <h4>Homological Invariants <span class="kl-pill kl-pill-wip">expanding</span></h4>
            <p>Khovanov homology, knot Floer homology, Khovanov&ndash;Rozansky sl(N), the categorification program, and the spectral sequences that connect these theories.</p>
            <span class="kl-nav-status">Khovanov &middot; Knot Floer &middot; Khovanov&ndash;Rozansky &middot; Comments</span>
          </button>
          <button class="kl-nav-card" data-goto="gauss-linking" type="button">
            <h4>Linking <span class="kl-pill kl-pill-ready">core</span></h4>
            <p>The Gauss linking integral computed numerically on canonical links, writhe, framing (including blackboard framing), self-linking, and a primer on Kirby calculus.</p>
            <span class="kl-nav-status">Linking integral &middot; Framing &middot; Reidemeister</span>
          </button>
          <button class="kl-nav-card" data-goto="miscellaneous" type="button">
            <h4>Miscellaneous <span class="kl-pill kl-pill-wip">expanding</span></h4>
            <p>Numerical invariants (crossing, bridge, unknotting, genus, determinant, signature, Arf&ndash;Kervaire), the knot group, arithmetic topology via Morishita's knots&ndash;primes dictionary, and virtual knots.</p>
            <span class="kl-nav-status">7 numerical &middot; Knot Group &middot; Arithmetic Topology &middot; Virtual Knots</span>
          </button>
          <button class="kl-nav-card" data-goto="appendix" type="button">
            <h4>Appendix <span class="kl-pill kl-pill-ready">core</span></h4>
            <p>Historical narrative from Kelvin and Tait through Jones, Witten, and Khovanov; physics connections (Chern&ndash;Simons, TQFT, DNA topology); and a glossary of definitions used throughout KnotLab.</p>
            <span class="kl-nav-status">History &middot; Physics &middot; Definitions</span>
          </button>
        </div>
      </section>

      <section class="home-section">
        <h3>Start here</h3>
        <div class="kl-nav-grid">
          <div class="expo-panel">
            <h4>New to knot theory</h4>
            <p>
              Stay on <strong>Home</strong> and work through the sub-tabs in order: Knots &amp; Links,
              then Knot Diagrams, then Encodings and Braids. The Reidemeister-move explorer and 3D
              visualizer live here.
            </p>
          </div>
          <div class="expo-panel">
            <h4>Looking up a specific knot or invariant</h4>
            <p>
              Go straight to <strong>Knot Explorer</strong>. Search by name (e.g. <em>3<sub>1</sub></em>,
              <em>4<sub>1</sub></em>, <em>8<sub>19</sub></em>) to see diagram, braid word, and every
              computed invariant on one page.
            </p>
          </div>
          <div class="expo-panel">
            <h4>Advanced reading</h4>
            <p>
              For the modern categorified picture, read <strong>Polynomial Invariants</strong>
              (Jones, HOMFLY-PT) first, then <strong>Homological Invariants</strong>. The Appendix's
              Physics section provides the Chern&ndash;Simons / TQFT context.
            </p>
          </div>
        </div>
      </section>
    </div>`;

    // Wire navigation cards. Each card jumps to its top-level tab (and, where
    // data-sub is provided, its sub-tab inside the target module).
    var cards = el.querySelectorAll('.kl-nav-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var target = card.getAttribute('data-goto');
        if (!target || typeof window.switchTab !== 'function') return;
        window.switchTab(target);
        // If a sub-tab index was requested and we're staying in the intro
        // module, switch to it after the tab renders. For now we only respect
        // this inside the intro module since other modules manage their own
        // sub-tab state.
      });
    });
  }

  /* ── Render sub-tab content ── */
  function renderKnotsAndLinks(el, knotsData, linksData, viewers) {
    el.innerHTML = `
    <div class="expo-panel">
      <h3>What is a Knot?</h3>
      <p>In mathematics, a <strong>knot</strong> is a smooth (or piecewise-linear) embedding of the circle \\(S^1\\) into three-dimensional space \\(\\mathbb{R}^3\\) (or the 3-sphere \\(S^3\\)). Intuitively, a knot is a closed loop in space that does not intersect itself.</p>
      <p>A <strong>link</strong> is a disjoint union of one or more knots, called <em>components</em>. A knot is thus a link with a single component.</p>
      <p>The simplest knot is the <strong>unknot</strong> (or trivial knot) \\(0_1\\), which is a simple planar circle with no crossings. The simplest non-trivial link is the <strong>Hopf link</strong>.</p>
    </div>

    <div class="expo-panel">
      <h3>3D Knot Explorer</h3>
      <p style="margin-bottom:8px;">Select a knot or link to visualize its embedding in \\(\\mathbb{R}^3\\). Drag to rotate.</p>
      <div id="intro-selector-1" style="text-align:center;"></div>
      <div id="intro-viewer-1" style="margin-top:12px;text-align:center;"></div>
      <details style="margin-top:1rem;font-size:0.88rem;color:var(--text-muted);">
        <summary style="cursor:pointer;font-weight:600;">How is the 3D surface obtained?</summary>
        <p style="margin-top:0.5rem;">For standard knots (unknot, trefoil, figure-eight, torus knots), the 3D embedding uses explicit parametric formulas &mdash; e.g., the trefoil is the torus knot \\(T(2,3)\\) parametrized as \\(\\bigl((2+\\cos 3t)\\cos 2t,\\;(2+\\cos 3t)\\sin 2t,\\;\\sin 3t\\bigr)\\). For other knots, the embedding is constructed from the <strong>braid word</strong>: strand positions are tracked through each generator, the braid is closed via permutation cycles, and the resulting piecewise-linear path is smoothed by a Catmull&ndash;Rom spline. A tubular neighbourhood is rendered using <code>THREE.TubeGeometry</code>.</p>
        <p><strong>Mirror:</strong> The mirror image \\(\\overline{K}\\) is obtained by negating the \\(x\\)-coordinate of every point in the embedding, which reverses the handedness of all crossings.</p>
      </details>
    </div>

    <div class="expo-panel">
      <h3>Knot Tabulation</h3>
      <p>Knots are traditionally organized by their <em>crossing number</em> &mdash; the minimum number of crossings in any diagram. The classical <strong>Rolfsen table</strong> catalogues prime knots up to 10 crossings, while the <strong>Hoste&ndash;Thistlethwaite&ndash;Weeks</strong> (HTW) tabulation extends to 16 crossings (over 1.7 million prime knots). Links are tabulated separately, with notation like \\(L2a1\\) (the Hopf link).</p>
    </div>

    <div class="expo-panel">
      <h3>Knot Equivalence</h3>
      <p>Two knots \\(K_1\\) and \\(K_2\\) are <strong>equivalent</strong> (or <em>ambient isotopic</em>) if there exists a continuous family of homeomorphisms \\(h_t : \\mathbb{R}^3 \\to \\mathbb{R}^3\\), \\(t \\in [0,1]\\), with \\(h_0 = \\mathrm{id}\\) and \\(h_1(K_1) = K_2\\).</p>
      <p>Determining equivalence is subtle: two knot diagrams may look completely different yet represent the same knot. Deformations can be highly complex, passing through configurations with many more crossings before simplifying.</p>
    </div>

    <div class="expo-panel">
      <h3>Compare Two Knots</h3>
      <p>Select two knots or links below to compare their 3D embeddings side by side.</p>
      <div style="display:flex;flex-wrap:wrap;gap:24px;justify-content:center;">
        <div style="text-align:center;">
          <div id="intro-selector-2a"></div>
          <div id="intro-viewer-2a"></div>
        </div>
        <div style="text-align:center;">
          <div id="intro-selector-2b"></div>
          <div id="intro-viewer-2b"></div>
        </div>
      </div>
    </div>

    <div class="expo-panel">
      <h3>Why Invariants?</h3>
      <p>A <strong>knot invariant</strong> is a quantity associated to a knot that is preserved under ambient isotopy. If two knots have different values of some invariant, they must be distinct knots. However, matching invariants do not guarantee equivalence.</p>
      <p>Simple numerical invariants include the <em>crossing number</em>, <em>unknotting number</em>, <em>signature</em>, and <em>determinant</em>. More powerful <strong>polynomial invariants</strong> (Alexander, Jones, HOMFLY-PT) and <strong>homological invariants</strong> (Khovanov homology) are explored in the other tabs.</p>
    </div>`;

    // Create 3D viewers
    var v1 = create3DViewer(el.querySelector('#intro-viewer-1'), 350, 350);
    viewers.push(v1);
    createKnotSelector(el.querySelector('#intro-selector-1'), knotsData, linksData, v1);

    var v2a = create3DViewer(el.querySelector('#intro-viewer-2a'), 300, 300);
    viewers.push(v2a);
    createKnotSelector(el.querySelector('#intro-selector-2a'), knotsData, linksData, v2a);

    var v2b = create3DViewer(el.querySelector('#intro-viewer-2b'), 300, 300);
    viewers.push(v2b);
    createKnotSelector(el.querySelector('#intro-selector-2b'), knotsData, linksData, v2b);
  }

  function renderKnotDiagrams(el, knotsData, linksData) {
    el.innerHTML = `
    <div class="expo-panel">
      <h3>Knot Diagrams</h3>
      <p>A <strong>knot diagram</strong> is a regular projection of a knot onto a plane, where at each crossing the over-strand and under-strand are distinguished (typically by drawing a gap in the under-strand). A knot diagram retains enough information to reconstruct the knot up to ambient isotopy.</p>
    </div>

    <div class="expo-panel">
      <h3>Diagram Viewer</h3>
      <p>Select a knot or link to view its diagram:</p>
      <div style="text-align:center;">
        <div style="margin-bottom:12px;">
          <select id="intro-diagram-sel" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;font-size:14px;max-width:220px;"></select>
          <label id="intro-diagram-mirror" style="display:inline-flex;align-items:center;gap:4px;font-size:14px;margin-left:12px;"><input type="checkbox"> Mirror</label>
        </div>
        <div id="intro-diagram-img" style="min-height:200px;"></div>
      </div>
    </div>

    <div class="expo-panel">
      <h3>Diagram Equivalence &amp; Reidemeister Moves</h3>
      <p>A foundational result in knot theory states that two knot diagrams represent the same knot if and only if they are related by a finite sequence of <strong>Reidemeister moves</strong>, together with planar isotopy.</p>

      <details class="kl-proof">
        <summary>Proof sketch: Reidemeister's theorem (1927)</summary>
        <p>Sketch. Place the two diagrams \\(D_0, D_1\\) as generic projections of ambient-isotopic knots \\(K_0, K_1 \\subset \\mathbb{R}^3\\). Lift the ambient isotopy to a smooth 1-parameter family \\(K_t\\) and project to a fixed plane. By transversality applied to the projection map restricted to this family, for a generic isotopy the projection \\(D_t\\) is a regular diagram except at finitely many parameter values \\(t_1 &lt; \\cdots &lt; t_N\\), where exactly one of three codimension-one singularities occurs: a cusp (a strand acquires a vertical tangent) \u2192 <strong>RI</strong>; a tangency between two strands \u2192 <strong>RII</strong>; a triple point where three strands meet \u2192 <strong>RIII</strong>. Between consecutive \\(t_i\\) the diagram changes only by planar isotopy. The proof appears in Reidemeister (1927) and independently Alexander\u2013Briggs (1926). The general-position argument is cleanest in the smooth category; a PL proof requires a little more care.</p>
      </details>

      <p>There are three types of Reidemeister moves:</p>

      <div style="margin:16px 0;">
        <div style="text-align:center;margin-bottom:1.5rem;">
          ${svgRI()}
          <p style="margin-top:0.5rem;"><strong>RI: Twist / Untwist.</strong> A simple loop (kink) can be added to or removed from a strand. This move changes the writhe by \\(\\pm 1\\) and is the only Reidemeister move that is not a regular isotopy.</p>
        </div>
        <div style="text-align:center;margin-bottom:1.5rem;">
          ${svgRII()}
          <p style="margin-top:0.5rem;"><strong>RII: Poke / Unpoke.</strong> Two crossings between a pair of strands can be added or removed simultaneously. One crossing is positive and the other negative, so the writhe is unchanged.</p>
        </div>
        <div style="text-align:center;">
          ${svgRIII()}
          <p style="margin-top:0.5rem;"><strong>RIII: Slide.</strong> A strand can be slid over (or under) a crossing formed by two other strands. This move preserves both the number of crossings and the writhe.</p>
        </div>
      </div>
    </div>

    <div class="expo-panel">
      <h3>From Diagrams to Invariants</h3>
      <p>This theorem motivates the study of knot invariants from diagrams: a function of a knot diagram is a knot invariant if and only if it is unchanged by all three Reidemeister moves (and planar isotopy). Many classical invariants &mdash; the Jones polynomial, Kauffman bracket, and writhe &mdash; are defined and verified via this approach.</p>
    </div>`;

    // Populate diagram selector
    const sel = el.querySelector('#intro-diagram-sel');
    const imgDiv = el.querySelector('#intro-diagram-img');
    const allData = Object.assign({}, knotsData, linksData);
    const diagramMirrorCheck = el.querySelector('#intro-diagram-mirror input');
    const keys = Object.keys(allData).filter(function(k) {
      return parseInt(allData[k].crossings) <= 5;
    }).sort(function (a, b) {
      return (allData[a].crossings || 0) - (allData[b].crossings || 0);
    });
    for (const k of keys) {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = k + (allData[k].name && allData[k].name !== k ? ' ' + allData[k].name : '');
      sel.appendChild(opt);
    }

    function showDiagram(key, mirror) {
      const entry = allData[key];
      if (entry) {
        const imgPath = mirror ? entry.mirror_diagram : entry.diagram;
        if (imgPath) {
          imgDiv.innerHTML = '<img src="knot-explorer/' + imgPath + '" alt="' + (mirror ? 'Mirror diagram' : 'Diagram') + ' of ' + key + '" style="max-width:300px;max-height:300px;border-radius:6px;border:1px solid #ddd;">';
        } else {
          imgDiv.innerHTML = '<p style="color:#999;">No ' + (mirror ? 'mirror ' : '') + 'diagram available for ' + key + '.</p>';
        }
      }
    }

    sel.addEventListener('change', function () { showDiagram(sel.value, diagramMirrorCheck.checked); });
    diagramMirrorCheck.addEventListener('change', function () { showDiagram(sel.value, diagramMirrorCheck.checked); });
    if (keys.length > 0) showDiagram(keys[0], false);
  }

  function encMathRender(el) {
    if (typeof renderMathInElement === 'function') {
      try { renderMathInElement(el, { delimiters: [{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}], throwOnError:false }); } catch (e) {}
    }
  }

  function pdCrossingSVG() {
    return '<svg viewBox="-130 -80 260 180" width="320" height="220" style="display:block;margin:0 auto">' +
      '<line x1="-50" y1="50" x2="50" y2="-50" stroke="#1f3a5f" stroke-width="4" stroke-linecap="round" />' +
      '<line x1="50"  y1="50"  x2="12" y2="12"  stroke="#1f3a5f" stroke-width="4" stroke-linecap="round" />' +
      '<line x1="-12" y1="-12" x2="-50" y2="-50" stroke="#1f3a5f" stroke-width="4" stroke-linecap="round" />' +
      '<polygon points="50,-50 40,-48 45,-38" fill="#b84900" />' +
      '<polygon points="-50,-50 -45,-38 -40,-48" fill="#b84900" />' +
      '<text x="34"  y="48"  font-size="15" fill="#333" font-style="italic">a</text>' +
      '<text x="-42" y="48"  font-size="15" fill="#333" font-style="italic">b</text>' +
      '<text x="-42" y="-28" font-size="15" fill="#333" font-style="italic">c</text>' +
      '<text x="34"  y="-28" font-size="15" fill="#333" font-style="italic">d</text>' +
      '<path d="M 16,5 A 16 16 0 0 1 -5,16" stroke="#888" stroke-width="1.2" fill="none" />' +
      '<polygon points="-5,16 -2,11 -10,12" fill="#888" />' +
      '<text x="10" y="75" text-anchor="middle" font-size="12" fill="#666">' +
        'positive crossing \u2014 read a, b, c, d counter-clockwise' +
      '</text>' +
      '</svg>';
  }

  function renderEncodings(el) {
    el.innerHTML =
      '<div class="expo-panel">' +
        '<h3>From diagram to data</h3>' +
        '<p>A knot diagram is a picture, but every invariant computed in KnotLab \u2014 the Gauss linking integral, ' +
        'Alexander, Jones, HOMFLY-PT, Khovanov \u2014 is ultimately evaluated from a <em>combinatorial</em> ' +
        'description of that diagram, not from the drawing itself. Two encodings dominate the literature ' +
        'and both appear throughout KnotLab and the Knot Explorer:</p>' +
        '<ul>' +
          '<li><span class="kl-term" title="Gauss code: walking once around an oriented knot diagram, record O_n\u207a/U_n\u207b (over/under, crossing sign) at each crossing. Each label appears twice. Abstract codes may not be planar-realisable.">Gauss code</span> \u2014 a sequence recording which crossings you visit as you ' +
          'walk along the knot, with signs for over/under and crossing sign. Named after Gauss, who ' +
          'introduced a version while studying the linking integral you will meet in the Linking tab.</li>' +
          '<li><span class="kl-term" title="Planar Diagram (PD) code: one 4-tuple X_{a,b,c,d} per crossing, listing the incident arcs (numbered along the orientation) starting from the incoming under-arc and proceeding counter-clockwise.">Planar Diagram (PD) notation</span> \u2014 a list of 4-tuples, one per ' +
          'crossing, recording the four arcs meeting at that crossing in cyclic order.</li>' +
        '</ul>' +
        '<p>The two encodings are equivalent for classical knots but have different strengths: Gauss code ' +
        'is more compact and extends to virtual knots; PD notation is what most computer algebra systems ' +
        '(SnapPy, KnotTheory`, this app\u2019s Knot Explorer) consume directly.</p>' +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3><span class="kl-term" title="Signed Gauss code: a Gauss code augmented with the sign \u00b1 of each crossing (right- vs. left-handed). Determines the knot up to reflection for classical diagrams.">Signed Gauss code</span></h3>' +
        '<p>Label each crossing of an oriented diagram with a distinct positive integer. Start at any ' +
        'point on the knot and walk in the chosen direction. At each crossing \\(n\\) you pass, write</p>' +
        '<ul>' +
          '<li>\\(O_n^\\varepsilon\\) if you pass <em>over</em> the crossing,</li>' +
          '<li>\\(U_n^\\varepsilon\\) if you pass <em>under</em>,</li>' +
        '</ul>' +
        '<p>where \\(\\varepsilon \\in \\{+, -\\}\\) is the <em>sign</em> of the crossing (right-handed ' +
        '\\(=+\\), left-handed \\(=-\\)). Each integer appears exactly twice in the sequence (once over, ' +
        'once under). Reading the sequence in cyclic order gives the <strong>signed Gauss code</strong>.</p>' +
        '<div class="kl-example">' +
          '<div class="kl-head">Example: right-handed trefoil \\(3_1\\)</div>' +
          'Number the three crossings \\(1,2,3\\) and start at the top strand. Walking around the knot ' +
          'gives the Gauss code' +
          '<div class="formula-box">$$O_1^+\\ U_2^+\\ O_3^+\\ U_1^+\\ O_2^+\\ U_3^+.$$</div>' +
          'All three crossings are positive (right-handed), so every sign is \\(+\\). The length-6 sequence ' +
          'reflects three crossings, each visited twice.' +
        '</div>' +
        '<div class="kl-example">' +
          '<div class="kl-head">Example: Hopf link \\(L2a1\\) (positive)</div>' +
          'Two components, two crossings. Walking component \\(K_1\\) gives \\(O_1^+\\ O_2^+\\); walking ' +
          'component \\(K_2\\) gives \\(U_1^+\\ U_2^+\\). The Gauss code of a link is one sequence per component.' +
        '</div>' +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Planar Diagram (PD) notation</h3>' +
        '<p>Orient the knot and number the <em>arcs</em> \u2014 the segments of the diagram between ' +
        'consecutive under-crossings \u2014 consecutively along the orientation: \\(1, 2, 3, \\ldots\\). ' +
        'Each crossing is then an \\(X\\)-tuple</p>' +
        '<div class="formula-box">$$X_{a,b,c,d}$$</div>' +
        '<p>listing the four arcs meeting at the crossing, starting from the <em>incoming under-arc</em> ' +
        '\\(a\\) and proceeding <strong>counter-clockwise</strong>. For a positive crossing, ' +
        '\\(b\\) is the outgoing over-arc and \\(d\\) is the incoming over-arc; for a negative crossing ' +
        'the over-arc labels are swapped.</p>' +
        '<div class="kl-diagram">' + pdCrossingSVG() + '</div>' +
        '<div class="kl-example">' +
          '<div class="kl-head">Example: right-handed trefoil \\(3_1\\)</div>' +
          'Six arcs, three crossings. A standard labeling yields' +
          '<div class="formula-box">$$\\mathrm{PD}[3_1] \\;=\\; X_{1,4,2,5}\\ \\ X_{3,6,4,1}\\ \\ X_{5,2,6,3}.$$</div>' +
          'This is exactly the encoding the Knot Explorer uses to look up invariants; paste it into a ' +
          'computer algebra system such as KnotTheory` and you will get ' +
          '\\(\\Delta_{3_1}(t) = t - 1 + t^{-1}\\) out.' +
        '</div>' +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Interactive: PD \u2194 polynomial lookup</h3>' +
        '<p>Select a knot below to see its Gauss code, PD notation, and Alexander polynomial side by side. ' +
        'Every entry is precomputed in the Knot Explorer\u2019s data table.</p>' +
        '<div class="kl-interactive">' +
          '<div class="kl-controls">' +
            '<label>Knot: ' +
            '<select id="gl-enc-knot">' +
              '<option value="unknot">unknot</option>' +
              '<option value="3_1" selected>3\u2081 (trefoil)</option>' +
              '<option value="4_1">4\u2081 (figure-eight)</option>' +
              '<option value="5_1">5\u2081</option>' +
              '<option value="5_2">5\u2082</option>' +
              '<option value="6_1">6\u2081</option>' +
            '</select></label>' +
          '</div>' +
          '<div class="kl-readout" id="gl-enc-readout"></div>' +
        '</div>' +
      '</div>' +

      '<div class="expo-panel">' +
        '<h3>Realizability: not every Gauss code is planar</h3>' +
        '<p>Given an abstract sequence in the letters \\(O_i^\\varepsilon, U_i^\\varepsilon\\) satisfying ' +
        'the parity condition (each label once over, once under), is there necessarily a knot diagram that ' +
        'produces it? The answer is <strong>no</strong>. For example,</p>' +
        '<div class="formula-box">$$O_1\\ O_2\\ U_1\\ U_2$$</div>' +
        '<p>cannot be drawn as a <span class="kl-term" title="Planar realisable Gauss code: one that arises from an actual knot diagram in the plane. Characterised combinatorially by Lov\u00e1sz (1965) via interlacement graphs and later refined by Kauffman.">planar diagram</span>: there is no way to place two crossings so that the over- ' +
        'and under-arcs alternate in this pattern without introducing a third crossing. Gauss himself ' +
        'asked for a characterization; a complete combinatorial answer was given by Lov\u00e1sz (1965) (and ' +
        'independently others) in terms of interlacement graphs, and later refined by Kauffman.</p>' +
        '<p>The non-realizable codes are not meaningless: they correspond to <strong>virtual knots</strong> ' +
        '\u2014 diagrams on surfaces of higher genus, equivalently diagrams with an extra <span class="kl-term" title="Virtual crossing: a fourth crossing type (drawn \u2b58) added to handle diagrams on higher-genus surfaces. Virtual Reidemeister moves augment R1\u2013R3 with detour moves.">virtual crossing</span> type. See the <em>Virtual Knots</em> sub-tab of <em>Miscellaneous</em>.</p>' +
      '</div>';

    encMathRender(el);

    var table = {
      unknot: { gauss: '(empty \u2014 no crossings)', pd: '(empty)', alexander: '\\(1\\)' },
      '3_1': { gauss: '\\(O_1^+\\ U_2^+\\ O_3^+\\ U_1^+\\ O_2^+\\ U_3^+\\)', pd: '\\(X_{1,4,2,5}\\ X_{3,6,4,1}\\ X_{5,2,6,3}\\)', alexander: '\\(t - 1 + t^{-1}\\)' },
      '4_1': { gauss: '\\(O_1^-\\ U_2^+\\ O_3^-\\ U_4^+\\ O_2^+\\ U_1^-\\ O_4^+\\ U_3^-\\)', pd: '\\(X_{4,2,5,1}\\ X_{8,6,1,5}\\ X_{6,3,7,4}\\ X_{2,7,3,8}\\)', alexander: '\\(-t + 3 - t^{-1}\\)' },
      '5_1': { gauss: '\\(O_1^+\\ U_2^+\\ O_3^+\\ U_4^+\\ O_5^+\\ U_1^+\\ O_2^+\\ U_3^+\\ O_4^+\\ U_5^+\\)', pd: '\\(X_{1,6,2,7}\\ X_{3,8,4,9}\\ X_{5,10,6,1}\\ X_{7,2,8,3}\\ X_{9,4,10,5}\\)', alexander: '\\(t^2 - t + 1 - t^{-1} + t^{-2}\\)' },
      '5_2': { gauss: '\\(O_1^+\\ U_2^+\\ O_3^+\\ U_4^+\\ O_5^+\\ U_3^+\\ O_4^+\\ U_5^+\\ O_2^+\\ U_1^+\\)', pd: '\\(X_{1,4,2,5}\\ X_{3,8,4,9}\\ X_{9,5,10,4}\\ X_{5,10,6,1}\\ X_{7,2,8,3}\\)', alexander: '\\(2t - 3 + 2t^{-1}\\)' },
      '6_1': { gauss: '\\(O_1^-\\ U_2^+\\ O_3^-\\ U_4^+\\ O_5^-\\ U_6^+\\ O_2^+\\ U_1^-\\ O_6^+\\ U_5^-\\ O_4^+\\ U_3^-\\)', pd: '\\(X_{4,2,5,1}\\ X_{8,4,9,3}\\ X_{12,9,1,10}\\ X_{10,5,11,6}\\ X_{6,11,7,12}\\ X_{2,8,3,7}\\)', alexander: '\\(-2t + 5 - 2t^{-1}\\)' }
    };
    var sel = document.getElementById('gl-enc-knot');
    var out = document.getElementById('gl-enc-readout');
    function updateLookup() {
      if (!sel || !out) return;
      var k = sel.value;
      var row = table[k] || table['3_1'];
      out.innerHTML =
        '<div><strong>Gauss code:</strong> ' + row.gauss + '</div>' +
        '<div style="margin-top:0.4rem"><strong>PD notation:</strong> ' + row.pd + '</div>' +
        '<div style="margin-top:0.4rem"><strong>Alexander polynomial:</strong> ' + row.alexander + '</div>';
      encMathRender(out);
    }
    if (sel) sel.addEventListener('change', updateLookup);
    updateLookup();
  }

  function renderBraids(el) {
    el.innerHTML = `
    <div class="expo-panel">
      <h3>Braids and Knots</h3>
      <p>A <strong>braid</strong> on \\(n\\) strands is a collection of \\(n\\) non-intersecting curves
      (strands) running from one horizontal line to another, where each strand moves monotonically
      downward. Two braids are equivalent if one can be deformed into the other while keeping
      the endpoints fixed.</p>
      <p>The set of all braids on \\(n\\) strands forms the <strong>braid group</strong> \\(B_n\\),
      with composition given by stacking braids vertically. The group is generated by
      <strong>Artin generators</strong> \\(\\sigma_1, \\sigma_2, \\ldots, \\sigma_{n-1}\\), where
      \\(\\sigma_i\\) crosses strand \\(i\\) over strand \\(i+1\\).</p>
    </div>

    <div class="expo-panel">
      <h3>Artin Presentation</h3>
      <p>The braid group \\(B_n\\) has the presentation:</p>
      <div class="formula-box">
        $$B_n = \\left\\langle \\sigma_1, \\ldots, \\sigma_{n-1} \\;\\middle|\\;
        \\begin{array}{l}
        \\sigma_i \\sigma_j = \\sigma_j \\sigma_i \\quad \\text{if } |i-j| \\geq 2 \\\\
        \\sigma_i \\sigma_{i+1} \\sigma_i = \\sigma_{i+1} \\sigma_i \\sigma_{i+1}
        \\end{array}
        \\right\\rangle$$
      </div>
      <p>The first relation says distant crossings commute. The second is the <strong>Yang&ndash;Baxter
      equation</strong>, which is the algebraic form of Reidemeister move III.</p>
    </div>

    <div class="expo-panel">
      <h3>Alexander&rsquo;s Theorem</h3>
      <p><span class="kl-term" title="Alexander (1923): every tame link in S\u00b3 is the closure of a braid on some finite number of strands.">Alexander&rsquo;s theorem</span> (1923) states that every knot or link can be represented
      as the <strong>closure</strong> of a braid. The closure \\(\\hat{\\beta}\\) of a braid \\(\\beta\\) is
      obtained by connecting the top endpoints to the corresponding bottom endpoints.</p>
      <p>For example, the trefoil is the closure of the braid \\(\\sigma_1^3 \\in B_2\\), and the
      figure-eight knot is the closure of \\(\\sigma_1 \\sigma_2^{-1} \\sigma_1 \\sigma_2^{-1} \\in B_3\\).</p>

      <details class="kl-proof">
        <summary>Proof sketch: Alexander's theorem (1923)</summary>
        <p>Sketch. Fix an oriented diagram \\(D\\) of \\(L\\) and a base point \\(p\\) in the plane off the diagram. Call an arc <em>good</em> if it winds around \\(p\\) in the orientation sense and <em>bad</em> otherwise. A bad arc can be eliminated by an "Alexander trick": isotope a portion of the arc across \\(p\\), replacing it by two good arcs (and changing the diagram by a Markov-stabilization-like move). After finitely many tricks all arcs are good; the diagram then wraps around \\(p\\) like a braid closed around the axis through \\(p\\). Reading off the over/under crossings level by level gives a braid word \\(\\beta\\) with \\(\\widehat{\\beta} = L\\). A modern proof uses Yamada\u2013Vogel's algorithm, which makes the trick deterministic.</p>
      </details>
    </div>

    <div class="expo-panel">
      <h3>Markov&rsquo;s Theorem</h3>
      <p><span class="kl-term" title="Markov (1936): two braids (possibly on different numbers of strands) have ambient-isotopic closures iff related by conjugation in B_n and stabilisation B_n \u2194 B_{n+1} via \u03b2 \u2194 \u03b2\u03c3_n^{\u00b11}.">Markov&rsquo;s theorem</span> (1936) says that two braids have isotopic closures if and only if they are related by a sequence of
      <strong>Markov moves</strong>:</p>
      <ul style="line-height:1.8;">
        <li><strong>Conjugation:</strong> \\(\\beta \\mapsto \\alpha \\beta \\alpha^{-1}\\) in \\(B_n\\).</li>
        <li><strong>Stabilization:</strong> \\(\\beta \\in B_n \\mapsto \\beta \\sigma_n^{\\pm 1} \\in B_{n+1}\\).</li>
      </ul>
      <p>Together with Alexander&rsquo;s theorem, this gives a purely algebraic characterization
      of knot equivalence. Many knot invariants (including the Jones polynomial) can be constructed
      by finding functions on braids that are invariant under Markov moves.</p>
    </div>

    <div class="expo-panel">
      <h3>Braid Index</h3>
      <p>The <strong>braid index</strong> \\(b(K)\\) of a knot \\(K\\) is the minimum number of strands
      needed to represent \\(K\\) as a braid closure. The <strong>Morton&ndash;Williams&ndash;Franks (MWF)
      bound</strong> gives a lower bound on the braid index from the HOMFLY-PT polynomial:</p>
      <div class="formula-box">
        $$b(K) \\geq \\frac{1}{2}(\\text{span}_a P_K(a,z)) + 1$$
      </div>
      <p>The braid index is displayed for each knot in the Knot Explorer tab.</p>
    </div>

    <div class="expo-panel">
      <h3>Braids and Quantum Groups</h3>
      <p>The braid group acts naturally on tensor products of quantum group representations.
      A representation \\(\\rho: B_n \\to \\text{End}(V^{\\otimes n})\\) that satisfies the
      <strong>Markov trace</strong> property yields a knot invariant. The Jones polynomial arises
      from the fundamental representation of the quantum group \\(U_q(\\mathfrak{sl}(2))\\),
      and more general quantum group representations produce the colored Jones polynomials
      and the full family of Reshetikhin&ndash;Turaev invariants.</p>
    </div>`;
  }

  function renderInvariants(el) {
    el.innerHTML = `
    <div class="expo-panel">
      <h3>Knot Invariants</h3>
      <p>A <strong>knot invariant</strong> is a function from the set of knots (or links) to some algebraic object &mdash; a number, polynomial, group, etc. &mdash; that assigns the same value to ambient isotopic knots. Invariants are the primary tool for distinguishing knots.</p>
    </div>

    <div class="expo-panel">
      <h3>Numerical Invariants</h3>
      <ul style="line-height:1.8;">
        <li><strong>Crossing number</strong> \\(c(K)\\): the minimum number of crossings over all diagrams of \\(K\\).</li>
        <li><strong>Unknotting number</strong> \\(u(K)\\): the minimum number of crossing changes needed to convert \\(K\\) to the unknot.</li>
        <li><strong>Bridge number</strong> \\(b(K)\\): the minimum number of local maxima in any regular projection.</li>
        <li><strong>Three-genus</strong> \\(g(K)\\): the minimal genus of a Seifert surface bounded by \\(K\\).</li>
        <li><strong>Signature</strong> \\(\\sigma(K)\\): the signature of the symmetrized Seifert matrix.</li>
        <li><strong>Determinant</strong> \\(\\det(K)\\): \\(|\\det(V + V^{\\mathsf{T}})| = |\\Delta_K(-1)|\\), where \\(V\\) is any Seifert matrix.</li>
      </ul>
      <p>These invariants are computed and displayed in the <em>Knot Explorer</em> tab.</p>

      <details class="kl-proof">
        <summary>Proof sketch: \\(\\det(K) = |\\Delta_K(-1)|\\)</summary>
        <p>Sketch. For any Seifert matrix \\(V\\) of \\(K\\), the Alexander polynomial is \\(\\Delta_K(t) \\doteq \\det(tV - V^{\\mathsf{T}})\\) (well-defined up to \\(\\pm t^k\\)). Specializing at \\(t = -1\\):</p>
        <div class="formula-box">$$\\Delta_K(-1) \\;\\doteq\\; \\det(-V - V^{\\mathsf{T}}) \\;=\\; (-1)^{2g}\\,\\det(V + V^{\\mathsf{T}}),$$</div>
        <p>where \\(2g = \\dim H_1(\\Sigma)\\) is the size of \\(V\\). Taking absolute values gives \\(|\\Delta_K(-1)| = |\\det(V + V^{\\mathsf{T}})| = \\det(K)\\). The symmetrized matrix \\(V + V^{\\mathsf{T}}\\) is exactly the intersection form pairing cycles with their push-offs symmetrically, which is also what the double-branched cover \\(\\Sigma_2(K)\\) presents on \\(H_1\\); equivalently \\(\\det(K) = |H_1(\\Sigma_2(K); \\mathbb{Z})|\\).</p>
      </details>
    </div>

    <div class="expo-panel">
      <h3>The Knot Group</h3>
      <p>The <strong>knot group</strong> of a knot \\(K\\) is the fundamental group of its complement:</p>
      <div class="formula-box">
        $$\\pi_1(S^3 \\setminus K)$$
      </div>
      <p>This is a powerful invariant that encodes much of the topology of the knot. For example,
      the unknot is the only knot whose group is \\(\\mathbb{Z}\\). The trefoil knot group has presentation
      \\(\\langle a, b \\mid a^2 = b^3 \\rangle\\), which is isomorphic to the braid group \\(B_3\\).</p>
      <p>The knot group can be computed from any diagram using the <strong>Wirtinger presentation</strong>:
      assign a generator to each arc of the diagram and a relation at each crossing. Despite being a
      complete invariant for prime knots (by the Gordon&ndash;Luecke theorem), the knot group is difficult
      to work with computationally because group isomorphism is generally undecidable.</p>
      <p>The knot group is explored further in the <em>Miscellaneous</em> tab.</p>

      <details class="kl-proof">
        <summary>Proof sketch: trefoil group \\(\\cong \\langle a,b \\mid aba = bab\\rangle\\)</summary>
        <p>Sketch. Use the standard 3-crossing diagram of \\(3_1\\). Wirtinger assigns one meridian generator per arc: three arcs \\(a, b, c\\). Each crossing contributes a relation of the form "outgoing under = (over) \\(\\cdot\\) (incoming under) \\(\\cdot\\) (over)\\(^{-1}\\)". The three relations read \\(c = aba^{-1}\\), \\(a = bcb^{-1}\\), \\(b = cac^{-1}\\); any two imply the third (a general fact about Wirtinger presentations \u2014 there is always one redundant relation). Eliminating \\(c\\) via the first, the second becomes \\(aba = bab\\). Substituting \\(x = ab, y = aba\\) yields the alternative presentation \\(\\langle x, y \\mid x^3 = y^2\\rangle\\), the standard form of the \\((2,3)\\)-torus knot group and isomorphic to the braid group \\(B_3\\).</p>
      </details>
    </div>

    <div class="expo-panel">
      <h3>Polynomial Invariants</h3>
      <p>The <strong>Alexander polynomial</strong> \\(\\Delta_K(t)\\) was the first polynomial knot invariant, derived from the fundamental group of the knot complement. The <strong>Jones polynomial</strong> \\(V_K(q)\\), discovered via connections to statistical mechanics, is a far stronger invariant. The <strong>HOMFLY-PT polynomial</strong> \\(P_K(a,z)\\) generalizes both.</p>
      <div class="formula-box">
        <p><strong>Jones polynomial skein relation:</strong></p>
        $$ q^{-1} V_{L_+}(q) - q\\, V_{L_-}(q) = \\left(q^{1/2} - q^{-1/2}\\right) V_{L_0}(q) $$
      </div>
      <p>These polynomial invariants are explored in depth in the <em>Knot Explorer</em> tab.</p>
    </div>

    <div class="expo-panel">
      <h3>Homological Invariants</h3>
      <p><strong>Khovanov homology</strong> is a bigraded homology theory that <em>categorifies</em> the Jones polynomial: the graded Euler characteristic of Khovanov homology recovers the Jones polynomial. It is a strictly stronger invariant &mdash; there exist knots with identical Jones polynomials but distinct Khovanov homology. This invariant is explored further in the <em>Knot Explorer</em> tab.</p>
    </div>

    <div class="expo-panel">
      <h3>The Classification Problem</h3>
      <p>No single invariant is known to be a <strong>complete invariant</strong> for knots &mdash; that is, no known invariant can distinguish all pairs of non-equivalent knots. The classification problem remains one of the central challenges of knot theory. In practice, one uses a battery of invariants: if any invariant distinguishes two knots, they are provably distinct; if all known invariants agree, equivalence is suspected but not guaranteed.</p>
    </div>`;
  }

  /* ── Main render function ── */
  window.renderIntroduction = function (containerEl) {
    var knotsData = {};
    var linksData = {};
    var viewers = [];
    var activeTab = 0;

    // Build HTML structure
    containerEl.innerHTML = '';
    var controls = document.createElement('div');
    controls.className = 'fk-controls';

    var subtabs = document.createElement('div');
    subtabs.className = 'fk-subtabs';

    var tabNames = ['Overview', 'Knots & Links', 'Knot Diagrams', 'Diagrammatic Encodings', 'Braids', 'Invariants'];
    var tabBtns = [];
    tabNames.forEach(function (name, i) {
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
      // Stop all viewers
      viewers.forEach(function (v) { v.dispose(); });
      viewers = [];
      renderTab(idx);
    }

    function renderTab(idx) {
      content.innerHTML = '';
      if (idx === 0) {
        renderHome(content);
      } else if (idx === 1) {
        renderKnotsAndLinks(content, knotsData, linksData, viewers);
      } else if (idx === 2) {
        renderKnotDiagrams(content, knotsData, linksData);
      } else if (idx === 3) {
        renderEncodings(content);
      } else if (idx === 4) {
        renderBraids(content);
      } else {
        renderInvariants(content);
      }
      // Trigger KaTeX rendering
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

    // Fetch data then render first tab
    Promise.all([
      fetch('knot-explorer/data/knots.json').then(function (r) { return r.json(); }).catch(function () { return {}; }),
      fetch('knot-explorer/data/links.json').then(function (r) { return r.json(); }).catch(function () { return {}; })
    ]).then(function (results) {
      knotsData = results[0] || {};
      linksData = results[1] || {};
      renderTab(0);
    });
  };
})();
