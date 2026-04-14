# KnotLab Admin Editing Guide

## Enabling admin mode
- Append `?admin=1` to the URL, **or**
- Press **Ctrl+Shift+E** to toggle, **or**
- Set `localStorage.knotlab = '1'` in devtools.

A dark toolbar appears bottom-right with status, **Insert eq**, **Revert element**, and **Exit admin**. Editable blocks are outlined dashed orange; edited blocks turn green; the one being edited turns blue.

All changes persist to `overrides.json` via the dev server — reloads preserve them. **Revert element** removes the override for the focused block.

## Two views of LaTeX
Every paragraph/heading has two modes:

| View | When | What you see |
|---|---|---|
| **WYSIWYG** | Not editing | KaTeX-rendered math: α, ∫, etc. |
| **LaTeX source** | Click to edit | Raw `\(\alpha\)`, `$\int…$`, etc. |

Click once to enter source view, edit freely, click out (or Tab away) to re-render. Both inline `\(…\)` and display `$…$` work; KaTeX auto-render handles both on blur.

## Inline editing tips
- Type `\(x^2\)` for inline math, `$\int f\,dx$` for display math.
- Newlines are preserved as real line breaks — the editor uses `plaintext-only` so `<pre>`/`<div>` wrapping won't break KaTeX.
- Press **Esc** to cancel edits (reverts to last saved), blur or Tab to commit.

## Equation editor (Ctrl+M or "Insert eq")
Opens a modal with:

- **Left: Snippets sidebar** — built-in macros grouped by Greek, Sets, Operators, Relations, Arrows, Structures, Knot Theory. Click any snippet to insert at caret.
- **Right: Split editor** — LaTeX textarea on top, **live KaTeX preview below**. You see source and WYSIWYG simultaneously.
- **Inline / Display** radio — toggles `\(…\)` vs `$…$` wrappers.
- **Ctrl+Enter** commits, **Esc** cancels.

**Replace mode**: if your caret is inside existing `\(…\)` or `$…$` when you open the editor, it prefills with that source and replaces it on commit. Otherwise it inserts at the caret.

## Saving custom snippets (macros / clipboard)
In the modal's snippets sidebar, the **+ Save** button stores the current textarea content as a named snippet. It appears under **Custom** and is persisted server-side in `overrides.json` under `_snippets`. Hover a custom snippet to reveal **×** to delete.

Use this for anything you retype often: long skein relations, your preferred matrix templates, frequently-used identities, macros.

## Adding new elements
Hover any editable block — a blue **+** appears at its bottom-left. Click it for a menu:

- Paragraph
- H2 / H3 / H4
- Quote
- Display equation (pre-seeded with `$…$`)

New elements get IDs like `ins::home::abc123` and persist under `_inserts` in `overrides.json`. A red **×** on hover deletes an inserted element (native elements can only be reverted, not deleted).

## Keyboard shortcuts
| Key | Action |
|---|---|
| **Ctrl+Shift+E** | Toggle admin mode |
| **Ctrl+M** | Open equation editor on current block |
| **Ctrl+Enter** | Commit equation modal |
| **Esc** | Cancel edit / close modal |
| **Tab** / click-out | Commit inline edit |

## Files
- `overrides.json` — all edits, inserts, and snippets (safe to commit or delete).
- `serve.py` — dev server on `http://127.0.0.1:8780`.
- Run: `python serve.py`.
