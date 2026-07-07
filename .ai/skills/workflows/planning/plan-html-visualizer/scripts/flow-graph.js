/**
 * plan-html-visualizer — flow graph script.
 *
 * Classic script (no import/export); inline into the artifact when a
 * flow-graph view is used, AFTER scripts/graph-support.js. Renders a
 * left-to-right directed graph (steps, decisions, start/end) from the JSON
 * spec embedded in each flow-graph section (`script.flow-spec`). The spec
 * must be acyclic. Flow nodes with a `nodeRef` jump to and select the
 * referenced semantic node when clicked. Zooming is provided by
 * PlanGraphSupport.attachZoom.
 */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var COL_W = 210;
  var ROW_H = 92;
  var NODE_W = 156;
  var NODE_H = 46;
  var PAD = 14;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  function render(section, canvas, spec, index, zoom) {
    canvas.textContent = '';
    var nodes = Array.isArray(spec.nodes) ? spec.nodes : [];
    var edges = Array.isArray(spec.edges) ? spec.edges : [];
    if (!nodes.length) return;

    var byId = {};
    nodes.forEach(function (n) {
      byId[n.id] = n;
    });

    // Longest-path layering (spec must be acyclic).
    var indeg = {};
    nodes.forEach(function (n) {
      indeg[n.id] = 0;
    });
    edges.forEach(function (e) {
      if (byId[e.from] && byId[e.to]) indeg[e.to]++;
    });
    var layer = {};
    nodes.forEach(function (n) {
      layer[n.id] = 0;
    });
    var queue = nodes.filter(function (n) {
      return !indeg[n.id];
    }).map(function (n) {
      return n.id;
    });
    var work = {};
    Object.keys(indeg).forEach(function (id) {
      work[id] = indeg[id];
    });
    while (queue.length) {
      var id = queue.shift();
      edges.forEach(function (e) {
        if (e.from !== id || !byId[e.to]) return;
        layer[e.to] = Math.max(layer[e.to], layer[id] + 1);
        if (--work[e.to] === 0) queue.push(e.to);
      });
    }

    var cols = {};
    nodes.forEach(function (n) {
      (cols[layer[n.id]] = cols[layer[n.id]] || []).push(n);
    });
    var colKeys = Object.keys(cols).map(Number).sort(function (a, b) { return a - b; });
    var maxRows = 0;
    colKeys.forEach(function (key) {
      maxRows = Math.max(maxRows, cols[key].length);
    });

    var pos = {};
    colKeys.forEach(function (key) {
      var colNodes = cols[key];
      var offset = ((maxRows - colNodes.length) * ROW_H) / 2;
      colNodes.forEach(function (n, i) {
        pos[n.id] = { x: PAD + key * COL_W, y: PAD + offset + i * ROW_H };
      });
    });

    var width = colKeys.length * COL_W + PAD * 2;
    var height = maxRows * ROW_H + PAD * 2;
    var svg = svgEl('svg', { width: width, height: height, class: 'flow-svg' });

    var markerId = 'flow-arrow-' + index;
    var defs = svgEl('defs', {});
    var marker = svgEl('marker', {
      id: markerId,
      viewBox: '0 0 10 10',
      refX: 9,
      refY: 5,
      markerWidth: 7,
      markerHeight: 7,
      orient: 'auto-start-reverse'
    });
    marker.appendChild(svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'flow-arrowhead' }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    edges.forEach(function (e) {
      var from = pos[e.from];
      var to = pos[e.to];
      if (!from || !to) return;
      var x1 = from.x + NODE_W;
      var y1 = from.y + NODE_H / 2;
      var x2 = to.x;
      var y2 = to.y + NODE_H / 2;
      var mx = (x1 + x2) / 2;
      svg.appendChild(
        svgEl('path', {
          d: 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2,
          class: 'flow-edge',
          'marker-end': 'url(#' + markerId + ')'
        })
      );
      if (e.label) {
        var label = svgEl('text', {
          x: mx,
          y: (y1 + y2) / 2 - 6,
          'text-anchor': 'middle',
          class: 'flow-edge-label'
        });
        label.textContent = e.label;
        svg.appendChild(label);
      }
    });

    nodes.forEach(function (n) {
      var p = pos[n.id];
      var type = n.type || 'step';
      var g = svgEl('g', {
        class: 'flow-node type-' + type + (n.nodeRef ? ' is-clickable' : ''),
        transform: 'translate(' + p.x + ',' + p.y + ')'
      });
      if (type === 'decision') {
        var cx = NODE_W / 2;
        var cy = NODE_H / 2;
        g.appendChild(
          svgEl('polygon', {
            points: cx + ',-6 ' + (NODE_W + 10) + ',' + cy + ' ' + cx + ',' + (NODE_H + 6) + ' -10,' + cy
          })
        );
      } else {
        g.appendChild(svgEl('rect', {
          width: NODE_W,
          height: NODE_H,
          rx: type === 'start' || type === 'end' ? NODE_H / 2 : 7
        }));
      }
      var text = svgEl('text', { x: NODE_W / 2, y: NODE_H / 2 + 4.5, 'text-anchor': 'middle' });
      text.textContent = n.label || n.id;
      g.appendChild(text);
      var title = svgEl('title', {});
      title.textContent = n.label || n.id;
      g.appendChild(title);
      if (n.nodeRef && window.PlanGraphSupport) {
        g.addEventListener('click', function (event) {
          event.stopPropagation();
          window.PlanGraphSupport.jumpToNode(section, n.nodeRef, n.label || n.id);
        });
      }
      svg.appendChild(g);
    });

    canvas.appendChild(svg);
    if (zoom) zoom.setSvg(svg, width, height);
  }

  function initFlowGraphs() {
    document.querySelectorAll('section[data-component="flow-graph"]').forEach(function (section, index) {
      var specEl = section.querySelector('script.flow-spec');
      var canvas = section.querySelector('.flow-canvas');
      if (!specEl || !canvas) return;
      var spec;
      try {
        spec = JSON.parse(specEl.textContent);
      } catch (_err) {
        return;
      }
      var zoom = window.PlanGraphSupport ? window.PlanGraphSupport.attachZoom(canvas) : null;
      render(section, canvas, spec, index, zoom);
    });
  }

  ready(initFlowGraphs);
})();
