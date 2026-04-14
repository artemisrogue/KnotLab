/**
 * cube.js -- Cube of resolutions for Khovanov homology
 *
 * Builds the hypercube {0,1}^n from a PD code with crossing signs.
 * Each vertex is a complete resolution of the knot diagram; edges
 * correspond to changing one crossing resolution from 0 to 1.
 *
 * Usage (browser <script> tag):
 *   <script src="cube.js"></script>
 *   const cube = new ResolutionCube([[1,4,2,3],[3,2,4,1]], [+1,-1]);
 *   console.log(cube.circleCount(0));
 */

(function (global) {
  'use strict';

  // ----------------------------------------------------------------
  // Union-Find (disjoint set) helper -- internal only
  // ----------------------------------------------------------------
  class UnionFind {
    constructor() {
      this.parent = new Map();
      this.rank = new Map();
    }

    make(x) {
      if (!this.parent.has(x)) {
        this.parent.set(x, x);
        this.rank.set(x, 0);
      }
    }

    find(x) {
      this.make(x);
      let root = x;
      while (this.parent.get(root) !== root) {
        root = this.parent.get(root);
      }
      // path compression
      let cur = x;
      while (cur !== root) {
        const next = this.parent.get(cur);
        this.parent.set(cur, root);
        cur = next;
      }
      return root;
    }

    union(a, b) {
      const ra = this.find(a);
      const rb = this.find(b);
      if (ra === rb) return;
      const rankA = this.rank.get(ra);
      const rankB = this.rank.get(rb);
      if (rankA < rankB) {
        this.parent.set(ra, rb);
      } else if (rankA > rankB) {
        this.parent.set(rb, ra);
      } else {
        this.parent.set(rb, ra);
        this.rank.set(ra, rankA + 1);
      }
    }

    /** Return groups as Map<root, Set<element>>. */
    groups() {
      const g = new Map();
      for (const x of this.parent.keys()) {
        const r = this.find(x);
        if (!g.has(r)) g.set(r, new Set());
        g.get(r).add(x);
      }
      return g;
    }
  }

  // ----------------------------------------------------------------
  // Collect all distinct arc labels that appear in the PD code
  // ----------------------------------------------------------------
  function allArcs(pdCode) {
    const s = new Set();
    for (const crossing of pdCode) {
      for (const a of crossing) s.add(a);
    }
    return s;
  }

  // ----------------------------------------------------------------
  // ResolutionCube
  // ----------------------------------------------------------------
  class ResolutionCube {
    /**
     * @param {number[][]} pdCode  Array of crossings, each [a, b, c, d].
     * @param {number[]}   crossingSigns  Array of +1 / -1, one per crossing.
     */
    constructor(pdCode, crossingSigns) {
      if (pdCode.length !== crossingSigns.length) {
        throw new Error(
          'pdCode length (' + pdCode.length +
          ') must equal crossingSigns length (' + crossingSigns.length + ')'
        );
      }
      this.n = pdCode.length;
      this.pdCode = pdCode;
      this.signs = crossingSigns;

      // Cache circle computations (keyed by vertex integer)
      this._circleCache = new Map();
    }

    // ----------------------------------------------------------
    // Circle computation
    // ----------------------------------------------------------

    /**
     * Compute circles at the given vertex of the cube.
     *
     * Convention for PD code crossing [a, b, c, d]:
     *   0-resolution: connect a<->d  and  b<->c
     *   1-resolution: connect a<->b  and  c<->d
     *
     * @param  {number} bits  Integer in [0, 2^n).
     * @return {number[][]}   Array of circles; each circle is a sorted
     *                        array of arc labels forming one closed loop.
     */
    getCircles(bits) {
      if (this._circleCache.has(bits)) {
        return this._circleCache.get(bits);
      }

      const uf = new UnionFind();

      // Register every arc
      for (const arc of allArcs(this.pdCode)) {
        uf.make(arc);
      }

      // Apply resolution at each crossing
      for (let i = 0; i < this.n; i++) {
        const [a, b, c, d] = this.pdCode[i];
        if ((bits >> i) & 1) {
          // 1-resolution (B-smoothing): a<->b, c<->d
          uf.union(a, b);
          uf.union(c, d);
        } else {
          // 0-resolution (A-smoothing): a<->d, b<->c
          uf.union(a, d);
          uf.union(b, c);
        }
      }

      // Extract circles as sorted arrays
      const groups = uf.groups();
      const circles = [];
      for (const members of groups.values()) {
        circles.push(Array.from(members).sort((a, b) => a - b));
      }
      // Sort circles by their smallest element for deterministic ordering
      circles.sort((a, b) => a[0] - b[0]);

      this._circleCache.set(bits, circles);
      return circles;
    }

    /**
     * Number of circles at a vertex.
     * @param  {number} bits
     * @return {number}
     */
    circleCount(bits) {
      return this.getCircles(bits).length;
    }

    // ----------------------------------------------------------
    // Edge analysis
    // ----------------------------------------------------------

    /**
     * Determine the edge type between two adjacent vertices that differ
     * at bit position k.  Convention: `from = bits` has bit k = 0 and
     * `to = bits | (1 << k)` has bit k = 1.
     *
     * @param  {number} bits  The "lower" vertex (bit k is 0).
     * @param  {number} k     The crossing index that changes.
     * @return {{ type: string,
     *            srcCircles: number[][],
     *            tgtCircles: number[][],
     *            affectedSrc: number[],
     *            affectedTgt: number[] }}
     */
    edgeType(bits, k) {
      if (k < 0 || k >= this.n) {
        throw new RangeError('k must be in [0, ' + this.n + ')');
      }
      if ((bits >> k) & 1) {
        throw new Error(
          'Bit ' + k + ' is already 1 in vertex ' + bits +
          '; edge goes from 0->1 at that bit'
        );
      }

      const from = bits;
      const to = bits | (1 << k);

      const srcCircles = this.getCircles(from);
      const tgtCircles = this.getCircles(to);

      // Identify which arcs are directly involved at crossing k
      const [a, b, c, d] = this.pdCode[k];
      const crossingArcs = new Set([a, b, c, d]);

      // Find which source circles contain arcs of this crossing
      const affectedSrc = [];
      for (let ci = 0; ci < srcCircles.length; ci++) {
        if (srcCircles[ci].some(arc => crossingArcs.has(arc))) {
          affectedSrc.push(ci);
        }
      }

      // Same for target circles
      const affectedTgt = [];
      for (let ci = 0; ci < tgtCircles.length; ci++) {
        if (tgtCircles[ci].some(arc => crossingArcs.has(arc))) {
          affectedTgt.push(ci);
        }
      }

      const diff = tgtCircles.length - srcCircles.length;
      let type;
      if (diff === -1) {
        type = 'merge';
      } else if (diff === 1) {
        type = 'split';
      } else {
        // Shouldn't happen for valid knot PD codes, but handle gracefully
        type = 'unknown (circle count delta = ' + diff + ')';
      }

      return {
        type: type,
        srcCircles: srcCircles,
        tgtCircles: tgtCircles,
        affectedSrc: affectedSrc,
        affectedTgt: affectedTgt
      };
    }

    /**
     * Koszul sign for an edge.
     *
     * For the edge at bit position k of vertex `bits`:
     *   sign = (-1)^{number of 1-bits in positions < k}
     *
     * @param  {number} bits
     * @param  {number} k
     * @return {number} +1 or -1
     */
    edgeSign(bits, k) {
      // Count 1-bits in positions 0 .. k-1
      const mask = (1 << k) - 1;
      const low = bits & mask;
      let count = 0;
      let v = low;
      while (v) {
        count += v & 1;
        v >>= 1;
      }
      return (count & 1) ? -1 : 1;
    }

    // ----------------------------------------------------------
    // Vertex invariants
    // ----------------------------------------------------------

    /**
     * Writhe of the diagram: sum of all crossing signs.
     * @return {number}
     */
    writhe() {
      return this.signs.reduce((s, x) => s + x, 0);
    }

    /**
     * Kauffman bracket sigma for a vertex:
     *   sigma(bits) = n - 2|v|  =  #(A-smoothings) - #(B-smoothings)
     *
     * Each A-smoothing (bit=0) contributes +1 (factor A), each
     * B-smoothing (bit=1) contributes -1 (factor A^{-1}).
     *
     * NOTE: Crossing signs do NOT enter the bracket state sum.
     * They are encoded in the PD code geometry (which determines
     * circle counts) and only appear explicitly in the writhe
     * normalization for the Jones polynomial.
     *
     * @param  {number} bits
     * @return {number}
     */
    sigma(bits) {
      let weight = 0;
      let v = bits;
      while (v) { weight += v & 1; v >>= 1; }
      return this.n - 2 * weight;
    }

    // ----------------------------------------------------------
    // Edge iterator
    // ----------------------------------------------------------

    /**
     * Iterate over every edge of the cube.
     *
     * Yields objects { from, to, bit, sign } where:
     *   - `from` has bit k = 0, `to` has bit k = 1
     *   - `bit` is the crossing index k
     *   - `sign` is the Koszul sign edgeSign(from, k)
     */
    *edges() {
      const total = 1 << this.n;
      for (let v = 0; v < total; v++) {
        for (let k = 0; k < this.n; k++) {
          if (!((v >> k) & 1)) {
            yield {
              from: v,
              to: v | (1 << k),
              bit: k,
              sign: this.edgeSign(v, k)
            };
          }
        }
      }
    }

    // ----------------------------------------------------------
    // Utility
    // ----------------------------------------------------------

    /** Number of vertices: 2^n */
    get vertexCount() {
      return 1 << this.n;
    }

    /** Pretty-print a vertex as a binary string of length n. */
    vertexLabel(bits) {
      return bits.toString(2).padStart(this.n, '0');
    }

    /** Clear cached circle data (useful after modifying pdCode). */
    clearCache() {
      this._circleCache.clear();
    }
  }

  // ----------------------------------------------------------------
  // Self-test
  // ----------------------------------------------------------------

  /**
   * Run basic sanity checks.  Call ResolutionCube.selfTest() from the
   * console or at load time.  Throws on failure.
   */
  ResolutionCube.selfTest = function selfTest() {
    const assert = (cond, msg) => {
      if (!cond) throw new Error('ResolutionCube self-test FAILED: ' + msg);
    };

    // ----- Trefoil (3 crossings) -----
    // Standard PD code for the right-hand trefoil:
    //   X0: [1, 4, 2, 3]   X1: [3, 6, 4, 5]   X2: [5, 2, 6, 1]
    // All positive crossings.
    const trefoilPD = [[1,4,2,3], [3,6,4,5], [5,2,6,1]];
    const trefoilSigns = [+1, +1, +1];
    const cube = new ResolutionCube(trefoilPD, trefoilSigns);

    assert(cube.n === 3, 'trefoil should have 3 crossings');
    assert(cube.writhe() === 3, 'trefoil writhe should be 3');
    assert(cube.vertexCount === 8, 'trefoil cube should have 8 vertices');

    // All-0 resolution (vertex 0): should give some number of circles
    const c0 = cube.getCircles(0);
    assert(c0.length >= 1, 'all-0 resolution should have at least 1 circle');
    assert(cube.circleCount(0) === c0.length, 'circleCount must match getCircles');

    // All-1 resolution (vertex 7)
    const c7 = cube.getCircles(7);
    assert(c7.length >= 1, 'all-1 resolution should have at least 1 circle');

    // Check that every circle is non-empty
    for (let v = 0; v < 8; v++) {
      const circles = cube.getCircles(v);
      for (const circ of circles) {
        assert(circ.length > 0, 'no empty circles at vertex ' + v);
      }
    }

    // Edge sign checks
    assert(cube.edgeSign(0, 0) === 1, 'edgeSign(0,0) should be +1');
    assert(cube.edgeSign(0, 1) === 1, 'edgeSign(0,1) should be +1');
    assert(cube.edgeSign(0, 2) === 1, 'edgeSign(0,2) should be +1');
    // vertex 0b01 = 1, edge at bit 1: one 1-bit below position 1
    assert(cube.edgeSign(1, 1) === -1, 'edgeSign(1,1) should be -1');

    // Every edge should be merge or split
    for (const edge of cube.edges()) {
      const info = cube.edgeType(edge.from, edge.bit);
      assert(
        info.type === 'merge' || info.type === 'split',
        'edge ' + edge.from + '->' + edge.to +
        ' has unexpected type: ' + info.type
      );
    }

    // Count edges: should be n * 2^(n-1) = 3 * 4 = 12
    let edgeCount = 0;
    for (const _e of cube.edges()) edgeCount++;
    assert(edgeCount === 12, 'trefoil cube should have 12 edges, got ' + edgeCount);

    // Sigma checks: sigma = n - 2|v|
    assert(cube.sigma(0) === 3, 'sigma(000) = 3 - 0 = 3');
    assert(cube.sigma(7) === -3, 'sigma(111) = 3 - 6 = -3');

    // ----- Hopf link (2 crossings) -----
    // PD: [1,4,2,3], [3,2,4,1]  signs: [+1, -1]
    const hopfPD = [[1,4,2,3], [3,2,4,1]];
    const hopfSigns = [+1, -1];
    const hopf = new ResolutionCube(hopfPD, hopfSigns);
    assert(hopf.writhe() === 0, 'Hopf link writhe should be 0');
    assert(hopf.vertexCount === 4, 'Hopf link cube has 4 vertices');

    console.log('ResolutionCube.selfTest(): all tests passed.');
  };

  // Expose globally
  global.ResolutionCube = ResolutionCube;

})(typeof window !== 'undefined' ? window : globalThis);
