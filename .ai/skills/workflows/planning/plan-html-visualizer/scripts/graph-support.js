/**
 * plan-html-visualizer — shared graph support script.
 *
 * Classic script (no import/export); inline into the artifact BEFORE
 * scripts/mindmap.js and/or scripts/flow-graph.js whenever either of them is
 * used. Exposes `window.PlanGraphSupport` with:
 *
 * - attachZoom(container): adds a zoom toolbar (out / percent-reset / in /
 *   fit-width) above an SVG canvas. Returns a controller whose setSvg(svg, w, h)
 *   must be called after each (re)render; the zoom level survives re-renders.
 *   Default mode is fit-width (scales down only, never up).
 * - jumpToNode(section, nodeId, label): scrolls to and selects the rendered
 *   element for a semantic node (expanding its collapsed host section), or
 *   dispatches `plan:node-selected` directly when the node has no rendered
 *   element outside the graph's own section.
 */
(function () {
  'use strict';

  var SCALE_STEP = 1.25;
  var SCALE_MIN = 0.2;
  var SCALE_MAX = 3;

  function t(key, fallback) {
    return window.PlanI18n ? window.PlanI18n.t(key) : fallback;
  }

  function cssEscape(value) {
    return window.CSS && CSS.escape ? CSS.escape(value) : value;
  }

  function attachZoom(container) {
    var state = { svg: null, w: 0, h: 0, scale: null }; // scale null = fit width

    var bar = document.createElement('div');
    bar.className = 'zoom-bar';
    // Runtime-only UI: stripped by the feedback script when the artifact is
    // serialized, so a saved file does not accumulate duplicate toolbars.
    bar.setAttribute('data-generated-ui', '');

    function makeButton(label, title, onClick) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.title = title;
      button.addEventListener('click', onClick);
      bar.appendChild(button);
      return button;
    }

    function currentScale() {
      if (state.scale !== null) return state.scale;
      var available = container.clientWidth - 2;
      // Hidden container (e.g. inside a collapsed section): fall back to 1:1
      // until it becomes visible; the ResizeObserver re-fits it then.
      if (!state.w || available <= 0) return 1;
      return Math.min(1, available / state.w);
    }

    function apply() {
      if (!state.svg) return;
      var scale = currentScale();
      state.svg.style.width = state.w * scale + 'px';
      state.svg.style.height = state.h * scale + 'px';
      percent.textContent = Math.round(scale * 100) + '%';
    }

    function zoomBy(factor) {
      var next = currentScale() * factor;
      state.scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, next));
      apply();
    }

    makeButton('−', t('zoomOut', 'Zoom out'), function () { zoomBy(1 / SCALE_STEP); });
    var percent = makeButton('100%', t('zoomReset', 'Actual size'), function () {
      state.scale = 1;
      apply();
    });
    percent.classList.add('zoom-percent');
    makeButton('+', t('zoomIn', 'Zoom in'), function () { zoomBy(SCALE_STEP); });
    makeButton(t('zoomFit', 'Fit width'), t('zoomFit', 'Fit width'), function () {
      state.scale = null;
      apply();
    });

    container.parentNode.insertBefore(bar, container);
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (state.scale === null) apply();
      }).observe(container);
    } else {
      window.addEventListener('resize', function () {
        if (state.scale === null) apply();
      });
    }

    return {
      setSvg: function (svg, width, height) {
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        state.svg = svg;
        state.w = width;
        state.h = height;
        apply();
      }
    };
  }

  function jumpToNode(section, nodeId, label) {
    var target = null;
    var candidates = document.querySelectorAll(
      '#plan-content [data-semantic-node-id="' + cssEscape(nodeId) + '"]'
    );
    for (var i = 0; i < candidates.length; i++) {
      if (!section.contains(candidates[i])) {
        target = candidates[i];
        break;
      }
    }
    if (target) {
      var host = target.closest('section[data-priority="secondary"]');
      if (host) host.classList.remove('collapsed');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    } else {
      document.dispatchEvent(
        new CustomEvent('plan:node-selected', {
          detail: {
            nodeId: nodeId,
            title: label,
            viewId: section.getAttribute('data-view-id'),
            selectedText: null
          }
        })
      );
    }
  }

  window.PlanGraphSupport = { attachZoom: attachZoom, jumpToNode: jumpToNode };
})();
