"""Simple dev server for KnotLab with admin-mode persistence."""
import http.server
import json
import os
import tempfile

PORT = 8780
ROOT = os.path.dirname(os.path.abspath(__file__))
OVERRIDES_PATH = os.path.join(ROOT, "overrides.json")
CONTENT_PATH = os.path.join(ROOT, "content.json")
HISTORY_DIR = os.path.join(ROOT, "history")


def _load_overrides():
    if not os.path.exists(OVERRIDES_PATH):
        return {}
    try:
        with open(OVERRIDES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_overrides(data):
    fd, tmp = tempfile.mkstemp(prefix=".overrides.", dir=ROOT)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, OVERRIDES_PATH)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path == "/admin/save":
            length = int(self.headers.get("Content-Length", "0"))
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                tab = str(payload["tab"])
                edit_id = str(payload["id"])
                html = payload.get("html", "")
                if not isinstance(html, str):
                    raise ValueError("html must be string")
            except Exception as e:
                return self._json(400, {"ok": False, "error": str(e)})

            data = _load_overrides()
            tab_map = data.setdefault(tab, {})
            if payload.get("delete") or html == "__DELETE__":
                # Remove from overrides AND record a tombstone so that any
                # previously-committed override in content.json is suppressed
                # on merge and removed on next commit.
                tab_map.pop(edit_id, None)
                if not tab_map:
                    data.pop(tab, None)
                dels = data.setdefault("_deletes", {}).setdefault(tab, [])
                if edit_id not in dels:
                    dels.append(edit_id)
            else:
                tab_map[edit_id] = html
                # Un-tombstone if resurrecting.
                dels = (data.get("_deletes") or {}).get(tab, [])
                if edit_id in dels:
                    dels.remove(edit_id)
                    if not dels:
                        data["_deletes"].pop(tab, None)
                        if not data["_deletes"]:
                            data.pop("_deletes", None)
            _save_overrides(data)
            return self._json(200, {"ok": True})

        if self.path == "/admin/insert":
            length = int(self.headers.get("Content-Length", "0"))
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                tab = str(payload["tab"])
                rec_id = str(payload["id"])
                after = str(payload.get("after", ""))
                tag = str(payload.get("tag", "p"))
                html = str(payload.get("html", ""))
                action = str(payload.get("action", "upsert"))  # upsert | delete
            except Exception as e:
                return self._json(400, {"ok": False, "error": str(e)})

            data = _load_overrides()
            ins_root = data.setdefault("_inserts", {})
            tab_ins = ins_root.setdefault(tab, [])

            if action == "delete":
                tab_ins[:] = [r for r in tab_ins if r.get("id") != rec_id]
                if not tab_ins:
                    ins_root.pop(tab, None)
                if not ins_root:
                    data.pop("_inserts", None)
                # Tombstone so committed inserts are suppressed too.
                dels_ins = data.setdefault("_deletes", {}).setdefault("_inserts", {}).setdefault(tab, [])
                if rec_id not in dels_ins:
                    dels_ins.append(rec_id)
            else:
                found = False
                for r in tab_ins:
                    if r.get("id") == rec_id:
                        r["html"] = html
                        r["tag"] = tag
                        r["after"] = after
                        found = True
                        break
                if not found:
                    tab_ins.append({"id": rec_id, "after": after, "tag": tag, "html": html})

            _save_overrides(data)
            return self._json(200, {"ok": True})

        if self.path == "/admin/snippet":
            length = int(self.headers.get("Content-Length", "0"))
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                action = str(payload.get("action", "upsert"))
                name = str(payload["name"]).strip()
                if not name:
                    raise ValueError("name required")
            except Exception as e:
                return self._json(400, {"ok": False, "error": str(e)})

            data = _load_overrides()
            snips = data.setdefault("_snippets", [])

            if action == "delete":
                snips[:] = [s for s in snips if s.get("name") != name]
                if not snips:
                    data.pop("_snippets", None)
            else:
                latex = str(payload.get("latex", ""))
                display = bool(payload.get("display", False))
                replaced = False
                for s in snips:
                    if s.get("name") == name:
                        s["latex"] = latex
                        s["display"] = display
                        replaced = True
                        break
                if not replaced:
                    snips.append({"name": name, "latex": latex, "display": display})

            _save_overrides(data)
            return self._json(200, {"ok": True})

        if self.path == "/admin/upload":
            # Accept JSON: { name, dataUrl: "data:image/png;base64,..." }
            length = int(self.headers.get("Content-Length", "0"))
            try:
                import base64, re
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                name = str(payload["name"])
                data_url = str(payload["dataUrl"])
                m = re.match(r"^data:([^;]+);base64,(.+)$", data_url, re.S)
                if not m:
                    raise ValueError("invalid data URL")
                mime, b64 = m.group(1), m.group(2)
                blob = base64.b64decode(b64)
                safe = re.sub(r"[^A-Za-z0-9._-]", "_", name) or "upload"
                uploads_dir = os.path.join(ROOT, "uploads")
                os.makedirs(uploads_dir, exist_ok=True)
                # Avoid collisions.
                base, ext = os.path.splitext(safe)
                if not ext:
                    ext = "." + mime.split("/")[-1]
                i = 0
                final = base + ext
                while os.path.exists(os.path.join(uploads_dir, final)):
                    i += 1
                    final = base + "_" + str(i) + ext
                with open(os.path.join(uploads_dir, final), "wb") as f:
                    f.write(blob)
                return self._json(200, {"ok": True, "url": "uploads/" + final})
            except Exception as e:
                return self._json(400, {"ok": False, "error": str(e)})

        if self.path == "/admin/snapshot":
            # Copy current overrides.json into history/ with a timestamp.
            import datetime, shutil
            os.makedirs(HISTORY_DIR, exist_ok=True)
            if not os.path.exists(OVERRIDES_PATH):
                return self._json(200, {"ok": True, "empty": True})
            ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
            dest = os.path.join(HISTORY_DIR, "overrides-" + ts + ".json")
            shutil.copyfile(OVERRIDES_PATH, dest)
            return self._json(200, {"ok": True, "file": "history/overrides-" + ts + ".json"})

        if self.path == "/admin/commit":
            # Merge overrides.json into content.json (permanent baseline),
            # then clear overrides.json. Snapshot first for safety.
            import datetime, shutil
            os.makedirs(HISTORY_DIR, exist_ok=True)
            overrides = _load_overrides()
            content = {}
            if os.path.exists(CONTENT_PATH):
                try:
                    with open(CONTENT_PATH, "r", encoding="utf-8") as f:
                        content = json.load(f)
                except Exception:
                    content = {}
            # Safety snapshot of both before the merge.
            ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
            if os.path.exists(OVERRIDES_PATH):
                shutil.copyfile(OVERRIDES_PATH, os.path.join(HISTORY_DIR, "pre-commit-overrides-" + ts + ".json"))
            if os.path.exists(CONTENT_PATH):
                shutil.copyfile(CONTENT_PATH, os.path.join(HISTORY_DIR, "pre-commit-content-" + ts + ".json"))

            # Apply tombstones first: remove deleted ids from content.
            deletes = overrides.get("_deletes") or {}
            for k, v in deletes.items():
                if k == "_inserts":
                    ins_root = content.get("_inserts") or {}
                    for tab, ids in (v or {}).items():
                        arr = ins_root.get(tab) or []
                        ins_root[tab] = [r for r in arr if r.get("id") not in ids]
                        if not ins_root[tab]:
                            ins_root.pop(tab, None)
                    if not ins_root:
                        content.pop("_inserts", None)
                    else:
                        content["_inserts"] = ins_root
                else:
                    tab_map = content.get(k) or {}
                    for edit_id in (v or []):
                        tab_map.pop(edit_id, None)
                    if not tab_map:
                        content.pop(k, None)
                    else:
                        content[k] = tab_map

            # Merge per-tab edit maps.
            for key, val in overrides.items():
                if key == "_deletes":
                    continue
                if key == "_inserts":
                    ins_root = content.setdefault("_inserts", {})
                    for tab, recs in (val or {}).items():
                        existing = ins_root.setdefault(tab, [])
                        by_id = {r.get("id"): i for i, r in enumerate(existing)}
                        for r in recs:
                            if r.get("id") in by_id:
                                existing[by_id[r["id"]]] = r
                            else:
                                existing.append(r)
                elif key == "_snippets":
                    snip_list = content.setdefault("_snippets", [])
                    by_name = {s.get("name"): i for i, s in enumerate(snip_list)}
                    for s in (val or []):
                        if s.get("name") in by_name:
                            snip_list[by_name[s["name"]]] = s
                        else:
                            snip_list.append(s)
                else:
                    # Per-tab edit map.
                    tab_map = content.setdefault(key, {})
                    for edit_id, html in (val or {}).items():
                        tab_map[edit_id] = html

            # Write content.json and clear overrides.json.
            fd, tmp = tempfile.mkstemp(prefix=".content.", dir=ROOT)
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(content, f, indent=2, ensure_ascii=False)
            os.replace(tmp, CONTENT_PATH)
            _save_overrides({})
            return self._json(200, {"ok": True, "snapshot": "history/pre-commit-*-" + ts + ".json"})

        if self.path == "/admin/wipe-all":
            import datetime, shutil
            os.makedirs(HISTORY_DIR, exist_ok=True)
            ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
            if os.path.exists(OVERRIDES_PATH):
                shutil.copyfile(OVERRIDES_PATH, os.path.join(HISTORY_DIR, "prewipe-overrides-" + ts + ".json"))
            if os.path.exists(CONTENT_PATH):
                shutil.copyfile(CONTENT_PATH, os.path.join(HISTORY_DIR, "prewipe-content-" + ts + ".json"))
            _save_overrides({})
            fd, tmp = tempfile.mkstemp(prefix=".content.", dir=ROOT)
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump({}, f)
            os.replace(tmp, CONTENT_PATH)
            return self._json(200, {"ok": True, "snapshot_ts": ts})

        if self.path == "/admin/reset":
            # Wipe all overrides.
            _save_overrides({})
            return self._json(200, {"ok": True})

        self._json(404, {"ok": False, "error": "not found"})


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"KnotLab dev server on http://127.0.0.1:{PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
