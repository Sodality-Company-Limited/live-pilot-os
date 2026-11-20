/**
 * Autonomous Behavior Call-Graph Tracer
 * Traces function definitions, export boundaries, and invocation call-graphs across target JS/TS files.
 */

export function traceBehaviorCallGraph(sourceCode) {
  if (typeof sourceCode !== 'string') {
    return {
      valid: false,
      error: 'sourceCode must be a string'
    };
  }

  const lines = sourceCode.split('\n');
  const functions = [];
  const calls = [];

  const fnRegex = /(?:function\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g;
  const callRegex = /\b([a-zA-Z0-9_$]+)\s*\(/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;

    while ((match = fnRegex.exec(line)) !== null) {
      const name = match[1] || match[2];
      functions.push({ name, line: i + 1 });
    }

    while ((match = callRegex.exec(line)) !== null) {
      const callName = match[1];
      if (!['if', 'for', 'while', 'switch', 'catch', 'function'].includes(callName)) {
        calls.push({ call: callName, line: i + 1 });
      }
    }
  }

  return {
    valid: true,
    declaredFunctions: functions,
    invocationCalls: calls,
    callGraphNodesCount: functions.length
  };
}
