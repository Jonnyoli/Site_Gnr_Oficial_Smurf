import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const UPLOAD_ROOT = path.resolve(
  process.cwd(),
  process.env.INVESTIGATION_UPLOAD_DIR || "uploads/investigations",
);

export function ensureOperationDirectory(operationId) {
  const directory = path.join(UPLOAD_ROOT, String(operationId));
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

export function sanitizeFilename(filename = "ficheiro") {
  const extension = path.extname(filename).slice(0, 20);
  const base = path
    .basename(filename, path.extname(filename))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return `${base || "ficheiro"}${extension.toLowerCase()}`;
}

export function buildStoredFilename(originalFilename) {
  const safe = sanitizeFilename(originalFilename);
  const extension = path.extname(safe);
  const base = path.basename(safe, extension);

  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${base}${extension}`;
}

export async function calculateFileSha256(filePath) {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

export function resolveEvidencePath(relativePath) {
  const absolutePath = path.resolve(UPLOAD_ROOT, relativePath);
  const rootWithSeparator = `${UPLOAD_ROOT}${path.sep}`;

  if (absolutePath !== UPLOAD_ROOT && !absolutePath.startsWith(rootWithSeparator)) {
    throw new Error("Caminho de prova inválido.");
  }

  return absolutePath;
}

export function fileExists(filePath) {
  return fs.existsSync(filePath);
}
