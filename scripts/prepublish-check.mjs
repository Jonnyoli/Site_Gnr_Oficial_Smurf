import fs from "node:fs";
import path from "node:path";

const root =
  process.cwd();

const requiredBackendFiles = [
  "api-server/src/app.ts",
  "api-server/src/index.ts",
  "api-server/src/routes/index.ts",
  "api-server/src/routes/auth.ts",
  "api-server/src/middlewares/auth.ts",
  "api-server/src/middlewares/security.ts",
];

const requiredFrontendFiles = [
  "gnr-central/src/App.tsx",
  "gnr-central/src/components/Layout.tsx",
  "gnr-central/src/components/audio/GlobalAudioPlayer.tsx",
];

const missing = [
  ...requiredBackendFiles,
  ...requiredFrontendFiles,
].filter((file) => !fs.existsSync(path.join(root, file)));

if (missing.length) {
  console.error("Ficheiros em falta:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

function scanForbiddenFiles(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (
      entry.name.includes(".before-") ||
      entry.name.endsWith(".bak") ||
      entry.name.endsWith(".old")
    ) {
      result.push(full);
    }

    if (entry.isDirectory()) {
      result.push(...scanForbiddenFiles(full));
    }
  }

  return result;
}

const forbidden = [
  ...scanForbiddenFiles(path.join(root, "api-server/src")),
  ...scanForbiddenFiles(path.join(root, "gnr-central/src")),
];

if (forbidden.length) {
  console.error("Ficheiros de backup encontrados:");
  for (const file of forbidden) console.error(`- ${file}`);
  process.exit(1);
}

console.log("Prepublish check OK.");
