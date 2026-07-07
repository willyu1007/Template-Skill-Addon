/**
 * plan-html-visualizer — feedback script.
 *
 * Classic script (no import/export); inline into the artifact as-is.
 * Records pending feedback events into the `plan-pending-feedback` JSON block
 * (the only part of the artifact that may change after generation) and
 * persists them via File System Access API, with download-replace and
 * copy-to-chat fallbacks. Does not classify or interpret feedback and does
 * not allow editing rendered content.
 *
 * See reference/feedback-protocol.md for the event schema and lifecycle.
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

  function readStore() {
    var block = document.getElementById('plan-pending-feedback');
    if (!block) return { entries: [] };
    try {
      var parsed = JSON.parse(block.textContent);
      if (parsed && Array.isArray(parsed.entries)) return parsed;
    } catch (_err) {
      /* fall through to empty store */
    }
    return { entries: [] };
  }

  function writeStore(store) {
    var block = document.getElementById('plan-pending-feedback');
    if (block) block.textContent = JSON.stringify(store, null, 2);
  }

  function artifactFilename() {
    var path = window.location.pathname;
    var name = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1));
    return name || 'plan.html';
  }

  function serializeArtifact() {
    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('[data-generated-container]').forEach(function (el) {
      el.textContent = '';
    });
    clone.querySelectorAll('[data-generated-ui]').forEach(function (el) {
      el.remove();
    });
    clone.querySelectorAll('.is-selected').forEach(function (el) {
      el.classList.remove('is-selected');
    });
    var body = clone.querySelector('#feedback-body');
    if (body) body.hidden = true;
    return '<!DOCTYPE html>\n' + clone.outerHTML + '\n';
  }

  function t(key) {
    if (window.PlanI18n && typeof window.PlanI18n.t === 'function') {
      return window.PlanI18n.t(key);
    }
    return key;
  }

  function initFeedback() {
    var panel = document.getElementById('feedback-panel');
    if (!panel) return;

    var toggle = document.getElementById('feedback-toggle');
    var body = document.getElementById('feedback-body');
    var count = document.getElementById('feedback-count');
    var targetLabel = document.getElementById('feedback-target');
    var textarea = document.getElementById('feedback-text');
    var addButton = document.getElementById('feedback-add');
    var pendingList = document.getElementById('feedback-pending');
    var saveButton = document.getElementById('feedback-save');
    var copyButton = document.getElementById('feedback-copy');
    var status = document.getElementById('feedback-status');

    var store = readStore();
    var selected = null;

    function setStatus(message) {
      if (status) status.textContent = message || '';
    }

    function refreshAddState() {
      addButton.disabled = !(selected && textarea.value.trim());
    }

    function renderPending() {
      count.textContent = String(store.entries.length);
      pendingList.textContent = '';
      store.entries.forEach(function (entry, index) {
        var item = document.createElement('li');
        var node = document.createElement('code');
        node.textContent = entry.nodeId;
        var text = document.createElement('p');
        text.textContent = entry.feedback;
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = t('remove');
        remove.addEventListener('click', function () {
          store.entries.splice(index, 1);
          writeStore(store);
          renderPending();
        });
        item.appendChild(node);
        item.appendChild(text);
        item.appendChild(remove);
        pendingList.appendChild(item);
      });
    }

    document.addEventListener('plan:node-selected', function (event) {
      selected = event.detail;
      targetLabel.removeAttribute('data-i18n');
      targetLabel.textContent = '';
      var title = document.createTextNode(selected.title + ' ');
      var id = document.createElement('code');
      id.textContent = selected.nodeId;
      targetLabel.appendChild(title);
      targetLabel.appendChild(id);
      if (body.hidden) body.hidden = false;
      refreshAddState();
    });

    textarea.addEventListener('input', refreshAddState);

    toggle.addEventListener('click', function () {
      body.hidden = !body.hidden;
    });

    addButton.addEventListener('click', function () {
      if (!selected || !textarea.value.trim()) return;
      var entry = {
        nodeId: selected.nodeId,
        feedback: textarea.value.trim(),
        createdAt: new Date().toISOString()
      };
      if (selected.selectedText) entry.selectedText = selected.selectedText;
      if (selected.viewId) entry.viewId = selected.viewId;
      store.entries.push(entry);
      writeStore(store);
      renderPending();
      textarea.value = '';
      refreshAddState();
      setStatus(t('statusAdded'));
    });

    saveButton.addEventListener('click', function () {
      var html = serializeArtifact();
      if (window.showSaveFilePicker) {
        window
          .showSaveFilePicker({
            suggestedName: artifactFilename(),
            types: [{ description: 'HTML artifact', accept: { 'text/html': ['.html'] } }]
          })
          .then(function (handle) {
            return handle.createWritable().then(function (writable) {
              return writable.write(html).then(function () {
                return writable.close();
              });
            });
          })
          .then(function () {
            setStatus(t('statusSaved'));
          })
          .catch(function (err) {
            if (err && err.name === 'AbortError') return;
            downloadFallback(html);
          });
        return;
      }
      downloadFallback(html);
    });

    function downloadFallback(html) {
      var blob = new Blob([html], { type: 'text/html' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = artifactFilename();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus(t('statusDownloaded'));
    }

    copyButton.addEventListener('click', function () {
      var json = JSON.stringify(readStore(), null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(
          function () {
            setStatus(t('statusCopied'));
          },
          function () {
            setStatus(t('statusCopyFailed'));
          }
        );
      } else {
        setStatus(t('statusClipboardUnavailable'));
      }
    });

    renderPending();
    refreshAddState();
  }

  ready(initFeedback);
})();
