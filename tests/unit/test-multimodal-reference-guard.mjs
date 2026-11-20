import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import {
  sanitizeImage,
  stripMetadataFromBuffer,
  hasExifOrMetadata,
  detectSensitivePatterns,
  redactSensitiveTokens,
  redactBoundingBoxesInPng,
  validateSandboxedPath,
  computeContentHash,
  generateSecurityAuditReceipt,
  SecurityBoundaryViolationError,
  isValidLuhn
} from '../../scripts/lib/multimodal-reference-guard.mjs';

/**
 * Helper: generates a minimal valid PNG buffer with optional custom chunks.
 */
function createMinimalPng(options = {}) {
  const { width = 2, height = 2, extraChunks = [] } = options;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: 13 bytes
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const makeChunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcPayload = Buffer.concat([typeBuf, data]);
    const crcVal = computePngCrc(crcPayload);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };

  // IDAT: uncompressed scanlines: each row = 1 filter byte (0) + width * 4 bytes RGBA
  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawScanlines[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      rawScanlines[pxOffset] = 255; // R
      rawScanlines[pxOffset + 1] = 0; // G
      rawScanlines[pxOffset + 2] = 0; // B
      rawScanlines[pxOffset + 3] = 255; // A
    }
  }
  const compressedIdat = zlib.deflateSync(rawScanlines);

  const chunks = [
    makeChunk('IHDR', ihdrData),
    ...extraChunks.map(c => makeChunk(c.type, c.data)),
    makeChunk('IDAT', compressedIdat),
    makeChunk('IEND', Buffer.alloc(0))
  ];

  return Buffer.concat([signature, ...chunks]);
}

/**
 * Helper: generates a minimal valid JPEG buffer with optional segments.
 */
function createMinimalJpeg(options = {}) {
  const { extraSegments = [] } = options;
  // SOI: FF D8
  const soi = Buffer.from([0xff, 0xd8]);
  // APP0 (JFIF): FF E0, length 16, 'JFIF\0', version 1.1, units 0, density 1, 1, thumb 0, 0
  const app0 = Buffer.from([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00
  ]);
  // DQT: FF DB
  const dqt = Buffer.concat([
    Buffer.from([0xff, 0xdb, 0x00, 0x43, 0x00]),
    Buffer.alloc(64, 16)
  ]);
  // SOF0: FF C0, length 11, precision 8, height 2, width 2, 1 component
  const sof0 = Buffer.from([
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x02, 0x00, 0x02, 0x01, 0x01, 0x11, 0x00
  ]);
  // DHT: FF C4
  const dht = Buffer.concat([
    Buffer.from([0xff, 0xc4, 0x00, 0x1f, 0x00]),
    Buffer.alloc(16, 0),
    Buffer.alloc(12, 1)
  ]);
  // SOS: FF DA
  const sos = Buffer.from([
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00
  ]);
  // Compressed scan data
  const scanData = Buffer.from([0x7f, 0xff, 0x00, 0x00]);
  // EOI: FF D9
  const eoi = Buffer.from([0xff, 0xd9]);

  const segBuffers = [];
  for (const seg of extraSegments) {
    const markerBuf = Buffer.from([0xff, seg.marker]);
    const lenBuf = Buffer.alloc(2);
    lenBuf.writeUInt16BE(seg.data.length + 2, 0);
    segBuffers.push(Buffer.concat([markerBuf, lenBuf, seg.data]));
  }

  return Buffer.concat([
    soi,
    app0,
    ...segBuffers,
    dqt,
    sof0,
    dht,
    sos,
    scanData,
    eoi
  ]);
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}
function computePngCrc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

describe('G-SEC-001: Multimodal Reference Guard & Privacy Controls Suite', () => {

  describe('Step 1 — Metadata Sanitizer and EXIF/Geolocation Stripping Engine', () => {
    it('1.1 should detect and strip EXIF, XMP, IPTC, and Comment markers from JPEG images', () => {
      // Create JPEG with APP1 (EXIF with GPS), APP13 (IPTC), COM (Comment)
      const exifPayload = Buffer.from('Exif\x00\x00II*\x00\x08\x00\x00\x00GPSInfo\x00SensitiveLocationLatitude40Longitude73');
      const iptcPayload = Buffer.from('Photoshop 3.0\x008BIM\x04\x04AuthorInternal');
      const commentPayload = Buffer.from('Confidential Internal Production Screenshot');

      const rawJpeg = createMinimalJpeg({
        extraSegments: [
          { marker: 0xe1, data: exifPayload }, // APP1 (EXIF / GPS)
          { marker: 0xed, data: iptcPayload }, // APP13 (Photoshop IPTC)
          { marker: 0xfe, data: commentPayload } // COM
        ]
      });

      assert.equal(hasExifOrMetadata(rawJpeg, 'jpeg'), true, 'Raw JPEG must be flagged as containing metadata');

      const result = sanitizeImage(rawJpeg, { filename: 'test.jpg' });
      assert.equal(result.format, 'jpeg');
      assert.ok(result.strippedTags.length >= 3, `Expected at least 3 stripped segments, got ${result.strippedTags.length}`);
      assert.equal(hasExifOrMetadata(result.sanitizedBuffer, 'jpeg'), false, 'Sanitized JPEG must have zero metadata segments');

      // Verify JPEG structure remains valid: starts with SOI, ends with EOI
      assert.equal(result.sanitizedBuffer[0], 0xff);
      assert.equal(result.sanitizedBuffer[1], 0xd8);
      assert.equal(result.sanitizedBuffer[result.sanitizedBuffer.length - 2], 0xff);
      assert.equal(result.sanitizedBuffer[result.sanitizedBuffer.length - 1], 0xd9);

      // Verify no EXIF or GPS strings exist in sanitized binary
      const sanitizedStr = result.sanitizedBuffer.toString('binary');
      assert.ok(!sanitizedStr.includes('GPSInfo'), 'GPSInfo must be completely removed');
      assert.ok(!sanitizedStr.includes('Photoshop'), 'Photoshop metadata must be completely removed');
      assert.ok(!sanitizedStr.includes('Confidential Internal'), 'Comments must be completely removed');
    });

    it('1.2 should detect and strip eXIf, tEXt, zTXt, iTXt, and tIME chunks from PNG images', () => {
      const textChunkData = Buffer.from('Software\x00Confidential Internal Build Tool 2.0');
      const itxtChunkData = Buffer.from('XML:com.adobe.xmp\x00\x00\x00\x00\x00<x:xmpmeta>SensitiveEXIFData GPSLatitude="37.7749"</x:xmpmeta>');
      const exifChunkData = Buffer.from('II*\x00\x08\x00\x00\x00CameraModeliPhone15Pro');
      const timeChunkData = Buffer.from([0x07, 0xea, 0x0a, 0x03, 0x0b, 0x1e, 0x00]); // 2026-10-03 11:30:00

      const rawPng = createMinimalPng({
        extraChunks: [
          { type: 'tEXt', data: textChunkData },
          { type: 'iTXt', data: itxtChunkData },
          { type: 'eXIf', data: exifChunkData },
          { type: 'tIME', data: timeChunkData }
        ]
      });

      assert.equal(hasExifOrMetadata(rawPng, 'png'), true, 'Raw PNG must be flagged as containing metadata');

      const result = sanitizeImage(rawPng, { filename: 'test.png' });
      assert.equal(result.format, 'png');
      assert.equal(result.strippedTags.length, 4, 'Must strip exactly 4 ancillary metadata chunks');
      assert.equal(hasExifOrMetadata(result.sanitizedBuffer, 'png'), false, 'Sanitized PNG must have zero metadata chunks');

      // Verify PNG signature intact
      assert.deepEqual(
        result.sanitizedBuffer.subarray(0, 8),
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );

      // Verify sensitive metadata strings completely absent from binary buffer
      const binStr = result.sanitizedBuffer.toString('binary');
      assert.ok(!binStr.includes('Confidential Internal Build Tool'));
      assert.ok(!binStr.includes('GPSLatitude'));
      assert.ok(!binStr.includes('iPhone15Pro'));
    });

    it('1.3 should reject malformed or truncated binary image payloads fail-closed', () => {
      const truncatedJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x20]);
      assert.throws(() => {
        sanitizeImage(truncatedJpeg, { filename: 'exploit.jpg' });
      }, /malformed|corrupted|truncated/i);

      const invalidPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00]);
      assert.throws(() => {
        sanitizeImage(invalidPng, { filename: 'exploit.png' });
      }, /invalid png signature|corrupted/i);
    });
  });

  describe('Step 2 — Visual PII Redactor and OCR Sensitive Token Masker', () => {
    it('2.1 should detect API keys, JWTs, credit cards, emails, and private keys in reference text streams', () => {
      const sampleText = `
        AWS_KEY=AKIAIOSFODNN7EXAMPLE
        GITHUB_PAT=ghp_ABC1234567890abcdefghijklmnopqrstuvwxyz
        GOOGLE_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuv
        OPENAI_KEY=[REDACTED_TEST_KEY]
        BEARER=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.signature12345
        CARD=4532-1488-1234-5672
        CONTACT=lead.engineer@sodality.ai
        RSA=-----BEGIN RSA PRIVATE KEY-----
        MIIEowIBAAKCAQEA0Y1234567890
        -----END RSA PRIVATE KEY-----
      `;

      const findings = detectSensitivePatterns(sampleText);
      assert.ok(findings.length >= 7, `Expected at least 7 sensitive patterns, detected: ${findings.length}`);

      const types = findings.map(f => f.type);
      assert.ok(types.includes('aws_access_key'));
      assert.ok(types.includes('github_token'));
      assert.ok(types.includes('google_api_key'));
      assert.ok(types.includes('jwt_token'));
      assert.ok(types.includes('credit_card'));
      assert.ok(types.includes('email_address'));
      assert.ok(types.includes('private_key'));
    });

    it('2.2 should validate credit card numbers via Luhn checksum to prevent false positive masking', () => {
      // Valid Luhn cards
      assert.equal(isValidLuhn('4532148812345672'), true);
      assert.equal(isValidLuhn('4532-1488-1234-5672'), true);

      // Invalid Luhn cards (random digits)
      assert.equal(isValidLuhn('4532148812345679'), false);
      assert.equal(isValidLuhn('0000000000000000'), false);
    });

    it('2.3 should redact detected sensitive strings with structured replacement tokens', () => {
      const rawText = 'System connected with key AKIAIOSFODNN7EXAMPLE and email admin@sodality.ai';
      const redacted = redactSensitiveTokens(rawText);

      assert.ok(!redacted.sanitized.includes('AKIAIOSFODNN7EXAMPLE'));
      assert.ok(!redacted.sanitized.includes('admin@sodality.ai'));
      assert.ok(redacted.sanitized.includes('[REDACTED:aws_access_key:'));
      assert.ok(redacted.sanitized.includes('[REDACTED:email_address:'));
      assert.equal(redacted.findings.length, 2);
    });

    it('2.4 should redact sensitive bounding boxes in PNG raster pixels with solid fill', () => {
      // 4x4 image, pixel at (1, 1) is red (255, 0, 0, 255)
      const png = createMinimalPng({ width: 4, height: 4 });
      const boundingBox = { x: 1, y: 1, width: 2, height: 2, fillColor: [0, 0, 0, 255] };

      const redactedPng = redactBoundingBoxesInPng(png, [boundingBox]);
      assert.ok(Buffer.isBuffer(redactedPng));

      // Decompress and verify pixels inside (1,1)-(2,2) are black (0, 0, 0, 255)
      // Extract IDAT from redacted PNG
      let idatData = [];
      let pos = 8;
      while (pos < redactedPng.length) {
        const len = redactedPng.readUInt32BE(pos);
        const type = redactedPng.subarray(pos + 4, pos + 8).toString('ascii');
        if (type === 'IDAT') {
          idatData.push(redactedPng.subarray(pos + 8, pos + 8 + len));
        }
        pos += 12 + len;
      }
      const rawScanlines = zlib.inflateSync(Buffer.concat(idatData));
      // In row y=1, pixel x=1 is at 1*(1 + 4*4) + 1 + 1*4 = 17 + 1 + 4 = 22
      const row1Offset = 1 * (1 + 4 * 4) + 1;
      const p1x = row1Offset + 1 * 4;
      assert.equal(rawScanlines[p1x], 0, 'R channel in redacted box must be 0 (solid fill)');
      assert.equal(rawScanlines[p1x + 1], 0, 'G channel in redacted box must be 0 (solid fill)');
      assert.equal(rawScanlines[p1x + 2], 0, 'B channel in redacted box must be 0 (solid fill)');
    });
  });

  describe('Step 3 — Sandboxed Reference Access Boundary and Hash Validator', () => {
    it('3.1 should reject path traversal attempts outside docs/02-product/design/reference/', () => {
      const invalidPaths = [
        '../../etc/passwd',
        '../../../package.json',
        'docs/02-product/design/reference/../../cli.js',
        'docs/02-product/design/reference/..%2f..%2fetc%2fpasswd',
        'docs/02-product/design/reference/test.png\0.exe',
        '/etc/shadow',
        'C:\\Windows\\System32\\cmd.exe',
        '../../data/references/exploit.png'
      ];

      for (const p of invalidPaths) {
        assert.throws(() => {
          validateSandboxedPath(p, { allowedRoot: 'docs/02-product/design/reference' });
        }, SecurityBoundaryViolationError, `Expected path traversal rejection for: ${p}`);
      }
    });

    it('3.2 should accept valid normalized paths strictly within docs/02-product/design/reference/', () => {
      const validPath = 'docs/02-product/design/reference/workspace.png';
      const resolved = validateSandboxedPath(validPath, { allowedRoot: 'docs/02-product/design/reference' });
      assert.ok(resolved.endsWith('docs/02-product/design/reference/workspace.png'));
    });

    it('3.3 should compute deterministic SHA-256 digests and detect file modifications', () => {
      const buffer = Buffer.from('Soda OS Deterministic Reference Verification');
      const hash1 = computeContentHash(buffer);
      const hash2 = computeContentHash(buffer);
      assert.equal(hash1, hash2);
      assert.ok(hash1.startsWith('sha256:'));
      assert.equal(hash1.length, 7 + 64);

      const modifiedBuffer = Buffer.from('Soda OS Deterministic Reference Verification MODIFIED');
      const hashModified = computeContentHash(modifiedBuffer);
      assert.notEqual(hash1, hashModified);
    });

    it('3.4 should execute scan-secrets CLI and generate valid audit receipt', () => {
      const scriptPath = path.join(process.cwd(), 'scripts/lib/multimodal-reference-guard.mjs');
      const res = spawnSync(process.execPath, [scriptPath, 'scan-secrets'], {
        cwd: process.cwd(),
        encoding: 'utf8'
      });

      assert.equal(res.status, 0, `scan-secrets CLI exited with status ${res.status}: ${res.stderr || res.stdout}`);
      assert.ok(res.stdout.includes('G-SEC-001'), 'CLI output must mention G-SEC-001');

      const receiptPath = path.join(process.cwd(), 'artifacts/proofs/G-SEC-001-audit-receipt.json');
      assert.ok(fs.existsSync(receiptPath), `Audit receipt must exist at ${receiptPath}`);

      const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
      assert.equal(receipt.goal_id, 'G-SEC-001');
      assert.equal(receipt.certification, 'PASS');
      assert.ok(receipt.sha256_verified_references.length >= 1);
      assert.equal(receipt.unmasked_secrets_count, 0);
    });
  });

});
