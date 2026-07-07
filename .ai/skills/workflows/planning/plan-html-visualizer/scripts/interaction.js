/**
 * plan-html-visualizer — interaction script.
 *
 * Classic script (no import/export); inline into the artifact as-is.
 * Handles selecting plan areas for feedback: clicking an element with
 * `data-semantic-node-id` marks it selected and dispatches a
 * `plan:node-selected` event consumed by the feedback script.
 * Also collapses secondary sections (data-priority="secondary") by default.
 * To avoid select-vs-toggle conflicts: clicking the heading of a collapsed
 * section expands it (no selection); once expanded, heading clicks select the
 * section like anywhere else, and collapsing goes through a dedicated arrow
 * button injected next to the heading.
 * Does not interpret feedback and does not allow editing rendered content.
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function initInteraction() {
    var content = document.getElementById('plan-content');
    if (!content) return;

    content.querySelectorAll('section[data-priority="secondary"]').forEach(function (section) {
      section.classList.add('collapsed');
      var heading = section.querySelector('h2');
      if (!heading) return;

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'section-toggle';
      toggle.setAttribute('data-generated-ui', '');
      toggle.setAttribute('aria-label', 'Toggle section');
      toggle.addEventListener('click', function (event) {
        event.stopPropagation();
        section.classList.toggle('collapsed');
      });
      heading.appendChild(toggle);

      heading.addEventListener('click', function (event) {
        if (section.classList.contains('collapsed')) {
          event.stopPropagation();
          section.classList.remove('collapsed');
        }
      });
    });

    content.addEventListener('click', function (event) {
      // Interactive controls (links, buttons, details toggles) never select.
      if (event.target.closest('a, button, summary')) return;

      var target = event.target.closest('[data-semantic-node-id]');
      if (!target || !content.contains(target)) return;

      content.querySelectorAll('.is-selected').forEach(function (el) {
        el.classList.remove('is-selected');
      });
      target.classList.add('is-selected');

      var heading = target.querySelector('h2, h3, h4');
      var view = target.closest('[data-view-id]');
      var selection = window.getSelection ? String(window.getSelection()).trim() : '';

      document.dispatchEvent(
        new CustomEvent('plan:node-selected', {
          detail: {
            nodeId: target.getAttribute('data-semantic-node-id'),
            title: heading
              ? heading.textContent.trim()
              : target.textContent.trim().slice(0, 80),
            viewId: view ? view.getAttribute('data-view-id') : null,
            selectedText: selection || null
          }
        })
      );
    });
  }

  ready(initInteraction);
})();
