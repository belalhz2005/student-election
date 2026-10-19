// Usage: node qr.js <url>  -> writes public/qr.png and prints a QR in the terminal.
const path = require('path');
let QR;
try { QR = require('qrcode'); } catch { console.log('(QR code unavailable: run `npm install` once while online)'); process.exit(0); }
const url = process.argv[2];
if (!url) { console.error('usage: node qr.js <url>'); process.exit(1); }
QR.toFile(path.join(__dirname, 'public', 'qr.png'), url, { width: 520, margin: 2 }, (err) => {
  if (err) { console.error(err.message); process.exit(1); }
  QR.toString(url, { type: 'terminal', small: true }, (e, s) => console.log(e ? url : s));
});
