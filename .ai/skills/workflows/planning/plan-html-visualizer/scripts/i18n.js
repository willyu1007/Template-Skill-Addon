/**
 * plan-html-visualizer — i18n script.
 *
 * Classic script (no import/export); inline into the artifact FIRST, before
 * the other scripts. Localizes fixed UI chrome based on <html lang> and
 * exposes `window.PlanI18n` for the other scripts.
 *
 * Supported languages: zh-CN (default), en. The artifact language is
 * configured in SKILL.md (`artifact_language`) and written into <html lang>
 * at generation time.
 */
(function () {
  'use strict';

  var DICTS = {
    'zh-CN': {
      sections: '目录',
      expandAll: '全部展开',
      collapseAll: '全部折叠',
      feedbackLabel: '反馈',
      feedbackHint: '点击计划中的任意区块选中它，然后用自然语言描述你的反馈。',
      noSelection: '尚未选择区块。',
      feedbackPlaceholder: '针对选中区块输入反馈…',
      addFeedback: '添加反馈',
      saveToFile: '保存到文件',
      copyJson: '复制为 JSON',
      remove: '删除',
      statusAdded: '反馈已添加。完成后请保存文件。',
      statusSaved: '已保存。请将文件交回给编码智能体。',
      statusDownloaded: '已下载。请用它替换原 artifact 文件。',
      statusCopied: '已复制。请粘贴到与编码智能体的对话中。',
      statusCopyFailed: '复制失败——请手动复制 plan-pending-feedback 块。',
      statusClipboardUnavailable: '剪贴板不可用——请手动复制 plan-pending-feedback 块。',
      zoomIn: '放大',
      zoomOut: '缩小',
      zoomFit: '适应宽度',
      zoomReset: '原始大小',
      before: '变更前',
      after: '变更后',
      details: '详情',
      decision: '决策：',
      tradeOffs: '权衡',
      alternatives: '备选方案',
      mitigation: '缓解措施：'
    },
    en: {
      sections: 'Sections',
      expandAll: 'Expand all',
      collapseAll: 'Collapse all',
      feedbackLabel: 'Feedback',
      feedbackHint: 'Click a section in the plan to target it, then describe your feedback in your own words.',
      noSelection: 'No section selected yet.',
      feedbackPlaceholder: 'Type feedback for the selected section...',
      addFeedback: 'Add feedback',
      saveToFile: 'Save into file',
      copyJson: 'Copy as JSON',
      remove: 'Remove',
      statusAdded: 'Feedback added. Save the file when you are done.',
      statusSaved: 'Saved. Hand the file back to the coding agent.',
      statusDownloaded: 'Downloaded. Replace the original artifact file with it.',
      statusCopied: 'Copied. Paste it into the conversation with the coding agent.',
      statusCopyFailed: 'Copy failed — copy the plan-pending-feedback block manually.',
      statusClipboardUnavailable: 'Clipboard unavailable — copy the plan-pending-feedback block manually.',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      zoomFit: 'Fit width',
      zoomReset: 'Actual size',
      before: 'Before',
      after: 'After',
      details: 'Details',
      decision: 'Decision:',
      tradeOffs: 'Trade-offs',
      alternatives: 'Alternatives considered',
      mitigation: 'Mitigation:'
    }
  };

  function normalize(lang) {
    if (lang && lang.toLowerCase().indexOf('en') === 0) return 'en';
    return 'zh-CN';
  }

  var lang = normalize(document.documentElement.lang);
  var dict = DICTS[lang];

  function t(key) {
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    if (Object.prototype.hasOwnProperty.call(DICTS.en, key)) return DICTS.en[key];
    return key;
  }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
  }

  window.PlanI18n = { lang: lang, t: t };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
