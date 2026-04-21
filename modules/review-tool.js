/**
 * review-tool.js — Content Review & Citation tool for KnotLab.
 *
 * PUBLIC (always on): renders "Further reading" lists at the end of any
 *   .expo-panel whose data-edit-id appears in review.json with `further` refs.
 *
 * ADMIN (when localStorage.knotlab.admin === '1' or ?admin=1):
 *   - Floating "Review" button (bottom-right)
 *   - Panel: per-block status (unreviewed / reviewed / flagged), notes,
 *     attached in-line citation keys, and public "further reading" keys.
 *   - Reference library modal: CRUD for references.json entries.
 *   - "Export audit" button copies the rendered text of every panel on the
 *     current tab to the clipboard, ready to paste into Claude for review.
 *
 * Storage:
 *   review.json     { blocks: { <data-edit-id>: { status, notes, refs[], further[], updated } } }
 *   references.json { entries: [ { key, authors, title, venue, year, url, note } ] }
 */
(function () {
  'use strict';

  var ADMIN = /[?&]admin=1\b/.test(location.search) ||
              localStorage.getItem('knotlab.admin') === '1';

  var STATE = { review: { blocks: {} }, refs: { entries: [] }, ready: false };

  function fetchJSON(path) {
    return fetch(path + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function postJSON(path, body) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  function refByKey(key) {
    return (STATE.refs.entries || []).find(function (e) { return e.key === key; });
  }

  function formatRef(r) {
    if (!r) return '<em>[missing ref]</em>';
    var parts = [];
    if (r.authors) parts.push(r.authors);
    if (r.year) parts.push('(' + r.year + ')');
    var title = r.title ? '<em>' + escapeHtml(r.title) + '</em>' : '';
    var venue = r.venue ? escapeHtml(r.venue) : '';
    var s = parts.map(escapeHtml).join(' ');
    if (title) s += (s ? '. ' : '') + title;
    if (venue) s += (s ? '. ' : '') + venue;
    if (r.url) s += ' <a href="' + escapeAttr(r.url) + '" target="_blank" rel="noopener">[link]</a>';
    return s;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }

  // ── PUBLIC: render "Further reading" into panels ─────────────────────
  function renderFurtherReading() {
    document.querySelectorAll('[data-edit-id]').forEach(function (el) {
      var old = el.querySelector(':scope > .rv-further');
      if (old) old.remove();
      var id = el.getAttribute('data-edit-id');
      var rec = STATE.review.blocks[id];
      if (!rec || !rec.further || !rec.further.length) return;
      var box = document.createElement('div');
      box.className = 'rv-further';
      var lis = rec.further.map(function (k) {
        return '<li>' + formatRef(refByKey(k)) + '</li>';
      }).join('');
      box.innerHTML = '<strong>Further reading</strong><ul>' + lis + '</ul>';
      el.appendChild(box);
    });
  }

  // ── PUBLIC: inject minimal CSS ───────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('rv-style')) return;
    var css = [
      '.rv-further{margin-top:1em;padding:0.6em 0.9em;border-left:3px solid #7cb;',
      '  background:#f4f9fc;font-size:0.9em;border-radius:0 4px 4px 0}',
      '.rv-further strong{display:block;margin-bottom:0.3em;color:#2a6a8a}',
      '.rv-further ul{margin:0;padding-left:1.2em}',
      '.rv-further li{margin:0.2em 0}',
      '#rv-fab{position:fixed;bottom:5em;right:1em;z-index:10000;padding:0.6em 1em;',
      '  background:#2a6a8a;color:#fff;border:none;border-radius:4px;cursor:pointer;',
      '  font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.2)}',
      '#rv-panel{position:fixed;top:0;right:0;width:min(520px,95vw);height:100vh;',
      '  background:#fff;border-left:1px solid #ccc;z-index:9999;display:none;',
      '  flex-direction:column;box-shadow:-4px 0 20px rgba(0,0,0,0.15)}',
      '#rv-panel.open{display:flex}',
      '#rv-panel header{padding:0.8em 1em;background:#2a6a8a;color:#fff;',
      '  display:flex;justify-content:space-between;align-items:center}',
      '#rv-panel header button{background:none;border:none;color:#fff;font-size:1.2em;cursor:pointer}',
      '#rv-panel .rv-body{flex:1;overflow-y:auto;padding:0.8em}',
      '#rv-panel .rv-tabs{display:flex;gap:0.4em;padding:0.5em;background:#eef2f5;',
      '  border-bottom:1px solid #ccc}',
      '#rv-panel .rv-tabs button{padding:0.4em 0.8em;border:1px solid #aac;',
      '  background:#fff;cursor:pointer;border-radius:3px}',
      '#rv-panel .rv-tabs button.active{background:#2a6a8a;color:#fff;border-color:#2a6a8a}',
      '.rv-block{border:1px solid #ddd;border-radius:4px;padding:0.6em;margin-bottom:0.7em;background:#fafafa}',
      '.rv-block.reviewed{border-left:4px solid #4a4}',
      '.rv-block.flagged{border-left:4px solid #d44;background:#fff4f4}',
      '.rv-block h4{margin:0 0 0.3em;font-size:0.85em;color:#555;font-weight:normal}',
      '.rv-block .rv-preview{font-size:0.8em;color:#333;margin-bottom:0.4em;',
      '  max-height:4em;overflow:hidden;font-style:italic}',
      '.rv-block label{display:block;font-size:0.8em;margin:0.4em 0 0.15em;color:#444;font-weight:bold}',
      '.rv-block select,.rv-block input,.rv-block textarea{width:100%;padding:0.3em;',
      '  font-size:0.85em;border:1px solid #bbb;border-radius:3px;box-sizing:border-box;font-family:inherit}',
      '.rv-block textarea{min-height:3em;resize:vertical}',
      '.rv-block .rv-row{display:flex;gap:0.4em;align-items:center;margin-top:0.3em}',
      '.rv-block .rv-row button{padding:0.2em 0.5em;font-size:0.8em;cursor:pointer}',
      '.rv-block a.rv-scroll{font-size:0.8em;color:#2a6a8a;text-decoration:none;margin-left:0.5em}',
      '.rv-ref{border:1px solid #ddd;border-radius:4px;padding:0.5em;margin-bottom:0.5em;background:#fafafa}',
      '.rv-ref input,.rv-ref textarea{width:100%;padding:0.3em;font-size:0.85em;',
      '  border:1px solid #bbb;border-radius:3px;box-sizing:border-box;margin-bottom:0.3em}',
      '.rv-ref .rv-row{display:flex;gap:0.4em;margin-top:0.3em}',
      '.rv-toolbar{display:flex;gap:0.4em;margin-bottom:0.6em;flex-wrap:wrap}',
      '.rv-toolbar button{padding:0.35em 0.7em;cursor:pointer;border:1px solid #bbb;',
      '  background:#fff;border-radius:3px;font-size:0.85em}',
      '.rv-toolbar button.primary{background:#2a6a8a;color:#fff;border-color:#2a6a8a}',
      '.rv-highlight{outline:3px solid #ffb300 !important;outline-offset:2px;',
      '  transition:outline 0.3s}'
    ].join('\n');
    var s = document.createElement('style');
    s.id = 'rv-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── ADMIN: UI scaffolding ────────────────────────────────────────────
  var uiState = { mode: 'blocks' }; // 'blocks' | 'refs'

  function buildUI() {
    var fab = document.createElement('button');
    fab.id = 'rv-fab';
    fab.textContent = 'Review';
    fab.onclick = function () { openPanel(); };
    document.body.appendChild(fab);

    var panel = document.createElement('div');
    panel.id = 'rv-panel';
    panel.innerHTML =
      '<header><span>Content Review</span><button id="rv-close">&times;</button></header>' +
      '<div class="rv-tabs">' +
      '  <button data-mode="blocks" class="active">Blocks (this tab)</button>' +
      '  <button data-mode="refs">Reference library</button>' +
      '  <button id="rv-export" style="margin-left:auto">Export audit</button>' +
      '</div>' +
      '<div class="rv-body" id="rv-body"></div>';
    document.body.appendChild(panel);

    panel.querySelector('#rv-close').onclick = closePanel;
    panel.querySelectorAll('.rv-tabs button[data-mode]').forEach(function (b) {
      b.onclick = function () {
        uiState.mode = b.dataset.mode;
        panel.querySelectorAll('.rv-tabs button[data-mode]').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        renderPanel();
      };
    });
    panel.querySelector('#rv-export').onclick = exportAudit;
  }

  function openPanel() { document.getElementById('rv-panel').classList.add('open'); renderPanel(); }
  function closePanel() { document.getElementById('rv-panel').classList.remove('open'); }

  function renderPanel() {
    var body = document.getElementById('rv-body');
    if (!body) return;
    if (uiState.mode === 'blocks') renderBlocksView(body);
    else renderRefsView(body);
  }

  // ── Blocks view ──────────────────────────────────────────────────────
  function currentTabId() {
    var active = document.querySelector('.tab-content.active');
    return active ? active.id.replace(/^tab-/, '') : null;
  }

  function renderBlocksView(body) {
    var tabId = currentTabId();
    if (!tabId) { body.innerHTML = '<em>No active tab.</em>'; return; }
    var active = document.getElementById('tab-' + tabId);
    // Only collect top-level editable panels (typed expository blocks).
    var blocks = [].slice.call(active.querySelectorAll('[data-edit-id]'));
    blocks = blocks.filter(function (el) {
      // Exclude nested edit nodes: keep outermost only.
      return !el.parentElement.closest('[data-edit-id]');
    });

    var counts = { unreviewed: 0, reviewed: 0, flagged: 0 };
    blocks.forEach(function (el) {
      var rec = STATE.review.blocks[el.getAttribute('data-edit-id')] || {};
      var s = rec.status || 'unreviewed';
      counts[s] = (counts[s] || 0) + 1;
    });

    var html = '<div class="rv-toolbar">' +
      '<strong>' + escapeHtml(tabId) + '</strong>: ' + blocks.length + ' blocks ' +
      '(<span style="color:#4a4">' + counts.reviewed + ' reviewed</span>, ' +
      '<span style="color:#d44">' + counts.flagged + ' flagged</span>, ' +
      counts.unreviewed + ' unreviewed)' +
      '</div>';

    blocks.forEach(function (el, i) {
      var id = el.getAttribute('data-edit-id');
      var rec = STATE.review.blocks[id] || { status: 'unreviewed', notes: '', refs: [], further: [] };
      var preview = (el.innerText || '').replace(/\s+/g, ' ').slice(0, 160);
      var refKeyList = (STATE.refs.entries || []).map(function (r) { return r.key; });
      html +=
        '<div class="rv-block ' + (rec.status || 'unreviewed') + '" data-bid="' + escapeAttr(id) + '">' +
        '  <h4>#' + (i + 1) + ' · <code style="font-size:0.9em">' + escapeHtml(id) + '</code>' +
        '    <a href="#" class="rv-scroll" data-scroll="' + escapeAttr(id) + '">↗ scroll to</a>' +
        '  </h4>' +
        '  <div class="rv-preview">' + escapeHtml(preview) + (preview.length === 160 ? '…' : '') + '</div>' +
        '  <label>Status</label>' +
        '  <select data-field="status">' +
        '    <option value="unreviewed"' + (rec.status === 'unreviewed' ? ' selected' : '') + '>Unreviewed</option>' +
        '    <option value="reviewed"' + (rec.status === 'reviewed' ? ' selected' : '') + '>Reviewed ✓</option>' +
        '    <option value="flagged"' + (rec.status === 'flagged' ? ' selected' : '') + '>Flagged ⚠</option>' +
        '  </select>' +
        '  <label>Review notes (private)</label>' +
        '  <textarea data-field="notes" placeholder="What needs fixing? Quote source text, etc.">' +
             escapeHtml(rec.notes || '') + '</textarea>' +
        '  <label>In-text citation keys (comma-separated; for your own traceability)</label>' +
        '  <input data-field="refs" value="' + escapeAttr((rec.refs || []).join(', ')) + '" ' +
        '    list="rv-refkeys-' + i + '" placeholder="e.g. rolfsen1976, gordon-luecke1989">' +
        '  <datalist id="rv-refkeys-' + i + '">' +
             refKeyList.map(function (k) { return '<option value="' + escapeAttr(k) + '">'; }).join('') +
        '  </datalist>' +
        '  <label>Public "Further reading" keys (comma-separated; appears under the panel)</label>' +
        '  <input data-field="further" value="' + escapeAttr((rec.further || []).join(', ')) + '" ' +
        '    list="rv-refkeys-' + i + '" placeholder="e.g. lickorish1997, kauffman2001">' +
        '  <div class="rv-row">' +
        '    <button data-act="save" class="primary">Save</button>' +
        '    <button data-act="clear">Clear</button>' +
        '  </div>' +
        '</div>';
    });

    body.innerHTML = html;

    // Wire up handlers.
    body.querySelectorAll('a.rv-scroll').forEach(function (a) {
      a.onclick = function (e) {
        e.preventDefault();
        var target = document.querySelector('[data-edit-id="' + CSS.escape(a.dataset.scroll) + '"]');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('rv-highlight');
          setTimeout(function () { target.classList.remove('rv-highlight'); }, 1500);
        }
      };
    });

    body.querySelectorAll('.rv-block').forEach(function (bl) {
      var id = bl.dataset.bid;
      bl.querySelector('[data-act="save"]').onclick = function () {
        var rec = {
          id: id,
          status: bl.querySelector('[data-field="status"]').value,
          notes: bl.querySelector('[data-field="notes"]').value,
          refs: splitKeys(bl.querySelector('[data-field="refs"]').value),
          further: splitKeys(bl.querySelector('[data-field="further"]').value)
        };
        postJSON('/admin/review', rec).then(function (r) {
          if (r && r.ok) {
            STATE.review.blocks[id] = rec;
            bl.className = 'rv-block ' + rec.status;
            renderFurtherReading();
            flash(bl, 'Saved ✓');
          } else {
            flash(bl, 'Error', true);
          }
        });
      };
      bl.querySelector('[data-act="clear"]').onclick = function () {
        if (!confirm('Clear review for this block?')) return;
        postJSON('/admin/review', { id: id, delete: true }).then(function (r) {
          if (r && r.ok) {
            delete STATE.review.blocks[id];
            renderFurtherReading();
            renderPanel();
          }
        });
      };
    });
  }

  function splitKeys(s) {
    return String(s || '').split(/[,\s]+/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function flash(el, msg, err) {
    var n = document.createElement('span');
    n.textContent = ' ' + msg;
    n.style.color = err ? '#d44' : '#4a4';
    n.style.marginLeft = '0.5em';
    n.style.fontSize = '0.85em';
    el.querySelector('[data-act="save"]').after(n);
    setTimeout(function () { n.remove(); }, 1500);
  }

  // ── Reference library view ───────────────────────────────────────────
  function renderRefsView(body) {
    var entries = STATE.refs.entries || [];
    var html =
      '<div class="rv-toolbar">' +
      '  <button id="rv-addref" class="primary">+ New reference</button>' +
      '  <span style="align-self:center">' + entries.length + ' entries</span>' +
      '</div>' +
      '<div id="rv-refs-list"></div>';
    body.innerHTML = html;

    var list = body.querySelector('#rv-refs-list');
    function renderList() {
      list.innerHTML = entries.map(refEditor).join('');
      list.querySelectorAll('.rv-ref').forEach(function (rb) { wireRef(rb); });
    }
    renderList();

    body.querySelector('#rv-addref').onclick = function () {
      var key = prompt('Citation key (short, e.g. "rolfsen1976"):');
      if (!key) return;
      key = key.trim();
      if (!key) return;
      if (entries.find(function (e) { return e.key === key; })) {
        alert('Key already exists.');
        return;
      }
      entries.unshift({ key: key, authors: '', title: '', venue: '', year: '', url: '', note: '' });
      renderList();
    };
  }

  function refEditor(e) {
    return '<div class="rv-ref" data-key="' + escapeAttr(e.key) + '">' +
      '<label style="font-size:0.8em;color:#555"><strong>' + escapeHtml(e.key) + '</strong></label>' +
      '<input data-f="authors" placeholder="Authors (e.g. Rolfsen, D.)" value="' + escapeAttr(e.authors) + '">' +
      '<input data-f="title" placeholder="Title" value="' + escapeAttr(e.title) + '">' +
      '<input data-f="venue" placeholder="Venue (journal, publisher, arXiv:xxxx)" value="' + escapeAttr(e.venue) + '">' +
      '<input data-f="year" placeholder="Year" value="' + escapeAttr(e.year) + '" style="max-width:8em">' +
      '<input data-f="url" placeholder="URL / DOI" value="' + escapeAttr(e.url) + '">' +
      '<textarea data-f="note" placeholder="Optional note / page range">' + escapeHtml(e.note) + '</textarea>' +
      '<div class="rv-row">' +
      '  <button data-act="save" class="primary">Save</button>' +
      '  <button data-act="del">Delete</button>' +
      '  <span class="rv-preview" style="margin-left:auto;font-size:0.8em;color:#666">Preview: ' + formatRef(e) + '</span>' +
      '</div></div>';
  }

  function wireRef(rb) {
    var key = rb.dataset.key;
    function collect() {
      return {
        key: key,
        authors: rb.querySelector('[data-f="authors"]').value,
        title: rb.querySelector('[data-f="title"]').value,
        venue: rb.querySelector('[data-f="venue"]').value,
        year: rb.querySelector('[data-f="year"]').value,
        url: rb.querySelector('[data-f="url"]').value,
        note: rb.querySelector('[data-f="note"]').value
      };
    }
    rb.querySelector('[data-act="save"]').onclick = function () {
      var rec = collect();
      postJSON('/admin/reference', rec).then(function (r) {
        if (r && r.ok) {
          var i = STATE.refs.entries.findIndex(function (x) { return x.key === key; });
          if (i >= 0) STATE.refs.entries[i] = rec; else STATE.refs.entries.push(rec);
          renderFurtherReading();
          flash(rb, 'Saved ✓');
        } else { flash(rb, 'Error', true); }
      });
    };
    rb.querySelector('[data-act="del"]').onclick = function () {
      if (!confirm('Delete reference "' + key + '"?')) return;
      postJSON('/admin/reference', { action: 'delete', key: key }).then(function (r) {
        if (r && r.ok) {
          STATE.refs.entries = STATE.refs.entries.filter(function (x) { return x.key !== key; });
          renderFurtherReading();
          renderPanel();
        }
      });
    };
  }

  // ── Export audit (clipboard) ─────────────────────────────────────────
  function exportAudit() {
    var tabId = currentTabId();
    var active = document.getElementById('tab-' + tabId);
    var blocks = [].slice.call(active.querySelectorAll('[data-edit-id]'))
      .filter(function (el) { return !el.parentElement.closest('[data-edit-id]'); });
    var lines = ['# Audit export — tab: ' + tabId + ' — ' + new Date().toISOString(), ''];
    blocks.forEach(function (el, i) {
      var id = el.getAttribute('data-edit-id');
      var rec = STATE.review.blocks[id] || {};
      lines.push('## Block #' + (i + 1) + '  [' + (rec.status || 'unreviewed') + ']  ' + id);
      lines.push('');
      lines.push((el.innerText || '').trim());
      lines.push('');
      if (rec.notes) lines.push('> NOTES: ' + rec.notes);
      if (rec.refs && rec.refs.length) lines.push('> REFS: ' + rec.refs.join(', '));
      lines.push('---');
    });
    var text = lines.join('\n');
    navigator.clipboard.writeText(text).then(function () {
      alert('Audit for "' + tabId + '" copied to clipboard (' + blocks.length + ' blocks).');
    }, function () {
      // Fallback: open in new window.
      var w = window.open('', '_blank');
      w.document.write('<pre>' + escapeHtml(text) + '</pre>');
    });
  }

  // ── Bootstrap ────────────────────────────────────────────────────────
  function boot() {
    injectCSS();
    Promise.all([fetchJSON('/review.json'), fetchJSON('/references.json')]).then(function (r) {
      STATE.review = r[0] || { blocks: {} };
      STATE.refs = r[1] || { entries: [] };
      STATE.ready = true;
      renderFurtherReading();
      if (ADMIN) buildUI();
    });
    // Re-render "further reading" whenever tabs switch or content changes.
    var origSwitch = window.switchTab;
    if (typeof origSwitch === 'function') {
      window.switchTab = function (id) {
        origSwitch.apply(this, arguments);
        setTimeout(renderFurtherReading, 100);
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
