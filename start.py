#!/usr/bin/env python3
"""
PaperMentor — One-click local server launcher
Run: python3 start.py  →  opens http://localhost:8080
Create a .env file with: GROQ_API_KEY=gsk_your_key_here
"""
import http.server, socketserver, webbrowser, threading, os, sys, json
import urllib.request, urllib.error, traceback

PORT = 8080
DIR  = os.path.dirname(os.path.abspath(__file__))

def load_env():
    env_path = os.path.join(DIR, '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip())
    else:
        print(f"  !! .env file not found at {env_path}")

load_env()

GROQ_API_KEY  = os.environ.get('GROQ_API_KEY', '')
GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
PROXY_PATH    = '/.netlify/functions/groq-proxy'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def log_message(self, fmt, *args):
        pass  # silence normal logs

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path == PROXY_PATH:
            try:
                self._handle_groq_proxy()
            except Exception as ex:
                traceback.print_exc()
                self._json_response(500, {'error': str(ex)})
        else:
            self.send_error(404, 'Not Found')

    def _handle_groq_proxy(self):
        # Re-read key each request so .env changes don't need restart
        api_key = os.environ.get('GROQ_API_KEY', '')
        if not api_key:
            self._json_response(500, {'error': 'GROQ_API_KEY not set in .env file'})
            return

        length  = int(self.headers.get('Content-Length', 0))
        payload = self.rfile.read(length)

        print(f"  [proxy] Sending request to Groq... ({len(payload)} bytes)")

        req = urllib.request.Request(
            GROQ_ENDPOINT,
            data=payload,
            headers={
                'Content-Type':  'application/json',
                'Authorization': f'Bearer {api_key}',
                'User-Agent':    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept':        'application/json',
            },
            method='POST',
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                body   = resp.read()
                status = resp.status
                print(f"  [proxy] Groq responded: {status} OK")
        except urllib.error.HTTPError as e:
            body   = e.read()
            status = e.code
            print(f"  [proxy] Groq HTTP error: {status} — {body[:200]}")
        except urllib.error.URLError as e:
            print(f"  [proxy] Network error reaching Groq: {e.reason}")
            self._json_response(502, {'error': f'Cannot reach Groq API: {e.reason}'})
            return

        self._raw_response(status, body)

    def _json_response(self, status, data):
        self._raw_response(status, json.dumps(data).encode())

    def _raw_response(self, status, body):
        self.send_response(status)
        self._cors_headers()
        self.send_header('Content-Type',   'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

key_status = f"GROQ_API_KEY loaded ({GROQ_API_KEY[:8]}...)" if GROQ_API_KEY else "!! NO GROQ_API_KEY — create a .env file!"

print(f"""
╔══════════════════════════════════════════╗
║          PaperMentor  📚                 ║
║  Local server starting on port {PORT}    ║
╚══════════════════════════════════════════╝
  -> http://localhost:{PORT}
  -> {key_status}
  -> Press Ctrl+C to stop
""")

def open_browser():
    import time; time.sleep(0.8)
    webbrowser.open(f"http://localhost:{PORT}")

threading.Thread(target=open_browser, daemon=True).start()

socketserver.TCPServer.allow_reuse_address = True
try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
    sys.exit(0)
except OSError as e:
    if "Address already in use" in str(e):
        print(f"Port {PORT} already in use. Close the other process first.")
    else:
        raise
