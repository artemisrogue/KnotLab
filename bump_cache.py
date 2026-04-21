"""Bump the ?v= cache-buster query string on each local script/stylesheet
reference in index.html to the file's current mtime.

Run after any edit to modules/, app.js, or style.css:
    python bump_cache.py

Only touches references to local files (no CDN), and only those that already
carry a ?v=... query. Leaves the rest of index.html untouched.
"""
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(ROOT, "index.html")

# Matches src="foo.js?v=123" or href="foo.css?v=45" where foo is a LOCAL path
# (no scheme, no //). Captures: 1=attr, 2=path, 3=old version.
PATTERN = re.compile(
    r'''((?:src|href)\s*=\s*")([^"#?\s][^"?\s]*\.(?:js|css))\?v=([^"]*)'''
)


def main():
    with open(INDEX, "r", encoding="utf-8") as f:
        html = f.read()

    changed = []
    def repl(m):
        attr, path, old = m.group(1), m.group(2), m.group(3)
        # Skip CDN-style URLs (shouldn't match the pattern anyway).
        if path.startswith(("http", "//")):
            return m.group(0)
        full = os.path.join(ROOT, path.replace("/", os.sep))
        if not os.path.exists(full):
            return m.group(0)
        mtime = int(os.path.getmtime(full))
        new = attr + path + "?v=" + str(mtime)
        if str(mtime) != old:
            changed.append((path, old, str(mtime)))
        return new

    new_html = PATTERN.sub(repl, html)
    if new_html != html:
        with open(INDEX, "w", encoding="utf-8") as f:
            f.write(new_html)

    if changed:
        print("Cache-busters bumped:")
        for path, old, new in changed:
            print(f"  {path}: ?v={old} -> ?v={new}")
    else:
        print("All cache-busters already current.")


if __name__ == "__main__":
    main()
