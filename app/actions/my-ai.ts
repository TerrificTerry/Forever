"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSecondary } from "@/lib/auth";
import { askPersonalAI } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { asDate, optionalString } from "@/lib/utils";

function fail(error: unknown): never {
  const message = error instanceof Error ? error.message : "My AI could not answer this question.";
  redirect(`/my-ai?error=${encodeURIComponent(message)}`);
}

export async function askMyAIAction(formData: FormData) {
  await requireSecondary("private", "/my-ai");
  const question = optionalString(formData.get("question"));
  if (!question) fail(new Error("Write a question first."));
  const sources = formData.getAll("sources").map(String);
  const selected = sources.length ? sources : ["diary", "questions", "stocks", "games", "data-feed"];
  const startValue = optionalString(formData.get("start"));
  const endValue = optionalString(formData.get("end"));
  const start = startValue ? asDate(formData.get("start")) : new Date(0);
  const end = endValue ? asDate(formData.get("end")) : new Date();
  end.setHours(23, 59, 59, 999);
  const blocks: string[] = [];
  const sourceIds: string[] = [];
  try {
    if (selected.includes("diary")) {
      const rows = await prisma.diaryEntry.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: "desc" }, take: 20 });
      rows.forEach((r) => { blocks.push(`[Diary ${r.date.toISOString().slice(0, 10)} · ${r.id}] ${r.title}\n${r.body}`); sourceIds.push(`diary:${r.id}`); });
    }
    if (selected.includes("questions")) {
      const rows = await prisma.dailyQuestion.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: "desc" }, take: 20 });
      rows.forEach((r) => { blocks.push(`[Question ${r.date.toISOString().slice(0, 10)} · ${r.id}] ${r.question}\n${r.answer || "No answer"}`); sourceIds.push(`questions:${r.id}`); });
    }
    if (selected.includes("stocks")) {
      const rows = await prisma.stockRecord.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: "desc" }, take: 20 });
      rows.forEach((r) => { blocks.push(`[Stock ${r.date.toISOString().slice(0, 10)} · ${r.id}] ${r.ticker} ${r.action}\nReason: ${r.reason}\nRisk: ${r.riskFactors || "—"}\nReflection: ${r.resultReflection || "—"}`); sourceIds.push(`stocks:${r.id}`); });
    }
    if (selected.includes("games")) {
      const rows = await prisma.gameReflection.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: "desc" }, take: 20 });
      rows.forEach((r) => { blocks.push(`[Game ${r.date.toISOString().slice(0, 10)} · ${r.id}] ${r.gameName} ${r.result}\n${r.summary || ""}\nBad move: ${r.badMove || "—"}\nNext: ${r.nextReminder || "—"}`); sourceIds.push(`games:${r.id}`); });
    }
    if (selected.includes("data-feed")) {
      const rows = await prisma.dataFeedItem.findMany({ where: { includeInAIMemory: true, createdAt: { gte: start, lte: end } }, orderBy: { createdAt: "desc" }, take: 20 });
      rows.forEach((r) => { blocks.push(`[Data ${r.createdAt.toISOString().slice(0, 10)} · ${r.id}] ${r.title}\n${r.aiSummary || r.extractedText || r.rawText || ""}`); sourceIds.push(`data-feed:${r.id}`); });
    }
    const context = blocks.join("\n\n---\n\n").slice(0, 60_000);
    const answer = context ? await askPersonalAI(question, context) : "There is not enough stored data to answer confidently.";
    await prisma.aIMemoryItem.create({ data: { question, answer, sourcesUsed: sourceIds, dateRangeStart: startValue ? start : null, dateRangeEnd: endValue ? end : null } });
  } catch (error) { fail(error); }
  revalidatePath("/my-ai");
  redirect("/my-ai?notice=Answer%20saved%20to%20memory");
}

export async function deleteMemoryAction(id: string) {
  await requireSecondary("private", "/my-ai");
  await prisma.aIMemoryItem.delete({ where: { id } });
  revalidatePath("/my-ai");
  redirect("/my-ai?notice=Memory%20removed");
}
