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

`;

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

`;

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
    // Positive crossing. Over-strand: SW -> NE (one solid line).
    // Under-strand: SE -> NW (broken at the centre).
    // Arcs labelled a, b, c, d going counter-clockwise (screen y-down):
    //   a = incoming under (SE) -> b = outgoing over (NE)
    //   -> c = outgoing under (NW) -> d = incoming over (SW).
    // The CCW hint is a full 3/4-turn dashed loop around all four labels with
    // an arrowhead between a and b (SE -> NE), so the direction is unambiguous.
    return '<svg viewBox="-150 -110 300 250" width="360" height="300" style="display:block;margin:0 auto">' +
      // 3/4 dashed guide ring around the crossing, going a -> b -> c -> d CCW
      '<path d="M 78,40 A 82 82 0 1 0 -40,78" stroke="#b8b8b8" stroke-width="1.4" ' +
        'fill="none" stroke-dasharray="5,4" />' +
      // Arrowhead on the guide ring, between a (SE) and b (NE), pointing upward
      '<polygon points="84,0 76,-6 76,6" fill="#b8b8b8" />' +
      // Over-strand SW -> NE (continuous)
      '<line x1="-60" y1="60" x2="60" y2="-60" stroke="#1f3a5f" stroke-width="4" stroke-linecap="round" />' +
      // Under-strand SE -> NW (broken)
      '<line x1="60"  y1="60"  x2="14" y2="14"  stroke="#1f3a5f" stroke-width="4" stroke-linecap="round" />' +
      '<line x1="-14" y1="-14" x2="-60" y2="-60" stroke="#1f3a5f" stroke-width="4" stroke-linecap="round" />' +
      // Arrowheads: over-strand tip at NE (60,-60), under-strand tip at NW (-60,-60)
      '<polygon points="60,-60 48,-58 54,-48" fill="#b84900" />' +
      '<polygon points="-60,-60 -54,-48 -48,-58" fill="#b84900" />' +
      // Labels; circled order-numbers 1..4 make the reading order explicit
      '<text x="56"  y="80"  font-size="22" fill="#222" font-style="italic" font-weight="700">a</text>' +
      '<text x="86"  y="80"  font-size="13" fill="#2171b5" font-weight="700">(1)</text>' +
      '<text x="56"  y="-66" font-size="22" fill="#222" font-style="italic" font-weight="700">b</text>' +
      '<text x="86"  y="-66" font-size="13" fill="#2171b5" font-weight="700">(2)</text>' +
      '<text x="-66" y="-66" font-size="22" fill="#222" font-style="italic" font-weight="700">c</text>' +
      '<text x="-96" y="-66" font-size="13" fill="#2171b5" font-weight="700">(3)</text>' +
      '<text x="-66" y="80"  font-size="22" fill="#222" font-style="italic" font-weight="700">d</text>' +
      '<text x="-96" y="80"  font-size="13" fill="#2171b5" font-weight="700">(4)</text>' +
      '<text x="0" y="120" text-anchor="middle" font-size="13" fill="#555">' +
        'positive crossing \u2014 read a,b,c,d in the numbered order (CCW)' +
      '</text>' +
      '</svg>';
  }

  // Trefoil (3_1) as the closure of the 2-braid σ₁³, with all 6 arcs and all 3
  // crossings labelled. Illustrates how the PD X-tuples get filled in from a
  // full diagram.
  function trefoilLabeledSVG() {
    // Right-handed trefoil = closure of the 2-braid \u03c3\u2081\u00b3.
    // Each crossing is a positive \u03c3\u2081 (left strand over right).
    // Arc labelling chosen so that the PD code reads
    //   X_{6,3,1,4}  X_{4,1,5,2}  X_{2,5,3,6}
    // using the Bar-Natan convention  a = in-under,
    // then (b,c,d) = (in-over, out-under, out-over) going CCW from a.
    // See renderEncodings caption for the walk order 1\u21922\u2192\u2026\u21926.
    var s = '';
    s += '<svg viewBox="-120 -180 240 360" width="320" height="460" style="display:block;margin:0 auto" aria-label="Labelled trefoil PD diagram">';
    var XL = -32, XR = 32, G = 10, Y = [-80, 0, 80];
    // --- Three \u03c3\u2081 crossings, left-over-right ---
    for (var k = 0; k < 3; k++) {
      var yc = Y[k];
      // OVER strand: top-left (XL, yc-26) -> bottom-right (XR, yc+26)
      s += '<line x1="' + XL + '" y1="' + (yc - 26) + '" x2="' + XR + '" y2="' + (yc + 26) + '" stroke="#1f3a5f" stroke-width="3.4" stroke-linecap="round" />';
      // UNDER strand: top-right (XR, yc-26) -> bottom-left (XL, yc+26), with a gap around the centre.
      // Direction unit \u2248 (-0.777, 0.629).
      var ux = -0.777, uy = 0.629;
      s += '<line x1="' + XR + '" y1="' + (yc - 26) + '" x2="' + (-ux * G) + '" y2="' + (yc - uy * G) + '" stroke="#1f3a5f" stroke-width="3.4" stroke-linecap="round" />';
      s += '<line x1="' + (ux * G) + '" y1="' + (yc + uy * G) + '" x2="' + XL + '" y2="' + (yc + 26) + '" stroke="#1f3a5f" stroke-width="3.4" stroke-linecap="round" />';
      // Crossing label X_k with a tiny white halo so it stays legible off the strand.
      s += '<g transform="translate(' + (XR + 28) + ' ' + (yc + 4) + ')">' +
           '<text font-size="15" font-weight="700" fill="#b84900">X<tspan font-size="10" dy="3">' + (k + 1) + '</tspan></text>' +
           '</g>';
    }
    // --- Straight inter-crossing runs (4 inner verticals) ---
    // arc 4: X1 bot-right -> X2 top-right (inner right upper)
    s += '<line x1="' + XR + '" y1="' + (Y[0] + 26) + '" x2="' + XR + '" y2="' + (Y[1] - 26) + '" stroke="#1f3a5f" stroke-width="3.4" />';
    // arc 5: X2 bot-left -> X3 top-left (inner left lower)
    s += '<line x1="' + XL + '" y1="' + (Y[1] + 26) + '" x2="' + XL + '" y2="' + (Y[2] - 26) + '" stroke="#1f3a5f" stroke-width="3.4" />';
    // arc 1: X1 bot-left -> X2 top-left (inner left upper)
    s += '<line x1="' + XL + '" y1="' + (Y[0] + 26) + '" x2="' + XL + '" y2="' + (Y[1] - 26) + '" stroke="#1f3a5f" stroke-width="3.4" />';
    // arc 2: X2 bot-right -> X3 top-right (inner right lower)
    s += '<line x1="' + XR + '" y1="' + (Y[1] + 26) + '" x2="' + XR + '" y2="' + (Y[2] - 26) + '" stroke="#1f3a5f" stroke-width="3.4" />';
    // --- Outer closure arcs (arc 3 = left, arc 6 = right) ---
    s += '<path d="M ' + XL + ' ' + (Y[0] - 26) + ' C -90 ' + (Y[0] - 26) + ', -90 ' + (Y[2] + 26) + ', ' + XL + ' ' + (Y[2] + 26) + '" stroke="#1f3a5f" stroke-width="3.4" fill="none" />';
    s += '<path d="M ' + XR + ' ' + (Y[0] - 26) + ' C 90 ' + (Y[0] - 26) + ', 90 ' + (Y[2] + 26) + ', ' + XR + ' ' + (Y[2] + 26) + '" stroke="#1f3a5f" stroke-width="3.4" fill="none" />';
    // --- Orientation arrows ---
    // One arrow per arc, all pointing in the walk direction. Inner arcs flow
    // downward (braid direction); outer closure arcs flow upward.
    function dnArrow(x, y) {
      // triangle pointing down, apex at (x, y+6)
      return '<polygon points="' + x + ',' + (y + 6) + ' ' + (x - 5) + ',' + (y - 3) + ' ' + (x + 5) + ',' + (y - 3) + '" fill="#b84900" />';
    }
    function upArrow(x, y) {
      return '<polygon points="' + x + ',' + (y - 6) + ' ' + (x - 5) + ',' + (y + 3) + ' ' + (x + 5) + ',' + (y + 3) + '" fill="#b84900" />';
    }
    s += dnArrow(XL, -40);   // arc 1 (inner left upper)
    s += dnArrow(XR,  40);   // arc 2 (inner right lower)
    s += upArrow(-90, 0);    // arc 3 (left closure, upward)
    s += dnArrow(XR, -40);   // arc 4 (inner right upper)
    s += dnArrow(XL,  40);   // arc 5 (inner left lower)
    s += upArrow( 90, 0);    // arc 6 (right closure, upward)
    // --- Arc number labels (1..6). Off to the side of each strand,
    //     with small white halo rectangles so they never sit on the strand.
    var tagStyle = ' font-size="15" font-weight="700" fill="#2171b5"';
    function arcLabel(x, y, n) {
      return '<rect x="' + (x - 8) + '" y="' + (y - 11) + '" width="16" height="16" fill="#ffffff" opacity="0.9" />' +
             '<text x="' + x + '" y="' + (y + 2) + '" text-anchor="middle"' + tagStyle + '>' + n + '</text>';
    }
    s += arcLabel(XL - 12, -40, 1);   // arc 1: just to the left of inner-left-upper
    s += arcLabel(XR + 12,  40, 2);   // arc 2: just to the right of inner-right-lower
    s += arcLabel(-104, 0, 3);        // arc 3: on left closure (outside)
    s += arcLabel(XR + 12, -40, 4);   // arc 4: just to the right of inner-right-upper
    s += arcLabel(XL - 12,  40, 5);   // arc 5: just to the left of inner-left-lower
    s += arcLabel( 104, 0, 6);        // arc 6: on right closure (outside)
    // --- Caption ---
    s += '<text x="0" y="165" text-anchor="middle" font-size="13" fill="#555">' +
         'Trefoil 3<tspan font-size="10" dy="2">1</tspan><tspan dy="-2"> as closure of \u03c3<tspan font-size="10" dy="2">1</tspan><tspan dy="-2">\u00b3</tspan></tspan>; arcs 1\u20136 walk-ordered, crossings X<tspan font-size="10" dy="2">1</tspan><tspan dy="-2">,X<tspan font-size="10" dy="2">2</tspan><tspan dy="-2">,X<tspan font-size="10" dy="2">3</tspan><tspan dy="-2">.</tspan></tspan></tspan></tspan>' +
         '</text>';
    s += '</svg>';
    return s;
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
          '<div class="kl-head">Example: right-handed trefoil \\(3_1\\) \u2014 fully labeled</div>' +
          '<p>The picture below draws the trefoil as the closure of the 2-braid \\(\\sigma_1^3\\). ' +
          'Each of the three crossings \\(X_1, X_2, X_3\\) is a \\(\\sigma_1\\) (left strand over right). ' +
          'Walking along the knot starting from the under-exit of \\(X_1\\) and following the ' +
          'orientation, we label the six arcs \\(1, 2, \\ldots, 6\\) in the order encountered. ' +
          'Arcs \\(1\\) and \\(4\\) are the outside closure loops.</p>' +
          '<div class="kl-diagram">' + trefoilLabeledSVG() + '</div>' +
          '<p>Reading each crossing \\(X_i = X_{a,b,c,d}\\) with \\(a =\\) incoming under-arc and ' +
          'going counter-clockwise produces</p>' +
          '<div class="formula-box">$$\\mathrm{PD}(3_1) \\;=\\; X_{6,3,1,4}\\ \\ X_{4,1,5,2}\\ \\ X_{2,5,3,6}.$$</div>' +
          '<p>Different starting points / walk directions give different numerical labelings of ' +
          'the same underlying data; the KnotAtlas convention for \\(3_1\\), for instance, writes ' +
          '\\(X_{1,4,2,5}\\ \\ X_{3,6,4,1}\\ \\ X_{5,2,6,3}\\). Either presentation, fed into ' +
          'KnotTheory` or this app\u2019s Knot Explorer, produces ' +
          '\\(\\Delta_{3_1}(t) = t - 1 + t^{-1}\\).</p>' +
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
      <h3>Pictures of braid generators and relations</h3>
      <div style="display:flex;flex-wrap:wrap;gap:24px;justify-content:center;align-items:flex-start;">
        <figure style="margin:0;text-align:center;max-width:150px;">
          <svg width="140" height="170" viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg" aria-label="Generator sigma_i">
            <g fill="none" stroke-linecap="round" stroke-width="4">
              <!-- Under strand (blue) drawn as TWO segments with explicit break at crossing (70,85). -->
              <line x1="100" y1="20" x2="78" y2="71" stroke="#2171b5"/>
              <line x1="62" y1="99" x2="40" y2="150" stroke="#2171b5"/>
              <!-- Over strand (orange) continuous, drawn on top. -->
              <line x1="40" y1="20" x2="100" y2="150" stroke="#d94801"/>
            </g>
            <text x="40" y="14" font-size="11" fill="#666" text-anchor="middle">i</text>
            <text x="100" y="14" font-size="11" fill="#666" text-anchor="middle">i+1</text>
            <text x="40" y="164" font-size="11" fill="#666" text-anchor="middle">i+1</text>
            <text x="100" y="164" font-size="11" fill="#666" text-anchor="middle">i</text>
          </svg>
          <figcaption style="font-size:0.88rem;color:#555;">
            Generator \\(\\sigma_i\\): strand at position \\(i\\) crosses
            <strong>over</strong> strand at position \\(i+1\\) (orange over blue).
          </figcaption>
        </figure>

        <figure style="margin:0;text-align:center;max-width:150px;">
          <svg width="140" height="170" viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg" aria-label="Generator sigma_i inverse">
            <g fill="none" stroke-linecap="round" stroke-width="4">
              <!-- Under strand (orange) drawn as TWO segments with explicit break at (70,85). -->
              <line x1="40" y1="20" x2="62" y2="71" stroke="#d94801"/>
              <line x1="78" y1="99" x2="100" y2="150" stroke="#d94801"/>
              <!-- Over strand (blue) continuous, drawn on top. -->
              <line x1="100" y1="20" x2="40" y2="150" stroke="#2171b5"/>
            </g>
            <text x="40" y="14" font-size="11" fill="#666" text-anchor="middle">i</text>
            <text x="100" y="14" font-size="11" fill="#666" text-anchor="middle">i+1</text>
            <text x="40" y="164" font-size="11" fill="#666" text-anchor="middle">i+1</text>
            <text x="100" y="164" font-size="11" fill="#666" text-anchor="middle">i</text>
          </svg>
          <figcaption style="font-size:0.88rem;color:#555;">
            Inverse \\(\\sigma_i^{-1}\\): strand at position \\(i+1\\) crosses
            <strong>over</strong> strand at position \\(i\\) (blue over orange).
          </figcaption>
        </figure>

        <figure style="margin:0;text-align:center;max-width:360px;">
          <svg width="360" height="230" viewBox="0 0 360 230" xmlns="http://www.w3.org/2000/svg" aria-label="Braid relation sigma_i sigma_{i+1} sigma_i equals sigma_{i+1} sigma_i sigma_{i+1}">
            <!--
              3 strands tracked by colour (R=start-pos-1, B=2, G=3).
              Straight-line X crossings.  Under-strand is drawn as two
              separate polylines with an explicit gap around the crossing
              centre; over-strand is a single polyline on top.
            -->
            <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5">
              <!-- ===== LHS: sigma_i sigma_{i+1} sigma_i.  cols x = 20, 70, 120. ===== -->
              <!-- R (over at c1, over at c2, unaffected at c3): no breaks. -->
              <polyline points="20,15 20,30 70,60 70,80 120,110 120,215" stroke="#c0392b"/>
              <!-- B: under at c1 (70,30 -> 20,60), unaffected at c2, OVER at c3 (no break). -->
              <polyline points="70,15 70,30 52.5,40.5" stroke="#2e86de"/>
              <polyline points="37.5,49.5 20,60 20,130 70,160 70,215" stroke="#2e86de"/>
              <!-- G: unaffected at c1, UNDER at c2 (120,80->70,110), UNDER at c3 (70,130->20,160). -->
              <polyline points="120,15 120,80 102.5,90.5" stroke="#27ae60"/>
              <polyline points="87.5,99.5 70,110 70,130 52.5,140.5" stroke="#27ae60"/>
              <polyline points="37.5,149.5 20,160 20,215" stroke="#27ae60"/>

              <!-- ===== RHS: sigma_{i+1} sigma_i sigma_{i+1}.  cols x = 220, 270, 320. ===== -->
              <!-- R unaffected at c1, over at c2 and c3: single polyline. -->
              <polyline points="220,15 220,80 270,110 270,130 320,160 320,215" stroke="#c0392b"/>
              <!-- B over at c1, unaffected at c2, UNDER at c3 (320,130 -> 270,160). -->
              <polyline points="270,15 270,30 320,60 320,130 302.5,140.5" stroke="#2e86de"/>
              <polyline points="287.5,149.5 270,160 270,215" stroke="#2e86de"/>
              <!-- G UNDER at c1 (320,30->270,60) and UNDER at c2 (270,80->220,110); unaffected c3. -->
              <polyline points="320,15 320,30 302.5,40.5" stroke="#27ae60"/>
              <polyline points="287.5,49.5 270,60 270,80 252.5,90.5" stroke="#27ae60"/>
              <polyline points="237.5,99.5 220,110 220,215" stroke="#27ae60"/>
            </g>
            <text x="180" y="120" font-size="26" fill="#333" text-anchor="middle">=</text>
            <!-- Endpoint labels (same colour order on both sides, as a sanity check) -->
            <text x="20" y="12" font-size="10" fill="#c0392b" text-anchor="middle">1</text>
            <text x="70" y="12" font-size="10" fill="#2e86de" text-anchor="middle">2</text>
            <text x="120" y="12" font-size="10" fill="#27ae60" text-anchor="middle">3</text>
            <text x="220" y="12" font-size="10" fill="#c0392b" text-anchor="middle">1</text>
            <text x="270" y="12" font-size="10" fill="#2e86de" text-anchor="middle">2</text>
            <text x="320" y="12" font-size="10" fill="#27ae60" text-anchor="middle">3</text>
          </svg>
          <figcaption style="font-size:0.88rem;color:#555;">
            <strong>Braid relation</strong>
            \\(\\sigma_i\\,\\sigma_{i+1}\\,\\sigma_i = \\sigma_{i+1}\\,\\sigma_i\\,\\sigma_{i+1}\\).
            The three coloured strands start in the same order on both sides and finish in the
            same permuted order \\((3,2,1)\\); each strand&rsquo;s over/under pattern matches across
            the equality, so the two braid words are isotopic rel endpoints
            (the &ldquo;triangle move&rdquo; / Yang&ndash;Baxter).
          </figcaption>
        </figure>

        <figure style="margin:0;text-align:center;max-width:440px;">
          <svg width="430" height="220" viewBox="0 0 430 220" xmlns="http://www.w3.org/2000/svg" aria-label="Commutation sigma_i sigma_j equals sigma_j sigma_i for |i-j| at least 2">
            <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5">
              <!-- ===== LHS: sigma_i (top, y=40..70) then sigma_j (bottom, y=100..130). ===== -->
              <!-- cols: i=30, i+1=75, j=130, j+1=175 -->
              <!-- Blue (col 30): vertical 20->40, diag to (75,70) [OVER], vertical to 200 -->
              <polyline points="30,20 30,40 75,70 75,200" stroke="#2171b5"/>
              <!-- Orange (col 75): vert to 40, diag to (30,70) UNDER (two pieces), vert to 200 -->
              <polyline points="75,20 75,40 60.25,50.5" stroke="#d94801"/>
              <polyline points="44.75,59.5 30,70 30,200" stroke="#d94801"/>
              <!-- Green (col 130): vert to 100, diag to (175,130) [OVER], vert to 200 -->
              <polyline points="130,20 130,100 175,130 175,200" stroke="#27ae60"/>
              <!-- Purple (col 175): vert to 100, diag to (130,130) UNDER, vert to 200 -->
              <polyline points="175,20 175,100 160.25,110.5" stroke="#984ea3"/>
              <polyline points="144.75,119.5 130,130 130,200" stroke="#984ea3"/>
            </g>
            <!-- equality -->
            <text x="220" y="115" font-size="26" fill="#333" text-anchor="middle">=</text>
            <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5">
              <!-- ===== RHS: sigma_j (top, y=40..70) then sigma_i (bottom, y=100..130). ===== -->
              <!-- cols: i=250, i+1=295, j=350, j+1=395 -->
              <!-- Blue (col 250, i): vert to 100, diag to (295,130) [OVER], vert to 200 -->
              <polyline points="250,20 250,100 295,130 295,200" stroke="#2171b5"/>
              <!-- Orange (col 295, i+1): vert to 100, diag to (250,130) UNDER -->
              <polyline points="295,20 295,100 280.25,110.5" stroke="#d94801"/>
              <polyline points="264.75,119.5 250,130 250,200" stroke="#d94801"/>
              <!-- Green (col 350, j): vert to 40, diag to (395,70) OVER, vert to 200 -->
              <polyline points="350,20 350,40 395,70 395,200" stroke="#27ae60"/>
              <!-- Purple (col 395, j+1): vert to 40, diag to (350,70) UNDER -->
              <polyline points="395,20 395,40 380.25,50.5" stroke="#984ea3"/>
              <polyline points="364.75,59.5 350,70 350,200" stroke="#984ea3"/>
            </g>
            <!-- Labels -->
            <text x="30" y="14" font-size="10" fill="#666" text-anchor="middle">i</text>
            <text x="75" y="14" font-size="10" fill="#666" text-anchor="middle">i+1</text>
            <text x="130" y="14" font-size="10" fill="#666" text-anchor="middle">j</text>
            <text x="175" y="14" font-size="10" fill="#666" text-anchor="middle">j+1</text>
            <text x="250" y="14" font-size="10" fill="#666" text-anchor="middle">i</text>
            <text x="295" y="14" font-size="10" fill="#666" text-anchor="middle">i+1</text>
            <text x="350" y="14" font-size="10" fill="#666" text-anchor="middle">j</text>
            <text x="395" y="14" font-size="10" fill="#666" text-anchor="middle">j+1</text>
            <text x="215" y="215" font-size="11" fill="#555" text-anchor="middle">\\(|i-j|\\ge 2\\)</text>
          </svg>
          <figcaption style="font-size:0.88rem;color:#555;">
            <strong>Commutation</strong>
            \\(\\sigma_i\\sigma_j = \\sigma_j\\sigma_i\\) for \\(|i-j|\\geq 2\\):
            the two crossings touch disjoint pairs of strands, so their vertical order
            is immaterial &mdash; sliding one past the other is a planar isotopy.
          </figcaption>
        </figure>

        <figure style="margin:0;text-align:center;max-width:260px;">
          <svg width="230" height="200" viewBox="0 0 230 200" xmlns="http://www.w3.org/2000/svg">
            <!-- Dashed closure arcs (behind), STRICTLY nested rounded rectangles on the right. -->
            <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" stroke-dasharray="4,3">
              <!-- Blue (leftmost strand, x=80): outermost rectangle, extent x=[80,215], y=[8,192] -->
              <path d="M80,50 V18 Q80,8 90,8 H207 Q215,8 215,18 V182 Q215,192 207,192 H90 Q80,192 80,182 V150" stroke="#2171b5"/>
              <!-- Orange (middle strand, x=110): middle rectangle, extent x=[110,195], y=[20,180] -->
              <path d="M110,50 V30 Q110,20 120,20 H187 Q195,20 195,30 V170 Q195,180 187,180 H120 Q110,180 110,170 V150" stroke="#d94801"/>
              <!-- Green (rightmost strand, x=140): innermost rectangle, extent x=[140,175], y=[32,168] -->
              <path d="M140,50 V42 Q140,32 150,32 H167 Q175,32 175,42 V158 Q175,168 167,168 H150 Q140,168 140,158 V150" stroke="#27ae60"/>
            </g>
            <!-- Braid-body box (schematic beta inside) -->
            <rect x="65" y="50" width="90" height="100" fill="#ffffff" stroke="#aaa" stroke-width="1" rx="4"/>
            <text x="110" y="106" font-size="28" fill="#555" text-anchor="middle" font-style="italic">&#946;</text>
            <!-- Strand stubs entering/leaving the box -->
            <g fill="none" stroke-linecap="round" stroke-width="3">
              <line x1="80" y1="45" x2="80" y2="55" stroke="#2171b5"/>
              <line x1="80" y1="145" x2="80" y2="155" stroke="#2171b5"/>
              <line x1="110" y1="45" x2="110" y2="55" stroke="#d94801"/>
              <line x1="110" y1="145" x2="110" y2="155" stroke="#d94801"/>
              <line x1="140" y1="45" x2="140" y2="55" stroke="#27ae60"/>
              <line x1="140" y1="145" x2="140" y2="155" stroke="#27ae60"/>
            </g>
            <text x="110" y="40" font-size="10" fill="#666" text-anchor="middle">top</text>
            <text x="110" y="172" font-size="10" fill="#666" text-anchor="middle">bottom</text>
          </svg>
          <figcaption style="font-size:0.88rem;color:#555;">
            <strong>Closure</strong> \\(\\widehat{\\beta}\\): connect top endpoint \\(k\\) to
            bottom endpoint \\(k\\) by an arc behind the braid (dashed). Every oriented link
            in \\(S^3\\) arises this way (Alexander&rsquo;s theorem).
          </figcaption>
        </figure>
      </div>
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
      <h3>Braid closure and Alexander&rsquo;s Theorem</h3>
      <p>The <strong>closure</strong> of a braid \\(\\beta \\in B_n\\), written \\(\\widehat{\\beta}\\),
      is the oriented link obtained by joining the \\(k\\)-th top endpoint of the braid to the
      \\(k\\)-th bottom endpoint by a simple arc running behind the braid body, for each
      \\(k = 1,\\ldots,n\\). The resulting closed curves inherit an orientation from the downward
      flow of the strands. The closure diagrammed in the last figure above is the canonical
      picture: one draws the braid inside a disk and adds \\(n\\) nested arcs outside the disk
      to close it up.</p>
      <p><span class="kl-term" title="Alexander (1923): every tame link in S\u00b3 is the closure of a braid on some finite number of strands.">Alexander&rsquo;s theorem</span> (1923) states that <em>every</em> tame oriented link
      \\(L \\subset S^3\\) is ambient-isotopic to \\(\\widehat{\\beta}\\) for some braid
      \\(\\beta \\in B_n\\) on some finite number of strands. The proof (modernised by Yamada
      and Vogel) gives a deterministic algorithm turning any diagram into a braided diagram by
      repeatedly redirecting &ldquo;bad&rdquo; arcs across a chosen axis.</p>
      <p>Examples:</p>
      <ul style="line-height:1.7;">
        <li>The unknot: \\(\\widehat{1} \\in B_1\\) (a single straight strand closed up).</li>
        <li>The right-handed trefoil \\(3_1\\): \\(\\widehat{\\sigma_1^{3}} \\in B_2\\).</li>
        <li>The Hopf link: \\(\\widehat{\\sigma_1^{2}} \\in B_2\\) (two components because the
        permutation of \\(\\sigma_1^{2}\\) is trivial).</li>
        <li>The figure-eight \\(4_1\\):
        \\(\\widehat{\\sigma_1\\sigma_2^{-1}\\sigma_1\\sigma_2^{-1}} \\in B_3\\).</li>
        <li>The \\((p,q)\\) torus knot: \\(\\widehat{(\\sigma_1\\sigma_2\\cdots\\sigma_{p-1})^{q}} \\in B_p\\).</li>
      </ul>
      <p>The number of components of \\(\\widehat{\\beta}\\) equals the number of cycles in the
      induced permutation \\(\\pi(\\beta) \\in S_n\\) obtained by forgetting over/under information.</p>

      <details class="kl-proof">
        <summary>Proof sketch: Alexander's theorem (1923)</summary>
        <p>Sketch. Fix an oriented diagram \\(D\\) of \\(L\\) and a base point \\(p\\) in the plane off the diagram. Call an arc <em>good</em> if it winds around \\(p\\) in the orientation sense and <em>bad</em> otherwise. A bad arc can be eliminated by an "Alexander trick": isotope a portion of the arc across \\(p\\), replacing it by two good arcs (and changing the diagram by a Markov-stabilization-like move). After finitely many tricks all arcs are good; the diagram then wraps around \\(p\\) like a braid closed around the axis through \\(p\\). Reading off the over/under crossings level by level gives a braid word \\(\\beta\\) with \\(\\widehat{\\beta} = L\\). A modern proof uses Yamada\u2013Vogel's algorithm, which makes the trick deterministic.</p>
      </details>
    </div>

    <div class="expo-panel">
      <h3>Markov&rsquo;s Theorem</h3>
      <p><span class="kl-term" title="Markov (1936): two braids (possibly on different numbers of strands) have ambient-isotopic closures iff related by conjugation in B_n and stabilisation B_n \u2194 B_{n+1} via \u03b2 \u2194 \u03b2\u03c3_n^{\u00b11}.">Markov&rsquo;s theorem</span> (1936) says that two braids
      \\(\\beta \\in B_n\\) and \\(\\beta' \\in B_m\\) have ambient-isotopic closures
      \\(\\widehat{\\beta} \\cong \\widehat{\\beta'}\\) if and only if they are related by a
      finite sequence of <strong>Markov moves</strong>:</p>
      <ul style="line-height:1.8;">
        <li><strong>(M1) Conjugation:</strong>
        \\(\\beta \\mapsto \\alpha \\beta \\alpha^{-1}\\) in \\(B_n\\) for any
        \\(\\alpha \\in B_n\\). Geometrically this is a planar isotopy of the closure:
        the conjugating word \\(\\alpha\\) at the top cancels \\(\\alpha^{-1}\\) at the bottom
        after the closure arcs are drawn.</li>
        <li><strong>(M2) Stabilisation:</strong>
        \\(\\beta \\in B_n \\longleftrightarrow \\beta\\,\\sigma_n^{\\pm 1} \\in B_{n+1}\\).
        Adding one straight strand to the right and introducing a single crossing with the
        previous rightmost strand does not change the closure &mdash; the new strand plus the
        kink it creates is a Reidemeister&nbsp;I move performed on the closure.</li>
      </ul>
      <p>Together, Alexander&rsquo;s and Markov&rsquo;s theorems give a purely algebraic
      characterisation of oriented link types:</p>
      <div class="formula-box">
        $$\\{\\text{oriented links in } S^3\\}/\\text{isotopy}
        \\;\\longleftrightarrow\\;
        \\Bigl(\\bigsqcup_{n\\ge 1} B_n\\Bigr) \\big/ (\\text{M1, M2}).$$
      </div>
      <p>This is the algebraic engine behind most quantum link invariants. To build an invariant
      \\(V\\) of links one produces a function \\(\\widetilde V\\) on \\(\\bigsqcup_n B_n\\) and
      shows that it is invariant under both Markov moves. Invariance under M1 is automatic for
      any <em>trace</em> on \\(\\mathbb{C}[B_n]\\); invariance under M2 is a genuine constraint
      that determines the normalisation. The Jones polynomial, HOMFLY&ndash;PT, Kauffman
      two-variable, and all Reshetikhin&ndash;Turaev invariants are built this way.</p>
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
      <p>The knot group is explored further in the <em>Miscellaneous</em> tab; the next panel shows
      how to read a presentation directly off a diagram.</p>

      <details class="kl-proof">
        <summary>Proof sketch: trefoil group \\(\\cong \\langle a,b \\mid aba = bab\\rangle\\)</summary>
        <p>Sketch. Use the standard 3-crossing diagram of \\(3_1\\). Wirtinger assigns one meridian generator per arc: three arcs \\(a, b, c\\). Each crossing contributes a relation of the form &ldquo;outgoing under = (over) \\(\\cdot\\) (incoming under) \\(\\cdot\\) (over)\\(^{-1}\\)&rdquo;. The three relations read \\(c = aba^{-1}\\), \\(a = bcb^{-1}\\), \\(b = cac^{-1}\\); any two imply the third (a general fact about Wirtinger presentations &mdash; there is always one redundant relation). Eliminating \\(c\\) via the first, the second becomes \\(aba = bab\\). Substituting \\(x = ab, y = aba\\) yields the alternative presentation \\(\\langle x, y \\mid x^3 = y^2\\rangle\\), the standard form of the \\((2,3)\\)-torus knot group and isomorphic to the braid group \\(B_3\\).</p>
      </details>
    </div>

    <div class="expo-panel">
      <h3>Wirtinger presentation of the knot group</h3>
      <p>Given an oriented diagram \\(D\\) of \\(K\\), the <strong>Wirtinger presentation</strong>
      (Wirtinger 1905) writes \\(\\pi_1(S^3 \\setminus K)\\) as a finitely presented group read
      directly off \\(D\\):</p>
      <ul style="line-height:1.8;">
        <li><strong>Generators:</strong> one for each <em>arc</em> of \\(D\\) (a maximal segment
        of the diagram between two under-crossings). Each generator is the homotopy class of
        a small oriented loop &mdash; a <em>meridian</em> &mdash; linking the corresponding arc
        once positively.</li>
        <li><strong>Relations:</strong> one per crossing. At a crossing with over-arc
        \\(a\\) and the two broken under-arcs \\(b\\) (incoming) and \\(c\\) (outgoing), write
          <div class="formula-box">$$c \\;=\\; a\\,b\\,a^{-1} \\qquad (\\text{positive crossing})$$</div>
          <div class="formula-box">$$c \\;=\\; a^{-1}\\,b\\,a \\qquad (\\text{negative crossing})$$</div>
        &mdash; the meridian around the outgoing under-arc is conjugated by the over-strand
        meridian, with the sign of the conjugation matching the sign of the crossing.</li>
      </ul>
      <p>A diagram with \\(n\\) crossings then has \\(n\\) generators and \\(n\\) relations, but
      <em>one relation is always a consequence of the others</em>, so the deficiency is
      \\(n - (n - 1) = 1\\) &mdash; consistent with \\(H_1(S^3 \\setminus K) \\cong \\mathbb{Z}\\).</p>
      <div class="kl-diagram" style="text-align:center;margin:1rem 0;">
        <svg width="280" height="180" viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg" aria-label="Wirtinger relation at a positive crossing">
          <g fill="none" stroke-linecap="round">
            <!-- Over strand a: horizontal left-to-right, arrow head on the right -->
            <line x1="30" y1="90" x2="250" y2="90" stroke="#d94801" stroke-width="5"/>
            <polygon points="250,90 240,85 240,95" fill="#d94801"/>
            <!-- Under strand: vertical, top (b) -> bottom (c), broken at (140,90) -->
            <line x1="140" y1="20" x2="140" y2="78" stroke="#2171b5" stroke-width="3"/>
            <line x1="140" y1="102" x2="140" y2="160" stroke="#2171b5" stroke-width="3"/>
            <polygon points="140,160 135,150 145,150" fill="#2171b5"/>
          </g>
          <text x="260" y="94" font-size="14" fill="#d94801" font-weight="700">a</text>
          <text x="146" y="40" font-size="14" fill="#2171b5" font-weight="700">b</text>
          <text x="146" y="150" font-size="14" fill="#2171b5" font-weight="700">c</text>
          <text x="140" y="176" font-size="12" fill="#555" text-anchor="middle">positive crossing: \u00a0 c = a b a\u207b\u00b9</text>
        </svg>
      </div>
      <div class="kl-example">
        <div class="kl-head">Worked example: right-handed trefoil \\(3_1\\)</div>
        <p>The standard 3-crossing diagram of \\(3_1\\) has three arcs \\(a, b, c\\) and three
        positive crossings. Reading the relation at each crossing (over-arc then the two
        under-arcs in orientation order) gives</p>
        <div class="formula-box">$$c = a\\,b\\,a^{-1}, \\qquad a = b\\,c\\,b^{-1}, \\qquad b = c\\,a\\,c^{-1}.$$</div>
        <p>Any two of these imply the third. Using the first to eliminate
        \\(c = a b a^{-1}\\) in the second:</p>
        <div class="formula-box">$$a = b (a b a^{-1}) b^{-1} \\;\\Longrightarrow\\; a b a = b a b.$$</div>
        <p>So the trefoil group reduces to the two-generator, one-relation presentation</p>
        <div class="formula-box">$$\\pi_1(S^3 \\setminus 3_1) \\;\\cong\\; \\langle a, b \\mid a b a = b a b\\rangle,$$</div>
        <p>the braid group \\(B_3\\). (The substitution \\(x = aba, y = ab\\) gives the alternative
        torus-knot form \\(\\langle x, y \\mid x^2 = y^3\\rangle\\).)</p>
      </div>
      <p>The abelianisation of a Wirtinger presentation is always \\(\\mathbb{Z}\\): every relation
      \\(c = a b a^{\\pm 1}\\) becomes \\(c = b\\) modulo commutators, and all arcs turn out to be
      conjugate (hence equal) generators. That is the statement \\(H_1(S^3 \\setminus K) \\cong \\mathbb{Z}\\).
      The non-abelian information in the Wirtinger presentation is precisely what distinguishes
      the knot group from that of the unknot.</p>
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
      <h3>No single invariant tells the whole story</h3>
      <p>In practice one uses a <em>battery</em> of invariants. Each invariant is blind to some pairs of knots; knots one invariant confuses, another often separates. The table below compares four knots against several classical invariants:</p>
      <table class="kl-table" style="width:100%;max-width:720px;margin:0 auto;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid #999;">
            <th style="text-align:left;padding:6px 10px;">Knot</th>
            <th style="padding:6px 10px;">\\(c(K)\\)</th>
            <th style="padding:6px 10px;">\\(\\Delta_K(t)\\)</th>
            <th style="padding:6px 10px;">\\(V_K(q)\\) (schematic)</th>
            <th style="padding:6px 10px;">\\(\\sigma(K)\\)</th>
          </tr>
        </thead>
        <tbody style="line-height:1.6;">
          <tr style="border-bottom:1px solid #ddd;">
            <td style="padding:6px 10px;">\\(3_1\\) (trefoil, right-handed)</td>
            <td style="text-align:center;">3</td>
            <td style="text-align:center;">\\(t - 1 + t^{-1}\\)</td>
            <td style="text-align:center;">\\(-q^{-4} + q^{-3} + q^{-1}\\)</td>
            <td style="text-align:center;">\\(-2\\)</td>
          </tr>
          <tr style="border-bottom:1px solid #ddd;">
            <td style="padding:6px 10px;">\\(\\overline{3_1}\\) (trefoil, mirror)</td>
            <td style="text-align:center;">3</td>
            <td style="text-align:center;">\\(t - 1 + t^{-1}\\)</td>
            <td style="text-align:center;">\\(-q^{4} + q^{3} + q\\)</td>
            <td style="text-align:center;">\\(+2\\)</td>
          </tr>
          <tr style="border-bottom:1px solid #ddd;">
            <td style="padding:6px 10px;">\\(4_1\\) (figure-eight)</td>
            <td style="text-align:center;">4</td>
            <td style="text-align:center;">\\(-t + 3 - t^{-1}\\)</td>
            <td style="text-align:center;">\\(q^{-2} - q^{-1} + 1 - q + q^{2}\\)</td>
            <td style="text-align:center;">\\(0\\)</td>
          </tr>
          <tr style="border-bottom:1px solid #ddd;">
            <td style="padding:6px 10px;">Conway knot \\(11n34\\)</td>
            <td style="text-align:center;">11</td>
            <td style="text-align:center;">\\(1\\)</td>
            <td style="text-align:center;">non-trivial, \\(\\ne V_{11n42}\\)</td>
            <td style="text-align:center;">\\(0\\)</td>
          </tr>
          <tr>
            <td style="padding:6px 10px;">Kinoshita&ndash;Terasaka \\(11n42\\)</td>
            <td style="text-align:center;">11</td>
            <td style="text-align:center;">\\(1\\)</td>
            <td style="text-align:center;">non-trivial, \\(\\ne V_{11n34}\\)</td>
            <td style="text-align:center;">\\(0\\)</td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top:12px;">Several morals jump out:</p>
      <ul>
        <li><strong>Alexander misses chirality.</strong> The right-handed trefoil and its mirror have identical \\(\\Delta_K(t)\\), yet they are distinct knots &mdash; Jones (\\(V_K\\)) and signature (\\(\\sigma\\)) see the chirality; Alexander cannot.</li>
        <li><strong>Alexander cannot separate Conway from Kinoshita&ndash;Terasaka.</strong> Both have \\(\\Delta_K(t) = 1\\), and both have signature \\(0\\) &mdash; these classical invariants are powerless. Jones sees a difference, and more decisively the Rasmussen \\(s\\)-invariant and knot Floer homology \\(\\widehat{HFK}\\) distinguish them; \\(11n42\\) is smoothly slice while \\(11n34\\) is not (Piccirillo 2020, using these finer invariants).</li>
        <li><strong>Signature is a chirality detector.</strong> \\(\\sigma(\\overline{K}) = -\\sigma(K)\\), so \\(\\sigma = 0\\) is forced on any amphichiral knot such as \\(4_1\\); and \\(\\sigma(3_1) \\ne \\sigma(\\overline{3_1})\\) detects that the trefoil is chiral.</li>
      </ul>
      <p>The lesson: each invariant is a projection that collapses some distinctions. Modern knot theory uses a tower of them &mdash; polynomial, homological, concordance-theoretic &mdash; with strictly increasing distinguishing power.</p>
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
