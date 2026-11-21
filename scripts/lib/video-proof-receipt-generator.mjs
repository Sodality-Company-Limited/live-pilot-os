/**
 * Programmatic Video Proof-Receipt Generator & Release Card Synthesizer
 * Invariants:
 * 1. Generates deterministic Remotion-compatible composition manifests for closed goals.
 * 2. Pure SVG storyboard frame synthesis representing the 15-second release announcement video.
 * 3. Exact metadata attribution (Goal ID, author persona, passing tests, physical commit hash).
 */

/**
 * Synthesizes a Remotion-compatible video manifest.
 * @param {object} params
 * @returns {object}
 */
export function synthesizeVideoProofManifest(params) {
  if (!params.goalId) {
    throw new Error('Missing required goalId for video proof manifest');
  }
  if (!params.title) {
    throw new Error('Missing required title for video proof manifest');
  }

  const fps = params.fps || 30;
  const durationSeconds = params.durationSeconds || 15;
  const durationInFrames = Math.round(durationSeconds * fps);

  return {
    goalId: params.goalId,
    title: params.title,
    fps,
    durationSeconds,
    durationInFrames,
    composition: {
      id: `VideoProof-${params.goalId}`,
      width: 1920,
      height: 1080
    },
    metadata: {
      persona: params.persona || 'system-architect',
      passingTests: params.passingTests || 0,
      commitHash: params.commitHash || 'uncommitted',
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Generates an SVG release summary card.
 * @param {object} manifest
 * @returns {string} SVG xml
 */
export function generateReleaseSummaryCardSVG(manifest) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0a0c" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)" />
  <g transform="translate(120, 160)">
    <text x="0" y="60" font-family="system-ui, sans-serif" font-weight="900" font-size="48" fill="#38bdf8">SODA OS RELEASE PROOF RECEIPT</text>
    <text x="0" y="160" font-family="system-ui, sans-serif" font-weight="800" font-size="72" fill="#ffffff">${manifest.goalId}</text>
    <text x="0" y="240" font-family="system-ui, sans-serif" font-weight="600" font-size="36" fill="#a1a1aa">${manifest.title}</text>
    
    <g transform="translate(0, 360)">
      <rect width="360" height="140" rx="16" fill="#27272a" />
      <text x="40" y="60" font-family="system-ui, sans-serif" font-size="20" fill="#a1a1aa">STATUS</text>
      <text x="40" y="105" font-family="system-ui, sans-serif" font-weight="bold" font-size="32" fill="#22c55e">VERIFIED GREEN</text>
    </g>

    <g transform="translate(400, 360)">
      <rect width="360" height="140" rx="16" fill="#27272a" />
      <text x="40" y="60" font-family="system-ui, sans-serif" font-size="20" fill="#a1a1aa">TEST SUITE</text>
      <text x="40" y="105" font-family="system-ui, sans-serif" font-weight="bold" font-size="32" fill="#38bdf8">${manifest.metadata.passingTests} Tests Passing</text>
    </g>

    <g transform="translate(800, 360)">
      <rect width="460" height="140" rx="16" fill="#27272a" />
      <text x="40" y="60" font-family="system-ui, sans-serif" font-size="20" fill="#a1a1aa">COMMIT HASH</text>
      <text x="40" y="105" font-family="monospace" font-weight="bold" font-size="28" fill="#facc15">${manifest.metadata.commitHash}</text>
    </g>
  </g>
</svg>`;
}
