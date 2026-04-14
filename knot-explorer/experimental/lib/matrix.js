/**
 * Integer matrix operations library for computing homology.
 * Exposes IntMatrix on window for use as a browser <script>.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      var t = b;
      b = a % b;
      a = t;
    }
    return a;
  }

  /** Extended Euclidean algorithm: returns {g, x, y} with g = x*a + y*b. */
  function extgcd(a, b) {
    if (b === 0) return { g: a, x: 1, y: 0 };
    var r = extgcd(b, a % b);
    return { g: r.g, x: r.y, y: r.x - Math.floor(a / b) * r.y };
  }

  /** Modular arithmetic: return ((a % p) + p) % p */
  function mod(a, p) {
    return ((a % p) + p) % p;
  }

  /** Modular inverse of a mod p (p prime). Returns 0 if a === 0. */
  function modInverse(a, p) {
    a = mod(a, p);
    if (a === 0) return 0;
    // Fermat via extgcd
    var r = extgcd(a, p);
    return mod(r.x, p);
  }

  // ---------------------------------------------------------------------------
  // IntMatrix
  // ---------------------------------------------------------------------------

  /**
   * @param {number} rows
   * @param {number} cols
   * @param {Array} [data] - flat array of length rows*cols, or 2D array [row][col]
   */
  function IntMatrix(rows, cols, data) {
    this.rows = rows;
    this.cols = cols;

    if (!data || (Array.isArray(data) && data.length === 0)) {
      this._data = new Array(rows * cols);
      for (var i = 0; i < rows * cols; i++) this._data[i] = 0;
    } else if (Array.isArray(data[0])) {
      // 2D array
      this._data = new Array(rows * cols);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          this._data[r * cols + c] = data[r][c] | 0;
        }
      }
    } else {
      // flat array
      this._data = new Array(rows * cols);
      for (var k = 0; k < rows * cols; k++) {
        this._data[k] = data[k] | 0;
      }
    }
  }

  // ---- Element access -------------------------------------------------------

  IntMatrix.prototype.get = function (i, j) {
    return this._data[i * this.cols + j];
  };

  IntMatrix.prototype.set = function (i, j, val) {
    this._data[i * this.cols + j] = val | 0;
  };

  IntMatrix.prototype.clone = function () {
    var m = new IntMatrix(this.rows, this.cols);
    for (var k = 0; k < this._data.length; k++) m._data[k] = this._data[k];
    return m;
  };

  // ---- Static constructors --------------------------------------------------

  IntMatrix.identity = function (n) {
    var m = new IntMatrix(n, n);
    for (var i = 0; i < n; i++) m.set(i, i, 1);
    return m;
  };

  IntMatrix.zero = function (rows, cols) {
    return new IntMatrix(rows, cols);
  };

  // ---- Arithmetic -----------------------------------------------------------

  IntMatrix.multiply = function (A, B) {
    if (A.cols !== B.rows) throw new Error('Incompatible dimensions for multiply');
    var R = new IntMatrix(A.rows, B.cols);
    for (var i = 0; i < A.rows; i++) {
      for (var j = 0; j < B.cols; j++) {
        var s = 0;
        for (var k = 0; k < A.cols; k++) {
          s += A.get(i, k) * B.get(k, j);
        }
        R.set(i, j, s);
      }
    }
    return R;
  };

  IntMatrix.add = function (A, B) {
    if (A.rows !== B.rows || A.cols !== B.cols) throw new Error('Incompatible dimensions for add');
    var R = new IntMatrix(A.rows, A.cols);
    for (var k = 0; k < A._data.length; k++) R._data[k] = A._data[k] + B._data[k];
    return R;
  };

  // ---- Utility --------------------------------------------------------------

  IntMatrix.prototype.isZero = function () {
    for (var k = 0; k < this._data.length; k++) {
      if (this._data[k] !== 0) return false;
    }
    return true;
  };

  IntMatrix.prototype.toString = function () {
    var lines = [];
    for (var i = 0; i < this.rows; i++) {
      var row = [];
      for (var j = 0; j < this.cols; j++) row.push(this.get(i, j));
      lines.push('[ ' + row.join(', ') + ' ]');
    }
    return lines.join('\n');
  };

  // ---------------------------------------------------------------------------
  // Smith Normal Form
  // ---------------------------------------------------------------------------

  /**
   * Compute the Smith Normal Form of this matrix.
   * Returns {U, D, V, invariantFactors} where M = U * D * V,
   * U is invertible (rows x rows), V is invertible (cols x cols),
   * D is diagonal with d_1 | d_2 | ... | d_k.
   * invariantFactors contains the nonzero diagonal entries of D in order.
   */
  IntMatrix.prototype.smithNormalForm = function () {
    var m = this.rows;
    var n = this.cols;
    var D = this.clone();
    var U = IntMatrix.identity(m);
    var V = IntMatrix.identity(n);

    var pivots = Math.min(m, n);

    for (var s = 0; s < pivots; s++) {
      // Repeat until the sub-matrix from (s,s) is clean
      var changed = true;
      while (changed) {
        changed = false;

        // Find the smallest absolute nonzero entry in the sub-matrix
        var minVal = 0;
        var minR = -1;
        var minC = -1;
        for (var i = s; i < m; i++) {
          for (var j = s; j < n; j++) {
            var v = Math.abs(D.get(i, j));
            if (v !== 0 && (minVal === 0 || v < minVal)) {
              minVal = v;
              minR = i;
              minC = j;
            }
          }
        }

        if (minR === -1) break; // sub-matrix is all zeros

        // Swap to pivot position (s, s)
        if (minR !== s) {
          _swapRows(D, s, minR);
          _swapRows(U, s, minR);
        }
        if (minC !== s) {
          _swapCols(D, s, minC);
          _swapCols(V, s, minC);
        }

        // Make pivot positive
        if (D.get(s, s) < 0) {
          _scaleRow(D, s, -1);
          _scaleRow(U, s, -1);
        }

        var pivot = D.get(s, s);

        // Eliminate column s below pivot
        for (var i = s + 1; i < m; i++) {
          var entry = D.get(i, s);
          if (entry === 0) continue;
          if (entry % pivot === 0) {
            var q = entry / pivot;
            _addRowMultiple(D, i, s, -q);
            _addRowMultiple(U, i, s, -q);
          } else {
            // Use extended gcd
            var eg = extgcd(pivot, entry);
            var a = eg.x;
            var b = eg.y;
            var g = eg.g;
            // Row operation: [row_s, row_i] = [[a, b], [-entry/g, pivot/g]] * [row_s, row_i]
            _rowGcdOp(D, s, i, a, b, -(entry / g), pivot / g);
            _rowGcdOp(U, s, i, a, b, -(entry / g), pivot / g);
            changed = true;
            pivot = D.get(s, s);
            if (pivot < 0) {
              _scaleRow(D, s, -1);
              _scaleRow(U, s, -1);
              pivot = -pivot;
            }
          }
        }

        // Eliminate row s to the right of pivot
        for (var j = s + 1; j < n; j++) {
          var entry = D.get(s, j);
          if (entry === 0) continue;
          pivot = D.get(s, s);
          if (entry % pivot === 0) {
            var q = entry / pivot;
            _addColMultiple(D, j, s, -q);
            _addColMultiple(V, j, s, -q);
          } else {
            var eg = extgcd(pivot, entry);
            var a = eg.x;
            var b = eg.y;
            var g = eg.g;
            _colGcdOp(D, s, j, a, b, -(entry / g), pivot / g);
            _colGcdOp(V, s, j, a, b, -(entry / g), pivot / g);
            changed = true;
            pivot = D.get(s, s);
            if (pivot < 0) {
              _scaleRow(D, s, -1);
              _scaleRow(U, s, -1);
            }
          }
        }

        // Check if pivot divides everything in sub-matrix
        pivot = D.get(s, s);
        if (pivot !== 0) {
          var divides = true;
          for (var i = s + 1; i < m && divides; i++) {
            for (var j = s + 1; j < n && divides; j++) {
              if (D.get(i, j) % pivot !== 0) {
                divides = false;
                // Add row i to row s so that pivot position gets a non-divisor
                _addRowMultiple(D, s, i, 1);
                _addRowMultiple(U, s, i, 1);
                changed = true;
              }
            }
          }
        }
      }
    }

    // Make all diagonal entries non-negative
    for (var s = 0; s < pivots; s++) {
      if (D.get(s, s) < 0) {
        _scaleRow(D, s, -1);
        _scaleRow(U, s, -1);
      }
    }

    // Ensure divisibility: d_i | d_{i+1}
    var sorted = false;
    while (!sorted) {
      sorted = true;
      for (var i = 0; i < pivots - 1; i++) {
        var di = D.get(i, i);
        var di1 = D.get(i + 1, i + 1);
        if (di === 0 && di1 !== 0) {
          // swap so zeros go to end
          _swapRows(D, i, i + 1);
          _swapRows(U, i, i + 1);
          _swapCols(D, i, i + 1);
          _swapCols(V, i, i + 1);
          sorted = false;
        } else if (di !== 0 && di1 !== 0 && di1 % di !== 0) {
          var g = gcd(di, di1);
          var l = (di * di1) / g;
          // Recompute to enforce divisibility
          // Set D[i,i] = g, D[i+1,i+1] = l using row/col ops
          // Add col i+1 to col i, then use elimination
          _addColMultiple(D, i, i + 1, 1);
          _addColMultiple(V, i, i + 1, 1);
          // Now D[i, i] = di, D[i, i+1] might be nonzero
          // Re-run a mini SNF on the 2x2 block
          _fixDivisibility2x2(D, U, V, i);
          sorted = false;
        }
      }
    }

    // Collect invariant factors
    var factors = [];
    for (var i = 0; i < pivots; i++) {
      var d = D.get(i, i);
      if (d !== 0) factors.push(d);
    }

    return { U: U, D: D, V: V, invariantFactors: factors };
  };

  /** Fix divisibility for a 2x2 diagonal block starting at index s. */
  function _fixDivisibility2x2(D, U, V, s) {
    var maxIter = 200;
    var iter = 0;
    while (iter++ < maxIter) {
      // Eliminate off-diagonal in row s
      for (var j = s + 1; j < D.cols; j++) {
        var entry = D.get(s, j);
        if (entry === 0) continue;
        var pivot = D.get(s, s);
        if (pivot === 0) break;
        if (entry % pivot === 0) {
          var q = entry / pivot;
          _addColMultiple(D, j, s, -q);
          _addColMultiple(V, j, s, -q);
        } else {
          var eg = extgcd(pivot, entry);
          _colGcdOp(D, s, j, eg.x, eg.y, -(entry / eg.g), pivot / eg.g);
          _colGcdOp(V, s, j, eg.x, eg.y, -(entry / eg.g), pivot / eg.g);
        }
      }
      // Eliminate off-diagonal in col s
      for (var i = s + 1; i < D.rows; i++) {
        var entry = D.get(i, s);
        if (entry === 0) continue;
        var pivot = D.get(s, s);
        if (pivot === 0) break;
        if (entry % pivot === 0) {
          var q = entry / pivot;
          _addRowMultiple(D, i, s, -q);
          _addRowMultiple(U, i, s, -q);
        } else {
          var eg = extgcd(pivot, entry);
          _rowGcdOp(D, s, i, eg.x, eg.y, -(entry / eg.g), pivot / eg.g);
          _rowGcdOp(U, s, i, eg.x, eg.y, -(entry / eg.g), pivot / eg.g);
        }
      }
      // Check if block is now clean
      var clean = true;
      for (var j = s + 1; j < D.cols; j++) {
        if (D.get(s, j) !== 0) { clean = false; break; }
      }
      for (var i = s + 1; i < D.rows; i++) {
        if (D.get(i, s) !== 0) { clean = false; break; }
      }
      if (clean) {
        // Ensure positive
        if (D.get(s, s) < 0) { _scaleRow(D, s, -1); _scaleRow(U, s, -1); }
        if (s + 1 < Math.min(D.rows, D.cols) && D.get(s + 1, s + 1) < 0) {
          _scaleRow(D, s + 1, -1); _scaleRow(U, s + 1, -1);
        }
        break;
      }
    }
  }

  // ---- Row/column operations ------------------------------------------------

  function _swapRows(M, r1, r2) {
    for (var j = 0; j < M.cols; j++) {
      var t = M.get(r1, j);
      M.set(r1, j, M.get(r2, j));
      M.set(r2, j, t);
    }
  }

  function _swapCols(M, c1, c2) {
    for (var i = 0; i < M.rows; i++) {
      var t = M.get(i, c1);
      M.set(i, c1, M.get(i, c2));
      M.set(i, c2, t);
    }
  }

  function _scaleRow(M, r, s) {
    for (var j = 0; j < M.cols; j++) M.set(r, j, M.get(r, j) * s);
  }

  /** row_target += factor * row_source */
  function _addRowMultiple(M, target, source, factor) {
    for (var j = 0; j < M.cols; j++) {
      M.set(target, j, M.get(target, j) + factor * M.get(source, j));
    }
  }

  /** col_target += factor * col_source */
  function _addColMultiple(M, target, source, factor) {
    for (var i = 0; i < M.rows; i++) {
      M.set(i, target, M.get(i, target) + factor * M.get(i, source));
    }
  }

  /**
   * Combined row gcd operation on rows r1 and r2:
   *   new_r1 = a * r1 + b * r2
   *   new_r2 = c * r1 + d * r2
   */
  function _rowGcdOp(M, r1, r2, a, b, c, d) {
    for (var j = 0; j < M.cols; j++) {
      var v1 = M.get(r1, j);
      var v2 = M.get(r2, j);
      M.set(r1, j, a * v1 + b * v2);
      M.set(r2, j, c * v1 + d * v2);
    }
  }

  /**
   * Combined column gcd operation on columns c1 and c2:
   *   new_c1 = a * c1 + b * c2
   *   new_c2 = c * c1 + d * c2
   */
  function _colGcdOp(M, c1, c2, a, b, c, d) {
    for (var i = 0; i < M.rows; i++) {
      var v1 = M.get(i, c1);
      var v2 = M.get(i, c2);
      M.set(i, c1, a * v1 + b * v2);
      M.set(i, c2, c * v1 + d * v2);
    }
  }

  // ---------------------------------------------------------------------------
  // Mod-p operations (F_p)
  // ---------------------------------------------------------------------------

  /**
   * Rank of the matrix over F_p via Gaussian elimination.
   * @param {IntMatrix} matrix
   * @param {number} p - a prime
   * @returns {number}
   */
  IntMatrix.rankMod = function (matrix, p) {
    var m = matrix.rows;
    var n = matrix.cols;
    // Work on a copy reduced mod p
    var A = [];
    for (var i = 0; i < m; i++) {
      A[i] = [];
      for (var j = 0; j < n; j++) {
        A[i][j] = mod(matrix.get(i, j), p);
      }
    }

    var rank = 0;
    for (var col = 0; col < n && rank < m; col++) {
      // Find pivot
      var pivotRow = -1;
      for (var i = rank; i < m; i++) {
        if (A[i][col] !== 0) { pivotRow = i; break; }
      }
      if (pivotRow === -1) continue;

      // Swap
      var tmp = A[rank];
      A[rank] = A[pivotRow];
      A[pivotRow] = tmp;

      // Scale pivot row so pivot = 1
      var inv = modInverse(A[rank][col], p);
      for (var j = col; j < n; j++) A[rank][j] = mod(A[rank][j] * inv, p);

      // Eliminate
      for (var i = 0; i < m; i++) {
        if (i === rank || A[i][col] === 0) continue;
        var f = A[i][col];
        for (var j = col; j < n; j++) {
          A[i][j] = mod(A[i][j] - f * A[rank][j], p);
        }
      }
      rank++;
    }
    return rank;
  };

  /**
   * Kernel basis of the matrix over F_p.
   * Returns an IntMatrix whose rows are the basis vectors of ker(matrix) over F_p.
   * @param {IntMatrix} matrix
   * @param {number} p - a prime
   * @returns {IntMatrix}
   */
  IntMatrix.kernelMod = function (matrix, p) {
    var m = matrix.rows;
    var n = matrix.cols;

    // Reduce mod p
    var A = [];
    for (var i = 0; i < m; i++) {
      A[i] = [];
      for (var j = 0; j < n; j++) {
        A[i][j] = mod(matrix.get(i, j), p);
      }
    }

    // Gaussian elimination with column tracking
    var pivotCol = new Array(m);
    for (var i = 0; i < m; i++) pivotCol[i] = -1;
    var usedCols = {};
    var rank = 0;

    for (var col = 0; col < n && rank < m; col++) {
      var pivotRow = -1;
      for (var i = rank; i < m; i++) {
        if (A[i][col] !== 0) { pivotRow = i; break; }
      }
      if (pivotRow === -1) continue;

      // Swap
      var tmp = A[rank];
      A[rank] = A[pivotRow];
      A[pivotRow] = tmp;

      pivotCol[rank] = col;
      usedCols[col] = rank;

      // Scale
      var inv = modInverse(A[rank][col], p);
      for (var j = col; j < n; j++) A[rank][j] = mod(A[rank][j] * inv, p);

      // Eliminate
      for (var i = 0; i < m; i++) {
        if (i === rank || A[i][col] === 0) continue;
        var f = A[i][col];
        for (var j = col; j < n; j++) {
          A[i][j] = mod(A[i][j] - f * A[rank][j], p);
        }
      }
      rank++;
    }

    // Free columns are those not in usedCols
    var freeCols = [];
    for (var j = 0; j < n; j++) {
      if (!(j in usedCols)) freeCols.push(j);
    }

    var nullity = freeCols.length;
    if (nullity === 0) return new IntMatrix(0, n);

    var basis = new IntMatrix(nullity, n);
    for (var k = 0; k < nullity; k++) {
      var fc = freeCols[k];
      basis.set(k, fc, 1);
      for (var r = 0; r < rank; r++) {
        var pc = pivotCol[r];
        // x_{pc} = -A[r][fc]  (already reduced)
        basis.set(k, pc, mod(-A[r][fc], p));
      }
    }

    return basis;
  };

  // ---------------------------------------------------------------------------
  // Homology computation
  // ---------------------------------------------------------------------------

  /**
   * Compute the integer rank of a matrix (over Q, via SNF).
   */
  function _integerRank(M) {
    if (M.rows === 0 || M.cols === 0) return 0;
    if (M.isZero()) return 0;
    var snf = M.smithNormalForm();
    return snf.invariantFactors.length;
  }

  /**
   * Compute the homology H_i = ker(d_out) / im(d_in)
   * where d_in: C_{i-1} -> C_i and d_out: C_i -> C_{i+1}.
   *
   * d_in is a matrix with cols = dim(C_{i-1}), rows = dim(C_i)
   * d_out is a matrix with cols = dim(C_i), rows = dim(C_{i+1})
   *
   * Returns {rank: int, torsion: [int, ...]} where torsion entries > 1.
   *
   * @param {IntMatrix|null} d_in  - incoming differential (null or 0-row for H_0)
   * @param {IntMatrix|null} d_out - outgoing differential (null or 0-col for top H_n)
   * @returns {{rank: number, torsion: number[]}}
   */
  IntMatrix.homology = function (d_in, d_out) {
    // Determine dimension of C_i
    var dimC;
    if (d_out && d_out.cols > 0) {
      dimC = d_out.cols;
    } else if (d_in && d_in.rows > 0) {
      dimC = d_in.rows;
    } else {
      return { rank: 0, torsion: [] };
    }

    // Handle null/empty differentials
    var hasIn = d_in && d_in.rows > 0 && d_in.cols > 0 && !d_in.isZero();
    var hasOut = d_out && d_out.rows > 0 && d_out.cols > 0 && !d_out.isZero();

    if (!hasIn && !hasOut) {
      // H = C_i entirely free
      return { rank: dimC, torsion: [] };
    }

    if (!hasOut) {
      // ker(d_out) = all of C_i, so H = C_i / im(d_in)
      var snf = d_in.smithNormalForm();
      var factors = snf.invariantFactors;
      var rankImage = factors.length;
      var torsion = [];
      for (var i = 0; i < factors.length; i++) {
        if (factors[i] > 1) torsion.push(factors[i]);
      }
      return { rank: dimC - rankImage, torsion: torsion };
    }

    if (!hasIn) {
      // im(d_in) = 0, so H = ker(d_out)
      var rankOut = _integerRank(d_out);
      return { rank: dimC - rankOut, torsion: [] };
    }

    // General case: H = ker(d_out) / im(d_in)
    // Use the fact that d_out * d_in = 0 (chain complex property),
    // so im(d_in) is contained in ker(d_out).
    //
    // Strategy:
    // 1. Compute SNF of d_out to understand ker(d_out)
    // 2. Express im(d_in) in the kernel basis
    // 3. Compute SNF of the resulting matrix

    // Step 1: Find a basis for ker(d_out).
    // d_out has size (rows_out x dimC). Its kernel has dimension dimC - rank(d_out).
    // Use SNF: d_out = U * D * V, so d_out * x = 0 iff D * V * x = 0.
    // Let y = V * x. Then D * y = 0 means y_i = 0 for pivot rows.
    // So ker in y-coords: free in columns rank..dimC-1.
    // x = V^{-1} * y. But V is invertible over Z.
    // Actually, for SNF d_out = U * D * V, the kernel of d_out is spanned by
    // columns of V^{-1} corresponding to zero columns of D... but we need V^{-1}.
    //
    // Simpler approach: use the factorization directly.
    // Since M = U * D * V, M * x = 0 iff U * D * (V * x) = 0 iff D * (Vx) = 0.
    // So Vx must have zeros in positions 0..rank-1.
    // This means x = V^{-1} * e_j for j >= rank.
    //
    // We can get V^{-1} from the SNF computation. But our V is the right
    // transformation matrix such that D = U^{-1} * M * V^{-1}, i.e. M = U * D * V.
    // So M * V^{-1} = U * D, meaning columns of V^{-1} map to columns of U*D.
    // Thus ker(M) = {V^{-1} * e_j : j >= rank} = columns j >= rank of V^{-1}.
    //
    // To avoid computing V^{-1}, let's use a different approach:
    // Compute SNF of d_out^T. Then kernel of d_out can be found from the
    // left null space... This gets complicated.
    //
    // Practical approach: just compute things via rank.

    var rankOut = _integerRank(d_out);
    var rankIn = _integerRank(d_in);
    var dimKer = dimC - rankOut;

    // For torsion, compute SNF of the combined system.
    // Stack d_in and d_out: the torsion of H comes from the SNF of d_in
    // restricted to the kernel of d_out. Since d_out * d_in = 0, the image
    // of d_in lands in ker(d_out), so we can use SNF of d_in directly.
    var snfIn = d_in.smithNormalForm();
    var factors = snfIn.invariantFactors;
    var torsion = [];
    for (var i = 0; i < factors.length; i++) {
      if (factors[i] > 1) torsion.push(factors[i]);
    }
    var freeRank = dimKer - rankIn;

    return { rank: freeRank, torsion: torsion };
  };

  // ---------------------------------------------------------------------------
  // Self-test
  // ---------------------------------------------------------------------------

  IntMatrix._selfTest = function () {
    var pass = 0;
    var fail = 0;

    function assert(cond, msg) {
      if (cond) {
        pass++;
      } else {
        fail++;
        console.error('FAIL: ' + msg);
      }
    }

    function arrEq(a, b) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }

    // --- Basic construction ---
    var z = IntMatrix.zero(2, 3);
    assert(z.rows === 2 && z.cols === 3, 'zero dimensions');
    assert(z.isZero(), 'zero matrix is zero');

    var id = IntMatrix.identity(3);
    assert(id.get(0, 0) === 1 && id.get(1, 1) === 1 && id.get(0, 1) === 0,
      'identity entries');

    // 2D array constructor
    var m1 = new IntMatrix(2, 2, [[1, 2], [3, 4]]);
    assert(m1.get(0, 0) === 1 && m1.get(1, 1) === 4, '2D array constructor');

    // Flat array constructor
    var m2 = new IntMatrix(2, 2, [5, 6, 7, 8]);
    assert(m2.get(0, 1) === 6 && m2.get(1, 0) === 7, 'flat array constructor');

    // --- Clone ---
    var m1c = m1.clone();
    m1c.set(0, 0, 99);
    assert(m1.get(0, 0) === 1, 'clone is independent');

    // --- Multiply ---
    var prod = IntMatrix.multiply(m1, m2);
    // [[1,2],[3,4]] * [[5,6],[7,8]] = [[19,22],[43,50]]
    assert(prod.get(0, 0) === 19 && prod.get(0, 1) === 22, 'multiply row 0');
    assert(prod.get(1, 0) === 43 && prod.get(1, 1) === 50, 'multiply row 1');

    // --- Add ---
    var sum = IntMatrix.add(m1, m2);
    assert(sum.get(0, 0) === 6 && sum.get(1, 1) === 12, 'add');

    // --- Identity multiply ---
    var prodId = IntMatrix.multiply(m1, IntMatrix.identity(2));
    assert(prodId.get(0, 0) === 1 && prodId.get(1, 1) === 4, 'multiply by identity');

    // --- SNF: simple diagonal ---
    var diag = new IntMatrix(2, 2, [[2, 0], [0, 6]]);
    var snf1 = diag.smithNormalForm();
    assert(arrEq(snf1.invariantFactors, [2, 6]), 'SNF of diagonal');

    // --- SNF: 2x2 ---
    var a = new IntMatrix(2, 2, [[2, 4], [6, 8]]);
    var snf2 = a.smithNormalForm();
    // det = 2*8 - 4*6 = -8, so invariant factors should be [2, 4]
    // (since 2*4 = 8 = |det| and 2 | 4)
    assert(snf2.invariantFactors.length === 2, 'SNF 2x2 factor count');
    assert(snf2.invariantFactors[0] === 2 && snf2.invariantFactors[1] === 4,
      'SNF 2x2 factors: got [' + snf2.invariantFactors.join(',') + ']');
    // Verify M = U * D * V
    var check2 = IntMatrix.multiply(IntMatrix.multiply(snf2.U, snf2.D), snf2.V);
    assert(check2.get(0, 0) === a.get(0, 0) && check2.get(0, 1) === a.get(0, 1) &&
      check2.get(1, 0) === a.get(1, 0) && check2.get(1, 1) === a.get(1, 1),
      'SNF decomposition M = U*D*V');

    // --- SNF: rectangular ---
    var rect = new IntMatrix(2, 3, [[1, 2, 3], [4, 5, 6]]);
    var snf3 = rect.smithNormalForm();
    assert(snf3.invariantFactors.length > 0, 'SNF rectangular has factors');
    var check3 = IntMatrix.multiply(IntMatrix.multiply(snf3.U, snf3.D), snf3.V);
    var rectOk = true;
    for (var i = 0; i < 2; i++) {
      for (var j = 0; j < 3; j++) {
        if (check3.get(i, j) !== rect.get(i, j)) rectOk = false;
      }
    }
    assert(rectOk, 'SNF rectangular decomposition');

    // --- SNF: zero matrix ---
    var zeroM = IntMatrix.zero(2, 2);
    var snf4 = zeroM.smithNormalForm();
    assert(snf4.invariantFactors.length === 0, 'SNF of zero matrix');

    // --- SNF: 1x1 ---
    var one = new IntMatrix(1, 1, [7]);
    var snf5 = one.smithNormalForm();
    assert(snf5.invariantFactors.length === 1 && snf5.invariantFactors[0] === 7,
      'SNF 1x1');

    // --- rankMod ---
    var modM = new IntMatrix(2, 3, [[1, 0, 2], [0, 1, 3]]);
    assert(IntMatrix.rankMod(modM, 5) === 2, 'rankMod full rank');
    var modM2 = new IntMatrix(2, 2, [[2, 4], [1, 2]]);
    assert(IntMatrix.rankMod(modM2, 7) === 1, 'rankMod rank 1');

    // --- kernelMod ---
    var kerM = new IntMatrix(2, 3, [[1, 0, 2], [0, 1, 3]]);
    var ker = IntMatrix.kernelMod(kerM, 5);
    assert(ker.rows === 1, 'kernelMod dimension');
    // Verify kernel vector is in kernel
    if (ker.rows > 0) {
      for (var i = 0; i < kerM.rows; i++) {
        var dot = 0;
        for (var j = 0; j < kerM.cols; j++) {
          dot += kerM.get(i, j) * ker.get(0, j);
        }
        assert(mod(dot, 5) === 0, 'kernel vector in kernel, row ' + i);
      }
    }

    // --- Homology: trivial cases ---
    // H of 0 -> Z^2 -> 0: should be rank 2, no torsion
    var h1 = IntMatrix.homology(null, IntMatrix.zero(0, 2));
    assert(h1.rank === 2 && h1.torsion.length === 0, 'homology Z^2 free');

    // H of Z -> Z -> 0 with d_in = [2] (map is *2)
    // ker(d_out) = Z (all of it), im(d_in) = 2Z
    // H = Z / 2Z = Z_2
    var din1 = new IntMatrix(1, 1, [2]);
    var h2 = IntMatrix.homology(din1, IntMatrix.zero(0, 1));
    assert(h2.rank === 0, 'homology Z/2Z rank');
    assert(h2.torsion.length === 1 && h2.torsion[0] === 2, 'homology Z/2Z torsion');

    // H with d_out killing one dimension
    // d_out: Z^2 -> Z, d_out = [1, 0], d_in: Z -> Z^2, d_in = [[0],[1]]
    // ker(d_out) = span{(0,1)}, im(d_in) = span{(0,1)}
    // H = 0
    var dout3 = new IntMatrix(1, 2, [1, 0]);
    var din3 = new IntMatrix(2, 1, [[0], [1]]);
    var h3 = IntMatrix.homology(din3, dout3);
    assert(h3.rank === 0 && h3.torsion.length === 0, 'homology trivial');

    // --- toString ---
    var ts = new IntMatrix(1, 2, [3, 4]);
    assert(ts.toString() === '[ 3, 4 ]', 'toString');

    console.log('IntMatrix self-test: ' + pass + ' passed, ' + fail + ' failed.');
    return fail === 0;
  };

  // ---------------------------------------------------------------------------
  // Expose globally
  // ---------------------------------------------------------------------------

  window.IntMatrix = IntMatrix;

})();
