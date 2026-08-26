// Generates the social-share image and raster favicons into /public.
// Run with: node scripts/generate-assets.mjs
// Uses the Archivo Black WOFF (opentype.js) to draw the wordmark as vector
// paths, then rasterises with sharp — no system fonts or browser needed.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
mkdirSync(publicDir, { recursive: true });

const fontPath = path.join(
  root,
  'node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff',
);
const font = opentype.parse(toArrayBuffer(readFileSync(fontPath)));

const PLUM = '#1c0d3c';
const PLUM_GLOW = '#4a2a8f';
const LIME = '#32cd32';

function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/** SVG path data for a word, positioned by its left baseline. */
function wordPath(text, x, y, size, letterSpacingEm = -0.035) {
  const p = font.getPath(text, x, y, size, { letterSpacing: letterSpacingEm });
  return p.toPathData(2);
}

function wordWidth(text, size, letterSpacingEm = -0.035) {
  return font.getAdvanceWidth(text, size, { letterSpacing: letterSpacingEm });
}

/** Lockup 02 "speed slash": italicised wordmark + skewed lime bar. */
function lockupSvg({ width, height, size, cx, cy, tagline }) {
  const text = 'INSTINCT';
  const w = wordWidth(text, size);
  const barW = size * 0.17;
  const barH = size * 0.73;
  const gap = size * 0.33;
  const total = w + gap + barW;
  const x = cx - total / 2;
  const baseline = cy + size * 0.36;
  const d = wordPath(text, x, baseline, size);
  const barX = x + w + gap;
  const barY = baseline - size * 0.72 + (size * 0.72 - barH) / 2;
  const skew = `translate(${cx} ${cy}) skewX(-12) translate(${-cx} ${-cy})`;
  return `
    <g transform="${skew}">
      <path d="${d}" fill="#ffffff"/>
      <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="${LIME}"/>
    </g>
    ${
      tagline
        ? `<text x="${cx}" y="${cy + size * 0.95}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${size * 0.19}" font-weight="600" letter-spacing="${size * 0.02}" fill="#8ce88c">${tagline}</text>`
        : ''
    }
  `;
}

async function og() {
  const width = 1200;
  const height = 630;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <radialGradient id="g" cx="8%" cy="0%" r="110%">
        <stop offset="0" stop-color="${PLUM_GLOW}"/>
        <stop offset="0.62" stop-color="${PLUM}"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
    <rect x="0" y="${height - 14}" width="${width}" height="14" fill="${LIME}"/>
    ${lockupSvg({ width, height, size: 150, cx: width / 2, cy: height / 2 - 30, tagline: 'CUSTOM SUBLIMATED TEAMWEAR · NZ OWNED AND OPERATED' })}
  </svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(publicDir, 'og-default.png'));
}

/** Square icon: "I" glyph plus lime bar, like the favicon. */
function iconSvg(size) {
  const pad = size * 0.2;
  const glyphSize = size * 0.62;
  const text = 'I';
  const w = wordWidth(text, glyphSize, 0);
  const barW = glyphSize * 0.17;
  const gap = glyphSize * 0.2;
  const total = w + gap + barW;
  const x = (size - total) / 2;
  const baseline = size / 2 + glyphSize * 0.36;
  const d = wordPath(text, x, baseline, glyphSize, 0);
  const barH = glyphSize * 0.56;
  const barY = baseline - glyphSize * 0.72 + (glyphSize * 0.72 - barH) / 2;
  const c = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${PLUM}"/>
    <g transform="translate(${c} ${c}) skewX(-12) translate(${-c} ${-c})">
      <path d="${d}" fill="#ffffff"/>
      <rect x="${x + w + gap}" y="${barY}" width="${barW}" height="${barH}" fill="${LIME}"/>
    </g>
  </svg>`.replace(/\n\s*/g, '');
  void pad;
}

async function icons() {
  const targets = [
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ];
  for (const [name, size] of targets) {
    await sharp(Buffer.from(iconSvg(size))).png().toFile(path.join(publicDir, name));
  }
  // favicon.ico: an ICO container wrapping the 32px PNG (supported by all
  // current browsers).
  const png = await sharp(Buffer.from(iconSvg(32))).png().toBuffer();
  const header = Buffer.alloc(6 + 16);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count
  header.writeUInt8(32, 6); // width
  header.writeUInt8(32, 7); // height
  header.writeUInt8(0, 8); // palette
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // planes
  header.writeUInt16LE(32, 12); // bit depth
  header.writeUInt32LE(png.length, 14); // size
  header.writeUInt32LE(22, 18); // offset
  writeFileSync(path.join(publicDir, 'favicon.ico'), Buffer.concat([header, png]));
}

await og();
await icons();
console.log('Generated og-default.png, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png');
