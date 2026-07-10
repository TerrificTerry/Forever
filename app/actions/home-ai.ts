"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasSecondaryAccess, requireUser } from "@/lib/auth";
import { chatAboutRecentStatus, summarizeRecentStatus } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { asDate, optionalString } from "@/lib/utils";

function homeAIError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Home AI action failed.";
  redirect(`/home?error=${encodeURIComponent(message)}#recent-ai`);
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function idList(module: string, rows: Array<{ id: string }>) {
  return rows.map((row) => `${module}:${row.id}`);
}

export async function summarizeRecentStatusAction(formData: FormData) {
  await requireUser();
  const start = asDate(formData.get("start"));
  const end = endOfDay(asDate(formData.get("end")));
  if (start > end) homeAIError(new Error("Start date must be before end date."));
  const [diaryOpen, privateOpen] = await Promise.all([hasSecondaryAccess("diary"), hasSecondaryAccess("private")]);
  try {
    const [tasks, diary, questions, stocks, games, leetcode, interviews, news, dataFeed] = await Promise.all([
      prisma.task.findMany({
        where: { OR: [{ createdAt: { gte: start, lte: end } }, { updatedAt: { gte: start, lte: end } }, { dueDate: { gte: start, lte: end } }] },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
        take: 30,
        select: { id: true, title: true, details: true, listName: true, dueDate: true, priority: true, status: true, completedAt: true },
      }),
      diaryOpen ? prisma.diaryEntry.findMany({
        where: { date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
        take: 20,
        select: { id: true, title: true, body: true, mood: true, date: true },
      }) : [],
      prisma.dailyQuestion.findMany({
        where: { date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
        take: 20,
        select: { id: true, question: true, answer: true, secondAnswer: true, category: true, date: true },
      }),
      prisma.stockRecord.findMany({
        where: { date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
        take: 20,
        select: { id: true, ticker: true, action: true, reason: true, resultReflection: true, date: true, aiRating: true },
      }),
      prisma.gameReflection.findMany({
        where: { date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
        take: 20,
        select: { id: true, gameName: true, hero: true, result: true, summary: true, myProblem: true, nextReminder: true, date: true },
      }),
      prisma.leetCodeReflection.findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: "asc" },
        take: 20,
        select: { id: true, problemNumber: true, title: true, difficulty: true, topics: true, aiEvaluation: true, createdAt: true },
      }),
      prisma.interviewPractice.findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: "asc" },
        take: 20,
        select: { id: true, title: true, question: true, topics: true, reflection: true, aiEvaluation: true, createdAt: true },
      }),
      prisma.newsTopic.findMany({
        where: { lastFetchedAt: { gte: start, lte: end } },
        orderBy: [{ lastFetchedAt: { sort: "desc", nulls: "last" } }],
        take: 10,
        select: { id: true, title: true, query: true, lastFetchedAt: true, items: { orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], take: 1, select: { headline: true, aiSummary: true, source: true, publishedAt: true } } },
      }),
      privateOpen ? prisma.dataFeedItem.findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: "asc" },
        take: 15,
        select: { id: true, title: true, source: true, aiSummary: true, rawText: true, createdAt: true },
      }) : [],
    ]);
    const records = { tasks, diary, questions, stocks, games, leetcode, interviews, news, dataFeed };
    const sourceIds = [
      ...idList("tasks", tasks),
      ...idList("diary", diary),
      ...idList("questions", questions),
      ...idList("stocks", stocks),
      ...idList("game", games),
      ...idList("leetcode", leetcode),
      ...idList("interview-practice", interviews),
      ...idList("news", news),
      ...idList("data-feed", dataFeed),
    ];
    if (!sourceIds.length) throw new Error("No records were found in that date range.");
    const content = await summarizeRecentStatus({
      start: isoDay(start),
      end: isoDay(end),
      access: { diary: diaryOpen, private: privateOpen },
      records,
    });
    await prisma.aIReview.create({
      data: {
        module: "home",
        reviewType: "recent-status",
        title: `Recent status · ${isoDay(start)} to ${isoDay(end)}`,
        content,
        sourceIds,
        dateStart: start,
        dateEnd: end,
      },
    });
  } catch (error) {
    homeAIError(error);
  }
  revalidatePath("/home");
  redirect("/home?notice=Recent%20status%20summary%20saved#recent-ai");
}

export async function chatRecentStatusAction(formData: FormData) {
  await requireUser();
  const summaryId = optionalString(formData.get("summaryId"));
  const question = optionalString(formData.get("message"));
  if (!summaryId) homeAIError(new Error("Generate a recent-status summary first."));
  if (!question) homeAIError(new Error("Write a message before chatting with AI."));
  try {
    const summary = await prisma.aIReview.findFirst({ where: { id: summaryId, module: "home", reviewType: "recent-status" } });
    if (!summary) throw new Error("Recent-status summary not found.");
    const recentConversation = await prisma.aIReview.findMany({
      where: { module: "home", reviewType: "recent-chat", sourceIds: { has: summary.id } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { content: true },
    });
    const answer = await chatAboutRecentStatus({
      summary: summary.content,
      recentConversation: recentConversation.reverse().map((item) => item.content),
      question,
    });
    await prisma.aIReview.create({
      data: {
        module: "home",
        reviewType: "recent-chat",
        title: question.slice(0, 90),
        content: `You: ${question}\n\nAI: ${answer}`,
        sourceIds: [summary.id],
        dateStart: summary.dateStart,
        dateEnd: summary.dateEnd,
      },
    });
  } catch (error) {
    homeAIError(error);
  }
  revalidatePath("/home");
  redirect("/home?notice=AI%20reply%20saved#recent-ai");
}
