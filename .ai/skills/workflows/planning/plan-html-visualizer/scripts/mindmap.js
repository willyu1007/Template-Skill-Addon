/**
 * plan-html-visualizer — mindmap script.
 *
 * Classic script (no import/export); inline into the artifact when a mindmap
 * view is used, AFTER scripts/graph-support.js. Renders a collapsible
 * left-to-right tree of the whole plan from the embedded
 * `plan-semantic-context` model — no extra agent content needed. Clicking a
 * node jumps to (and selects) the corresponding rendered section, or selects
 * the semantic node directly if it has no section. Zooming is provided by
 * PlanGraphSupport.attachZoom.
 */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var NODE_H = 28;
  var V_GAP = 10;
  var H_GAP = 34; /* gap between a column's widest node and the next column */
  var PAD = 14;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function readJson(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (_err) {
      return null;
    }
  }

  function isCjk(ch) {
    return /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(ch);
  }

  function textUnits(s) {
    var units = 0;
    for (var i = 0; i < s.length; i++) units += isCjk(s[i]) ? 2 : 1;
    return units;
  }

  function truncate(s, maxUnits) {
    if (textUnits(s) <= maxUnits) return s;
    var out = '';
    var units = 0;
    for (var i = 0; i < s.length; i++) {
      units += isCjk(s[i]) ? 2 : 1;
      if (units > maxUnits - 2) break;
      out += s[i];
    }
    return out + '…';
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  function initMindmap() {
    var section = document.querySelector('section[data-component="mindmap"]');
    if (!section) return;
    var canvas = section.querySelector('.mindmap-canvas');
    var context = readJson('plan-semantic-context');
    if (!canvas || !context || !Array.isArray(context.nodes) || !context.nodes.length) return;

    var meta = readJson('plan-artifact-metadata') || {};
    var rootTitle = meta.taskTitle || document.title || 'Plan';
    var collapsed = {};
    var support = window.PlanGraphSupport || null;
    var zoom = support ? support.attachZoom(canvas) : null;

    function buildTree() {
      var map = {};
      var roots = [];
      context.nodes.forEach(function (n) {
        map[n.id] = { id: n.id, label: n.title || n.id, type: n.type || 'node', children: [] };
      });
      context.nodes.forEach(function (n) {
        if (n.parent && map[n.parent]) {
          map[n.parent].children.push(map[n.id]);
        } else {
          roots.push(map[n.id]);
        }
      });
      return { id: '__root__', label: rootTitle, type: 'root', children: roots };
    }

    function render() {
      canvas.textContent = '';
      var root = buildTree();
      var cursor = { y: PAD };

      function measure(node, depth) {
        node.depth = depth;
        node.display = truncate(node.label, 24);
        node.width = Math.min(186, 18 + textUnits(node.display) * 7);
        var kids = collapsed[node.id] ? [] : node.children;
        if (!kids.length) {
          node.y = cursor.y;
          cursor.y += NODE_H + V_GAP;
        } else {
          kids.forEach(function (child) {
            measure(child, depth + 1);
          });
          node.y = (kids[0].y + kids[kids.length - 1].y) / 2;
        }
      }
      measure(root, 0);

      // Column x offsets adapt to the widest visible node of each depth.
      var maxWidths = [];
      (function scan(node) {
        maxWidths[node.depth] = Math.max(maxWidths[node.depth] || 0, node.width);
        (collapsed[node.id] ? [] : node.children).forEach(scan);
      })(root);
      var colX = [PAD];
      for (var d = 1; d < maxWidths.length; d++) {
        colX[d] = colX[d - 1] + maxWidths[d - 1] + H_GAP;
      }

      var width = colX[colX.length - 1] + maxWidths[maxWidths.length - 1] + PAD + 20;
      var height = Math.max(cursor.y + PAD, NODE_H + 2 * PAD);
      var svg = svgEl('svg', { width: width, height: height, class: 'mindmap-svg' });

      function draw(node) {
        var x = colX[node.depth];
        var kids = collapsed[node.id] ? [] : node.children;
        kids.forEach(function (child) {
          var x1 = x + node.width;
          var y1 = node.y + NODE_H / 2;
          var x2 = colX[child.depth];
          var y2 = child.y + NODE_H / 2;
          var mx = (x1 + x2) / 2;
          svg.appendChild(
            svgEl('path', {
              d: 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2,
              class: 'mindmap-edge'
            })
          );
          draw(child);
        });

        var g = svgEl('g', {
          class: 'mindmap-node type-' + node.type + (node.id !== '__root__' ? ' is-clickable' : ''),
          transform: 'translate(' + x + ',' + node.y + ')'
        });
        g.appendChild(svgEl('rect', { width: node.width, height: NODE_H, rx: 6 }));
        var text = svgEl('text', { x: 9, y: 18 });
        text.textContent = node.display;
        g.appendChild(text);
        var title = svgEl('title', {});
        title.textContent = node.label;
        g.appendChild(title);
        if (node.id !== '__root__' && support) {
          g.addEventListener('click', function (event) {
            event.stopPropagation();
            support.jumpToNode(section, node.id, node.label);
          });
        }
        svg.appendChild(g);

        if (node.children.length) {
          var tg = svgEl('g', {
            class: 'mindmap-toggle',
            transform: 'translate(' + (x + node.width + 10) + ',' + (node.y + NODE_H / 2) + ')'
          });
          tg.appendChild(svgEl('circle', { r: 8 }));
          var sign = svgEl('text', { x: 0, y: 3.5, 'text-anchor': 'middle' });
          sign.textContent = collapsed[node.id] ? '+' : '−';
          tg.appendChild(sign);
          tg.addEventListener('click', function (event) {
            event.stopPropagation();
            collapsed[node.id] = !collapsed[node.id];
            render();
          });
          svg.appendChild(tg);
        }
      }
      draw(root);
      canvas.appendChild(svg);
      if (zoom) zoom.setSvg(svg, width, height);
    }

    render();
  }

  ready(initMindmap);
})();
