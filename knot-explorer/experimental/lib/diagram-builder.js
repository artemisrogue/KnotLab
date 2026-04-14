/**
 * diagram-builder.js -- Interactive knot/link diagram builder
 *
 * Provides a drag-and-drop SVG-based editor for constructing knot and link
 * diagrams. Users place crossings, connect strand ports, and rotate crossings.
 * The builder exports to Gauss code and PD notation, and can import from both.
 *
 * Depends on: gauss-code.js (parseGaussCode, isRealizable, gaussToPD)
 */

(function (global) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  // Port layout for a crossing (before rotation).
  // Ports are numbered 0-3 going counterclockwise from bottom-left:
  //
  //   Port 3 (NW)  ----  Port 2 (NE)
  //         \      /  or  /      \
  //          \    /      /        \
  //           \/        /          \
  //           /\       crossing center
  //          /  \
  //   Port 0 (SW)  ----  Port 1 (SE)
  //
  // For a positive classical crossing: understrand goes SW(0) -> NE(2),
  //   overstrand goes NW(3) -> SE(1).
  // For a negative classical crossing: understrand goes SE(1) -> NW(3),
  //   overstrand goes SW(0) -> NE(2).
  // For a virtual crossing: no over/under distinction.

  var PORT_OFFSETS = [
    { x: -20, y: 20 },   // 0: SW
    { x: 20, y: 20 },    // 1: SE
    { x: 20, y: -20 },   // 2: NE
    { x: -20, y: -20 }   // 3: NW
  ];

  // Strand paths through a crossing (which port connects to which internally)
  // Positive: under goes 0->2, over goes 3->1
  // Negative: under goes 1->3, over goes 0->2
  var STRAND_THROUGH = {
    positive: { 0: 2, 2: 0, 3: 1, 1: 3 },
    negative: { 1: 3, 3: 1, 0: 2, 2: 0 }
  };

  function rotatePoint(px, py, cx, cy, angleDeg) {
    var rad = angleDeg * Math.PI / 180;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var dx = px - cx;
    var dy = py - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    };
  }

  // ================================================================
  //  DiagramBuilder constructor
  // ================================================================

  function DiagramBuilder(container, options) {
    options = options || {};
    this._container = container;
    this._width = options.width || 600;
    this._height = options.height || 400;
    this._crossings = [];   // {id, x, y, type:'classical'|'virtual', sign:+1|-1, rotation:0}
    this._connections = [];  // {fromId, fromPort, toId, toPort}
    this._nextId = 1;
    this._activeTool = 'select';
    this._selectedCrossing = null;
    this._connectingFrom = null;  // {id, port} when mid-connect
    this._dragging = null;        // {id, offsetX, offsetY} when dragging
    this._defaultSign = 1;
    this._onChange = options.onChange || null;

    this._initSVG();
    this._bindEvents();
  }

  // ================================================================
  //  SVG setup
  // ================================================================

  DiagramBuilder.prototype._initSVG = function () {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('width', this._width);
    svg.setAttribute('height', this._height);
    svg.setAttribute('viewBox', '0 0 ' + this._width + ' ' + this._height);
    svg.style.border = '1px solid var(--border, #ddd)';
    svg.style.borderRadius = '8px';
    svg.style.background = '#fafafa';
    svg.style.cursor = 'crosshair';

    // Defs for markers and patterns
    var defs = document.createElementNS(SVGNS, 'defs');

    // Arrow marker
    var marker = document.createElementNS(SVGNS, 'marker');
    marker.setAttribute('id', 'db-arrow');
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('refX', '4');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    var arrowPath = document.createElementNS(SVGNS, 'path');
    arrowPath.setAttribute('d', 'M0,0 L8,3 L0,6 Z');
    arrowPath.setAttribute('fill', '#555');
    marker.appendChild(arrowPath);
    defs.appendChild(marker);

    // Grid pattern
    var pattern = document.createElementNS(SVGNS, 'pattern');
    pattern.setAttribute('id', 'db-grid');
    pattern.setAttribute('width', '20');
    pattern.setAttribute('height', '20');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    var gridLine1 = document.createElementNS(SVGNS, 'path');
    gridLine1.setAttribute('d', 'M 20 0 L 0 0 0 20');
    gridLine1.setAttribute('fill', 'none');
    gridLine1.setAttribute('stroke', '#e8e8e8');
    gridLine1.setAttribute('stroke-width', '0.5');
    pattern.appendChild(gridLine1);
    defs.appendChild(pattern);

    svg.appendChild(defs);

    // Grid background
    var gridRect = document.createElementNS(SVGNS, 'rect');
    gridRect.setAttribute('width', '100%');
    gridRect.setAttribute('height', '100%');
    gridRect.setAttribute('fill', 'url(#db-grid)');
    svg.appendChild(gridRect);

    // Layer groups
    this._connectionLayer = document.createElementNS(SVGNS, 'g');
    this._connectionLayer.setAttribute('class', 'db-connections');
    svg.appendChild(this._connectionLayer);

    this._crossingLayer = document.createElementNS(SVGNS, 'g');
    this._crossingLayer.setAttribute('class', 'db-crossings');
    svg.appendChild(this._crossingLayer);

    // Rubber band line for connect tool
    this._rubberBand = document.createElementNS(SVGNS, 'line');
    this._rubberBand.setAttribute('stroke', 'var(--virtual-accent, #1b9e77)');
    this._rubberBand.setAttribute('stroke-width', '2');
    this._rubberBand.setAttribute('stroke-dasharray', '5,3');
    this._rubberBand.setAttribute('visibility', 'hidden');
    svg.appendChild(this._rubberBand);

    this._svg = svg;
    this._container.appendChild(svg);
  };

  // ================================================================
  //  Event handling
  // ================================================================

  DiagramBuilder.prototype._bindEvents = function () {
    var self = this;

    this._svg.addEventListener('mousedown', function (e) {
      var pt = self._svgPoint(e);
      var hit = self._hitTest(pt.x, pt.y);

      if (self._activeTool === 'select') {
        if (hit && hit.type === 'crossing') {
          self._dragging = {
            id: hit.id,
            offsetX: pt.x - self._getCrossing(hit.id).x,
            offsetY: pt.y - self._getCrossing(hit.id).y
          };
          self._selectCrossing(hit.id);
        } else {
          self._selectCrossing(null);
        }
      } else if (self._activeTool === 'addClassical') {
        self.addCrossing(pt.x, pt.y, 'classical', self._defaultSign);
      } else if (self._activeTool === 'addVirtual') {
        self.addCrossing(pt.x, pt.y, 'virtual', 1);
      } else if (self._activeTool === 'connect') {
        if (hit && hit.type === 'port') {
          if (!self._connectingFrom) {
            // Check port is free
            if (!self._isPortFree(hit.crossingId, hit.port)) return;
            self._connectingFrom = { id: hit.crossingId, port: hit.port };
            self._highlightPort(hit.crossingId, hit.port, true);
            // Show rubber band start
            var portPos = self._getPortPosition(hit.crossingId, hit.port);
            self._rubberBand.setAttribute('x1', portPos.x);
            self._rubberBand.setAttribute('y1', portPos.y);
            self._rubberBand.setAttribute('x2', portPos.x);
            self._rubberBand.setAttribute('y2', portPos.y);
            self._rubberBand.setAttribute('visibility', 'visible');
          } else {
            // Complete connection
            if (hit.crossingId === self._connectingFrom.id && hit.port === self._connectingFrom.port) {
              // Clicked same port, cancel
              self._cancelConnect();
              return;
            }
            if (!self._isPortFree(hit.crossingId, hit.port)) {
              self._cancelConnect();
              return;
            }
            self.connectPorts(
              self._connectingFrom.id, self._connectingFrom.port,
              hit.crossingId, hit.port
            );
            self._cancelConnect();
          }
        } else {
          self._cancelConnect();
        }
      } else if (self._activeTool === 'delete') {
        if (hit && hit.type === 'crossing') {
          self.removeCrossing(hit.id);
        } else if (hit && hit.type === 'connection') {
          self.removeConnection(hit.index);
        }
      }
    });

    this._svg.addEventListener('mousemove', function (e) {
      var pt = self._svgPoint(e);
      if (self._dragging) {
        var c = self._getCrossing(self._dragging.id);
        if (c) {
          c.x = pt.x - self._dragging.offsetX;
          c.y = pt.y - self._dragging.offsetY;
          self._render();
        }
      }
      if (self._connectingFrom) {
        self._rubberBand.setAttribute('x2', pt.x);
        self._rubberBand.setAttribute('y2', pt.y);
      }
      // Highlight ports on hover in connect mode
      if (self._activeTool === 'connect' && !self._connectingFrom) {
        var hit = self._hitTest(pt.x, pt.y);
        self._clearPortHighlights();
        if (hit && hit.type === 'port' && self._isPortFree(hit.crossingId, hit.port)) {
          self._highlightPort(hit.crossingId, hit.port, true);
        }
      }
    });

    this._svg.addEventListener('mouseup', function () {
      if (self._dragging) {
        self._dragging = null;
        self._fireChange();
      }
    });

    this._svg.addEventListener('mouseleave', function () {
      if (self._dragging) {
        self._dragging = null;
        self._fireChange();
      }
    });
  };

  DiagramBuilder.prototype._svgPoint = function (e) {
    var rect = this._svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  DiagramBuilder.prototype._hitTest = function (x, y) {
    // Check ports first (smaller targets, higher priority)
    for (var i = 0; i < this._crossings.length; i++) {
      var c = this._crossings[i];
      for (var p = 0; p < 4; p++) {
        var pos = this._getPortPosition(c.id, p);
        var dx = x - pos.x;
        var dy = y - pos.y;
        if (dx * dx + dy * dy < 64) {  // 8px radius
          return { type: 'port', crossingId: c.id, port: p };
        }
      }
    }
    // Check crossings
    for (var j = 0; j < this._crossings.length; j++) {
      var cr = this._crossings[j];
      var ddx = x - cr.x;
      var ddy = y - cr.y;
      if (ddx * ddx + ddy * ddy < 400) {  // 20px radius
        return { type: 'crossing', id: cr.id };
      }
    }
    // Check connections (rough proximity to bezier midpoint)
    for (var k = 0; k < this._connections.length; k++) {
      var conn = this._connections[k];
      var p1 = this._getPortPosition(conn.fromId, conn.fromPort);
      var p2 = this._getPortPosition(conn.toId, conn.toPort);
      var mx = (p1.x + p2.x) / 2;
      var my = (p1.y + p2.y) / 2;
      var cdx = x - mx;
      var cdy = y - my;
      if (cdx * cdx + cdy * cdy < 100) {
        return { type: 'connection', index: k };
      }
    }
    return null;
  };

  // ================================================================
  //  Data model operations
  // ================================================================

  DiagramBuilder.prototype.addCrossing = function (x, y, type, sign) {
    var c = {
      id: this._nextId++,
      x: x,
      y: y,
      type: type || 'classical',
      sign: sign || 1,
      rotation: 0
    };
    this._crossings.push(c);
    this._render();
    this._fireChange();
    return c.id;
  };

  DiagramBuilder.prototype.removeCrossing = function (id) {
    // Remove all connections to this crossing
    this._connections = this._connections.filter(function (conn) {
      return conn.fromId !== id && conn.toId !== id;
    });
    this._crossings = this._crossings.filter(function (c) {
      return c.id !== id;
    });
    if (this._selectedCrossing === id) this._selectedCrossing = null;
    this._render();
    this._fireChange();
  };

  DiagramBuilder.prototype.connectPorts = function (id1, port1, id2, port2) {
    // Validate ports are free
    if (!this._isPortFree(id1, port1) || !this._isPortFree(id2, port2)) return false;
    this._connections.push({
      fromId: id1, fromPort: port1,
      toId: id2, toPort: port2
    });
    this._render();
    this._fireChange();
    return true;
  };

  DiagramBuilder.prototype.removeConnection = function (index) {
    if (index >= 0 && index < this._connections.length) {
      this._connections.splice(index, 1);
      this._render();
      this._fireChange();
    }
  };

  DiagramBuilder.prototype.rotateCrossing = function (id) {
    var c = this._getCrossing(id);
    if (c) {
      c.rotation = (c.rotation + 90) % 360;
      this._render();
      this._fireChange();
    }
  };

  DiagramBuilder.prototype.toggleSign = function (id) {
    var c = this._getCrossing(id);
    if (c && c.type === 'classical') {
      c.sign = -c.sign;
      this._render();
      this._fireChange();
    }
  };

  DiagramBuilder.prototype.clear = function () {
    this._crossings = [];
    this._connections = [];
    this._selectedCrossing = null;
    this._connectingFrom = null;
    this._nextId = 1;
    this._render();
    this._fireChange();
  };

  DiagramBuilder.prototype.setTool = function (tool) {
    this._activeTool = tool;
    this._cancelConnect();
    this._selectCrossing(null);
    // Update cursor
    if (tool === 'select') this._svg.style.cursor = 'default';
    else if (tool === 'delete') this._svg.style.cursor = 'not-allowed';
    else if (tool === 'connect') this._svg.style.cursor = 'pointer';
    else this._svg.style.cursor = 'crosshair';
  };

  DiagramBuilder.prototype.setDefaultSign = function (sign) {
    this._defaultSign = sign;
  };

  // ================================================================
  //  Helpers
  // ================================================================

  DiagramBuilder.prototype._getCrossing = function (id) {
    for (var i = 0; i < this._crossings.length; i++) {
      if (this._crossings[i].id === id) return this._crossings[i];
    }
    return null;
  };

  DiagramBuilder.prototype._getPortPosition = function (crossingId, port) {
    var c = this._getCrossing(crossingId);
    if (!c) return { x: 0, y: 0 };
    var offset = PORT_OFFSETS[port];
    return rotatePoint(c.x + offset.x, c.y + offset.y, c.x, c.y, c.rotation);
  };

  DiagramBuilder.prototype._isPortFree = function (crossingId, port) {
    for (var i = 0; i < this._connections.length; i++) {
      var conn = this._connections[i];
      if ((conn.fromId === crossingId && conn.fromPort === port) ||
          (conn.toId === crossingId && conn.toPort === port)) {
        return false;
      }
    }
    return true;
  };

  DiagramBuilder.prototype._selectCrossing = function (id) {
    this._selectedCrossing = id;
    this._render();
  };

  DiagramBuilder.prototype._cancelConnect = function () {
    if (this._connectingFrom) {
      this._highlightPort(this._connectingFrom.id, this._connectingFrom.port, false);
      this._connectingFrom = null;
    }
    this._rubberBand.setAttribute('visibility', 'hidden');
  };

  DiagramBuilder.prototype._highlightPort = function (crossingId, port, on) {
    var portEl = this._svg.querySelector('[data-crossing="' + crossingId + '"][data-port="' + port + '"]');
    if (portEl) {
      portEl.setAttribute('fill', on ? 'var(--virtual-accent, #1b9e77)' : '#fff');
      portEl.setAttribute('r', on ? '6' : '4');
    }
  };

  DiagramBuilder.prototype._clearPortHighlights = function () {
    var ports = this._svg.querySelectorAll('.db-port');
    for (var i = 0; i < ports.length; i++) {
      ports[i].setAttribute('fill', '#fff');
      ports[i].setAttribute('r', '4');
    }
  };

  DiagramBuilder.prototype._fireChange = function () {
    if (this._onChange) this._onChange(this);
  };

  // ================================================================
  //  Rendering
  // ================================================================

  DiagramBuilder.prototype._render = function () {
    // Clear layers
    while (this._crossingLayer.firstChild) this._crossingLayer.removeChild(this._crossingLayer.firstChild);
    while (this._connectionLayer.firstChild) this._connectionLayer.removeChild(this._connectionLayer.firstChild);

    this._renderConnections();
    this._renderCrossings();
  };

  DiagramBuilder.prototype._renderConnections = function () {
    for (var i = 0; i < this._connections.length; i++) {
      var conn = this._connections[i];
      var p1 = this._getPortPosition(conn.fromId, conn.fromPort);
      var p2 = this._getPortPosition(conn.toId, conn.toPort);

      // Cubic bezier with control points for smooth curves
      var dx = p2.x - p1.x;
      var dy = p2.y - p1.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var tension = Math.min(dist * 0.4, 60);

      // Control points: extend outward from each port
      var c1From = this._getCrossing(conn.fromId);
      var c1Angle = Math.atan2(p1.y - c1From.y, p1.x - c1From.x);
      var cp1x = p1.x + tension * Math.cos(c1Angle);
      var cp1y = p1.y + tension * Math.sin(c1Angle);

      var c2To = this._getCrossing(conn.toId);
      var c2Angle = Math.atan2(p2.y - c2To.y, p2.x - c2To.x);
      var cp2x = p2.x + tension * Math.cos(c2Angle);
      var cp2y = p2.y + tension * Math.sin(c2Angle);

      var path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d',
        'M' + p1.x.toFixed(1) + ',' + p1.y.toFixed(1) +
        ' C' + cp1x.toFixed(1) + ',' + cp1y.toFixed(1) +
        ' ' + cp2x.toFixed(1) + ',' + cp2y.toFixed(1) +
        ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1)
      );
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#333');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('data-conn-index', i);

      // Arrow at midpoint
      var midT = 0.5;
      var mx = Math.pow(1 - midT, 3) * p1.x + 3 * Math.pow(1 - midT, 2) * midT * cp1x +
               3 * (1 - midT) * midT * midT * cp2x + Math.pow(midT, 3) * p2.x;
      var my = Math.pow(1 - midT, 3) * p1.y + 3 * Math.pow(1 - midT, 2) * midT * cp1y +
               3 * (1 - midT) * midT * midT * cp2y + Math.pow(midT, 3) * p2.y;

      this._connectionLayer.appendChild(path);

      // Small direction arrow at midpoint
      var dt = 0.01;
      var mx2 = Math.pow(1 - midT - dt, 3) * p1.x + 3 * Math.pow(1 - midT - dt, 2) * (midT + dt) * cp1x +
                3 * (1 - midT - dt) * (midT + dt) * (midT + dt) * cp2x + Math.pow(midT + dt, 3) * p2.x;
      var my2 = Math.pow(1 - midT - dt, 3) * p1.y + 3 * Math.pow(1 - midT - dt, 2) * (midT + dt) * cp1y +
                3 * (1 - midT - dt) * (midT + dt) * (midT + dt) * cp2y + Math.pow(midT + dt, 3) * p2.y;
      var angle = Math.atan2(my2 - my, mx2 - mx);
      var arrowSize = 6;
      var a1x = mx - arrowSize * Math.cos(angle - 0.4);
      var a1y = my - arrowSize * Math.sin(angle - 0.4);
      var a2x = mx - arrowSize * Math.cos(angle + 0.4);
      var a2y = my - arrowSize * Math.sin(angle + 0.4);
      var arrow = document.createElementNS(SVGNS, 'polygon');
      arrow.setAttribute('points',
        mx.toFixed(1) + ',' + my.toFixed(1) + ' ' +
        a1x.toFixed(1) + ',' + a1y.toFixed(1) + ' ' +
        a2x.toFixed(1) + ',' + a2y.toFixed(1)
      );
      arrow.setAttribute('fill', '#555');
      this._connectionLayer.appendChild(arrow);
    }
  };

  DiagramBuilder.prototype._renderCrossings = function () {
    for (var i = 0; i < this._crossings.length; i++) {
      var c = this._crossings[i];
      var g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('data-crossing-id', c.id);

      if (c.type === 'virtual') {
        this._renderVirtualCrossing(g, c);
      } else {
        this._renderClassicalCrossing(g, c);
      }

      // Port circles
      for (var p = 0; p < 4; p++) {
        var pos = this._getPortPosition(c.id, p);
        var free = this._isPortFree(c.id, p);
        var portCircle = document.createElementNS(SVGNS, 'circle');
        portCircle.setAttribute('cx', pos.x.toFixed(1));
        portCircle.setAttribute('cy', pos.y.toFixed(1));
        portCircle.setAttribute('r', '4');
        portCircle.setAttribute('fill', free ? '#fff' : '#999');
        portCircle.setAttribute('stroke', free ? 'var(--virtual-accent, #1b9e77)' : '#666');
        portCircle.setAttribute('stroke-width', '1.5');
        portCircle.setAttribute('class', 'db-port');
        portCircle.setAttribute('data-crossing', c.id);
        portCircle.setAttribute('data-port', p);
        if (free && this._activeTool === 'connect') {
          portCircle.style.cursor = 'pointer';
        }
        g.appendChild(portCircle);
      }

      // Selection indicator
      if (this._selectedCrossing === c.id) {
        var sel = document.createElementNS(SVGNS, 'circle');
        sel.setAttribute('cx', c.x.toFixed(1));
        sel.setAttribute('cy', c.y.toFixed(1));
        sel.setAttribute('r', '26');
        sel.setAttribute('fill', 'none');
        sel.setAttribute('stroke', 'var(--virtual-accent, #1b9e77)');
        sel.setAttribute('stroke-width', '2');
        sel.setAttribute('stroke-dasharray', '4,3');
        g.appendChild(sel);
      }

      // ID label
      var label = document.createElementNS(SVGNS, 'text');
      label.setAttribute('x', c.x.toFixed(1));
      label.setAttribute('y', (c.y - 28).toFixed(1));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '10');
      label.setAttribute('fill', c.type === 'virtual' ? 'var(--virtual-accent)' : '#666');
      label.textContent = c.id + (c.type === 'virtual' ? 'v' : (c.sign > 0 ? '+' : '\u2212'));
      g.appendChild(label);

      this._crossingLayer.appendChild(g);
    }
  };

  DiagramBuilder.prototype._renderClassicalCrossing = function (g, c) {
    // Draw crossing as two arcs with a gap for the understrand
    // Positive: understrand SW-NE, overstrand NW-SE
    // Negative: understrand SE-NW, overstrand SW-NE
    var ports = [];
    for (var i = 0; i < 4; i++) {
      ports.push(this._getPortPosition(c.id, i));
    }

    // Background circle for the crossing area
    var bg = document.createElementNS(SVGNS, 'circle');
    bg.setAttribute('cx', c.x.toFixed(1));
    bg.setAttribute('cy', c.y.toFixed(1));
    bg.setAttribute('r', '14');
    bg.setAttribute('fill', '#fff');
    bg.setAttribute('stroke', '#ccc');
    bg.setAttribute('stroke-width', '1');
    g.appendChild(bg);

    // Over-strand (drawn on top, no gap)
    var overFrom, overTo, underFrom, underTo;
    if (c.sign > 0) {
      overFrom = ports[3]; overTo = ports[1];   // NW -> SE
      underFrom = ports[0]; underTo = ports[2]; // SW -> NE
    } else {
      overFrom = ports[0]; overTo = ports[2];   // SW -> NE
      underFrom = ports[1]; underTo = ports[3]; // SE -> NW
    }

    // Draw under-strand with gap at center
    var gapFrac = 0.35;
    var ux1 = underFrom.x + (c.x - underFrom.x) * gapFrac;
    var uy1 = underFrom.y + (c.y - underFrom.y) * gapFrac;
    var ux2 = c.x + (underTo.x - c.x) * (1 - gapFrac);
    var uy2 = c.y + (underTo.y - c.y) * (1 - gapFrac);

    var underPath1 = document.createElementNS(SVGNS, 'line');
    underPath1.setAttribute('x1', underFrom.x.toFixed(1));
    underPath1.setAttribute('y1', underFrom.y.toFixed(1));
    underPath1.setAttribute('x2', ux1.toFixed(1));
    underPath1.setAttribute('y2', uy1.toFixed(1));
    underPath1.setAttribute('stroke', '#333');
    underPath1.setAttribute('stroke-width', '2.5');
    g.appendChild(underPath1);

    var underPath2 = document.createElementNS(SVGNS, 'line');
    underPath2.setAttribute('x1', ux2.toFixed(1));
    underPath2.setAttribute('y1', uy2.toFixed(1));
    underPath2.setAttribute('x2', underTo.x.toFixed(1));
    underPath2.setAttribute('y2', underTo.y.toFixed(1));
    underPath2.setAttribute('stroke', '#333');
    underPath2.setAttribute('stroke-width', '2.5');
    g.appendChild(underPath2);

    // Over-strand (continuous through center)
    var overPath = document.createElementNS(SVGNS, 'line');
    overPath.setAttribute('x1', overFrom.x.toFixed(1));
    overPath.setAttribute('y1', overFrom.y.toFixed(1));
    overPath.setAttribute('x2', overTo.x.toFixed(1));
    overPath.setAttribute('y2', overTo.y.toFixed(1));
    overPath.setAttribute('stroke', '#333');
    overPath.setAttribute('stroke-width', '2.5');
    g.appendChild(overPath);
  };

  DiagramBuilder.prototype._renderVirtualCrossing = function (g, c) {
    var ports = [];
    for (var i = 0; i < 4; i++) {
      ports.push(this._getPortPosition(c.id, i));
    }

    // Two crossing strands
    var strand1 = document.createElementNS(SVGNS, 'line');
    strand1.setAttribute('x1', ports[0].x.toFixed(1));
    strand1.setAttribute('y1', ports[0].y.toFixed(1));
    strand1.setAttribute('x2', ports[2].x.toFixed(1));
    strand1.setAttribute('y2', ports[2].y.toFixed(1));
    strand1.setAttribute('stroke', '#333');
    strand1.setAttribute('stroke-width', '2.5');
    g.appendChild(strand1);

    var strand2 = document.createElementNS(SVGNS, 'line');
    strand2.setAttribute('x1', ports[1].x.toFixed(1));
    strand2.setAttribute('y1', ports[1].y.toFixed(1));
    strand2.setAttribute('x2', ports[3].x.toFixed(1));
    strand2.setAttribute('y2', ports[3].y.toFixed(1));
    strand2.setAttribute('stroke', '#333');
    strand2.setAttribute('stroke-width', '2.5');
    g.appendChild(strand2);

    // Virtual crossing circle
    var vc = document.createElementNS(SVGNS, 'circle');
    vc.setAttribute('cx', c.x.toFixed(1));
    vc.setAttribute('cy', c.y.toFixed(1));
    vc.setAttribute('r', '8');
    vc.setAttribute('fill', 'none');
    vc.setAttribute('stroke', 'var(--virtual-accent, #1b9e77)');
    vc.setAttribute('stroke-width', '2');
    g.appendChild(vc);
  };

  // ================================================================
  //  Export: Gauss code generation
  // ================================================================

  DiagramBuilder.prototype.toGaussCode = function () {
    if (this._crossings.length === 0) return '';

    // Build adjacency: for each (crossing, port), find the connected (crossing, port)
    var adj = {};  // "id:port" -> "id:port"
    for (var i = 0; i < this._connections.length; i++) {
      var conn = this._connections[i];
      adj[conn.fromId + ':' + conn.fromPort] = conn.toId + ':' + conn.toPort;
      adj[conn.toId + ':' + conn.toPort] = conn.fromId + ':' + conn.fromPort;
    }

    // Check all ports are connected
    for (var j = 0; j < this._crossings.length; j++) {
      for (var p = 0; p < 4; p++) {
        var key = this._crossings[j].id + ':' + p;
        if (!adj[key]) return '(incomplete: not all ports connected)';
      }
    }

    // Traverse: start at crossing 0 port 0, follow strand through
    var visited = {};  // "id:port" -> true (for entry ports)
    var components = [];

    for (var ci = 0; ci < this._crossings.length; ci++) {
      for (var sp = 0; sp < 4; sp++) {
        var startKey = this._crossings[ci].id + ':' + sp;
        if (visited[startKey]) continue;

        var component = [];
        var curKey = startKey;
        var maxSteps = this._crossings.length * 4 + 1;
        var steps = 0;

        while (steps < maxSteps) {
          if (visited[curKey] && steps > 0) break;
          visited[curKey] = true;

          // Parse current position
          var parts = curKey.split(':');
          var curId = parseInt(parts[0]);
          var curPort = parseInt(parts[1]);
          var crossing = this._getCrossing(curId);
          if (!crossing) break;

          // Record this crossing encounter
          var throughMap = crossing.type === 'virtual'
            ? { 0: 2, 2: 0, 1: 3, 3: 1 }  // virtual: straight through
            : (crossing.sign > 0 ? STRAND_THROUGH.positive : STRAND_THROUGH.negative);

          // Determine if we're the over or under strand
          var isOver;
          if (crossing.type === 'virtual') {
            isOver = false; // virtual crossings don't have over/under
          } else if (crossing.sign > 0) {
            // Positive: over goes 3->1, under goes 0->2
            isOver = (curPort === 3 || curPort === 1);
          } else {
            // Negative: over goes 0->2, under goes 1->3
            isOver = (curPort === 0 || curPort === 2);
          }

          component.push({
            id: curId,
            sign: isOver ? 1 : -1,
            isVirtual: crossing.type === 'virtual'
          });

          // Exit port
          var exitPort = throughMap[curPort];
          var exitKey = curId + ':' + exitPort;
          visited[exitKey] = true;

          // Follow connection to next crossing
          var nextKey = adj[exitKey];
          if (!nextKey) break;

          curKey = nextKey;
          steps++;

          if (curKey === startKey) break;
        }

        if (component.length > 0) {
          components.push(component);
        }
      }
    }

    // Format as Gauss code string
    if (components.length === 0) return '';
    if (components.length === 1) {
      return components[0].map(function (e) {
        var s = (e.sign > 0 ? '' : '-') + e.id;
        if (e.isVirtual) s += 'v';
        return s;
      }).join(' ');
    }
    return components.map(function (comp) {
      return '{' + comp.map(function (e) {
        var s = (e.sign > 0 ? '' : '-') + e.id;
        if (e.isVirtual) s += 'v';
        return s;
      }).join(', ') + '}';
    }).join(', ');
  };

  // ================================================================
  //  Export: PD code generation
  // ================================================================

  DiagramBuilder.prototype.toPDCode = function () {
    if (this._crossings.length === 0) return '[]';

    // The PD code requires labeling arcs. We need to traverse the diagram
    // and assign arc numbers to each strand segment.
    // Use the same traversal as toGaussCode but label arcs.

    var adj = {};
    for (var i = 0; i < this._connections.length; i++) {
      var conn = this._connections[i];
      adj[conn.fromId + ':' + conn.fromPort] = conn.toId + ':' + conn.toPort;
      adj[conn.toId + ':' + conn.toPort] = conn.fromId + ':' + conn.fromPort;
    }

    // Check completeness
    for (var j = 0; j < this._crossings.length; j++) {
      for (var p = 0; p < 4; p++) {
        if (!adj[this._crossings[j].id + ':' + p]) return '(incomplete)';
      }
    }

    // Assign arc labels by traversal
    var arcLabels = {};  // "id:port" -> arc number (for the arc arriving at this port)
    var arcNum = 1;
    var visited = {};

    for (var ci = 0; ci < this._crossings.length; ci++) {
      for (var sp = 0; sp < 4; sp++) {
        var startKey = this._crossings[ci].id + ':' + sp;
        if (visited[startKey]) continue;

        var curKey = startKey;
        var maxSteps = this._crossings.length * 4 + 1;
        var steps = 0;

        while (steps < maxSteps) {
          if (visited[curKey] && steps > 0) break;
          visited[curKey] = true;

          var parts = curKey.split(':');
          var curId = parseInt(parts[0]);
          var curPort = parseInt(parts[1]);
          var crossing = this._getCrossing(curId);
          if (!crossing) break;

          // Label the arc arriving at this port
          arcLabels[curKey] = arcNum++;

          var throughMap = crossing.type === 'virtual'
            ? { 0: 2, 2: 0, 1: 3, 3: 1 }
            : (crossing.sign > 0 ? STRAND_THROUGH.positive : STRAND_THROUGH.negative);

          var exitPort = throughMap[curPort];
          var exitKey = curId + ':' + exitPort;
          visited[exitKey] = true;

          var nextKey = adj[exitKey];
          if (!nextKey) break;

          curKey = nextKey;
          steps++;

          if (curKey === startKey) break;
        }
      }
    }

    // Build PD tuples: [a, b, c, d] for each classical crossing
    // KnotInfo convention: a = incoming under, b = incoming over, c = outgoing under, d = outgoing over
    var pdTuples = [];
    for (var k = 0; k < this._crossings.length; k++) {
      var cr = this._crossings[k];
      if (cr.type === 'virtual') continue;

      var a, b, c, d;
      if (cr.sign > 0) {
        // Positive: under 0->2, over 3->1
        a = arcLabels[cr.id + ':0'] || 0;
        b = arcLabels[cr.id + ':3'] || 0;
        c = arcLabels[cr.id + ':2'] || 0;
        d = arcLabels[cr.id + ':1'] || 0;
      } else {
        // Negative: under 1->3, over 0->2
        a = arcLabels[cr.id + ':1'] || 0;
        b = arcLabels[cr.id + ':0'] || 0;
        c = arcLabels[cr.id + ':3'] || 0;
        d = arcLabels[cr.id + ':2'] || 0;
      }
      pdTuples.push('[' + a + ',' + b + ',' + c + ',' + d + ']');
    }

    return '[' + pdTuples.join(', ') + ']';
  };

  // ================================================================
  //  Import: from Gauss code
  // ================================================================

  DiagramBuilder.prototype.fromGaussCode = function (str) {
    if (!str || !str.trim()) return;
    if (typeof parseGaussCode !== 'function') {
      console.warn('DiagramBuilder: parseGaussCode not available');
      return;
    }

    var gc = parseGaussCode(str);
    this.clear();

    // Collect unique crossing IDs
    var crossingIds = {};
    var seq = [];
    gc.components.forEach(function (comp) {
      comp.forEach(function (entry) {
        if (!crossingIds[entry.id]) {
          crossingIds[entry.id] = { type: entry.isVirtual ? 'virtual' : 'classical', sign: 1 };
        }
        // First positive encounter determines the sign
        if (entry.sign > 0 && !entry.isVirtual) {
          crossingIds[entry.id].sign = 1;
        }
        seq.push(entry);
      });
    });

    // Determine crossing signs from Gauss code
    // In our convention, first encounter with positive sign = over-crossing
    var crossingEncounters = {};
    gc.components.forEach(function (comp) {
      comp.forEach(function (entry) {
        if (!crossingEncounters[entry.id]) crossingEncounters[entry.id] = [];
        crossingEncounters[entry.id].push(entry.sign);
      });
    });
    // The sign of a crossing is determined by which strand goes over
    // For now, use +1 as default; the Gauss code sign convention
    // maps to our port convention during traversal

    // Place crossings in a circle layout
    var ids = Object.keys(crossingIds);
    var n = ids.length;
    var cx = this._width / 2;
    var cy = this._height / 2;
    var radius = Math.min(cx, cy) * 0.6;

    for (var i = 0; i < n; i++) {
      var angle = (2 * Math.PI * i) / n - Math.PI / 2;
      var x = cx + radius * Math.cos(angle);
      var y = cy + radius * Math.sin(angle);
      var info = crossingIds[ids[i]];
      var cId = this.addCrossing(x, y, info.type, info.sign);
      // Map original Gauss code ID to builder ID
      crossingIds[ids[i]].builderId = cId;
    }

    // Connect ports based on traversal order
    // Each crossing is visited twice. First visit enters one strand pair,
    // second visit enters the other. We need to connect the exit of one
    // crossing visit to the entry of the next.

    var self = this;
    gc.components.forEach(function (comp) {
      var encounters = {}; // crossingId -> count of visits so far

      for (var ci = 0; ci < comp.length; ci++) {
        var entry = comp[ci];
        var nextEntry = comp[(ci + 1) % comp.length];
        var bId = crossingIds[entry.id].builderId;
        var nextBId = crossingIds[nextEntry.id].builderId;
        var crossing = self._getCrossing(bId);
        var nextCrossing = self._getCrossing(nextBId);

        if (!encounters[entry.id]) encounters[entry.id] = 0;
        var visitNum = encounters[entry.id]++;

        if (!encounters[nextEntry.id]) encounters[nextEntry.id] = 0;
        var nextVisitNum = encounters[nextEntry.id]; // peek, don't increment

        // Determine entry/exit ports based on over/under and visit number
        var exitPort;
        if (crossing.type === 'virtual') {
          exitPort = visitNum === 0 ? 2 : 3; // first visit: 0->2, second: 1->3
        } else if (entry.sign > 0) {
          // Over-crossing: positive crossing goes 3->1, negative goes 0->2
          exitPort = crossing.sign > 0 ? 1 : 2;
        } else {
          // Under-crossing: positive crossing goes 0->2, negative goes 1->3
          exitPort = crossing.sign > 0 ? 2 : 3;
        }

        var nextEntryPort;
        if (nextCrossing.type === 'virtual') {
          nextEntryPort = nextVisitNum === 0 ? 0 : 1;
        } else if (nextEntry.sign > 0) {
          nextEntryPort = nextCrossing.sign > 0 ? 3 : 0;
        } else {
          nextEntryPort = nextCrossing.sign > 0 ? 0 : 1;
        }

        // Connect exit to next entry
        if (self._isPortFree(bId, exitPort) && self._isPortFree(nextBId, nextEntryPort)) {
          self.connectPorts(bId, exitPort, nextBId, nextEntryPort);
        }
      }
    });

    this._render();
    this._fireChange();
  };

  // ================================================================
  //  Import: from PD code
  // ================================================================

  DiagramBuilder.prototype.fromPDCode = function (str) {
    if (!str || !str.trim()) return;

    // Parse PD code: [[a,b,c,d], ...]
    var tuples = [];
    var re = /\[(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\]/g;
    var m;
    while ((m = re.exec(str)) !== null) {
      tuples.push([parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), parseInt(m[4])]);
    }
    if (tuples.length === 0) return;

    this.clear();

    var n = tuples.length;
    var cx = this._width / 2;
    var cy = this._height / 2;
    var radius = Math.min(cx, cy) * 0.6;

    // Place crossings
    var crossingBuilderIds = [];
    for (var i = 0; i < n; i++) {
      var angle = (2 * Math.PI * i) / n - Math.PI / 2;
      var x = cx + radius * Math.cos(angle);
      var y = cy + radius * Math.sin(angle);
      // Determine sign from PD code (would need more context; default to positive)
      var cId = this.addCrossing(x, y, 'classical', 1);
      crossingBuilderIds.push(cId);
    }

    // Build arc adjacency from PD code
    // Each arc number appears in exactly two crossings.
    // arcInfo[arcNum] = [{crossingIndex, portIndex}, ...]
    var arcInfo = {};
    for (var ti = 0; ti < tuples.length; ti++) {
      var tuple = tuples[ti];
      for (var pi = 0; pi < 4; pi++) {
        var arcNum = tuple[pi];
        if (!arcInfo[arcNum]) arcInfo[arcNum] = [];
        arcInfo[arcNum].push({ crossingIndex: ti, port: pi });
      }
    }

    // Connect ports: each arc connects an exit port of one crossing to an entry port of another
    var arcNums = Object.keys(arcInfo);
    for (var ai = 0; ai < arcNums.length; ai++) {
      var entries = arcInfo[arcNums[ai]];
      if (entries.length !== 2) continue;

      // In PD convention [a,b,c,d]: a=in-under(port0), b=in-over(port3), c=out-under(port2), d=out-over(port1)
      // An arc connecting out of one crossing to in of another
      var e0 = entries[0];
      var e1 = entries[1];

      // Map PD port index to our port numbering
      // PD port 0 (a) = our port 0 (entry), PD port 1 (b) = our port 3, PD port 2 (c) = our port 2, PD port 3 (d) = our port 1
      var pdToBuilder = [0, 3, 2, 1];

      var bPort0 = pdToBuilder[e0.port];
      var bPort1 = pdToBuilder[e1.port];
      var bId0 = crossingBuilderIds[e0.crossingIndex];
      var bId1 = crossingBuilderIds[e1.crossingIndex];

      if (this._isPortFree(bId0, bPort0) && this._isPortFree(bId1, bPort1)) {
        this.connectPorts(bId0, bPort0, bId1, bPort1);
      }
    }

    this._render();
    this._fireChange();
  };

  // ================================================================
  //  Getters
  // ================================================================

  DiagramBuilder.prototype.getCrossingCount = function () {
    return this._crossings.length;
  };

  DiagramBuilder.prototype.getClassicalCount = function () {
    return this._crossings.filter(function (c) { return c.type === 'classical'; }).length;
  };

  DiagramBuilder.prototype.getVirtualCount = function () {
    return this._crossings.filter(function (c) { return c.type === 'virtual'; }).length;
  };

  DiagramBuilder.prototype.isComplete = function () {
    for (var i = 0; i < this._crossings.length; i++) {
      for (var p = 0; p < 4; p++) {
        if (this._isPortFree(this._crossings[i].id, p)) return false;
      }
    }
    return this._crossings.length > 0;
  };

  // ================================================================
  //  Expose
  // ================================================================

  global.DiagramBuilder = DiagramBuilder;

})(typeof window !== 'undefined' ? window : this);
