// Generate the blog favicon as a PNG, using only Node built-ins (zlib).
//
// Why generate instead of hand-placing a binary: keeps the repo reviewable - the
// image is reproducible from this script rather than an opaque blob.
//
// Design matches the landing page's inline SVG icon: blue rounded square, white "L".
//
// Usage: node make-favicon.mjs <output-path>
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const SIZE = 64
const BG = [0x40, 0x9e, 0xff]   // #409EFF, same as the landing icon
const FG = [0xff, 0xff, 0xff]

// --- draw -------------------------------------------------------------------
// RGBA canvas, transparent by default.
const px = new Uint8Array(SIZE * SIZE * 4)

function set(x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
  const i = (y * SIZE + x) * 4
  // simple source-over onto whatever is there
  const sa = a / 255
  const da = px[i + 3] / 255
  const oa = sa + da * (1 - sa)
  if (oa === 0) return
  px[i]     = Math.round((r * sa + px[i]     * da * (1 - sa)) / oa)
  px[i + 1] = Math.round((g * sa + px[i + 1] * da * (1 - sa)) / oa)
  px[i + 2] = Math.round((b * sa + px[i + 2] * da * (1 - sa)) / oa)
  px[i + 3] = Math.round(oa * 255)
}

const RADIUS = 12
function inRoundedSquare(x, y) {
  const cx = Math.min(Math.max(x, RADIUS), SIZE - 1 - RADIUS)
  const cy = Math.min(Math.max(y, RADIUS), SIZE - 1 - RADIUS)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= RADIUS * RADIUS
}

// Supersample 3x3 per pixel for smooth edges.
const SS = 3
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let hits = 0
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const fx = x + (sx + 0.5) / SS
        const fy = y + (sy + 0.5) / SS
        if (inRoundedSquare(fx, fy)) hits++
      }
    }
    if (hits > 0) set(x, y, BG, Math.round((hits / (SS * SS)) * 255))
  }
}

// The letter "L": a vertical stem plus a horizontal foot, drawn as a thick path.
// Coordinates are in the 64px grid, inset so the glyph sits comfortably.
const STEM_X0 = 22, STEM_X1 = 29           // stem thickness
const STEM_Y0 = 17, STEM_Y1 = 45
const FOOT_Y0 = 38, FOOT_Y1 = 45           // foot thickness
const FOOT_X0 = 22, FOOT_X1 = 44

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const inStem = x >= STEM_X0 && x < STEM_X1 && y >= STEM_Y0 && y < STEM_Y1
    const inFoot = y >= FOOT_Y0 && y < FOOT_Y1 && x >= FOOT_X0 && x < FOOT_X1
    if (inStem || inFoot) set(x, y, FG)
  }
}

// --- encode PNG -------------------------------------------------------------
const crcTable = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8    // bit depth
ihdr[9] = 6    // colour type: RGBA
ihdr[10] = 0   // compression
ihdr[11] = 0   // filter
ihdr[12] = 0   // interlace

// Each scanline is prefixed with filter byte 0.
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (SIZE * 4 + 1)
  raw[rowStart] = 0
  Buffer.from(px.buffer, y * SIZE * 4, SIZE * 4).copy(raw, rowStart + 1)
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

const out = process.argv[2] || 'favicon.png'
writeFileSync(out, png)
console.log(`wrote ${out}: ${png.length} bytes, ${SIZE}x${SIZE} RGBA`)
