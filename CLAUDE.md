# CLAUDE.md — working notes for KnotLab

A graduate-level, interactive knot-theory teaching web app (vanilla JS, KaTeX, Three.js, Plotly). No build step; static files served by `serve.py`.

## Layout

```
index.html               top-level tab bar; one <script src> per module
app.js                   tab switching, hash routing, admin-mode scaffolding
serve.py                 Python static server + admin POST endpoints (/admin/*)
bump_cache.py            bumps ?v=… timestamps for every referenced JS/CSS file
smoke_test.py            naive brace-count sanity check (six warnings are baseline, see below)
content.json             committed text-override layer  (edited via admin mode)
overrides.json           working-copy text-override layer
references.json          bibliography (69 entries); author/year/title/arxiv/url
bibliography/            downloaded PDFs (content-verified via pypdf)
modules/                 per-tab content modules (see below)
knot-explorer/           iframe-based interactive module (DO NOT TOUCH without explicit permission)
```

## Top-level tabs → modules

| Tab | Module | Entry |
|---|---|---|
| Home | `modules/introduction.js` | `window.renderIntroduction` |
| Linking | `modules/gauss-linking.js` + `modules/framed-knots.js` | `window.renderGaussLinking` |
| Polynomial Invariants | `modules/polynomial-invariants.js` | `window.renderPolynomialInvariants` |
| Homological Invariants | `modules/homological-invariants.js` | `window.renderHomologicalInvariants` |
| Knot Explorer | iframe → `knot-explorer/index.html` | (own JS) |
| Number Theory | `modules/number-theory.js` | `window.renderNumberTheory` |
| Miscellaneous | `modules/miscellaneous.js` | `window.renderMiscellaneous` |
| Appendix | `modules/appendix.js` | `window.renderAppendix` |

Plus `modules/review-tool.js` (admin overlay, independent of tabs).

## House conventions — follow these for every edit

1. **Every module is an IIFE** exposing a single `window.renderXxx(containerEl)`. No ES modules, no bundler.
2. **HTML is built with string concatenation**, not template literals:
   ```js
   el.innerHTML =
     '<div class="expo-panel">' +
       '<h3>Title</h3>' +
       '<p>Body with inline math \\(x^2\\).</p>' +
     '</div>';
   ```
   Many modules use backslash line-continuation (`'<div>\\\n    ...\\\n</div>'`) — match the file's existing style.
3. **KaTeX**: inline `\\(...\\)`, display inside `<div class="formula-box">$...$</div>`. KaTeX auto-render runs per-module via `renderMathInElement`.
4. **Collapsibles** (closed by default):
   ```html
   <details class="kl-proof"><summary>Proof sketch: …</summary><p>…</p></details>
   ```
   Classes in use: `kl-proof`, `kl-example`, `kl-practice`, `kl-interactive`, `kl-diagram`.
5. **Tooltips**: `<span class="kl-term" title="plain-text, Unicode math only">term</span>`.  
   **⚠ Never put `\\(…\\)` or `$…$` inside a `title="…"` attribute** — `title` is plain text; use Unicode (τ, Δ, ℤ, ⊗, ≅, ∂, ⁺, ⁻, etc.).

## Apostrophe hazard (causes silent tab-blank outages)

Modules concatenate HTML inside **single-quoted JS strings**. An ASCII apostrophe `'` appearing anywhere inside — including inside an HTML `title="..."` attribute — will prematurely terminate the JS string. Two such outages have occurred (Homological Invariants went blank twice). **Always write possessives/contractions/quotes with Unicode** inside module strings:

- `Reidemeister's` → `Reidemeister&rsquo;s`  (or `\u2019`)
- `'minus'` → `&lsquo;minus&rsquo;`
- `Υ'_K(0⁺)` → `Υ′_K(0⁺)` (prime, not ASCII apostrophe)
- `Khovanov's` → `Khovanov&rsquo;s`

Pairs of stray apostrophes are the subtler failure: two `'`s on the same line produce an even count and pass `smoke_test.py` silently, but expose the text between them as raw JS → parse error.

**Preferred parse verification** after editing any module:
```bash
cd /c/Users/seand/Claude_projects/KnotLab
cscript //E:JScript //Nologo _test.js         # project-root helper; edit path inside
```
`_test.js` wraps the module in `new Function(src)` — a clean parse means `window.renderXxx` will bind. JScript is ES3, so ES6-using files (arrow fns, `let`, template literals) will always error on `new Function` — only use this check for concat-string modules (the introduction / gauss / polynomial / homological / miscellaneous / number-theory / appendix files use IIFE + `var` + concat and ARE ES3-compatible).

For ES6 modules, the string-aware brace/paren check in `_brace_check.py` is the fallback.

## Post-edit workflow (always)

1. Edit.
2. `python _brace_check.py modules/<edited>.js` — must say **balanced**.
3. Parse-test with JScript if module is ES3-compat (see above).
4. `python bump_cache.py` — rewrites the `?v=…` timestamps in index.html.
5. `python smoke_test.py` — must show `0 errors`; the six warnings below are the accepted baseline:
   - `app.js`, `introduction.js`, `gauss-linking.js`, `appendix.js`, `review-tool.js`, and one rotating module (`miscellaneous.js`, `number-theory.js`, etc.) can appear with small +/- counts — these come from braces/parens inside regexes and string literals that the naive counter doesn't understand.
6. Hard-refresh in the browser to defeat cache.

## Knot Explorer — off-limits unless explicitly asked

The Knot Explorer tab is a self-contained iframe app under `knot-explorer/` with its own HTML, CSS, JS, data. **Do not touch it** as part of general content edits. Its sub-tab bar is intentionally visible (Invariants / Cube of Resolutions / Homological / Khovanov Complex). App.js lazy-loads the iframe on first tab activation.

## Git & backups

- `master` is the working branch.
- Named-snapshot tags: `backup-focus1`, `backup-focus2`, `backup-focus3`, `backup-milestone-phase2`, and further ones created at each milestone commit. Use `git tag -f backup-<name>` to re-point.
- Commit style: imperative first line under 72 chars, body explaining *why*. End with the `Co-Authored-By` trailer when Claude generated the commit.
- **Never** force-push, reset-hard, or skip hooks without explicit user permission.

## Bibliography

- `references.json` is the canonical list (69 entries as of April 2026).
- Every new entry should ship with a PDF in `bibliography/` verified by pypdf first-page read against the entry's title + first author.
- Keep entries sorted by ID conventionally: `firstauthor-year[-tag]` (`ozsvath-szabo-2005`, `hom-2014`, …).

## Known quirks

- `smoke_test.py`'s brace-count warnings are informational, not errors. Treat only `ERROR` lines as blocking.
- Modern-JS modules (arrow fns, `const`, template literals) will fail the JScript parse check; that's not a real failure for browsers. Use `_brace_check.py` as the fallback for those files.
- Cache busts are strictly append-only — never clear `?v=…` values by hand; always run `bump_cache.py`.
- Admin mode is toggled with Ctrl+Shift+E in-browser, or `?admin=1` in the URL. Edits post to `/admin/save`; commit with `/admin/commit` (merges overrides into `content.json`).

## House style for prose

- Graduate audience: say "Seifert surface," not "a special surface used by Seifert"; state theorems precisely with dates and authors.
- Every non-trivial theorem should have a citation in `references.json`.
- Proof sketches live in `<details class="kl-proof">` — closed by default. Aim for 4–10 lines that convey the key mechanism, not a full proof.
- Historical remarks and conjecture-vs-theorem status belong in the text; never silently promote a conjecture.
