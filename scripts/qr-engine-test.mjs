import { qrMatrix } from '../public/qr-engine.js';

const cases = [
  ['L', 'L'.repeat(120)],
  ['M', 'M'.repeat(95)],
  ['Q', 'Q'.repeat(68)],
  ['H', 'H'.repeat(52)]
];
for (const [ec, value] of cases) {
  const matrix = qrMatrix(value, ec);
  if (!Array.isArray(matrix) || matrix.length < 21 || matrix.length > 41 || matrix.some(row => row.length !== matrix.length)) {
    throw new Error(`Invalid QR matrix for ${ec}`);
  }
}
let rejected = false;
try { qrMatrix('X'.repeat(200), 'H'); } catch { rejected = true; }
if (!rejected) throw new Error('Oversized QR payload should be rejected.');
console.log('QR engine structural test: PASS');
