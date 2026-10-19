#!/usr/bin/env bash
# Starts the election server + a free Cloudflare quick tunnel and shows a QR code.
# Termux setup once:  pkg install nodejs cloudflared
# Run:                ADMIN_PASSWORD=YourPassword bash start.sh
cd "$(dirname "$0")" || exit 1
PORT=${PORT:-3000}
[ -n "$ADMIN_PASSWORD" ] || { echo "Set a password first:  ADMIN_PASSWORD=YourPassword bash start.sh"; exit 1; }
for c in node npm cloudflared; do
  command -v "$c" >/dev/null || { echo "Missing $c. Run:  pkg install nodejs cloudflared"; exit 1; }
done
[ -d node_modules/qrcode ] || npm install --no-audit --no-fund --silent || echo "Warning: could not install the QR library (needs internet once). The link still works."
cleanup() { kill "$NODE_PID" "$CF_PID" 2>/dev/null; rm -f public/qr.png public/link.txt; }
trap cleanup EXIT INT TERM
rm -f public/qr.png public/link.txt

PORT=$PORT TRUST_PROXY=1 ADMIN_PASSWORD=$ADMIN_PASSWORD node server.js &
NODE_PID=$!
cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" > tunnel.log 2>&1 &
CF_PID=$!

URL=""
for _ in $(seq 1 45); do
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' tunnel.log | head -1)
  [ -n "$URL" ] && break
  sleep 1
done
[ -n "$URL" ] || { echo "Tunnel did not start. See tunnel.log"; exit 1; }

echo "$URL" > public/link.txt
echo
echo "Students:  $URL"
echo "Admin:     $URL/admin   (QR also shown there under 'Roster, QR & export')"
echo
node qr.js "$URL"
echo "Keep this window open. Press Ctrl+C to stop."
wait "$NODE_PID"
