import os
import subprocess
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

def run_health_server(port):
    server = HTTPServer(('0.0.0.0', port), HealthHandler)
    server.serve_forever()

if __name__ == "__main__":
    # Get the port Cloud Run provides
    port = int(os.environ.get("PORT", "8080"))
    
    # Start the dummy health server in a background thread
    print(f"Starting health shim on port {port}...")
    threading.Thread(target=run_health_server, args=(port,), daemon=True).start()
    
    # Start the actual arq worker
    print("Starting arq worker...")
    subprocess.run(["python", "-m", "arq", "app.workers.worker.WorkerSettings"], check=True)
