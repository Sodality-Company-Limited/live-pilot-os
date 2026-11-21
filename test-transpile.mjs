import ts from "typescript";
import { readFileSync } from "fs";

const source = readFileSync("apps/web/src/components/live-shell.tsx", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
console.log(compiled.slice(compiled.indexOf("app-frame"), compiled.indexOf("app-frame") + 500));
