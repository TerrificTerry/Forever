import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireSecondary, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { dataFeedItem: { select: { id: true } }, diaryEntries: { select: { id: true }, take: 1 } },
  });
  if (!attachment) return NextResponse.json({ error: "File not found" }, { status: 404 });
  if (attachment.dataFeedItem) await requireSecondary("private", `/api/files/${id}`);
  if (attachment.diaryEntries.length) await requireSecondary("diary", `/api/files/${id}`);
  const base = path.resolve(process.env.LOCAL_UPLOAD_DIR || "./uploads");
  const storedPath = path.resolve(attachment.storagePath);
  if (!storedPath.startsWith(`${base}${path.sep}`)) return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
  try {
    const buffer = await readFile(storedPath);
    const disposition = attachment.mimeType.startsWith("image/") || attachment.mimeType === "application/pdf" ? "inline" : "attachment";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Stored file is unavailable" }, { status: 404 });
  }
}
