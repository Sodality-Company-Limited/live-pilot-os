#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd(), skip = /(^|\/)(test|tests|__tests__|fixtures|node_modules)(\/|$)/i;
const bad = /\b(?:TODO|FIXME|HACK|unimplemented!|todo!|mock[_-]?response|fake[_-]?response|stub[_-]?response)\b/i;
const hits = [];
function walk(dir) { if (!fs.existsSync(dir)) return; for (const n of fs.readdirSync(dir)) { const p=path.join(dir,n); if(skip.test(path.relative(root,p))) continue; const s=fs.statSync(p); if(s.isDirectory()) walk(p); else if(/\.(js|mjs|ts|tsx|rs|go|py|java)$/.test(n)) fs.readFileSync(p,'utf8').split('\n').forEach((l,i)=>{if(bad.test(l)) hits.push(`${path.relative(root,p)}:${i+1}`);}); } }
// Only scan declared production trees. Framework harnesses and agent recipes are test infrastructure.
if (fs.existsSync(path.join(root,'code'))) walk(path.join(root,'code'));
else if (fs.existsSync(path.join(root,'src'))) walk(path.join(root,'src'));
if (hits.length) { console.error('P0 production placeholders:'); console.error(hits.join('\n')); process.exit(1); }
console.log('Zero-mock production gate passed');
