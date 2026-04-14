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

    // Close braid: trace cycles in permutation
    const visited = new Array(numStrands).fill(false);
    const components = [];
    for (let i = 0; i < numStrands; i++) {
      if (visited[i]) continue;
      const cycle = [];
      let cur = i;
      while (!visited[cur]) {
        visited[cur] = true;
        cycle.push(cur);
        cur = perm[cur];
      }
      // Concatenate strand points for this cycle, adding closure arcs
      let allPts = [];
      for (const s of cycle) {
        allPts = allPts.concat(strandPoints[s]);
      }
      // Add closure: connect last point back to first
      const first = allPts[0], last = allPts[allPts.length - 1];
      const midClose = {
        x: (first.x + last.x) / 2 + 1.5,
        y: (first.y + last.y) / 2,
        z: (first.z + last.z) / 2
      };
      allPts.push(midClose);
      allPts.push({ x: first.x, y: first.y, z: first.z });
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
      const span = Math.max(Math.max(...allX) - Math.min(...allX),
        Math.max(...allY) - Math.min(...allY),
        Math.max(...allZ) - Math.min(...allZ)) || 1;
      const scale = 3 / span;

      for (let ci = 0; ci < components.length; ci++) {
        const pts = components[ci].map(p =>
          new THREE.Vector3((p.x - cx) * scale, (p.y - cy) * scale, (p.z - cz) * scale)
        );
        const curve = new THREE.CatmullRomCurve3(pts, true);
        const geo = new THREE.TubeGeometry(curve, 128, 0.12, 12, true);
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

  /* ── Home / Introduction sub-tab ── */
  function renderHome(el) {
    el.innerHTML = `
    <div class="home-container">
      <section class="home-hero">
        <h2>Welcome to KnotLab</h2>
        <p>A unified platform for learning, exploring, and computing in knot theory.</p>
      </section>

      <section class="home-section">
        <h3>What is Knot Theory?</h3>
        <p>
          A knot, mathematically, is a closed loop embedded in three-dimensional space.
          Take a piece of string, tangle it up, and glue the ends together &mdash; that&rsquo;s a knot.
          Two knots are <em>equivalent</em> if you can deform one into the other without cutting or
          passing the string through itself. The fundamental problem of knot theory is determining
          when two knots are equivalent and when they are not.
        </p>
        <p>
          This is harder than it sounds. Even the question &ldquo;is this knot actually knotted, or
          can it be untangled into a simple circle?&rdquo; has no obvious answer in general.
          The tools developed to attack this problem &mdash; polynomial invariants, homological algebra,
          quantum groups &mdash; connect knot theory to areas throughout mathematics and physics.
        </p>
      </section>

      <section class="home-section">
        <h3>A Brief History</h3>
        <p>
          Knots entered mathematics through physics. In the 1860s, Lord Kelvin proposed that
          atoms were knotted vortices in the ether, prompting Peter Guthrie Tait to compile
          the first knot tables in the 1870s&ndash;80s, classifying all knots up to 10 crossings by hand.
        </p>
        <p>
          Reidemeister (1927) proved that any two diagrams of the same knot are related by three
          local moves, giving the subject a combinatorial foundation. Alexander (1928) introduced
          the first polynomial invariant, showing that algebraic tools could distinguish knots
          that are hard to tell apart geometrically.
        </p>
        <p>
          The field was transformed in 1984 when Vaughan Jones discovered a new polynomial invariant
          through von Neumann algebras, revealing unexpected connections to statistical mechanics
          and quantum field theory. The HOMFLY-PT polynomial and quantum group invariants followed.
          In 2000, Khovanov categorified the Jones polynomial, replacing a polynomial with a
          homology theory and opening a new direction that remains active today.
        </p>
      </section>

    </div>`;
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
      <p style="font-size:0.88rem;">External resources:
        <a href="https://www.math.toronto.edu/~drorbn/KAtlas/" target="_blank" rel="noopener">The Knot Atlas</a> &middot;
        <a href="https://knotinfo.math.indiana.edu/" target="_blank" rel="noopener">KnotInfo</a> &middot;
        <a href="https://linkinfo.sitehost.iu.edu/" target="_blank" rel="noopener">LinkInfo</a>
      </p>
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
      <p>A foundational result in knot theory (Reidemeister, 1927) states that two knot diagrams represent the same knot if and only if they are related by a finite sequence of <strong>Reidemeister moves</strong>, together with planar isotopy.</p>
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
      <p><strong>Alexander&rsquo;s theorem</strong> (1923) states that every knot or link can be represented
      as the <strong>closure</strong> of a braid. The closure \\(\\hat{\\beta}\\) of a braid \\(\\beta\\) is
      obtained by connecting the top endpoints to the corresponding bottom endpoints.</p>
      <p>For example, the trefoil is the closure of the braid \\(\\sigma_1^3 \\in B_2\\), and the
      figure-eight knot is the closure of \\(\\sigma_1 \\sigma_2^{-1} \\sigma_1 \\sigma_2^{-1} \\in B_3\\).</p>
    </div>

    <div class="expo-panel">
      <h3>Markov&rsquo;s Theorem</h3>
      <p>Two braids have isotopic closures if and only if they are related by a sequence of
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
        <li><strong>Determinant</strong> \\(\\det(K)\\): the absolute value of the determinant of the Seifert matrix (equivalently, \\(|\\Delta_K(-1)|\\)).</li>
      </ul>
      <p>These invariants are computed and displayed in the <em>Knot Explorer</em> tab.</p>
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
    </div>

    <div class="expo-panel">
      <h3>Polynomial Invariants</h3>
      <p>The <strong>Alexander polynomial</strong> \\(\\Delta_K(t)\\) (1928) was the first polynomial knot invariant, derived from the fundamental group of the knot complement. The <strong>Jones polynomial</strong> \\(V_K(q)\\) (1984), discovered via connections to statistical mechanics, is a far stronger invariant. The <strong>HOMFLY-PT polynomial</strong> \\(P_K(a,z)\\) generalizes both.</p>
      <div class="formula-box">
        <p><strong>Jones polynomial skein relation:</strong></p>
        $$ q^{-1} V_{L_+}(q) - q\\, V_{L_-}(q) = \\left(q^{1/2} - q^{-1/2}\\right) V_{L_0}(q) $$
      </div>
      <p>These polynomial invariants are explored in depth in the <em>Knot Explorer</em> tab.</p>
    </div>

    <div class="expo-panel">
      <h3>Homological Invariants</h3>
      <p><strong>Khovanov homology</strong> (2000) is a bigraded homology theory that <em>categorifies</em> the Jones polynomial: the graded Euler characteristic of Khovanov homology recovers the Jones polynomial. It is a strictly stronger invariant &mdash; there exist knots with identical Jones polynomials but distinct Khovanov homology. This invariant is explored further in the <em>Knot Explorer</em> tab.</p>
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

    var tabNames = ['Introduction', 'Knots & Links', 'Knot Diagrams', 'Braids', 'Invariants'];
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
