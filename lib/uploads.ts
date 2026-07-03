import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

const allowed = new Map([
  ["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"],
  ["text/plain", ".txt"], ["text/markdown", ".md"], ["application/json", ".json"],
  ["text/csv", ".csv"], ["application/pdf", ".pdf"],
]);

const extensionTypes: Record<string, string> = {
  ".txt": "text/plain", ".md": "text/markdown", ".json": "application/json",
  ".csv": "text/csv", ".pdf": "application/pdf", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
};

export async function storeUpload(file: File, imageOnly = false) {
  if (!file || file.size === 0) throw new Error("Choose a file to upload.");
  const originalExtension = path.extname(file.name).toLowerCase();
  const mimeType = allowed.has(file.type) ? file.type : extensionTypes[originalExtension];
  if (!mimeType || !allowed.has(mimeType)) throw new Error("This file type is not allowed.");
  if (imageOnly && !mimeType.startsWith("image/")) throw new Error("Please choose a JPEG, PNG, or WebP image.");
  const maxBytes = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 25)) * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(`File exceeds the ${process.env.MAX_UPLOAD_MB || 25} MB limit.`);

  const extension = allowed.get(mimeType)!;
  const storedName = `${randomUUID()}${extension}`;
  const base = path.resolve(process.env.LOCAL_UPLOAD_DIR || "./uploads");
  const storagePath = path.resolve(base, storedName);
  if (!storagePath.startsWith(`${base}${path.sep}`)) throw new Error("Invalid storage path.");
  await mkdir(base, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer, { flag: "wx" });
  const attachment = await prisma.attachment.create({
    data: { originalName: path.basename(file.name), storedName, mimeType, sizeBytes: file.size, storagePath, storageProvider: "local" },
  });
  return { attachment, buffer, mimeType };
}

export async function extractReadableText(buffer: Buffer, mimeType: string) {
  try {
    const plain = buffer.toString("utf8");
    if (["text/plain", "text/markdown", "text/csv"].includes(mimeType)) return { text: plain, error: null };
    if (mimeType === "application/json") {
      return { text: JSON.stringify(JSON.parse(plain), null, 2), error: null };
    }
    if (mimeType === "application/pdf") {
      const pdf = (await import("pdf-parse")).default;
      const result = await pdf(buffer);
      return { text: result.text.trim(), error: null };
    }
    return { text: null, error: "Preview extraction is not available for this file type." };
  } catch (error) {
    return { text: null, error: error instanceof Error ? error.message : "The file could not be parsed." };
  }
}

export function dataTypeFor(mimeType: string) {
  return ({
    "text/plain": "TXT", "text/markdown": "MARKDOWN", "application/json": "JSON",
    "text/csv": "CSV", "application/pdf": "PDF",
  } as const)[mimeType as "text/plain"] || (mimeType.startsWith("image/") ? "IMAGE" : "OTHER");
}
