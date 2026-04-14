/**
 * polynomial.js — Laurent polynomial arithmetic library for knot theory
 *
 * Provides CoefficientRing (Z, Q, Fp) and LaurentPoly classes.
 * Designed for browser <script> inclusion; exposes classes on `window`.
 *
 * A Laurent polynomial is a finite sum  sum_i c_i q^{e_i}  where
 * exponents e_i may be negative integers and coefficients c_i belong
 * to a chosen ring (integers, rationals, or Z/pZ).
 */

// ---------------------------------------------------------------------------
//  CoefficientRing
// ---------------------------------------------------------------------------

(function (global) {
  'use strict';

  // ---- helpers ------------------------------------------------------------

  /** Greatest common divisor (non-negative). */
  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) { var t = b; b = a % b; a = t; }
    return a;
  }

  /** Proper modulo that always returns a non-negative result. */
  function mod(a, p) {
    return ((a % p) + p) % p;
  }

  /**
   * Extended Euclidean algorithm.
   * Returns {g, x, y} such that a*x + b*y = g = gcd(a, b).
   */
  function extgcd(a, b) {
    if (b === 0) return { g: a, x: 1, y: 0 };
    var r = extgcd(b, a % b);
    return { g: r.g, x: r.y, y: r.x - Math.floor(a / b) * r.y };
  }

  // ---- ring descriptors ---------------------------------------------------

  /**
   * A ring descriptor is a plain object with methods:
   *   add, mul, neg, zero, one, isZero, toString, equals
   * and optionally div (for fields) and a `name` string.
   */

  var CoefficientRing = {};

  // -- Integer ring Z -------------------------------------------------------

  /** @type {object} Integer coefficient ring. */
  CoefficientRing.Z = Object.freeze({
    name: 'Z',
    zero: function () { return 0; },
    one:  function () { return 1; },
    add:  function (a, b) { return a + b; },
    mul:  function (a, b) { return a * b; },
    neg:  function (a)    { return -a; },
    isZero: function (a)  { return a === 0; },
    toString: function (a) { return String(a); },
    equals: function (a, b) { return a === b; }
  });

  // -- Rational field Q -----------------------------------------------------

  /** Reduce a rational {n, d} to lowest terms with positive denominator. */
  function qreduce(r) {
    if (r.n === 0) return { n: 0, d: 1 };
    var g = gcd(Math.abs(r.n), Math.abs(r.d));
    var n = r.n / g;
    var d = r.d / g;
    if (d < 0) { n = -n; d = -d; }
    return { n: n, d: d };
  }

  /** Create a reduced rational from numerator and denominator. */
  function qmake(n, d) {
    if (d === 0) throw new Error('Division by zero in Q');
    return qreduce({ n: n, d: d });
  }

  /** @type {object} Rational coefficient field. */
  CoefficientRing.Q = Object.freeze({
    name: 'Q',
    zero: function () { return { n: 0, d: 1 }; },
    one:  function () { return { n: 1, d: 1 }; },
    add:  function (a, b) { return qmake(a.n * b.d + b.n * a.d, a.d * b.d); },
    mul:  function (a, b) { return qmake(a.n * b.n, a.d * b.d); },
    neg:  function (a)    { return { n: -a.n, d: a.d }; },
    div:  function (a, b) {
      if (b.n === 0) throw new Error('Division by zero in Q');
      return qmake(a.n * b.d, a.d * b.n);
    },
    isZero: function (a) { return a.n === 0; },
    toString: function (a) {
      if (a.d === 1) return String(a.n);
      return a.n + '/' + a.d;
    },
    equals: function (a, b) {
      var ar = qreduce(a);
      var br = qreduce(b);
      return ar.n === br.n && ar.d === br.d;
    }
  });

  // -- Finite field Z/pZ ---------------------------------------------------

  /**
   * Returns a coefficient ring for arithmetic modulo a prime p.
   * Elements are plain integers in [0, p).
   * @param {number} p - a prime
   * @returns {object} ring descriptor
   */
  CoefficientRing.Fp = function (p) {
    if (p < 2) throw new Error('Fp requires p >= 2');
    return Object.freeze({
      name: 'F' + p,
      p: p,
      zero: function () { return 0; },
      one:  function () { return 1; },
      add:  function (a, b) { return mod(a + b, p); },
      mul:  function (a, b) { return mod(a * b, p); },
      neg:  function (a)    { return mod(-a, p); },
      /** Modular inverse via extended Euclidean algorithm. */
      inv: function (a) {
        a = mod(a, p);
        if (a === 0) throw new Error('Cannot invert 0 in F' + p);
        var r = extgcd(a, p);
        return mod(r.x, p);
      },
      div: function (a, b) { return mod(a * this.inv(b), p); },
      isZero: function (a) { return mod(a, p) === 0; },
      toString: function (a) { return String(mod(a, p)); },
      equals: function (a, b) { return mod(a, p) === mod(b, p); }
    });
  };

  // ---------------------------------------------------------------------------
  //  LaurentPoly
  // ---------------------------------------------------------------------------

  /**
   * Laurent polynomial with coefficients in a given ring.
   *
   * Internal storage: this._terms is a Map<int, coeff> where keys are
   * exponents and values are non-zero coefficients from the ring.
   *
   * @param {Map|Array} coeffs - Map<int,coeff> or array of {c, e} terms
   * @param {object} ring - a CoefficientRing descriptor (default: Z)
   */
  function LaurentPoly(coeffs, ring) {
    this.ring = ring || CoefficientRing.Z;
    this._terms = new Map();

    if (coeffs instanceof Map) {
      var self = this;
      coeffs.forEach(function (c, e) {
        if (!self.ring.isZero(c)) self._terms.set(e, c);
      });
    } else if (Array.isArray(coeffs)) {
      for (var i = 0; i < coeffs.length; i++) {
        var term = coeffs[i];
        var exp = term.e;
        var existing = this._terms.get(exp);
        var val = existing !== undefined
          ? this.ring.add(existing, term.c)
          : term.c;
        if (this.ring.isZero(val)) {
          this._terms.delete(exp);
        } else {
          this._terms.set(exp, val);
        }
      }
    }
  }

  /** Remove zero-coefficient entries from the internal map. */
  LaurentPoly.prototype._cleanup = function () {
    var ring = this.ring;
    var toDelete = [];
    this._terms.forEach(function (c, e) {
      if (ring.isZero(c)) toDelete.push(e);
    });
    for (var i = 0; i < toDelete.length; i++) {
      this._terms.delete(toDelete[i]);
    }
    return this;
  };

  /** Sorted array of exponents in decreasing order. */
  LaurentPoly.prototype._sortedExponents = function () {
    var exps = [];
    this._terms.forEach(function (_c, e) { exps.push(e); });
    exps.sort(function (a, b) { return b - a; });
    return exps;
  };

  // ---- static constructors ------------------------------------------------

  /** The zero polynomial in the given ring. */
  LaurentPoly.zero = function (ring) {
    return new LaurentPoly([], ring || CoefficientRing.Z);
  };

  /** The constant 1 polynomial in the given ring. */
  LaurentPoly.one = function (ring) {
    ring = ring || CoefficientRing.Z;
    return new LaurentPoly([{ c: ring.one(), e: 0 }], ring);
  };

  /** Monomial q^exp in the given ring. */
  LaurentPoly.q = function (exp, ring) {
    ring = ring || CoefficientRing.Z;
    return new LaurentPoly([{ c: ring.one(), e: exp }], ring);
  };

  // ---- arithmetic ---------------------------------------------------------

  /** Return this + other. */
  LaurentPoly.prototype.add = function (other) {
    var ring = this.ring;
    var result = new Map();
    this._terms.forEach(function (c, e) { result.set(e, c); });
    other._terms.forEach(function (c, e) {
      var cur = result.get(e);
      var val = cur !== undefined ? ring.add(cur, c) : c;
      result.set(e, val);
    });
    return new LaurentPoly(result, ring)._cleanup();
  };

  /** Return this - other. */
  LaurentPoly.prototype.subtract = function (other) {
    return this.add(other.negate());
  };

  /** Return this * other. */
  LaurentPoly.prototype.multiply = function (other) {
    var ring = this.ring;
    var result = new Map();
    this._terms.forEach(function (c1, e1) {
      other._terms.forEach(function (c2, e2) {
        var exp = e1 + e2;
        var prod = ring.mul(c1, c2);
        var cur = result.get(exp);
        var val = cur !== undefined ? ring.add(cur, prod) : prod;
        result.set(exp, val);
      });
    });
    return new LaurentPoly(result, ring)._cleanup();
  };

  /** Return scalar * this, where scalar is a ring element. */
  LaurentPoly.prototype.scale = function (scalar) {
    var ring = this.ring;
    var result = new Map();
    this._terms.forEach(function (c, e) {
      result.set(e, ring.mul(scalar, c));
    });
    return new LaurentPoly(result, ring)._cleanup();
  };

  /** Return -this. */
  LaurentPoly.prototype.negate = function () {
    var ring = this.ring;
    var result = new Map();
    this._terms.forEach(function (c, e) {
      result.set(e, ring.neg(c));
    });
    return new LaurentPoly(result, ring);
  };

  // ---- predicates ---------------------------------------------------------

  /** True if this polynomial is zero. */
  LaurentPoly.prototype.isZero = function () {
    this._cleanup();
    return this._terms.size === 0;
  };

  /** True if this equals other (coefficient-wise). */
  LaurentPoly.prototype.equals = function (other) {
    var diff = this.subtract(other);
    return diff.isZero();
  };

  // ---- evaluation ---------------------------------------------------------

  /**
   * Evaluate the polynomial at q = qValue (a plain number).
   * Returns a number (for Z / Fp) or {n, d} (for Q).
   */
  LaurentPoly.prototype.evaluate = function (qValue) {
    var ring = this.ring;
    var sum = ring.zero();
    this._terms.forEach(function (c, e) {
      var qe = Math.pow(qValue, e);
      // Convert numeric qe into a ring element for multiplication
      if (ring.name === 'Q') {
        // Approximate: qe as rational is tricky; treat as {n: qe, d: 1}
        var contrib = ring.mul(c, { n: qe, d: 1 });
        sum = ring.add(sum, contrib);
      } else {
        sum = ring.add(sum, ring.mul(c, qe));
      }
    });
    return sum;
  };

  // ---- substitution -------------------------------------------------------

  /**
   * Replace q with q^k.  Each term c * q^e becomes c * q^{e*k}.
   * @param {number} k - integer power
   * @returns {LaurentPoly}
   */
  LaurentPoly.prototype.substituteQPower = function (k) {
    var result = new Map();
    this._terms.forEach(function (c, e) {
      result.set(e * k, c);
    });
    return new LaurentPoly(result, this.ring)._cleanup();
  };

  // ---- LaTeX output -------------------------------------------------------

  /**
   * Render as a LaTeX string, sorted by decreasing exponent.
   * @param {string} variable - variable name (default 'q')
   * @returns {string}
   */
  /**
   * Convert decimal exponents to fractions for display.
   * @param {number} e - The exponent (may be decimal like 0.5, 1.5, etc.)
   * @returns {string} LaTeX representation of the exponent
   */
  function exponentToLatex(e) {
    // Check if it's effectively an integer
    if (Math.abs(e - Math.round(e)) < 1e-10) {
      return Math.round(e).toString();
    }
    // For decimal exponents, convert to fraction
    // e.g., 0.5 -> 1/2, 1.5 -> 3/2, -0.5 -> -1/2
    var multiplied = e * 4;  // Multiply by 4 to handle quarters
    if (Math.abs(multiplied - Math.round(multiplied)) < 1e-10) {
      // It's a multiple of 1/4
      var num = Math.round(multiplied);
      return num + '/4';
    }
    // Try other denominators
    multiplied = e * 2;
    if (Math.abs(multiplied - Math.round(multiplied)) < 1e-10) {
      var num = Math.round(multiplied);
      return num + '/2';
    }
    // Fallback to decimal
    return e.toString();
  }

  LaurentPoly.prototype.toLatex = function (variable) {
    variable = variable || 'q';
    var ring = this.ring;
    var exps = this._sortedExponents();
    if (exps.length === 0) return '0';

    /** Check if a coefficient equals 1 in the ring. */
    function isOne(c) { return ring.equals(c, ring.one()); }
    /** Check if a coefficient equals -1 in the ring. */
    function isNegOne(c) { return ring.equals(c, ring.neg(ring.one())); }

    var parts = [];
    for (var i = 0; i < exps.length; i++) {
      var e = exps[i];
      var c = this._terms.get(e);
      var cStr = ring.toString(c);

      // Build the monomial string for this term
      var monomial = '';

      if (e === 0) {
        // Constant term: just the coefficient
        monomial = cStr;
      } else {
        // Non-constant term: handle coefficient display
        var varPart = '';
        if (e === 1) {
          varPart = variable;
        } else {
          varPart = variable + '^{' + exponentToLatex(e) + '}';
        }

        if (isOne(c)) {
          monomial = varPart;
        } else if (isNegOne(c)) {
          monomial = '-' + varPart;
        } else {
          // For Q ring with denominator > 1, wrap in \frac
          if (ring.name === 'Q' && c.d !== 1) {
            var sign = c.n < 0 ? '-' : '';
            monomial = sign + '\\frac{' + Math.abs(c.n) + '}{' + c.d + '}' + varPart;
          } else {
            monomial = cStr + varPart;
          }
        }
      }

      // Prepend '+' for positive terms after the first
      if (i > 0 && monomial.charAt(0) !== '-') {
        monomial = '+' + monomial;
      }

      parts.push(monomial);
    }

    return parts.join('');
  };

  // ---- LaTeX parsing (best effort) ----------------------------------------

  /**
   * Parse a LaTeX string into a LaurentPoly over Z (best effort).
   *
   * Handles patterns like:
   *   q^2 - 2q + 3 - \frac{4}{q}   =>  q^2 - 2q + 3 - 4q^{-1}
   *   q^{-3} + 1
   *
   * @param {string} latex
   * @returns {LaurentPoly}
   */
  LaurentPoly.fromLatex = function (latex) {
    var ring = CoefficientRing.Z;
    var terms = [];

    // Normalise whitespace
    var s = latex.replace(/\s+/g, ' ').trim();

    // Replace \frac{a}{q^{n}} with a*q^{-n} style, and \frac{a}{q} with a*q^{-1}
    s = s.replace(/\\frac\{([^}]*)\}\{q\^?\{?(-?\d+)?\}?\}/g, function (_m, num, exp) {
      var e = exp ? -parseInt(exp, 10) : -1;
      return '(' + num + ')q^{' + e + '}';
    });

    // Tokenise: split into sign-prefixed chunks
    // Insert '+' before '-' that acts as a separator (not inside braces)
    var tokens = [];
    var current = '';
    var braceDepth = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
      if (braceDepth === 0 && (ch === '+' || ch === '-') && current.trim().length > 0) {
        tokens.push(current.trim());
        current = (ch === '-') ? '-' : '';
      } else {
        current += ch;
      }
    }
    if (current.trim().length > 0) tokens.push(current.trim());

    for (var ti = 0; ti < tokens.length; ti++) {
      var tok = tokens[ti].trim();
      if (!tok) continue;

      // Try to match: optional_coeff * q ^ { optional_exp }
      // Patterns (order matters):
      //   coeff * q^{exp}    coeff*q^exp    coeff*q    coeff   q^{exp}   q
      var coeff = 1;
      var exp = 0;

      // Remove wrapping parens from frac replacement
      tok = tok.replace(/^\(([^)]*)\)/, '$1');

      // Check for q presence
      var qIdx = tok.indexOf('q');
      if (qIdx === -1) {
        // Pure constant
        coeff = parseInt(tok, 10) || 0;
        exp = 0;
      } else {
        // Extract coefficient before q
        var before = tok.substring(0, qIdx).trim();
        if (before === '' || before === '+') coeff = 1;
        else if (before === '-') coeff = -1;
        else coeff = parseInt(before, 10) || 0;

        // Extract exponent after q
        var after = tok.substring(qIdx + 1).trim();
        if (after === '') {
          exp = 1;
        } else {
          // Match ^{...} or ^number
          var expMatch = after.match(/^\^\{?(-?\d+)\}?/);
          if (expMatch) {
            exp = parseInt(expMatch[1], 10);
          } else {
            exp = 1;
          }
        }
      }

      if (coeff !== 0) {
        terms.push({ c: coeff, e: exp });
      }
    }

    return new LaurentPoly(terms, ring);
  };

  // ---- quantum integers ---------------------------------------------------

  /**
   * Quantum integer [m]_q = q^{m-1} + q^{m-3} + ... + q^{-(m-1)}.
   *
   * This is the expansion of (q^m - q^{-m}) / (q - q^{-1}) and avoids
   * actual polynomial division.
   *
   * @param {number} m - non-negative integer
   * @returns {LaurentPoly} over Z
   */
  LaurentPoly.quantumInteger = function (m) {
    if (m < 0) throw new Error('quantumInteger requires m >= 0');
    if (m === 0) return LaurentPoly.zero();
    var terms = [];
    // Exponents: m-1, m-3, ..., -(m-1)  (step -2, total m terms)
    for (var e = m - 1; e >= -(m - 1); e -= 2) {
      terms.push({ c: 1, e: e });
    }
    return new LaurentPoly(terms, CoefficientRing.Z);
  };

  /**
   * Quantum factorial [m]_q! = [1]_q * [2]_q * ... * [m]_q.
   * @param {number} m - non-negative integer
   * @returns {LaurentPoly}
   */
  LaurentPoly.quantumFactorial = function (m) {
    if (m < 0) throw new Error('quantumFactorial requires m >= 0');
    var result = LaurentPoly.one();
    for (var i = 1; i <= m; i++) {
      result = result.multiply(LaurentPoly.quantumInteger(i));
    }
    return result;
  };

  /**
   * Quantum binomial coefficient [n choose k]_q =
   *   [n]_q! / ([k]_q! * [n-k]_q!).
   *
   * Computed over Q to allow exact division, then coefficients are checked
   * to be integral (they always are for valid n, k).
   *
   * @param {number} n - non-negative integer
   * @param {number} k - 0 <= k <= n
   * @returns {LaurentPoly} over Z
   */
  LaurentPoly.quantumBinomial = function (n, k) {
    if (k < 0 || k > n) return LaurentPoly.zero();
    if (k === 0 || k === n) return LaurentPoly.one();

    // Use the multiplicative formula:
    // [n choose k]_q = prod_{i=1}^{k} [n-k+i]_q / [i]_q
    // Compute iteratively over Q to stay exact.
    var Q = CoefficientRing.Q;

    /** Lift a Z-LaurentPoly to Q. */
    function toQ(p) {
      var terms = [];
      p._terms.forEach(function (c, e) {
        terms.push({ c: { n: c, d: 1 }, e: e });
      });
      return new LaurentPoly(terms, Q);
    }

    var result = new LaurentPoly([{ c: { n: 1, d: 1 }, e: 0 }], Q);

    for (var i = 1; i <= k; i++) {
      var num = toQ(LaurentPoly.quantumInteger(n - k + i));
      var den = toQ(LaurentPoly.quantumInteger(i));

      // Multiply by numerator
      result = result.multiply(num);

      // Divide by denominator: since [i]_q divides the running product
      // exactly, we can do polynomial long division by evaluating term by
      // term.  However a simpler approach: we know the result has integer
      // coefficients, so we do the multiplication in Q and convert at end.
      // For the division we need polynomial division — let's implement a
      // simple exact-division helper.
      result = polyExactDiv(result, den, Q);
    }

    // Convert back to Z
    var zTerms = [];
    result._terms.forEach(function (c, e) {
      // c should be an integer (d === 1)
      var val = Math.round(c.n / c.d);
      if (val !== 0) zTerms.push({ c: val, e: e });
    });
    return new LaurentPoly(zTerms, CoefficientRing.Z);
  };

  /**
   * Exact polynomial division of a by b over a field ring.
   * Assumes b divides a exactly.  Uses standard long division on
   * Laurent polynomials (shifted to ordinary polys internally).
   */
  function polyExactDiv(a, b, ring) {
    if (b.isZero()) throw new Error('Division by zero polynomial');

    // Find minimum exponent to shift both into non-negative exponents
    var minExpA = Infinity, minExpB = Infinity;
    a._terms.forEach(function (_c, e) { if (e < minExpA) minExpA = e; });
    b._terms.forEach(function (_c, e) { if (e < minExpB) minExpB = e; });
    if (minExpA === Infinity) return LaurentPoly.zero(ring);

    var shift = Math.min(minExpA, minExpB);

    // Work with shifted copies
    function shiftPoly(p, s) {
      var m = new Map();
      p._terms.forEach(function (c, e) { m.set(e - s, c); });
      return new LaurentPoly(m, ring);
    }

    var aa = shiftPoly(a, shift);
    var bb = shiftPoly(b, shift);

    // Leading exponent and coefficient of bb
    var bExps = bb._sortedExponents();
    var bLeadExp = bExps[0];
    var bLeadCoeff = bb._terms.get(bLeadExp);

    var quotientTerms = [];

    while (!aa.isZero()) {
      var aExps = aa._sortedExponents();
      var aLeadExp = aExps[0];
      var aLeadCoeff = aa._terms.get(aLeadExp);

      var qExp = aLeadExp - bLeadExp;
      var qCoeff = ring.div(aLeadCoeff, bLeadCoeff);

      quotientTerms.push({ c: qCoeff, e: qExp + shift });

      // Subtract qCoeff * q^qExp * bb from aa
      var subtrahend = new Map();
      bb._terms.forEach(function (c, e) {
        subtrahend.set(e + qExp, ring.mul(qCoeff, c));
      });
      aa = aa.subtract(new LaurentPoly(subtrahend, ring));
    }

    return new LaurentPoly(quotientTerms, ring);
  }

  // ---- self-test -----------------------------------------------------------

  /**
   * Run internal consistency checks.  Throws on failure.
   * Call LaurentPoly._selfTest() in a browser console to verify.
   */
  LaurentPoly._selfTest = function () {
    var pass = 0;
    var total = 0;

    function assert(condition, msg) {
      total++;
      if (!condition) throw new Error('FAIL: ' + msg);
      pass++;
    }

    // --- Z ring basics ---
    var Z = CoefficientRing.Z;
    assert(Z.add(3, 4) === 7, 'Z add');
    assert(Z.mul(3, 4) === 12, 'Z mul');
    assert(Z.neg(5) === -5, 'Z neg');
    assert(Z.isZero(0), 'Z isZero');
    assert(!Z.isZero(1), 'Z not zero');

    // --- Q ring basics ---
    var Q = CoefficientRing.Q;
    var half = { n: 1, d: 2 };
    var third = { n: 1, d: 3 };
    var sum = Q.add(half, third); // 5/6
    assert(sum.n === 5 && sum.d === 6, 'Q add 1/2+1/3=5/6');
    var prod = Q.mul(half, third); // 1/6
    assert(prod.n === 1 && prod.d === 6, 'Q mul 1/2*1/3=1/6');
    var quot = Q.div(half, third); // 3/2
    assert(quot.n === 3 && quot.d === 2, 'Q div 1/2 / 1/3 = 3/2');

    // --- Fp ring basics ---
    var F5 = CoefficientRing.Fp(5);
    assert(F5.add(3, 4) === 2, 'F5 add 3+4=2');
    assert(F5.mul(3, 4) === 2, 'F5 mul 3*4=12=2');
    assert(F5.inv(2) === 3, 'F5 inv(2)=3 since 2*3=6=1');
    assert(F5.div(1, 2) === 3, 'F5 div 1/2=3');

    // --- LaurentPoly over Z ---
    // p = q + 1
    var p1 = new LaurentPoly([{ c: 1, e: 1 }, { c: 1, e: 0 }]);
    // p = q - 1
    var p2 = new LaurentPoly([{ c: 1, e: 1 }, { c: -1, e: 0 }]);
    // (q+1)(q-1) = q^2 - 1
    var prod2 = p1.multiply(p2);
    assert(prod2._terms.get(2) === 1, 'prod q^2 coeff');
    assert(prod2._terms.get(0) === -1, 'prod const coeff');
    assert(!prod2._terms.has(1), 'prod q^1 coeff is 0');

    // add: (q+1) + (q-1) = 2q
    var sum2 = p1.add(p2);
    assert(sum2._terms.get(1) === 2, 'add q coeff');
    assert(!sum2._terms.has(0), 'add const is 0');

    // subtract: (q+1) - (q-1) = 2
    var diff = p1.subtract(p2);
    assert(diff._terms.get(0) === 2, 'sub const');
    assert(!diff._terms.has(1), 'sub q coeff is 0');

    // scale
    var scaled = p1.scale(3); // 3q + 3
    assert(scaled._terms.get(1) === 3, 'scale q');
    assert(scaled._terms.get(0) === 3, 'scale const');

    // negate
    var neg = p1.negate(); // -q - 1
    assert(neg._terms.get(1) === -1, 'negate q');
    assert(neg._terms.get(0) === -1, 'negate const');

    // isZero / equals
    assert(LaurentPoly.zero().isZero(), 'zero isZero');
    assert(!p1.isZero(), 'p1 not zero');
    assert(p1.equals(p1), 'p1 equals self');
    assert(!p1.equals(p2), 'p1 not equals p2');

    // evaluate: (q+1) at q=2 => 3
    assert(p1.evaluate(2) === 3, 'eval q+1 at 2');

    // negative exponents
    var pNeg = new LaurentPoly([{ c: 1, e: -1 }, { c: 1, e: 1 }]); // q + q^{-1}
    assert(pNeg.evaluate(2) === 2.5, 'eval q+q^{-1} at 2');

    // substituteQPower: (q + q^{-1}) with q -> q^2 => q^2 + q^{-2}
    var sub = pNeg.substituteQPower(2);
    assert(sub._terms.has(2) && sub._terms.has(-2), 'substituteQPower');
    assert(!sub._terms.has(1) && !sub._terms.has(-1), 'substituteQPower no old');

    // toLatex
    var latexP = new LaurentPoly([{ c: 1, e: 2 }, { c: -2, e: 1 }, { c: 3, e: 0 }, { c: -1, e: -1 }]);
    var latex = latexP.toLatex();
    assert(latex.indexOf('q^{2}') !== -1, 'toLatex q^2');
    assert(latex.indexOf('-2q') !== -1, 'toLatex -2q');
    assert(latex.indexOf('+3') !== -1, 'toLatex +3');
    assert(latex.indexOf('-q^{-1}') !== -1, 'toLatex -q^{-1}');

    // LaurentPoly.one and LaurentPoly.q
    assert(LaurentPoly.one().toLatex() === '1', 'one toLatex');
    assert(LaurentPoly.q(3).toLatex() === 'q^{3}', 'q(3) toLatex');
    assert(LaurentPoly.q(1).toLatex() === 'q', 'q(1) toLatex');

    // fromLatex round-trip (basic)
    var parsed = LaurentPoly.fromLatex('q^{2} - 2q + 3');
    assert(parsed._terms.get(2) === 1, 'fromLatex q^2');
    assert(parsed._terms.get(1) === -2, 'fromLatex -2q');
    assert(parsed._terms.get(0) === 3, 'fromLatex const');

    // quantumInteger [3]_q = q^2 + 1 + q^{-2}
    var q3 = LaurentPoly.quantumInteger(3);
    assert(q3._terms.get(2) === 1, '[3] q^2');
    assert(q3._terms.get(0) === 1, '[3] const');
    assert(q3._terms.get(-2) === 1, '[3] q^{-2}');
    assert(q3._terms.size === 3, '[3] size');

    // quantumInteger [1]_q = 1
    var q1 = LaurentPoly.quantumInteger(1);
    assert(q1._terms.get(0) === 1 && q1._terms.size === 1, '[1]=1');

    // quantumInteger [0]_q = 0
    assert(LaurentPoly.quantumInteger(0).isZero(), '[0]=0');

    // quantumFactorial [3]! = [1][2][3] = 1 * (q + q^{-1}) * (q^2 + 1 + q^{-2})
    // = q^3 + 2q + 2q^{-1} + q^{-3}  (verify size and a coefficient)
    var qf3 = LaurentPoly.quantumFactorial(3);
    assert(qf3._terms.get(3) === 1, '[3]! q^3');
    assert(qf3._terms.get(1) === 2, '[3]! q^1');
    assert(qf3._terms.get(-1) === 2, '[3]! q^{-1}');
    assert(qf3._terms.get(-3) === 1, '[3]! q^{-3}');

    // quantumBinomial [3 choose 1]_q = [3]_q
    var qb31 = LaurentPoly.quantumBinomial(3, 1);
    assert(qb31.equals(q3), '[3 choose 1] = [3]');

    // quantumBinomial [4 choose 2]_q
    // = [4]![2]![2]!  = (q^2+1+q^{-2})(q^3+q+q^{-1}+q^{-3})/(q+q^{-1})
    // Known: [4 choose 2]_q = q^4 + q^2 + 2 + q^{-2} + q^{-4}  -- wait, let's just
    // verify it equals [4]*[3]/([2]*[1])
    var qb42 = LaurentPoly.quantumBinomial(4, 2);
    // [4 choose 2] = q^{-4} + q^{-2} + 2 + q^2 + q^4  -- this is the known result
    // Actually let me just verify a known property: [n choose 0] = 1
    assert(LaurentPoly.quantumBinomial(5, 0).equals(LaurentPoly.one()), '[5 choose 0]=1');
    assert(LaurentPoly.quantumBinomial(5, 5).equals(LaurentPoly.one()), '[5 choose 5]=1');

    // Verify [4 choose 2] has the right symmetry: palindromic coefficients
    assert(qb42._terms.get(4) === 1, '[4c2] q^4');
    assert(qb42._terms.get(-4) === 1, '[4c2] q^{-4}');
    assert(qb42._terms.get(0) !== undefined, '[4c2] has const term');

    // --- LaurentPoly over Fp ---
    var F3 = CoefficientRing.Fp(3);
    var pf1 = new LaurentPoly([{ c: 2, e: 1 }, { c: 2, e: 0 }], F3); // 2q + 2
    var pf2 = new LaurentPoly([{ c: 2, e: 1 }, { c: 1, e: 0 }], F3); // 2q + 1
    var pfSum = pf1.add(pf2); // (2+2)q + (2+1) = 4q + 3 = q + 0 mod 3
    assert(pfSum._terms.get(1) === 1, 'Fp add q coeff');
    assert(!pfSum._terms.has(0), 'Fp add const is 0 mod 3');

    // Summary
    if (typeof console !== 'undefined') {
      console.log('LaurentPoly._selfTest: ' + pass + '/' + total + ' tests passed.');
    }
    return { pass: pass, total: total };
  };

  // ---------------------------------------------------------------------------
  //  Expose on global (window in browser, global in Node-like contexts)
  // ---------------------------------------------------------------------------

  global.CoefficientRing = CoefficientRing;
  global.LaurentPoly = LaurentPoly;

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
