"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { summarizeNewsItems } from "@/lib/ai";
import { fetchNewsForTopic, type RawNewsItem } from "@/lib/news";
import { prisma } from "@/lib/prisma";
import { optionalString } from "@/lib/utils";

function newsError(error: unknown): never {
  const message = error instanceof Error ? error.message : "News action failed.";
  redirect(`/news?error=${encodeURIComponent(message)}`);
}

function required(formData: FormData, name: string) {
  const value = optionalString(formData.get(name));
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseAISummaries(raw: string, items: RawNewsItem[]) {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Array<{ headline?: unknown; summary?: unknown }>;
    if (!Array.isArray(parsed)) throw new Error("AI did not return an array.");
    return items.map((item, index) => ({
      headline: typeof parsed[index]?.headline === "string" && parsed[index].headline.trim() ? parsed[index].headline.trim() : item.title,
      summary: typeof parsed[index]?.summary === "string" && parsed[index].summary.trim() ? parsed[index].summary.trim() : item.snippet || item.title,
    }));
  } catch {
    return items.map((item) => ({ headline: item.title, summary: item.snippet || item.title }));
  }
}

export async function createNewsTopicAction(formData: FormData) {
  await requireUser();
  try {
    const title = required(formData, "title");
    await prisma.newsTopic.create({
      data: {
        title,
        query: optionalString(formData.get("query")) || title,
        description: optionalString(formData.get("description")),
      },
    });
  } catch (error) {
    newsError(error);
  }
  revalidatePath("/news");
  revalidatePath("/home");
  redirect("/news?notice=News%20topic%20added");
}

export async function updateNewsTopicAction(topicId: string) {
  await requireUser();
  try {
    const topic = await prisma.newsTopic.findUnique({ where: { id: topicId } });
    if (!topic) throw new Error("News topic not found.");
    const items = (await fetchNewsForTopic(topic.query)).slice(0, 3);
    if (!items.length) throw new Error("No news results were found for this topic.");
    const rawSummary = await summarizeNewsItems(topic.title, items.map((item) => ({
      title: item.title,
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt?.toISOString() || null,
      snippet: item.snippet,
    })));
    const summaries = parseAISummaries(rawSummary, items);
    await Promise.all(items.map((item, index) => prisma.newsItem.upsert({
      where: { topicId_url: { topicId, url: item.url } },
      update: {
        headline: summaries[index].headline,
        source: item.source,
        publishedAt: item.publishedAt,
        rawSnippet: item.snippet,
        aiSummary: summaries[index].summary,
      },
      create: {
        topicId,
        headline: summaries[index].headline,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
        rawSnippet: item.snippet,
        aiSummary: summaries[index].summary,
      },
    })));
    await prisma.newsTopic.update({ where: { id: topicId }, data: { lastFetchedAt: new Date() } });
  } catch (error) {
    newsError(error);
  }
  revalidatePath("/news");
  revalidatePath("/home");
  redirect("/news?notice=News%20updated");
}

export async function deleteNewsTopicAction(topicId: string) {
  await requireUser();
  try {
    await prisma.newsTopic.delete({ where: { id: topicId } });
  } catch (error) {
    newsError(error);
  }
  revalidatePath("/news");
  revalidatePath("/home");
  redirect("/news?notice=News%20topic%20deleted");
}
