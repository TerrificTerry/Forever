import { requireSecondary } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireSecondary("diary", "/api/export/all");
  await requireSecondary("private", "/api/export/all");
  const [tasks, newsTopics, leetcode, interviewPractice, diary, questions, appearance, stocks, stockTips, games, dataFeed, aiMemories, aiReviews, tags] = await Promise.all([
    prisma.task.findMany({ include: { tags: true } }),
    prisma.newsTopic.findMany({ include: { items: true } }),
    prisma.leetCodeReflection.findMany({ include: { tags: true } }),
    prisma.interviewPractice.findMany({ include: { tags: true } }),
    prisma.diaryEntry.findMany({ include: { tags: true, attachments: { select: { id: true, originalName: true, mimeType: true } } } }),
    prisma.dailyQuestion.findMany({ include: { tags: true } }),
    prisma.appearanceRecord.findMany({ include: { tags: true, photoAttachment: { select: { id: true, originalName: true, mimeType: true } } } }),
    prisma.stockRecord.findMany({ include: { manualChecks: true } }),
    prisma.stockTip.findMany({ include: { tags: true } }),
    prisma.gameReflection.findMany({ include: { tags: true } }),
    prisma.dataFeedItem.findMany({ include: { tags: true, attachment: { select: { id: true, originalName: true, mimeType: true } } } }),
    prisma.aIMemoryItem.findMany({ include: { tags: true } }),
    prisma.aIReview.findMany(), prisma.tag.findMany(),
  ]);
  const exportedAt = new Date();
  const body = JSON.stringify({ app: "Spirit Archive", version: 4, exportedAt, tasks, newsTopics, leetcode, interviewPractice, diary, questions, appearance, stocks, stockTips, games, dataFeed, aiMemories, aiReviews, tags }, null, 2);
  const fileName = `spirit-archive-full-${exportedAt.toISOString().slice(0, 10)}.json`;
  await prisma.exportJob.create({ data: { module: "all", format: "json", fileName } });
  return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "private, no-store" } });
}
