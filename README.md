# SPU Dental Student Council Elections

Voting site for the Faculty of Dentistry student council (Arabic/English, light/dark). React front end, Express back end, votes stored in Turso (or a JSON file for local use).

## Deploy on Render (existing service)

In the Render dashboard, change these two settings, keep the environment variables you already have:

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD` | a long password (if missing, a random one is printed in the logs on every start) |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | your Turso database (without them votes go to `data/db.json`, which Render erases on deploy) |
| `TRUST_PROXY` | `1` |
| `RATE_LIMIT` | `1200` (requests/minute per IP; a campus Wi-Fi shares one IP) |
| `PROXY_HOPS` | optional, default `2`; if the Security tab shows the same IP for everyone, change it to `1` |
| `APP_URL` | optional; the QR code uses it, otherwise Render's own `RENDER_EXTERNAL_URL` |

Data written by the previous election_1 version is read and upgraded automatically.

## Using it

1. Open the site, triple-click the faculty seal (or add `?admin=1`) and log in.
2. Setup: check the academic years and prefixes, add candidates, optionally paste the roster (`ID,Full name` per line). Once a roster exists only listed IDs can vote.
3. Open voting (all years, or one year at a time). Voting starts **closed**.
4. Results tab / PDF / CSV exports. "Public results" is off until you switch it on.
5. After the election, nothing is deleted by accident: candidates with votes cannot be removed, and "reset" needs the word `RESET_ELECTION`.

## Run locally

```
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm test
```
