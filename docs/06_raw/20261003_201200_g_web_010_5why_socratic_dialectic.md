# Socratic Dialectic & 5-Why Root Cause Analysis: G-WEB-010 Asset and Reference Provenance

**Goal ID:** `G-WEB-010`  
**Timestamp:** `2026-10-03T20:12:00+07:00`  
**Epic:** `WEB` (DAVE Exact Web Application Pipeline)  
**Kind:** `qa`  
**Topic:** Asset Provenance, Compression Budgets, Earcon Acoustic Contracts & Licensing Invariants  
**Author:** `Antigravity (AI System Architect & Lead Engineer)`  
**Invariants Enforced:** Article I (Zero Mocks/Stubs), Article II (Empirical Testing Pass), Article III (WHERE, WHY, FOR WHOM, HOW).

---

## 1. Executive Summary

This document presents the 5-Why root cause inquiry and Socratic dialectic investigation that produced the architectural requirements and verification invariants for Goal `G-WEB-010`. Unmanaged media assets represent a major point of friction in autonomous software development: bloated images increase bundle sizes and destroy Core Web Vitals (LCP), uncurated audio clips startle users and violate accessibility standards, and unverified assets introduce severe legal exposure. We systematically establish the mathematical, physical, and legal basis for Soda OS's asset provenance system.

---

## 2. The 5-Why Root Cause Inquiry

### The Problem Statement
*Web applications frequently accumulate bloated images, jarring sound clips, and ungrounded media assets with ambiguous licensing, resulting in slow load times, poor user experience, and legal exposure.*

---

### Why 1: Why do web applications suffer from slow initial load times and jarring sound effects?
- **Root Observation:** Frontend bundles include uncompressed raster bitmaps (e.g. multi-megabyte PNGs or JPEGs) and long audio files (>1s) that trigger network congestion and abrupt audio playback.
- **Underlying Mechanism:** Large binary assets block browser parsing pipelines, delay Largest Contentful Paint (LCP), and increase mobile data consumption. Loud, unnormalized audio waveforms trigger acoustic shock and cognitive disruption.

---

### Why 2: Why are media assets included without compression budgets or acoustic normalization?
- **Root Observation:** Assets are added ad-hoc during UI implementation without automated CI validation of file size, container format, duration, or loudness.
- **Underlying Mechanism:** Continuous integration pipelines typically verify JavaScript/TypeScript compilation and unit tests, but treat binary files (`.png`, `.wav`, `.webp`) as opaque blobs, completely ignoring asset performance budgets and acoustic parameters.

---

### Why 3: Why are binary assets ignored by automated testing pipelines?
- **Root Observation:** Traditional testing frameworks lack native decoders or inspectors for media headers, viewing asset inspection as a manual design review responsibility.
- **Underlying Mechanism:** Without specialized verification harnesses capable of parsing RIFF/WAVE chunks, WebP container headers, and SVG XML trees, engineering teams default to manual spot-checking, allowing regressions to pass silently into production.

---

### Why 4: Why are ungrounded and unlicensed assets allowed into production repositories?
- **Root Observation:** Source code repositories lack a formal, machine-readable manifest that cryptographically binds every media file to its original design citation and licensing authority.
- **Underlying Mechanism:** In rapid development cycles, assets are copied from diverse external sources without recording license terms, commercial rights, or copyright ownership, exposing the enterprise to copyright infringement claims and intellectual property contamination.

---

### Why 5: Why is automated verification with cryptographic proof receipts necessary for asset provenance?
- **Root Observation:** File names and file paths can be easily forged or replaced; a malicious or corrupted asset can be substituted without detection if only file existence is checked.
- **Underlying Mechanism:** By calculating physical SHA-256 cryptographic digests across every media file on disk and verifying them against a signed provenance manifest (`docs/02-product/design/asset-provenance-manifest.json`), Soda OS establishes mathematical proof that every asset in production is genuine, verified, compressed, acoustically normalized, and legally compliant.

---

## 3. Socratic Dialectic Synthesis: Resolving Core Tensions

### Dialectic Tension 1: High Visual Fidelity vs. Strict Size Ceilings
- **Thesis:** Enterprise dashboards and complex visualization canvases require rich, high-resolution imagery.
- **Antithesis:** High-resolution bitmaps bloat transfer bundles and degrade mobile performance.
- **Synthesis:** Enforce vector SVG for UI chrome, icons, and logos (infinite resolution at sub-kilobyte sizes), and modern lossy/lossless WebP for complex raster previews. Cap visual assets at $< 250\text{KB}$, delivering crisp visual fidelity with sub-50ms transfer times.

### Dialectic Tension 2: Sensory Audio Feedback vs. Cognitive Distraction
- **Thesis:** Auditory cues (earcons) provide essential multi-modal confirmation of critical operational state changes (e.g. DAVE decision approval, stage gate progression).
- **Antithesis:** Continuous or loud audio cues cause annoyance, workplace distraction, and accessibility barriers for neurodivergent users.
- **Synthesis:** Strictly bound audio feedback to micro-earcons ($\le 500\text{ms}$ duration), normalize loudness to $-16\text{ to } -18\text{ LUFS}$ with zero digital clipping, and enforce accessible mute controls (`audio-controls.json`) with visual feedback alternatives.

---

## 4. Conclusion & Actionable Invariants

The 5-Why inquiry establishes four non-negotiable asset provenance invariants for Soda OS:
1. **Modern Format & Budget Invariant:** All visual assets must use `.svg` or `.webp` and remain strictly $< 250\text{KB}$.
2. **Responsive Aspect Ratio Invariant:** All SVGs must declare `viewBox` and accessibility metadata (`<title>` or `aria-label`).
3. **Acoustic Earcon Invariant:** All audio files must be $\le 500\text{ms}$, normalized to $-16\text{ to } -18\text{ LUFS}$, with zero digital clipping and universal mute controls.
4. **Cryptographic Provenance Invariant:** 100% of assets must be bound to SHA-256 digests and verified licensing authorities in `asset-provenance-manifest.json`.
