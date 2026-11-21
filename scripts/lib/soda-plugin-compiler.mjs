/**
 * Unified Cross-Harness Soda Plugin Compiler
 * Transforms unified soda-plugin.json manifest into provider-specific configs.
 */

export function compilePluginManifest(manifest, targetProvider) {
  if (!manifest || !manifest.name || !manifest.version) {
    throw new Error('Invalid manifest: missing name or version');
  }

  const provider = (targetProvider || 'antigravity').toLowerCase();

  switch (provider) {
    case 'antigravity':
      return {
        name: manifest.name,
        version: manifest.version,
        type: 'antigravity-extension',
        skills: manifest.capabilities || [],
        tools: (manifest.tools || []).map(t => ({
          name: t.name,
          exec: t.command,
          description: t.description || ''
        }))
      };
    case 'claude':
      return {
        name: manifest.name,
        version: manifest.version,
        schema_version: '1.0',
        commands: (manifest.tools || []).map(t => ({
          name: t.name,
          run: t.command
        }))
      };
    case 'codex':
      return {
        extension_id: manifest.name,
        release: manifest.version,
        subcommands: (manifest.tools || []).map(t => ({
          alias: t.name,
          bin: t.command
        }))
      };
    default:
      throw new Error(`Unsupported target provider: ${targetProvider}`);
  }
}
