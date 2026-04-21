import re, sys, os
ROOT = os.path.dirname(os.path.abspath(__file__))
files = [
    'modules/introduction.js',
    'modules/polynomial-invariants.js',
    'modules/homological-invariants.js',
    'modules/gauss-linking.js',
    'modules/miscellaneous.js',
    'modules/appendix.js',
    'app.js',
]
for rel in files:
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        print(rel, 'MISSING'); continue
    s = open(p, encoding='utf-8').read()
    stripped = re.sub(r'`(?:[^`\\]|\\.|\$\{[^}]*\})*`', '``', s, flags=re.S)
    stripped = re.sub(r"'(?:[^'\\]|\\.)*'", "''", stripped, flags=re.S)
    stripped = re.sub(r'"(?:[^"\\]|\\.)*"', '""', stripped, flags=re.S)
    stripped = re.sub(r'//[^\n]*', '', stripped)
    stripped = re.sub(r'/\*.*?\*/', '', stripped, flags=re.S)
    print(f"{rel:42} braces={stripped.count('{')-stripped.count('}'):+d} "
          f"parens={stripped.count('(')-stripped.count(')'):+d} "
          f"brackets={stripped.count('[')-stripped.count(']'):+d} "
          f"bytes={len(s)}")
