"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getModule } from "@/lib/modules";
import { getModuleRecord } from "@/lib/module-data";
import { hasSecondaryAccess, requireSecondary, requireUser } from "@/lib/auth";
import { asDate, csv, optionalNumber, optionalString } from "@/lib/utils";
import { dataTypeFor, extractReadableText, storeUpload } from "@/lib/uploads";
import { aiClient, commentDiaryEntry, evaluateStockDecision, followUpQuestion, summarizeDataItem, summarizeDiaryEntry, summarizeDiaryRange, summarizeGameStyle, summarizeQuestion } from "@/lib/ai";

function required(formData: FormData, name: string) {
  const value = optionalString(formData.get(name));
  if (!value) throw new Error(`${name.replace(/([A-Z])/g, " $1")} is required.`);
  return value;
}

function tagNames(formData: FormData) {
  return csv(formData.get("tags")).map((name) => name.toLowerCase()).slice(0, 20);
}

function tags(formData: FormData, update = false) {
  const connectOrCreate = tagNames(formData).map((name) => ({ where: { name }, create: { name } }));
  return update ? { set: [], connectOrCreate } : { connectOrCreate };
}

async function authorizeModule(slug: string, next: string) {
  const config = getModule(slug);
  if (!config) throw new Error("Unknown module.");
  if (config.secondary) await requireSecondary(config.secondary, next);
  else await requireUser();
  return config;
}

function actionError(path: string, error: unknown): never {
  const detail = error instanceof Error ? error.message : "The record could not be saved.";
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(detail)}`);
}

export async function saveModuleAction(slug: string, id: string | null, formData: FormData) {
  const destination = id ? `/${slug}/${id}` : `/${slug}/new`;
  await authorizeModule(slug, destination);
  const update = !!id;
  try {
    switch (slug) {
      case "tasks": {
        const status = String(formData.get("status") || "TODO") as "TODO" | "IN_PROGRESS" | "DONE";
        const dueDateValue = optionalString(formData.get("dueDate"));
        const data = {
          title: required(formData, "title"), details: optionalString(formData.get("details")), listName: optionalString(formData.get("listName")),
          dueDate: dueDateValue ? asDate(formData.get("dueDate")) : null, priority: optionalNumber(formData.get("priority")), status,
          completedAt: status === "DONE" ? new Date() : null, tags: tags(formData, update),
        };
        id ? await prisma.task.update({ where: { id }, data }) : await prisma.task.create({ data });
        break;
      }
      case "diary": {
        const data = {
          title: required(formData, "title"), body: required(formData, "body"), date: asDate(formData.get("date")),
          location: optionalString(formData.get("location")), people: csv(formData.get("people")), mood: optionalString(formData.get("mood")),
          importance: optionalNumber(formData.get("importance")), tags: tags(formData, update),
        };
        id ? await prisma.diaryEntry.update({ where: { id }, data }) : await prisma.diaryEntry.create({ data });
        break;
      }
      case "questions": {
        const source: "AI" | "SELF" = formData.get("source") === "AI" ? "AI" : "SELF";
        const data = {
          question: required(formData, "question"), source, answer: optionalString(formData.get("answer")),
          aiFollowUp: optionalString(formData.get("aiFollowUp")), secondAnswer: optionalString(formData.get("secondAnswer")),
          category: optionalString(formData.get("category")), date: asDate(formData.get("date")),
          importance: optionalNumber(formData.get("importance")), tags: tags(formData, update),
        };
        id ? await prisma.dailyQuestion.update({ where: { id }, data }) : await prisma.dailyQuestion.create({ data });
        break;
      }
      case "appearance": {
        let photoAttachmentId: string | undefined;
        const file = formData.get("photo");
        if (file instanceof File && file.size) photoAttachmentId = (await storeUpload(file, true)).attachment.id;
        if (!id && !photoAttachmentId) throw new Error("A photo is required.");
        const data = {
          date: asDate(formData.get("date")), note: optionalString(formData.get("note")), hairstyle: optionalString(formData.get("hairstyle")),
          outfit: optionalString(formData.get("outfit")), weight: optionalNumber(formData.get("weight")), context: optionalString(formData.get("context")),
          tags: tags(formData, update), ...(photoAttachmentId ? { photoAttachment: { connect: { id: photoAttachmentId } } } : {}),
        };
        id ? await prisma.appearanceRecord.update({ where: { id }, data }) : await prisma.appearanceRecord.create({ data: data as any });
        break;
      }
      case "stocks": {
        const actionValue = String(formData.get("action") || "WATCH") as "BUY" | "SELL" | "WATCH" | "ADD" | "REDUCE";
        const predictionEnabled = formData.get("predictionEnabled") === "on";
        const prediction = (name: string) => predictionEnabled ? String(formData.get(name) || "UNKNOWN") as "UP" | "DOWN" | "FLAT" | "UNKNOWN" : null;
        const data = {
          ticker: required(formData, "ticker").toUpperCase(), companyName: optionalString(formData.get("companyName")), date: asDate(formData.get("date")),
          action: actionValue, price: optionalNumber(formData.get("price")), quantity: optionalNumber(formData.get("quantity")), amount: optionalNumber(formData.get("amount")),
          reason: required(formData, "reason"), companyUnderstanding: optionalString(formData.get("companyUnderstanding")),
          industryUnderstanding: optionalString(formData.get("industryUnderstanding")), riskFactors: optionalString(formData.get("riskFactors")),
          marketContext: optionalString(formData.get("marketContext")), predictionEnabled, predictionOneWeek: prediction("predictionOneWeek"),
          predictionOneMonth: prediction("predictionOneMonth"), predictionThreeMonths: prediction("predictionThreeMonths"),
          confidence: optionalNumber(formData.get("confidence")), predictionReason: optionalString(formData.get("predictionReason")),
          resultReflection: optionalString(formData.get("resultReflection")),
        };
        id ? await prisma.stockRecord.update({ where: { id }, data }) : await prisma.stockRecord.create({ data });
        break;
      }
      case "stock-tips": {
        const data = {
          title: required(formData, "title"), content: required(formData, "content"), category: optionalString(formData.get("category")),
          scenario: optionalString(formData.get("scenario")), importance: optionalNumber(formData.get("importance")),
          example: optionalString(formData.get("example")), relatedTickers: csv(formData.get("relatedTickers")).map((v) => v.toUpperCase()), tags: tags(formData, update),
        };
        id ? await prisma.stockTip.update({ where: { id }, data }) : await prisma.stockTip.create({ data });
        break;
      }
      case "game": {
        const data = {
          date: asDate(formData.get("date")), gameName: required(formData, "gameName"), hero: optionalString(formData.get("hero")),
          role: optionalString(formData.get("role")), rank: optionalString(formData.get("rank")),
          result: String(formData.get("result") || "UNKNOWN") as "WIN" | "LOSS" | "DRAW" | "UNKNOWN",
          kills: optionalNumber(formData.get("kills")), deaths: optionalNumber(formData.get("deaths")), assists: optionalNumber(formData.get("assists")),
          summary: optionalString(formData.get("summary")), winningMove: optionalString(formData.get("winningMove")), badMove: optionalString(formData.get("badMove")),
          deathReason: optionalString(formData.get("deathReason")), tempoIssue: optionalString(formData.get("tempoIssue")),
          teammateFactor: optionalString(formData.get("teammateFactor")), myProblem: optionalString(formData.get("myProblem")),
          nextReminder: optionalString(formData.get("nextReminder")), tags: tags(formData, update),
        };
        id ? await prisma.gameReflection.update({ where: { id }, data }) : await prisma.gameReflection.create({ data });
        break;
      }
      case "data-feed": {
        let attachmentId: string | undefined;
        let extractedText: string | null | undefined;
        let parseError: string | null | undefined;
        let dataType: "TEXT" | "TXT" | "MARKDOWN" | "JSON" | "CSV" | "PDF" | "IMAGE" | "OTHER" = "TEXT";
        const file = formData.get("file");
        if (file instanceof File && file.size) {
          const stored = await storeUpload(file);
          attachmentId = stored.attachment.id;
          const parsed = await extractReadableText(stored.buffer, stored.mimeType);
          extractedText = parsed.text;
          parseError = parsed.error;
          dataType = dataTypeFor(stored.mimeType);
        }
        const rawText = optionalString(formData.get("rawText"));
        if (!id && !attachmentId && !rawText) throw new Error("Paste text or choose a file.");
        const data = {
          title: required(formData, "title"), source: optionalString(formData.get("source")), date: optionalString(formData.get("date")) ? asDate(formData.get("date")) : null,
          rawText, includeInAIMemory: formData.get("includeInAIMemory") === "on", tags: tags(formData, update),
          ...(attachmentId ? { attachment: { connect: { id: attachmentId } }, extractedText, parseError, dataType } : {}),
        };
        id ? await prisma.dataFeedItem.update({ where: { id }, data }) : await prisma.dataFeedItem.create({ data: data as any });
        break;
      }
      default: throw new Error("Unknown module.");
    }
  } catch (error) {
    actionError(destination, error);
  }
  revalidatePath(`/${slug}`);
  if (slug === "tasks") revalidatePath("/home");
  redirect(`/${slug}?notice=${encodeURIComponent(`${getModule(slug)!.singular} saved.`)}`);
}

export async function deleteModuleAction(slug: string, id: string) {
  await authorizeModule(slug, `/${slug}/${id}`);
  switch (slug) {
    case "tasks": await prisma.task.delete({ where: { id } }); break;
    case "diary": await prisma.diaryEntry.delete({ where: { id } }); break;
    case "questions": await prisma.dailyQuestion.delete({ where: { id } }); break;
    case "appearance": await prisma.appearanceRecord.delete({ where: { id } }); break;
    case "stocks": await prisma.stockRecord.delete({ where: { id } }); break;
    case "stock-tips": await prisma.stockTip.delete({ where: { id } }); break;
    case "game": await prisma.gameReflection.delete({ where: { id } }); break;
    case "data-feed": await prisma.dataFeedItem.delete({ where: { id } }); break;
    default: throw new Error("Unknown module.");
  }
  revalidatePath(`/${slug}`);
  if (slug === "tasks") revalidatePath("/home");
  redirect(`/${slug}?notice=Record%20deleted`);
}

export async function toggleTaskAction(id: string) {
  await requireUser();
  const task = await prisma.task.findUnique({ where: { id }, select: { status: true } });
  if (!task) return;
  const done = task.status !== "DONE";
  await prisma.task.update({ where: { id }, data: { status: done ? "DONE" : "TODO", completedAt: done ? new Date() : null } });
  revalidatePath("/home");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
}

export async function runRecordAIAction(slug: string, id: string) {
  await authorizeModule(slug, `/${slug}/${id}`);
  const record = await getModuleRecord(slug, id);
  if (!record) throw new Error("Record not found.");
  try {
    switch (slug) {
      case "diary": await prisma.diaryEntry.update({ where: { id }, data: { aiComment: await commentDiaryEntry(record) } }); break;
      case "questions": {
        const followUp = await followUpQuestion(record);
        const summary = record.answer ? await summarizeQuestion(record) : null;
        await prisma.dailyQuestion.update({ where: { id }, data: { aiFollowUp: followUp, aiSummary: summary } });
        break;
      }
      case "appearance": {
        const comment = await aiClient.generate({ systemPrompt: "Give a short, practical, non-scoring observation about an appearance record. Do not claim to see image details; use only its notes and context.", userPrompt: JSON.stringify(record), maxTokens: 220 });
        await prisma.appearanceRecord.update({ where: { id }, data: { aiComment: comment } });
        break;
      }
      case "stocks": {
        const result = await evaluateStockDecision(record);
        await prisma.stockRecord.update({ where: { id }, data: { aiRating: result.rating, aiComment: result.shortConclusion, aiStrengths: result.reasonablePoints, aiRisks: `${result.risks}\n\nEmotional risk: ${result.emotionalRisk}`, aiWatchlist: `${result.watchNext}\n\nReflection question: ${result.reflectionQuestion}` } });
        break;
      }
      case "data-feed": {
        const result = await summarizeDataItem({ title: record.title, source: record.source, text: record.extractedText || record.rawText });
        await prisma.dataFeedItem.update({ where: { id }, data: { aiSummary: result } });
        break;
      }
      default: throw new Error("AI review is not available for this module.");
    }
  } catch (error) {
    actionError(`/${slug}/${id}`, error);
  }
  revalidatePath(`/${slug}/${id}`);
  redirect(`/${slug}/${id}?notice=AI%20review%20saved`);
}

export async function summarizeDiaryEntryAction(id: string) {
  await authorizeModule("diary", `/diary/${id}`);
  const record = await getModuleRecord("diary", id);
  if (!record) throw new Error("Diary entry not found.");
  try {
    await prisma.diaryEntry.update({ where: { id }, data: { aiSummary: await summarizeDiaryEntry(record) } });
  } catch (error) {
    actionError(`/diary/${id}`, error);
  }
  revalidatePath(`/diary/${id}`);
  redirect(`/diary/${id}?notice=AI%20summary%20saved`);
}

export async function diaryRangeSummaryAction(formData: FormData) {
  await requireSecondary("diary", "/diary");
  const start = asDate(formData.get("start"));
  const end = asDate(formData.get("end"));
  end.setHours(23, 59, 59, 999);
  const style = optionalString(formData.get("style")) || "concise";
  const entries = await prisma.diaryEntry.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: "asc" } });
  if (!entries.length) actionError("/diary", new Error("No diary entries are in that date range."));
  try {
    const content = await summarizeDiaryRange(entries, style);
    await prisma.aIReview.create({ data: { module: "diary", reviewType: style, title: `Diary summary · ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`, content, sourceIds: entries.map((entry) => entry.id), dateStart: start, dateEnd: end } });
  } catch (error) { actionError("/diary", error); }
  revalidatePath("/diary");
  redirect("/diary?notice=Diary%20summary%20saved");
}

export async function gameStyleSummaryAction(formData: FormData) {
  await requireUser();
  const count = Math.min(50, Math.max(1, Number(formData.get("count") || 10)));
  const records = await prisma.gameReflection.findMany({ orderBy: { date: "desc" }, take: count });
  if (!records.length) actionError("/game", new Error("Add a game reflection first."));
  try {
    const content = await summarizeGameStyle(records);
    await prisma.aIReview.create({ data: { module: "game", reviewType: "style", title: `Game style · last ${records.length} matches`, content, sourceIds: records.map((record) => record.id) } });
  } catch (error) { actionError("/game", error); }
  revalidatePath("/game");
  redirect("/game?notice=Game%20style%20summary%20saved");
}

export async function generateQuestionsAction() {
  await requireUser();
  const [diaryOpen, privateOpen] = await Promise.all([hasSecondaryAccess("diary"), hasSecondaryAccess("private")]);
  const [diary, stocks, games, data] = await Promise.all([
    diaryOpen ? prisma.diaryEntry.findMany({ orderBy: { date: "desc" }, take: 3, select: { title: true, body: true } }) : [],
    prisma.stockRecord.findMany({ orderBy: { date: "desc" }, take: 3, select: { ticker: true, reason: true, resultReflection: true } }),
    prisma.gameReflection.findMany({ orderBy: { date: "desc" }, take: 3, select: { summary: true, badMove: true } }),
    privateOpen ? prisma.dataFeedItem.findMany({ where: { includeInAIMemory: true }, orderBy: { createdAt: "desc" }, take: 3, select: { title: true, aiSummary: true } }) : [],
  ]);
  try {
    const raw = await aiClient.generate({ systemPrompt: "Generate exactly three specific, non-leading personal reflection questions based only on the records. Return one question per line with no numbering.", userPrompt: JSON.stringify({ diary, stocks, games, data }), maxTokens: 300 });
    const questions = raw.split("\n").map((line) => line.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean).slice(0, 3);
    await prisma.dailyQuestion.createMany({ data: questions.map((question) => ({ question, source: "AI", date: new Date() })) });
  } catch (error) { actionError("/questions", error); }
  revalidatePath("/questions");
  redirect("/questions?notice=Three%20question%20ideas%20added");
}

export async function addManualCheckAction(stockId: string, formData: FormData) {
  await requireUser();
  const price = optionalNumber(formData.get("price"));
  if (price === null || price <= 0) actionError(`/stocks/${stockId}`, new Error("Enter a valid price."));
  await prisma.stockManualCheck.create({ data: { stockRecordId: stockId, checkDate: asDate(formData.get("checkDate")), price, note: optionalString(formData.get("note")) } });
  revalidatePath(`/stocks/${stockId}`);
  redirect(`/stocks/${stockId}?notice=Price%20check%20added`);
}
