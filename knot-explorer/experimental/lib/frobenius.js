/**
 * frobenius.js -- Pluggable Frobenius algebras for Khovanov-type homology
 *
 * A 2-dimensional commutative Frobenius algebra V = span{1, x} over a
 * coefficient ring, equipped with multiplication m, comultiplication Delta,
 * unit, and counit satisfying the standard axioms.
 *
 * Three pre-built variants are provided as static properties:
 *   FrobeniusAlgebra.Khovanov  -- standard (x^2 = 0)
 *   FrobeniusAlgebra.Lee       -- Lee deformation (x^2 = 1)
 *   FrobeniusAlgebra.BarNatan  -- Bar-Natan deformation (x^2 = x)
 *
 * Usage (browser <script> tag):
 *   <script src="frobenius.js"></script>
 *   const A = FrobeniusAlgebra.Khovanov;
 *   console.log(A.multiply(1, 1));  // [0, 0]  (x * x = 0)
 */

(function (global) {
  'use strict';

  // ----------------------------------------------------------------
  // Minimal coefficient ring abstraction
  // ----------------------------------------------------------------

  /**
   * CoefficientRing: lightweight descriptor so the algebra knows what
   * ground ring it lives over.  For now we only need the integers,
   * but the structure is ready for Q, Z/pZ, etc.
   */
  const CoefficientRing = Object.freeze({
    Z:    { name: 'Z',    characteristic: 0 },
    Q:    { name: 'Q',    characteristic: 0 },
    F2:   { name: 'F2',   characteristic: 2 },
  });

  // ----------------------------------------------------------------
  // FrobeniusAlgebra
  // ----------------------------------------------------------------

  class FrobeniusAlgebra {
    /**
     * @param {string} name   Human-readable name (e.g. "Khovanov").
     * @param {object} ring   One of the CoefficientRing constants.
     * @param {object} tables Multiplication and comultiplication tables:
     *   tables.mul[i][j] = [coeff_of_1, coeff_of_x]   for m(basis[i] (x) basis[j])
     *   tables.comul[i]  = [{coeff, left, right}, ...] for Delta(basis[i])
     */
    constructor(name, ring, tables) {
      this.name = name;
      this.ring = ring || CoefficientRing.Z;
      this._mul = tables.mul;
      this._comul = tables.comul;
    }

    /** Dimension of the underlying vector space. */
    get dim() {
      return 2;
    }

    /** Basis labels. Index 0 = '1', index 1 = 'x'. */
    get basis() {
      return ['1', 'x'];
    }

    /**
     * Homological grading (quantum degree shift).
     *   deg(1) = +1,  deg(x) = -1
     * @param  {number} i  Basis index (0 or 1).
     * @return {number}
     */
    grading(i) {
      return i === 0 ? 1 : -1;
    }

    // ----------------------------------------------------------
    // Algebra structure maps
    // ----------------------------------------------------------

    /**
     * Multiplication: m(basis[i] (x) basis[j]).
     *
     * @param  {number}   i  Left factor basis index (0 or 1).
     * @param  {number}   j  Right factor basis index (0 or 1).
     * @return {number[]}    [coeff_of_1, coeff_of_x]
     */
    multiply(i, j) {
      return this._mul[i][j].slice();  // defensive copy
    }

    /**
     * Comultiplication: Delta(basis[i]).
     *
     * @param  {number} i  Basis index (0 or 1).
     * @return {{ coeff: number, left: number, right: number }[]}
     *   Each entry means: coeff * basis[left] (x) basis[right].
     */
    comultiply(i) {
      // deep copy so callers can't mutate internal tables
      return this._comul[i].map(t => ({ coeff: t.coeff, left: t.left, right: t.right }));
    }

    /**
     * Unit map: k -> V,  1 |-> basis element '1'.
     * Returns image as coefficient vector [coeff_of_1, coeff_of_x].
     * @return {number[]}
     */
    unit() {
      return [1, 0];
    }

    /**
     * Counit (trace) map: V -> k.
     *   epsilon(1) = 0,  epsilon(x) = 1
     * @param  {number} i  Basis index.
     * @return {number}
     */
    counit(i) {
      return i === 1 ? 1 : 0;
    }

    // ----------------------------------------------------------
    // Convenience helpers
    // ----------------------------------------------------------

    /**
     * Apply multiplication to two coefficient vectors.
     *   m(u, v) where u = [a0, a1], v = [b0, b1]
     * Returns [coeff_of_1, coeff_of_x].
     */
    multiplyVectors(u, v) {
      const result = [0, 0];
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const prod = this._mul[i][j];
          const c = u[i] * v[j];
          result[0] += c * prod[0];
          result[1] += c * prod[1];
        }
      }
      return result;
    }

    /**
     * Apply comultiplication to a coefficient vector.
     *   Delta(u) where u = [a0, a1]
     * Returns a flat array of terms {coeff, left, right}.
     */
    comultiplyVector(u) {
      const terms = [];
      for (let i = 0; i < 2; i++) {
        if (u[i] === 0) continue;
        for (const t of this._comul[i]) {
          terms.push({ coeff: u[i] * t.coeff, left: t.left, right: t.right });
        }
      }
      return terms;
    }

    /** Human-readable description. */
    toString() {
      return 'FrobeniusAlgebra<' + this.name + ' over ' + this.ring.name + '>';
    }
  }

  // ----------------------------------------------------------------
  // Pre-built algebras
  // ----------------------------------------------------------------

  /**
   * Standard Khovanov algebra (x^2 = 0):
   *   m(1,1) = 1    m(1,x) = x    m(x,1) = x    m(x,x) = 0
   *   Delta(1) = 1(x)x + x(x)1    Delta(x) = x(x)x
   */
  FrobeniusAlgebra.Khovanov = new FrobeniusAlgebra(
    'Khovanov',
    CoefficientRing.Z,
    {
      mul: [
        // mul[0][j]: m(1, -)
        [ [1, 0], [0, 1] ],
        // mul[1][j]: m(x, -)
        [ [0, 1], [0, 0] ],
      ],
      comul: [
        // Delta(1) = 1 (x) x  +  x (x) 1
        [ { coeff: 1, left: 0, right: 1 }, { coeff: 1, left: 1, right: 0 } ],
        // Delta(x) = x (x) x
        [ { coeff: 1, left: 1, right: 1 } ],
      ],
    }
  );

  /**
   * Lee deformation (x^2 = 1):
   *   m(1,1) = 1    m(1,x) = x    m(x,1) = x    m(x,x) = 1
   *   Delta(1) = 1(x)x + x(x)1    Delta(x) = x(x)x + 1(x)1
   */
  FrobeniusAlgebra.Lee = new FrobeniusAlgebra(
    'Lee',
    CoefficientRing.Z,
    {
      mul: [
        [ [1, 0], [0, 1] ],
        [ [0, 1], [1, 0] ],
      ],
      comul: [
        // Delta(1) = 1(x)x + x(x)1
        [ { coeff: 1, left: 0, right: 1 }, { coeff: 1, left: 1, right: 0 } ],
        // Delta(x) = x(x)x + 1(x)1
        [ { coeff: 1, left: 1, right: 1 }, { coeff: 1, left: 0, right: 0 } ],
      ],
    }
  );

  /**
   * Bar-Natan deformation (x^2 = x):
   *   m(1,1) = 1    m(1,x) = x    m(x,1) = x    m(x,x) = x
   *   Delta(1) = 1(x)x + x(x)1 - 1(x)1    Delta(x) = x(x)x
   */
  FrobeniusAlgebra.BarNatan = new FrobeniusAlgebra(
    'Bar-Natan',
    CoefficientRing.Z,
    {
      mul: [
        [ [1, 0], [0, 1] ],
        [ [0, 1], [0, 1] ],
      ],
      comul: [
        // Delta(1) = 1(x)x + x(x)1 - 1(x)1
        [
          { coeff:  1, left: 0, right: 1 },
          { coeff:  1, left: 1, right: 0 },
          { coeff: -1, left: 0, right: 0 },
        ],
        // Delta(x) = x(x)x
        [ { coeff: 1, left: 1, right: 1 } ],
      ],
    }
  );

  // ----------------------------------------------------------------
  // Self-test
  // ----------------------------------------------------------------

  /**
   * Run basic sanity checks on all three algebras.
   * Call FrobeniusAlgebra.selfTest() from the console.  Throws on failure.
   */
  FrobeniusAlgebra.selfTest = function selfTest() {
    const assert = (cond, msg) => {
      if (!cond) throw new Error('FrobeniusAlgebra self-test FAILED: ' + msg);
    };

    const algebras = [
      FrobeniusAlgebra.Khovanov,
      FrobeniusAlgebra.Lee,
      FrobeniusAlgebra.BarNatan,
    ];

    for (const A of algebras) {
      const tag = A.name;

      // --- Dimension and basis ---
      assert(A.dim === 2, tag + ': dim should be 2');
      assert(A.basis.length === 2, tag + ': basis length should be 2');

      // --- Grading ---
      assert(A.grading(0) === 1, tag + ': grading(0) = +1');
      assert(A.grading(1) === -1, tag + ': grading(1) = -1');

      // --- Unit axiom: m(1, v) = v for all v ---
      for (let j = 0; j < 2; j++) {
        const mv = A.multiply(0, j);
        const expected = [0, 0];
        expected[j] = 1;
        assert(
          mv[0] === expected[0] && mv[1] === expected[1],
          tag + ': left unit failed for j=' + j
        );
      }
      // m(v, 1) = v
      for (let i = 0; i < 2; i++) {
        const mv = A.multiply(i, 0);
        const expected = [0, 0];
        expected[i] = 1;
        assert(
          mv[0] === expected[0] && mv[1] === expected[1],
          tag + ': right unit failed for i=' + i
        );
      }

      // --- Commutativity: m(a,b) = m(b,a) ---
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const ab = A.multiply(i, j);
          const ba = A.multiply(j, i);
          assert(
            ab[0] === ba[0] && ab[1] === ba[1],
            tag + ': commutativity failed for (' + i + ',' + j + ')'
          );
        }
      }

      // --- Counit axiom: (epsilon (x) id) . Delta = id ---
      // For each basis element e_i, apply counit to left factor of Delta(e_i)
      // and check we get e_i back.
      for (let i = 0; i < 2; i++) {
        const terms = A.comultiply(i);
        const result = [0, 0];
        for (const t of terms) {
          result[t.right] += t.coeff * A.counit(t.left);
        }
        const expected = [0, 0];
        expected[i] = 1;
        assert(
          result[0] === expected[0] && result[1] === expected[1],
          tag + ': counit axiom (eps x id).Delta failed for i=' + i +
          ' got [' + result + '] expected [' + expected + ']'
        );
      }

      // --- Frobenius axiom: (m (x) id) . (id (x) Delta) = Delta . m ---
      // We check this for all pairs of basis inputs (i, j).
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          // LHS: first apply Delta to j -> sum_t c_t (left_t, right_t)
          //       then multiply i with each left_t, tensor with right_t
          const deltaJ = A.comultiply(j);
          const lhs = {};  // key "l,r" -> coeff
          for (const t of deltaJ) {
            const prod = A.multiply(i, t.left);
            for (let p = 0; p < 2; p++) {
              if (prod[p] === 0) continue;
              const key = p + ',' + t.right;
              lhs[key] = (lhs[key] || 0) + t.coeff * prod[p];
            }
          }

          // RHS: first multiply (i, j) -> sum_k c_k e_k
          //       then apply Delta to each e_k
          const mij = A.multiply(i, j);
          const rhs = {};
          for (let k = 0; k < 2; k++) {
            if (mij[k] === 0) continue;
            const deltaK = A.comultiply(k);
            for (const t of deltaK) {
              const key = t.left + ',' + t.right;
              rhs[key] = (rhs[key] || 0) + mij[k] * t.coeff;
            }
          }

          // Compare
          const allKeys = new Set([...Object.keys(lhs), ...Object.keys(rhs)]);
          for (const key of allKeys) {
            assert(
              (lhs[key] || 0) === (rhs[key] || 0),
              tag + ': Frobenius axiom failed for (i,j)=(' + i + ',' + j +
              ') at tensor position ' + key
            );
          }
        }
      }

      // --- Unit / counit ---
      const u = A.unit();
      assert(u[0] === 1 && u[1] === 0, tag + ': unit should map to [1,0]');
      assert(A.counit(0) === 0, tag + ': counit(1) = 0');
      assert(A.counit(1) === 1, tag + ': counit(x) = 1');
    }

    // --- Specific product checks ---
    // Khovanov: x*x = 0
    const kxx = FrobeniusAlgebra.Khovanov.multiply(1, 1);
    assert(kxx[0] === 0 && kxx[1] === 0, 'Khovanov: x*x should be 0');

    // Lee: x*x = 1
    const lxx = FrobeniusAlgebra.Lee.multiply(1, 1);
    assert(lxx[0] === 1 && lxx[1] === 0, 'Lee: x*x should be 1');

    // Bar-Natan: x*x = x
    const bxx = FrobeniusAlgebra.BarNatan.multiply(1, 1);
    assert(bxx[0] === 0 && bxx[1] === 1, 'Bar-Natan: x*x should be x');

    // --- multiplyVectors helper ---
    const A = FrobeniusAlgebra.Khovanov;
    // (1 + x) * x = x + 0 = x
    const r = A.multiplyVectors([1, 1], [0, 1]);
    assert(r[0] === 0 && r[1] === 1, 'Khovanov: (1+x)*x should be x');

    console.log('FrobeniusAlgebra.selfTest(): all tests passed.');
  };

  // Expose globally
  global.FrobeniusAlgebra = FrobeniusAlgebra;
  // Do NOT overwrite global CoefficientRing — polynomial.js provides the full version.
  // Frobenius algebra uses its own internal ring descriptors (CoefficientRing.Z etc.)
  // which are lightweight and separate from the polynomial arithmetic ring.

})(typeof window !== 'undefined' ? window : globalThis);
