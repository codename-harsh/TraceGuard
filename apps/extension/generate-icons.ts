import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePng(width: number, height: number, getPixel: (x: number, y: number) => [number, number, number, number]): Buffer {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride;
    raw[rowOffset] = 0; // Filter type 0: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);

  // PNG Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // adaptive filter
  ihdrData[12] = 0; // no interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Generate icon rendering function
function drawTraceGuardIcon(size: number): Buffer {
  return makePng(size, size, (x, y) => {
    // Center coordinates -1 to 1
    const cx = (x + 0.5) / size * 2 - 1;
    const cy = (y + 0.5) / size * 2 - 1;

    // Outer rounded square / shield boundary
    const radius = 0.88;
    const distSq = cx * cx + cy * cy;

    // Background: dark zinc-950 #09090b
    let r = 9, g = 9, b = 11, a = 255;

    // Corner clipping
    const cornerR = 0.22;
    const qx = Math.max(0, Math.abs(cx) - (1 - cornerR));
    const qy = Math.max(0, Math.abs(cy) - (1 - cornerR));
    if (qx * qx + qy * qy > cornerR * cornerR) {
      return [0, 0, 0, 0]; // Transparent outside icon bounds
    }

    // Border line (zinc-800: 39, 39, 42)
    const isBorder = Math.abs(cx) > 0.9 || Math.abs(cy) > 0.9;
    if (isBorder) {
      r = 39; g = 39; b = 42;
    }

    // Shield shape inside:
    // x in [-0.55, 0.55], y from -0.6 to 0.65 with curved bottom
    const sx = Math.abs(cx);
    const inShieldTop = cy >= -0.55 && cy <= 0.0 && sx <= 0.52;
    const inShieldBot = cy > 0.0 && cy <= 0.62 && sx <= 0.52 * (1 - Math.pow(cy / 0.62, 1.8));

    if (inShieldTop || inShieldBot) {
      // Shield interior gradient: teal/emerald brand (#10b981 to #059669 / #06b6d4)
      const grad = (cy + 0.55) / 1.17;
      r = Math.round(16 + grad * (6 - 16));
      g = Math.round(185 + grad * (150 - 185));
      b = Math.round(129 + grad * (160 - 129));

      // Central eye / radar pulse dot
      const eyeDist = Math.sqrt(cx * cx + (cy + 0.05) * (cy + 0.05));
      if (eyeDist <= 0.14) {
        // Bright white/cyan core
        r = 255; g = 255; b = 255;
      } else if (eyeDist <= 0.28 && eyeDist >= 0.22) {
        // Radar pulse ring
        r = 220; g = 252; b = 231;
      }
    }

    return [r, g, b, a];
  });
}

const outDir = path.resolve('c:/Users/PC/Documents/ProJectos/TraceGuard/apps/extension/public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const size of [16, 32, 48, 128]) {
  const icon = drawTraceGuardIcon(size);
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, icon);
  console.log(`Generated ${file} (${icon.length} bytes)`);
}
