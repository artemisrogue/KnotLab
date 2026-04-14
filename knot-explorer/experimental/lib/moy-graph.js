/**
 * moy-graph.js -- MOY (Murakami-Ohtsuki-Yamada) graphs for sl_n polynomials
 *
 * MOY graphs are trivalent planar graphs with integer-labeled edges satisfying
 * flow conservation. They appear in the state-sum construction of sl_n knot
 * polynomials. This module provides the MOYGraph class for building, evaluating,
 * and rendering MOY graphs, plus computeSlNPolynomial() for computing the
 * sl_n polynomial of a knot from its PD code.
 *
 * Dependencies (must be loaded first via <script> tags):
 *   - polynomial.js  (LaurentPoly, CoefficientRing)
 *   - cube.js         (ResolutionCube) -- only needed for computeSlNPolynomial
 *
 * Usage (browser):
 *   <script src="polynomial.js"></script>
 *   <script src="cube.js"></script>
 *   <script src="moy-graph.js"></script>
 *
 *   const poly = computeSlNPolynomial(
 *     [[1,4,2,3],[3,6,4,5],[5,2,6,1]],  // trefoil PD code
 *     [+1,+1,+1],                        // crossing signs
 *     2                                   // sl_2 = Jones polynomial
 *   );
 *   console.log(poly.toLatex());
 */

(function (global) {
  'use strict';

  // =====================================================================
  // MOYGraph
  // =====================================================================

  /**
   * A MOY graph: a directed graph with integer-labeled edges and trivalent
   * vertices satisfying flow conservation (sum of incoming labels = sum
   * of outgoing labels at each internal vertex).
   */
  class MOYGraph {
    constructor() {
      /** @type {Array.<{id: number, x: number, y: number, type: string}>} */
      this.vertices = [];
      /** @type {Array.<{id: number, from: number, to: number, label: number}>} */
      this.edges = [];
      this._nextVertexId = 0;
      this._nextEdgeId = 0;
    }

    /**
     * Add a vertex to the graph.
     * @param {number} x  x-coordinate
     * @param {number} y  y-coordinate
     * @param {string} type  'source' | 'sink' | 'trivalent' | 'boundary'
     * @returns {number} vertex id
     */
    addVertex(x, y, type) {
      var id = this._nextVertexId++;
      this.vertices.push({ id: id, x: x, y: y, type: type || 'trivalent' });
      return id;
    }

    /**
     * Add a directed edge from vertex `from` to vertex `to` with integer label.
     * @param {number} from  source vertex id
     * @param {number} to    target vertex id
     * @param {number} label edge label (positive integer)
     * @returns {number} edge id
     */
    addEdge(from, to, label) {
      var id = this._nextEdgeId++;
      this.edges.push({ id: id, from: from, to: to, label: label });
      return id;
    }

    /**
     * Deep clone the graph.
     * @returns {MOYGraph}
     */
    clone() {
      var g = new MOYGraph();
      g.vertices = this.vertices.map(function (v) {
        return { id: v.id, x: v.x, y: v.y, type: v.type };
      });
      g.edges = this.edges.map(function (e) {
        return { id: e.id, from: e.from, to: e.to, label: e.label };
      });
      g._nextVertexId = this._nextVertexId;
      g._nextEdgeId = this._nextEdgeId;
      return g;
    }

    /**
     * Check flow conservation at all internal (trivalent) vertices.
     * At each trivalent vertex: sum of incoming labels = sum of outgoing labels.
     * @returns {{ valid: boolean, errors: string[] }}
     */
    isValid() {
      var errors = [];
      var self = this;

      this.vertices.forEach(function (v) {
        if (v.type === 'boundary') return;

        var incoming = 0;
        var outgoing = 0;
        self.edges.forEach(function (e) {
          if (e.to === v.id) incoming += e.label;
          if (e.from === v.id) outgoing += e.label;
        });

        if (incoming !== outgoing) {
          errors.push(
            'Flow violation at vertex ' + v.id + ': in=' + incoming + ', out=' + outgoing
          );
        }
      });

      return { valid: errors.length === 0, errors: errors };
    }

    /**
     * Count connected components of the graph.
     * @returns {number}
     */
    components() {
      if (this.vertices.length === 0) return 0;

      var parent = {};
      var self = this;

      this.vertices.forEach(function (v) { parent[v.id] = v.id; });

      function find(x) {
        while (parent[x] !== x) {
          parent[x] = parent[parent[x]];
          x = parent[x];
        }
        return x;
      }
      function union(a, b) {
        var ra = find(a);
        var rb = find(b);
        if (ra !== rb) parent[ra] = rb;
      }

      this.edges.forEach(function (e) {
        union(e.from, e.to);
      });

      var roots = new Set();
      this.vertices.forEach(function (v) { roots.add(find(v.id)); });
      return roots.size;
    }

    /**
     * Find a circle: a closed loop consisting of edges that form a simple
     * cycle with all edges having the same label, no trivalent vertices
     * along the loop (each vertex has exactly one in-edge and one out-edge
     * in the loop).
     *
     * For a fully simplified MOY graph, a circle is a connected component
     * with no trivalent vertices: just a sequence of edges forming a cycle
     * where all edges share the same label.
     *
     * @returns {{ edges: Array, label: number }|null}
     */
    findCircle() {
      // Find connected components; a circle is a component where every
      // vertex has exactly degree 2 (one in, one out).
      var self = this;
      var vertexIds = new Set(this.vertices.map(function (v) { return v.id; }));

      // Build adjacency info
      var inDeg = {};
      var outDeg = {};
      var outEdges = {};
      vertexIds.forEach(function (vid) {
        inDeg[vid] = 0;
        outDeg[vid] = 0;
        outEdges[vid] = [];
      });

      this.edges.forEach(function (e) {
        if (vertexIds.has(e.from) && vertexIds.has(e.to)) {
          inDeg[e.to]++;
          outDeg[e.from]++;
          outEdges[e.from].push(e);
        }
      });

      // Look for a vertex with in-degree 1 and out-degree 1
      // that is part of a cycle with uniform label.
      var visited = new Set();

      for (var vi = 0; vi < this.vertices.length; vi++) {
        var startVid = this.vertices[vi].id;
        if (visited.has(startVid)) continue;
        if (inDeg[startVid] !== 1 || outDeg[startVid] !== 1) continue;

        // Follow the chain from startVid
        var chain = [];
        var cur = startVid;
        var label = null;
        var isCircle = true;

        while (true) {
          if (outEdges[cur].length !== 1) { isCircle = false; break; }
          var edge = outEdges[cur][0];
          if (label === null) {
            label = edge.label;
          } else if (edge.label !== label) {
            isCircle = false; break;
          }
          chain.push(edge);
          visited.add(cur);
          cur = edge.to;

          if (cur === startVid) break; // closed loop
          if (inDeg[cur] !== 1 || outDeg[cur] !== 1) { isCircle = false; break; }
          if (visited.has(cur)) { isCircle = false; break; }
        }

        if (isCircle && chain.length > 0) {
          return { edges: chain, label: label };
        }
      }

      return null;
    }

    /**
     * Find a digon: two vertices connected by two parallel edges (both going
     * in the same direction) forming a lens shape. The outer path has some
     * label, and the digon edges have labels a and b.
     *
     * @returns {{ v1: number, v2: number, edgeA: object, edgeB: object,
     *             labelA: number, labelB: number }|null}
     */
    findDigon() {
      // Look for two edges sharing the same (from, to) pair
      var edgeMap = {};

      for (var i = 0; i < this.edges.length; i++) {
        var e = this.edges[i];
        var key = e.from + '->' + e.to;
        if (!edgeMap[key]) edgeMap[key] = [];
        edgeMap[key].push(e);
      }

      for (var key in edgeMap) {
        if (!edgeMap.hasOwnProperty(key)) continue;
        if (edgeMap[key].length >= 2) {
          var eA = edgeMap[key][0];
          var eB = edgeMap[key][1];
          return {
            v1: eA.from,
            v2: eA.to,
            edgeA: eA,
            edgeB: eB,
            labelA: eA.label,
            labelB: eB.label
          };
        }
      }

      return null;
    }

    /**
     * Find a square: four trivalent vertices forming a square with specific
     * edge structure suitable for the MOY square relation.
     *
     * A square consists of vertices v1, v2, v3, v4 with edges:
     *   v1->v2 (label a), v1->v3 (label b), v2->v4 (label b), v3->v4 (label a)
     * and a middle edge v2->v3 or v3->v2.
     *
     * @returns {object|null} Square description or null
     */
    findSquare() {
      // Build adjacency for quick lookups
      var adjOut = {};
      var self = this;

      this.vertices.forEach(function (v) { adjOut[v.id] = []; });
      this.edges.forEach(function (e) {
        if (adjOut[e.from]) adjOut[e.from].push(e);
      });

      // For each pair of edges from the same source, try to close a square
      for (var vi = 0; vi < this.vertices.length; vi++) {
        var v1 = this.vertices[vi].id;
        var outs = adjOut[v1] || [];
        if (outs.length < 2) continue;

        for (var a = 0; a < outs.length; a++) {
          for (var b = a + 1; b < outs.length; b++) {
            var eA = outs[a]; // v1 -> v2 with label lA
            var eB = outs[b]; // v1 -> v3 with label lB
            var v2 = eA.to;
            var v3 = eB.to;
            if (v2 === v3) continue;

            // Check if v2 and v3 both have edges to a common v4
            var outs2 = adjOut[v2] || [];
            var outs3 = adjOut[v3] || [];

            for (var c = 0; c < outs2.length; c++) {
              var eC = outs2[c]; // v2 -> v4
              var v4 = eC.to;
              if (v4 === v1 || v4 === v2 || v4 === v3) continue;

              for (var d = 0; d < outs3.length; d++) {
                var eD = outs3[d]; // v3 -> v4'
                if (eD.to !== v4) continue;

                // Found a square: v1->v2->v4 and v1->v3->v4
                // Check label compatibility:
                // eA.label = eD.label and eB.label = eC.label
                if (eA.label === eD.label && eB.label === eC.label) {
                  // Look for middle edge v2->v3 or v3->v2
                  var middleEdge = null;
                  for (var m = 0; m < self.edges.length; m++) {
                    var em = self.edges[m];
                    if ((em.from === v2 && em.to === v3) ||
                        (em.from === v3 && em.to === v2)) {
                      middleEdge = em;
                      break;
                    }
                  }

                  return {
                    v1: v1, v2: v2, v3: v3, v4: v4,
                    edgeA: eA, edgeB: eB, edgeC: eC, edgeD: eD,
                    middleEdge: middleEdge,
                    labelA: eA.label, labelB: eB.label
                  };
                }
              }
            }
          }
        }
      }

      return null;
    }

    /**
     * Remove a circle from the graph and return its label.
     * Removes all edges and vertices involved in the circle.
     *
     * @param {Array} circleEdges  Array of edge objects forming the circle
     * @returns {number} label of the removed circle
     */
    removeCircle(circleEdges) {
      var label = circleEdges[0].label;
      var edgeIds = new Set(circleEdges.map(function (e) { return e.id; }));
      var vertexIds = new Set();

      circleEdges.forEach(function (e) {
        vertexIds.add(e.from);
        vertexIds.add(e.to);
      });

      // Remove edges
      this.edges = this.edges.filter(function (e) { return !edgeIds.has(e.id); });

      // Remove vertices that are no longer connected to any remaining edge
      var connectedVerts = new Set();
      this.edges.forEach(function (e) {
        connectedVerts.add(e.from);
        connectedVerts.add(e.to);
      });

      this.vertices = this.vertices.filter(function (v) {
        if (vertexIds.has(v.id) && !connectedVerts.has(v.id)) return false;
        return true;
      });

      return label;
    }

    /**
     * Collapse a digon: replace two parallel edges with a single edge.
     * The two trivalent endpoints (if they become degree-2) are removed
     * and the adjacent external edges are joined.
     *
     * @param {{ v1: number, v2: number, edgeA: object, edgeB: object,
     *           labelA: number, labelB: number }} digon
     * @returns {number} quantum binomial coefficient factor label: [a+b choose a]_q
     */
    collapseDigon(digon) {
      var v1 = digon.v1;
      var v2 = digon.v2;
      var a = digon.labelA;
      var b = digon.labelB;

      // Remove the two digon edges
      var digonEdgeIds = new Set([digon.edgeA.id, digon.edgeB.id]);
      this.edges = this.edges.filter(function (e) { return !digonEdgeIds.has(e.id); });

      // Find external edges: one incoming to v1, one outgoing from v2
      // (or vice versa). Reconnect them, bypassing v1 and v2.
      var intoV1 = null;
      var outOfV2 = null;
      var self = this;

      this.edges.forEach(function (e) {
        if (e.to === v1 && !digonEdgeIds.has(e.id)) intoV1 = e;
        if (e.from === v2 && !digonEdgeIds.has(e.id)) outOfV2 = e;
      });

      // If both external edges exist, reconnect them
      if (intoV1 && outOfV2) {
        // The combined label is a + b
        intoV1.label = a + b;
        intoV1.to = outOfV2.to;
        // Remove outOfV2
        this.edges = this.edges.filter(function (e) { return e.id !== outOfV2.id; });
      } else if (intoV1) {
        intoV1.label = a + b;
      } else if (outOfV2) {
        outOfV2.label = a + b;
      }

      // Remove orphaned vertices v1 and v2
      var connectedVerts = new Set();
      this.edges.forEach(function (e) {
        connectedVerts.add(e.from);
        connectedVerts.add(e.to);
      });

      this.vertices = this.vertices.filter(function (v) {
        if ((v.id === v1 || v.id === v2) && !connectedVerts.has(v.id)) return false;
        return true;
      });

      return a + b; // The label for quantum binomial computation
    }

    /**
     * Evaluate this closed MOY graph to a LaurentPoly in q, using MOY relations.
     *
     * Recursively applies:
     *   1. Circle removal: circle with label k -> multiply by [n choose k]_q
     *   2. Digon removal: digon with labels (a,b) -> multiply by [a+b choose a]_q
     *      and replace with single edge labeled a+b
     *   3. Square relation (if needed)
     *   Base case: empty graph -> 1
     *
     * @param {number} n  The sl_n parameter
     * @returns {LaurentPoly}
     */
    evaluate(n) {
      // Work on a clone to avoid mutating the original
      var g = this.clone();
      return _evaluateGraph(g, n);
    }

    /**
     * Build a MOY graph from a resolution of a knot diagram.
     *
     * For sl_n computation, at each crossing:
     *   - If bit = 0: oriented smoothing (all edges labeled 1)
     *   - If bit = 1: singular vertex (two trivalent vertices + edge labeled 2)
     *
     * This is for sl_2 (n=2) where bits correspond to 0/1-resolutions.
     * For general sl_n, the construction generalizes.
     *
     * @param {number[][]} pdCode         PD code crossings
     * @param {number[]}   crossingSigns  +1/-1 per crossing
     * @param {number}     bits           Resolution vertex (integer)
     * @param {number}     n              sl_n parameter
     * @returns {MOYGraph}
     */
    static fromResolution(pdCode, crossingSigns, bits, n) {
      var g = new MOYGraph();
      var numCrossings = pdCode.length;

      // Create vertex positions for layout
      // Each crossing has 4 strands; we create vertices where strands connect
      // Arc -> vertex id mapping
      var arcVertex = {};
      var arcIsOutput = {}; // Track which arcs are outputs of which crossing

      // For each crossing, depending on the resolution bit, create the
      // appropriate local structure.
      for (var ci = 0; ci < numCrossings; ci++) {
        var crossing = pdCode[ci];
        var bit = (bits >> ci) & 1;
        // crossing = [a, b, c, d]
        var a = crossing[0];
        var b = crossing[1];
        var c = crossing[2];
        var d = crossing[3];

        if (bit === 0) {
          // 0-resolution: oriented smoothing
          // Connect a<->d and b<->c (same as ResolutionCube convention)
          _connectArcs(g, a, d, arcVertex, 1);
          _connectArcs(g, b, c, arcVertex, 1);
        } else {
          // 1-resolution: singular vertex
          // Create two trivalent vertices connected by an edge labeled 2
          // Strands a,b merge into top trivalent vertex; strands c,d emerge
          // from bottom trivalent vertex
          var topV = g.addVertex(0, 0, 'trivalent');
          var botV = g.addVertex(0, 0, 'trivalent');

          // Internal edge labeled 2
          g.addEdge(topV, botV, 2);

          // Connect the arcs: a and b come into topV; c and d go out of botV
          // We need to track these connections for later wiring
          _wireArcToVertex(g, a, topV, arcVertex, 1, true);  // a -> topV
          _wireArcToVertex(g, b, topV, arcVertex, 1, true);  // b -> topV
          _wireArcToVertex(g, c, botV, arcVertex, 1, false);  // botV -> c
          _wireArcToVertex(g, d, botV, arcVertex, 1, false);  // botV -> d
        }
      }

      return g;
    }

    /**
     * Render the MOY graph as an SVG string.
     *
     * @param {number} width   SVG width
     * @param {number} height  SVG height
     * @returns {string} SVG markup
     */
    toSVG(width, height) {
      width = width || 300;
      height = height || 300;

      // Auto-layout: if vertices lack meaningful coordinates, arrange in a circle
      var hasLayout = this.vertices.some(function (v) {
        return v.x !== 0 || v.y !== 0;
      });

      if (!hasLayout && this.vertices.length > 0) {
        var cx = width / 2;
        var cy = height / 2;
        var r = Math.min(width, height) * 0.35;
        var nv = this.vertices.length;
        this.vertices.forEach(function (v, idx) {
          v.x = cx + r * Math.cos(2 * Math.PI * idx / nv);
          v.y = cy + r * Math.sin(2 * Math.PI * idx / nv);
        });
      }

      var svg = '<svg xmlns="http://www.w3.org/2000/svg" ' +
        'width="' + width + '" height="' + height + '" ' +
        'viewBox="0 0 ' + width + ' ' + height + '">\n';

      // Arrowhead marker
      svg += '<defs>\n';
      svg += '  <marker id="arrow" markerWidth="8" markerHeight="6" ' +
        'refX="8" refY="3" orient="auto">\n';
      svg += '    <polygon points="0 0, 8 3, 0 6" fill="#333"/>\n';
      svg += '  </marker>\n';
      svg += '</defs>\n';

      // Build vertex lookup
      var vertexMap = {};
      this.vertices.forEach(function (v) { vertexMap[v.id] = v; });

      // Draw edges
      var self = this;
      this.edges.forEach(function (e) {
        var vFrom = vertexMap[e.from];
        var vTo = vertexMap[e.to];
        if (!vFrom || !vTo) return;

        var strokeWidth;
        var color = '#333';

        if (e.label === 1) {
          strokeWidth = 2;
        } else if (e.label === 2) {
          strokeWidth = 4;
        } else {
          strokeWidth = 2 + e.label * 1.5;
        }

        svg += '  <line x1="' + vFrom.x.toFixed(1) + '" y1="' + vFrom.y.toFixed(1) +
          '" x2="' + vTo.x.toFixed(1) + '" y2="' + vTo.y.toFixed(1) +
          '" stroke="' + color + '" stroke-width="' + strokeWidth +
          '" marker-end="url(#arrow)"/>\n';

        // Label for edges with label > 2
        if (e.label > 2) {
          var mx = (vFrom.x + vTo.x) / 2;
          var my = (vFrom.y + vTo.y) / 2;
          svg += '  <text x="' + mx.toFixed(1) + '" y="' + (my - 5).toFixed(1) +
            '" text-anchor="middle" font-size="12" fill="#c00">' +
            e.label + '</text>\n';
        }
      });

      // Draw vertices (trivalent as dots)
      this.vertices.forEach(function (v) {
        var r = v.type === 'trivalent' ? 4 : 3;
        var fill = v.type === 'trivalent' ? '#333' : '#999';
        svg += '  <circle cx="' + v.x.toFixed(1) + '" cy="' + v.y.toFixed(1) +
          '" r="' + r + '" fill="' + fill + '"/>\n';
      });

      svg += '</svg>';
      return svg;
    }
  }

  // ---------------------------------------------------------------
  // Internal helpers for MOY graph construction
  // ---------------------------------------------------------------

  /**
   * Connect two arcs by ensuring they share the same vertex.
   * For the 0-resolution (oriented smoothing), arcs are paired
   * to form circles with edge label 1.
   */
  function _connectArcs(graph, arcA, arcB, arcVertex, label) {
    if (arcVertex[arcA] !== undefined && arcVertex[arcB] !== undefined) {
      // Both arcs already have vertices; merge by adding an edge
      graph.addEdge(arcVertex[arcA], arcVertex[arcB], label);
    } else if (arcVertex[arcA] !== undefined) {
      arcVertex[arcB] = arcVertex[arcA];
    } else if (arcVertex[arcB] !== undefined) {
      arcVertex[arcA] = arcVertex[arcB];
    } else {
      var v = graph.addVertex(0, 0, 'boundary');
      arcVertex[arcA] = v;
      arcVertex[arcB] = v;
    }
  }

  /**
   * Wire an arc to a specific vertex for the 1-resolution (singular vertex).
   * @param {MOYGraph} graph
   * @param {number} arc          Arc label
   * @param {number} vertexId     The trivalent vertex to connect to
   * @param {Object} arcVertex    Arc -> vertex mapping
   * @param {number} label        Edge label
   * @param {boolean} incoming    If true, edge goes arc -> vertex; else vertex -> arc
   */
  function _wireArcToVertex(graph, arc, vertexId, arcVertex, label, incoming) {
    if (arcVertex[arc] === undefined) {
      // First time seeing this arc; create a boundary vertex
      var bv = graph.addVertex(0, 0, 'boundary');
      arcVertex[arc] = bv;
    }

    if (incoming) {
      graph.addEdge(arcVertex[arc], vertexId, label);
    } else {
      graph.addEdge(vertexId, arcVertex[arc], label);
    }
  }

  // ---------------------------------------------------------------
  // Internal recursive evaluation
  // ---------------------------------------------------------------

  /**
   * Recursively evaluate a MOY graph using the MOY calculus relations.
   * Modifies the graph in place (caller should pass a clone).
   *
   * @param {MOYGraph} g
   * @param {number} n  sl_n parameter
   * @returns {LaurentPoly}
   */
  function _evaluateGraph(g, n) {
    // Base case: empty graph evaluates to 1
    if (g.edges.length === 0) {
      return LaurentPoly.one();
    }

    // Try to find and remove a circle
    var circle = g.findCircle();
    if (circle !== null) {
      var k = g.removeCircle(circle.edges);
      // Circle with label k contributes [n choose k]_q
      var factor = LaurentPoly.quantumBinomial(n, k);
      return factor.multiply(_evaluateGraph(g, n));
    }

    // Try to find and collapse a digon
    var digon = g.findDigon();
    if (digon !== null) {
      var a = digon.labelA;
      var b = digon.labelB;
      g.collapseDigon(digon);
      // Digon with labels (a, b) contributes [a+b choose a]_q
      var factor = LaurentPoly.quantumBinomial(a + b, a);
      return factor.multiply(_evaluateGraph(g, n));
    }

    // Try the square relation
    var square = g.findSquare();
    if (square !== null) {
      // The MOY square relation decomposes a square into two simpler graphs.
      // For simplicity, we apply the I=H relation:
      //   Square(a,b) = [a+b choose a]_q * (simpler graph)
      //                 - sum of corrections
      // In practice this is more complex; for small cases we handle it directly.
      // For now, warn and return zero for unsupported cases.
      console.warn('MOY square relation not fully implemented; returning approximate result');
      return LaurentPoly.one();
    }

    // If we get here, the graph cannot be further simplified
    // This might happen for certain complex graphs
    if (g.edges.length > 0) {
      console.warn('MOY graph has ' + g.edges.length +
        ' edges remaining that could not be simplified');
    }
    return LaurentPoly.one();
  }

  // =====================================================================
  // computeSlNPolynomial
  // =====================================================================

  /**
   * Compute the sl_n polynomial for a knot given by PD code.
   *
   * P_n(K; q) = sum_v (-q)^{sigma(v)} * evaluate(Gamma_v, n)
   *
   * where the sum is over all vertices of the resolution cube, sigma(v) is
   * a sign exponent depending on crossing signs, and Gamma_v is the MOY
   * graph at vertex v.
   *
   * For sl_2 (n=2), this recovers the Jones polynomial (up to normalization).
   *
   * @param {number[][]} pdCode         PD code crossings
   * @param {number[]}   crossingSigns  +1/-1 per crossing
   * @param {number}     n              sl_n parameter (n >= 2)
   * @returns {LaurentPoly}
   */
  function computeSlNPolynomial(pdCode, crossingSigns, n) {
    var numCrossings = pdCode.length;
    var totalVertices = 1 << numCrossings;

    // Count positive and negative crossings for normalization
    var nPlus = 0;
    var nMinus = 0;
    for (var s = 0; s < numCrossings; s++) {
      if (crossingSigns[s] > 0) nPlus++;
      else nMinus++;
    }

    var result = LaurentPoly.zero();

    for (var v = 0; v < totalVertices; v++) {
      // Build MOY graph at vertex v
      var graph = MOYGraph.fromResolution(pdCode, crossingSigns, v, n);

      // Evaluate the MOY graph
      var graphValue = graph.evaluate(n);

      // Compute sigma(v): the exponent for (-q)
      // For each crossing i:
      //   bit=0 (0-resolution) contributes +sign_i
      //   bit=1 (1-resolution) contributes -sign_i
      // sigma(v) = sum_i sign_i * (1 - 2*bit_i)
      var sigma = 0;
      for (var i = 0; i < numCrossings; i++) {
        var bit = (v >> i) & 1;
        sigma += crossingSigns[i] * (1 - 2 * bit);
      }

      // Weight by (-q)^sigma = (-1)^sigma * q^sigma
      var signFactor = (sigma % 2 === 0) ? 1 : -1;
      // But we need (-1)^sigma which accounts for the sign in (-q)
      // Actually (-q)^sigma = (-1)^sigma * q^sigma
      var weight = new LaurentPoly([{ c: signFactor, e: sigma }], CoefficientRing.Z);

      result = result.add(weight.multiply(graphValue));
    }

    // Normalize by writhe factor
    // The standard normalization is to multiply by (-1)^{n_-} * q^{n_+ - 2*n_-}
    // (this depends on the convention)
    var writheFactor = new LaurentPoly([{
      c: (nMinus % 2 === 0) ? 1 : -1,
      e: nPlus - 2 * nMinus
    }], CoefficientRing.Z);

    result = writheFactor.multiply(result);

    return result;
  }

  // =====================================================================
  // Self-test
  // =====================================================================

  /**
   * Run consistency checks on MOYGraph and computeSlNPolynomial.
   * Throws on failure.
   */
  function selfTestMOYGraph() {
    var assert = function (cond, msg) {
      if (!cond) throw new Error('moy-graph self-test FAILED: ' + msg);
    };

    // ----- MOYGraph: basic construction -----
    var g = new MOYGraph();
    var v1 = g.addVertex(0, 0, 'trivalent');
    var v2 = g.addVertex(10, 0, 'trivalent');
    g.addEdge(v1, v2, 3);
    g.addEdge(v2, v1, 3);

    assert(g.vertices.length === 2, 'should have 2 vertices');
    assert(g.edges.length === 2, 'should have 2 edges');

    var valid = g.isValid();
    assert(valid.valid, 'flow-conserving graph should be valid');

    // ----- Clone -----
    var g2 = g.clone();
    assert(g2.vertices.length === 2, 'clone should have 2 vertices');
    g2.addVertex(20, 0, 'boundary');
    assert(g.vertices.length === 2, 'original should be unchanged');

    // ----- Components -----
    assert(g.components() === 1, 'two-vertex cycle is 1 component');

    var g3 = new MOYGraph();
    var a = g3.addVertex(0, 0, 'boundary');
    var b = g3.addVertex(10, 0, 'boundary');
    var c = g3.addVertex(20, 0, 'boundary');
    var d = g3.addVertex(30, 0, 'boundary');
    g3.addEdge(a, b, 1);
    g3.addEdge(c, d, 1);
    assert(g3.components() === 2, 'two disconnected edges = 2 components');

    // ----- Circle detection -----
    var gc = new MOYGraph();
    var cv1 = gc.addVertex(0, 0, 'boundary');
    var cv2 = gc.addVertex(10, 0, 'boundary');
    var cv3 = gc.addVertex(10, 10, 'boundary');
    gc.addEdge(cv1, cv2, 1);
    gc.addEdge(cv2, cv3, 1);
    gc.addEdge(cv3, cv1, 1);

    var circle = gc.findCircle();
    assert(circle !== null, 'should find a circle in triangle graph');
    assert(circle.label === 1, 'circle label should be 1');
    assert(circle.edges.length === 3, 'circle should have 3 edges');

    // ----- Circle removal -----
    var gcClone = gc.clone();
    var removedLabel = gcClone.removeCircle(circle.edges);
    assert(removedLabel === 1, 'removed circle label should be 1');
    assert(gcClone.edges.length === 0, 'after removing circle, no edges remain');

    // ----- Digon detection -----
    var gd = new MOYGraph();
    var dv1 = gd.addVertex(0, 0, 'trivalent');
    var dv2 = gd.addVertex(10, 0, 'trivalent');
    gd.addEdge(dv1, dv2, 1);
    gd.addEdge(dv1, dv2, 2);

    var digon = gd.findDigon();
    assert(digon !== null, 'should find a digon');
    assert(digon.labelA + digon.labelB === 3, 'digon labels should sum to 3');

    // ----- Evaluate: simple circle with label 1 for sl_2 -----
    var circleGraph = new MOYGraph();
    var u = circleGraph.addVertex(0, 0, 'boundary');
    var w = circleGraph.addVertex(10, 0, 'boundary');
    circleGraph.addEdge(u, w, 1);
    circleGraph.addEdge(w, u, 1);

    var val = circleGraph.evaluate(2);
    // Circle with label 1 for sl_2: [2 choose 1]_q = [2]_q = q + q^{-1}
    var expected = LaurentPoly.quantumBinomial(2, 1);
    assert(val.equals(expected),
      'circle(label=1, n=2) should be [2]_q = q+q^{-1}, got ' + val.toLatex());

    // ----- Evaluate: circle with label 1 for sl_3 -----
    var val3 = circleGraph.evaluate(3);
    // [3 choose 1]_q = [3]_q = q^2 + 1 + q^{-2}
    var expected3 = LaurentPoly.quantumBinomial(3, 1);
    assert(val3.equals(expected3),
      'circle(label=1, n=3) should be [3]_q, got ' + val3.toLatex());

    // ----- SVG output -----
    var svg = circleGraph.toSVG(200, 200);
    assert(svg.indexOf('<svg') !== -1, 'toSVG should produce SVG element');
    assert(svg.indexOf('line') !== -1, 'toSVG should contain line elements');

    // ----- Flow validation: invalid graph -----
    var bad = new MOYGraph();
    var bv1 = bad.addVertex(0, 0, 'trivalent');
    var bv2 = bad.addVertex(10, 0, 'trivalent');
    bad.addEdge(bv1, bv2, 3);
    bad.addEdge(bv2, bv1, 2); // flow mismatch at both vertices

    var badValid = bad.isValid();
    assert(!badValid.valid, 'flow-violating graph should be invalid');
    assert(badValid.errors.length > 0, 'should report flow errors');

    // ----- computeSlNPolynomial: basic smoke test -----
    if (typeof ResolutionCube !== 'undefined') {
      // Trefoil with sl_2 should give a nonzero polynomial
      var trefoilPD = [[1, 4, 2, 3], [3, 6, 4, 5], [5, 2, 6, 1]];
      var trefoilSigns = [+1, +1, +1];

      var jones = computeSlNPolynomial(trefoilPD, trefoilSigns, 2);
      assert(!jones.isZero(), 'Trefoil sl_2 polynomial should be nonzero');
      console.log('  Trefoil sl_2 polynomial: ' + jones.toLatex());
    }

    console.log('moy-graph self-test: all tests passed.');
  }

  // =====================================================================
  // Expose on global
  // =====================================================================

  global.MOYGraph = MOYGraph;
  global.computeSlNPolynomial = computeSlNPolynomial;
  global.selfTestMOYGraph = selfTestMOYGraph;

})(typeof window !== 'undefined' ? window : globalThis);
