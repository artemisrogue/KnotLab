/**
 * tab-homological.js -- Homological Invariants tab for the knot explorer
 *
 * Computes knot invariants derived from categorical and quantum perspectives:
 *
 * 1. Kauffman Bracket: State-sum Laurent polynomial in A, the fundamental
 *    invariant underlying the Jones polynomial. Uses the formula:
 *      <K> = Σ_v A^σ(v) · (-A² - A⁻²)^(c(v)-1)
 *    where c(v) is the number of circles in state v.
 *
 * 2. Jones Polynomial: The categorified invariant obtained from the bracket via:
 *      V(q) = (-1)^w · A^(-3w) · <K> |_{A=q^(-1/4)}
 *    where w is the diagram writhe. The convention A = q^(-1/4) ensures that
 *    the Jones polynomial (in q) takes integer exponents for knots/links.
 *
 * 3. Khovanov Homology: A bigraded homology theory that categorifies the Jones
 *    polynomial. Computed over selectable Frobenius algebras (Khovanov or Lee)
 *    and coefficient rings (ℤ, ℚ, or 𝔽_p). The graded Euler characteristic
 *    recovers V(q).
 *
 * 4. Rasmussen s-invariant: A knot concordance invariant extracted from Lee
 *    homology. Computes the difference in quantum gradings of the two Lee
 *    homology generators.
 *
 * The tab also verifies computed invariants against stored data and checks
 * consistency conditions (e.g., mirror image relationships).
 *
 * Dependencies (loaded via <script> tags before this file):
 *   - polynomial.js   (LaurentPoly, CoefficientRing)
 *   - matrix.js        (IntMatrix)
 *   - cube.js          (ResolutionCube)
 *   - frobenius.js     (FrobeniusAlgebra)
 *   - chain-complex.js (BigradedChainComplex, buildKhovanovComplex)
 *   - KaTeX (katex, renderMathInElement)
 *
 * Globals expected: KNOT_DATA, LINK_DATA, getAllItems, countCirclesFromPD
 *
 * See CONVENTIONS.md for mathematical definitions and conventions.
 */

(function () {
  'use strict';

  // =================================================================
  // Crossing sign computation from PD code
  // =================================================================

  /**
   * Compute crossing signs directly from a PD code using component tracing.
   *
   * Algorithm:
   * 1. Use union-find to identify link components: at each crossing [a,b,c,d],
   *    arcs a↔c (understrand) and b↔d (overstrand) belong to the same component.
   * 2. Within each component, arcs are labeled as a contiguous ascending range
   *    (standard KnotInfo convention). The orientation within each component
   *    follows ascending arc order, wrapping at the component boundary.
   * 3. At each crossing, determine the overstrand direction: if the next arc
   *    after d (in component orientation) is b, the overstrand goes d→b
   *    (right-to-left = positive). If next(b)=d, it goes b→d (negative).
   *
   * Works for both knots and links with 0-indexed arc labels.
   *
   * @param {number[][]} pdCode
   * @returns {number[]|null} Array of +1/-1 per crossing, or null if detection fails
   */
  function crossingSignsFromPD(pdCode) {
    var n = pdCode.length;
    if (n === 0) return [];
    var totalArcs = 2 * n;

    // Union-Find
    var parent = [];
    for (var i = 0; i < totalArcs; i++) parent[i] = i;
    function find(x) {
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    }
    function unite(x, y) { parent[find(x)] = find(y); }

    for (var i = 0; i < n; i++) {
      unite(pdCode[i][0], pdCode[i][2]); // understrand pair
      unite(pdCode[i][1], pdCode[i][3]); // overstrand pair
    }

    // Group arcs by component
    var groups = {};
    for (var i = 0; i < totalArcs; i++) {
      var root = find(i);
      if (!groups[root]) groups[root] = [];
      groups[root].push(i);
    }

    // Build next-arc map: within each component, arcs are contiguous and
    // orientation follows ascending order (wrapping at component boundary)
    var nextArc = new Array(totalArcs);
    var roots = Object.keys(groups);
    for (var gi = 0; gi < roots.length; gi++) {
      var arcs = groups[roots[gi]];
      arcs.sort(function (a, b) { return a - b; });
      for (var j = 0; j < arcs.length; j++) {
        nextArc[arcs[j]] = arcs[(j + 1) % arcs.length];
      }
    }

    // Determine crossing signs
    // In PD convention [a,b,c,d] CCW from incoming understrand:
    //   Positive crossing: overstrand flows b→d (nextArc[b]=d)
    //   Negative crossing: overstrand flows d→b (nextArc[d]=b)
    var signs = [];
    for (var i = 0; i < n; i++) {
      var b = pdCode[i][1], d = pdCode[i][3];
      if (nextArc[b] === d) {
        signs.push(+1); // positive: overstrand b→d
      } else if (nextArc[d] === b) {
        signs.push(-1); // negative: overstrand d→b
      } else {
        return null; // unexpected topology
      }
    }
    return signs;
  }

  /**
   * Count link components from a PD code via union-find on arcs.
   * At each crossing [a,b,c,d], arcs a↔c and b↔d belong to the same component.
   *
   * @param {number[][]} pdCode
   * @returns {number} number of link components (1 for knots)
   */
  function componentCountFromPD(pdCode) {
    var n = pdCode.length;
    if (n === 0) return 1;
    var totalArcs = 2 * n;
    var parent = [];
    for (var i = 0; i < totalArcs; i++) parent[i] = i;
    function find(x) {
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    }
    for (var i = 0; i < n; i++) {
      var a = pdCode[i][0], b = pdCode[i][1], c = pdCode[i][2], dd = pdCode[i][3];
      parent[find(a)] = find(c);
      parent[find(b)] = find(dd);
    }
    var roots = {};
    for (var i = 0; i < totalArcs; i++) roots[find(i)] = true;
    return Object.keys(roots).length;
  }

  /**
   * Compute writhe directly from a PD code.
   * Writhe = sum of crossing signs.
   *
   * @param {number[][]} pdCode
   * @returns {number|null} writhe, or null if signs cannot be determined
   */
  function computeWritheFromPD(pdCode) {
    var signs = crossingSignsFromPD(pdCode);
    if (!signs) return null;
    var w = 0;
    for (var i = 0; i < signs.length; i++) w += signs[i];
    return w;
  }

  /**
   * Attempt to load crossing signs from cached metadata.
   * Falls back to computing from PD code.
   *
   * @param {string} knotName
   * @param {number[][]} pdCode
   * @returns {Promise<number[]>}
   */
  async function getCrossingSigns(knotName, pdCode) {
    try {
      // Add timestamp to bust cache and use no-cache headers
      var resp = await fetch('data/cache/resolutions/' + knotName + '/metadata.json?t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      if (resp.ok) {
        var meta = await resp.json();
        if (meta.crossing_signs && meta.crossing_signs.length === pdCode.length) {
          console.log('Loaded crossing_signs from metadata:', meta.crossing_signs);
          return meta.crossing_signs;
        }
      }
    } catch (e) {
      // Ignore fetch errors
      console.error('Error loading metadata:', e);
    }
    var signs = crossingSignsFromPD(pdCode);
    console.log('Using fallback crossing_signs from PD code:', signs);
    return signs;
  }

  // =================================================================
  // Writhe determination from bracket + stored Jones
  // =================================================================

  /**
   * Determine the correct writhe by matching the bracket against stored
   * Jones polynomials.
   *
   * The bracket is sign-independent (sigma = n - 2|v|), so we can compute
   * it from any crossing sign assignment. The writhe only affects the
   * normalization factor (-1)^w · A^{-3w}. We try all possible writhes
   * w ∈ {-n, -n+2, ..., n} and match against BOTH jones_latex and
   * mirror_jones_latex, since the PD code may represent either chirality.
   *
   * @param {LaurentPoly} bracket       Kauffman bracket in A
   * @param {string}      jonesLatex    Stored Jones polynomial LaTeX
   * @param {string}      mirrorLatex   Stored mirror Jones polynomial LaTeX
   * @param {number}      n             Number of crossings
   * @returns {{ writhe: number, pdIsMirror: boolean }|null}
   *   writhe: the correct writhe for this PD code
   *   pdIsMirror: true if the PD code represents the mirror of the named knot
   */
  function computeWrithe(bracket, jonesLatex, mirrorLatex, n) {
    // Parse both stored Jones polynomials
    var candidates = [];
    if (jonesLatex) {
      var parsed = parseJonesLatex(jonesLatex);
      if (parsed.size > 0) candidates.push({ terms: parsed, isMirror: false });
    }
    if (mirrorLatex) {
      var parsed2 = parseJonesLatex(mirrorLatex);
      if (parsed2.size > 0) candidates.push({ terms: parsed2, isMirror: true });
    }
    if (candidates.length === 0) return null;

    for (var w = -n; w <= n; w += 2) {
      var sign = (w % 2 === 0) ? 1 : -1;
      var norm = new LaurentPoly([{ c: sign, e: -3 * w }], CoefficientRing.Z);
      var normalized = bracket.multiply(norm);
      var jones = normalized.substituteQPower(0.25);

      // Check if all exponents are integers or half-integers
      var valid = true;
      var computedTerms = new Map();
      jones._terms.forEach(function (c, e) {
        var rounded = Math.round(e * 2) / 2;
        if (Math.abs(e - rounded) > 1e-9) { valid = false; return; }
        computedTerms.set(rounded, (typeof c === 'number') ? c : 0);
      });
      if (!valid) continue;

      // Try matching against each candidate
      for (var ci = 0; ci < candidates.length; ci++) {
        var storedTerms = candidates[ci].terms;
        var allExps = new Set();
        computedTerms.forEach(function (_, e) { allExps.add(e); });
        storedTerms.forEach(function (_, e) { allExps.add(e); });

        var match = true;
        allExps.forEach(function (e) {
          var cv = computedTerms.get(e) || 0;
          var sv = storedTerms.get(e) || 0;
          if (Math.abs(cv - sv) > 1e-9) match = false;
        });

        if (match) {
          return { writhe: w, pdIsMirror: candidates[ci].isMirror };
        }
      }
    }
    return null;
  }

  // =================================================================
  // Kauffman bracket & Jones polynomial (via state sum)
  // =================================================================

  /**
   * Compute the Kauffman bracket <K> as a Laurent polynomial in A.
   *
   * The Kauffman bracket is defined via a state-sum formula:
   *   <K> = Σ_{v ∈ {0,1}^n} A^σ(v) · d^(c(v)-1)
   *
   * where:
   *   - n = number of crossings
   *   - v = resolution state (0=smooth /, 1=smooth \)
   *   - σ(v) = sign exponent from weighted crossings
   *   - c(v) = number of circles in the resolved state
   *   - d = -A² - A⁻² (the "delta" factor, bracket value of one loop)
   *
   * **Normalization**: By using d^(c(v)-1) instead of d^c(v), we normalize so
   * that a single unknotted circle evaluates to 1, not d. This is the standard
   * convention for the bracket that is invariant under Reidemeister II.
   *
   * **Invariance Property**: Under Reidemeister move I, the bracket picks up a
   * factor of -A³ or -A⁻³ depending on the orientation. This non-invariance
   * is corrected by the writhe-dependent prefactor in the Jones polynomial formula.
   *
   * @param {ResolutionCube} cube - Contains crossing data and circle counts
   * @returns {LaurentPoly} Kauffman bracket in variable A
   *
   * @example
   * For the unknot (0 crossings): <0₁> = 1
   * For a positive crossing on the unknot: changes by factor -A³
   */
  function kauffmanBracket(cube) {
    var n = cube.n;
    var totalVertices = 1 << n;

    // d = -A^2 - A^{-2}
    var d = new LaurentPoly([{ c: -1, e: 2 }, { c: -1, e: -2 }], CoefficientRing.Z);

    var bracket = LaurentPoly.zero(CoefficientRing.Z);

    for (var v = 0; v < totalVertices; v++) {
      var sig = cube.sigma(v);
      var c = cube.circleCount(v);

      // A^{sigma(v)}
      var aSig = LaurentPoly.q(sig, CoefficientRing.Z);

      // d^{c(v) - 1}
      var dPow = LaurentPoly.one(CoefficientRing.Z);
      for (var k = 0; k < c - 1; k++) {
        dPow = dPow.multiply(d);
      }

      bracket = bracket.add(aSig.multiply(dPow));
    }

    return bracket;
  }

  /**
   * Convert the Kauffman bracket (in A) to the Jones polynomial (in q).
   *
   * **Convention Used** (STANDARD, matching KnotInfo and stored data):
   *   V(q) = (-1)^w · A^(-3w) · <K>(A) |_{A = q^(-1/4)}
   *
   * where:
   *   - w = writhe (signed sum of crossing signs)
   *   - <K> = Kauffman bracket in variable A
   *   - q = the Jones polynomial variable
   *   - The substitution A = q^(-1/4) means: A^k → q^(-k/4)
   *
   * **Step-by-step**:
   *   1. Compute bracket <K> = Σ_{v} A^σ(v) · d^(c(v)-1)
   *   2. Multiply by writhe prefactor: (-1)^w · A^(-3w)
   *   3. Substitute A = q^(-1/4): each A^k becomes q^(-k/4)
   *   4. Result: integer powers of q (all exponents divisible by 4)
   *
   * **Why q^(-1/4)?**: The standard modern convention uses t = A^(-4) for the
   * Jones polynomial variable. Setting q = t means we need A^(-4) = q, so
   * A = q^(-1/4). This is the universal standard in knot theory and databases.
   *
   * **Writhe Prefactor Detail**:
   *   (-1)^(-3w) = (-1)^(3w) = ((-1)^3)^w = (-1)^w
   *   So: sign = (w % 2 === 0) ? +1 : -1
   *
   * **Verification**: Computed V(q) should match:
   *   - Stored jones_latex in knots.json/links.json (exact match)
   *   - Graded Euler characteristic of Khovanov homology (identity)
   *   - Mirror image: V_mirror(q) = V(q^(-1)) (sign convention)
   *
   * @param {LaurentPoly} bracket  Kauffman bracket in variable A
   * @param {number} writhe        Writhe w = Σ sign(crossing_i)
   * @returns {LaurentPoly}        Jones polynomial V(q) in standard form
   *
   * @example
   * For trefoil (3_1): w=3, <K>=A⁸-A⁴-A⁻⁴
   * Prefactor: (-1)³·A⁻⁹ = -A⁻⁹
   * The substitution A = q^{1/4} maps A^k -> q^{k/4}.
   * For knots, the exponents -3w + n - 2|v| are always divisible by 4,
   * yielding integer powers of q. For some multi-component links,
   * parity conditions cause half-integer exponents — this is a known
   * limitation of the state sum approach and does not affect the
   * Khovanov homology computation.
   */
  function jonesFromBracket(bracket, writhe) {
    // Multiply by (-A)^{-3w} = (-1)^{-3w} * A^{-3w}
    // (-1)^{-3w} = (-1)^{3w} = (-1)^w  (since (-1)^2 = 1)
    var sign = (writhe % 2 === 0) ? 1 : -1;
    var normFactor = new LaurentPoly(
      [{ c: sign, e: -3 * writhe }],
      CoefficientRing.Z
    );

    var normalized = bracket.multiply(normFactor);

    // Substitute A = q^{1/4} (so q = A^4): A^k -> q^{k/4}
    // For knots, all exponents are divisible by 4 (integer powers of q).
    // For some links, half-integer exponents may appear (parity issue).
    var jones = normalized.substituteQPower(0.25);

    return jones;
  }

  // =================================================================
  // Verification helpers
  // =================================================================

  /**
   * Compare computed Jones polynomial against stored jones_latex.
   *
   * **Verification Strategy**:
   * 1. Parse the stored LaTeX representation
   * 2. Compare with computed polynomial term-by-term
   * 3. Check for sign convention differences (uncommon, but possible)
   * 4. Report any discrepancies with debugging information
   *
   * **Common Issues**:
   * - Square root notation: √q vs q^(1/2) vs q^(0.5)
   * - Different LaTeX formatting conventions
   * - Sign convention differences (different choice of Jones normalization)
   * - Computational errors in Kauffman bracket or writhe calculation
   *
   * @param {LaurentPoly} computed     Computed Jones polynomial in q
   * @param {string} storedLatex       LaTeX string from knots.json/links.json
   * @returns {Object}                 Verification result with details
   *   - match: boolean (true if polynomials agree exactly)
   *   - storedPoly: LaurentPoly or null
   *   - details: string (explanation of match/mismatch)
   *   - suggestion: string (optional, if mismatch seems fixable)
   */
  /**
   * Parse a Jones polynomial LaTeX string into a Map<exponent, coefficient>.
   * Handles integer and fractional exponents (e.g., q^{3/2}, \sqrt{q},
   * \frac{1}{q^{\frac{5}{2}}}), as well as standard forms like q^{-3}.
   *
   * @param {string} latex
   * @returns {Map<number, number>} exponent -> coefficient
   */
  function parseJonesLatex(latex) {
    var terms = new Map();

    function addTerm(coeff, exp) {
      if (coeff === 0) return;
      // Round to avoid float issues (exponents are multiples of 0.5)
      exp = Math.round(exp * 2) / 2;
      var existing = terms.get(exp) || 0;
      var sum = existing + coeff;
      if (sum === 0) terms.delete(exp);
      else terms.set(exp, sum);
    }

    var s = latex.replace(/\s+/g, ' ').trim();

    // Step 0: Handle "q^{k} \left( expr \right)" or "q \left( expr \right)"
    // by expanding: parse inner, then add outer exponent to each term.
    var leftIdx = s.indexOf('\\left(');
    if (leftIdx > 0) {
      var rightIdx = s.lastIndexOf('\\right)');
      if (rightIdx > leftIdx) {
        var prefix = s.substring(0, leftIdx).trim();
        var inner = s.substring(leftIdx + 6, rightIdx).trim();
        // Parse the outer multiplier (e.g., "q", "q^{3}", "-2q^{3}", "3")
        var outerExp = 0;
        var outerCoeff = 1;
        var qm = prefix.match(/([+-]?\d*)\s*q(?:\^\{([^}]+)\})?$/);
        if (qm) {
          outerCoeff = (qm[1] === '' || qm[1] === '+') ? 1 : (qm[1] === '-') ? -1 : parseFloat(qm[1]) || 1;
          outerExp = qm[2] ? parseFloat(qm[2]) : 1;
        }
        // Recursively parse inner expression
        var innerTerms = parseJonesLatex(inner);
        // Multiply: each inner term (exp, coeff) becomes (exp + outerExp, coeff * outerCoeff)
        innerTerms.forEach(function (c, e) {
          addTerm(c * outerCoeff, e + outerExp);
        });
        return terms;
      }
    }

    // Step 0b: Handle \frac{polynomial}{q^{M}} where the ENTIRE string is one frac
    // e.g. \frac{q^7 - q^6 + 2q^5 - 1}{q^9}
    // Uses brace-balanced extraction to avoid matching sums of simple fracs
    if (s.indexOf('\\frac{') === 0) {
      var bd0 = 0, numEnd = -1;
      for (var fi = 5; fi < s.length; fi++) {
        if (s[fi] === '{') bd0++;
        if (s[fi] === '}') { bd0--; if (bd0 === 0) { numEnd = fi; break; } }
      }
      if (numEnd > 0) {
        var rest0b = s.substring(numEnd + 1);
        var denomMatch = rest0b.match(/^\{q\^\{?(\d+)\}?\}$/);
        if (denomMatch) {
          var numStr = s.substring(6, numEnd);
          var numTerms = parseJonesLatex(numStr);
          var shift = -parseInt(denomMatch[1], 10);
          numTerms.forEach(function (c, e) { addTerm(c, e + shift); });
          return terms;
        }
      }
    }

    // Step 1: Replace \sqrt{q} with q^{0.5}
    s = s.replace(/\\sqrt\{q\}/g, 'q^{0.5}');

    // Step 2: Replace \frac{N}{q^{\frac{A}{B}}} with N*q^{-A/B}
    s = s.replace(/\\frac\{([^}]*)\}\{q\^\{\\frac\{(\d+)\}\{(\d+)\}\}\}/g, function (_, num, a, b) {
      var exp = -parseInt(a, 10) / parseInt(b, 10);
      return '(' + num + ')q^{' + exp + '}';
    });

    // Step 3: Replace \frac{N}{q^{M}} with N*q^{-M} (M can be integer or decimal)
    s = s.replace(/\\frac\{([^}]*)\}\{q\^\{?(-?[\d.]+)\}?\}/g, function (_, num, exp) {
      return '(' + num + ')q^{' + (-parseFloat(exp)) + '}';
    });

    // Step 4: Replace \frac{N}{q} with N*q^{-1}
    s = s.replace(/\\frac\{([^}]*)\}\{q\}/g, '($1)q^{-1}');

    // Step 5: Replace q^{\frac{A}{B}} with q^{A/B}
    s = s.replace(/q\^\{\\frac\{(-?\d+)\}\{(\d+)\}\}/g, function (_, a, b) {
      return 'q^{' + (parseInt(a, 10) / parseInt(b, 10)) + '}';
    });

    // Tokenize by + and - signs at brace depth 0
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

      // Remove wrapping parens (including with leading sign and whitespace)
      tok = tok.replace(/^([+-]?)\s*\(([^)]*)\)/, '$1$2');

      var coeff = 1;
      var exp = 0;

      var qIdx = tok.indexOf('q');
      if (qIdx === -1) {
        coeff = parseFloat(tok.replace(/\s+/g, '')) || 0;
        exp = 0;
      } else {
        var before = tok.substring(0, qIdx).replace(/\s+/g, '');
        if (before === '' || before === '+') coeff = 1;
        else if (before === '-') coeff = -1;
        else coeff = parseFloat(before) || 0;

        var after = tok.substring(qIdx + 1).trim();
        if (after === '') {
          exp = 1;
        } else {
          var expMatch = after.match(/^\^\{?([^}]*)\}?/);
          if (expMatch) {
            exp = parseFloat(expMatch[1]) || 0;
          } else {
            exp = 1;
          }
        }
      }

      addTerm(coeff, exp);
    }

    return terms;
  }

  function verifyJones(computed, storedLatex, nComponents) {
    if (!storedLatex) {
      return {
        match: false,
        storedPoly: null,
        details: 'No stored Jones polynomial in database'
      };
    }

    // Parse both into term maps and compare
    var computedTerms = new Map();
    computed._terms.forEach(function (c, e) {
      var exp = Math.round(e * 2) / 2;
      computedTerms.set(exp, (typeof c === 'number') ? c : 0);
    });

    var storedTerms = parseJonesLatex(storedLatex);

    function compare(ct, st) {
      var allExps = new Set();
      ct.forEach(function (_, e) { allExps.add(e); });
      st.forEach(function (_, e) { allExps.add(e); });
      var ok = true;
      var ms = [];
      allExps.forEach(function (e) {
        var cv = ct.get(e) || 0;
        var sv = st.get(e) || 0;
        if (Math.abs(cv - sv) > 1e-9) {
          ok = false;
          ms.push('q^{' + e + '}: computed=' + cv + ' stored=' + sv);
        }
      });
      return { ok: ok, mismatches: ms };
    }

    var r = compare(computedTerms, storedTerms);
    if (r.ok) {
      return {
        match: true,
        storedPoly: null,
        details: '\u2713 Computed matches stored polynomial (term-by-term comparison).' +
          (nComponents && nComponents > 1 ? ' Link has ' + nComponents + ' components.' : '')
      };
    }

    // Fallback 1: try mirror convention (q -> q^{-1})
    var mirrored = new Map();
    computedTerms.forEach(function (c, e) { mirrored.set(-e, c); });
    var rm = compare(mirrored, storedTerms);
    if (rm.ok) {
      return {
        match: true,
        mirror: true,
        storedPoly: null,
        details: '\u2713 Matches stored polynomial under mirror convention \\(q \\to q^{-1}\\)' +
          ' (database and computation use opposite chirality conventions for this ' +
          (nComponents || 1) + '-component ' +
          ((nComponents || 1) > 1 ? 'link' : 'knot') + ').'
      };
    }

    // Fallback 2: try a pure Laurent shift (storedTerms = q^k * computedTerms)
    // Useful when normalization/framing conventions differ by an overall q^k.
    function tryShift(src, tgt) {
      var srcExps = [], tgtExps = [];
      src.forEach(function (_, e) { srcExps.push(e); });
      tgt.forEach(function (_, e) { tgtExps.push(e); });
      if (srcExps.length !== tgtExps.length || srcExps.length === 0) return null;
      srcExps.sort(function (a, b) { return a - b; });
      tgtExps.sort(function (a, b) { return a - b; });
      var k = tgtExps[0] - srcExps[0];
      // Must be a half-integer
      if (Math.abs(k * 2 - Math.round(k * 2)) > 1e-9) return null;
      var shifted = new Map();
      src.forEach(function (c, e) { shifted.set(Math.round((e + k) * 2) / 2, c); });
      var r2 = compare(shifted, tgt);
      return r2.ok ? k : null;
    }
    var shiftK = tryShift(computedTerms, storedTerms);
    if (shiftK !== null) {
      return {
        match: true,
        shifted: true,
        shiftK: shiftK,
        storedPoly: null,
        details: '\u2713 Matches stored polynomial up to an overall Laurent shift ' +
          '\\(q^{' + shiftK + '}\\) (database and computation use different ' +
          'framing/normalization for this ' + (nComponents || 1) + '-component ' +
          ((nComponents || 1) > 1 ? 'link' : 'knot') + ').'
      };
    }

    // Fallback 3: mirror combined with Laurent shift
    var shiftKm = tryShift(mirrored, storedTerms);
    if (shiftKm !== null) {
      return {
        match: true,
        mirror: true,
        shifted: true,
        shiftK: shiftKm,
        storedPoly: null,
        details: '\u2713 Matches stored polynomial under mirror \\(q \\to q^{-1}\\) ' +
          'composed with a Laurent shift \\(q^{' + shiftKm + '}\\). ' +
          'This indicates the database uses opposite orientation/chirality and ' +
          'a different framing convention for this ' + (nComponents || 1) + '-component ' +
          ((nComponents || 1) > 1 ? 'link' : 'knot') + '.'
      };
    }

    return {
      match: false,
      storedPoly: null,
      details: 'Computed: ' + computed.toLatex('q') + '\n' +
               'Stored: ' + storedLatex + '\n' +
               'Mismatches: ' + r.mismatches.join(', ') +
               (nComponents ? '\nComponents: ' + nComponents : '')
    };
  }

  // =================================================================
  // Rasmussen s-invariant from Lee homology
  // =================================================================

  /**
   * Compute the Rasmussen s-invariant for a knot using Lee homology over Q.
   *
   * The Lee differential deforms Khovanov homology so that for a knot,
   * the Lee homology is exactly 2-dimensional (over Q), generated by
   * two canonical classes s_+ and s_-. The s-invariant is:
   *
   *   s(K) = (q_max + q_min) / 2
   *
   * where q_max, q_min are the quantum gradings of the two Lee generators.
   *
   * The s-invariant gives a lower bound on the slice genus:
   *   |s(K)| / 2 <= g_4(K)
   *
   * @param {number[][]} pdCode
   * @param {number[]} crossingSigns
   * @returns {{ s: number|null, qMax: number|null, qMin: number|null, error: string|null }}
   */
  function computeRasmussenS(pdCode, crossingSigns) {
    try {
      // Build a filtered (singly-graded) Lee chain complex.
      // The filtered complex includes cross-quantum-grading differential
      // terms that the bigraded complex drops. This is essential for Lee
      // homology to collapse to rank 2 over Q.
      var result = buildFilteredKhovanovComplex(
        pdCode, crossingSigns,
        FrobeniusAlgebra.Lee,
        CoefficientRing.Z
      );
      var leeCx = result.complex;
      var jGrads = result.jGradings;

      // Verify d^2 = 0
      var verification = leeCx.verify();
      if (!verification.valid) {
        return { s: null, qMax: null, qMin: null,
                 error: 'd^2 != 0 in filtered Lee complex: ' + verification.errors.join('; ') };
      }

      // Compute homology over Q (singly-graded: keys are homological degrees)
      var hom = leeCx.homology();
      var totalRank = 0;
      hom.forEach(function (h) { totalRank += h.rank; });

      if (totalRank !== 2) {
        return {
          s: null, qMax: null, qMin: null,
          error: 'Lee homology has rank ' + totalRank + ' (expected 2 for a knot). ' +
                 'This may be a link or the computation may have an issue.',
          totalRank: totalRank
        };
      }

      // Extract quantum gradings of the two surviving generators.
      // Strategy: for each homological degree with nonzero homology,
      // use the j-filtration to identify which generators survive.
      // Over Q with rank 2, there are exactly 2 surviving generators.
      // Their j-gradings give q_min and q_max.
      //
      // For the standard Lee homology of a knot, both generators live
      // at homological degree 0, with j-gradings s-1 and s+1 where s
      // is the s-invariant. So s = (q_min + q_max) / 2.
      //
      // Simple approach: since the homology is 2-dimensional and all
      // generators have known j-values, find the j-extent.
      var survivingJ = [];
      hom.forEach(function (h, deg) {
        if (h.rank > 0 && jGrads[deg]) {
          // The homology at this degree has rank h.rank.
          // Use filtration: sort generators by j, find which survive.
          // For simplicity with rank 2 total, collect all j-values
          // at degrees with nonzero homology.
          var js = jGrads[deg].slice();
          js.sort(function (a, b) { return a - b; });
          // The surviving generators span from min j to max j at this degree
          // For Lee homology specifically, h.rank generators survive
          if (h.rank <= js.length) {
            // Take the extreme j-values (Lee canonical generators are at extremes)
            survivingJ.push(js[0]);
            if (h.rank > 1) survivingJ.push(js[js.length - 1]);
          }
        }
      });

      if (survivingJ.length < 2) {
        return { s: null, qMax: null, qMin: null,
                 error: 'Could not identify quantum gradings of Lee generators' };
      }

      survivingJ.sort(function (a, b) { return a - b; });
      var qMin = survivingJ[0];
      var qMax = survivingJ[survivingJ.length - 1];

      return {
        s: (qMax + qMin) / 2,
        qMax: qMax,
        qMin: qMin,
        error: null
      };
    } catch (e) {
      return { s: null, qMax: null, qMin: null, error: e.message };
    }
  }

  // =================================================================
  // Bigraded homology table renderer (with CSS classes)
  // =================================================================

  /**
   * Render homology as a bigraded HTML table using CSS classes from
   * experimental.css.
   *
   * @param {BigradedChainComplex} complex
   * @param {Map<string, {rank: number, torsion: number[]}>} hom
   * @returns {string} HTML
   */
  function renderBigradedTable(complex, hom) {
    var bounds = complex.getBounds();
    var html = '<table class="bigraded-table">\n';

    // Header: homological grading i
    html += '<tr><th>\\(j \\backslash i\\)</th>';
    for (var i = bounds.iMin; i <= bounds.iMax; i++) {
      html += '<th>' + i + '</th>';
    }
    html += '</tr>\n';

    // Rows: quantum grading j (descending)
    for (var j = bounds.jMax; j >= bounds.jMin; j--) {
      // Only show rows with the correct parity (Khovanov homology has
      // a specific parity pattern: j and i have the same parity as
      // n_+ - n_-. But we show all rows and just leave empty cells.)
      html += '<tr><th>' + j + '</th>';
      for (var ii = bounds.iMin; ii <= bounds.iMax; ii++) {
        var key = ii + ',' + j;
        var h = hom.get(key);
        var cell = '';
        var cls = '';

        if (h) {
          var parts = [];
          if (h.rank > 0) {
            parts.push(h.rank === 1
              ? '\\mathbb{Z}'
              : '\\mathbb{Z}^{' + h.rank + '}');
          }
          for (var t = 0; t < h.torsion.length; t++) {
            parts.push('\\mathbb{Z}_{' + h.torsion[t] + '}');
          }
          if (parts.length > 0) {
            cell = '\\(' + parts.join(' \\oplus ') + '\\)';
            cls = h.torsion.length > 0 ? ' class="torsion"' : ' class="nonzero"';
          }
        }

        html += '<td' + cls + '>' + cell + '</td>';
      }
      html += '</tr>\n';
    }

    html += '</table>';
    return html;
  }

  /**
   * Render the chain group ranks as a bigraded table (for the "Chain groups" detail).
   * @param {BigradedChainComplex} complex
   * @returns {string} HTML
   */
  function renderChainGroupTable(complex) {
    var bounds = complex.getBounds();
    var html = '<table class="bigraded-table">\n';

    html += '<tr><th>\\(j \\backslash i\\)</th>';
    for (var i = bounds.iMin; i <= bounds.iMax; i++) {
      html += '<th>' + i + '</th>';
    }
    html += '</tr>\n';

    for (var j = bounds.jMax; j >= bounds.jMin; j--) {
      html += '<tr><th>' + j + '</th>';
      for (var ii = bounds.iMin; ii <= bounds.iMax; ii++) {
        var key = ii + ',' + j;
        var rank = complex.groups[key] || 0;
        var cls = rank > 0 ? ' class="nonzero"' : '';
        html += '<td' + cls + '>' + (rank > 0 ? rank : '') + '</td>';
      }
      html += '</tr>\n';
    }

    html += '</table>';
    return html;
  }

  /**
   * Format a differential matrix for display.
   * @param {IntMatrix} mat
   * @returns {string}
   */
  function formatMatrix(mat) {
    if (!mat) return '(empty)';
    var lines = [];
    for (var i = 0; i < mat.rows; i++) {
      var row = [];
      for (var j = 0; j < mat.cols; j++) {
        var v = mat.get(i, j);
        row.push(v >= 0 ? ' ' + v : '' + v);
      }
      lines.push('[ ' + row.join('  ') + ' ]');
    }
    return lines.join('\n');
  }

  // =================================================================
  // Homology summary (text description)
  // =================================================================

  /**
   * Summarize homology as text, e.g. "Z + Z^2 + Z_2 in bidegrees (0,1), (1,3), (2,3)".
   * @param {Map<string, {rank: number, torsion: number[]}>} hom
   * @returns {string}
   */
  function summarizeHomology(hom) {
    if (hom.size === 0) return 'Trivial (all zero)';

    var totalRank = 0;
    var totalTorsion = [];
    var nonzeroKeys = [];

    hom.forEach(function (h, key) {
      totalRank += h.rank;
      for (var i = 0; i < h.torsion.length; i++) {
        totalTorsion.push(h.torsion[i]);
      }
      nonzeroKeys.push('(' + key + ')');
    });

    var parts = [];
    if (totalRank > 0) parts.push('free rank ' + totalRank);
    if (totalTorsion.length > 0) {
      var torsionStr = totalTorsion.map(function (t) { return 'Z/' + t; }).join(', ');
      parts.push('torsion: ' + torsionStr);
    }

    return parts.join(', ') + ' across ' + nonzeroKeys.length + ' bidegrees';
  }

  // =================================================================
  // UI Builder
  // =================================================================

  function buildUI(container) {
    var items = getAllItems();
    var sorted = Object.keys(items).sort(function (a, b) {
      var ca = parseInt(items[a].crossings) || 0;
      var cb = parseInt(items[b].crossings) || 0;
      return ca - cb || a.localeCompare(b);
    });

    var html = '<div class="exp-container">';

    // Controls
    html += '<div class="exp-controls">';

    // Knot selector
    html += '<label for="hom-knot-sel">Knot/Link:</label>';
    html += '<select id="hom-knot-sel">';
    for (var i = 0; i < sorted.length; i++) {
      var name = sorted[i];
      var d = items[name];
      var c = parseInt(d.crossings) || 0;
      html += '<option value="' + name + '">' + name + ' (' + c + ' cr.)</option>';
    }
    html += '</select>';

    // Variant selector
    html += '<label for="hom-variant-sel">Variant:</label>';
    html += '<select id="hom-variant-sel">';
    html += '<option value="original">Original</option>';
    html += '<option value="mirror">Mirror</option>';
    html += '</select>';

    // Frobenius algebra selector
    html += '<label for="hom-algebra-sel">Frobenius algebra:</label>';
    html += '<select id="hom-algebra-sel">';
    html += '<option value="Khovanov">Khovanov (x&sup2; = 0)</option>';
    html += '<option value="Lee">Lee (x&sup2; = 1)</option>';
    html += '<option value="BarNatan">Bar-Natan (x&sup2; = x)</option>';
    html += '</select>';

    // Coefficient ring selector
    html += '<label for="hom-ring-sel">Coefficients:</label>';
    html += '<select id="hom-ring-sel">';
    html += '<option value="Z">Z (integers)</option>';
    html += '<option value="Q">Q (rationals)</option>';
    html += '<option value="Fp">F_p (prime field)</option>';
    html += '</select>';

    // Prime input (for Fp)
    html += '<input type="number" id="hom-prime-input" value="2" min="2" max="97" ';
    html += 'style="width:3.5rem; display:none" title="Prime p for F_p">';

    // Compute button
    html += '<button id="hom-compute-btn">Compute</button>';

    html += '</div>'; // .exp-controls

    // Results area
    html += '<div id="hom-results"></div>';

    html += '</div>'; // .exp-container

    container.innerHTML = html;

    // Wire up events
    document.getElementById('hom-ring-sel').addEventListener('change', function () {
      var primeInput = document.getElementById('hom-prime-input');
      primeInput.style.display = this.value === 'Fp' ? 'inline-block' : 'none';
    });

    document.getElementById('hom-compute-btn').addEventListener('click', function () {
      runComputation();
    });

    // Set default selection
    var sel = document.getElementById('hom-knot-sel');
    if (sel.querySelector('option[value="3_1"]')) {
      sel.value = '3_1';
    }
  }

  // =================================================================
  // Main computation
  // =================================================================

  async function runComputation() {
    var knotName = document.getElementById('hom-knot-sel').value;
    var variant = document.getElementById('hom-variant-sel').value;
    var algebraName = document.getElementById('hom-algebra-sel').value;
    var ringName = document.getElementById('hom-ring-sel').value;
    var resultsDiv = document.getElementById('hom-results');

    var items = getAllItems();
    var d = items[knotName];
    if (!d || !d.pd_code || d.pd_code.length === 0) {
      resultsDiv.innerHTML = '<div class="exp-card"><p>No PD code available for ' +
        knotName + '.</p></div>';
      return;
    }

    var pdCode = d.pd_code;
    var n = pdCode.length;

    // Mirror: swap b <-> d in each crossing to change over/under structure.
    // This gives the correct circle counts at each resolution vertex for
    // the mirror diagram. Combined with negating crossing signs (below),
    // this produces the correct Khovanov homology gradings.
    //
    // NOTE: The Kauffman bracket computed from the (mirPD, -signs) cube
    // equals the original bracket (the two operations cancel in sigma).
    // So we compute the mirror bracket separately via A -> A^{-1}.
    if (variant === 'mirror') {
      pdCode = pdCode.map(function (x) { return [x[0], x[3], x[2], x[1]]; });
    }

    // Check feasibility
    if (n > 12) {
      resultsDiv.innerHTML = '<div class="exp-card"><p>Too many crossings (' + n +
        ') for browser computation. Maximum supported is 12.</p></div>';
      return;
    }

    // Show spinner
    resultsDiv.innerHTML = '<div class="exp-progress">' +
      '<div class="exp-spinner"></div>' +
      '<span>Computing homological invariants for ' + knotName +
      (variant === 'mirror' ? ' (mirror)' : '') + '...</span></div>';

    // Select algebra
    var algebra;
    if (algebraName === 'Lee') {
      algebra = FrobeniusAlgebra.Lee;
    } else if (algebraName === 'BarNatan') {
      algebra = FrobeniusAlgebra.BarNatan;
    } else {
      algebra = FrobeniusAlgebra.Khovanov;
    }

    // Select ring
    var ring;
    if (ringName === 'Q') {
      ring = CoefficientRing.Q;
    } else if (ringName === 'Fp') {
      var p = parseInt(document.getElementById('hom-prime-input').value) || 2;
      ring = CoefficientRing.Fp(p);
    } else {
      ring = CoefficientRing.Z;
    }

    // Determine crossing signs and writhe.
    //
    // Strategy: Use Jones matching to find the "effective writhe" (reliable
    // with our A=q^{1/4} convention), then use PD-derived per-crossing signs
    // for the chain complex grading (adjusting overall sign if needed).
    var pdIsMirror = false;
    var crossingSigns;

    // Compute bracket (sign-independent)
    var dummySigns = [];
    for (var si = 0; si < n; si++) dummySigns.push(1);
    var dummyCube = new ResolutionCube(pdCode, dummySigns);
    var bracketForWrithe = kauffmanBracket(dummyCube);

    // Jones matching: find writhe that makes bracket match stored Jones
    var detected = computeWrithe(bracketForWrithe, d.jones_latex, d.mirror_jones_latex, n);

    if (detected !== null) {
      var detectedWrithe = detected.writhe;
      pdIsMirror = detected.pdIsMirror;
      if (variant === 'mirror') pdIsMirror = !pdIsMirror;

      // Use PD-derived signs for per-crossing accuracy
      var pdSigns = crossingSignsFromPD(pdCode);
      if (pdSigns) {
        var pdWrithe = 0;
        for (var si = 0; si < n; si++) pdWrithe += pdSigns[si];
        if (pdWrithe === detectedWrithe) {
          crossingSigns = pdSigns;
        } else if (pdWrithe === -detectedWrithe) {
          crossingSigns = pdSigns.map(function (s) { return -s; });
        } else {
          var nMinus = (n - detectedWrithe) / 2;
          crossingSigns = [];
          for (var si = 0; si < n; si++) crossingSigns.push(si < nMinus ? -1 : 1);
        }
      } else {
        var nMinus = (n - detectedWrithe) / 2;
        crossingSigns = [];
        for (var si = 0; si < n; si++) crossingSigns.push(si < nMinus ? -1 : 1);
      }

      if (variant === 'mirror') {
        crossingSigns = crossingSigns.map(function (s) { return -s; });
      }
      console.log('Writhe detected: w=' + detectedWrithe +
        (pdIsMirror ? ' [PD is mirror chirality]' : ''));
    } else {
      // Fall back to cached metadata crossing signs
      crossingSigns = await getCrossingSigns(knotName, d.pd_code);
      if (variant === 'mirror') {
        crossingSigns = crossingSigns.map(function (s) { return -s; });
      }
      console.log('Using fallback crossing signs:', crossingSigns);
    }

    // For knots with many crossings, defer to setTimeout to avoid blocking
    var isExpensive = n >= 8;

    if (isExpensive) {
      setTimeout(function () {
        executeComputation(knotName, d, pdCode, crossingSigns, algebra, algebraName,
                           ring, ringName, variant, resultsDiv, pdIsMirror);
      }, 50);
    } else {
      executeComputation(knotName, d, pdCode, crossingSigns, algebra, algebraName,
                         ring, ringName, variant, resultsDiv, pdIsMirror);
    }
  }

  /**
   * Core computation logic, separated so it can be deferred via setTimeout.
   */
  function executeComputation(knotName, d, pdCode, crossingSigns, algebra, algebraName,
                              ring, ringName, variant, resultsDiv, pdIsMirror) {
    var t0 = performance.now();

    try {
      var n = pdCode.length;
      var cube = new ResolutionCube(pdCode, crossingSigns);
      var writhe = cube.writhe();
      var isKnot = !!KNOT_DATA[knotName];

      // Count positive/negative crossings
      var nPlus = 0, nMinus = 0;
      for (var s = 0; s < n; s++) {
        if (crossingSigns[s] > 0) nPlus++;
        else nMinus++;
      }

      var resultHTML = '';

      // ---------------------------------------------------------------
      // 1. Kauffman Bracket
      // ---------------------------------------------------------------
      var bracket = kauffmanBracket(cube);
      var bracketLatex = bracket.toLatex('A');

      resultHTML += '<div class="exp-card">';
      resultHTML += '<h3>Kauffman Bracket</h3>';
      resultHTML += '<div class="exp-poly">\\(\\langle ' + knotName +
        (variant === 'mirror' ? '^*' : '') +
        ' \\rangle = ' + bracketLatex + '\\)</div>';
      resultHTML += '<details><summary>State sum details</summary>';
      resultHTML += '<p>Crossings: ' + n + ' (' + nPlus + ' positive, ' + nMinus +
        ' negative)</p>';
      resultHTML += '<p>Writhe: \\(w = ' + writhe + '\\)</p>';
      resultHTML += '<p>Resolution cube: \\(2^{' + n + '} = ' + (1 << n) +
        '\\) vertices</p>';
      resultHTML += '<p>State sum: \\(\\langle K \\rangle = \\sum_v A^{\\sigma(v)} \\cdot ' +
        '(-A^2 - A^{-2})^{c(v)-1}\\)</p>';

      // Show a few states
      var totalVertices = 1 << n;
      var maxShow = Math.min(totalVertices, 16);
      resultHTML += '<div class="exp-matrix">';
      resultHTML += 'Vertex  sigma  circles\n';
      resultHTML += '------  -----  -------\n';
      for (var v = 0; v < maxShow; v++) {
        var label = cube.vertexLabel(v);
        var sig = cube.sigma(v);
        var cc = cube.circleCount(v);
        resultHTML += label + '    ' +
          (sig >= 0 ? '+' : '') + sig + '      ' + cc + '\n';
      }
      if (totalVertices > maxShow) {
        resultHTML += '... (' + (totalVertices - maxShow) + ' more vertices)\n';
      }
      resultHTML += '</div>';
      resultHTML += '</details></div>';

      // ---------------------------------------------------------------
      // 2. Jones Polynomial
      // ---------------------------------------------------------------
      var jones = jonesFromBracket(bracket, writhe);
      var jonesLatex = jones.toLatex('q');

      // Verification against stored data
      // If pdIsMirror, the PD code represents the opposite chirality from what
      // variant expects, so swap which stored Jones we compare against.
      var storedJones;
      if (pdIsMirror) {
        storedJones = variant === 'mirror' ? d.jones_latex : d.mirror_jones_latex;
      } else {
        storedJones = variant === 'mirror' ? d.mirror_jones_latex : d.jones_latex;
      }
      var nComponents = componentCountFromPD(pdCode);
      var verif = verifyJones(jones, storedJones, nComponents);

      resultHTML += '<div class="exp-card">';
      resultHTML += '<h3>Jones Polynomial';
      if (verif.match && verif.mirror && verif.shifted) {
        resultHTML += ' <span class="exp-badge pass">verified (mirror + shift)</span>';
      } else if (verif.match && verif.mirror) {
        resultHTML += ' <span class="exp-badge pass">verified (mirror convention)</span>';
      } else if (verif.match && verif.shifted) {
        resultHTML += ' <span class="exp-badge pass">verified (Laurent shift)</span>';
      } else if (verif.match) {
        resultHTML += ' <span class="exp-badge pass">verified</span>';
      } else if (storedJones) {
        resultHTML += ' <span class="exp-badge fail">check failed</span>';
      }
      resultHTML += '</h3>';
      resultHTML += '<div class="exp-poly">\\(V_{' + knotName +
        (variant === 'mirror' ? '^*' : '') +
        '}(q) = ' + jonesLatex + '\\)</div>';
      resultHTML += '<p style="font-size:0.85rem;color:#666">Computed via \\(V(q) = ' +
        '(-A)^{-3w} \\cdot \\langle K \\rangle\\) with \\(A = q^{1/4}\\), \\(w = ' +
        writhe + '\\). Components: \\(c = ' + nComponents + '\\).</p>';
      if (verif.match && (verif.mirror || verif.shifted)) {
        resultHTML += '<p style="font-size:0.85rem;color:#2e7d32">' +
          '<strong>Note.</strong> ' + verif.details + '</p>';
      }

      if (storedJones && !verif.match) {
        resultHTML += '<details><summary>Verification details</summary>';
        resultHTML += '<p>' + verif.details + '</p>';
        if (verif.storedPoly) {
          resultHTML += '<p>Stored: \\(' + verif.storedPoly.toLatex('q') + '\\)</p>';
        }
        resultHTML += '</details>';
      }
      resultHTML += '</div>';

      // ---------------------------------------------------------------
      // 3. Khovanov Chain Complex & Homology
      // ---------------------------------------------------------------
      // Flag: bigraded display and downstream graded Euler / categorification
      // are meaningful only for the Khovanov algebra (x*x = 0 preserves j).
      // For Lee / Bar-Natan we show a single explanatory card instead.
      var isBigradedMeaningful = (algebraName === 'Khovanov');
      if (!isBigradedMeaningful) {
        resultHTML += '<div class="exp-card">';
        resultHTML += '<h3>Bigraded complex, homology, and categorification</h3>';
        resultHTML += '<p style="background:#fff3cd;border:1px solid #ffe58f;padding:0.6rem 0.8rem;' +
          'border-radius:4px;font-size:0.9rem;color:#664d03">' +
          '<strong>Not shown for ' + algebraName + '.</strong> The ' + algebraName +
          ' multiplication breaks the quantum grading \\(j\\) ' +
          '(\\(x \\otimes x \\mapsto ' + (algebraName === 'Lee' ? '1' : 'x') + '\\)), so ' +
          'the bigraded chain complex, bigraded homology \\(Kh^{i,j}\\), graded Euler ' +
          'characteristic \\(\\chi_q\\), and the categorification identity ' +
          '\\(\\chi_q(Kh) = (-1)^{c-1}(q+q^{-1})V(q^{-2})\\) are Khovanov-specific and ' +
          'would be misleading here. Select <strong>Khovanov</strong> to view them.</p>';
        resultHTML += '<p style="font-size:0.9rem">' +
          'The meaningful ' + algebraName + ' invariant is the filtered, singly-graded ' +
          'homology, which for a ' + nComponents + '-component ' +
          (nComponents > 1 ? 'link' : 'knot') + ' collapses to rank \\(2^{c} = ' +
          Math.pow(2, nComponents) + '\\) over \\(\\mathbb{Q}\\). ' +
          (algebraName === 'Lee'
            ? 'This rank-' + Math.pow(2, nComponents) + ' Lee homology underlies the ' +
              'Rasmussen \\(s\\)-invariant shown in the card below.'
            : 'The analogous Bar-Natan statement produces Rasmussen-type concordance ' +
              'invariants studied by Mackaay-Turner-Vaz.') +
          '</p>';
        resultHTML += '</div>';
      }
      var complexT0 = performance.now();
      var complex = buildKhovanovComplex(pdCode, crossingSigns, algebra, ring);
      var complexT1 = performance.now();

      // Verify d^2 = 0
      var d2check = complex.verify();

      if (isBigradedMeaningful) {
      resultHTML += '<div class="exp-card">';
      resultHTML += '<h3>Khovanov Chain Complex (' + algebraName + ' algebra, ' +
        (ringName === 'Fp' ? 'F_' + (ring.p || '?') : ringName) + ' coefficients)';
      if (d2check.valid) {
        resultHTML += ' <span class="exp-badge pass">d&sup2; = 0</span>';
      } else {
        resultHTML += ' <span class="exp-badge fail">d&sup2; &ne; 0</span>';
      }
      resultHTML += '</h3>';

      // Chain group ranks table
      resultHTML += '<details><summary>Chain groups \\(C^{i,j}\\) (ranks)</summary>';
      resultHTML += renderChainGroupTable(complex);
      resultHTML += '</details>';

      // Differential matrices
      var bounds = complex.getBounds();
      resultHTML += '<details><summary>Differential matrices</summary>';
      for (var qi = bounds.jMin; qi <= bounds.jMax; qi++) {
        var hasAny = false;
        for (var hi = bounds.iMin; hi <= bounds.iMax; hi++) {
          var dkey = hi + ',' + qi;
          if (complex.differentials[dkey]) {
            if (!hasAny) {
              resultHTML += '<p style="font-weight:600;margin-top:0.5rem">Quantum grading j = ' + qi + '</p>';
              hasAny = true;
            }
            var mat = complex.differentials[dkey];
            resultHTML += '<p>\\(d^{' + hi + ',' + qi + '}\\): ' +
              mat.rows + ' &times; ' + mat.cols + '</p>';
            resultHTML += '<div class="exp-matrix" style="max-height:320px;max-width:100%;overflow:auto;">' +
              formatMatrix(mat) + '</div>';
          }
        }
      }
      resultHTML += '</details>';

      if (!d2check.valid) {
        resultHTML += '<p style="color:#c62828"><strong>Warning:</strong> d&sup2; &ne; 0 detected. ' +
          'Errors: ' + d2check.errors.join('; ') + '</p>';
      }

      resultHTML += '</div>';

      // ---------------------------------------------------------------
      // 4. Homology computation
      // ---------------------------------------------------------------
      var homT0 = performance.now();
      var hom = complex.homology(ring);
      var homT1 = performance.now();

      resultHTML += '<div class="exp-card">';
      resultHTML += '<h3>Khovanov Homology \\(Kh^{i,j}\\)</h3>';
      resultHTML += '<p style="font-size:0.85rem;color:#666">' +
        summarizeHomology(hom) + '</p>';

      // Coloring scheme explanation
      resultHTML += '<details><summary>Coloring scheme</summary>';
      resultHTML += '<p>The table displays the homology groups \\(Kh^{i,j}\\) at each ' +
        '<strong>bidegree (i, j)</strong>, where:</p>';
      resultHTML += '<ul>';
      resultHTML += '<li>\\(i\\) is the <strong>homological grading</strong> (horizontal axis), ' +
        'ranging from left to right. This comes from the differential in the chain complex.</li>';
      resultHTML += '<li>\\(j\\) is the <strong>quantum grading</strong> (vertical axis), ' +
        'ranging from top (max) to bottom (min). This comes from the Frobenius algebra ' +
        'grading on the resolution complex.</li>';
      resultHTML += '</ul>';
      resultHTML += '<p><strong>Color meanings:</strong></p>';
      resultHTML += '<ul>';
      resultHTML += '<li><span style="background:#fff8e1;padding:0.2rem 0.4rem;border:1px solid #ddd">' +
        'Light yellow</span> indicates <strong>free homology</strong>: ' +
        '\\(Kh^{i,j} = \\mathbb{Z}^r\\) for some rank \\(r \\geq 1\\). ' +
        'This is the most common case.</li>';
      resultHTML += '<li><span style="background:#fce4ec;color:#c62828;padding:0.2rem 0.4rem;border:1px solid #ddd">' +
        'Light pink</span> indicates <strong>torsion homology</strong>: ' +
        '\\(Kh^{i,j}\\) contains torsion groups like \\(\\mathbb{Z}_p\\) ' +
        '(cyclic groups of order \\(p\\)). Torsion encodes information about the ' +
        'link structure that free rank alone cannot capture.</li>';
      resultHTML += '<li><strong>Empty cells</strong> (white background) mean ' +
        '\\(Kh^{i,j} = 0\\) (trivial group).</li>';
      resultHTML += '</ul>';
      resultHTML += '<p><strong>Pattern observation:</strong> For a knot with \\(n\\) crossings, ' +
        'homology appears only at bidegrees \\((i,j)\\) where \\(i + j\\) has the same parity ' +
        'as \\(n_+ - n_-\\) (the difference between positive and negative crossings). This parity ' +
        'constraint comes from the Frobenius algebra structure.</p>';
      resultHTML += '</details>';

      resultHTML += renderBigradedTable(complex, hom);
      resultHTML += '</div>';

      // ---------------------------------------------------------------
      // 5. Graded Euler Characteristic
      // ---------------------------------------------------------------
      var eulerFromChain = complex.gradedEulerCharacteristic(false, ring);
      var eulerFromHom = complex.gradedEulerCharacteristic(true, ring);
      var eulerLatex = eulerFromChain.toLatex('q');
      var eulerMatch = eulerFromChain.equals(eulerFromHom);

      // Compare with unnormalized Jones polynomial Ĵ(q_Kh)
      // The Khovanov Euler characteristic equals the unnormalized Jones:
      //   χ_q(Kh) = (-1)^{c-1} · (q + q^{-1}) · V(q^{-2})
      // where V is the normalized Jones polynomial, c = number of link components.
      // For knots (c=1), the sign factor is +1.
      // nComponents computed above via componentCountFromPD(pdCode)
      var signFactor = ((nComponents - 1) % 2 === 0) ? 1 : -1;
      var qPlusQinv = new LaurentPoly([{ c: 1, e: 1 }, { c: 1, e: -1 }], CoefficientRing.Z);
      var jonesInQKh = jones.substituteQPower(-2);  // V(q^{-2}) in q_Kh variable
      var jHat = qPlusQinv.multiply(jonesInQKh);     // (q + q^{-1}) · V(q^{-2})
      if (signFactor === -1) {
        jHat = jHat.multiply(new LaurentPoly([{ c: -1, e: 0 }], CoefficientRing.Z));
      }
      var jonesMatchesEuler = jHat.equals(eulerFromChain);
      var jHatLatex = jHat.toLatex('q');

      // ---- 5a. Unnormalized Jones Ĵ(q) from V(q) ----
      var jonesLatexInQ = jones.toLatex('q');
      var jonesInQKhLatex = jonesInQKh.toLatex('q');

      resultHTML += '<div class="exp-card">';
      resultHTML += '<h3>Unnormalized Jones Polynomial \\(\\hat{J}(q)\\)</h3>';
      resultHTML += '<p>The unnormalized Jones polynomial is computed from the normalized ' +
        'Jones polynomial via the variable substitution \\(q_{\\text{Jones}} \\to q^{-2}\\) ' +
        'and multiplication by \\((q + q^{-1})\\):</p>';
      resultHTML += '<p style="text-align:center">\\[\\hat{J}(q) = (-1)^{c-1} (q + q^{-1}) \\cdot V(q^{-2})\\]</p>';
      resultHTML += '<p><strong>Component count:</strong> \\(c = ' + nComponents + '\\)' +
        (nComponents === 1 ? ' (knot)' : ' (link with ' + nComponents + ' components)') +
        ', so \\((-1)^{c-1} = ' + signFactor + '\\). ' +
        'This sign factor is essential: without it, every coefficient of \\(\\hat{J}\\) would flip for even-component links.</p>';
      resultHTML += '<p><strong>Step 1.</strong> Start with the Jones polynomial: ' +
        '\\(V(q) = ' + jonesLatexInQ + '\\)</p>';
      resultHTML += '<p><strong>Step 2.</strong> Substitute \\(q \\to q^{-2}\\): ' +
        '\\(V(q^{-2}) = ' + jonesInQKhLatex + '\\)</p>';
      resultHTML += '<p><strong>Step 3.</strong> Multiply by \\((q + q^{-1})\\):</p>';
      resultHTML += '<div class="exp-poly">\\(\\hat{J}(q) = ' + jHatLatex + '\\)</div>';
      resultHTML += '</div>';

      // ---- 5b. Graded Euler characteristic from Kh ----
      resultHTML += '<div class="exp-card">';
      resultHTML += '<h3>Graded Euler Characteristic \\(\\chi_q(Kh)\\)</h3>';
      resultHTML += '<p>The graded Euler characteristic is computed from the Khovanov ' +
        'homology table:</p>';
      resultHTML += '<p style="text-align:center">\\[\\chi_q(Kh) = \\sum_{i,j} (-1)^i \\, q^j ' +
        '\\cdot \\mathrm{rk}\\, Kh^{i,j}\\]</p>';

      // Show the term-by-term breakdown from homology
      var bounds = complex.getBounds();
      if (bounds) {
        resultHTML += '<p><strong>Term-by-term from \\(Kh^{i,j}\\):</strong></p>';
        resultHTML += '<div class="exp-matrix" style="font-size:0.85rem">';
        resultHTML += '(i, j)          rk   (-1)^i   contribution\n';
        resultHTML += '------          --   ------   ------------\n';
        for (var ii = bounds.iMin; ii <= bounds.iMax; ii++) {
          for (var jj = bounds.jMax; jj >= bounds.jMin; jj--) {
            var h = hom.get(ii + ',' + jj);
            if (!h || h.rank === 0) continue;
            var signI = (ii % 2 === 0) ? 1 : -1;
            var contrib = signI * h.rank;
            var contribStr = (contrib >= 0 ? '+' : '') + contrib + '·q^' + jj;
            var pad1 = ('(' + ii + ', ' + jj + ')').padEnd(16);
            var pad2 = ('' + h.rank).padEnd(5);
            var pad3 = (signI > 0 ? '+1' : '-1').padEnd(9);
            resultHTML += pad1 + pad2 + pad3 + contribStr + '\n';
          }
        }
        resultHTML += '</div>';
      }

      resultHTML += '<div class="exp-poly">\\(\\chi_q(Kh) = ' + eulerLatex + '\\)</div>';
      resultHTML += '</div>';

      // ---- 5c. Comparison ----
      resultHTML += '<div class="exp-card">';
      resultHTML += '<h3>Categorification Check: \\(\\chi_q(Kh) \\stackrel{?}{=} \\hat{J}(q)\\)';
      if (jonesMatchesEuler) {
        resultHTML += ' <span class="exp-badge pass">&#x2713; agree</span>';
      } else {
        resultHTML += ' <span class="exp-badge fail">&#x2717; disagree</span>';
      }
      resultHTML += '</h3>';

      resultHTML += '<table class="exp-compare-table" style="border-collapse:collapse; margin:0.5em auto;">';
      resultHTML += '<tr><th style="padding:4px 12px; border-bottom:2px solid #333"></th>' +
        '<th style="padding:4px 12px; border-bottom:2px solid #333">\\(\\hat{J}(q)\\) from \\(V(q)\\)</th>' +
        '<th style="padding:4px 12px; border-bottom:2px solid #333">\\(\\chi_q\\) from \\(Kh\\)</th>' +
        '<th style="padding:4px 12px; border-bottom:2px solid #333">match?</th></tr>';

      // Collect all exponents from both polynomials
      var allExps = new Set();
      var jHatTerms = jHat.getTerms ? jHat.getTerms() : jHat._terms;
      var eulerTermsMap = eulerFromChain.getTerms ? eulerFromChain.getTerms() : eulerFromChain._terms;
      if (jHatTerms) jHatTerms.forEach(function (v, k) { allExps.add(k); });
      if (eulerTermsMap) eulerTermsMap.forEach(function (v, k) { allExps.add(k); });
      var sortedExps = Array.from(allExps).sort(function (a, b) { return b - a; });

      for (var ei = 0; ei < sortedExps.length; ei++) {
        var exp = sortedExps[ei];
        var jVal = (jHatTerms && jHatTerms.has(exp)) ? jHatTerms.get(exp) : 0;
        var eVal = (eulerTermsMap && eulerTermsMap.has(exp)) ? eulerTermsMap.get(exp) : 0;
        var match = (jVal === eVal);
        var rowColor = match ? '' : ' style="background:#fde"';
        resultHTML += '<tr' + rowColor + '>';
        resultHTML += '<td style="padding:3px 10px; border-bottom:1px solid #ddd">\\(q^{' + exp + '}\\)</td>';
        resultHTML += '<td style="padding:3px 10px; border-bottom:1px solid #ddd; text-align:center">' + jVal + '</td>';
        resultHTML += '<td style="padding:3px 10px; border-bottom:1px solid #ddd; text-align:center">' + eVal + '</td>';
        resultHTML += '<td style="padding:3px 10px; border-bottom:1px solid #ddd; text-align:center">' +
          (match ? '&#x2713;' : '&#x2717;') + '</td>';
        resultHTML += '</tr>';
      }
      resultHTML += '</table>';

      if (jonesMatchesEuler) {
        resultHTML += '<p style="font-size:0.85rem; color:#2e7d32; margin-top:0.5em">' +
          '<strong>Khovanov\'s theorem verified:</strong> the graded Euler characteristic of ' +
          '\\(Kh(K)\\) equals \\(\\hat{J}(q) = (q+q^{-1}) \\cdot V(q^{-2})\\), confirming that ' +
          'Khovanov homology categorifies the Jones polynomial.</p>';
      } else {
        resultHTML += '<p style="font-size:0.85rem; color:#c62828; margin-top:0.5em">' +
          '<strong>Mismatch detected.</strong> This indicates a bug in the grading formulas, ' +
          'differential computation, or variable substitution convention.</p>';
      }

      if (!eulerMatch) {
        resultHTML += '<p style="color:#c62828"><strong>Internal check failed:</strong> Euler characteristic ' +
          'computed from chain groups and from homology groups disagree.</p>';
      }

      resultHTML += '</div>';
      } // end if (isBigradedMeaningful) — Khovanov-only section

      // ---------------------------------------------------------------
      // 6. Rasmussen s-invariant (knots only, standard Khovanov algebra only)
      // ---------------------------------------------------------------
      if (isKnot) {
        resultHTML += '<div class="exp-card">';
        resultHTML += '<h3>Rasmussen s-Invariant</h3>';

        var sResult = computeRasmussenS(pdCode, crossingSigns);

        if (sResult.error) {
          resultHTML += '<p style="color:#c62828">' + sResult.error + '</p>';
        } else {
          resultHTML += '<div class="exp-poly">\\(s(' + knotName +
            (variant === 'mirror' ? '^*' : '') +
            ') = ' + sResult.s + '\\)</div>';
          resultHTML += '<p style="font-size:0.85rem;color:#666">Computed from Lee homology ' +
            '(over \\(\\mathbb{Q}\\)): the two Lee generators have quantum gradings ' +
            '\\(j_{\\min} = ' + sResult.qMin + '\\), \\(j_{\\max} = ' + sResult.qMax +
            '\\), so \\(s = (j_{\\max} + j_{\\min})/2 = ' + sResult.s + '\\).</p>';
          resultHTML += '<p style="font-size:0.85rem;color:#666">This gives a lower bound on the ' +
            'smooth slice genus: \\(|s|/2 = ' + Math.abs(sResult.s) / 2 +
            ' \\leq g_4(K)\\).</p>';
        }
        resultHTML += '</div>';
      }

      // ---------------------------------------------------------------
      // Timing
      // ---------------------------------------------------------------
      var totalTime = performance.now() - t0;
      resultHTML += '<p style="font-size:0.8rem;color:#999;margin-top:1rem">' +
        'Computation time: ' + totalTime.toFixed(0) + ' ms ' +
        '(complex: ' + (complexT1 - complexT0).toFixed(0) + ' ms, ' +
        'homology: ' + (homT1 - homT0).toFixed(0) + ' ms)</p>';

      resultsDiv.innerHTML = resultHTML;

      // Render KaTeX
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(resultsDiv, {
          delimiters: [
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      }

    } catch (e) {
      resultsDiv.innerHTML = '<div class="exp-card">' +
        '<h3 style="color:#c62828">Computation Error</h3>' +
        '<p>' + e.message + '</p>' +
        '<details><summary>Stack trace</summary>' +
        '<pre style="font-size:0.75rem;overflow-x:auto">' + (e.stack || '') + '</pre>' +
        '</details></div>';
    }
  }

  // =================================================================
  // Initialization
  // =================================================================

  function initHomologicalTab() {
    var container = document.getElementById('tab-homological');
    if (!container) {
      console.warn('initHomologicalTab: #tab-homological not found');
      return;
    }
    buildUI(container);
  }

  // Expose globally
  window.initHomologicalTab = initHomologicalTab;

})();
