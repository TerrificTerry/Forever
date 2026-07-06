import { requireSecondary } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  await requireSecondary("diary", "/diary");
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "json" ? "json" : "markdown";
  const id = url.searchParams.get("id");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const entries = await prisma.diaryEntry.findMany({
    where: id ? { id } : { date: { ...(start ? { gte: new Date(`${start}T00:00:00`) } : {}), ...(end ? { lte: new Date(`${end}T23:59:59`) } : {}) } },
    include: { tags: true }, orderBy: { date: "asc" },
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `spirit-archive-diary-${stamp}.${format === "json" ? "json" : "md"}`;
  const body = format === "json" ? JSON.stringify(entries, null, 2) : entries.map((entry) => [
    `# ${entry.title}`, "", `**Date:** ${entry.date.toISOString().slice(0, 10)}`,
    entry.mood ? `**Mood:** ${entry.mood}` : "", entry.location ? `**Location:** ${entry.location}` : "",
    entry.people.length ? `**People:** ${entry.people.join(", ")}` : "", entry.tags.length ? `**Tags:** ${entry.tags.map((tag) => `#${tag.name}`).join(" ")}` : "",
    "", entry.body, entry.aiSummary ? `\n## AI summary\n\n${entry.aiSummary}` : "", entry.aiComment ? `\n## AI evaluation\n\n${entry.aiComment}` : "",
  ].filter(Boolean).join("\n")).join("\n\n---\n\n");
  await prisma.exportJob.create({ data: { module: "diary", format, fileName, filters: { id, start, end } } });
  return new Response(body, { headers: { "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "private, no-store" } });
}
