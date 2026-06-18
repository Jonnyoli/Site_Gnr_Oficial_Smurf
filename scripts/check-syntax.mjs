import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");
} catch {
  try {
    ts = require("typescript");
  } catch {
    console.log("TypeScript não encontrado; check ignorado.");
    process.exit(0);
  }
}

const files = process.argv.slice(2);

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
    fileName: file,
  });

  const errors = (result.diagnostics || []).filter(
    (item) => item.category === ts.DiagnosticCategory.Error,
  );

  if (errors.length) {
    console.error(file);
    for (const error of errors) {
      console.error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
    }
    process.exitCode = 1;
  }
}
