// Generates the app launcher icon + splash logo as real PNGs from the event brand colors,
// so flutter_launcher_icons / flutter_native_splash run out of the box. Replace these with the
// client's final branded artwork before store submission.
//
// Usage: node tools/gen_app_assets.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const PRIMARY = [0x1a, 0x2b, 0x4c]; // #1A2B4C
const SECONDARY = [0xc9, 0xa2, 0x27]; // #C9A227

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** draw(x,y) -> [r,g,b,a]. Produces an RGBA PNG of the given size. */
function makePng(size, draw) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y);
      raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

// Launcher icon: brand-navy field with a gold ring + center dot (a simple, recognizable mark).
const SIZE = 1024;
const c = SIZE / 2;
const icon = makePng(SIZE, (x, y) => {
  const ring = inCircle(x, y, c, c, SIZE * 0.34) && !inCircle(x, y, c, c, SIZE * 0.27);
  const dot = inCircle(x, y, c, c, SIZE * 0.12);
  if (ring || dot) return [...SECONDARY, 255];
  return [...PRIMARY, 255];
});

// Splash logo: the gold ring + dot on a transparent field (native_splash sets the bg color).
const SP = 512;
const sc = SP / 2;
const splash = makePng(SP, (x, y) => {
  const ring = inCircle(x, y, sc, sc, SP * 0.34) && !inCircle(x, y, sc, sc, SP * 0.27);
  const dot = inCircle(x, y, sc, sc, SP * 0.12);
  return ring || dot ? [...SECONDARY, 255] : [0, 0, 0, 0];
});

mkdirSync('apps/mobile/assets/icon', { recursive: true });
mkdirSync('apps/mobile/assets/splash', { recursive: true });
writeFileSync('apps/mobile/assets/icon/app_icon.png', icon);
writeFileSync('apps/mobile/assets/splash/splash_logo.png', splash);
console.log('Wrote app_icon.png (1024) and splash_logo.png (512).');
