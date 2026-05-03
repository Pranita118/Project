#!/usr/bin/env python3
"""
PaperMentor — One-click local server launcher
Run: python3 start.py
Then open: http://localhost:8080
"""
import http.server
import socketserver
import webbrowser
import threading
import os
import sys

PORT = 8080
DIR  = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)
    def log_message(self, fmt, *args):
        pass  # silence request logs

def open_browser():
    import time
    time.sleep(0.8)
    webbrowser.open(f"http://localhost:{PORT}")

print(f"""
╔══════════════════════════════════════╗
║        PaperMentor  📚               ║
║  Local server starting on port {PORT}  ║
╚══════════════════════════════════════╝
  → Opening http://localhost:{PORT} ...
  → Press Ctrl+C to stop
""")

threading.Thread(target=open_browser, daemon=True).start()

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n✅ Server stopped.")
    sys.exit(0)
except OSError as e:
    if "Address already in use" in str(e):
        print(f"⚠️  Port {PORT} already in use. Try: python3 start.py (or kill the other process)")
    else:
        raise