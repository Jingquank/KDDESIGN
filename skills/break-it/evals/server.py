"""Serve the eval app and its projects API, and log every write that reaches the server.

    python3 server.py <port> <writes.log>

Reads go through: GET /api/projects answers with four projects after 1.5 s. A POST, PUT, PATCH or
DELETE gets a line in the log and a 201.
"""
import json
import sys
import time
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP = Path(__file__).resolve().parent / "app"
PROJECTS = [
    {"id": 1, "name": "Spring catalogue", "status": "active"},
    {"id": 2, "name": "Website refresh", "status": "active"},
    {"id": 3, "name": "Annual report", "status": "archived"},
    {"id": 4, "name": "Brand guide", "status": "active"},
]


class Handler(SimpleHTTPRequestHandler):
    log_path: Path

    def reply(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/projects":
            time.sleep(1.5)
            return self.reply(200, PROJECTS)
        return super().do_GET()

    def write(self):
        size = int(self.headers.get("content-length") or 0)
        body = self.rfile.read(size).decode(errors="replace") if size else ""
        with self.log_path.open("a") as f:
            f.write(f"{datetime.now().isoformat(timespec='seconds')} {self.command} {self.path} {body}\n")
        self.reply(201, {"id": int(time.time() * 1000)})

    do_POST = do_PUT = do_PATCH = do_DELETE = write


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    Handler.log_path = Path(sys.argv[2]).resolve()
    server = ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), partial(Handler, directory=str(APP)))
    print(f"http://localhost:{sys.argv[1]}/ · writes to {Handler.log_path}")
    server.serve_forever()


if __name__ == "__main__":
    main()
