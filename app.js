// ============================================================
// KnotLab — Tab navigation, module initialization, admin mode
// ============================================================

(function () {
  'use strict';

  var initialized = {};
  var overrides = {};           // { tabId: { editId: html } }
  var overridesReady = false;
  var pendingTabs = [];         // tabs rendered before overrides arrived

  // Elements we treat as editable text blocks.
  var EDITABLE_SEL = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,div.formula-box,[data-editable]';

  var modules = {
    'home':                   { fn: 'renderIntroduction',          root: 'home-root' },
    'gauss-linking':          { fn: 'renderGaussLinking',          root: 'gauss-linking-root' },
    'polynomial-invariants':  { fn: 'renderPolynomialInvariants',  root: 'polynomial-invariants-root' },
    'homological-invariants': { fn: 'renderHomologicalInvariants', root: 'homological-invariants-root' },
    'miscellaneous':          { fn: 'renderMiscellaneous',         root: 'miscellaneous-root' },
    'appendix':               { fn: 'renderAppendix',              root: 'appendix-root' }
  };

  // ── Admin mode state ──
  var adminMode = /[?&]admin=1\b/.test(window.location.search) ||
                  localStorage.getItem('knotlab.admin') === '1';

  // ── Fetch content (committed baseline) + overrides (working layer) ──
  // content.json is the permanent merged result of previous /admin/commit calls.
  // overrides.json is the live working layer. Overrides win on conflict.
  function mergeContentAndOverrides(content, overr) {
    var merged = {};
    var deletes = (overr && overr._deletes) || {};
    function isDeletedEdit(tab, id) { return (deletes[tab] || []).indexOf(id) >= 0; }
    function isDeletedInsert(tab, id) {
      return ((deletes._inserts || {})[tab] || []).indexOf(id) >= 0;
    }
    function mergeTab(src) {
      Object.keys(src || {}).forEach(function (k) {
        if (k === '_inserts' || k === '_snippets' || k === '_deletes') return;
        merged[k] = merged[k] || {};
        Object.keys(src[k] || {}).forEach(function (id) {
          if (isDeletedEdit(k, id)) return;
          merged[k][id] = src[k][id];
        });
      });
    }
    mergeTab(content); mergeTab(overr);
    // _inserts (by id).
    merged._inserts = {};
    function mergeIns(src) {
      var root = (src && src._inserts) || {};
      Object.keys(root).forEach(function (tab) {
        merged._inserts[tab] = merged._inserts[tab] || [];
        var byId = {};
        merged._inserts[tab].forEach(function (r, i) { byId[r.id] = i; });
        root[tab].forEach(function (r) {
          if (isDeletedInsert(tab, r.id)) return;
          if (r.id in byId) merged._inserts[tab][byId[r.id]] = r;
          else merged._inserts[tab].push(r);
        });
      });
    }
    mergeIns(content); mergeIns(overr);
    // _snippets (by name).
    merged._snippets = [];
    var byName = {};
    function mergeSnip(src) {
      ((src && src._snippets) || []).forEach(function (s) {
        if (s.name in byName) merged._snippets[byName[s.name]] = s;
        else { byName[s.name] = merged._snippets.length; merged._snippets.push(s); }
      });
    }
    mergeSnip(content); mergeSnip(overr);
    return merged;
  }

  Promise.all([
    fetch('content.json',   { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch('overrides.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (arr) {
    overrides = mergeContentAndOverrides(arr[0] || {}, arr[1] || {});
    overridesReady = true;
    pendingTabs.forEach(function (tabId) { observeTab(tabId); });
    pendingTabs = [];
  });

  var observed = {};

  function observeTab(tabId) {
    if (observed[tabId]) return;
    var mod = modules[tabId];
    if (!mod) return;
    var root = document.getElementById(mod.root);
    if (!root) return;
    observed[tabId] = true;

    var pending = false;
    function scheduleProcess() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; processTab(tabId); });
    }
    var mo = new MutationObserver(scheduleProcess);
    mo.observe(root, { childList: true, subtree: true });
    processTab(tabId);
  }

  // Short, stable hash for ID generation. Content-based IDs ensure a
  // paragraph keeps the same edit-id across subtabs / re-renders, and that
  // overrides don't leak to whatever is at positional index N elsewhere.
  function hashStr(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  // Walk editable elements, tag them, apply overrides, enable admin UI.
  function processTab(tabId) {
    var mod = modules[tabId];
    if (!mod) return;
    var root = document.getElementById(mod.root);
    if (!root) return;

    var tabOverrides = overrides[tabId] || {};
    var nodes = root.querySelectorAll(EDITABLE_SEL);
    var seen = {};

    nodes.forEach(function (el) {
      // Skip elements inside interactive controls (labels with inputs, etc.).
      if (el.closest('[data-edit-skip]')) return;
      // Exclude real interactive controls, but ignore admin-injected buttons.
      var ctrl = el.querySelector('input, select, textarea, button');
      if (ctrl && !ctrl.classList.contains('admin-insert-btn') && !ctrl.classList.contains('admin-delete-btn')) return;
      // Never re-index user-inserted elements — their IDs are stable.
      if (el.hasAttribute('data-inserted')) return;

      // Compute a content-based hash id. Once set, it's stable — never
      // recompute, because later DOM mutations (admin insert-buttons,
      // user edits) change textContent and would produce a different hash.
      var id = el.getAttribute('data-edit-id');
      if (!id) {
        // Exclude admin-injected button text from the seed so hashes are
        // identical regardless of admin mode.
        var clone = el.cloneNode(true);
        clone.querySelectorAll('.admin-insert-btn, .admin-delete-btn').forEach(function (b) { b.remove(); });
        var seed = el.tagName + '|' + (clone.textContent || '').trim();
        var base = hashStr(seed);
        var h = base;
        var n = 0;
        while (seen[h]) { n++; h = base + '-' + n; }
        seen[h] = true;
        id = tabId + '::h' + h;
        el.setAttribute('data-edit-id', id);
      } else {
        // Track id in seen so fresh nodes later don't collide.
        var existing = id.replace(tabId + '::h', '');
        seen[existing] = true;
      }

      // Capture raw source (with \( ... \) etc.) BEFORE KaTeX rewrites it,
      // unless it's already been captured.
      if (!el.hasAttribute('data-raw')) {
        el.setAttribute('data-raw', el.innerHTML);
      }

      // Apply override, if present and not already applied.
      if (Object.prototype.hasOwnProperty.call(tabOverrides, id) &&
          el.getAttribute('data-override-applied') !== id) {
        el.innerHTML = tabOverrides[id];
        unbreakMathInElement(el);
        el.setAttribute('data-raw', el.innerHTML);
        el.setAttribute('data-edited', '1');
        el.setAttribute('data-override-applied', id);
      }

      if (adminMode) attachEditor(el, tabId, id);
    });

    // Apply saved insertions for this tab.
    var inserts = (overrides._inserts && overrides._inserts[tabId]) || [];
    inserts.forEach(function (rec) {
      if (root.querySelector('[data-edit-id="' + cssEscape(rec.id) + '"]')) return;
      var anchor = root.querySelector('[data-edit-id="' + cssEscape(rec.after) + '"]');
      if (!anchor) return;
      var el = document.createElement(rec.tag || 'p');
      el.setAttribute('data-edit-id', rec.id);
      el.setAttribute('data-inserted', '1');
      el.innerHTML = rec.html || '';
      unbreakMathInElement(el);
      el.setAttribute('data-raw', el.innerHTML);
      anchor.parentNode.insertBefore(el, anchor.nextSibling);
      if (adminMode) attachEditor(el, tabId, rec.id);
    });

    if (adminMode) addInsertButtons(root, tabId);

    // Render math within the tab root — but skip if the user is mid-edit,
    // otherwise KaTeX would rewrite the contenteditable's source into rendered
    // HTML and that rendered HTML would get saved back as data-raw on blur.
    if (typeof renderMathInElement === 'function' && !root.querySelector('.admin-editing')) {
      renderMathInElement(root, katexOpts());
    }
  }

  function cssEscape(s) {
    return String(s).replace(/["\\]/g, '\\$&');
  }

  // ── Insert buttons ──
  function addInsertButtons(root, tabId) {
    root.querySelectorAll('[data-edit-id]').forEach(function (el) {
      if (el.dataset.insertBtnWired) return;
      el.dataset.insertBtnWired = '1';

      var btn = document.createElement('button');
      btn.className = 'admin-insert-btn';
      btn.type = 'button';
      btn.title = 'Insert new element below';
      btn.textContent = '+';
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        showInsertMenu(btn, el, tabId);
      });
      el.appendChild(btn);

      // Delete button for user-inserted elements.
      if (el.hasAttribute('data-inserted')) {
        var del = document.createElement('button');
        del.className = 'admin-delete-btn';
        del.type = 'button';
        del.title = 'Delete this inserted element';
        del.textContent = '×';
        del.addEventListener('click', function (ev) {
          ev.stopPropagation();
          if (!confirm('Delete this inserted element?')) return;
          deleteInsert(tabId, el.getAttribute('data-edit-id'), el);
        });
        el.appendChild(del);
      }
    });
  }

  function showInsertMenu(anchorBtn, afterEl, tabId) {
    var existing = document.getElementById('admin-insert-menu');
    if (existing) existing.remove();

    var menu = document.createElement('div');
    menu.id = 'admin-insert-menu';
    menu.innerHTML =
      '<button data-tag="p">Paragraph</button>' +
      '<button data-tag="h2">Heading 2</button>' +
      '<button data-tag="h3">Heading 3</button>' +
      '<button data-tag="h4">Heading 4</button>' +
      '<button data-tag="blockquote">Quote</button>' +
      '<button data-tag="p" data-eq="1">Display equation ($$…$$)</button>';
    document.body.appendChild(menu);

    var r = anchorBtn.getBoundingClientRect();
    menu.style.top = (window.scrollY + r.bottom + 4) + 'px';
    menu.style.left = (window.scrollX + r.left) + 'px';

    menu.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var tag = b.getAttribute('data-tag');
        var isEq = b.getAttribute('data-eq') === '1';
        menu.remove();
        createInsert(tabId, afterEl, tag, isEq);
      });
    });

    setTimeout(function () {
      document.addEventListener('click', function dismiss(ev) {
        if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', dismiss); }
      });
    }, 0);
  }

  function createInsert(tabId, afterEl, tag, isEquation) {
    var id = 'ins_' + Math.random().toString(36).slice(2, 10);
    var editId = 'ins::' + tabId + '::' + id;
    var initialHtml = isEquation ? '$$  $$' : 'New ' + tag + '…';

    var el = document.createElement(tag);
    el.setAttribute('data-edit-id', editId);
    el.setAttribute('data-inserted', '1');
    el.setAttribute('data-raw', initialHtml);
    el.innerHTML = initialHtml;
    afterEl.parentNode.insertBefore(el, afterEl.nextSibling);
    attachEditor(el, tabId, editId);
    addInsertButtons(el.parentNode, tabId);

    // Persist the insertion immediately so its id survives reloads.
    saveInsert(tabId, {
      id: editId,
      after: afterEl.getAttribute('data-edit-id'),
      tag: tag,
      html: initialHtml
    }, function () {
      enterEdit(el, tabId, editId);
    });
  }

  function saveInsert(tabId, rec, cb) {
    setStatus('Saving insert…');
    fetch('/admin/insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tab: tabId, id: rec.id, after: rec.after, tag: rec.tag, html: rec.html
      })
    }).then(function (r) { return r.json(); })
      .then(function () {
        if (!overrides._inserts) overrides._inserts = {};
        if (!overrides._inserts[tabId]) overrides._inserts[tabId] = [];
        var list = overrides._inserts[tabId];
        var found = false;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === rec.id) { list[i] = rec; found = true; break; }
        }
        if (!found) list.push(rec);
        setStatus('Saved ✓', 1200);
        if (cb) cb();
      })
      .catch(function (err) { setStatus('Insert save failed: ' + err.message, 4000); });
  }

  function deleteInsert(tabId, editId, el) {
    fetch('/admin/insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab: tabId, id: editId, action: 'delete' })
    }).then(function (r) { return r.json(); })
      .then(function () {
        if (overrides._inserts && overrides._inserts[tabId]) {
          overrides._inserts[tabId] = overrides._inserts[tabId].filter(function (r) { return r.id !== editId; });
        }
        el.remove();
        setStatus('Deleted ✓', 1500);
      })
      .catch(function (err) { setStatus('Delete failed: ' + err.message, 4000); });
  }

  function katexOpts() {
    return {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    };
  }

  // ── Admin editor attachment ──
  function attachEditor(el, tabId, id) {
    if (el.dataset.adminWired) return;
    el.dataset.adminWired = '1';
    el.classList.add('admin-editable');

    el.addEventListener('click', function onClick(ev) {
      if (el.isContentEditable) return;
      ev.stopPropagation();
      enterEdit(el, tabId, id);
    });
  }

  // If data-raw (or live innerHTML) contains KaTeX-rendered HTML, rebuild
  // the LaTeX source from the <annotation encoding="application/x-tex"> tags
  // that KaTeX leaves behind. This lets us recover sources even when the
  // module rendered KaTeX before our observer captured data-raw.
  // Strip <br>s that fell inside math delimiters — KaTeX auto-render
  // can't match $$…$$ or \(…\) across <br> element boundaries.
  function unbreakMathInElement(root) {
    var html = root.innerHTML;
    function scrub(open, close) {
      var result = '', i = 0;
      while (i < html.length) {
        var a = html.indexOf(open, i);
        if (a < 0) { result += html.slice(i); break; }
        var b = html.indexOf(close, a + open.length);
        if (b < 0) { result += html.slice(i); break; }
        result += html.slice(i, a);
        var inner = html.slice(a + open.length, b).replace(/<br\s*\/?>/gi, '\n');
        result += open + inner + close;
        i = b + close.length;
      }
      html = result;
    }
    scrub('$$', '$$');
    scrub('\\(', '\\)');
    root.innerHTML = html;
  }

  function unrenderKatex(html) {
    var container = document.createElement('div');
    container.innerHTML = html;
    if (!container.querySelector('.katex, .katex-display')) return html;
    // Walk children; replace each .katex-display with $$src$$ and each .katex with \(src\).
    var walkers = container.querySelectorAll('.katex-display, .katex');
    // Outer-first: process .katex-display (which wraps .katex inside).
    Array.from(walkers).forEach(function (node) {
      if (!container.contains(node)) return; // already replaced via ancestor
      var ann = node.querySelector('annotation[encoding="application/x-tex"]');
      if (!ann) return;
      var src = ann.textContent;
      var isDisplay = node.classList.contains('katex-display') ||
                      (node.parentElement && node.parentElement.classList.contains('katex-display'));
      var replacement = isDisplay ? ('$$' + src + '$$') : ('\\(' + src + '\\)');
      var txt = document.createTextNode(replacement);
      // Replace the outermost KaTeX wrapper.
      var outer = node.closest('.katex-display') || node;
      outer.parentNode.replaceChild(txt, outer);
    });
    return container.innerHTML;
  }

  function enterEdit(el, tabId, id) {
    // Swap in the raw source (so user edits the real markup / LaTeX).
    var raw = el.getAttribute('data-raw') || el.innerHTML;
    // If raw still has rendered KaTeX (module rendered before we captured),
    // reconstruct the source from KaTeX's annotation tags.
    if (/class="[^"]*\bkatex\b/.test(raw)) {
      raw = unrenderKatex(raw);
      el.setAttribute('data-raw', raw);
    }
    el.innerHTML = raw;
    // plaintext-only prevents Chromium from wrapping new lines in <div>/<pre>,
    // which KaTeX's auto-render ignores. Fallback to 'true' on Firefox.
    el.contentEditable = 'plaintext-only';
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.classList.add('admin-editing');
    el.focus();

    function finish(save) {
      el.removeEventListener('blur', onBlur);
      el.removeEventListener('keydown', onKey);
      el.contentEditable = 'false';
      el.classList.remove('admin-editing');
      // Normalize: unwrap <pre>/<code>/<div> that contenteditable may inject,
      // since KaTeX auto-render ignores <pre>/<code> by default.
      // Strip any admin-injected buttons that may have been inside raw.
      el.querySelectorAll('.admin-insert-btn, .admin-delete-btn').forEach(function (n) { n.remove(); });
      el.querySelectorAll('pre, code, div').forEach(function (n) {
        var frag = document.createDocumentFragment();
        while (n.firstChild) frag.appendChild(n.firstChild);
        if (n.tagName === 'DIV' && n.parentNode) frag.appendChild(document.createElement('br'));
        n.replaceWith(frag);
      });
      // plaintext-only contenteditable inserts real "\n" in text nodes on
      // Enter. HTML collapses those to whitespace, so convert them to <br>.
      (function newlinesToBr(root) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        var batch = [];
        while (walker.nextNode()) {
          var n = walker.currentNode;
          if (n.nodeValue.indexOf('\n') >= 0) batch.push(n);
        }
        batch.forEach(function (n) {
          var parts = n.nodeValue.split('\n');
          var frag = document.createDocumentFragment();
          parts.forEach(function (p, i) {
            if (i > 0) frag.appendChild(document.createElement('br'));
            if (p) frag.appendChild(document.createTextNode(p));
          });
          n.parentNode.replaceChild(frag, n);
        });
      })(el);
      unbreakMathInElement(el);
      var newRaw = el.innerHTML;

      var forced = !!(editorState && editorState.el === el && editorState.force);
      if (save && (newRaw !== raw || forced)) {
        el.setAttribute('data-raw', newRaw);
        el.setAttribute('data-edited', '1');
        if (id.indexOf('ins::') === 0) {
          // Re-persist inserted element with new HTML, keeping its anchor/tag.
          var list = (overrides._inserts && overrides._inserts[tabId]) || [];
          var rec = null;
          for (var i = 0; i < list.length; i++) if (list[i].id === id) { rec = list[i]; break; }
          if (rec) saveInsert(tabId, { id: id, after: rec.after, tag: rec.tag, html: newRaw });
        } else {
          saveOverride(tabId, id, newRaw);
        }
      } else if (!save) {
        el.innerHTML = raw;
      }
      // Re-render KaTeX on this element.
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(el, katexOpts());
      }
    }

    editorState = { el: el, tabId: tabId, id: id, suppressBlur: false, finish: finish };
    function onBlur() {
      if (editorState && editorState.el === el && editorState.suppressBlur) return;
      finish(true);
      if (editorState && editorState.el === el) editorState = null;
    }
    function onKey(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
      // Ctrl/Cmd+Enter = commit.
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
        ev.preventDefault(); el.blur();
      }
    }
    el.addEventListener('blur', onBlur);
    el.addEventListener('keydown', onKey);
    // Equation editor: Ctrl+M while editing.
    el.addEventListener('keydown', function eqKey(ev) {
      if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'm' || ev.key === 'M')) {
        ev.preventDefault();
        openEquationEditor(el);
      }
    });
  }

  // ── Built-in LaTeX snippets ──
  var BUILTIN_SNIPPETS = [
    // Greek lowercase
    { group: 'Greek (lower)', name: 'α', latex: '\\alpha' },
    { group: 'Greek (lower)', name: 'β', latex: '\\beta' },
    { group: 'Greek (lower)', name: 'γ', latex: '\\gamma' },
    { group: 'Greek (lower)', name: 'δ', latex: '\\delta' },
    { group: 'Greek (lower)', name: 'ε', latex: '\\varepsilon' },
    { group: 'Greek (lower)', name: 'ζ', latex: '\\zeta' },
    { group: 'Greek (lower)', name: 'η', latex: '\\eta' },
    { group: 'Greek (lower)', name: 'θ', latex: '\\theta' },
    { group: 'Greek (lower)', name: 'κ', latex: '\\kappa' },
    { group: 'Greek (lower)', name: 'λ', latex: '\\lambda' },
    { group: 'Greek (lower)', name: 'μ', latex: '\\mu' },
    { group: 'Greek (lower)', name: 'ν', latex: '\\nu' },
    { group: 'Greek (lower)', name: 'ξ', latex: '\\xi' },
    { group: 'Greek (lower)', name: 'π', latex: '\\pi' },
    { group: 'Greek (lower)', name: 'ρ', latex: '\\rho' },
    { group: 'Greek (lower)', name: 'σ', latex: '\\sigma' },
    { group: 'Greek (lower)', name: 'τ', latex: '\\tau' },
    { group: 'Greek (lower)', name: 'φ', latex: '\\varphi' },
    { group: 'Greek (lower)', name: 'χ', latex: '\\chi' },
    { group: 'Greek (lower)', name: 'ψ', latex: '\\psi' },
    { group: 'Greek (lower)', name: 'ω', latex: '\\omega' },
    // Greek uppercase
    { group: 'Greek (upper)', name: 'Γ', latex: '\\Gamma' },
    { group: 'Greek (upper)', name: 'Δ', latex: '\\Delta' },
    { group: 'Greek (upper)', name: 'Θ', latex: '\\Theta' },
    { group: 'Greek (upper)', name: 'Λ', latex: '\\Lambda' },
    { group: 'Greek (upper)', name: 'Ξ', latex: '\\Xi' },
    { group: 'Greek (upper)', name: 'Π', latex: '\\Pi' },
    { group: 'Greek (upper)', name: 'Σ', latex: '\\Sigma' },
    { group: 'Greek (upper)', name: 'Φ', latex: '\\Phi' },
    { group: 'Greek (upper)', name: 'Ψ', latex: '\\Psi' },
    { group: 'Greek (upper)', name: 'Ω', latex: '\\Omega' },
    // Sets and logic
    { group: 'Sets & Logic', name: 'ℝ', latex: '\\mathbb{R}' },
    { group: 'Sets & Logic', name: 'ℤ', latex: '\\mathbb{Z}' },
    { group: 'Sets & Logic', name: 'ℕ', latex: '\\mathbb{N}' },
    { group: 'Sets & Logic', name: 'ℂ', latex: '\\mathbb{C}' },
    { group: 'Sets & Logic', name: 'ℚ', latex: '\\mathbb{Q}' },
    { group: 'Sets & Logic', name: '𝔽_p', latex: '\\mathbb{F}_p' },
    { group: 'Sets & Logic', name: '∅',  latex: '\\emptyset' },
    { group: 'Sets & Logic', name: '∈',  latex: '\\in' },
    { group: 'Sets & Logic', name: '∉',  latex: '\\notin' },
    { group: 'Sets & Logic', name: '⊂',  latex: '\\subset' },
    { group: 'Sets & Logic', name: '⊆',  latex: '\\subseteq' },
    { group: 'Sets & Logic', name: '∪',  latex: '\\cup' },
    { group: 'Sets & Logic', name: '∩',  latex: '\\cap' },
    { group: 'Sets & Logic', name: '∀',  latex: '\\forall' },
    { group: 'Sets & Logic', name: '∃',  latex: '\\exists' },
    { group: 'Sets & Logic', name: '¬',  latex: '\\neg' },
    { group: 'Sets & Logic', name: '∧',  latex: '\\wedge' },
    { group: 'Sets & Logic', name: '∨',  latex: '\\vee' },
    // Operators
    { group: 'Operators', name: 'Fraction',   latex: '\\frac{a}{b}' },
    { group: 'Operators', name: 'Sqrt',       latex: '\\sqrt{x}' },
    { group: 'Operators', name: 'nth root',   latex: '\\sqrt[n]{x}' },
    { group: 'Operators', name: 'Sum',        latex: '\\sum_{i=1}^{n} a_i' },
    { group: 'Operators', name: 'Product',    latex: '\\prod_{i=1}^{n} a_i' },
    { group: 'Operators', name: 'Coproduct',  latex: '\\coprod_{i \\in I} X_i' },
    { group: 'Operators', name: 'Integral',   latex: '\\int_{a}^{b} f(x)\\,dx' },
    { group: 'Operators', name: 'Double int', latex: '\\iint_D f(x,y)\\,dA' },
    { group: 'Operators', name: 'Contour int',latex: '\\oint_\\gamma f(z)\\,dz' },
    { group: 'Operators', name: 'Limit',      latex: '\\lim_{x \\to \\infty} f(x)' },
    { group: 'Operators', name: 'Partial',    latex: '\\frac{\\partial f}{\\partial x}' },
    { group: 'Operators', name: 'Nabla',      latex: '\\nabla f' },
    { group: 'Operators', name: 'Big union',  latex: '\\bigcup_{i=1}^{n} A_i' },
    { group: 'Operators', name: 'Big inter',  latex: '\\bigcap_{i=1}^{n} A_i' },
    { group: 'Operators', name: 'Direct sum', latex: '\\bigoplus_{i} V_i' },
    { group: 'Operators', name: 'Tensor',     latex: 'A \\otimes B' },
    // Relations
    { group: 'Relations', name: '≤', latex: '\\leq' },
    { group: 'Relations', name: '≥', latex: '\\geq' },
    { group: 'Relations', name: '≠', latex: '\\neq' },
    { group: 'Relations', name: '≈', latex: '\\approx' },
    { group: 'Relations', name: '≡', latex: '\\equiv' },
    { group: 'Relations', name: '∼', latex: '\\sim' },
    { group: 'Relations', name: '≅', latex: '\\cong' },
    { group: 'Relations', name: '∝', latex: '\\propto' },
    { group: 'Relations', name: '≺ ≻', latex: '\\prec\\succ' },
    // Arrows
    { group: 'Arrows', name: '→',   latex: '\\to' },
    { group: 'Arrows', name: '⟶',  latex: '\\longrightarrow' },
    { group: 'Arrows', name: '⇒',   latex: '\\Rightarrow' },
    { group: 'Arrows', name: '⇔',   latex: '\\Leftrightarrow' },
    { group: 'Arrows', name: '↦',   latex: '\\mapsto' },
    { group: 'Arrows', name: '↪',   latex: '\\hookrightarrow' },
    { group: 'Arrows', name: '↠',   latex: '\\twoheadrightarrow' },
    { group: 'Arrows', name: '↑ ↓', latex: '\\uparrow\\downarrow' },
    { group: 'Arrows', name: 'xrightarrow{f}', latex: '\\xrightarrow{f}' },
    { group: 'Arrows', name: 'xleftarrow{g}',  latex: '\\xleftarrow{g}' },
    // Structures
    { group: 'Structures', name: 'Matrix 2×2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
    { group: 'Structures', name: 'Matrix 3×3', latex: '\\begin{pmatrix} a_{11} & a_{12} & a_{13} \\\\ a_{21} & a_{22} & a_{23} \\\\ a_{31} & a_{32} & a_{33} \\end{pmatrix}' },
    { group: 'Structures', name: 'Det',        latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}' },
    { group: 'Structures', name: 'Cases',      latex: 'f(x) = \\begin{cases} x & x \\geq 0 \\\\ -x & x < 0 \\end{cases}' },
    { group: 'Structures', name: 'Aligned',    latex: '\\begin{aligned} a &= b + c \\\\ &= d \\end{aligned}' },
    { group: 'Structures', name: 'Array',      latex: '\\begin{array}{c|cc} & a & b \\\\ \\hline a & a & b \\\\ b & b & a \\end{array}' },
    { group: 'Structures', name: 'Binomial',   latex: '\\binom{n}{k}' },
    { group: 'Structures', name: 'Overbrace',  latex: '\\overbrace{a+b+c}^{S}' },
    { group: 'Structures', name: 'Underbrace', latex: '\\underbrace{a+b+c}_{S}' },
    // Commutative diagrams (KaTeX AMScd)
    { group: 'Commutative Diagrams', name: 'Square (f,g,h,k)',
      latex: '\\begin{CD} A @>f>> B \\\\ @VgVV @VVhV \\\\ C @>>k> D \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'Square ⇐ reversed',
      latex: '\\begin{CD} A @<f<< B \\\\ @AgAA @AAhA \\\\ C @<<k< D \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'Triangle (lower)',
      latex: '\\begin{CD} A @>f>> B \\\\ & @VVhV \\\\ & C \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'Triangle (upper)',
      latex: '\\begin{CD} & A \\\\ & @VVfV \\\\ B @>>g> C \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'SES (short exact)',
      latex: '\\begin{CD} 0 @>>> A @>f>> B @>g>> C @>>> 0 \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'SES of SES (3×5)',
      latex: '\\begin{CD} 0 @>>> A @>>> B @>>> C @>>> 0 \\\\ @. @VVV @VVV @VVV @. \\\\ 0 @>>> A\' @>>> B\' @>>> C\' @>>> 0 \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'Pullback',
      latex: '\\begin{CD} P @>>> B \\\\ @VVV @VVgV \\\\ A @>>f> X \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'Pushout',
      latex: '\\begin{CD} A @>f>> B \\\\ @VgVV @VVV \\\\ C @>>> P \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'Vertical chain',
      latex: '\\begin{CD} A \\\\ @VfVV \\\\ B \\\\ @VgVV \\\\ C \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'Horizontal chain',
      latex: '\\begin{CD} A @>f>> B @>g>> C @>h>> D \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'Identity down-left',
      latex: '\\begin{CD} A @>f>> B \\\\ @| @VVgV \\\\ A @>>h> C \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'Double arrow (=)',
      latex: '\\begin{CD} A @= B \\\\ @VVfV @VVgV \\\\ C @= D \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'Functorial (F,G)',
      latex: '\\begin{CD} F(A) @>F(f)>> F(B) \\\\ @V\\eta_A VV @VV\\eta_B V \\\\ G(A) @>>G(f)> G(B) \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'LES (homology)',
      latex: '\\begin{CD} \\cdots @>>> H_n(A) @>>> H_n(X) @>>> H_n(X,A) @>\\partial>> H_{n-1}(A) @>>> \\cdots \\end{CD}' },
    { group: 'Commutative Diagrams', name: '5-lemma',
      latex: '\\begin{CD} A @>>> B @>>> C @>>> D @>>> E \\\\ @VaVV @VbVV @VcVV @VdVV @VeVV \\\\ A\' @>>> B\' @>>> C\' @>>> D\' @>>> E\' \\end{CD}' },
    { group: 'Commutative Diagrams', name: 'Snake lemma (top row)',
      latex: '\\begin{CD} @. A @>>> B @>>> C @>>> 0 \\\\ @. @VfVV @VgVV @VhVV @. \\\\ 0 @>>> A\' @>>> B\' @>>> C\' @. \\end{CD}' },
    // Knot theory
    { group: 'Knot Theory', name: 'Polynomial V(q)', latex: 'V(q)' },
    { group: 'Knot Theory', name: 'Skein',     latex: 'V(L_+) - V(L_-) = (q^{1/2} - q^{-1/2}) V(L_0)' },
    { group: 'Knot Theory', name: 'Kauffman bracket', latex: '\\langle L \\rangle' },
    { group: 'Knot Theory', name: 'Writhe',    latex: 'w(L) = \\sum_{c} \\epsilon(c)' },
    { group: 'Knot Theory', name: 'Jones',     latex: 'V_L(t) = (-A)^{-3w(L)} \\langle L \\rangle|_{A = t^{-1/4}}' },
    { group: 'Knot Theory', name: 'HOMFLY',    latex: 'aP(L_+) - a^{-1}P(L_-) = z\\,P(L_0)' },
    { group: 'Knot Theory', name: 'Alexander', latex: '\\Delta(t) = \\det(V - tV^T)' },
    { group: 'Knot Theory', name: 'Linking',   latex: '\\mathrm{lk}(L_1, L_2) = \\tfrac{1}{2} \\sum_{c} \\epsilon(c)' },
    { group: 'Knot Theory', name: 'Seifert',   latex: '\\chi(\\Sigma) = s - c' },
    { group: 'Knot Theory', name: 'Khovanov',  latex: 'Kh^{i,j}(L)' },
    { group: 'Knot Theory', name: 'Knot K ~ K\'', latex: 'K \\sim K\'' },
    // Fonts / scripts
    { group: 'Fonts & Scripts', name: '𝒜 (mathcal A)',   latex: '\\mathcal{A}' },
    { group: 'Fonts & Scripts', name: '𝔄 (mathfrak A)',  latex: '\\mathfrak{A}' },
    { group: 'Fonts & Scripts', name: '𝐀 (mathbf A)',    latex: '\\mathbf{A}' },
    { group: 'Fonts & Scripts', name: '𝐴 (mathit A)',    latex: '\\mathit{A}' },
    { group: 'Fonts & Scripts', name: '𝖠 (mathsf A)',    latex: '\\mathsf{A}' },
    { group: 'Fonts & Scripts', name: 'text{…}',          latex: '\\text{hello}' },
    { group: 'Fonts & Scripts', name: 'operatorname',     latex: '\\operatorname{Hom}(A,B)' },
    // Accents / decorations
    { group: 'Accents', name: 'x̂  hat',        latex: '\\hat{x}' },
    { group: 'Accents', name: 'x̃  tilde',      latex: '\\tilde{x}' },
    { group: 'Accents', name: 'x̄  bar',        latex: '\\bar{x}' },
    { group: 'Accents', name: 'x̅  overline',   latex: '\\overline{x}' },
    { group: 'Accents', name: 'x̲  underline',  latex: '\\underline{x}' },
    { group: 'Accents', name: 'x⃗  vec',       latex: '\\vec{x}' },
    { group: 'Accents', name: 'ẋ  dot',        latex: '\\dot{x}' },
    { group: 'Accents', name: 'ẍ  ddot',       latex: '\\ddot{x}' },
    { group: 'Accents', name: 'x̌  check',      latex: '\\check{x}' },
    { group: 'Accents', name: 'x′  prime',     latex: 'x\'' },
    // Delimiters / brackets
    { group: 'Delimiters', name: '( )   paren',      latex: '\\left( x \\right)' },
    { group: 'Delimiters', name: '[ ]   bracket',    latex: '\\left[ x \\right]' },
    { group: 'Delimiters', name: '{ }   brace',      latex: '\\left\\{ x \\right\\}' },
    { group: 'Delimiters', name: '⟨ ⟩  angle',       latex: '\\langle x \\rangle' },
    { group: 'Delimiters', name: '| |   abs',        latex: '\\lvert x \\rvert' },
    { group: 'Delimiters', name: '‖ ‖  norm',        latex: '\\lVert x \\rVert' },
    { group: 'Delimiters', name: '⌊ ⌋  floor',       latex: '\\lfloor x \\rfloor' },
    { group: 'Delimiters', name: '⌈ ⌉  ceil',        latex: '\\lceil x \\rceil' },
    { group: 'Delimiters', name: 'Inner product',     latex: '\\langle u, v \\rangle' },
    // Calculus / analysis
    { group: 'Calculus', name: 'dx',                latex: '\\,dx' },
    { group: 'Calculus', name: 'df/dx',             latex: '\\frac{df}{dx}' },
    { group: 'Calculus', name: '∂f/∂x',             latex: '\\frac{\\partial f}{\\partial x}' },
    { group: 'Calculus', name: 'gradient',          latex: '\\nabla f' },
    { group: 'Calculus', name: 'divergence',        latex: '\\nabla \\cdot \\mathbf{F}' },
    { group: 'Calculus', name: 'curl',              latex: '\\nabla \\times \\mathbf{F}' },
    { group: 'Calculus', name: 'Laplacian',         latex: '\\Delta f = \\nabla^2 f' },
    { group: 'Calculus', name: 'Taylor',            latex: 'f(x) = \\sum_{n=0}^\\infty \\frac{f^{(n)}(a)}{n!}(x-a)^n' },
    { group: 'Calculus', name: 'ε–δ limit',         latex: '\\forall \\varepsilon > 0\\ \\exists \\delta > 0 : 0 < |x-a| < \\delta \\Rightarrow |f(x)-L| < \\varepsilon' },
    // Physics
    { group: 'Physics', name: '⟨ψ|', latex: '\\langle \\psi |' },
    { group: 'Physics', name: '|ψ⟩', latex: '| \\psi \\rangle' },
    { group: 'Physics', name: '⟨ψ|φ⟩', latex: '\\langle \\psi | \\varphi \\rangle' },
    { group: 'Physics', name: 'Hamiltonian', latex: '\\hat{H}' },
    { group: 'Physics', name: 'Schrödinger', latex: 'i\\hbar \\frac{\\partial}{\\partial t} |\\psi\\rangle = \\hat{H} |\\psi\\rangle' },
    { group: 'Physics', name: 'Commutator', latex: '[A, B] = AB - BA' },
    // Dots / spacing
    { group: 'Misc', name: '⋯ cdots',    latex: '\\cdots' },
    { group: 'Misc', name: '…  ldots',   latex: '\\ldots' },
    { group: 'Misc', name: '⋮  vdots',   latex: '\\vdots' },
    { group: 'Misc', name: '⋱  ddots',   latex: '\\ddots' },
    { group: 'Misc', name: '□  qed',     latex: '\\square' },
    { group: 'Misc', name: '∞ infty',    latex: '\\infty' },
    { group: 'Misc', name: 'aleph',      latex: '\\aleph_0' },
    { group: 'Misc', name: 'quad space', latex: 'a \\quad b' },
    { group: 'Misc', name: 'thin space', latex: 'a\\,b' },
    { group: 'Misc', name: 'color',      latex: '\\color{red}{x}' },
    { group: 'Misc', name: 'tag (eq)',   latex: 'E = mc^2 \\tag{★}' },
    { group: 'Knot Theory', name: 'Knot K ~ K\'', latex: 'K \\sim K\'' }
  ];

  // Tracks the element currently being edited (for toolbar actions).
  var editorState = null;

  // ── Equation editor modal ──
  var savedSelRange = null;
  function openEquationEditor(targetEl) {
    // Suppress blur-commit on the target BEFORE any focus shift can happen.
    if (editorState && editorState.el === targetEl) editorState.suppressBlur = true;
    // Capture caret so we can restore it before inserting.
    var sel = window.getSelection();
    savedSelRange = (sel && sel.rangeCount) ? sel.getRangeAt(0).cloneRange() : null;

    // If caret is inside \(...\) or $$...$$ in the raw text of targetEl,
    // auto-expand the selection to cover the whole equation (replace mode).
    var autoCapture = captureMathUnderCaret(targetEl);
    var prefill = autoCapture ? autoCapture.source :
      (savedSelRange && !savedSelRange.collapsed ? savedSelRange.toString() : '');
    var display = autoCapture ? autoCapture.display : false;

    // If user explicitly selected a delimited equation, strip wrappers.
    if (!autoCapture) {
      var m;
      if ((m = /^\$\$([\s\S]*)\$\$$/.exec(prefill.trim()))) { prefill = m[1].trim(); display = true; }
      else if ((m = /^\\\(([\s\S]*)\\\)$/.exec(prefill.trim()))) { prefill = m[1].trim(); }
    }

    var old = document.getElementById('admin-eq-modal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'admin-eq-modal';
    modal.innerHTML =
      '<div class="eq-modal-box">' +
      '  <div class="eq-modal-title">' + (autoCapture ? 'Edit equation' : 'Insert equation') + '</div>' +
      '  <div class="eq-modal-body">' +
      '    <aside class="eq-snips">' +
      '      <div class="eq-snips-head">Snippets <button class="eq-add-snip" title="Save current as snippet">+ Save</button></div>' +
      '      <div class="eq-snips-list"></div>' +
      '    </aside>' +
      '    <main class="eq-main">' +
      '      <label class="eq-mode">' +
      '        <input type="radio" name="eqmode" value="inline"' + (display ? '' : ' checked') + '> Inline \\(…\\)' +
      '        <input type="radio" name="eqmode" value="display"' + (display ? ' checked' : '') + '> Display $$…$$' +
      '      </label>' +
      '      <textarea class="eq-src" spellcheck="false" placeholder="LaTeX source"></textarea>' +
      '      <div class="eq-preview-label">Preview:</div>' +
      '      <div class="eq-preview"></div>' +
      '      <div class="eq-modal-actions">' +
      '        <button class="eq-cancel">Cancel</button>' +
      '        <button class="eq-insert">' + (autoCapture ? 'Replace' : 'Insert') + ' (Ctrl+Enter)</button>' +
      '      </div>' +
      '    </main>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(modal);

    var src = modal.querySelector('.eq-src');
    var preview = modal.querySelector('.eq-preview');
    src.value = prefill;

    function renderPreview() {
      var mode = modal.querySelector('input[name="eqmode"]:checked').value;
      var text = src.value;
      preview.innerHTML = mode === 'display' ? '$$ ' + text + ' $$' : '\\(' + text + '\\)';
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(preview, katexOpts());
      }
    }

    src.addEventListener('input', renderPreview);
    modal.querySelectorAll('input[name="eqmode"]').forEach(function (r) {
      r.addEventListener('change', renderPreview);
    });
    renderPreview();
    src.focus();
    if (prefill) src.setSelectionRange(prefill.length, prefill.length);

    // ── Snippets panel ──
    function renderSnippets() {
      var list = modal.querySelector('.eq-snips-list');
      list.innerHTML = '';
      var all = BUILTIN_SNIPPETS.slice();
      var custom = (overrides._snippets || []).map(function (s) {
        return { group: 'My Snippets', name: s.name, latex: s.latex, custom: true };
      });
      all = custom.concat(all);

      var byGroup = {};
      all.forEach(function (s) {
        if (!byGroup[s.group]) byGroup[s.group] = [];
        byGroup[s.group].push(s);
      });
      // Group open/closed state persists across re-renders of this modal.
      if (!renderSnippets._open) {
        renderSnippets._open = {};
        // Only custom snippets start open.
        renderSnippets._open['My Snippets'] = true;
      }
      var openMap = renderSnippets._open;

      Object.keys(byGroup).forEach(function (g) {
        var wrap = document.createElement('div');
        wrap.className = 'eq-snip-groupwrap';
        var isOpen = !!openMap[g];
        var h = document.createElement('div');
        h.className = 'eq-snip-group' + (isOpen ? ' open' : '');
        h.innerHTML = '<span class="eq-snip-caret">' + (isOpen ? '▾' : '▸') + '</span> ' +
                      '<span class="eq-snip-gname"></span>' +
                      '<span class="eq-snip-count">' + byGroup[g].length + '</span>';
        h.querySelector('.eq-snip-gname').textContent = g;
        wrap.appendChild(h);

        var body = document.createElement('div');
        body.className = 'eq-snip-groupbody';
        if (!isOpen) body.style.display = 'none';
        wrap.appendChild(body);

        h.addEventListener('click', function () {
          openMap[g] = !openMap[g];
          if (openMap[g]) { body.style.display = ''; h.classList.add('open'); h.querySelector('.eq-snip-caret').textContent = '▾'; }
          else { body.style.display = 'none'; h.classList.remove('open'); h.querySelector('.eq-snip-caret').textContent = '▸'; }
        });

        byGroup[g].forEach(function (s) {
          var item = document.createElement('div');
          item.className = 'eq-snip-item';
          item.innerHTML = '<span class="eq-snip-name"></span>' +
                           '<span class="eq-snip-preview"></span>' +
                           (s.custom ? '<button class="eq-snip-del" title="Delete snippet">×</button>' : '');
          item.querySelector('.eq-snip-name').textContent = s.name;
          var pv = item.querySelector('.eq-snip-preview');
          // CD diagrams must render in display mode.
          var isCD = /\\begin\{CD\}/.test(s.latex);
          pv.innerHTML = isCD ? ('$$' + s.latex + '$$') : ('\\(' + s.latex + '\\)');
          if (typeof renderMathInElement === 'function') renderMathInElement(pv, katexOpts());
          item.addEventListener('click', function (ev) {
            if (ev.target.classList.contains('eq-snip-del')) return;
            // CD snippets are display-mode; flip the radio when inserting.
            if (isCD) {
              var r = modal.querySelector('input[value="display"]'); if (r) { r.checked = true; }
            }
            insertAtCaret(src, s.latex);
            renderPreview();
            src.focus();
          });
          if (s.custom) {
            item.querySelector('.eq-snip-del').addEventListener('click', function (ev) {
              ev.stopPropagation();
              if (!confirm('Delete snippet "' + s.name + '"?')) return;
              deleteSnippet(s.name, renderSnippets);
            });
          }
          body.appendChild(item);
        });
        list.appendChild(wrap);
      });
    }
    renderSnippets();

    modal.querySelector('.eq-add-snip').onclick = function () {
      var text = src.value.trim();
      if (!text) { setStatus('Write some LaTeX first, then save as snippet', 3000); return; }
      var head = modal.querySelector('.eq-snips-head');
      if (head.querySelector('.eq-snip-nameinput')) return;
      var row = document.createElement('div');
      row.className = 'eq-snip-nameinput';
      row.innerHTML = '<input type="text" placeholder="Snippet name…" />' +
                      '<button class="eq-snip-ok">OK</button>' +
                      '<button class="eq-snip-no">×</button>';
      head.appendChild(row);
      var input = row.querySelector('input');
      input.focus();
      function commit() {
        var name = input.value.trim();
        row.remove();
        if (!name) return;
        saveSnippet(name, text, modal.querySelector('input[value="display"]').checked, renderSnippets);
      }
      row.querySelector('.eq-snip-ok').onclick = commit;
      row.querySelector('.eq-snip-no').onclick = function () { row.remove(); };
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
        if (ev.key === 'Escape') { ev.preventDefault(); row.remove(); }
      });
    };

    // Keep the target in edit mode while the modal is open.
    if (editorState && editorState.el === targetEl) editorState.suppressBlur = true;

    function close() {
      modal.remove();
      if (editorState && editorState.el === targetEl) {
        editorState.suppressBlur = false;
        // Refocus the contenteditable so the user stays in edit mode.
        try { targetEl.focus(); } catch (e) {}
      }
    }
    modal.querySelector('.eq-cancel').onclick = close;
    modal.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); close(); }
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); doInsert(); }
    });

    function doInsert() {
      var mode = modal.querySelector('input[name="eqmode"]:checked').value;
      var text = src.value.trim();
      if (!text) { close(); return; }
      var wrapped = mode === 'display' ? '$$ ' + text + ' $$' : '\\(' + text + '\\)';
      // Remove modal but keep suppressBlur so refocus doesn't commit early.
      modal.remove();
      targetEl.focus();

      // If the element isn't editable (e.g. Insert eq hit after focus was lost),
      // re-enable contenteditable so execCommand can insert.
      if (!targetEl.isContentEditable) {
        targetEl.contentEditable = 'plaintext-only';
        if (targetEl.contentEditable !== 'plaintext-only') targetEl.contentEditable = 'true';
      }

      if (autoCapture) {
        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(autoCapture.range);
      } else if (savedSelRange) {
        var s2 = window.getSelection();
        s2.removeAllRanges();
        s2.addRange(savedSelRange);
      } else {
        // No caret — append at end.
        var s3 = window.getSelection();
        s3.removeAllRanges();
        var r3 = document.createRange();
        r3.selectNodeContents(targetEl);
        r3.collapse(false);
        s3.addRange(r3);
      }
      document.execCommand('insertText', false, wrapped);

      if (editorState && editorState.el === targetEl) {
        editorState.suppressBlur = false;
      }
    }
    modal.querySelector('.eq-insert').onclick = doInsert;
  }

  // Insert text at the current cursor position in a textarea.
  function insertAtCaret(textarea, text) {
    var start = textarea.selectionStart, end = textarea.selectionEnd;
    var v = textarea.value;
    textarea.value = v.slice(0, start) + text + v.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.dispatchEvent(new Event('input'));
  }

  // If caret in targetEl is inside \(...\) or $$...$$, return {source, display, range}.
  function captureMathUnderCaret(targetEl) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    var r = sel.getRangeAt(0);
    if (!targetEl.contains(r.startContainer)) return null;

    // Flatten all text in targetEl to a single string and track caret offset.
    var full = '';
    var caretOffset = -1;
    (function walk(node) {
      if (node === r.startContainer) caretOffset = full.length + r.startOffset;
      if (node.nodeType === 3) { full += node.nodeValue; return; }
      for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
    })(targetEl);
    if (caretOffset < 0) return null;

    // Find nearest enclosing delimiters around caretOffset.
    var patterns = [
      { open: '$$',  close: '$$',  display: true },
      { open: '\\(', close: '\\)', display: false }
    ];
    for (var i = 0; i < patterns.length; i++) {
      var p = patterns[i];
      // Search backward for open, forward for close.
      var openIdx = full.lastIndexOf(p.open, caretOffset);
      if (openIdx < 0) continue;
      var searchFrom = openIdx + p.open.length;
      if (searchFrom > caretOffset) continue;
      var closeIdx = full.indexOf(p.close, Math.max(searchFrom, caretOffset));
      if (closeIdx < 0) continue;
      // Make sure no closing delimiter sits between openIdx and caretOffset.
      var earlyClose = full.indexOf(p.close, searchFrom);
      if (earlyClose >= 0 && earlyClose < caretOffset) continue;

      var source = full.slice(searchFrom, closeIdx);
      var endOffset = closeIdx + p.close.length;
      // Build a Range covering [openIdx, endOffset] across the DOM.
      var range = buildRangeForOffsets(targetEl, openIdx, endOffset);
      if (!range) return null;
      return { source: source, display: p.display, range: range };
    }
    return null;
  }

  function buildRangeForOffsets(root, startOff, endOff) {
    var range = document.createRange();
    var offset = 0, startSet = false, endSet = false;
    (function walk(node) {
      if (startSet && endSet) return;
      if (node.nodeType === 3) {
        var len = node.nodeValue.length;
        if (!startSet && startOff >= offset && startOff <= offset + len) {
          range.setStart(node, startOff - offset); startSet = true;
        }
        if (!endSet && endOff >= offset && endOff <= offset + len) {
          range.setEnd(node, endOff - offset); endSet = true;
        }
        offset += len;
      } else {
        for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
      }
    })(root);
    return (startSet && endSet) ? range : null;
  }

  function saveSnippet(name, latex, display, cb) {
    fetch('/admin/snippet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, latex: latex, display: !!display })
    }).then(function (r) { return r.json(); })
      .then(function () {
        if (!overrides._snippets) overrides._snippets = [];
        var arr = overrides._snippets;
        var found = false;
        for (var i = 0; i < arr.length; i++) {
          if (arr[i].name === name) { arr[i].latex = latex; arr[i].display = !!display; found = true; break; }
        }
        if (!found) arr.push({ name: name, latex: latex, display: !!display });
        setStatus('Snippet saved ✓', 1500);
        if (cb) cb();
      })
      .catch(function (err) { setStatus('Snippet save failed: ' + err.message, 4000); });
  }

  function deleteSnippet(name, cb) {
    fetch('/admin/snippet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, action: 'delete' })
    }).then(function (r) { return r.json(); })
      .then(function () {
        if (overrides._snippets) {
          overrides._snippets = overrides._snippets.filter(function (s) { return s.name !== name; });
        }
        setStatus('Snippet deleted', 1500);
        if (cb) cb();
      });
  }

  function saveOverride(tabId, id, html) {
    setStatus('Saving…');
    fetch('/admin/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab: tabId, id: id, html: html })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function () {
        if (!overrides[tabId]) overrides[tabId] = {};
        overrides[tabId][id] = html;
        setStatus('Saved ✓', 1500);
      })
      .catch(function (err) {
        setStatus('Save failed: ' + err.message, 4000);
      });
  }

  function revertOverride(tabId, id, el) {
    setStatus('Reverting…');
    fetch('/admin/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab: tabId, id: id, delete: true, html: '' })
    }).then(function (r) { return r.json(); })
      .then(function () {
        if (overrides[tabId]) delete overrides[tabId][id];
        el.removeAttribute('data-edited');
        setStatus('Reverted (reload to see original)', 3000);
      })
      .catch(function (err) { setStatus('Revert failed: ' + err.message, 4000); });
  }

  // ── Admin toolbar ──
  var statusEl;
  function buildToolbar() {
    var bar = document.createElement('div');
    bar.id = 'admin-toolbar';
    bar.innerHTML =
      '<span class="admin-badge">ADMIN</span>' +
      '<span id="admin-status"></span>' +
      '<button id="admin-save" title="Save current edit (Ctrl+Enter)">Save</button>' +
      '<button id="admin-eq" title="Insert equation into focused element (Ctrl+M)">Insert eq</button>' +
      '<button id="admin-img" title="Insert an image/plot into focused element">Insert image</button>' +
      '<button id="admin-snapshot" title="Copy overrides.json into history/ (never wiped)">Snapshot</button>' +
      '<button id="admin-commit" title="Merge overrides into permanent content.json and clear overrides">Commit</button>' +
      '<button id="admin-revert-hover" title="Revert the element under cursor">Revert element</button>' +
      '<button id="admin-help" title="Show editing cheatsheet">?</button>' +
      '<button id="admin-wipe" title="Wipe overrides.json AND content.json (snapshots first)" style="background:#c0392b;color:#fff">Wipe all</button>' +
      '<button id="admin-exit">Exit admin</button>';
    document.body.appendChild(bar);
    statusEl = document.getElementById('admin-status');

    // Prevent toolbar clicks from stealing focus from the contenteditable
    // (which would trigger blur → finish before our handler runs).
    // Exclude Exit — it navigates away and doesn't need to preserve focus.
    ['admin-save', 'admin-eq', 'admin-img', 'admin-snapshot', 'admin-commit', 'admin-help', 'admin-revert-hover', 'admin-wipe'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    });

    document.getElementById('admin-save').onclick = function () {
      if (editorState && editorState.el) {
        // Force-save even if content equals raw (covers edge cases like
        // paragraph cleared → <br>, which some browsers normalize back to raw).
        editorState.force = true;
        editorState.el.blur();
      } else {
        setStatus('Nothing to save — click a paragraph first', 2500);
      }
    };

    document.getElementById('admin-eq').onclick = function () {
      var target = (editorState && editorState.el) || document.querySelector('.admin-editing');
      if (!target) { setStatus('Click a paragraph first, then Insert eq', 3000); return; }
      openEquationEditor(target);
    };

    document.getElementById('admin-help').onclick = toggleHelp;

    document.getElementById('admin-snapshot').onclick = function () {
      setStatus('Snapshotting overrides…');
      fetch('/admin/snapshot', {method: 'POST'}).then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.ok) throw new Error(j.error || 'failed');
          setStatus(j.empty ? 'No overrides to snapshot' : ('Snapshot saved → ' + j.file), 4000);
        }).catch(function (err) { setStatus('Snapshot failed: ' + err.message, 4000); });
    };

    document.getElementById('admin-commit').onclick = function () {
      if (!confirm('Commit current overrides into content.json?\n\nThis merges all overrides into the permanent baseline and clears overrides.json. A snapshot is taken automatically before the merge.')) return;
      // Flush any in-progress edit so its latest text is saved before merge.
      if (editorState && editorState.el && editorState.el.classList.contains('admin-editing')) {
        editorState.force = true;
        editorState.el.blur();
      }
      setStatus('Committing…');
      // Give the save POST a moment to land before triggering the merge.
      setTimeout(function () {
      fetch('/admin/commit', {method: 'POST'}).then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.ok) throw new Error(j.error || 'failed');
          setStatus('Committed ✓ (reloading)', 2000);
          setTimeout(function () { location.reload(); }, 800);
        }).catch(function (err) { setStatus('Commit failed: ' + err.message, 4000); });
      }, 400);
    };

    document.getElementById('admin-img').onclick = function () {
      var target = (editorState && editorState.el) || document.querySelector('.admin-editing');
      if (!target) { setStatus('Click a paragraph first, then Insert image', 3000); return; }
      pickAndUploadImage(target);
    };

    document.getElementById('admin-wipe').onclick = function () {
      if (!confirm('WIPE ALL: clear overrides.json AND content.json?\n\nBoth files are snapshotted to history/prewipe-*.json first. This cannot be undone from the UI — restore from history/ if needed.')) return;
      if (!confirm('Really wipe everything? Type-check: this restores the page to its original HTML baseline.')) return;
      setStatus('Wiping…');
      fetch('/admin/wipe-all', {method: 'POST'}).then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.ok) throw new Error(j.error || 'failed');
          setStatus('Wiped ✓ (reloading)', 2000);
          setTimeout(function () { location.reload(); }, 800);
        }).catch(function (err) { setStatus('Wipe failed: ' + err.message, 4000); });
    };

    document.getElementById('admin-exit').onclick = function () {
      localStorage.removeItem('knotlab.admin');
      var url = new URL(window.location.href);
      url.searchParams.delete('admin');
      window.location.href = url.toString();
    };

    buildFormatBar();

    document.getElementById('admin-revert-hover').onclick = function () {
      setStatus('Click an edited element to revert it…', 4000);
      document.body.classList.add('admin-revert-pick');
      function pick(ev) {
        var t = ev.target.closest('[data-edit-id]');
        if (!t) return;
        ev.preventDefault(); ev.stopPropagation();
        document.body.classList.remove('admin-revert-pick');
        document.removeEventListener('click', pick, true);
        var id = t.getAttribute('data-edit-id');
        var tabId = id.split('::')[0];
        revertOverride(tabId, id, t);
      }
      document.addEventListener('click', pick, true);
    };
  }

  // ── Format bar: bold/italic/underline/size/color/link ──
  var savedFmtRange = null;
  function rememberRange() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    var r = sel.getRangeAt(0);
    if (editorState && editorState.el && editorState.el.contains(r.commonAncestorContainer)) {
      savedFmtRange = r.cloneRange();
    }
  }
  function restoreRange() {
    if (!savedFmtRange) return null;
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedFmtRange);
    return savedFmtRange;
  }
  function wrapRange(r, makeWrapper) {
    if (!r || r.collapsed) return null;
    var wrapper = makeWrapper();
    try { r.surroundContents(wrapper); }
    catch (e) {
      var frag = r.extractContents();
      wrapper.appendChild(frag);
      r.insertNode(wrapper);
    }
    var nr = document.createRange();
    nr.selectNodeContents(wrapper);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(nr);
    savedFmtRange = nr.cloneRange();
    return wrapper;
  }

  function inlinePromptURL(defaultUrl, cb) {
    var ov = document.createElement('div');
    ov.id = 'admin-link-prompt';
    ov.style.cssText = 'position:fixed;z-index:10000;left:50%;top:40%;transform:translateX(-50%);background:#fff;border:1px solid #888;border-radius:8px;padding:0.8rem 1rem;box-shadow:0 6px 24px rgba(0,0,0,0.2);font-family:system-ui;';
    ov.innerHTML = '<div style="margin-bottom:0.4rem;">Link URL:</div>' +
      '<input type="text" style="width:360px;padding:0.3rem 0.5rem;font-size:0.95rem;" />' +
      '<div style="margin-top:0.6rem;text-align:right;">' +
      '<button id="lp-cancel" style="margin-right:0.4rem;">Cancel</button>' +
      '<button id="lp-ok">OK</button></div>';
    document.body.appendChild(ov);
    var inp = ov.querySelector('input');
    inp.value = defaultUrl || 'https://';
    inp.focus(); inp.select();
    function done(val) { ov.remove(); cb(val); }
    ov.querySelector('#lp-ok').onclick = function(){ done(inp.value.trim() || null); };
    ov.querySelector('#lp-cancel').onclick = function(){ done(null); };
    inp.addEventListener('keydown', function(e){
      if (e.key==='Enter') done(inp.value.trim()||null);
      else if (e.key==='Escape') done(null);
    });
  }

  function applyFormat(fmt) {
    if (!editorState || !editorState.el) { setStatus('Click a paragraph first, then format', 2500); return; }
    var r = restoreRange();
    if (!r) { setStatus('Select some text first', 2500); return; }
    if (fmt === 'bold') wrapRange(r, function(){ return document.createElement('strong'); });
    else if (fmt === 'italic') wrapRange(r, function(){ return document.createElement('em'); });
    else if (fmt === 'underline') wrapRange(r, function(){ var s=document.createElement('span'); s.style.textDecoration='underline'; return s; });
    else if (fmt === 'sizeUp' || fmt === 'sizeDown') {
      var anc = r.commonAncestorContainer;
      if (anc.nodeType===3) anc = anc.parentElement;
      var cur = parseFloat(getComputedStyle(anc).fontSize) || 16;
      var next = fmt==='sizeUp' ? Math.round(cur+2) : Math.max(8, Math.round(cur-2));
      wrapRange(r, function(){ var s=document.createElement('span'); s.style.fontSize=next+'px'; return s; });
    }
    else if (fmt === 'link') {
      inlinePromptURL('https://', function(url){
        if (!url) return;
        restoreRange();
        var rr = window.getSelection().rangeCount ? window.getSelection().getRangeAt(0) : null;
        if (!rr) return;
        wrapRange(rr, function(){ var a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener'; return a; });
      });
    }
    else if (fmt === 'unlink') {
      var node = r.commonAncestorContainer;
      if (node.nodeType===3) node = node.parentNode;
      while (node && node !== editorState.el && node.tagName !== 'A') node = node.parentNode;
      if (node && node.tagName === 'A') {
        var parent = node.parentNode;
        while (node.firstChild) parent.insertBefore(node.firstChild, node);
        parent.removeChild(node);
      }
    }
  }

  function buildFormatBar() {
    var bar = document.createElement('div');
    bar.id = 'admin-fmt-bar';
    bar.innerHTML =
      '<button data-fmt="sizeDown" title="Decrease font size">A−</button>' +
      '<button data-fmt="sizeUp" title="Increase font size">A+</button>' +
      '<button data-fmt="bold" title="Bold"><b>B</b></button>' +
      '<button data-fmt="italic" title="Italic"><i>I</i></button>' +
      '<button data-fmt="underline" title="Underline"><u>U</u></button>' +
      '<label id="admin-fmt-color" title="Text color"><input type="color" value="#2171b5"><span>A</span></label>' +
      '<button data-fmt="link" title="Insert hyperlink">🔗</button>' +
      '<button data-fmt="unlink" title="Remove hyperlink">⊘</button>';
    document.body.appendChild(bar);
    // Keep selection alive when interacting with the bar.
    bar.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
    // Remember selection on every mouseup/keyup inside the editable.
    document.addEventListener('selectionchange', function(){
      if (!editorState || !editorState.el) return;
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      var r = sel.getRangeAt(0);
      if (editorState.el.contains(r.commonAncestorContainer)) savedFmtRange = r.cloneRange();
    });
    bar.querySelectorAll('button[data-fmt]').forEach(function(b){
      b.addEventListener('click', function(){ applyFormat(b.getAttribute('data-fmt')); });
    });
    var colorInput = bar.querySelector('input[type=color]');
    colorInput.addEventListener('input', function(){
      if (!editorState || !editorState.el) { setStatus('Click a paragraph first', 2500); return; }
      var r = restoreRange(); if (!r || r.collapsed) { setStatus('Select some text first', 2500); return; }
      var c = colorInput.value;
      wrapRange(r, function(){ var s=document.createElement('span'); s.style.color=c; return s; });
    });
  }

  function pickAndUploadImage(targetEl) {
    if (editorState && editorState.el === targetEl) editorState.suppressBlur = true;
    var picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.style.display = 'none';
    document.body.appendChild(picker);
    picker.addEventListener('change', function () {
      var file = picker.files && picker.files[0];
      picker.remove();
      if (!file) { if (editorState) editorState.suppressBlur = false; return; }
      var reader = new FileReader();
      reader.onload = function () {
        setStatus('Uploading image…');
        fetch('/admin/upload', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({name: file.name, dataUrl: reader.result})
        }).then(function(r){return r.json();}).then(function(j) {
          if (!j.ok) throw new Error(j.error || 'upload failed');
          var altPrompt = file.name.replace(/\.[^.]+$/, '');
          var html = '<img src="' + j.url + '" alt="' + altPrompt + '" style="max-width:100%;">';
          targetEl.focus();
          if (!targetEl.isContentEditable) {
            targetEl.contentEditable = 'plaintext-only';
            if (targetEl.contentEditable !== 'plaintext-only') targetEl.contentEditable = 'true';
          }
          // Place caret at end and insert HTML.
          var s = window.getSelection(); s.removeAllRanges();
          var r2 = document.createRange(); r2.selectNodeContents(targetEl); r2.collapse(false);
          s.addRange(r2);
          // insertHTML preserves the img tag; plaintext-only may downgrade to text.
          // Fall back to appending an <img> node directly.
          var imgNode = document.createElement('img');
          imgNode.src = j.url; imgNode.alt = altPrompt;
          imgNode.style.maxWidth = '100%';
          targetEl.appendChild(imgNode);
          setStatus('Image inserted ✓', 2000);
          if (editorState && editorState.el === targetEl) editorState.suppressBlur = false;
        }).catch(function(err){
          setStatus('Upload failed: ' + err.message, 4000);
          if (editorState) editorState.suppressBlur = false;
        });
      };
      reader.readAsDataURL(file);
    });
    picker.click();
  }

  function toggleHelp() {
    var existing = document.getElementById('admin-help-panel');
    if (existing) { existing.remove(); return; }
    var p = document.createElement('div');
    p.id = 'admin-help-panel';
    p.innerHTML =
      '<div class="help-head"><strong>KnotLab admin cheatsheet</strong>' +
      '<button class="help-close" title="Close">×</button></div>' +
      '<dl>' +
      '<dt>Click a paragraph</dt><dd>enter edit mode (shows raw LaTeX source)</dd>' +
      '<dt>Tab / click away</dt><dd>commit + re-render math</dd>' +
      '<dt>Save button / Ctrl+Enter</dt><dd>commit without leaving the element</dd>' +
      '<dt>Esc</dt><dd>cancel edit (revert to last saved)</dd>' +
      '<dt>Ctrl+M</dt><dd>open equation editor for current element</dd>' +
      '<dt>Insert eq button</dt><dd>same as Ctrl+M</dd>' +
      '<dt>+ (on hover)</dt><dd>insert paragraph/heading/quote/equation below</dd>' +
      '<dt>× (on hover)</dt><dd>delete an inserted element</dd>' +
      '<dt>Revert element</dt><dd>undo override on a native element</dd>' +
      '<dt>Snapshot</dt><dd>timestamped backup of overrides.json to history/ (never wiped)</dd>' +
      '<dt>Commit</dt><dd>merge overrides into permanent content.json + clear overrides (auto-snapshots first)</dd>' +
      '<dt>Ctrl+Shift+E</dt><dd>toggle admin mode</dd>' +
      '</dl>' +
      '<div class="help-math"><strong>Math syntax</strong><br>' +
      'Inline: <code>\\(x^2\\)</code> &nbsp; Display: <code>$$\\int f\\,dx$$</code><br>' +
      'Use the snippets sidebar in the equation editor for macros — click <em>+ Save</em> to add your own.</div>';
    document.body.appendChild(p);
    p.querySelector('.help-close').onclick = function () { p.remove(); };
  }

  function setStatus(msg, autoClearMs) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    if (autoClearMs) {
      clearTimeout(setStatus._t);
      setStatus._t = setTimeout(function () { statusEl.textContent = ''; }, autoClearMs);
    }
  }

  // ── Tab switching ──
  window.switchTab = function (tabId) {
    document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });

    var tab = document.getElementById('tab-' + tabId);
    if (tab) tab.classList.add('active');

    var btn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
    if (btn) btn.classList.add('active');

    // Initialize native modules on first visit.
    if (modules[tabId] && !initialized[tabId]) {
      initialized[tabId] = true;
      var fn = window[modules[tabId].fn];
      if (typeof fn === 'function') {
        fn(document.getElementById(modules[tabId].root));
      }
      if (overridesReady) {
        observeTab(tabId);
      } else {
        pendingTabs.push(tabId);
      }
    }

    // Lazy-load knot explorer iframe; hide its header AND its own tab-bar so the
    // KnotLab top-level tab-bar remains the single source of navigation (avoids
    // the professor-demo confusion of seeing two tab-bars stacked).
    if (tabId === 'knot-explorer') {
      var frame = document.getElementById('frame-knot-explorer');
      if (frame) {
        if (frame.src === 'about:blank' && frame.dataset.src) {
          frame.src = frame.dataset.src;
        }
        var attempts = 0;
        var hideCheck = setInterval(function () {
          attempts++;
          try {
            var doc = frame.contentDocument;
            if (doc) {
              var hdr = doc.querySelector('header');
              if (hdr) hdr.style.display = 'none';
              var tb = doc.querySelector('.tab-bar');
              if (tb) tb.style.display = 'none';
              if (hdr) { clearInterval(hideCheck); }
            }
          } catch (e) { clearInterval(hideCheck); }
          if (attempts > 30) clearInterval(hideCheck); // give up after ~6s
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
  if (window.location.hash) loadFromHash(); else switchTab('home');

  // Listen for navigation messages from the knot-explorer iframe.
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (d && d.type === 'knotlab:nav' && typeof d.target === 'string') {
      if (document.getElementById('tab-' + d.target)) switchTab(d.target);
    }
  });

  // ── Keybind: Ctrl+Shift+E toggles admin mode ──
  window.addEventListener('keydown', function (ev) {
    if (ev.ctrlKey && ev.shiftKey && (ev.key === 'E' || ev.key === 'e')) {
      ev.preventDefault();
      if (adminMode) {
        localStorage.removeItem('knotlab.admin');
      } else {
        localStorage.setItem('knotlab.admin', '1');
      }
      window.location.reload();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    if (adminMode) {
      document.body.classList.add('admin-mode');
      buildToolbar();
    }
  });
})();
