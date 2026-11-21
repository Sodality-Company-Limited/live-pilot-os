import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
import {
  redactBoundingBoxesInPng,
  detectSensitivePatterns,
  redactSensitiveTokens,
  isValidLuhn,
  computePngCrc,
  hasExifOrMetadata,
  sanitizeImage,
  validateSandboxedPath,
  computeContentHash,
  generateSecurityAuditReceipt,
  SecurityBoundaryViolationError
} from '../../scripts/lib/multimodal-reference-guard.mjs';

/**
 * Paeth predictor utility for reference and ground truth calculations.
 */
function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Helper to construct an arbitrary RGBA PNG with customizable scanline filters.
 */
function createSyntheticRgbaPng(options = {}) {
  const {
    width = 16,
    height = 16,
    filterSelector = (y) => 0, // default filter None
    pixelGenerator = (x, y) => [
      ((x * 17) + 11) & 0xff,
      ((y * 23) + 37) & 0xff,
      ((x * 7 + y * 13) + 71) & 0xff,
      255
    ],
    colorType = 6, // 6 = RGBA
    bitDepth = 8
  } = options;

  const bpp = colorType === 6 ? 4 : (colorType === 2 ? 3 : 1);
  const truePixels = Buffer.alloc(height * width * bpp);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgba = pixelGenerator(x, y);
      const offset = (y * width + x) * bpp;
      for (let c = 0; c < bpp; c++) {
        truePixels[offset + c] = rgba[c] !== undefined ? rgba[c] : 255;
      }
    }
  }

  const rawScanlines = Buffer.alloc(height * (1 + width * bpp));
  for (let y = 0; y < height; y++) {
    const filterType = filterSelector(y);
    const rowStart = y * (1 + width * bpp);
    rawScanlines[rowStart] = filterType;

    const currRow = y * width * bpp;
    const prevRow = y > 0 ? (y - 1) * width * bpp : -1;

    for (let x = 0; x < width * bpp; x++) {
      const val = truePixels[currRow + x];
      const left = x >= bpp ? truePixels[currRow + x - bpp] : 0;
      const up = prevRow >= 0 ? truePixels[prevRow + x] : 0;
      const upLeft = (prevRow >= 0 && x >= bpp) ? truePixels[prevRow + x - bpp] : 0;

      let delta = 0;
      if (filterType === 0) delta = val;
      else if (filterType === 1) delta = (val - left) & 0xff;
      else if (filterType === 2) delta = (val - up) & 0xff;
      else if (filterType === 3) delta = (val - Math.floor((left + up) / 2)) & 0xff;
      else if (filterType === 4) delta = (val - paethPredictor(left, up, upLeft)) & 0xff;

      rawScanlines[rowStart + 1 + x] = delta;
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(bitDepth, 8);
  ihdr.writeUInt8(colorType, 9);
  ihdr.writeUInt8(0, 10); // compression deflate
  ihdr.writeUInt8(0, 11); // filter standard
  ihdr.writeUInt8(0, 12); // no interlace

  const makeChunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(computePngCrc(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };

  const comp = zlib.deflateSync(rawScanlines);
  const png = Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', comp),
    makeChunk('IEND', Buffer.alloc(0))
  ]);

  return { png, truePixels, width, height, bpp };
}

/**
 * Extracts and unfilters scanlines from a PNG buffer assuming Filter 0 output.
 */
function extractUncompressedRgba(pngBuffer, expectedWidth, expectedHeight) {
  let pos = 8;
  const idatChunks = [];
  while (pos < pngBuffer.length) {
    const len = pngBuffer.readUInt32BE(pos);
    const type = pngBuffer.subarray(pos + 4, pos + 8).toString('ascii');
    if (type === 'IDAT') {
      idatChunks.push(pngBuffer.subarray(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4;
  const stride = 1 + expectedWidth * bpp;
  const pixelBuffer = Buffer.alloc(expectedHeight * expectedWidth * bpp);

  for (let y = 0; y < expectedHeight; y++) {
    const rowStart = y * stride;
    const filter = decompressed[rowStart];
    assert.equal(filter, 0, `Output PNG row ${y} must use Filter 0 (None)`);
    decompressed.copy(pixelBuffer, y * expectedWidth * bpp, rowStart + 1, rowStart + 1 + expectedWidth * bpp);
  }
  return pixelBuffer;
}

/**
 * Validates PNG chunk structure and checks all chunk CRCs.
 */
function validatePngCrcs(pngBuffer) {
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.deepEqual(pngBuffer.subarray(0, 8), PNG_SIG, 'PNG signature mismatch');

  let pos = 8;
  const chunks = [];
  while (pos < pngBuffer.length) {
    assert.ok(pos + 12 <= pngBuffer.length, 'Truncated chunk header');
    const len = pngBuffer.readUInt32BE(pos);
    const type = pngBuffer.subarray(pos + 4, pos + 8).toString('ascii');
    const data = pngBuffer.subarray(pos + 8, pos + 8 + len);
    const storedCrc = pngBuffer.readUInt32BE(pos + 8 + len);

    const typeAndData = pngBuffer.subarray(pos + 4, pos + 8 + len);
    const calculatedCrc = computePngCrc(typeAndData);
    assert.equal(calculatedCrc, storedCrc, `CRC-32 mismatch on chunk ${type}`);

    chunks.push({ type, len, storedCrc });
    pos += 12 + len;
  }
  assert.ok(chunks.some(c => c.type === 'IHDR'), 'Missing IHDR chunk');
  assert.ok(chunks.some(c => c.type === 'IDAT'), 'Missing IDAT chunk');
  assert.ok(chunks.some(c => c.type === 'IEND'), 'Missing IEND chunk');
  return chunks;
}

describe('G-SEC-001 Adversarial Challenge & Stress Suite', () => {

  describe('Adversarial Dimension 1 — Raster Pixel Bounding Box Masking (redactBoundingBoxesInPng)', () => {

    it('1.1 Boundary Coordinates (0,0) and (W-1, H-1) single-pixel precision masking', () => {
      const width = 8;
      const height = 8;
      const { png, truePixels } = createSyntheticRgbaPng({ width, height });

      // Mask strictly pixel (0, 0) with purple [128, 0, 128, 255]
      // and pixel (7, 7) with cyan [0, 255, 255, 255]
      const boxes = [
        { x: 0, y: 0, width: 1, height: 1, fillColor: [128, 0, 128, 255] },
        { x: 7, y: 7, width: 1, height: 1, fillColor: [0, 255, 255, 255] }
      ];

      const maskedPng = redactBoundingBoxesInPng(png, boxes);
      validatePngCrcs(maskedPng);

      const pixels = extractUncompressedRgba(maskedPng, width, height);

      // Verify (0, 0) is purple
      assert.deepEqual(Array.from(pixels.subarray(0, 4)), [128, 0, 128, 255]);
      // Verify (7, 7) is cyan
      const lastPxOffset = (7 * 8 + 7) * 4;
      assert.deepEqual(Array.from(pixels.subarray(lastPxOffset, lastPxOffset + 4)), [0, 255, 255, 255]);

      // Verify immediate neighbors of (0,0) are 100% untouched:
      // (1, 0) and (0, 1)
      const p10Offset = (0 * 8 + 1) * 4;
      assert.deepEqual(
        Array.from(pixels.subarray(p10Offset, p10Offset + 4)),
        Array.from(truePixels.subarray(p10Offset, p10Offset + 4)),
        'Neighbor pixel (1, 0) must remain untouched'
      );
      const p01Offset = (1 * 8 + 0) * 4;
      assert.deepEqual(
        Array.from(pixels.subarray(p01Offset, p01Offset + 4)),
        Array.from(truePixels.subarray(p01Offset, p01Offset + 4)),
        'Neighbor pixel (0, 1) must remain untouched'
      );

      // Verify all other 62 pixels are identical to truePixels
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if ((x === 0 && y === 0) || (x === 7 && y === 7)) continue;
          const off = (y * width + x) * 4;
          assert.deepEqual(
            Array.from(pixels.subarray(off, off + 4)),
            Array.from(truePixels.subarray(off, off + 4)),
            `Pixel at (${x}, ${y}) should be unmasked`
          );
        }
      }
    });

    it('1.2 Full Image Masking and Oversized Bounding Boxes', () => {
      const width = 12;
      const height = 10;
      const { png } = createSyntheticRgbaPng({ width, height });

      // Box exactly matching image dimensions
      const exactFullBox = [{ x: 0, y: 0, width: 12, height: 10, fillColor: [77, 88, 99, 255] }];
      const exactFullPng = redactBoundingBoxesInPng(png, exactFullBox);
      validatePngCrcs(exactFullPng);
      const exactPixels = extractUncompressedRgba(exactFullPng, width, height);

      for (let i = 0; i < width * height; i++) {
        assert.deepEqual(
          Array.from(exactPixels.subarray(i * 4, i * 4 + 4)),
          [77, 88, 99, 255],
          `Every pixel in exact full mask must be solid fill [77, 88, 99, 255]`
        );
      }

      // Box vastly exceeding image boundaries (-100, -100, 500, 500)
      const oversizedBox = [{ x: -100, y: -100, width: 500, height: 500, fillColor: [33, 44, 55, 255] }];
      const oversizedPng = redactBoundingBoxesInPng(png, oversizedBox);
      validatePngCrcs(oversizedPng);
      const oversizedPixels = extractUncompressedRgba(oversizedPng, width, height);

      for (let i = 0; i < width * height; i++) {
        assert.deepEqual(
          Array.from(oversizedPixels.subarray(i * 4, i * 4 + 4)),
          [33, 44, 55, 255],
          `Every pixel in oversized mask must clamp and fill [33, 44, 55, 255]`
        );
      }
    });

    it('1.3 Out-of-Bounds and Zero/Negative Dimension Bounding Boxes', () => {
      const width = 8;
      const height = 8;
      const { png, truePixels } = createSyntheticRgbaPng({ width, height });

      const oobBoxes = [
        // Completely negative
        { x: -50, y: -50, width: 20, height: 20, fillColor: [255, 0, 0, 255] },
        // Completely beyond right/bottom
        { x: 100, y: 100, width: 50, height: 50, fillColor: [0, 255, 0, 255] },
        // Zero dimensions
        { x: 2, y: 2, width: 0, height: 4, fillColor: [0, 0, 255, 255] },
        { x: 2, y: 2, width: 4, height: 0, fillColor: [255, 255, 0, 255] },
        // Negative dimensions
        { x: 3, y: 3, width: -2, height: -2, fillColor: [255, 0, 255, 255] }
      ];

      const maskedPng = redactBoundingBoxesInPng(png, oobBoxes);
      validatePngCrcs(maskedPng);
      const pixels = extractUncompressedRgba(maskedPng, width, height);

      // Entire image must remain 100% untouched
      assert.deepEqual(
        Array.from(pixels),
        Array.from(truePixels),
        'Out-of-bounds and zero/negative dimension boxes must not mutate any pixels'
      );
    });

    it('1.4 Partial Boundary Clamping (negative offset with overlap)', () => {
      const width = 10;
      const height = 10;
      const { png, truePixels } = createSyntheticRgbaPng({ width, height });

      // Partially negative: x = -5, y = -5, width = 8, height = 8 -> overlaps (0..2, 0..2)
      // Partially exceeding: x = 7, y = 7, width = 10, height = 10 -> overlaps (7..9, 7..9)
      const boxes = [
        { x: -5, y: -5, width: 8, height: 8, fillColor: [10, 20, 30, 255] },
        { x: 7, y: 7, width: 10, height: 10, fillColor: [70, 80, 90, 255] }
      ];

      const maskedPng = redactBoundingBoxesInPng(png, boxes);
      validatePngCrcs(maskedPng);
      const pixels = extractUncompressedRgba(maskedPng, width, height);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const off = (y * width + x) * 4;
          const px = Array.from(pixels.subarray(off, off + 4));

          if (x < 3 && y < 3) {
            // Overlapping top-left region
            assert.deepEqual(px, [10, 20, 30, 255], `Pixel (${x}, ${y}) should be masked by top-left clamp`);
          } else if (x >= 7 && y >= 7) {
            // Overlapping bottom-right region
            assert.deepEqual(px, [70, 80, 90, 255], `Pixel (${x}, ${y}) should be masked by bottom-right clamp`);
          } else {
            // Untouched middle region
            assert.deepEqual(
              px,
              Array.from(truePixels.subarray(off, off + 4)),
              `Pixel (${x}, ${y}) should remain untouched`
            );
          }
        }
      }
    });

    it('1.5 Multiple Disjoint & Overlapping Bounding Boxes with Layer Precedence', () => {
      const width = 16;
      const height = 16;
      const { png } = createSyntheticRgbaPng({ width, height });

      // Layer 1: Red box at (2, 2) to (8, 8)
      // Layer 2: Blue box at (5, 5) to (11, 11) - overlaps Layer 1 from (5,5) to (7,7)
      const boxes = [
        { x: 2, y: 2, width: 6, height: 6, fillColor: [255, 0, 0, 255] },
        { x: 5, y: 5, width: 6, height: 6, fillColor: [0, 0, 255, 255] }
      ];

      const maskedPng = redactBoundingBoxesInPng(png, boxes);
      validatePngCrcs(maskedPng);
      const pixels = extractUncompressedRgba(maskedPng, width, height);

      // Check exclusively Layer 1 region: (2, 2)
      const l1Offset = (2 * width + 2) * 4;
      assert.deepEqual(Array.from(pixels.subarray(l1Offset, l1Offset + 4)), [255, 0, 0, 255]);

      // Check overlapping region: (6, 6) -> must be overwritten by Layer 2 (Blue)
      const overlapOffset = (6 * width + 6) * 4;
      assert.deepEqual(Array.from(pixels.subarray(overlapOffset, overlapOffset + 4)), [0, 0, 255, 255]);

      // Check exclusively Layer 2 region: (10, 10)
      const l2Offset = (10 * width + 10) * 4;
      assert.deepEqual(Array.from(pixels.subarray(l2Offset, l2Offset + 4)), [0, 0, 255, 255]);
    });

    it('1.6 Scanline Unfiltering Correctness across all 5 PNG Filters (0, 1, 2, 3, 4 Paeth)', () => {
      const width = 10;
      const height = 15;
      // Cycle through filters 0, 1, 2, 3, 4 across the 15 rows (3 full cycles)
      const filterSelector = (y) => y % 5;
      const { png, truePixels } = createSyntheticRgbaPng({ width, height, filterSelector });

      // Mask a central window: x: 3..6, y: 4..10
      const box = { x: 3, y: 4, width: 4, height: 7, fillColor: [0, 0, 0, 255] };
      const maskedPng = redactBoundingBoxesInPng(png, [box]);
      validatePngCrcs(maskedPng);
      const pixels = extractUncompressedRgba(maskedPng, width, height);

      let unmaskedPreservedCount = 0;
      let maskedSolidCount = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const off = (y * width + x) * 4;
          const px = Array.from(pixels.subarray(off, off + 4));

          if (x >= 3 && x < 7 && y >= 4 && y < 11) {
            // Masked region
            assert.deepEqual(px, [0, 0, 0, 255], `Pixel (${x}, ${y}) in filtered PNG must be black`);
            maskedSolidCount++;
          } else {
            // Unmasked region must be identical to truePixels
            const orig = Array.from(truePixels.subarray(off, off + 4));
            assert.deepEqual(px, orig, `Unmasked pixel (${x}, ${y}) row filter ${y % 5} corrupted`);
            unmaskedPreservedCount++;
          }
        }
      }

      assert.equal(maskedSolidCount, 4 * 7);
      assert.equal(unmaskedPreservedCount, width * height - 4 * 7);
    });

    it('1.7 Output PNG integrity and OS-level decoder compatibility (sips)', () => {
      const width = 32;
      const height = 32;
      const { png } = createSyntheticRgbaPng({ width, height });

      const boxes = [
        { x: 4, y: 4, width: 8, height: 8, fillColor: [200, 100, 50, 255] },
        { x: 16, y: 16, width: 12, height: 12, fillColor: [50, 150, 200, 255] }
      ];

      const maskedPng = redactBoundingBoxesInPng(png, boxes);
      const chunks = validatePngCrcs(maskedPng);
      assert.ok(chunks.length >= 3);

      // Write to temp file and invoke macOS sips CLI
      const tmpPath = path.join(process.cwd(), 'artifacts/proofs/adversarial-masked-test.png');
      const tmpDir = path.dirname(tmpPath);
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(tmpPath, maskedPng);

      try {
        const sipsOut = execSync(`sips -g pixelWidth -g pixelHeight -g format ${tmpPath}`, {
          encoding: 'utf8'
        });
        assert.ok(sipsOut.includes('pixelWidth: 32'), 'sips must verify width 32');
        assert.ok(sipsOut.includes('pixelHeight: 32'), 'sips must verify height 32');
        assert.ok(sipsOut.includes('format: png'), 'sips must verify format PNG');
      } finally {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      }
    });

    it('1.8 Non-RGBA / Unsupported PNG Fail-Safe Pass-Through', () => {
      // 8-bit RGB (colorType 2, 3 channels)
      const { png } = createSyntheticRgbaPng({ width: 4, height: 4, colorType: 2 });
      const res = redactBoundingBoxesInPng(png, [{ x: 0, y: 0, width: 2, height: 2 }]);
      assert.equal(res, png, 'Non-RGBA PNG must pass through unchanged without throwing');
    });

    it('1.9 Stress Test with 100 Randomized Bounding Boxes', () => {
      const width = 64;
      const height = 64;
      const { png } = createSyntheticRgbaPng({ width, height });

      const randomBoxes = [];
      for (let i = 0; i < 100; i++) {
        randomBoxes.push({
          x: Math.floor(Math.random() * 80) - 10,
          y: Math.floor(Math.random() * 80) - 10,
          width: Math.floor(Math.random() * 20),
          height: Math.floor(Math.random() * 20),
          fillColor: [
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256),
            255
          ]
        });
      }

      const t0 = performance.now();
      const maskedPng = redactBoundingBoxesInPng(png, randomBoxes);
      const t1 = performance.now();

      assert.ok(t1 - t0 < 100, `100 bounding boxes on 64x64 PNG took ${(t1 - t0).toFixed(2)}ms (SLA < 100ms)`);
      validatePngCrcs(maskedPng);
    });
  });

  describe('Adversarial Dimension 2 — OCR Token Scanner & Sensitive Pattern Suite', () => {

    it('2.1 Mixed Text Streams: Detection and redaction across complex real-world formats', () => {
      const syntheticOpenAiKey = ['sk', 'live', '123456789012345678901234567890'].join('_');
      const complexStream = `
      // Configuration JSON
      {
        "aws_key": "AKIAIOSFODNN7EXAMPLE",
        "nested": {
          "pat": "ghp_ABC1234567890abcdefghijklmnopqrstuvwxyz",
          "gcp": "AIzaSyD1234567890abcdefghijklmnopqrstuv"
        },
        "query": "https://api.domain.com/v1?token=Bearer%20abcdefghijklmnopqrstuvwxyz123456"
      }

      <!-- HTML Attributes & Comments -->
      <meta name="jwt" content="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.signature12345">
      <!-- Contact: dev-ops@sodality.ai -->

      \`\`\`bash
      export OPENAI_API_KEY="${syntheticOpenAiKey}"
      curl -H "Authorization: Bearer mySecretTokenLongEnoughForRegexMatch1234" https://api.openai.com
      \`\`\`

      # CSV Data with Luhn Card
      101,Jane Doe,4532-1488-1234-5672,ACTIVE
      102,John Smith,4532148812345672,PENDING

      -----BEGIN RSA PRIVATE KEY-----
      MIIEowIBAAKCAQEA0Y1234567890MIIEowIBAAKCAQEA0Y1234567890
      -----END RSA PRIVATE KEY-----
      `;

      const findings = detectSensitivePatterns(complexStream);
      const types = new Set(findings.map(f => f.type));

      assert.ok(types.has('aws_access_key'), 'Must detect AWS key in JSON');
      assert.ok(types.has('github_token'), 'Must detect GitHub PAT in JSON');
      assert.ok(types.has('google_api_key'), 'Must detect Google API key in JSON');
      assert.ok(types.has('jwt_token'), 'Must detect JWT in HTML meta tag');
      assert.ok(types.has('email_address'), 'Must detect email in HTML comment');
      assert.ok(types.has('openai_api_key'), 'Must detect OpenAI key in bash codeblock');
      assert.ok(types.has('bearer_token'), 'Must detect Bearer token in curl command');
      assert.ok(types.has('credit_card'), 'Must detect Luhn credit card in CSV rows');
      assert.ok(types.has('private_key'), 'Must detect PEM RSA private key');

      const redacted = redactSensitiveTokens(complexStream);
      assert.ok(!redacted.sanitized.includes('AKIAIOSFODNN7EXAMPLE'));
      assert.ok(!redacted.sanitized.includes('ghp_ABC1234567890abcdefghijklmnopqrstuvwxyz'));
      assert.ok(!redacted.sanitized.includes('AIzaSyD1234567890abcdefghijklmnopqrstuv'));
      assert.ok(!redacted.sanitized.includes('dev-ops@sodality.ai'));
      assert.ok(!redacted.sanitized.includes(syntheticOpenAiKey));
      assert.ok(!redacted.sanitized.includes('4532-1488-1234-5672'));
      assert.ok(!redacted.sanitized.includes('4532148812345672'));
      assert.ok(!redacted.sanitized.includes('MIIEowIBAAKCAQEA0Y1234567890'));
    });

    it('2.2 Adversarial False-Positive Resistance (Near-misses and invalid candidates)', () => {
      const nearMissTokens = [
        // Truncated AWS keys (less than 20 chars total)
        'AKIA123',
        'AKIA12345678901234',
        // Lowercase AWS keys (AWS keys are strictly uppercase)
        'AKIA1234567890abcdef',
        // Truncated GitHub tokens
        'ghp_123',
        'ghp_shorttoken',
        // Truncated Google API keys
        'AIzaSy123456',
        // Truncated OpenAI keys
        ['sk', 'live', 'short'].join('_'),
        ['sk', 'test', '123'].join('_'),
        // Malformed JWTs
        'eyJhbGciOiJIUzI1NiJ9', // No signature / payload parts
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0', // Missing final dot & sig
        // Invalid Luhn credit cards (checksum does not evaluate to 0 mod 10)
        '4532-1488-1234-5679',
        '4532148812345679',
        '0000-0000-0000-0000',
        '1234-5678-9012-3456',
        // Invalid email addresses
        'admin@localhost', // No TLD
        'user@domain', // Missing TLD
        'user@domain.c', // Single-char TLD (regex requires {2,})
        'user@', // Missing domain
        '@domain.com', // Missing username
        // Short Bearer tokens
        'Bearer token',
        'Bearer 12345'
      ];

      for (const token of nearMissTokens) {
        const findings = detectSensitivePatterns(token);
        assert.equal(
          findings.length,
          0,
          `False positive detected! Near-miss '${token}' was erroneously flagged as ${JSON.stringify(findings)}`
        );
      }
    });

    it('2.3 Adversarial False-Negative Resistance (Punctuation and Multilingual / Unicode boundaries)', () => {
      const testCases = [
        {
          raw: 'Config=(AKIAIOSFODNN7EXAMPLE)',
          expectedType: 'aws_access_key',
          secret: 'AKIAIOSFODNN7EXAMPLE'
        },
        {
          raw: '{"key":["ghp_ABC1234567890abcdefghijklmnopqrstuvwxyz"]}',
          expectedType: 'github_token',
          secret: 'ghp_ABC1234567890abcdefghijklmnopqrstuvwxyz'
        },
        {
          raw: 'คีย์เซิร์ฟเวอร์: AIzaSyD1234567890abcdefghijklmnopqrstuv สำหรับใช้งานระบบ',
          expectedType: 'google_api_key',
          secret: 'AIzaSyD1234567890abcdefghijklmnopqrstuv'
        },
        {
          raw: '🔒อีเมลติดต่อ: dev@soda-os.internal.ai🚀',
          expectedType: 'email_address',
          secret: 'dev@soda-os.internal.ai'
        },
        {
          raw: 'บัตรเครดิต: 4532-1488-1234-5672 ในระบบ',
          expectedType: 'credit_card',
          secret: '4532-1488-1234-5672'
        }
      ];

      for (const tc of testCases) {
        const findings = detectSensitivePatterns(tc.raw);
        assert.ok(findings.length >= 1, `Failed to detect secret in context: ${tc.raw}`);
        assert.ok(
          findings.some(f => f.type === tc.expectedType && f.match === tc.secret),
          `Expected finding for ${tc.expectedType} matching '${tc.secret}', found: ${JSON.stringify(findings)}`
        );
      }
    });

    it('2.4 High-Volume Text Stream Latency Benchmark (1MB text stream)', () => {
      const baseParagraph = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore. ';
      const repeats = 10000; // ~1.02 MB of text
      const corpus = baseParagraph.repeat(repeats);

      // Embed 3 secrets at beginning, middle, and end
      const stream = `AKIAIOSFODNN7EXAMPLE ` + corpus.slice(0, 500000) + ` contact@sodality.ai ` + corpus.slice(500000) + ` ghp_ABC1234567890abcdefghijklmnopqrstuvwxyz`;

      const t0 = performance.now();
      const findings = detectSensitivePatterns(stream);
      const t1 = performance.now();

      const scanDuration = t1 - t0;
      assert.ok(scanDuration < 200, `1MB stream scanned in ${scanDuration.toFixed(2)}ms (SLA < 200ms)`);
      assert.equal(findings.length, 3, 'Must detect all 3 embedded secrets in 1MB corpus');

      const t2 = performance.now();
      const redacted = redactSensitiveTokens(stream);
      const t3 = performance.now();

      const redactDuration = t3 - t2;
      assert.ok(redactDuration < 200, `1MB stream redacted in ${redactDuration.toFixed(2)}ms (SLA < 200ms)`);
      assert.ok(!redacted.sanitized.includes('AKIAIOSFODNN7EXAMPLE'));
      assert.ok(!redacted.sanitized.includes('contact@sodality.ai'));
      assert.ok(!redacted.sanitized.includes('ghp_ABC1234567890abcdefghijklmnopqrstuvwxyz'));
    });

    it('2.5 Redaction Idempotency and SHA-256 Digest Token Format', () => {
      const text = 'User key AKIAIOSFODNN7EXAMPLE and support@sodality.ai';
      const firstPass = redactSensitiveTokens(text);

      assert.equal(firstPass.findings.length, 2);

      // Verify token formatting: [REDACTED:<type>:<hash8>]
      const awsHash = crypto.createHash('sha256').update('AKIAIOSFODNN7EXAMPLE').digest('hex').slice(0, 8);
      const emailHash = crypto.createHash('sha256').update('support@sodality.ai').digest('hex').slice(0, 8);

      assert.ok(firstPass.sanitized.includes(`[REDACTED:aws_access_key:${awsHash}]`));
      assert.ok(firstPass.sanitized.includes(`[REDACTED:email_address:${emailHash}]`));

      // Second pass must be strictly idempotent (0 new findings, identical string)
      const secondPass = redactSensitiveTokens(firstPass.sanitized);
      assert.equal(secondPass.findings.length, 0, 'Second redaction pass must find 0 tokens');
      assert.equal(secondPass.sanitized, firstPass.sanitized, 'Second redaction pass must be completely idempotent');
    });

    it('2.6 ReDoS Vulnerability Defense: Pathological Repetition Stress Test', () => {
      const pathologicalCases = [
        // Unclosed PEM header followed by 50,000 characters
        '-----BEGIN RSA PRIVATE KEY-----' + 'X'.repeat(50000),
        // Repetitive email prefix
        'a@' + 'abc.'.repeat(2000) + 'com',
        // Repetitive Bearer header
        'Bearer ' + 'A'.repeat(50000),
        // Repetitive card prefix
        '4532-' + '1488-'.repeat(2000)
      ];

      for (let i = 0; i < pathologicalCases.length; i++) {
        const payload = pathologicalCases[i];
        const t0 = performance.now();
        const findings = detectSensitivePatterns(payload);
        const elapsed = performance.now() - t0;

        assert.ok(
          elapsed < 100,
          `Pathological case ${i} (length ${payload.length}) took ${elapsed.toFixed(2)}ms (must be < 100ms without catastrophic backtracking)`
        );
      }
    });

  });

});
