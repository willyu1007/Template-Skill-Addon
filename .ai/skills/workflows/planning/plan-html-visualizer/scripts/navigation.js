/**
 * plan-html-visualizer — navigation script.
 *
 * Classic script (no import/export); inline into the artifact as-is.
 * Builds the section nav from top-level sections in #plan-content, highlights
 * the section currently in view, and wires the expand/collapse-all buttons.
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

  function slugify(text, index) {
    var slug = String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'section-' + index;
  }

  function initNavigation() {
    var content = document.getElementById('plan-content');
    var navList = document.getElementById('plan-nav-list');
    if (!content || !navList) return;

    navList.textContent = '';
    var suppressObserverUntil = 0;
    var sections = Array.prototype.slice.call(content.querySelectorAll(':scope > section'));

    sections.forEach(function (section, index) {
      var heading = section.querySelector('h2, h3');
      var label = heading ? heading.textContent.trim() : 'Section ' + (index + 1);
      if (!section.id) section.id = slugify(label, index);

      var item = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#' + section.id;
      link.textContent = label;
      if (section.getAttribute('data-priority') === 'secondary') {
        item.className = 'nav-secondary';
      }
      link.addEventListener('click', function () {
        // Expand a collapsed target before jumping, and highlight the clicked
        // item immediately instead of waiting for the scroll observer (which
        // never fires for sections that cannot reach the viewport band).
        section.classList.remove('collapsed');
        navList.querySelectorAll('a').forEach(function (other) {
          other.removeAttribute('aria-current');
        });
        link.setAttribute('aria-current', 'true');
        // Keep the scroll observer from re-highlighting sections the smooth
        // scroll merely passes over.
        suppressObserverUntil = Date.now() + 1200;
      });
      item.appendChild(link);
      navList.appendChild(item);
    });

    var links = Array.prototype.slice.call(navList.querySelectorAll('a'));
    if ('IntersectionObserver' in window && sections.length) {
      var byId = {};
      links.forEach(function (link) {
        byId[link.hash.slice(1)] = link;
      });
      var observer = new IntersectionObserver(
        function (entries) {
          if (Date.now() < suppressObserverUntil) return;
          entries.forEach(function (entry) {
            var link = byId[entry.target.id];
            if (!link || !entry.isIntersecting) return;
            links.forEach(function (other) {
              other.removeAttribute('aria-current');
            });
            link.setAttribute('aria-current', 'true');
          });
        },
        { rootMargin: '-35% 0px -55% 0px' }
      );
      sections.forEach(function (section) {
        observer.observe(section);
      });
    }

    function setAllDetails(open) {
      content.querySelectorAll('details').forEach(function (details) {
        details.open = open;
      });
      content.querySelectorAll('section[data-priority="secondary"]').forEach(function (section) {
        section.classList.toggle('collapsed', !open);
      });
    }
    var expandAll = document.getElementById('expand-all');
    var collapseAll = document.getElementById('collapse-all');
    if (expandAll) expandAll.addEventListener('click', function () { setAllDetails(true); });
    if (collapseAll) collapseAll.addEventListener('click', function () { setAllDetails(false); });
  }

  ready(initNavigation);
})();
