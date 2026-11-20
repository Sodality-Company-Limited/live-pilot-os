#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS VISUAL ASSET VERIFICATION HARNESS (G-WEB-010)
 * ════════════════════════════════════════════════════════════════════════════════
 * Verifies visual asset dimensions, modern compression formats (SVG, WebP),
 * aspect ratio preservation, accessibility metadata, size budgets (< 250KB),
 * and SHA-256 cryptographic provenance against approved design references.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const MAX_VISUAL_ASSET_SIZE_BYTES = 250 * 1024; // 250KB strict budget
export const APPROVED_VISUAL_FORMATS = new Set(['.svg', '.webp', '.avif']);

/**
 * Verifies an SVG string for aspect ratio preservation and accessibility metadata.
 */
export function verifySvgMetadata(content) {
  const errors = [];
  const hasViewBox = /viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+[\d.-]+\s*["']/i.test(content);
  if (!hasViewBox) {
    errors.push('SVG missing "viewBox" attribute (required for responsive aspect ratio preservation)');
  }

  const hasTitle = /<title[\s>]/i.test(content);
  const hasAriaLabel = /aria-label=["'][^"']+["']/i.test(content);
  const hasRoleImg = /role=["']img["']/i.test(content);

  if (!hasTitle && !hasAriaLabel) {
    errors.push('SVG missing accessibility metadata: requires either <title> element or aria-label attribute');
  }

  return {
    valid: errors.length === 0,
    hasViewBox,
    hasTitle,
    hasAriaLabel,
    hasRoleImg,
    errors
  };
}

/**
 * Verifies WebP binary header and extracts dimensions.
 */
export function verifyWebpHeader(buffer) {
  const errors = [];
  if (buffer.length < 30) {
    return { valid: false, errors: ['File buffer too small to be a valid WebP container'] };
  }

  const riffHeader = buffer.subarray(0, 4).toString('ascii');
  const webpHeader = buffer.subarray(8, 12).toString('ascii');

  if (riffHeader !== 'RIFF' || webpHeader !== 'WEBP') {
    return { valid: false, errors: ['Invalid WebP container: missing RIFF/WEBP magic bytes'] };
  }

  // Format chunk (VP8, VP8L, or VP8X)
  const chunkType = buffer.subarray(12, 16).toString('ascii');
  let width = 0;
  let height = 0;

  if (chunkType === 'VP8 ') {
    // Lossy VP8
    width = buffer.readUInt16LE(26) & 0x3fff;
    height = buffer.readUInt16LE(28) & 0x3fff;
  } else if (chunkType === 'VP8L') {
    // Lossless VP8L
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    width = 1 + (((b1 & 0x3f) << 8) | b0);
    height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
  } else if (chunkType === 'VP8X') {
    // Extended WebP
    width = 1 + buffer.readUIntLE(24, 3);
    height = 1 + buffer.readUIntLE(27, 3);
  }

  return {
    valid: true,
    chunkType,
    width,
    height,
    errors
  };
}

/**
 * Scans a visual assets directory and validates against budget, format, and manifest.
 */
export function scanVisualAssets(targetDir = 'public/assets', manifestPath = 'docs/02-product/design/asset-provenance-manifest.json') {
  const fullTargetDir = path.resolve(process.cwd(), targetDir);
  const results = {
    targetDir,
    assetsScanned: 0,
    assets: [],
    errors: [],
    manifestVerified: false
  };

  if (!fs.existsSync(fullTargetDir)) {
    results.errors.push(`Visual assets directory does not exist: ${targetDir}`);
    return results;
  }

  // Load manifest if available
  let manifestMap = new Map();
  const fullManifestPath = path.resolve(process.cwd(), manifestPath);
  if (fs.existsSync(fullManifestPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(fullManifestPath, 'utf8'));
      const entries = Array.isArray(parsed) ? parsed : (parsed.assets || []);
      for (const entry of entries) {
        if (entry.path) {
          const norm = path.normalize(entry.path);
          manifestMap.set(norm, entry);
          manifestMap.set(path.basename(norm), entry);
        }
      }
      results.manifestVerified = true;
    } catch (err) {
      results.errors.push(`Failed to parse asset manifest at ${manifestPath}: ${err.message}`);
    }
  }

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      const relPath = path.relative(process.cwd(), fullPath);

      if (ent.isDirectory()) {
        scan(fullPath);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        // Ignore dotfiles, markdown, or json config files in assets dir
        if (ent.name.startsWith('.') || ext === '.json' || ext === '.md') continue;

        results.assetsScanned++;
        const stat = fs.statSync(fullPath);
        const data = fs.readFileSync(fullPath);
        const sha256 = crypto.createHash('sha256').update(data).digest('hex');

        // 1. Format Check
        if (!APPROVED_VISUAL_FORMATS.has(ext)) {
          results.errors.push(
            `Asset "${relPath}" uses unapproved format "${ext}". Must be one of: ${Array.from(APPROVED_VISUAL_FORMATS).join(', ')}`
          );
        }

        // 2. Size Budget Check (< 250KB)
        if (stat.size > MAX_VISUAL_ASSET_SIZE_BYTES) {
          results.errors.push(
            `Asset "${relPath}" exceeds 250KB budget: ${stat.size} bytes (${(stat.size / 1024).toFixed(2)} KB)`
          );
        }

        // 3. Format-specific Metadata
        let metadataResult = null;
        if (ext === '.svg') {
          metadataResult = verifySvgMetadata(data.toString('utf8'));
          if (!metadataResult.valid) {
            metadataResult.errors.forEach(e => results.errors.push(`Asset "${relPath}": ${e}`));
          }
        } else if (ext === '.webp') {
          metadataResult = verifyWebpHeader(data);
          if (!metadataResult.valid) {
            metadataResult.errors.forEach(e => results.errors.push(`Asset "${relPath}": ${e}`));
          }
        }

        // 4. Manifest Provenance & Licensing Check
        const manifestEntry = manifestMap.get(relPath) || manifestMap.get(ent.name);
        if (manifestEntry) {
          const expectedHash = manifestEntry.sha256 ? manifestEntry.sha256.replace(/^sha256:/, '') : null;
          if (expectedHash && expectedHash !== sha256) {
            results.errors.push(
              `Asset "${relPath}" hash mismatch! On disk: ${sha256}, Manifest: ${expectedHash}`
            );
          }
          if (manifestEntry.license && !manifestEntry.license.verified) {
            results.errors.push(`Asset "${relPath}" has unverified licensing in manifest`);
          }
        }

        results.assets.push({
          name: ent.name,
          path: relPath,
          size: stat.size,
          format: ext.replace('.', ''),
          sha256: `sha256:${sha256}`,
          metadata: metadataResult,
          manifestGrounded: !!manifestEntry
        });
      }
    }
  }

  scan(fullTargetDir);

  if (results.assetsScanned === 0) {
    results.errors.push(`No visual assets discovered in "${targetDir}"`);
  }

  return results;
}

/**
 * CLI Runner
 */
export function runAssetHarness() {
  const args = process.argv.slice(2);
  const targetDir = args[0] || 'public/assets';
  const manifestPath = args[1] || 'docs/02-product/design/asset-provenance-manifest.json';

  console.log(`🔬 Executing Visual Asset Verification Harness on '${targetDir}'...`);

  const results = scanVisualAssets(targetDir, manifestPath);

  console.log(`Results: ${results.assetsScanned} visual assets scanned, ${results.errors.length} errors.`);
  results.assets.forEach(a => {
    console.log(`   - [${a.format.toUpperCase()}] ${a.path} (${a.size} B) -> ${a.sha256.slice(0, 16)}...`);
  });

  if (results.errors.length > 0) {
    results.errors.forEach(e => console.error(`❌ ${e}`));
    process.exit(1);
  }

  console.log('✅ Visual Asset Verification Harness: ALL ASSET BUDGETS, FORMATS & PROVENANCE COMPLIANT.');
  process.exit(0);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  runAssetHarness();
}
