// ============================================================
// KnotLab — Tab navigation & module initialization
// ============================================================

(function () {
  'use strict';

  var initialized = {};

  var modules = {
    'home':                   { fn: 'renderIntroduction',          root: 'home-root' },
    'gauss-linking':          { fn: 'renderGaussLinking',          root: 'gauss-linking-root' },
    'polynomial-invariants':  { fn: 'renderPolynomialInvariants',  root: 'polynomial-invariants-root' },
    'homological-invariants': { fn: 'renderHomologicalInvariants', root: 'homological-invariants-root' },
    'miscellaneous':          { fn: 'renderMiscellaneous',         root: 'miscellaneous-root' },
    'appendix':               { fn: 'renderAppendix',              root: 'appendix-root' }
  };

  // ── Tab switching ──
  window.switchTab = function (tabId) {
    document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });

    var tab = document.getElementById('tab-' + tabId);
    if (tab) tab.classList.add('active');

    var btn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
    if (btn) btn.classList.add('active');

    // Initialize native modules on first visit
    if (modules[tabId] && !initialized[tabId]) {
      initialized[tabId] = true;
      var fn = window[modules[tabId].fn];
      if (typeof fn === 'function') {
        fn(document.getElementById(modules[tabId].root));
      }
    }

    // Lazy-load knot explorer iframe and hide its header
    if (tabId === 'knot-explorer') {
      var frame = document.getElementById('frame-knot-explorer');
      if (frame) {
        if (frame.src === 'about:blank' && frame.dataset.src) {
          frame.src = frame.dataset.src;
        }
        // Hide the knot-explorer header once iframe content is ready
        var hideCheck = setInterval(function () {
          try {
            var doc = frame.contentDocument;
            if (doc && doc.querySelector('header')) {
              doc.querySelector('header').style.display = 'none';
              clearInterval(hideCheck);
            }
          } catch (e) { clearInterval(hideCheck); }
        }, 200);
      }
    }

    window.location.hash = tabId;
  };

  // ── Hash routing ──
  function loadFromHash() {
    var hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById('tab-' + hash)) {
      switchTab(hash);
    }
  }

  window.addEventListener('hashchange', loadFromHash);
  if (window.location.hash) loadFromHash();

  // ── KaTeX auto-render ──
  function renderMath() {
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\(', right: '\\)', display: false },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }
  }

  document.addEventListener('DOMContentLoaded', renderMath);
  window.addEventListener('load', renderMath);
})();
