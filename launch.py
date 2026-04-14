"""
KnotLab Launcher
================
Starts all services and opens the app in the browser:
  1. Framed Knots Explorer (R/Shiny on port 3838)
  2. Gauss Linking Explorer (R/Shiny on port 3839)
  3. KnotLab static server (Python on port 8765)

Usage:
    python launch.py
    python launch.py --no-shiny      # skip R/Shiny servers
    python launch.py --port 9000     # custom static server port
"""

import argparse
import http.server
import os
import signal
import subprocess
import sys
import threading
import time
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECTS = os.path.dirname(ROOT)  # C:\Users\seand\Claude_projects

RSCRIPT = r"C:\Program Files\R\R-4.5.3\bin\Rscript.exe"

SHINY_APPS = [
    {
        "name": "Framed Knots Explorer",
        "port": 3838,
        "cmd": [
            RSCRIPT, "-e",
            f"shiny::runApp('{PROJECTS}/framed_knots_explorer.R', port=3838, host='127.0.0.1', launch.browser=FALSE)"
        ],
    },
    {
        "name": "Gauss Linking Explorer",
        "port": 3839,
        "cmd": [
            RSCRIPT, "-e",
            f"shiny::runApp('{PROJECTS}/Gauss_link', port=3839, host='127.0.0.1', launch.browser=FALSE)"
        ],
    },
]

processes = []


def start_shiny_servers():
    """Launch R/Shiny subprocesses."""
    for app in SHINY_APPS:
        print(f"  Starting {app['name']} on port {app['port']}...")
        try:
            p = subprocess.Popen(
                app["cmd"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
            )
            processes.append(p)
            print(f"    -> PID {p.pid}")
        except FileNotFoundError:
            print(f"    -> SKIPPED (Rscript not found at {RSCRIPT})")


def serve_static(port):
    """Serve KnotLab directory over HTTP."""

    knot_explorer_dir = os.path.join(PROJECTS, "DB_project", "knot-explorer", "app")

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=ROOT, **kwargs)

        def log_message(self, format, *args):
            # Log to stderr so the preview system can detect activity
            sys.stderr.write("%s - - [%s] %s\n" % (self.client_address[0],
                             self.log_date_time_string(), format % args))

        def translate_path(self, path):
            # Strip query string
            path = path.split("?")[0].split("#")[0]
            # Route /knot-explorer/* to DB_project/knot-explorer/app/
            if path.startswith("/knot-explorer/"):
                rel = path[len("/knot-explorer/"):]
                return os.path.join(knot_explorer_dir, rel.replace("/", os.sep))
            elif path == "/knot-explorer":
                return os.path.join(knot_explorer_dir, "index.html")
            return super().translate_path(path)

    server = http.server.HTTPServer(("127.0.0.1", port), Handler)
    print(f"  KnotLab server on http://127.0.0.1:{port}")
    server.serve_forever()


def cleanup(*_):
    print("\nShutting down...")
    for p in processes:
        try:
            p.terminate()
            p.wait(timeout=3)
        except Exception:
            p.kill()
    sys.exit(0)


def main():
    parser = argparse.ArgumentParser(description="KnotLab Launcher")
    parser.add_argument("--port", type=int, default=8770, help="Static server port (default 8770)")
    parser.add_argument("--no-shiny", action="store_true", help="Skip launching R/Shiny servers")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser automatically")
    args = parser.parse_args()

    signal.signal(signal.SIGINT, cleanup)
    try:
        signal.signal(signal.SIGTERM, cleanup)
    except (OSError, AttributeError):
        pass
    try:
        if sys.platform == "win32":
            signal.signal(signal.SIGBREAK, cleanup)
    except (OSError, AttributeError):
        pass

    print("KnotLab Launcher")
    print("=" * 40)

    if not args.no_shiny:
        start_shiny_servers()
        time.sleep(1)

    # Start static server in a thread
    t = threading.Thread(target=serve_static, args=(args.port,), daemon=True)
    t.start()

    if not args.no_browser:
        time.sleep(0.5)
        webbrowser.open(f"http://127.0.0.1:{args.port}")

    print(f"\n  Open http://127.0.0.1:{args.port} in your browser")
    print("  Press Ctrl+C to stop all servers\n")

    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
