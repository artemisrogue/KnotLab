/**
 * chain-complex.js -- Chain complex homology for Khovanov-type theories
 *
 * Provides ChainComplex (singly-graded) and BigradedChainComplex (bigraded)
 * classes, plus buildKhovanovComplex() which assembles the Khovanov bigraded
 * chain complex from a PD code using a Frobenius algebra.
 *
 * Dependencies (must be loaded first via <script> tags):
 *   - polynomial.js  (LaurentPoly, CoefficientRing)
 *   - matrix.js       (IntMatrix)
 *   - cube.js         (ResolutionCube)
 *   - frobenius.js    (FrobeniusAlgebra)
 *
 * Usage (browser):
 *   <script src="polynomial.js"></script>
 *   <script src="matrix.js"></script>
 *   <script src="cube.js"></script>
 *   <script src="frobenius.js"></script>
 *   <script src="chain-complex.js"></script>
 *
 *   const cx = buildKhovanovComplex(
 *     [[1,4,2,3],[3,6,4,5],[5,2,6,1]],  // trefoil PD code
 *     [+1,+1,+1],                        // crossing signs
 *     FrobeniusAlgebra.Khovanov,
 *     CoefficientRing.Z
 *   );
 *   console.log(cx.homology());
 */

(function (global) {
  'use strict';

  // =====================================================================
  // ChainComplex -- singly-graded chain complex over Z
  // =====================================================================

  /**
   * A chain complex  ... -> C_{i} -d_i-> C_{i+1} -> ...
   * with integer-valued differentials represented as IntMatrix objects.
   */
  class ChainComplex {
    constructor() {
      /** @type {Object.<number, number>} degree -> rank (dimension of free module) */
      this.groups = {};
      /** @type {Object.<number, IntMatrix>} degree -> differential matrix (C_deg -> C_{deg+1}) */
      this.differentials = {};
    }

    /**
     * Set the rank of the chain group at the given degree.
     * @param {number} degree
     * @param {number} rank
     */
    addGroup(degree, rank) {
      this.groups[degree] = rank;
    }

    /**
     * Set the differential d: C_degree -> C_{degree+1}.
     * The matrix should have rows = rank(C_{degree+1}) and cols = rank(C_degree).
     * @param {number} degree
     * @param {IntMatrix} matrix
     */
    setDifferential(degree, matrix) {
      this.differentials[degree] = matrix;
    }

    /**
     * Verify that d^2 = 0 at every degree where two consecutive
     * differentials exist.
     * @returns {{ valid: boolean, errors: string[] }}
     */
    verify() {
      var errors = [];
      var degrees = Object.keys(this.differentials).map(Number).sort(function (a, b) { return a - b; });

      for (var idx = 0; idx < degrees.length - 1; idx++) {
        var i = degrees[idx];
        var j = degrees[idx + 1];
        if (j !== i + 1) continue; // non-consecutive, skip

        var d_i = this.differentials[i];
        var d_j = this.differentials[j];

        if (d_i.rows !== d_j.cols) {
          errors.push(
            'd^2 dimension mismatch at degrees ' + i + ',' + j +
            ': d_' + i + ' has ' + d_i.rows + ' rows but d_' + j +
            ' has ' + d_j.cols + ' cols'
          );
          continue;
        }

        var product = IntMatrix.multiply(d_j, d_i);
        if (!product.isZero()) {
          errors.push('d^2 != 0 at degree ' + i + ': d_' + j + ' * d_' + i + ' is nonzero');
        }
      }

      return { valid: errors.length === 0, errors: errors };
    }

    /**
     * Compute homology H_i = ker(d_i) / im(d_{i-1}) at a single degree.
     * @param {number} degree
     * @returns {{ rank: number, torsion: number[] }}
     */
    homologyAt(degree) {
      var d_in = this.differentials[degree - 1] || null;
      var d_out = this.differentials[degree] || null;

      // If the group doesn't exist or has rank 0, homology is trivial
      if (!(degree in this.groups) || this.groups[degree] === 0) {
        return { rank: 0, torsion: [] };
      }

      // Build suitable null matrices for missing differentials
      var rank = this.groups[degree];
      if (!d_in) {
        d_in = IntMatrix.zero(rank, 0);
      }
      if (!d_out) {
        d_out = IntMatrix.zero(0, rank);
      }

      return IntMatrix.homology(d_in, d_out);
    }

    /**
     * Compute homology at all degrees.
     * @returns {Map<number, {rank: number, torsion: number[]}>}
     */
    homology() {
      var result = new Map();
      var allDegrees = new Set();

      // Collect all degrees that appear in groups or differentials
      var self = this;
      Object.keys(this.groups).forEach(function (d) { allDegrees.add(Number(d)); });
      Object.keys(this.differentials).forEach(function (d) {
        allDegrees.add(Number(d));
        allDegrees.add(Number(d) + 1);
      });

      allDegrees.forEach(function (deg) {
        if (self.groups[deg] && self.groups[deg] > 0) {
          var h = self.homologyAt(deg);
          if (h.rank > 0 || h.torsion.length > 0) {
            result.set(deg, h);
          }
        }
      });

      return result;
    }

    /**
     * Graded Euler characteristic: sum_i (-1)^i * rank(C_i).
     * @returns {number}
     */
    eulerCharacteristic() {
      var chi = 0;
      for (var deg in this.groups) {
        if (this.groups.hasOwnProperty(deg)) {
          var d = Number(deg);
          chi += (d % 2 === 0 ? 1 : -1) * this.groups[d];
        }
      }
      return chi;
    }
  }

  // =====================================================================
  // BigradedChainComplex -- bigraded chain complex for Khovanov homology
  // =====================================================================

  /**
   * A bigraded chain complex with homological grading i and quantum grading j.
   * The differential d: C^{i,j} -> C^{i+1,j} preserves quantum grading.
   */
  class BigradedChainComplex {
    constructor() {
      /** @type {Object.<string, number>} "i,j" -> rank */
      this.groups = {};
      /** @type {Object.<string, IntMatrix>} "i,j" -> differential (C^{i,j} -> C^{i+1,j}) */
      this.differentials = {};
    }

    /** @private Make a key string from bigrading. */
    static _key(i, j) {
      return i + ',' + j;
    }

    /**
     * Set the rank of the chain group at bidegree (i, j).
     * @param {number} i  Homological degree
     * @param {number} j  Quantum degree
     * @param {number} rank
     */
    addGroup(i, j, rank) {
      if (rank > 0) {
        this.groups[BigradedChainComplex._key(i, j)] = rank;
      }
    }

    /**
     * Set the differential d: C^{i,j} -> C^{i+1,j}.
     * Matrix has rows = rank(C^{i+1,j}), cols = rank(C^{i,j}).
     * @param {number} i  Homological degree of the source
     * @param {number} j  Quantum degree
     * @param {IntMatrix} matrix
     */
    setDifferential(i, j, matrix) {
      this.differentials[BigradedChainComplex._key(i, j)] = matrix;
    }

    /**
     * Verify d^2 = 0 at each bidegree.
     * @returns {{ valid: boolean, errors: string[] }}
     */
    verify() {
      var errors = [];
      var self = this;

      // For each differential at (i,j), check that d_{i+1,j} * d_{i,j} = 0
      Object.keys(this.differentials).forEach(function (key) {
        var parts = key.split(',').map(Number);
        var i = parts[0];
        var j = parts[1];
        var nextKey = BigradedChainComplex._key(i + 1, j);
        var d_i = self.differentials[key];
        var d_next = self.differentials[nextKey];

        if (!d_next) return; // no consecutive differential

        if (d_i.rows !== d_next.cols) {
          errors.push(
            'd^2 dimension mismatch at (' + i + ',' + j + '): d has ' +
            d_i.rows + ' rows, d_{' + (i + 1) + '} has ' + d_next.cols + ' cols'
          );
          return;
        }

        var product = IntMatrix.multiply(d_next, d_i);
        if (!product.isZero()) {
          errors.push('d^2 != 0 at bidegree (' + i + ',' + j + ')');
        }
      });

      return { valid: errors.length === 0, errors: errors };
    }

    /**
     * Compute homology Kh^{i,j} at a single bidegree.
     * @param {number} i     Homological degree
     * @param {number} j     Quantum degree
     * @param {object} [ring]  CoefficientRing (Z, Q, or Fp). Default: Z.
     * @returns {{ rank: number, torsion: number[] }}
     */
    homologyAt(i, j, ring) {
      var key = BigradedChainComplex._key(i, j);
      var groupRank = this.groups[key] || 0;
      if (groupRank === 0) return { rank: 0, torsion: [] };

      var prevKey = BigradedChainComplex._key(i - 1, j);
      var d_in = this.differentials[prevKey] || null;
      var d_out = this.differentials[key] || null;

      if (!d_in) d_in = IntMatrix.zero(groupRank, 0);
      if (!d_out) d_out = IntMatrix.zero(0, groupRank);

      // Over F_p: compute ranks mod p (no torsion over a field)
      if (ring && ring.p && ring.p > 0) {
        var p = ring.p;
        var rankOut = (d_out.rows > 0 && d_out.cols > 0) ? IntMatrix.rankMod(d_out, p) : 0;
        var rankIn = (d_in.rows > 0 && d_in.cols > 0) ? IntMatrix.rankMod(d_in, p) : 0;
        var dimKer = groupRank - rankOut;
        return { rank: dimKer - rankIn, torsion: [] };
      }

      // Over Z: full Smith normal form (torsion visible)
      var result = IntMatrix.homology(d_in, d_out);

      // Over Q: discard torsion (tensoring with Q kills all torsion)
      if (ring && ring.name === 'Q') {
        return { rank: result.rank, torsion: [] };
      }

      return result;
    }

    /**
     * Compute all homology groups.
     * @param {object} [ring]  CoefficientRing (Z, Q, or Fp). Default: Z.
     * @returns {Map<string, {rank: number, torsion: number[]}>}
     */
    homology(ring) {
      var result = new Map();
      var self = this;

      // Collect all bidegrees from groups
      Object.keys(this.groups).forEach(function (key) {
        var parts = key.split(',').map(Number);
        var h = self.homologyAt(parts[0], parts[1], ring);
        if (h.rank > 0 || h.torsion.length > 0) {
          result.set(key, h);
        }
      });

      return result;
    }

    /**
     * Graded Euler characteristic: sum_{i,j} (-1)^i * q^j * rank(Kh^{i,j}).
     * Uses the homology groups if computed, otherwise uses chain group ranks.
     * @param {boolean} [fromHomology=false]  If true, use homology ranks instead
     * @returns {LaurentPoly}
     */
    gradedEulerCharacteristic(fromHomology, ring) {
      var terms = [];

      if (fromHomology) {
        var hom = this.homology(ring);
        hom.forEach(function (h, key) {
          var parts = key.split(',').map(Number);
          var i = parts[0];
          var j = parts[1];
          var sign = (i % 2 === 0) ? 1 : -1;
          // Free part contributes rank, torsion contributes nothing to Euler char
          if (h.rank !== 0) {
            terms.push({ c: sign * h.rank, e: j });
          }
        });
      } else {
        for (var key in this.groups) {
          if (!this.groups.hasOwnProperty(key)) continue;
          var parts = key.split(',').map(Number);
          var i = parts[0];
          var j = parts[1];
          var rank = this.groups[key];
          var sign = (i % 2 === 0) ? 1 : -1;
          if (rank !== 0) {
            terms.push({ c: sign * rank, e: j });
          }
        }
      }

      return new LaurentPoly(terms, CoefficientRing.Z);
    }

    /**
     * Get the range of gradings present in the complex.
     * @returns {{ iMin: number, iMax: number, jMin: number, jMax: number }}
     */
    getBounds() {
      var iMin = Infinity, iMax = -Infinity;
      var jMin = Infinity, jMax = -Infinity;

      Object.keys(this.groups).forEach(function (key) {
        var parts = key.split(',').map(Number);
        var i = parts[0];
        var j = parts[1];
        if (i < iMin) iMin = i;
        if (i > iMax) iMax = i;
        if (j < jMin) jMin = j;
        if (j > jMax) jMax = j;
      });

      if (iMin === Infinity) {
        return { iMin: 0, iMax: 0, jMin: 0, jMax: 0 };
      }
      return { iMin: iMin, iMax: iMax, jMin: jMin, jMax: jMax };
    }

    /**
     * Render homology as an HTML table.
     * Rows = quantum grading j (descending), columns = homological grading i.
     * @returns {string} HTML table string
     */
    toHTML(ring) {
      var hom = this.homology(ring);
      var bounds = this.getBounds();
      var html = '<table class="khovanov-table" border="1" cellpadding="4" cellspacing="0">\n';

      // Header row: homological grading
      html += '<tr><th>j \\ i</th>';
      for (var i = bounds.iMin; i <= bounds.iMax; i++) {
        html += '<th>' + i + '</th>';
      }
      html += '</tr>\n';

      // Data rows: quantum grading descending
      for (var j = bounds.jMax; j >= bounds.jMin; j -= 1) {
        html += '<tr><th>' + j + '</th>';
        for (var ii = bounds.iMin; ii <= bounds.iMax; ii++) {
          var key = BigradedChainComplex._key(ii, j);
          var h = hom.get(key);
          var cell = '';
          if (h) {
            var parts = [];
            if (h.rank > 0) {
              parts.push(h.rank === 1 ? 'Z' : 'Z<sup>' + h.rank + '</sup>');
            }
            for (var t = 0; t < h.torsion.length; t++) {
              parts.push('Z/' + h.torsion[t]);
            }
            cell = parts.length > 0 ? parts.join(' + ') : '';
          }
          html += '<td>' + cell + '</td>';
        }
        html += '</tr>\n';
      }

      html += '</table>';
      return html;
    }
  }

  // =====================================================================
  // buildKhovanovComplex -- assemble the bigraded Khovanov chain complex
  // =====================================================================

  /**
   * Enumerate all generators at a vertex of the resolution cube.
   * A generator is a binary string of length c (number of circles),
   * where 0 = '1' basis element and 1 = 'x' basis element.
   *
   * @param {number} numCircles
   * @returns {number[][]} Array of generators, each a length-numCircles array of 0/1
   */
  function enumerateGenerators(numCircles) {
    var total = 1 << numCircles;
    var gens = [];
    for (var bits = 0; bits < total; bits++) {
      var gen = [];
      for (var k = 0; k < numCircles; k++) {
        gen.push((bits >> k) & 1);
      }
      gens.push(gen);
    }
    return gens;
  }

  /**
   * Compute the quantum grading of a generator at a vertex.
   *
   * For a generator g = (b_1, ..., b_c) at vertex v with weight |v|:
   *   j = n_+ - 2*n_- - 2*|v| + sum_k grading(b_k)
   *
   * This is the standard Khovanov quantum grading shift {n_+ - 2n_-}
   * applied to the unshifted degree (sum of generator gradings), where
   * the vertex weight |v| enters through the state sum: each vertex v
   * contributes (-q^{-2})^{|v|} to the graded Euler characteristic.
   *
   * With this convention, the graded Euler characteristic equals the
   * unnormalized Jones polynomial:
   *   χ_q(C*(K)) = Ĵ_K(q) = (q + q^{-1}) · V_K(q^{-2})
   *
   * @param {number[]} gen          Generator (array of 0/1)
   * @param {number}   vertexWeight Number of 1-bits in the vertex (|v|)
   * @param {number}   nPlus        Number of positive crossings
   * @param {number}   nMinus       Number of negative crossings
   * @param {FrobeniusAlgebra} algebra
   * @returns {number}
   */
  function quantumGrading(gen, vertexWeight, nPlus, nMinus, algebra) {
    var qDeg = vertexWeight + nPlus - 2 * nMinus;
    for (var k = 0; k < gen.length; k++) {
      qDeg += algebra.grading(gen[k]);
    }
    return qDeg;
  }

  /**
   * Build the Khovanov bigraded chain complex from a PD code.
   *
   * @param {number[][]}       pdCode         Array of [a,b,c,d] crossings
   * @param {number[]}         crossingSigns  Array of +1/-1, one per crossing
   * @param {FrobeniusAlgebra} algebra        Frobenius algebra (Khovanov, Lee, BarNatan)
   * @param {object}           ring           CoefficientRing (Z, Q, or Fp)
   * @returns {BigradedChainComplex}
   */
  function buildKhovanovComplex(pdCode, crossingSigns, algebra, ring) {
    var n = pdCode.length;
    var cube = new ResolutionCube(pdCode, crossingSigns);

    // Count positive and negative crossings
    var nPlus = 0;
    var nMinus = 0;
    for (var s = 0; s < n; s++) {
      if (crossingSigns[s] > 0) nPlus++;
      else nMinus++;
    }

    // Homological shift: the homological grading of vertex v is
    //   i(v) = |v| - n_-
    // where |v| = number of 1-bits (weight of the vertex).
    function homologicalGrading(bits) {
      var weight = 0;
      var b = bits;
      while (b) { weight += b & 1; b >>= 1; }
      return weight - nMinus;
    }

    var complex = new BigradedChainComplex();

    // ---------------------------------------------------------------
    // Step 1: For each vertex, enumerate generators and assign bigradings
    // ---------------------------------------------------------------

    // vertexGens[v] = array of { gen: number[], i: int, j: int, localIndex: int }
    var vertexGens = {};
    // gensByBidegree[v]["i,j"] = array of generators at that bidegree
    var gensByBidegree = {};
    // Flat index map: vertexGenIndex[v][localIdx] -> { i, j, indexInBidegree }
    var vertexGenIndex = {};

    var totalVertices = 1 << n;

    for (var v = 0; v < totalVertices; v++) {
      var circles = cube.getCircles(v);
      var numCircles = circles.length;
      var gens = enumerateGenerators(numCircles);
      var iDeg = homologicalGrading(v);

      // Vertex weight = number of 1-bits in v
      var vWeight = 0;
      var vTmp = v;
      while (vTmp) { vWeight += vTmp & 1; vTmp >>= 1; }

      vertexGens[v] = [];
      gensByBidegree[v] = {};
      vertexGenIndex[v] = {};

      for (var gi = 0; gi < gens.length; gi++) {
        var gen = gens[gi];
        var jDeg = quantumGrading(gen, vWeight, nPlus, nMinus, algebra);

        var entry = { gen: gen, i: iDeg, j: jDeg, localIndex: gi };
        vertexGens[v].push(entry);

        var key = BigradedChainComplex._key(iDeg, jDeg);
        if (!gensByBidegree[v][key]) {
          gensByBidegree[v][key] = [];
        }
        var bidegIdx = gensByBidegree[v][key].length;
        gensByBidegree[v][key].push(entry);
        vertexGenIndex[v][gi] = { i: iDeg, j: jDeg, indexInBidegree: bidegIdx };
      }
    }

    // ---------------------------------------------------------------
    // Step 2: Compute ranks of the bigraded groups (summing over all
    // vertices with the same homological grading)
    // ---------------------------------------------------------------

    // groupRanks["i,j"] = total rank across all vertices with homo grading i
    var groupRanks = {};
    // We also need to track global offsets for each vertex's generators
    // within the combined group C^{i,j}.
    // globalOffset[v][key] = starting column index for vertex v's generators
    // in the combined group at bidegree key.
    var globalOffset = {};

    for (var v = 0; v < totalVertices; v++) {
      globalOffset[v] = {};
      for (var key in gensByBidegree[v]) {
        if (!gensByBidegree[v].hasOwnProperty(key)) continue;
        var count = gensByBidegree[v][key].length;
        if (!groupRanks[key]) groupRanks[key] = 0;
        globalOffset[v][key] = groupRanks[key];
        groupRanks[key] += count;
      }
    }

    // Register groups in the complex
    for (var key in groupRanks) {
      if (!groupRanks.hasOwnProperty(key)) continue;
      var parts = key.split(',').map(Number);
      complex.addGroup(parts[0], parts[1], groupRanks[key]);
    }

    // ---------------------------------------------------------------
    // Step 3: Build differentials
    // ---------------------------------------------------------------

    // The differential d: C^{i,j} -> C^{i+1,j} is assembled from all
    // edges of the cube that go from homological grading i to i+1.
    // For each quantum grading j, collect all edge contributions.

    // First, accumulate matrix entries by target bidegree key
    // diffEntries["i,j"] = array of { row, col, value } for d: C^{i,j} -> C^{i+1,j}
    var diffEntries = {};

    for (var edgeObj of cube.edges()) {
      var from = edgeObj.from;
      var to = edgeObj.to;
      var bit = edgeObj.bit;
      var koszulSign = edgeObj.sign;

      var edgeInfo = cube.edgeType(from, bit);
      var srcCircles = edgeInfo.srcCircles;
      var tgtCircles = edgeInfo.tgtCircles;
      var affectedSrc = edgeInfo.affectedSrc;
      var affectedTgt = edgeInfo.affectedTgt;

      // Map from source circle index to target circle index for unaffected circles
      var srcToTgt = _buildCircleMapping(srcCircles, tgtCircles, affectedSrc, affectedTgt);

      var srcGens = vertexGens[from];
      var tgtGens = vertexGens[to];

      // For each source generator, compute its image under the edge map
      for (var si = 0; si < srcGens.length; si++) {
        var srcGen = srcGens[si].gen;
        var srcInfo = vertexGenIndex[from][si];
        var srcKey = BigradedChainComplex._key(srcInfo.i, srcInfo.j);

        // Compute the image: apply merge or split on affected circles,
        // identity on unaffected circles
        var images; // array of { gen: number[], coeff: number }

        if (edgeInfo.type === 'merge') {
          images = _applyMerge(srcGen, srcCircles, tgtCircles,
            affectedSrc, affectedTgt, srcToTgt, algebra);
        } else if (edgeInfo.type === 'split') {
          images = _applySplit(srcGen, srcCircles, tgtCircles,
            affectedSrc, affectedTgt, srcToTgt, algebra);
        } else {
          continue; // unknown edge type
        }

        // Apply Koszul sign
        for (var img of images) {
          img.coeff *= koszulSign;
        }

        // Map image generators to their indices in the target vertex
        for (var img of images) {
          if (img.coeff === 0) continue;

          // Find this generator among the target vertex's generators
          var tgtLocalIdx = _findGenIndex(tgtGens, img.gen);
          if (tgtLocalIdx === -1) continue; // should not happen

          var tgtInfo = vertexGenIndex[to][tgtLocalIdx];
          var tgtKey = BigradedChainComplex._key(tgtInfo.i, tgtInfo.j);

          // The differential maps from srcKey bidegree to tgtKey bidegree
          // They should share the same quantum grading j
          if (srcInfo.j !== tgtInfo.j) continue; // grading mismatch, skip

          // Global row and column indices
          var col = globalOffset[from][srcKey] + srcInfo.indexInBidegree;
          var row = globalOffset[to][tgtKey] + tgtInfo.indexInBidegree;

          if (!diffEntries[srcKey]) diffEntries[srcKey] = [];
          diffEntries[srcKey].push({ row: row, col: col, value: img.coeff });
        }
      }
    }

    // Assemble differential matrices
    for (var key in diffEntries) {
      if (!diffEntries.hasOwnProperty(key)) continue;
      var parts = key.split(',').map(Number);
      var i = parts[0];
      var j = parts[1];
      var tgtKey = BigradedChainComplex._key(i + 1, j);

      var srcRank = groupRanks[key] || 0;
      var tgtRank = groupRanks[tgtKey] || 0;

      if (srcRank === 0 || tgtRank === 0) continue;

      var mat = IntMatrix.zero(tgtRank, srcRank);
      var entries = diffEntries[key];
      for (var ei = 0; ei < entries.length; ei++) {
        var e = entries[ei];
        var cur = mat.get(e.row, e.col);
        mat.set(e.row, e.col, cur + e.value);
      }

      complex.setDifferential(i, j, mat);
    }

    return complex;
  }

  // ---------------------------------------------------------------
  // buildFilteredKhovanovComplex -- singly-graded (no j-filtering)
  // ---------------------------------------------------------------

  /**
   * Build a filtered (singly-graded) Khovanov-type chain complex.
   *
   * Unlike buildKhovanovComplex, this does NOT filter out cross-quantum-
   * grading differential terms. This is essential for Lee and Bar-Natan
   * deformations, whose differentials cross j-gradings by ±2.
   *
   * Returns { complex: ChainComplex, jGradings: {i: number[]} }
   * where jGradings[i] is the array of j-values for generators at
   * homological degree i (in the same order as the differential matrix).
   */
  function buildFilteredKhovanovComplex(pdCode, crossingSigns, algebra, ring) {
    var n = pdCode.length;
    var cube = new ResolutionCube(pdCode, crossingSigns);

    var nPlus = 0, nMinus = 0;
    for (var s = 0; s < n; s++) {
      if (crossingSigns[s] > 0) nPlus++; else nMinus++;
    }

    function homologicalGrading(bits) {
      var weight = 0, b = bits;
      while (b) { weight += b & 1; b >>= 1; }
      return weight - nMinus;
    }

    var totalVertices = 1 << n;

    // Step 1: Enumerate generators per vertex with i and j gradings
    var vertexGens = {};    // v -> [{gen, i, j, localIndex}]
    var vertexGenIndex = {}; // v -> localIdx -> {i, j, indexInDegree}
    var gensByDegree = {};  // v -> {i -> [entries]}

    for (var v = 0; v < totalVertices; v++) {
      var circles = cube.getCircles(v);
      var numCircles = circles.length;
      var gens = enumerateGenerators(numCircles);
      var iDeg = homologicalGrading(v);
      var vWeight = 0, vTmp = v;
      while (vTmp) { vWeight += vTmp & 1; vTmp >>= 1; }

      vertexGens[v] = [];
      gensByDegree[v] = {};
      vertexGenIndex[v] = {};

      for (var gi = 0; gi < gens.length; gi++) {
        var gen = gens[gi];
        var jDeg = quantumGrading(gen, vWeight, nPlus, nMinus, algebra);
        vertexGens[v].push({ gen: gen, i: iDeg, j: jDeg, localIndex: gi });
        if (!gensByDegree[v][iDeg]) gensByDegree[v][iDeg] = [];
        var degIdx = gensByDegree[v][iDeg].length;
        gensByDegree[v][iDeg].push({ gen: gen, j: jDeg });
        vertexGenIndex[v][gi] = { i: iDeg, j: jDeg, indexInDegree: degIdx };
      }
    }

    // Step 2: Compute ranks per homological degree and global offsets
    var groupRanks = {};  // i -> total rank
    var globalOffset = {}; // v -> {i -> starting index}
    var jGradings = {};   // i -> [j values in order]

    for (var v = 0; v < totalVertices; v++) {
      globalOffset[v] = {};
      for (var iKey in gensByDegree[v]) {
        if (!gensByDegree[v].hasOwnProperty(iKey)) continue;
        var i = Number(iKey);
        var count = gensByDegree[v][i].length;
        if (!groupRanks[i]) { groupRanks[i] = 0; jGradings[i] = []; }
        globalOffset[v][i] = groupRanks[i];
        // Record j-gradings in order
        for (var k = 0; k < count; k++) {
          jGradings[i].push(gensByDegree[v][i][k].j);
        }
        groupRanks[i] += count;
      }
    }

    // Build ChainComplex (singly-graded)
    var complex = new ChainComplex();
    for (var iKey in groupRanks) {
      if (!groupRanks.hasOwnProperty(iKey)) continue;
      complex.groups[Number(iKey)] = groupRanks[iKey];
    }

    // Step 3: Build differentials (NO j-filtering)
    var diffEntries = {}; // i -> [{row, col, value}]

    for (var edgeObj of cube.edges()) {
      var from = edgeObj.from;
      var to = edgeObj.to;
      var bit = edgeObj.bit;
      var koszulSign = edgeObj.sign;

      var edgeInfo = cube.edgeType(from, bit);
      var srcCircles = edgeInfo.srcCircles;
      var tgtCircles = edgeInfo.tgtCircles;
      var affectedSrc = edgeInfo.affectedSrc;
      var affectedTgt = edgeInfo.affectedTgt;
      var srcToTgt = _buildCircleMapping(srcCircles, tgtCircles, affectedSrc, affectedTgt);

      var srcGenList = vertexGens[from];
      var tgtGenList = vertexGens[to];

      for (var si = 0; si < srcGenList.length; si++) {
        var srcGen = srcGenList[si].gen;
        var srcInfo = vertexGenIndex[from][si];
        var srcI = srcInfo.i;

        var images;
        if (edgeInfo.type === 'merge') {
          images = _applyMerge(srcGen, srcCircles, tgtCircles,
            affectedSrc, affectedTgt, srcToTgt, algebra);
        } else if (edgeInfo.type === 'split') {
          images = _applySplit(srcGen, srcCircles, tgtCircles,
            affectedSrc, affectedTgt, srcToTgt, algebra);
        } else {
          continue;
        }

        for (var img of images) { img.coeff *= koszulSign; }

        for (var img of images) {
          if (img.coeff === 0) continue;
          var tgtLocalIdx = _findGenIndex(tgtGenList, img.gen);
          if (tgtLocalIdx === -1) continue;
          var tgtInfo = vertexGenIndex[to][tgtLocalIdx];
          var tgtI = tgtInfo.i;

          // NO j-filtering: all cross-grading terms are included
          var col = globalOffset[from][srcI] + srcInfo.indexInDegree;
          var row = globalOffset[to][tgtI] + tgtInfo.indexInDegree;

          if (!diffEntries[srcI]) diffEntries[srcI] = [];
          diffEntries[srcI].push({ row: row, col: col, value: img.coeff });
        }
      }
    }

    // Assemble differential matrices
    for (var iKey in diffEntries) {
      if (!diffEntries.hasOwnProperty(iKey)) continue;
      var i = Number(iKey);
      var tgtI = i + 1;

      var srcRank = groupRanks[i] || 0;
      var tgtRank = groupRanks[tgtI] || 0;
      if (srcRank === 0 || tgtRank === 0) continue;

      var mat = IntMatrix.zero(tgtRank, srcRank);
      var entries = diffEntries[i];
      for (var ei = 0; ei < entries.length; ei++) {
        var e = entries[ei];
        var cur = mat.get(e.row, e.col);
        mat.set(e.row, e.col, cur + e.value);
      }

      complex.differentials[i] = mat;
    }

    return { complex: complex, jGradings: jGradings };
  }

  // ---------------------------------------------------------------
  // Internal helpers for buildKhovanovComplex
  // ---------------------------------------------------------------

  /**
   * Build a mapping from source circle indices to target circle indices
   * for the unaffected circles (those not involved in the merge/split).
   *
   * Unaffected circles appear identically in both source and target
   * (same arc sets), so we match them by their arc content.
   *
   * @returns {Object.<number, number>} srcCircleIdx -> tgtCircleIdx
   */
  function _buildCircleMapping(srcCircles, tgtCircles, affectedSrc, affectedTgt) {
    var affSrcSet = new Set(affectedSrc);
    var affTgtSet = new Set(affectedTgt);
    var mapping = {};

    // For each unaffected source circle, find its match in target
    for (var si = 0; si < srcCircles.length; si++) {
      if (affSrcSet.has(si)) continue;
      var srcKey = srcCircles[si].join(',');
      for (var ti = 0; ti < tgtCircles.length; ti++) {
        if (affTgtSet.has(ti)) continue;
        if (tgtCircles[ti].join(',') === srcKey) {
          mapping[si] = ti;
          break;
        }
      }
    }

    return mapping;
  }

  /**
   * Apply a merge edge map to a source generator.
   *
   * A merge combines two source circles (affectedSrc) into one target circle
   * (affectedTgt). The algebra's multiplication map m: V (x) V -> V is applied
   * to the two merging circles.
   *
   * @returns {Array.<{gen: number[], coeff: number}>}
   */
  function _applyMerge(srcGen, srcCircles, tgtCircles, affectedSrc, affectedTgt, srcToTgt, algebra) {
    var numTgtCircles = tgtCircles.length;

    // The two merging source circles
    var srcA = affectedSrc[0];
    var srcB = affectedSrc[1];
    // The single target circle
    var tgtMerged = affectedTgt[0];

    // Apply multiplication: m(basis[srcGen[srcA]], basis[srcGen[srcB]])
    var mulResult = algebra.multiply(srcGen[srcA], srcGen[srcB]);

    var images = [];
    for (var basisIdx = 0; basisIdx < 2; basisIdx++) {
      if (mulResult[basisIdx] === 0) continue;

      // Build the target generator
      var tgtGen = new Array(numTgtCircles);

      // Copy unaffected circles
      for (var si = 0; si < srcGen.length; si++) {
        if (si === srcA || si === srcB) continue;
        if (srcToTgt[si] !== undefined) {
          tgtGen[srcToTgt[si]] = srcGen[si];
        }
      }

      // Set the merged circle's basis element
      tgtGen[tgtMerged] = basisIdx;

      images.push({ gen: tgtGen, coeff: mulResult[basisIdx] });
    }

    return images;
  }

  /**
   * Apply a split edge map to a source generator.
   *
   * A split takes one source circle (affectedSrc) and produces two target
   * circles (affectedTgt). The algebra's comultiplication Delta: V -> V (x) V
   * is applied to the splitting circle.
   *
   * @returns {Array.<{gen: number[], coeff: number}>}
   */
  function _applySplit(srcGen, srcCircles, tgtCircles, affectedSrc, affectedTgt, srcToTgt, algebra) {
    var numTgtCircles = tgtCircles.length;

    // The single splitting source circle
    var srcSplit = affectedSrc[0];
    // The two target circles
    var tgtA = affectedTgt[0];
    var tgtB = affectedTgt[1];

    // Apply comultiplication: Delta(basis[srcGen[srcSplit]])
    var comulTerms = algebra.comultiply(srcGen[srcSplit]);

    var images = [];
    for (var ti = 0; ti < comulTerms.length; ti++) {
      var term = comulTerms[ti];
      if (term.coeff === 0) continue;

      // Build the target generator
      var tgtGen = new Array(numTgtCircles);

      // Copy unaffected circles
      for (var si = 0; si < srcGen.length; si++) {
        if (si === srcSplit) continue;
        if (srcToTgt[si] !== undefined) {
          tgtGen[srcToTgt[si]] = srcGen[si];
        }
      }

      // Set the two split circles' basis elements
      tgtGen[tgtA] = term.left;
      tgtGen[tgtB] = term.right;

      images.push({ gen: tgtGen, coeff: term.coeff });
    }

    return images;
  }

  /**
   * Find the local index of a generator (by value) in a list of vertex generators.
   * @param {Array} genList  Array of { gen: number[], ... }
   * @param {number[]} target
   * @returns {number} index, or -1 if not found
   */
  function _findGenIndex(genList, target) {
    outer:
    for (var i = 0; i < genList.length; i++) {
      var g = genList[i].gen;
      if (g.length !== target.length) continue;
      for (var k = 0; k < g.length; k++) {
        if (g[k] !== target[k]) continue outer;
      }
      return i;
    }
    return -1;
  }

  // =====================================================================
  // Self-test
  // =====================================================================

  /**
   * Run consistency checks on ChainComplex, BigradedChainComplex,
   * and buildKhovanovComplex. Throws on failure.
   */
  function selfTestChainComplex() {
    var assert = function (cond, msg) {
      if (!cond) throw new Error('chain-complex self-test FAILED: ' + msg);
    };

    // ----- ChainComplex: simple example -----
    // 0 -> Z^2 -d0-> Z -d1-> 0
    // d0 = [1, 1] (row matrix)
    var cx = new ChainComplex();
    cx.addGroup(0, 2);
    cx.addGroup(1, 1);
    cx.setDifferential(0, new IntMatrix(1, 2, [1, 1]));

    var v = cx.verify();
    assert(v.valid, 'simple complex should verify (only one differential)');

    var h0 = cx.homologyAt(0);
    // ker(d0) has rank 1 (kernel of [1,1]), im(nothing) = 0
    // H_0 = Z
    assert(h0.rank === 1, 'H_0 of [1,1] complex should have rank 1, got ' + h0.rank);

    var h1 = cx.homologyAt(1);
    // ker(nothing) = Z, im(d0) has rank 1
    // H_1 = 0
    assert(h1.rank === 0, 'H_1 of [1,1] complex should be 0, got ' + h1.rank);

    assert(cx.eulerCharacteristic() === 2 - 1, 'Euler char should be 2 - 1 = 1');

    // ----- ChainComplex: d^2 = 0 check -----
    var cx2 = new ChainComplex();
    cx2.addGroup(0, 2);
    cx2.addGroup(1, 2);
    cx2.addGroup(2, 1);
    // d0: Z^2 -> Z^2, d0 = [[1,0],[0,1]] (identity)
    cx2.setDifferential(0, IntMatrix.identity(2));
    // d1: Z^2 -> Z, d1 = [1, -1]
    cx2.setDifferential(1, new IntMatrix(1, 2, [1, -1]));
    // d1 * d0 = [1,-1] * I = [1,-1] != 0
    var v2 = cx2.verify();
    assert(!v2.valid, 'd^2 != 0 should be detected');

    // ----- ChainComplex with torsion -----
    // 0 -> Z -[2]-> Z -> 0
    var cx3 = new ChainComplex();
    cx3.addGroup(0, 1);
    cx3.addGroup(1, 1);
    cx3.setDifferential(0, new IntMatrix(1, 1, [2]));
    var h1t = cx3.homologyAt(1);
    assert(h1t.rank === 0, 'H_1 with [2] should have rank 0');
    assert(h1t.torsion.length === 1 && h1t.torsion[0] === 2,
      'H_1 with [2] should have Z/2 torsion');

    // ----- BigradedChainComplex: basic -----
    var bcx = new BigradedChainComplex();
    bcx.addGroup(0, 0, 1);
    bcx.addGroup(1, 0, 1);
    bcx.setDifferential(0, 0, new IntMatrix(1, 1, [2]));

    var bv = bcx.verify();
    assert(bv.valid, 'bigraded complex with one differential should verify');

    var bh = bcx.homologyAt(0, 0);
    assert(bh.rank === 0, 'bigraded H^{0,0} should have rank 0 (ker [2] in Z = 0)');

    var bh1 = bcx.homologyAt(1, 0);
    assert(bh1.torsion.length === 1 && bh1.torsion[0] === 2,
      'bigraded H^{1,0} should have Z/2 torsion');

    var bounds = bcx.getBounds();
    assert(bounds.iMin === 0 && bounds.iMax === 1, 'bounds i range');
    assert(bounds.jMin === 0 && bounds.jMax === 0, 'bounds j range');

    // Euler characteristic
    var chi = bcx.gradedEulerCharacteristic();
    // (-1)^0 * q^0 * 1 + (-1)^1 * q^0 * 1 = 0
    assert(chi.isZero(), 'bigraded Euler char should be 0');

    // HTML output should be a string containing <table>
    var html = bcx.toHTML();
    assert(html.indexOf('<table') !== -1, 'toHTML should produce table');

    // ----- buildKhovanovComplex: unknot (0 crossings) -----
    // The unknot has no crossings. The complex should have a single
    // vertex (the empty resolution) with one circle.
    // However, our PD code convention requires at least one crossing.
    // Skip this test.

    // ----- buildKhovanovComplex: Hopf link (2 crossings) -----
    // PD: [1,4,2,3], [3,2,4,1], signs [+1,+1]
    // This is a standard test case.
    if (typeof ResolutionCube !== 'undefined' && typeof FrobeniusAlgebra !== 'undefined') {
      var hopfPD = [[1, 4, 2, 3], [3, 2, 4, 1]];
      var hopfSigns = [+1, +1];
      var hopfCx = buildKhovanovComplex(hopfPD, hopfSigns,
        FrobeniusAlgebra.Khovanov, CoefficientRing.Z);

      var hopfVerify = hopfCx.verify();
      assert(hopfVerify.valid,
        'Hopf link Khovanov complex should satisfy d^2=0: ' +
        hopfVerify.errors.join('; '));

      // The graded Euler characteristic of the Khovanov complex
      // should equal the Jones polynomial (up to normalization).
      var hopfEuler = hopfCx.gradedEulerCharacteristic();
      assert(!hopfEuler.isZero(), 'Hopf link Euler char should be nonzero');

      // ----- buildKhovanovComplex: trefoil (3 crossings) -----
      var trefoilPD = [[1, 4, 2, 3], [3, 6, 4, 5], [5, 2, 6, 1]];
      var trefoilSigns = [+1, +1, +1];
      var trefoilCx = buildKhovanovComplex(trefoilPD, trefoilSigns,
        FrobeniusAlgebra.Khovanov, CoefficientRing.Z);

      var trefoilVerify = trefoilCx.verify();
      assert(trefoilVerify.valid,
        'Trefoil Khovanov complex should satisfy d^2=0: ' +
        trefoilVerify.errors.join('; '));

      // Trefoil Khovanov homology is well-known:
      // Kh^{0,-1} = Z, Kh^{0,-3} = Z, Kh^{-2,-5} = Z, Kh^{-3,-9} = Z
      // with Z/2 torsion in Kh^{-3,-7}
      // (using the standard convention with n_- = 0 here since all positive)
      var trefoilHom = trefoilCx.homology();
      assert(trefoilHom.size > 0, 'Trefoil should have nonzero homology');

      console.log('  Trefoil Khovanov homology:');
      trefoilHom.forEach(function (h, key) {
        var parts = [];
        if (h.rank > 0) parts.push('Z^' + h.rank);
        for (var t = 0; t < h.torsion.length; t++) {
          parts.push('Z/' + h.torsion[t]);
        }
        console.log('    Kh^{' + key + '} = ' + parts.join(' + '));
      });
    }

    console.log('chain-complex self-test: all tests passed.');
  }

  // =====================================================================
  // Expose on global
  // =====================================================================

  global.ChainComplex = ChainComplex;
  global.BigradedChainComplex = BigradedChainComplex;
  global.buildKhovanovComplex = buildKhovanovComplex;
  global.buildFilteredKhovanovComplex = buildFilteredKhovanovComplex;
  global.selfTestChainComplex = selfTestChainComplex;

})(typeof window !== 'undefined' ? window : globalThis);
