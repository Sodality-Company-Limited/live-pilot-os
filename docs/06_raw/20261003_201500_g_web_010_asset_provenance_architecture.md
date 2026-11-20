# Deep Architectural Specification: G-WEB-010 Asset and Reference Provenance Engine

**Goal ID:** `G-WEB-010`  
**Timestamp:** `2026-10-03T20:15:00+07:00`  
**Epic:** `WEB` (DAVE Exact Web Application Pipeline)  
**Kind:** `qa`  
**Topic:** Asset Provenance, Modern Compression Formats, Acoustic Normalization & Cryptographic Proof Assurance  
**Author:** `Antigravity (AI System Architect & Lead Engineer)`  
**Invariants Enforced:** Article I (Zero Mocks/Stubs), Article II (Empirical Testing Pass), Article III (WHERE, WHY, FOR WHOM, HOW).

---

## 1. Architectural Overview & System Topology

The Soda OS Asset and Reference Provenance Engine establishes end-to-end verification and cryptographic provenance across all static media assets in web applications. The engine operates across three synchronized tiers:
1. **Asset Storage Tier (`public/assets/`, `public/audio/`, `data/references/`):** Contains production-grade visual assets (SVG, WebP) and 16-bit PCM WAV earcons.
2. **Verification & Analysis Tier (`scripts/harness/asset-harness.mjs`, `scripts/harness/audio-harness.mjs`):** Modular harnesses executing static inspection of container headers, dimension verification, acoustic metrics calculation, and size budget compliance.
3. **Cryptographic Manifest & Ledger Tier (`docs/02-product/design/asset-provenance-manifest.json`, `artifacts/proofs/asset_provenance_receipt.json`):** Machine-readable JSON provenance manifest and cryptographic verification receipts anchored to exact git commit HEAD.

```
+----------------------------------------------------------------------------------------------------+
|                                      ASSET STORAGE TIER                                            |
|  - public/assets/soda-logo.svg (452B)               - public/assets/decision-canvas-preview.webp  |
|  - public/assets/verified-badge.svg (449B)          - public/audio/chime-complete.wav (250ms)    |
|  - public/assets/status-indicator.svg (396B)        - public/audio/toggle-click.wav (80ms)        |
+----------------------------------------------------------------------------------------------------+
                                      |                              |
                                      v                              v
+---------------------------------------------------+ +-----------------------------------------------+
|         scripts/harness/asset-harness.mjs         | |       scripts/harness/audio-harness.mjs       |
|  - verifySvgMetadata(content)                     | |  - parseWavHeader(buffer)                     |
|  - verifyWebpHeader(buffer)                       | |  - computeAcousticMetrics(buffer, header)     |
|  - scanVisualAssets(targetDir, manifestPath)      | |  - scanAudioAssets(targetDir, manifestPath)   |
|  - Size < 250KB, viewBox check, title/aria check  | |  - Duration <= 500ms, Loudness -16 to -18 LUFS|
+---------------------------------------------------+ +-----------------------------------------------+
                                      |                              |
                                      +--------------+---------------+
                                                     |
                                                     v
+----------------------------------------------------------------------------------------------------+
|                           CRYPTOGRAPHIC MANIFEST & PROVENANCE LEDGER                               |
|  - docs/02-product/design/asset-provenance-manifest.json (7 assets, 100% SHA-256 bound)            |
|  - artifacts/proofs/asset_provenance_receipt.json (Invariant 010-INV-001 certified PASS)          |
|  - docs/07-backlog/evidence/G-WEB-010-proof-receipt.json (Backed by exact git revision)           |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Visual Asset Architecture & Constraints

### 1. Permitted Modern Formats
Only formats capable of high compression efficiency and responsive scaling are permitted:
- **Scalable Vector Graphics (`.svg`):** Used for logos, icons, badges, and interface glyphs.
- **WebP Image Format (`.webp`):** Used for raster mockups, illustrations, and photographic previews.
- **AVIF Image Format (`.avif`):** Permitted for ultra-high-density photographic assets.
- Legacy uncompressed formats (`.bmp`, `.tiff`, `.gif`) and raw uncompressed PNGs/JPEGs $> 250\text{KB}$ are strictly prohibited.

### 2. Size Budget Ceiling
Every visual asset is constrained by:
$$\text{FileSizeBytes} \le 256,000 \text{ bytes (250 KB)}$$

### 3. Aspect Ratio & Accessibility Invariants
- **SVG Requirement:** Every `.svg` must declare a valid `viewBox` attribute (`viewBox="minX minY width height"`) to prevent aspect ratio distortion across responsive viewports.
- **Accessibility Requirement:** Every `.svg` must declare an inner `<title>` element or an `aria-label` attribute, ensuring assistive technology can announce its function.

---

## 3. Audio Earcon Architecture & Acoustic Contracts

### 1. Duration Ceiling
UI earcons provide subtle micro-feedback for state changes (e.g. stage gate approval, toggle activation):
$$\text{DurationMs} \le 500\text{ ms}$$

### 2. Waveform Statistics & Acoustic Normalization
Audio files are decoded as 16-bit signed PCM samples at 44.1kHz:
- **Peak Amplitude ($A_{\text{peak}}$):**
  $$A_{\text{peak}} = \max_{1 \le i \le N} \frac{|s_i|}{32768} < 0.99$$
  Strictly guarantees zero digital clipping and prevents DAC rail saturation.
- **RMS Loudness ($L_{\text{RMS}}$):**
  $$L_{\text{RMS}} = \sqrt{\frac{1}{N}\sum_{i=1}^N \left(\frac{s_i}{32768}\right)^2}$$
  $$\text{dBFS} = 20 \log_{10}(L_{\text{RMS}})$$
  Enforced nominal target range: $[-24.0, -14.0]\text{ dBFS}$ (approximating $-16\text{ to } -18\text{ LUFS}$).

### 3. Accessible Mute Controls
In compliance with accessibility standards, sound must never be unsuppressible. `public/audio/audio-controls.json` declares:
- `mute_suppression_enabled: true`
- `default_mute: false`
- `accessibility_alternative: "visual_toast_or_status_indicator"`

---

## 4. Cryptographic Provenance Manifest Specification

The manifest at `docs/02-product/design/asset-provenance-manifest.json` provides an immutable inventory of every asset:
- `asset_id`: Canonical identifier (`AST-VIS-xxx`, `AST-AUD-xxx`, `AST-REF-xxx`).
- `path`: Normalized path relative to repository root.
- `sha256`: `sha256:<hex-digest>` calculated over raw disk bytes.
- `license`: Declares authority, license type, commercial use permission, and verification status (`verified: true`).
- `provenance`: Declares origin team/guild, source reference, and verification date.
