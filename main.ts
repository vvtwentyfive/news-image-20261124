// THE WORLD TODAY - one page summing up Tuesday 24 November 2026.
// Node 22, standard library only. No network, no clock, no randomness:
// every run draws the same pixels and writes byte-identical PNG bytes.
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- font
// A 5x7 bitmap font, written out by hand for this entry. Each glyph is 7
// rows of 5 bits. Only capitals, digits and common punctuation are needed:
// every string drawn by this program is upper-cased before rendering.
const GLYPHS: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '"': ['01010', '01010', '01010', '00000', '00000', '00000', '00000'],
  '*': ['00000', '10101', '01110', '10101', '00000', '00000', '00000'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
  ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
  '>': ['10000', '01000', '00100', '00010', '00100', '01000', '10000'],
  '<': ['00001', '00010', '00100', '01000', '00100', '00010', '00001'],
  '@': ['01110', '10001', '10111', '10101', '10110', '10000', '01110'],
};

// ------------------------------------------------------------- canvas
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const PAPER: RGB = [246, 241, 227];
const INK: RGB = [22, 19, 14];
const NAVY: RGB = [20, 38, 63];
const NAVY2: RGB = [28, 52, 84];
const RED: RGB = [179, 39, 30];
const GOLD: RGB = [198, 148, 44];
const TEAL: RGB = [24, 110, 102];
const SKY: RGB = [214, 230, 238];
const WHITE: RGB = [255, 255, 255];
const GREY: RGB = [92, 86, 76];
const LINE: RGB = [180, 172, 152];
const CREAM2: RGB = [238, 231, 214];

function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2];
  }
}
function setPix(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPix(xx, yy, c);
  }
}
function hline(x: number, y: number, w: number, t: number, c: RGB): void {
  rect(x, y, w, t, c);
}
function vline(x: number, y: number, h: number, t: number, c: RGB): void {
  rect(x, y, t, h, c);
}
function box(x: number, y: number, w: number, h: number, c: RGB, t = 2): void {
  hline(x, y, w, t, c); hline(x, y + h - t, w, t, c);
  vline(x, y, h, t, c); vline(x + w - t, y, h, t, c);
}
function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) setPix(cx + x, cy + y, c);
    }
  }
}
function ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    for (let k = 0; k < t; k++) {
      setPix(Math.round(cx + (r + k) * Math.cos(rad)), Math.round(cy + (r + k) * Math.sin(rad)), c);
    }
  }
}
function tri(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: RGB): void {
  const minX = Math.min(x1, x2, x3), maxX = Math.max(x1, x2, x3);
  const minY = Math.min(y1, y2, y3), maxY = Math.max(y1, y2, y3);
  const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / d;
      const b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / d;
      const cc = 1 - a - b;
      if (a >= 0 && b >= 0 && cc >= 0) setPix(x, y, c);
    }
  }
}

// -------------------------------------------------------------- text
function textW(s: string, sc: number): number {
  return s.length * 6 * sc;
}
function drawText(s: string, x: number, y: number, sc: number, c: RGB): void {
  const up = s.toUpperCase();
  for (let ci = 0; ci < up.length; ci++) {
    const g = GLYPHS[up[ci]] ?? GLYPHS['?'];
    const ox = x + ci * 6 * sc;
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === '1') rect(ox + col * sc, y + r * sc, sc, sc, c);
      }
    }
  }
}
function textCenter(s: string, cx: number, y: number, sc: number, c: RGB): void {
  drawText(s, cx - Math.floor(textW(s, sc) / 2), y, sc, c);
}
// Greedy word wrap; returns lines that fit maxW. Long single words are cut.
function wrap(s: string, maxW: number, sc: number): string[] {
  const words = s.toUpperCase().split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textW(trial, sc) <= maxW) { cur = trial; continue; }
    if (cur) lines.push(cur);
    if (textW(w, sc) > maxW) {
      const per = Math.max(1, Math.floor(maxW / (6 * sc)));
      let rest = w;
      while (rest.length > per) { lines.push(rest.slice(0, per)); rest = rest.slice(per); }
      cur = rest;
    } else {
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function para(s: string, x: number, y: number, maxW: number, sc: number, c: RGB, lh: number): number {
  const lines = wrap(s, maxW, sc);
  lines.forEach((ln, i) => drawText(ln, x, y + i * lh, sc, c));
  return y + lines.length * lh;
}

// -------------------------------------------------------- png encode
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------- illustrations
// Small procedural pictures, drawn from rectangles, discs and triangles.
// Each hero card gets one on its right-hand side.
function drawChess(x: number, y: number, s: number): void {
  // Mini 8x8 board, 2 kings facing off.
  const cell = Math.floor(s / 8);
  const bs = cell * 8;
  rect(x, y, bs, bs, WHITE);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) rect(x + c * cell, y + r * cell, cell, cell, INK);
    }
  }
  box(x, y, bs, bs, INK, 2);
  // White king, top left area.
  disc(x + 2 * cell, y + 2 * cell, Math.floor(cell * 0.9), WHITE);
  ring(x + 2 * cell, y + 2 * cell, Math.floor(cell * 0.9), 2, INK);
  rect(x + 2 * cell - 1, y + cell, 2, cell, INK);
  // Black king, bottom right area.
  disc(x + 6 * cell, y + 6 * cell, Math.floor(cell * 0.9), INK);
  ring(x + 6 * cell, y + 6 * cell, Math.floor(cell * 0.9), 2, WHITE);
  rect(x + 6 * cell - 1, y + 5 * cell, 2, cell, WHITE);
}
function drawDrone(x: number, y: number, w: number, h: number): void {
  // Sky, sea, a quadcopter drone and a ship on the horizon.
  rect(x, y, w, h, SKY);
  rect(x, y + Math.floor(h * 0.62), w, h - Math.floor(h * 0.62), NAVY2);
  hline(x, y + Math.floor(h * 0.62), w, 3, WHITE);
  // Ship.
  rect(x + 14, y + Math.floor(h * 0.62) - 16, 52, 14, INK);
  rect(x + 30, y + Math.floor(h * 0.62) - 28, 20, 12, INK);
  // Drone body + 4 rotors.
  const cx = x + Math.floor(w * 0.62), cy = y + 34;
  rect(cx - 22, cy - 6, 44, 12, INK);
  disc(cx, cy, 7, RED);
  rect(cx - 34, cy - 16, 20, 3, INK); rect(cx + 14, cy - 16, 20, 3, INK);
  rect(cx - 34, cy + 13, 20, 3, INK); rect(cx + 14, cy + 13, 20, 3, INK);
  disc(cx - 26, cy - 14, 5, GREY); disc(cx + 26, cy - 14, 5, GREY);
  disc(cx - 26, cy + 14, 5, GREY); disc(cx + 26, cy + 14, 5, GREY);
  vline(cx, cy + 6, 14, 2, INK);
}
function drawSmog(x: number, y: number, w: number, h: number): void {
  // Hazy sun over a city skyline, smog bands across the middle.
  rect(x, y, w, h, [232, 214, 170]);
  disc(x + Math.floor(w * 0.72), y + 30, 20, [214, 122, 54]);
  const base = y + h - 8;
  const bars: Array<[number, number, number]> = [
    [0, Math.floor(w * 0.32), Math.floor(h * 0.52)],
    [Math.floor(w * 0.36), Math.floor(w * 0.22), Math.floor(h * 0.42)],
    [Math.floor(w * 0.62), Math.floor(w * 0.38), Math.floor(h * 0.62)],
  ];
  for (const [bx, bw, bh] of bars) rect(x + bx, base - bh, bw, bh, [74, 66, 58]);
  rect(x, y + 52, w, 12, [226, 204, 158]);
  rect(x, y + 70, w, 10, [214, 190, 140]);
  hline(x, base, w, 3, INK);
}
function drawMountains(x: number, y: number, w: number, h: number): void {
  // Two flag poles in front of mountain ridges, sized to the panel.
  rect(x, y, w, h, SKY);
  const m1x = Math.floor(w * 0.36), m2x = Math.floor(w * 0.78);
  tri(x - 6, y + h, x + m1x, y + Math.floor(h * 0.16), x + Math.floor(w * 0.72), y + h, [90, 110, 130]);
  tri(x + Math.floor(w * 0.42), y + h, x + m2x, y + Math.floor(h * 0.30), x + w + 4, y + h, [58, 78, 100]);
  tri(x + m1x - 6, y + Math.floor(h * 0.16), x + m1x + 6, y + Math.floor(h * 0.16), x + m1x, y + Math.floor(h * 0.28), WHITE);
  rect(x, y + h - 10, w, 10, [96, 128, 84]);
  // Flag 1: saffron-white-green bands.
  const f1x = x + Math.floor(w * 0.14), f2x = x + Math.floor(w * 0.62);
  vline(f1x, y + Math.floor(h * 0.20), Math.floor(h * 0.52), 3, INK);
  rect(f1x + 3, y + Math.floor(h * 0.20), 34, 7, [255, 153, 51]);
  rect(f1x + 3, y + Math.floor(h * 0.20) + 7, 34, 7, WHITE);
  rect(f1x + 3, y + Math.floor(h * 0.20) + 14, 34, 7, [19, 136, 8]);
  // Flag 2: red field, yellow stars.
  vline(f2x, y + Math.floor(h * 0.20), Math.floor(h * 0.52), 3, INK);
  rect(f2x + 3, y + Math.floor(h * 0.20), 34, 21, [222, 41, 16]);
  disc(f2x + 11, y + Math.floor(h * 0.20) + 8, 3, GOLD);
  disc(f2x + 24, y + Math.floor(h * 0.20) + 6, 2, GOLD);
  disc(f2x + 24, y + Math.floor(h * 0.20) + 15, 2, GOLD);
}

// ------------------------------------------------------------- content
// Every story below happened, or was first reported, on Tuesday 24 Nov 2026.
// Sources checked at build time (00:00-00:20 UTC, 24 Nov 2026):
// chess.com / FIDE, Dunya News 12 AM headlines, Times of India / Indian
// Express school-headlines roundups for 24 Nov, ANI, ICC, Reuters wires.
// Stories from 21-23 Nov (COP31 collapse, Indonesia factory fire, the
// Dymer strike, India-Nepal train, India-NZ Test draw, Ferrari launch)
// were deliberately left OUT: they are not 24 November news.
interface Hero { kick: string; head: string; body: string; src: string; art: 'chess' | 'drone' | 'smog' | 'mount'; }
const HEROES: Hero[] = [
  {
    kick: 'SPORT - GENEVA',
    head: 'CHESS CROWN ON THE LINE',
    body: 'Gukesh vs Sindarov in Game 1 today. The youngest title match ever - both men are 20.',
    src: 'CHESS.COM / FIDE',
    art: 'chess',
  },
  {
    kick: 'MIDDLE EAST - GULF TENSIONS',
    head: 'IRAN SAYS IT DOWNED 78 US DRONES',
    body: 'IRGC claims 78 US drones shot down as Gulf tensions rise. Tehran vows to counter the US blockade.',
    src: 'DUNYA NEWS / IRGC',
    art: 'drone',
  },
  {
    kick: 'ENVIRONMENT - PAKISTAN',
    head: 'LAHORE CHOKES AS AQI TOPS 500',
    body: 'Lahore is the worlds most polluted city today as smog blankets Punjab.',
    src: 'DUNYA NEWS',
    art: 'smog',
  },
  {
    kick: 'ASIA - DIPLOMACY',
    head: 'INDIA, CHINA TALK BORDER CALM',
    body: 'Generals meet in Arunachal after ten days of talks to ease tensions on the border.',
    src: 'TIMES OF INDIA',
    art: 'mount',
  },
];
interface Grid { head: string; body: string; src: string; chip: RGB; mark: string; }
const GRID: Grid[] = [
  { head: 'KARTHIGAI DEEPAM LIT TODAY', body: 'Supreme Court clears the lighting at Thiruparankundram hill in Madurai.', src: 'SUPREME COURT', chip: GOLD, mark: 'F' },
  { head: 'BISLERI FACES PROSECUTION', body: 'Food safety body orders action over packaged drinking water quality.', src: 'FSSAI', chip: TEAL, mark: 'W' },
  { head: 'COURT WARRANT FOR DHRUV RATHEE', body: 'A Delhi court issues a non-bailable warrant against the YouTuber.', src: 'DELHI COURT', chip: NAVY2, mark: 'J' },
  { head: 'RS MP WADKUTE DIES', body: 'Rajya Sabha MP Ramrao Wadkute dies at AIIMS Delhi; leaders pay tribute.', src: 'ANI', chip: GREY, mark: 'R' },
  { head: 'SPICEJET CREWS UNPAID', body: 'Pilots\u2019 body urges the ministry to act as salaries stall and debts mount.', src: 'FED. OF INDIAN PILOTS', chip: RED, mark: 'A' },
  { head: 'OIL IMPORT BILL UP 60%', body: 'October oil and gas bill hits $16bn as crude prices climb and LPG use falls.', src: 'BUSINESS', chip: INK, mark: '$' },
  { head: 'EL NINO FLOOD WARNING', body: 'Report warns of floods and landslides across the Hindu Kush Himalaya.', src: 'CLIMATE', chip: TEAL, mark: '!' },
  { head: 'ODISHA CYBER COMMAND', body: 'State clears a Rs 249-crore centre to fight cybercrime and online fraud.', src: 'ODISHA GOVT', chip: NAVY2, mark: 'C' },
];
const INDEX_ITEMS: string[] = [
  'UP SUPER TET CITY SLIP EXPECTED TODAY',
  'UGC NET DECEMBER CITY SLIP EXPECTED',
  'MODI GIVES RS 2 LAKH AID TO KUTCH DEAD',
  'US INTEL CHIEF: PUTIN NO FRIEND OF US',
  'EISENKOT CONDEMNS SETTLER ARSON',
  'UNDERSEA CABLE FIX DUE BY DEC 6',
];

// Map pins: x/y are fractions of the map panel; dx/dy place each label
// clear of the others (Delhi dropped: it sits on top of Lahore at this scale).
const PINS: Array<[number, number, string, number, number]> = [
  [0.47, 0.30, 'GENEVA', 8, -4],
  [0.55, 0.40, 'W. BANK', -52, -4],
  [0.60, 0.52, 'GULF', -10, 10],
  [0.66, 0.44, 'LAHORE', -12, -13],
  [0.76, 0.46, 'ARUNACHAL', 8, -4],
  [0.70, 0.58, 'MADURAI', 8, 6],
];

// -------------------------------------------------------------- layout
const MX = 24;            // side margin
const CW = W - MX * 2;    // content width = 976

function drawMasthead(): void {
  rect(0, 0, W, 118, NAVY);
  rect(0, 118, W, 4, GOLD);
  drawText('THE WORLD IN ONE PAGE  -  MAKE.FUN DAILY NEWS', MX + 6, 16, 2, [200, 210, 225]);
  textCenter('TUESDAY 24 NOVEMBER 2026', W / 2, 46, 6, WHITE);
  drawText('24 NOV 2026', W - MX - 6 - textW('24 NOV 2026', 2), 16, 2, GOLD);
}

function drawKpis(y: number): number {
  const items: Array<[string, string]> = [
    ['500+', 'LAHORE AQI - WORLDS WORST AIR TODAY'],
    ['78', 'US DRONES IRGC SAYS IT DOWNED'],
    ['14', 'GAMES IN THE WORLD CHESS TITLE MATCH'],
    ['557TH', 'GURU NANAK BIRTH ANNIVERSARY'],
  ];
  const gap = 10;
  const bw = Math.floor((CW - gap * 3) / 4);
  items.forEach(([num, lab], i) => {
    const x = MX + i * (bw + gap);
    rect(x, y, bw, 84, WHITE);
    box(x, y, bw, 84, INK, 2);
    rect(x, y, bw, 6, RED);
    textCenter(num, x + bw / 2, y + 14, 5, RED);
    const lines = wrap(lab, bw - 16, 1);
    lines.slice(0, 2).forEach((ln, k) => textCenter(ln, x + bw / 2, y + 52 + k * 10, 1, INK));
  });
  return y + 84;
}

function drawHero(h: Hero, x: number, y: number, w: number, hh: number): void {
  rect(x, y, w, hh, WHITE);
  box(x, y, w, hh, INK, 2);
  rect(x, y, w, 4, RED);
  const artW = 132;
  const tx = x + 14, tw = w - artW - 28;
  drawText(h.kick, tx, y + 14, 1, RED);
  const headLines = wrap(h.head, tw, 3);
  headLines.slice(0, 2).forEach((ln, i) => drawText(ln, tx, y + 30 + i * 26, 3, INK));
  const bodyY = y + 30 + Math.min(headLines.length, 2) * 26 + 6;
  const bodyLines = wrap(h.body, tw, 2).slice(0, 4);
  bodyLines.forEach((ln, i) => drawText(ln, tx, bodyY + i * 17, 2, [52, 48, 40]));
  drawText('SOURCE: ' + h.src, tx, y + hh - 20, 1, GREY);
  const ax = x + w - artW - 8, ay = y + 14, aw = artW - 6, ah = hh - 44;
  if (h.art === 'chess') drawChess(ax + 12, ay + 8, Math.min(aw - 24, ah - 16));
  if (h.art === 'drone') drawDrone(ax, ay + 6, aw, ah - 6);
  if (h.art === 'smog') drawSmog(ax, ay + 6, aw, ah - 6);
  if (h.art === 'mount') drawMountains(ax, ay + 6, aw, ah - 6);
}

function drawGrid(y: number): number {
  drawText('MORE FROM TUESDAY', MX, y, 2, RED);
  hline(MX + textW('MORE FROM TUESDAY', 2) + 12, y + 6, W - MX - (MX + textW('MORE FROM TUESDAY', 2) + 12), 2, LINE);
  const gy = y + 24;
  const gap = 10;
  const bw = Math.floor((CW - gap * 3) / 4);
  const bh = 86;
  GRID.forEach((g, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = MX + col * (bw + gap), yy = gy + row * (bh + gap);
    rect(x, yy, bw, bh, WHITE);
    box(x, yy, bw, bh, LINE, 1);
    rect(x + 8, yy + 8, 26, 26, g.chip);
    drawText(g.mark, x + 8 + 13 - Math.floor(textW(g.mark, 2) / 2), yy + 13, 2, WHITE);
    const hx = x + 42;
    const headLines = wrap(g.head, bw - 50, 2);
    headLines.slice(0, 2).forEach((ln, k) => drawText(ln, hx, yy + 8 + k * 16, 2, INK));
    para(g.body, x + 8, yy + 42, bw - 16, 1, [70, 64, 54], 10);
    drawText(g.src, x + 8, yy + bh - 12, 1, GREY);
  });
  return gy + bh * 2 + gap;
}

function drawMapAndIndex(y: number): number {
  const gap = 12;
  const mw = Math.floor((CW - gap) / 2);
  const mh = 132;
  // Left: stylised world map with pins.
  rect(MX, y, mw, mh, [226, 236, 242]);
  box(MX, y, mw, mh, INK, 2);
  drawText('WHERE IT HAPPENED', MX + 10, y + 8, 2, NAVY);
  // Abstract continents: rough blobs made of rectangles.
  const land: RGB = [168, 178, 158];
  rect(MX + 30, y + 34, 90, 40, land);   // N America
  rect(MX + 52, y + 74, 46, 26, land);   // S America
  rect(MX + 150, y + 30, 70, 46, land);  // Europe/Africa upper
  rect(MX + 168, y + 76, 40, 34, land);  // Africa lower
  rect(MX + 250, y + 30, 130, 44, land); // Asia
  rect(MX + 330, y + 78, 60, 22, land);  // SE Asia / Oceania
  rect(MX + 400, y + 88, 56, 20, land);  // Australia
  for (const [fx, fy, label, dx, dy] of PINS) {
    const px0 = MX + Math.floor(fx * mw), py0 = y + Math.floor(fy * mh);
    disc(px0, py0, 5, RED);
    ring(px0, py0, 5, 1, WHITE);
    drawText(label, px0 + dx, py0 + dy, 1, INK);
  }
  // Right: numbered index.
  const ix = MX + mw + gap;
  rect(ix, y, mw, mh, WHITE);
  box(ix, y, mw, mh, INK, 2);
  drawText('THE DAY IN BRIEF', ix + 10, y + 8, 2, RED);
  INDEX_ITEMS.forEach((it, i) => {
    const yy = y + 30 + i * 17;
    drawText(String(i + 1) + '.', ix + 10, yy, 1, RED);
    drawText(it, ix + 30, yy, 1, INK);
  });
  return y + mh;
}

function drawFooter(y: number): void {
  hline(MX, y, CW, 2, INK);
  para('EVERY STORY ABOVE HAPPENED OR WAS FIRST REPORTED ON TUESDAY 24 NOVEMBER 2026.', MX, y + 8, CW, 2, INK, 17);
  drawText('SOURCES: CHESS.COM / FIDE - DUNYA NEWS - TIMES OF INDIA - INDIAN EXPRESS - ANI - REUTERS', MX, y + 28, 1, GREY);
}

// ---------------------------------------------------------------- main
function build(): Buffer {
  fill(PAPER);
  drawMasthead();
  let y = drawKpis(130);
  y += 12;
  const hw = Math.floor((CW - 16) / 2);
  const hh = 190;
  HEROES.forEach((h, i) => {
    drawHero(h, MX + (i % 2) * (hw + 16), y + Math.floor(i / 2) * (hh + 12), hw, hh);
  });
  y += hh * 2 + 12 + 12;
  y = drawGrid(y);
  y += 12;
  y = drawMapAndIndex(y);
  drawFooter(y + 8);
  box(8, 8, W - 16, H - 16, INK, 2);
  return encodePNG();
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'entry.png');
writeFileSync(outPath, build());
chmodSync(outPath, 0o644);
