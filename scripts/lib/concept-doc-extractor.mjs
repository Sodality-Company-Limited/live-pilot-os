/**
 * @file concept-doc-extractor.mjs
 * @description Automated conceptual mental model, invariant, and design rationale extractor.
 * Parses JavaScript/ES source files, extracts exported entities, invariants, docstrings,
 * and produces standardized, citation-verified concept specifications.
 */

/**
 * Extracts entities, functions, invariants, and mental model comments from source code.
 * @param {string} source - Source file text content.
 * @param {string} filePath - Repository-relative file path.
 * @returns {object} Extracted concept manifest.
 */
export function extractConceptsFromSource(source, filePath) {
  const lines = source.split('\n');
  const entities = [];
  const functions = [];
  const invariants = [];

  let currentDoc = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Collect JSDoc / docstring comments
    if (trimmed.startsWith('/**') || trimmed.startsWith('*') || trimmed.startsWith('//')) {
      const cleanComment = trimmed.replace(/^(\/\*\*|\*|\/\/)\s?/, '').replace(/\*\/$/, '').trim();
      if (cleanComment) {
        currentDoc += (currentDoc ? ' ' : '') + cleanComment;
        if (/invariant|rule|must|strictly/i.test(cleanComment)) {
          invariants.push({
            statement: cleanComment,
            line: i + 1,
            file: filePath
          });
        }
      }
      continue;
    }

    // Match exported classes
    const classMatch = line.match(/^export\s+(?:default\s+)?class\s+([A-Za-z0-9_]+)/);
    if (classMatch) {
      entities.push({
        name: classMatch[1],
        kind: 'class',
        line: i + 1,
        file: filePath,
        description: currentDoc || 'Domain entity definition.'
      });
      currentDoc = '';
      continue;
    }

    // Match exported functions
    const funcMatch = line.match(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
    if (funcMatch) {
      functions.push({
        name: funcMatch[1],
        line: i + 1,
        file: filePath,
        description: currentDoc || 'Operational function.'
      });
      currentDoc = '';
      continue;
    }

    // Reset doc if non-export code line is encountered
    if (trimmed && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
      currentDoc = '';
    }
  }

  return {
    filePath,
    entities,
    functions,
    invariants
  };
}

/**
 * Generates a structured markdown concept specification document.
 * @param {object} manifest - Manifest from extractConceptsFromSource.
 * @returns {string} Formatted markdown documentation.
 */
export function generateConceptSpec(manifest) {
  const lines = [
    `# Concept Specification: \`${manifest.filePath}\``,
    '',
    '## Domain Mental Models & Entities'
  ];

  if (manifest.entities.length === 0) {
    lines.push('_No domain classes declared._');
  } else {
    for (const entity of manifest.entities) {
      lines.push(`### Entity: \`${entity.name}\` (${entity.kind})`);
      lines.push(`- **Location:** [${manifest.filePath}#L${entity.line}](file:///${manifest.filePath}#L${entity.line})`);
      lines.push(`- **Description:** ${entity.description}`);
      lines.push('');
    }
  }

  lines.push('## Operational Functions');
  if (manifest.functions.length === 0) {
    lines.push('_No exported operational functions declared._');
  } else {
    for (const fn of manifest.functions) {
      lines.push(`### Function: \`${fn.name}\``);
      lines.push(`- **Location:** [${manifest.filePath}#L${fn.line}](file:///${manifest.filePath}#L${fn.line})`);
      lines.push(`- **Description:** ${fn.description}`);
      lines.push('');
    }
  }

  lines.push('## Invariants & Design Rationales');
  if (manifest.invariants.length === 0) {
    lines.push('_No explicit invariant statements extracted._');
  } else {
    for (const inv of manifest.invariants) {
      lines.push(`- **Invariant ([Line ${inv.line}](file:///${manifest.filePath}#L${inv.line})):** ${inv.statement}`);
    }
  }

  return lines.join('\n');
}

/**
 * Validates that all citations and file:line links within a concept spec point to valid code lines.
 * @param {string} specMarkdown - Concept spec markdown text.
 * @param {Record<string, string>} sourceFileMap - Map of relative file paths to content strings.
 * @returns {{ valid: boolean, brokenCitations: Array<string> }} Validation summary.
 */
export function validateConceptCitations(specMarkdown, sourceFileMap) {
  const linkRegex = /\[(?:[^\]]+)\]\(file:\/\/\/([^#)]+)#L(\d+)\)/g;
  const brokenCitations = [];
  let match;

  while ((match = linkRegex.exec(specMarkdown)) !== null) {
    const relPath = match[1];
    const lineNum = parseInt(match[2], 10);

    const content = sourceFileMap[relPath];
    if (content === undefined) {
      brokenCitations.push(`Missing source file: ${relPath}`);
      continue;
    }

    const lines = content.split('\n');
    if (lineNum < 1 || lineNum > lines.length) {
      brokenCitations.push(`Line ${lineNum} out of bounds for ${relPath} (total: ${lines.length})`);
    }
  }

  return {
    valid: brokenCitations.length === 0,
    brokenCitations
  };
}
