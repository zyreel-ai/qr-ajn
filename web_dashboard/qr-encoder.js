// QR AJN dependency-free QR Model 2 encoder.
// Supports UTF-8 byte mode, versions 1-20 and ECC L/M/Q/H.
// No network dependency is required.

const RS_BLOCKS = {"1":{"L":[[26,19]],"M":[[26,16]],"Q":[[26,13]],"H":[[26,9]]},"2":{"L":[[44,34]],"M":[[44,28]],"Q":[[44,22]],"H":[[44,16]]},"3":{"L":[[70,55]],"M":[[70,44]],"Q":[[35,17],[35,17]],"H":[[35,13],[35,13]]},"4":{"L":[[100,80]],"M":[[50,32],[50,32]],"Q":[[50,24],[50,24]],"H":[[25,9],[25,9],[25,9],[25,9]]},"5":{"L":[[134,108]],"M":[[67,43],[67,43]],"Q":[[33,15],[33,15],[34,16],[34,16]],"H":[[33,11],[33,11],[34,12],[34,12]]},"6":{"L":[[86,68],[86,68]],"M":[[43,27],[43,27],[43,27],[43,27]],"Q":[[43,19],[43,19],[43,19],[43,19]],"H":[[43,15],[43,15],[43,15],[43,15]]},"7":{"L":[[98,78],[98,78]],"M":[[49,31],[49,31],[49,31],[49,31]],"Q":[[32,14],[32,14],[33,15],[33,15],[33,15],[33,15]],"H":[[39,13],[39,13],[39,13],[39,13],[40,14]]},"8":{"L":[[121,97],[121,97]],"M":[[60,38],[60,38],[61,39],[61,39]],"Q":[[40,18],[40,18],[40,18],[40,18],[41,19],[41,19]],"H":[[40,14],[40,14],[40,14],[40,14],[41,15],[41,15]]},"9":{"L":[[146,116],[146,116]],"M":[[58,36],[58,36],[58,36],[59,37],[59,37]],"Q":[[36,16],[36,16],[36,16],[36,16],[37,17],[37,17],[37,17],[37,17]],"H":[[36,12],[36,12],[36,12],[36,12],[37,13],[37,13],[37,13],[37,13]]},"10":{"L":[[86,68],[86,68],[87,69],[87,69]],"M":[[69,43],[69,43],[69,43],[69,43],[70,44]],"Q":[[43,19],[43,19],[43,19],[43,19],[43,19],[43,19],[44,20],[44,20]],"H":[[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[44,16],[44,16]]},"11":{"L":[[101,81],[101,81],[101,81],[101,81]],"M":[[80,50],[81,51],[81,51],[81,51],[81,51]],"Q":[[50,22],[50,22],[50,22],[50,22],[51,23],[51,23],[51,23],[51,23]],"H":[[36,12],[36,12],[36,12],[37,13],[37,13],[37,13],[37,13],[37,13],[37,13],[37,13],[37,13]]},"12":{"L":[[116,92],[116,92],[117,93],[117,93]],"M":[[58,36],[58,36],[58,36],[58,36],[58,36],[58,36],[59,37],[59,37]],"Q":[[46,20],[46,20],[46,20],[46,20],[47,21],[47,21],[47,21],[47,21],[47,21],[47,21]],"H":[[42,14],[42,14],[42,14],[42,14],[42,14],[42,14],[42,14],[43,15],[43,15],[43,15],[43,15]]},"13":{"L":[[133,107],[133,107],[133,107],[133,107]],"M":[[59,37],[59,37],[59,37],[59,37],[59,37],[59,37],[59,37],[59,37],[60,38]],"Q":[[44,20],[44,20],[44,20],[44,20],[44,20],[44,20],[44,20],[44,20],[45,21],[45,21],[45,21],[45,21]],"H":[[33,11],[33,11],[33,11],[33,11],[33,11],[33,11],[33,11],[33,11],[33,11],[33,11],[33,11],[33,11],[34,12],[34,12],[34,12],[34,12]]},"14":{"L":[[145,115],[145,115],[145,115],[146,116]],"M":[[64,40],[64,40],[64,40],[64,40],[65,41],[65,41],[65,41],[65,41],[65,41]],"Q":[[36,16],[36,16],[36,16],[36,16],[36,16],[36,16],[36,16],[36,16],[36,16],[36,16],[36,16],[37,17],[37,17],[37,17],[37,17],[37,17]],"H":[[36,12],[36,12],[36,12],[36,12],[36,12],[36,12],[36,12],[36,12],[36,12],[36,12],[36,12],[37,13],[37,13],[37,13],[37,13],[37,13]]},"15":{"L":[[109,87],[109,87],[109,87],[109,87],[109,87],[110,88]],"M":[[65,41],[65,41],[65,41],[65,41],[65,41],[66,42],[66,42],[66,42],[66,42],[66,42]],"Q":[[54,24],[54,24],[54,24],[54,24],[54,24],[55,25],[55,25],[55,25],[55,25],[55,25],[55,25],[55,25]],"H":[[36,12],[36,12],[36,12],[36,12],[36,12],[36,12],[36,12],[36,12],[36,12],[36,12],[36,12],[37,13],[37,13],[37,13],[37,13],[37,13],[37,13],[37,13]]},"16":{"L":[[122,98],[122,98],[122,98],[122,98],[122,98],[123,99]],"M":[[73,45],[73,45],[73,45],[73,45],[73,45],[73,45],[73,45],[74,46],[74,46],[74,46]],"Q":[[43,19],[43,19],[43,19],[43,19],[43,19],[43,19],[43,19],[43,19],[43,19],[43,19],[43,19],[43,19],[43,19],[43,19],[43,19],[44,20],[44,20]],"H":[[45,15],[45,15],[45,15],[46,16],[46,16],[46,16],[46,16],[46,16],[46,16],[46,16],[46,16],[46,16],[46,16],[46,16],[46,16],[46,16]]},"17":{"L":[[135,107],[136,108],[136,108],[136,108],[136,108],[136,108]],"M":[[74,46],[74,46],[74,46],[74,46],[74,46],[74,46],[74,46],[74,46],[74,46],[74,46],[75,47]],"Q":[[50,22],[51,23],[51,23],[51,23],[51,23],[51,23],[51,23],[51,23],[51,23],[51,23],[51,23],[51,23],[51,23],[51,23],[51,23],[51,23]],"H":[[42,14],[42,14],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15]]},"18":{"L":[[150,120],[150,120],[150,120],[150,120],[150,120],[151,121]],"M":[[69,43],[69,43],[69,43],[69,43],[69,43],[69,43],[69,43],[69,43],[69,43],[70,44],[70,44],[70,44],[70,44]],"Q":[[50,22],[50,22],[50,22],[50,22],[50,22],[50,22],[50,22],[50,22],[50,22],[50,22],[50,22],[50,22],[50,22],[50,22],[50,22],[50,22],[50,22],[51,23]],"H":[[42,14],[42,14],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15]]},"19":{"L":[[141,113],[141,113],[141,113],[142,114],[142,114],[142,114],[142,114]],"M":[[70,44],[70,44],[70,44],[71,45],[71,45],[71,45],[71,45],[71,45],[71,45],[71,45],[71,45],[71,45],[71,45],[71,45]],"Q":[[47,21],[47,21],[47,21],[47,21],[47,21],[47,21],[47,21],[47,21],[47,21],[47,21],[47,21],[47,21],[47,21],[47,21],[47,21],[47,21],[47,21],[48,22],[48,22],[48,22],[48,22]],"H":[[39,13],[39,13],[39,13],[39,13],[39,13],[39,13],[39,13],[39,13],[39,13],[40,14],[40,14],[40,14],[40,14],[40,14],[40,14],[40,14],[40,14],[40,14],[40,14],[40,14],[40,14],[40,14],[40,14],[40,14],[40,14]]},"20":{"L":[[135,107],[135,107],[135,107],[136,108],[136,108],[136,108],[136,108],[136,108]],"M":[[67,41],[67,41],[67,41],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42]],"Q":[[54,24],[54,24],[54,24],[54,24],[54,24],[54,24],[54,24],[54,24],[54,24],[54,24],[54,24],[54,24],[54,24],[54,24],[54,24],[55,25],[55,25],[55,25],[55,25],[55,25]],"H":[[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[44,16],[44,16],[44,16],[44,16],[44,16],[44,16],[44,16],[44,16],[44,16],[44,16]]}};
const ALIGNMENT_POSITIONS = {"1":[],"2":[6,18],"3":[6,22],"4":[6,26],"5":[6,30],"6":[6,34],"7":[6,22,38],"8":[6,24,42],"9":[6,26,46],"10":[6,28,50],"11":[6,30,54],"12":[6,32,58],"13":[6,34,62],"14":[6,26,46,66],"15":[6,26,48,70],"16":[6,26,50,74],"17":[6,30,54,78],"18":[6,30,56,82],"19":[6,30,58,86],"20":[6,34,62,90]};
const FORMAT_ECC_BITS = {L: 1, M: 0, Q: 3, H: 2};

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
}

function gfMul(a, b) {
  if (!a || !b) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function polyMul(a, b) {
  const out = new Uint8Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) out[i + j] ^= gfMul(a[i], b[j]);
  }
  return out;
}

const GENERATOR_CACHE = new Map();
function rsGenerator(degree) {
  if (GENERATOR_CACHE.has(degree)) return GENERATOR_CACHE.get(degree);
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i += 1) poly = polyMul(poly, new Uint8Array([1, GF_EXP[i]]));
  GENERATOR_CACHE.set(degree, poly);
  return poly;
}

function rsRemainder(data, degree) {
  const generator = rsGenerator(degree);
  const message = new Uint8Array(data.length + degree);
  message.set(data);
  for (let i = 0; i < data.length; i += 1) {
    const factor = message[i];
    if (!factor) continue;
    for (let j = 0; j < generator.length; j += 1) message[i + j] ^= gfMul(generator[j], factor);
  }
  return message.slice(data.length);
}

class BitBuffer {
  constructor() { this.bytes = []; this.length = 0; }
  append(value, bitCount) {
    for (let i = bitCount - 1; i >= 0; i -= 1) this.appendBit(((value >>> i) & 1) === 1);
  }
  appendBit(bit) {
    const index = this.length >>> 3;
    if (this.bytes.length <= index) this.bytes.push(0);
    if (bit) this.bytes[index] |= 0x80 >>> (this.length & 7);
    this.length += 1;
  }
}

function getBlocks(version, level) {
  const blocks = RS_BLOCKS[String(version)]?.[level];
  if (!blocks) throw new Error(`Unsupported QR version/ECC: ${version}/${level}`);
  return blocks.map(([total, data]) => ({total, data}));
}

function dataCapacityBits(version, level) {
  return getBlocks(version, level).reduce((sum, block) => sum + block.data, 0) * 8;
}

function chooseVersion(byteLength, level) {
  for (let version = 1; version <= 20; version += 1) {
    const countBits = version <= 9 ? 8 : 16;
    const requiredBits = 4 + countBits + byteLength * 8;
    if (requiredBits <= dataCapacityBits(version, level)) return version;
  }
  throw new Error('QR content is too long. Reduce the text or URL length.');
}

function buildDataCodewords(bytes, version, level) {
  const blocks = getBlocks(version, level);
  const capacityBytes = blocks.reduce((sum, block) => sum + block.data, 0);
  const bits = new BitBuffer();
  bits.append(0b0100, 4); // byte mode
  bits.append(bytes.length, version <= 9 ? 8 : 16);
  for (const byte of bytes) bits.append(byte, 8);
  const capacityBits = capacityBytes * 8;
  for (let i = 0; i < Math.min(4, capacityBits - bits.length); i += 1) bits.appendBit(false);
  while (bits.length % 8) bits.appendBit(false);
  let pad = true;
  while (bits.bytes.length < capacityBytes) {
    bits.bytes.push(pad ? 0xec : 0x11);
    bits.length += 8;
    pad = !pad;
  }
  return Uint8Array.from(bits.bytes);
}

function interleaveCodewords(dataBytes, version, level) {
  const blocks = getBlocks(version, level);
  const dataBlocks = [];
  const eccBlocks = [];
  let offset = 0;
  for (const block of blocks) {
    const chunk = dataBytes.slice(offset, offset + block.data);
    offset += block.data;
    dataBlocks.push(chunk);
    eccBlocks.push(rsRemainder(chunk, block.total - block.data));
  }
  const out = [];
  const maxData = Math.max(...dataBlocks.map(block => block.length));
  const maxEcc = Math.max(...eccBlocks.map(block => block.length));
  for (let i = 0; i < maxData; i += 1) {
    for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < maxEcc; i += 1) {
    for (const block of eccBlocks) if (i < block.length) out.push(block[i]);
  }
  return Uint8Array.from(out);
}

function setCell(modules, reserved, x, y, value, lock = true) {
  if (x < 0 || y < 0 || y >= modules.length || x >= modules.length) return;
  modules[y][x] = Boolean(value);
  if (lock) reserved[y][x] = true;
}

function drawFinder(modules, reserved, x0, y0) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const x = x0 + dx;
      const y = y0 + dy;
      const inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const dark = inside && (
        dx === 0 || dx === 6 || dy === 0 || dy === 6 ||
        (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
      );
      setCell(modules, reserved, x, y, dark, true);
    }
  }
}

function drawAlignment(modules, reserved, cx, cy) {
  if (reserved[cy]?.[cx]) return;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const ring = Math.max(Math.abs(dx), Math.abs(dy));
      setCell(modules, reserved, cx + dx, cy + dy, ring !== 1, true);
    }
  }
}

function bchDigit(value) {
  let digit = 0;
  while (value) { digit += 1; value >>>= 1; }
  return digit;
}

function bchFormat(data) {
  let d = data << 10;
  const generator = 0x537;
  while (bchDigit(d) - bchDigit(generator) >= 0) d ^= generator << (bchDigit(d) - bchDigit(generator));
  return ((data << 10) | d) ^ 0x5412;
}

function bchVersion(version) {
  let d = version << 12;
  const generator = 0x1f25;
  while (bchDigit(d) - bchDigit(generator) >= 0) d ^= generator << (bchDigit(d) - bchDigit(generator));
  return (version << 12) | d;
}

function reserveFormatAndVersion(modules, reserved, version) {
  const size = modules.length;
  for (let i = 0; i < 15; i += 1) {
    let y; let x;
    if (i < 6) { y = i; x = 8; }
    else if (i < 8) { y = i + 1; x = 8; }
    else { y = size - 15 + i; x = 8; }
    setCell(modules, reserved, x, y, false, true);
    if (i < 8) { y = 8; x = size - i - 1; }
    else if (i < 9) { y = 8; x = 15 - i; }
    else { y = 8; x = 15 - i - 1; }
    setCell(modules, reserved, x, y, false, true);
  }
  setCell(modules, reserved, 8, size - 8, true, true);
  if (version >= 7) {
    for (let i = 0; i < 18; i += 1) {
      setCell(modules, reserved, (i % 3) + size - 11, Math.floor(i / 3), false, true);
      setCell(modules, reserved, Math.floor(i / 3), (i % 3) + size - 11, false, true);
    }
  }
}

function drawFunctionPatterns(version) {
  const size = 21 + 4 * (version - 1);
  const modules = Array.from({length: size}, () => Array(size).fill(false));
  const reserved = Array.from({length: size}, () => Array(size).fill(false));
  drawFinder(modules, reserved, 0, 0);
  drawFinder(modules, reserved, size - 7, 0);
  drawFinder(modules, reserved, 0, size - 7);
  for (const y of ALIGNMENT_POSITIONS[String(version)] || []) {
    for (const x of ALIGNMENT_POSITIONS[String(version)] || []) drawAlignment(modules, reserved, x, y);
  }
  for (let i = 8; i < size - 8; i += 1) {
    if (!reserved[6][i]) setCell(modules, reserved, i, 6, i % 2 === 0, true);
    if (!reserved[i][6]) setCell(modules, reserved, 6, i, i % 2 === 0, true);
  }
  reserveFormatAndVersion(modules, reserved, version);
  return {modules, reserved};
}

function writeFormatInfo(modules, level, mask) {
  const size = modules.length;
  const bits = bchFormat((FORMAT_ECC_BITS[level] << 3) | mask);
  for (let i = 0; i < 15; i += 1) {
    const bit = ((bits >>> i) & 1) === 1;
    let y; let x;
    if (i < 6) { y = i; x = 8; }
    else if (i < 8) { y = i + 1; x = 8; }
    else { y = size - 15 + i; x = 8; }
    modules[y][x] = bit;
    if (i < 8) { y = 8; x = size - i - 1; }
    else if (i < 9) { y = 8; x = 15 - i; }
    else { y = 8; x = 15 - i - 1; }
    modules[y][x] = bit;
  }
  modules[size - 8][8] = true;
}

function writeVersionInfo(modules, version) {
  if (version < 7) return;
  const size = modules.length;
  const bits = bchVersion(version);
  for (let i = 0; i < 18; i += 1) {
    const bit = ((bits >>> i) & 1) === 1;
    modules[Math.floor(i / 3)][(i % 3) + size - 11] = bit;
    modules[(i % 3) + size - 11][Math.floor(i / 3)] = bit;
  }
}

function maskBit(mask, row, col) {
  switch (mask) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6: return ((((row * col) % 2) + ((row * col) % 3)) % 2) === 0;
    case 7: return ((((row * col) % 3) + ((row + col) % 2)) % 2) === 0;
    default: return false;
  }
}

function placeData(baseModules, reserved, codewords, mask) {
  const modules = baseModules.map(row => row.slice());
  const size = modules.length;
  let byteIndex = 0;
  let bitIndex = 7;
  let row = size - 1;
  let direction = -1;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    while (true) {
      for (let c = 0; c < 2; c += 1) {
        const x = col - c;
        if (reserved[row][x]) continue;
        let dark = false;
        if (byteIndex < codewords.length) dark = ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
        if (maskBit(mask, row, x)) dark = !dark;
        modules[row][x] = dark;
        bitIndex -= 1;
        if (bitIndex < 0) { byteIndex += 1; bitIndex = 7; }
      }
      row += direction;
      if (row < 0 || row >= size) { row -= direction; direction = -direction; break; }
    }
  }
  return modules;
}

function penaltyScore(modules) {
  const size = modules.length;
  let score = 0;
  for (let y = 0; y < size; y += 1) {
    let runColor = modules[y][0]; let run = 1;
    for (let x = 1; x < size; x += 1) {
      if (modules[y][x] === runColor) run += 1;
      else { if (run >= 5) score += 3 + run - 5; runColor = modules[y][x]; run = 1; }
    }
    if (run >= 5) score += 3 + run - 5;
  }
  for (let x = 0; x < size; x += 1) {
    let runColor = modules[0][x]; let run = 1;
    for (let y = 1; y < size; y += 1) {
      if (modules[y][x] === runColor) run += 1;
      else { if (run >= 5) score += 3 + run - 5; runColor = modules[y][x]; run = 1; }
    }
    if (run >= 5) score += 3 + run - 5;
  }
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const v = modules[y][x];
      if (modules[y][x + 1] === v && modules[y + 1][x] === v && modules[y + 1][x + 1] === v) score += 3;
    }
  }
  const patternA = [true, false, true, true, true, false, true, false, false, false, false];
  const patternB = [false, false, false, false, true, false, true, true, true, false, true];
  const matches = (line, start, pattern) => pattern.every((bit, index) => line[start + index] === bit);
  for (let y = 0; y < size; y += 1) {
    const rowLine = modules[y];
    for (let x = 0; x <= size - 11; x += 1) if (matches(rowLine, x, patternA) || matches(rowLine, x, patternB)) score += 40;
  }
  for (let x = 0; x < size; x += 1) {
    const colLine = modules.map(rowData => rowData[x]);
    for (let y = 0; y <= size - 11; y += 1) if (matches(colLine, y, patternA) || matches(colLine, y, patternB)) score += 40;
  }
  let dark = 0;
  for (const rowData of modules) for (const cell of rowData) if (cell) dark += 1;
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

export function createQrMatrix(text, {level = 'M'} = {}) {
  const normalizedLevel = String(level || 'M').toUpperCase();
  if (!FORMAT_ECC_BITS.hasOwnProperty(normalizedLevel)) throw new Error('Invalid QR error-correction level.');
  const bytes = new TextEncoder().encode(String(text ?? ''));
  if (!bytes.length) throw new Error('Enter content before generating the QR code.');
  const version = chooseVersion(bytes.length, normalizedLevel);
  const data = buildDataCodewords(bytes, version, normalizedLevel);
  const codewords = interleaveCodewords(data, version, normalizedLevel);
  const {modules: baseModules, reserved} = drawFunctionPatterns(version);
  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = placeData(baseModules, reserved, codewords, mask);
    writeFormatInfo(candidate, normalizedLevel, mask);
    writeVersionInfo(candidate, version);
    const score = penaltyScore(candidate);
    if (score < bestScore) { best = candidate; bestScore = score; }
  }
  return {matrix: best, version, level: normalizedLevel, bytes: bytes.length};
}

function safeColor(value, fallback) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

function moduleShape(x, y, scale, style, fill) {
  const px = x * scale; const py = y * scale;
  if (style === 'dots') {
    const radius = scale * 0.46;
    return `<circle cx="${px + scale / 2}" cy="${py + scale / 2}" r="${radius}" fill="${fill}"/>`;
  }
  const radius = style === 'rounded' ? Math.max(1, scale * 0.24) : 0;
  return `<rect x="${px}" y="${py}" width="${scale}" height="${scale}"${radius ? ` rx="${radius}" ry="${radius}"` : ''} fill="${fill}"/>`;
}

function isFinderCell(x, y, count) {
  return (x < 7 && y < 7) || (x >= count - 7 && y < 7) || (x < 7 && y >= count - 7);
}

export function matrixToSvg(matrix, {
  size = 640,
  margin = 4,
  foreground = '#0f172a',
  background = '#ffffff',
  style = 'square',
  eyeStyle = 'square',
  eyeColor = foreground,
  transparent = false,
  title = 'QR code',
} = {}) {
  const count = matrix.length;
  const logical = count + margin * 2;
  const fg = safeColor(foreground, '#0f172a');
  const bg = safeColor(background, '#ffffff');
  const eye = safeColor(eyeColor, fg);
  const scale = size / logical;
  const pieces = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${String(title).replace(/[&<>\"]/g, '')}">`];
  if (!transparent) pieces.push(`<rect width="100%" height="100%" fill="${bg}"/>`);
  for (let y = 0; y < count; y += 1) {
    for (let x = 0; x < count; x += 1) if (matrix[y][x]) {
      const finder = isFinderCell(x, y, count);
      pieces.push(moduleShape(x + margin, y + margin, scale, finder ? eyeStyle : style, finder ? eye : fg));
    }
  }
  pieces.push('</svg>');
  return pieces.join('');
}

export function drawMatrixToCanvas(canvas, matrix, {
  size = 640,
  margin = 4,
  foreground = '#0f172a',
  background = '#ffffff',
  style = 'square',
  eyeStyle = 'square',
  eyeColor = foreground,
  transparent = false,
  pixelRatio = null,
} = {}) {
  const requestedRatio = Number(pixelRatio);
  const dpr = Number.isFinite(requestedRatio) && requestedRatio > 0 ? Math.max(1, Math.min(3, requestedRatio)) : Math.max(1, Math.min(3, globalThis.devicePixelRatio || 1));
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;
  if (!transparent) {
    ctx.fillStyle = safeColor(background, '#ffffff');
    ctx.fillRect(0, 0, size, size);
  } else {
    ctx.clearRect(0, 0, size, size);
  }
  const logical = matrix.length + margin * 2;
  const scale = size / logical;
  const fg = safeColor(foreground, '#0f172a');
  const eye = safeColor(eyeColor, fg);
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix.length; x += 1) {
      if (!matrix[y][x]) continue;
      const finder = isFinderCell(x, y, matrix.length);
      const moduleStyle = finder ? eyeStyle : style;
      ctx.fillStyle = finder ? eye : fg;
      const px = (x + margin) * scale; const py = (y + margin) * scale;
      if (moduleStyle === 'dots') {
        ctx.beginPath(); ctx.arc(px + scale / 2, py + scale / 2, scale * 0.46, 0, Math.PI * 2); ctx.fill();
      } else if (moduleStyle === 'rounded' && typeof ctx.roundRect === 'function') {
        ctx.beginPath(); ctx.roundRect(px, py, scale, scale, scale * 0.24); ctx.fill();
      } else ctx.fillRect(px, py, scale + 0.02, scale + 0.02);
    }
  }
  return canvas;
}

export function isQrContrastSafe(foreground, background) {
  const parse = color => {
    const value = String(color).replace('#', '');
    const hex = value.length === 3 ? value.split('').map(c => c + c).join('') : value.slice(0, 6);
    if (!/^[0-9a-f]{6}$/i.test(hex)) return [0, 0, 0];
    return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  };
  const luminance = rgb => {
    const v = rgb.map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const a = luminance(parse(foreground)); const b = luminance(parse(background));
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return ratio >= 4.5;
}
