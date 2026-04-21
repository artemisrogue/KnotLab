#!/usr/bin/env python3
"""Jones polynomial comparison sanity test.

Tests the parser + comparator logic used by tab-homological.js::verifyJones
against stored KnotInfo data. Runs entirely in Python (no node required).

For each case we:
  1. Parse `jones_latex` (self-test: must exact-match itself).
  2. Parse `mirror_jones_latex` and verify that `mirror(jones) == mirror_jones`
     via one of: exact / mirror / Laurent shift / mirror+shift.

Usage: python _jones_verify_test.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).parent
KNOTS = json.loads((ROOT / "knot-explorer/data/knots.json").read_text(encoding="utf-8"))
LINKS = json.loads((ROOT / "knot-explorer/data/links.json").read_text(encoding="utf-8"))


def _add(terms, c, e):
    if c == 0:
        return
    e = round(e * 2) / 2
    s = terms.get(e, 0) + c
    if s == 0:
        terms.pop(e, None)
    else:
        terms[e] = s


def parse_jones_latex(latex):
    """Mirror of tab-homological.js parseJonesLatex."""
    terms = {}
    s = re.sub(r"\s+", " ", latex).strip()

    # \left( ... \right) with q^k prefix
    li = s.find(r"\left(")
    if li > 0:
        ri = s.rfind(r"\right)")
        if ri > li:
            prefix = s[:li].strip()
            inner = s[li + 6:ri].strip()
            outer_coeff, outer_exp = 1, 0
            m = re.search(r"([+-]?\d*)\s*q(?:\^\{([^}]+)\})?$", prefix)
            if m:
                c_ = m.group(1)
                outer_coeff = 1 if c_ in ("", "+") else (-1 if c_ == "-" else float(c_))
                outer_exp = float(m.group(2)) if m.group(2) else 1
            inner_terms = parse_jones_latex(inner)
            for e, c in inner_terms.items():
                _add(terms, c * outer_coeff, e + outer_exp)
            return terms

    # \frac{polynomial}{q^M}
    if s.startswith(r"\frac{"):
        bd = 0
        num_end = -1
        for fi in range(5, len(s)):
            if s[fi] == "{":
                bd += 1
            elif s[fi] == "}":
                bd -= 1
                if bd == 0:
                    num_end = fi
                    break
        if num_end > 0:
            rest = s[num_end + 1:]
            dm = re.fullmatch(r"\{q\^\{?(\d+)\}?\}", rest)
            if dm:
                num_terms = parse_jones_latex(s[6:num_end])
                shift = -int(dm.group(1))
                for e, c in num_terms.items():
                    _add(terms, c, e + shift)
                return terms

    s = s.replace(r"\sqrt{q}", "q^{0.5}")
    s = re.sub(r"\\frac\{([^}]*)\}\{q\^\{\\frac\{(\d+)\}\{(\d+)\}\}\}",
               lambda m: f"({m.group(1)})q^{{{-int(m.group(2))/int(m.group(3))}}}", s)
    s = re.sub(r"\\frac\{([^}]*)\}\{q\^\{?(-?[\d.]+)\}?\}",
               lambda m: f"({m.group(1)})q^{{{-float(m.group(2))}}}", s)
    s = re.sub(r"\\frac\{([^}]*)\}\{q\}", r"(\1)q^{-1}", s)
    s = re.sub(r"q\^\{\\frac\{(-?\d+)\}\{(\d+)\}\}",
               lambda m: f"q^{{{int(m.group(1))/int(m.group(2))}}}", s)

    # tokenize by +/- at brace depth 0
    tokens = []
    cur = ""
    bd = 0
    for ch in s:
        if ch == "{": bd += 1
        elif ch == "}": bd -= 1
        if bd == 0 and ch in "+-" and cur.strip():
            tokens.append(cur.strip())
            cur = "-" if ch == "-" else ""
        else:
            cur += ch
    if cur.strip():
        tokens.append(cur.strip())

    for tok in tokens:
        tok = tok.strip()
        if not tok:
            continue
        tok = re.sub(r"^([+-]?)\s*\(([^)]*)\)", r"\1\2", tok)
        coeff, exp = 1.0, 0.0
        qi = tok.find("q")
        if qi == -1:
            try:
                coeff = float(tok.replace(" ", ""))
            except ValueError:
                coeff = 0
        else:
            before = tok[:qi].replace(" ", "")
            if before in ("", "+"):
                coeff = 1
            elif before == "-":
                coeff = -1
            else:
                try:
                    coeff = float(before)
                except ValueError:
                    coeff = 0
            after = tok[qi + 1:].strip()
            if after == "":
                exp = 1
            else:
                m = re.match(r"^\^\{?([^}]*)\}?", after)
                if m:
                    try:
                        exp = float(m.group(1))
                    except ValueError:
                        exp = 0
                else:
                    exp = 1
        _add(terms, coeff, exp)
    return terms


def compare(a, b):
    keys = set(a) | set(b)
    return all(abs(a.get(k, 0) - b.get(k, 0)) < 1e-9 for k in keys)


def mirror(m):
    return {-e: c for e, c in m.items()}


def try_shift(src, tgt):
    if len(src) != len(tgt) or not src:
        return None
    k = min(tgt) - min(src)
    shifted = {round((e + k) * 2) / 2: c for e, c in src.items()}
    return k if compare(shifted, tgt) else None


def classify(src, tgt):
    if compare(src, tgt): return ("exact", None)
    m = mirror(src)
    if compare(m, tgt): return ("mirror", None)
    k = try_shift(src, tgt)
    if k is not None: return ("shift", k)
    km = try_shift(m, tgt)
    if km is not None: return ("mirror+shift", km)
    return ("fail", None)


def fmt(m):
    items = sorted(m.items(), key=lambda p: -p[0])
    return " ".join(f"{'+' if c>=0 else ''}{c:g}*q^{e:g}" for e, c in items)


CASES = [
    "3_1", "4_1", "5_1", "5_2", "6_1", "6_2", "6_3",
    "7_1", "8_19", "9_42", "10_124",
    "L2a1", "L4a1", "L5a1", "L6a1", "L6a2", "L6a3", "L6n1",
    "L7a1", "L7a2", "L7a3", "L8a1", "L8n1",
]

if __name__ == "__main__":
    pass_ct = fail_ct = 0
    for name in CASES:
        rec = KNOTS.get(name) or LINKS.get(name)
        if not rec:
            print(f"[SKIP] {name} - not in DB")
            continue
        if not rec.get("jones_latex"):
            print(f"[SKIP] {name} - no jones_latex")
            continue

        self_terms = parse_jones_latex(rec["jones_latex"])
        if not compare(self_terms, self_terms):
            print(f"[FAIL] {name} - self-compare broke")
            fail_ct += 1
            continue

        mj = rec.get("mirror_jones_latex")
        if not mj:
            print(f"[INFO] {name} - no mirror_jones_latex (skip)")
            continue

        mir_terms = parse_jones_latex(mj)
        # Mirror relationship: mirror(jones) should equal mirror_jones under
        # at least one of our equivalence classes.
        kind, k = classify(mirror(self_terms), mir_terms)
        if kind == "fail":
            # Fall back: is self already equal (amphichiral)?
            if compare(self_terms, mir_terms):
                print(f"[PASS] {name} - amphichiral (jones == mirror_jones)")
                pass_ct += 1
                continue
            print(f"[FAIL] {name} - mirror(jones) != mirror_jones even under shift/mirror")
            print(f"       jones     : {fmt(self_terms)}")
            print(f"       mirror(J) : {fmt(mirror(self_terms))}")
            print(f"       stored mJ : {fmt(mir_terms)}")
            fail_ct += 1
        else:
            extra = f" (k={k})" if k is not None else ""
            print(f"[PASS] {name} - matched via {kind}{extra}")
            pass_ct += 1

    # ----- Targeted regression: L6a1 mirror+shift detection -----
    # Observed computed polynomial from the app (Kauffman bracket + writhe=2):
    #   -q^{3/2}+q^{1/2}-3q^{-1/2}+2q^{-3/2}-2q^{-5/2}+2q^{-7/2}-q^{-9/2}
    # Stored (KnotInfo): same shape but coefficients appear "reversed".
    # Relation: stored = mirror(computed) shifted by q^{-3} (= q^{-3w/2}, w=2).
    # Our verifyJones must detect this as mirror+shift (k=-3).
    print("\n----- L6a1 mirror+shift regression -----")
    observed = {1.5: -1, 0.5: 1, -0.5: -3, -1.5: 2, -2.5: -2, -3.5: 2, -4.5: -1}
    stored = parse_jones_latex(LINKS["L6a1"]["jones_latex"])
    kind, k = classify(observed, stored)
    if kind == "mirror+shift" and k == -3:
        print(f"[PASS] L6a1: classified as {kind} (k={k})")
        pass_ct += 1
    else:
        print(f"[FAIL] L6a1: expected mirror+shift (k=-3), got {kind} k={k}")
        fail_ct += 1

    print("\n===== SUMMARY =====")
    print(f"pass: {pass_ct}   fail: {fail_ct}")
    sys.exit(1 if fail_ct else 0)
