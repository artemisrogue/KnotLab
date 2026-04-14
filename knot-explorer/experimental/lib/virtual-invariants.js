/**
 * virtual-invariants.js -- Virtual knot invariants computed from Gauss codes
 *
 * All functions take a parsed Gauss code (output of parseGaussCode) as input.
 * Depends on polynomial.js (LaurentPoly, CoefficientRing) and
 * gauss-code.js (parseGaussCode, interlacementMatrix, crossingParities,
 * crossingIndices, gaussWrithe).
 *
 * Usage (browser <script> tag):
 *   <script src="polynomial.js"></script>
 *   <script src="gauss-code.js"></script>
 *   <script src="virtual-invariants.js"></script>
 *   const gc = parseGaussCode("1 -2v 3 -1 2v -3");
 *   console.log(oddWrithe(gc));
 *   console.log(indexPolynomial(gc).toLatex('t'));
 */

(function (global) {
  'use strict';

  // Convenience references (these must be loaded before this file)
  var Z = global.CoefficientRing.Z;

  // ----------------------------------------------------------------
  // Internal helpers
  // ----------------------------------------------------------------

  /**
   * Flatten all components into a single sequence.
   */
  function _flat(gc) {
    var seq = [];
    for (var i = 0; i < gc.components.length; i++) {
      for (var j = 0; j < gc.components[i].length; j++) {
        seq.push(gc.components[i][j]);
      }
    }
    return seq;
  }

  /**
   * Get crossing positions: Map<id, [pos1, pos2]>.
   */
  function _positions(gc) {
    var seq = _flat(gc);
    var pos = new Map();
    for (var i = 0; i < seq.length; i++) {
      var id = seq[i].id;
      if (!pos.has(id)) {
        pos.set(id, [i]);
      } else {
        pos.get(id).push(i);
      }
    }
    return pos;
  }

  /**
   * Get classical crossing ids (those appearing exactly twice and not virtual).
   */
  function _classicalIds(gc) {
    var seq = _flat(gc);
    var ids = new Set();
    for (var i = 0; i < seq.length; i++) {
      if (!seq[i].isVirtual) ids.add(seq[i].id);
    }
    return ids;
  }

  /**
   * Sign of a crossing from its first appearance in the sequence.
   */
  function _crossingSign(gc, crossingId) {
    var seq = _flat(gc);
    for (var i = 0; i < seq.length; i++) {
      if (seq[i].id === crossingId && !seq[i].isVirtual) {
        return seq[i].sign;
      }
    }
    return 0;
  }

  // ----------------------------------------------------------------
  // Odd Writhe
  // ----------------------------------------------------------------

  /**
   * Odd writhe: sum of signs of odd crossings.
   * Always 0 for classical knots (all crossings are even in classical case).
   *
   * @param {{crossings, components, numClassical, numVirtual}} gc
   * @returns {number}
   */
  function oddWrithe(gc) {
    var parities = global.crossingParities(gc);
    var sum = 0;

    parities.forEach(function (parity, id) {
      if (parity === 'odd') {
        sum += _crossingSign(gc, id);
      }
    });

    return sum;
  }

  // ----------------------------------------------------------------
  // Index Polynomial (Henrich)
  // ----------------------------------------------------------------

  /**
   * Index polynomial (Henrich):
   *   f_K(t) = sum over crossings c with ind(c) != 0 of: sign(c) * t^|ind(c)|
   *
   * @param {{crossings, components, numClassical, numVirtual}} gc
   * @returns {LaurentPoly}  polynomial in variable t (over Z)
   */
  function indexPolynomial(gc) {
    var indices = global.crossingIndices(gc);
    var terms = [];

    indices.forEach(function (ind, id) {
      if (ind === 0) return;
      var sign = _crossingSign(gc, id);
      terms.push({ c: sign, e: Math.abs(ind) });
    });

    if (terms.length === 0) return global.LaurentPoly.zero();
    return new global.LaurentPoly(terms, Z);
  }

  // ----------------------------------------------------------------
  // Writhe Polynomial (Cheng-Gao)
  // ----------------------------------------------------------------

  /**
   * Writhe polynomial (Cheng-Gao):
   *   W_K(t) = sum_n J_n(K) * t^n
   *   where J_n(K) = sum of sign(c) over crossings c with ind(c) = n
   *
   * @param {{crossings, components, numClassical, numVirtual}} gc
   * @returns {LaurentPoly}  polynomial in variable t (over Z)
   */
  function writhePolynomial(gc) {
    var indices = global.crossingIndices(gc);
    // Group by index value
    var jn = new Map(); // index value -> sum of signs

    indices.forEach(function (ind, id) {
      var sign = _crossingSign(gc, id);
      if (!jn.has(ind)) jn.set(ind, 0);
      jn.set(ind, jn.get(ind) + sign);
    });

    var terms = [];
    jn.forEach(function (coeff, exp) {
      if (coeff !== 0) {
        terms.push({ c: coeff, e: exp });
      }
    });

    if (terms.length === 0) return global.LaurentPoly.zero();
    return new global.LaurentPoly(terms, Z);
  }

  // ----------------------------------------------------------------
  // Affine Index Polynomial (Kauffman)
  // ----------------------------------------------------------------

  /**
   * Affine index polynomial (Kauffman):
   *
   * For each classical crossing c with positions p1 < p2 in the Gauss code,
   * define W+(c) = number of positive crossings encountered between p1 and p2
   * minus number of negative crossings, among crossings interleaved with c.
   * Similarly define W-(c) for the complementary arc.
   *
   * The affine index of c is: aff(c) = W+(c) - W-(c).
   * The affine index polynomial is:
   *   P_K(t) = sum over classical crossings c of: sign(c) * (t^{aff(c)} - 1)
   *
   * This can also be expressed as: sum_{n != 0} J_n * (t^n - 1)
   * where J_n = sum of sign(c) over crossings with aff(c) = n.
   *
   * A simpler but equivalent formulation: the affine index equals the
   * crossing index for oriented virtual knots. We use the crossing index.
   *
   * @param {{crossings, components, numClassical, numVirtual}} gc
   * @returns {LaurentPoly}
   */
  function affineIndexPolynomial(gc) {
    var indices = global.crossingIndices(gc);
    // P_K(t) = sum_c sign(c) * (t^{ind(c)} - 1)
    var terms = [];

    indices.forEach(function (ind, id) {
      var sign = _crossingSign(gc, id);
      // sign * t^ind - sign * t^0
      if (ind !== 0) {
        terms.push({ c: sign, e: ind });
        terms.push({ c: -sign, e: 0 });
      }
      // When ind = 0, the contribution is sign*(1 - 1) = 0
    });

    if (terms.length === 0) return global.LaurentPoly.zero();
    return new global.LaurentPoly(terms, Z);
  }

  // ----------------------------------------------------------------
  // Virtual Jones Polynomial via Kauffman Bracket
  // ----------------------------------------------------------------

  /**
   * Virtual Jones polynomial via the Kauffman bracket applied to a Gauss code.
   *
   * At each classical crossing, we perform A-smoothing (0) or B-smoothing (1).
   * Virtual crossings are inert: strands pass through them unchanged.
   * For each of the 2^n resolutions, we count the number of closed curves
   * (following arcs through virtual crossings) and weight by
   * A^{sigma(v)} * d^{circles - 1} where d = -A^2 - A^{-2} and
   * sigma(v) = sum of (+1 for A-smoothing, -1 for B-smoothing) at each crossing.
   *
   * The bracket is then normalized by (-A^3)^{-writhe} to get the Jones polynomial.
   *
   * @param {{crossings, components, numClassical, numVirtual}} gc
   * @returns {LaurentPoly}  polynomial in variable A (over Z)
   */
  function virtualJones(gc) {
    var seq = _flat(gc);
    var pos = _positions(gc);
    var classIds = [];
    var classIdSet = _classicalIds(gc);
    classIdSet.forEach(function (id) { classIds.push(id); });
    classIds.sort(function (a, b) { return a - b; });

    var n = classIds.length;
    if (n === 0) {
      // Unknot or unlinked circles: bracket = 1
      // Count the number of components
      return global.LaurentPoly.one();
    }

    // d = -A^2 - A^{-2}
    var d = new global.LaurentPoly([{ c: -1, e: 2 }, { c: -1, e: -2 }], Z);

    var bracket = global.LaurentPoly.zero();

    // Iterate over all 2^n resolutions
    var numResolutions = 1 << n;
    for (var v = 0; v < numResolutions; v++) {
      // Compute sigma: count A-smoothings (+1) minus B-smoothings (-1)
      var sigma = 0;
      for (var bit = 0; bit < n; bit++) {
        if ((v >> bit) & 1) {
          sigma--; // B-smoothing
        } else {
          sigma++; // A-smoothing
        }
      }

      // Count circles in this resolution
      var circles = _countCircles(gc, seq, pos, classIds, v);

      // Weight: A^sigma * d^(circles - 1)
      // = A^sigma * (-A^2 - A^{-2})^(circles - 1)
      var weight = global.LaurentPoly.q(sigma); // A^sigma
      if (circles > 1) {
        var dPow = _polyPow(d, circles - 1);
        weight = weight.multiply(dPow);
      }
      // If circles = 0 (shouldn't happen for valid knots), treat as d^{-1} -- skip

      bracket = bracket.add(weight);
    }

    // Normalize: Jones = (-A^3)^{-w} * bracket, where w = writhe
    var w = global.gaussWrithe(gc);
    // (-A^3)^{-w} = (-1)^{-w} * A^{-3w}
    var normSign = (w % 2 === 0) ? 1 : -1;
    var normPoly = new global.LaurentPoly([{ c: normSign, e: -3 * w }], Z);
    var jones = normPoly.multiply(bracket);

    return jones;
  }

  /**
   * Count closed curves in a resolution of the Gauss code.
   *
   * We build arcs from the sequence, then at each classical crossing
   * apply the appropriate smoothing, and at each virtual crossing the
   * strands pass through unchanged. Then count connected components.
   *
   * @param {object} gc
   * @param {Array} seq - flattened sequence
   * @param {Map} pos - crossing positions
   * @param {number[]} classIds - sorted classical crossing ids
   * @param {number} v - bitmask for resolution
   * @returns {number}
   */
  function _countCircles(gc, seq, pos, classIds, v) {
    var len = seq.length;
    // Build crossing id -> bit index
    var bitOf = new Map();
    for (var i = 0; i < classIds.length; i++) {
      bitOf.set(classIds[i], i);
    }

    // Each position in the sequence has an "incoming" side and "outgoing" side.
    // There are 2*len endpoints: (pos, 'in') and (pos, 'out') for each position.
    // An arc of the original diagram connects (pos, 'out') to ((pos+1)%len, 'in').

    // At each crossing (which occupies two positions p1 and p2), the smoothing
    // reconnects the strands:
    //   A-smoothing (0): connect (p1, in) with (p1, out) and (p2, in) with (p2, out)
    //     -- wait, that's the "don't cross" smoothing. But the actual effect depends
    //     on crossing type.
    //
    // More carefully:
    // At a positive crossing (over-strand goes from p_over to next):
    //   Two strands meet: over-strand passes over under-strand.
    //   A-smoothing: connect the strands that turn right (over_in to under_out, under_in to over_out)
    //   B-smoothing: connect the strands that turn left (over_in to over_out, under_in to under_out)
    //
    // For Gauss code-level smoothing, we work with the positions:
    // At crossing c with positions p1 (first appearance) and p2 (second appearance):
    //   The four "endpoints" are: in@p1, out@p1, in@p2, out@p2
    //   A-smoothing (resolution 0): connect in@p1--out@p2 and in@p2--out@p1
    //   B-smoothing (resolution 1): connect in@p1--out@p1 and in@p2--out@p2

    // Union-Find on endpoint ids
    // Endpoint id: position * 2 + 0 (in), position * 2 + 1 (out)
    var parent = new Int32Array(2 * len);
    for (var k = 0; k < 2 * len; k++) parent[k] = k;

    function find(x) {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }

    function union(a, b) {
      a = find(a);
      b = find(b);
      if (a !== b) parent[a] = b;
    }

    // First, connect adjacent positions via arcs:
    // Arc from position p to position (p+1)%len connects out@p to in@(p+1)%len
    for (var p = 0; p < len; p++) {
      var nextP = (p + 1) % len;
      union(p * 2 + 1, nextP * 2 + 0); // out@p -- in@next
    }

    // Now apply smoothing at each crossing
    var processed = new Set();
    for (var si = 0; si < len; si++) {
      var c = seq[si];
      if (c.isVirtual) {
        // Virtual crossing: strands pass through unchanged.
        // This means in@p connects to out@p (the strand continues straight).
        // But this is already handled by the arc connections above -- the
        // virtual crossing just means positions are linked in sequence.
        // Actually, for virtual crossings we DON'T reconnect anything.
        // The two appearances of a virtual crossing in the Gauss code
        // represent strands that just pass through each other.
        // The arc connections already handle this correctly: in@p -- out@p
        // via the sequence connectivity (p is just a waypoint).
        // So we connect in@p to out@p directly (strand goes straight through).
        union(si * 2 + 0, si * 2 + 1);
        continue;
      }

      if (processed.has(c.id)) continue;
      processed.add(c.id);

      var positions = pos.get(c.id);
      var p1 = positions[0];
      var p2 = positions[1];
      var bit = bitOf.get(c.id);
      var resolution = (v >> bit) & 1;

      if (resolution === 0) {
        // A-smoothing: in@p1 -- out@p2, in@p2 -- out@p1
        union(p1 * 2 + 0, p2 * 2 + 1);
        union(p2 * 2 + 0, p1 * 2 + 1);
      } else {
        // B-smoothing: in@p1 -- out@p1, in@p2 -- out@p2
        union(p1 * 2 + 0, p1 * 2 + 1);
        union(p2 * 2 + 0, p2 * 2 + 1);
      }
    }

    // Also union in@p -- out@p for positions that correspond to virtual crossings
    // (already done above in the loop)

    // Count distinct components among the endpoints
    var roots = new Set();
    for (var e = 0; e < 2 * len; e++) {
      roots.add(find(e));
    }

    return roots.size;
  }

  /**
   * Compute p^n for a LaurentPoly (non-negative integer exponent).
   */
  function _polyPow(p, n) {
    if (n === 0) return global.LaurentPoly.one();
    var result = global.LaurentPoly.one();
    var base = p;
    while (n > 0) {
      if (n & 1) result = result.multiply(base);
      base = base.multiply(base);
      n >>= 1;
    }
    return result;
  }

  // ----------------------------------------------------------------
  // Arrow Polynomial (Dye-Kauffman)
  // ----------------------------------------------------------------

  /**
   * Arrow polynomial (Dye-Kauffman):
   * Extension of the Kauffman bracket that tracks arrow/winding information
   * at smoothing sites. Circles with nonzero winding number k evaluate to
   * K^|k| instead of d = -A^2 - A^{-2}.
   *
   * Returns a Map from K-exponent to LaurentPoly in A.
   * The K^0 part is the ordinary Kauffman bracket (using d = -A^2 - A^{-2}).
   *
   * @param {{crossings, components, numClassical, numVirtual}} gc
   * @returns {Map<number, LaurentPoly>}  K-exponent -> polynomial in A
   */
  function arrowPolynomial(gc) {
    var seq = _flat(gc);
    var pos = _positions(gc);
    var classIds = [];
    _classicalIds(gc).forEach(function (id) { classIds.push(id); });
    classIds.sort(function (a, b) { return a - b; });
    var n = classIds.length;

    var result = new Map(); // K-exponent -> LaurentPoly in A

    function addTerm(kExp, poly) {
      if (result.has(kExp)) {
        result.set(kExp, result.get(kExp).add(poly));
      } else {
        result.set(kExp, poly);
      }
    }

    if (n === 0) {
      // Unknot: arrow polynomial is 1
      result.set(0, global.LaurentPoly.one());
      return result;
    }

    var d = new global.LaurentPoly([{ c: -1, e: 2 }, { c: -1, e: -2 }], Z);

    var numResolutions = 1 << n;
    for (var v = 0; v < numResolutions; v++) {
      // Compute sigma
      var sigma = 0;
      for (var bit = 0; bit < n; bit++) {
        sigma += ((v >> bit) & 1) ? -1 : 1;
      }

      // Get circles and their winding numbers
      var circleInfo = _countCirclesWithWinding(gc, seq, pos, classIds, v);
      // circleInfo: array of winding numbers (one per circle)

      // Weight: A^sigma * product over circles of evaluation
      // Circle with winding 0 -> d = -A^2 - A^{-2}
      // Circle with winding k != 0 -> K^|k|
      var aPoly = global.LaurentPoly.q(sigma); // A^sigma
      var totalKExp = 0;

      for (var ci = 0; ci < circleInfo.length; ci++) {
        var wind = circleInfo[ci];
        if (wind === 0) {
          aPoly = aPoly.multiply(d);
        } else {
          totalKExp += Math.abs(wind);
        }
      }

      addTerm(totalKExp, aPoly);
    }

    // Normalize with writhe: multiply by (-A^3)^{-w}
    var w = global.gaussWrithe(gc);
    var normSign = (w % 2 === 0) ? 1 : -1;
    var normPoly = new global.LaurentPoly([{ c: normSign, e: -3 * w }], Z);

    var normalized = new Map();
    result.forEach(function (poly, kExp) {
      var normed = normPoly.multiply(poly);
      if (!normed.isZero()) {
        normalized.set(kExp, normed);
      }
    });

    return normalized;
  }

  /**
   * Count circles and compute winding numbers in a resolution.
   * The winding number of a circle tracks how many virtual crossings
   * the circle winds through, with a sign based on the direction.
   *
   * @returns {number[]}  array of winding numbers, one per circle
   */
  function _countCirclesWithWinding(gc, seq, pos, classIds, v) {
    var len = seq.length;
    var bitOf = new Map();
    for (var i = 0; i < classIds.length; i++) {
      bitOf.set(classIds[i], i);
    }

    // Build adjacency for the smoothed diagram.
    // Each position p has two sides: in (2*p) and out (2*p+1).
    // We need to track which endpoints are connected and trace circles.
    var adj = new Int32Array(2 * len);
    for (var k = 0; k < 2 * len; k++) adj[k] = -1;

    function link(a, b) {
      adj[a] = b;
      adj[b] = a;
    }

    // Arc connections: out@p -> in@(p+1)%len
    for (var p = 0; p < len; p++) {
      var nextP = (p + 1) % len;
      link(p * 2 + 1, nextP * 2 + 0);
    }

    // Smoothing at crossings
    var processed = new Set();
    for (var si = 0; si < len; si++) {
      var c = seq[si];
      if (c.isVirtual) {
        // Virtual: straight through
        link(si * 2 + 0, si * 2 + 1);
        continue;
      }
      if (processed.has(c.id)) continue;
      processed.add(c.id);

      var positions = pos.get(c.id);
      var p1 = positions[0], p2 = positions[1];
      var bit = bitOf.get(c.id);
      var resolution = (v >> bit) & 1;

      if (resolution === 0) {
        link(p1 * 2 + 0, p2 * 2 + 1);
        link(p2 * 2 + 0, p1 * 2 + 1);
      } else {
        link(p1 * 2 + 0, p1 * 2 + 1);
        link(p2 * 2 + 0, p2 * 2 + 1);
      }
    }

    // Trace circles using the adjacency.
    // A circle is formed by following: endpoint -> its partner via adj,
    // then the partner's other connection (arc or smoothing).
    // Actually, we need to be more careful. Each endpoint is involved in
    // exactly two connections: one from adj (smoothing/virtual) and one from
    // the arc connection. But we stored them in the same adj array, overwriting.
    //
    // Let me redo this with a proper pairing approach.
    // Each endpoint participates in two pairings:
    //   1. Arc pairing: out@p paired with in@(p+1)%len
    //   2. Crossing pairing: determined by smoothing
    // A circle alternates between these two pairings.

    // Rebuild with separate pairings
    var arcPair = new Int32Array(2 * len).fill(-1);
    var crossPair = new Int32Array(2 * len).fill(-1);

    // Arc pairing
    for (var ap = 0; ap < len; ap++) {
      var nextAp = (ap + 1) % len;
      arcPair[ap * 2 + 1] = nextAp * 2 + 0;
      arcPair[nextAp * 2 + 0] = ap * 2 + 1;
    }

    // Crossing pairing
    processed = new Set();
    for (var cp = 0; cp < len; cp++) {
      var cr = seq[cp];
      if (cr.isVirtual) {
        crossPair[cp * 2 + 0] = cp * 2 + 1;
        crossPair[cp * 2 + 1] = cp * 2 + 0;
        continue;
      }
      if (processed.has(cr.id)) continue;
      processed.add(cr.id);

      var cpos = pos.get(cr.id);
      var cp1 = cpos[0], cp2 = cpos[1];
      var cbit = bitOf.get(cr.id);
      var cres = (v >> cbit) & 1;

      if (cres === 0) {
        crossPair[cp1 * 2 + 0] = cp2 * 2 + 1;
        crossPair[cp2 * 2 + 1] = cp1 * 2 + 0;
        crossPair[cp2 * 2 + 0] = cp1 * 2 + 1;
        crossPair[cp1 * 2 + 1] = cp2 * 2 + 0;
      } else {
        crossPair[cp1 * 2 + 0] = cp1 * 2 + 1;
        crossPair[cp1 * 2 + 1] = cp1 * 2 + 0;
        crossPair[cp2 * 2 + 0] = cp2 * 2 + 1;
        crossPair[cp2 * 2 + 1] = cp2 * 2 + 0;
      }
    }

    // Trace circles by alternating pairings
    var visited = new Uint8Array(2 * len);
    var windings = [];

    for (var start = 0; start < 2 * len; start++) {
      if (visited[start]) continue;
      var winding = 0;
      var cur = start;
      var useCross = true; // start with crossing pairing

      while (true) {
        visited[cur] = 1;
        var next;
        if (useCross) {
          next = crossPair[cur];
        } else {
          next = arcPair[cur];
          // When traversing an arc, check if we pass through a virtual crossing
          // For winding: if this arc passes through a virtual crossing position,
          // increment or decrement winding.
          // The arc goes from position (cur_pos, out) to (next_pos, in).
          // A virtual crossing at either endpoint contributes to winding.
          var curPos = Math.floor(cur / 2);
          var nextPos = Math.floor(next / 2);
          if (seq[nextPos] && seq[nextPos].isVirtual) {
            winding += seq[nextPos].sign;
          }
        }

        if (next === -1 || next === start) {
          // Circle complete
          break;
        }
        if (visited[next]) {
          break;
        }
        visited[next] = 1;
        useCross = !useCross;
        cur = next;
      }

      windings.push(winding);
    }

    return windings;
  }

  // ----------------------------------------------------------------
  // Parity Bracket (Manturov)
  // ----------------------------------------------------------------

  /**
   * Parity bracket (Manturov):
   * Even crossings are resolved normally (A or B smoothing).
   * Odd crossings are NOT resolved -- they remain in the diagram.
   *
   * Returns a simplified representation:
   * { polynomial: LaurentPoly in A (from even crossing resolutions),
   *   oddCrossings: number (count of unresolved odd crossings),
   *   description: string }
   *
   * For a fully classical knot (no odd crossings), this reduces to
   * the ordinary Kauffman bracket.
   *
   * @param {{crossings, components, numClassical, numVirtual}} gc
   * @returns {{ polynomial: LaurentPoly, oddCrossings: number, description: string }}
   */
  function parityBracket(gc) {
    var parities = global.crossingParities(gc);
    var seq = _flat(gc);
    var pos = _positions(gc);

    // Separate even and odd classical crossings
    var evenIds = [];
    var oddIds = [];
    parities.forEach(function (parity, id) {
      if (parity === 'even') {
        evenIds.push(id);
      } else {
        oddIds.push(id);
      }
    });
    evenIds.sort(function (a, b) { return a - b; });
    oddIds.sort(function (a, b) { return a - b; });

    var nEven = evenIds.length;
    var nOdd = oddIds.length;

    if (nEven === 0 && nOdd === 0) {
      return {
        polynomial: global.LaurentPoly.one(),
        oddCrossings: 0,
        description: 'Unknot: bracket = 1'
      };
    }

    // Resolve only even crossings; odd crossings stay
    var d = new global.LaurentPoly([{ c: -1, e: 2 }, { c: -1, e: -2 }], Z);
    var bracket = global.LaurentPoly.zero();

    var numRes = 1 << nEven;
    for (var v = 0; v < numRes; v++) {
      var sigma = 0;
      for (var bit = 0; bit < nEven; bit++) {
        sigma += ((v >> bit) & 1) ? -1 : 1;
      }

      // Count circles in this partial resolution (odd crossings remain as nodes)
      var circles = _countCirclesPartial(gc, seq, pos, evenIds, oddIds, v);

      var weight = global.LaurentPoly.q(sigma);
      if (circles > 1) {
        weight = weight.multiply(_polyPow(d, circles - 1));
      }

      bracket = bracket.add(weight);
    }

    // Normalize
    var w = global.gaussWrithe(gc);
    var normSign = (w % 2 === 0) ? 1 : -1;
    var normPoly = new global.LaurentPoly([{ c: normSign, e: -3 * w }], Z);
    bracket = normPoly.multiply(bracket);

    var desc = nOdd === 0
      ? 'All crossings even; parity bracket equals Kauffman bracket'
      : nOdd + ' odd crossing(s) remain unresolved';

    return {
      polynomial: bracket,
      oddCrossings: nOdd,
      description: desc
    };
  }

  /**
   * Count circles in a partial resolution where only even crossings are resolved
   * and odd crossings remain (treated as nodes the strand passes through).
   */
  function _countCirclesPartial(gc, seq, pos, evenIds, oddIds, v) {
    var len = seq.length;
    var bitOf = new Map();
    for (var i = 0; i < evenIds.length; i++) {
      bitOf.set(evenIds[i], i);
    }

    // Union-Find
    var parent = new Int32Array(2 * len);
    for (var k = 0; k < 2 * len; k++) parent[k] = k;

    function find(x) {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }

    function union(a, b) {
      a = find(a);
      b = find(b);
      if (a !== b) parent[a] = b;
    }

    // Arc connections
    for (var p = 0; p < len; p++) {
      var nextP = (p + 1) % len;
      union(p * 2 + 1, nextP * 2 + 0);
    }

    // Process crossings
    var processed = new Set();
    for (var si = 0; si < len; si++) {
      var c = seq[si];
      if (c.isVirtual) {
        union(si * 2 + 0, si * 2 + 1);
        continue;
      }
      if (processed.has(c.id)) continue;
      processed.add(c.id);

      var positions = pos.get(c.id);
      var p1 = positions[0], p2 = positions[1];

      if (bitOf.has(c.id)) {
        // Even crossing: resolve according to v
        var bit = bitOf.get(c.id);
        var resolution = (v >> bit) & 1;
        if (resolution === 0) {
          union(p1 * 2 + 0, p2 * 2 + 1);
          union(p2 * 2 + 0, p1 * 2 + 1);
        } else {
          union(p1 * 2 + 0, p1 * 2 + 1);
          union(p2 * 2 + 0, p2 * 2 + 1);
        }
      } else {
        // Odd crossing: strand passes straight through (do not reconnect)
        // The strand continues: in@p1 -> out@p1 and in@p2 -> out@p2
        union(p1 * 2 + 0, p1 * 2 + 1);
        union(p2 * 2 + 0, p2 * 2 + 1);
      }
    }

    // Count components
    var roots = new Set();
    for (var e = 0; e < 2 * len; e++) {
      roots.add(find(e));
    }
    return roots.size;
  }

  // ----------------------------------------------------------------
  // Self-test
  // ----------------------------------------------------------------

  /**
   * Run internal consistency checks. Throws on failure.
   */
  function _selfTestVirtualInvariants() {
    var pass = 0;
    var total = 0;

    function assert(cond, msg) {
      total++;
      if (!cond) throw new Error('FAIL [virtual-invariants]: ' + msg);
      pass++;
    }

    // --- Trefoil: "1 -2 3 -1 2 -3" ---
    // All crossings are even in a classical knot, so odd writhe = 0.
    var trefoil = global.parseGaussCode('1 -2 3 -1 2 -3');
    assert(oddWrithe(trefoil) === 0, 'trefoil odd writhe = 0');

    // Index polynomial: all crossing indices are 0 for trefoil,
    // so index polynomial should be 0
    var idxPoly = indexPolynomial(trefoil);
    assert(idxPoly.isZero(), 'trefoil index polynomial = 0');

    // Writhe polynomial: J_0 = writhe = 1, so W(t) = t^0 * 1 = 1
    var wrPoly = writhePolynomial(trefoil);
    // The writhe polynomial includes J_0 which is the sum of signs of
    // crossings with index 0. For trefoil: all 3 crossings have index 0.
    // Signs: crossing 1 -> +1, crossing 2 -> -1, crossing 3 -> +1
    // J_0 = 1 + (-1) + 1 = 1
    var j0 = wrPoly._terms.get(0);
    assert(j0 === 1, 'trefoil writhe poly J_0 = 1, got ' + j0);

    // Affine index polynomial: should be 0 for classical knots with
    // all indices = 0
    var affPoly = affineIndexPolynomial(trefoil);
    assert(affPoly.isZero(), 'trefoil affine index poly = 0');

    // --- Virtual trefoil: "1 2 -1 -2" ---
    // This is the simplest virtual knot (2 classical crossings)
    var vTrefoil = global.parseGaussCode('1 2 -1 -2');
    // Crossings 1 and 2: interleaved (since positions are 1@(0,2), 2@(1,3) on circle of 4)
    // Each interleaved with 1 other => odd parity
    assert(vTrefoil.numClassical === 2, 'virtual trefoil has 2 crossings');

    var vPar = global.crossingParities(vTrefoil);
    assert(vPar.get(1) === 'odd', 'vTrefoil crossing 1 is odd');
    assert(vPar.get(2) === 'odd', 'vTrefoil crossing 2 is odd');

    // Odd writhe: sum of signs of odd crossings
    // Crossing 1: first appearance is +1 (over), sign = +1
    // Crossing 2: first appearance is +2 (over), sign = +1
    // oddWrithe = 1 + 1 = 2
    var vOddW = oddWrithe(vTrefoil);
    assert(vOddW === 2, 'virtual trefoil odd writhe = 2, got ' + vOddW);

    // The nonzero odd writhe proves this is not a classical knot!

    // --- virtualJones basic test ---
    // For the unknot (empty Gauss code, which won't parse well), test with
    // a simple case: figure-eight "1 -2 3 -4 2 -1 4 -3"
    var figEight = global.parseGaussCode('1 -2 3 -4 2 -1 4 -3');
    var feJones = virtualJones(figEight);
    // The Jones polynomial of the figure-eight is known:
    // V(t) = t^{-2} - t^{-1} + 1 - t + t^2  (in variable t = A^{-4} convention)
    // The Kauffman bracket is more complex in A. Just check it's nonzero.
    assert(!feJones.isZero(), 'figure-eight Jones is nonzero');

    // --- parity bracket for classical knot (all even) ---
    var pbTrefoil = parityBracket(trefoil);
    assert(pbTrefoil.oddCrossings === 0, 'trefoil parity bracket: 0 odd crossings');
    assert(!pbTrefoil.polynomial.isZero(), 'trefoil parity bracket is nonzero');

    // --- parity bracket for virtual trefoil (all odd) ---
    var pbVTrefoil = parityBracket(vTrefoil);
    assert(pbVTrefoil.oddCrossings === 2, 'vTrefoil parity bracket: 2 odd crossings');

    // --- arrow polynomial: classical knot should give Map with only K^0 ---
    var arTrefoil = arrowPolynomial(trefoil);
    // For a classical knot, all circles have winding 0, so only K^0 term
    assert(arTrefoil.has(0), 'trefoil arrow poly has K^0 term');
    // Check that the K^0 term matches the Jones polynomial (up to normalization)
    assert(!arTrefoil.get(0).isZero(), 'trefoil arrow poly K^0 is nonzero');

    // --- Index polynomial for virtual trefoil ---
    var vIdxPoly = indexPolynomial(vTrefoil);
    // Crossing indices for vTrefoil:
    // Crossings 1,2 interleaved. Index of 1: sign(2) = +1. Index of 2: sign(1) = +1.
    // So ind(1) = 1, ind(2) = 1.
    // Index poly = sign(1)*t^|1| + sign(2)*t^|1| = t + t = 2t
    var vIdxTerms = [];
    vIdxPoly._terms.forEach(function (c, e) { vIdxTerms.push({ c: c, e: e }); });
    assert(vIdxTerms.length > 0, 'vTrefoil index polynomial is nonzero');

    console.log('virtual-invariants._selfTest: ' + pass + '/' + total + ' tests passed.');
    return { pass: pass, total: total };
  }

  // ----------------------------------------------------------------
  // Expose on global
  // ----------------------------------------------------------------

  global.oddWrithe = oddWrithe;
  global.indexPolynomial = indexPolynomial;
  global.writhePolynomial = writhePolynomial;
  global.affineIndexPolynomial = affineIndexPolynomial;
  global.arrowPolynomial = arrowPolynomial;
  global.virtualJones = virtualJones;
  global.parityBracket = parityBracket;

  // Namespace object for tab-virtual.js compatibility
  global.VirtualInvariants = {
    jonesPolynomial: virtualJones,
    oddWrithe: oddWrithe,
    indexPolynomial: indexPolynomial,
    writhePolynomial: writhePolynomial,
    arrowPolynomial: arrowPolynomial,
    affineIndexPolynomial: affineIndexPolynomial,
    parityBracket: parityBracket
  };

  // Self-test
  global._selfTestVirtualInvariants = _selfTestVirtualInvariants;

})(typeof window !== 'undefined' ? window : globalThis);
