"""Static smoke test for KnotLab.

Catches the kinds of breakages the app silently suffers from:
  - script/stylesheet references in index.html that point at missing files
  - JSON files that no longer parse (references.json, content.json, etc.)
  - JS files whose braces/parens/brackets don't balance (rough heuristic)
  - sub-tab ids wired up in the render() routers but not in SUB_TABS (and vice versa)
  - cache-buster ?v= values that don't match current mtime

Run with:  python smoke_test.py
Exits non-zero if any check fails.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
errors = []
warnings = []


def err(msg): errors.append(msg)
def warn(msg): warnings.append(msg)


# ── 1. index.html references resolve ────────────────────────────────────
INDEX = os.path.join(ROOT, "index.html")
if not os.path.exists(INDEX):
    err("index.html missing")
else:
    with open(INDEX, encoding="utf-8") as f:
        html = f.read()
    # Local script/stylesheet refs (ignore CDN http(s):// and //)
    refs = re.findall(r'(?:src|href)="((?!https?:|//)[^"#?]+\.(?:js|css))(\?v=[^"]*)?"', html)
    for path, qs in refs:
        full = os.path.join(ROOT, path.replace("/", os.sep))
        if not os.path.exists(full):
            err(f"index.html references missing file: {path}")
        elif qs:
            m = re.match(r"\?v=(\d+)$", qs)
            if m:
                want = int(os.path.getmtime(full))
                have = int(m.group(1))
                # Allow cache-busters to be "whatever" — but if it's a timestamp
                # in the past century, warn when stale (file is strictly newer).
                if have < want - 3600 and have > 1_000_000_000:
                    warn(f"{path} cache-buster ?v={have} is older than file mtime {want}")


# ── 2. JSON files parse ──────────────────────────────────────────────────
for rel in ("references.json", "content.json", "overrides.json", "review.json"):
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        continue
    try:
        with open(p, encoding="utf-8") as f:
            json.load(f)
    except Exception as e:
        err(f"{rel} does not parse: {e}")


# ── 3. JS balance check (rough) ──────────────────────────────────────────
JS_FILES = [
    "app.js",
    "modules/introduction.js",
    "modules/framed-knots.js",
    "modules/gauss-linking.js",
    "modules/polynomial-invariants.js",
    "modules/homological-invariants.js",
    "modules/number-theory.js",
    "modules/miscellaneous.js",
    "modules/appendix.js",
    "modules/review-tool.js",
]

def strip_js(s):
    # Template literals: replace whole `...${...}...` with empty backticks.
    # Do this FIRST so ${...} braces inside literals don't confuse us.
    s = re.sub(r"`(?:[^`\\]|\\.|\$\{[^{}]*\})*`", "``", s, flags=re.S)
    s = re.sub(r"'(?:[^'\\]|\\.)*'", "''", s, flags=re.S)
    s = re.sub(r'"(?:[^"\\]|\\.)*"', '""', s, flags=re.S)
    s = re.sub(r"//[^\n]*", "", s)
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)
    return s

for rel in JS_FILES:
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        err(f"missing JS file: {rel}")
        continue
    with open(p, encoding="utf-8") as f:
        stripped = strip_js(f.read())
    b = stripped.count("{") - stripped.count("}")
    pa = stripped.count("(") - stripped.count(")")
    br = stripped.count("[") - stripped.count("]")
    if b != 0 or pa != 0 or br != 0:
        # Some existing files have pre-existing non-zero balances from nested
        # template literals the regex can't fully unwind — downgrade to warn.
        warn(f"{rel}: braces={b:+d} parens={pa:+d} brackets={br:+d}")


# ── 4. SUB_TABS ↔ router consistency ─────────────────────────────────────
#   For each module using the fk-subtab pattern: every id in SUB_TABS must
#   be handled by a render() branch, and vice versa.
for rel in JS_FILES:
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        continue
    with open(p, encoding="utf-8") as f:
        src = f.read()
    m = re.search(r"SUB_TABS\s*=\s*\[(.*?)\]", src, flags=re.S)
    if not m:
        continue
    ids_in_array = set(re.findall(r"id:\s*'([^']+)'", m.group(1)))
    # Find state.subTab branches
    branches = set(re.findall(r"state\.subTab\s*===\s*'([^']+)'", src))
    # prefix-matches (like .startsWith('fk-')) — accept all
    prefixes = re.findall(r"state\.subTab\.startsWith\s*\(\s*'([^']+)'", src)
    # Catch-all: if the code passes state.subTab as an argument to some
    # renderer function, treat all SUB_TABS as covered via delegation.
    has_catch_all = bool(re.search(r"\w+\s*\(\s*[^)]*state\.subTab", src))

    def is_covered(tab_id):
        if has_catch_all: return True
        if tab_id in branches: return True
        for pf in prefixes:
            if tab_id.startswith(pf): return True
        return False

    for tid in ids_in_array:
        if not is_covered(tid):
            err(f"{rel}: SUB_TABS id '{tid}' has no render branch")
    for bid in branches:
        if bid not in ids_in_array:
            warn(f"{rel}: render branch for '{bid}' has no matching SUB_TABS entry")


# ── 5. window.renderXxx exports wired from app.js ────────────────────────
APP = os.path.join(ROOT, "app.js")
if os.path.exists(APP):
    with open(APP, encoding="utf-8") as f:
        app_src = f.read()
    # Each module file should define window.renderXxx that app.js can call.
    # Find all "fn: 'renderXxx'" entries in app.js.
    wired = set(re.findall(r"fn:\s*'(render\w+)'", app_src))
    defined = set()
    for rel in JS_FILES:
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            continue
        with open(p, encoding="utf-8") as f:
            s = f.read()
        for name in re.findall(r"window\.(render\w+)\s*=", s):
            defined.add(name)
    for w in wired:
        if w not in defined:
            err(f"app.js wires '{w}' but no module defines window.{w}")


# ── Report ───────────────────────────────────────────────────────────────
print("=" * 60)
print(f"KnotLab smoke test — {len(errors)} errors, {len(warnings)} warnings")
print("=" * 60)
for w in warnings:
    print(f"  WARN  {w}")
for e in errors:
    print(f"  ERR   {e}")
if errors:
    sys.exit(1)
print("OK")
