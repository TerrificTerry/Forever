import { prisma } from "@/lib/prisma";

export type ModuleRow = {
  id: string;
  title: string;
  date: Date;
  preview: string | null;
  badge?: string | null;
  meta?: string | null;
  tags: Array<{ id: string; name: string; color: string | null }>;
  imageId?: string | null;
  aiRating?: string | null;
};

export async function listModuleRecords(slug: string, search = "") {
  const contains = search ? { contains: search, mode: "insensitive" as const } : undefined;
  switch (slug) {
    case "diary": return prisma.diaryEntry.findMany({
      where: contains ? { OR: [{ title: contains }, { body: contains }, { mood: contains }, { location: contains }, { tags: { some: { name: contains } } }] } : undefined,
      include: { tags: true }, orderBy: { date: "desc" }, take: 100,
    });
    case "questions": return prisma.dailyQuestion.findMany({
      where: contains ? { OR: [{ question: contains }, { answer: contains }, { category: contains }, { tags: { some: { name: contains } } }] } : undefined,
      include: { tags: true }, orderBy: { date: "desc" }, take: 100,
    });
    case "appearance": return prisma.appearanceRecord.findMany({
      where: contains ? { OR: [{ note: contains }, { hairstyle: contains }, { outfit: contains }, { context: contains }, { tags: { some: { name: contains } } }] } : undefined,
      include: { tags: true, photoAttachment: true }, orderBy: { date: "desc" }, take: 100,
    });
    case "stocks": return prisma.stockRecord.findMany({
      where: contains ? { OR: [{ ticker: contains }, { companyName: contains }, { reason: contains }] } : undefined,
      include: { manualChecks: { orderBy: { checkDate: "desc" } } }, orderBy: { date: "desc" }, take: 100,
    });
    case "stock-tips": return prisma.stockTip.findMany({
      where: contains ? { OR: [{ title: contains }, { content: contains }, { category: contains }, { tags: { some: { name: contains } } }] } : undefined,
      include: { tags: true }, orderBy: { createdAt: "desc" }, take: 100,
    });
    case "game": return prisma.gameReflection.findMany({
      where: contains ? { OR: [{ gameName: contains }, { hero: contains }, { role: contains }, { summary: contains }, { tags: { some: { name: contains } } }] } : undefined,
      include: { tags: true }, orderBy: { date: "desc" }, take: 100,
    });
    case "data-feed": return prisma.dataFeedItem.findMany({
      where: contains ? { OR: [{ title: contains }, { source: contains }, { rawText: contains }, { extractedText: contains }, { tags: { some: { name: contains } } }] } : undefined,
      include: { tags: true, attachment: true }, orderBy: { createdAt: "desc" }, take: 100,
    });
    default: return [];
  }
}

export function normalizeRows(slug: string, records: any[]): ModuleRow[] {
  return records.map((record) => {
    const common = { id: record.id, date: record.date || record.createdAt, tags: record.tags || [] };
    switch (slug) {
      case "diary": return { ...common, title: record.title, preview: record.body, badge: record.mood, meta: record.importance ? `Importance ${record.importance}/5` : null };
      case "questions": return { ...common, title: record.question, preview: record.answer, badge: record.source, meta: record.category };
      case "appearance": return { ...common, title: record.context || "Appearance record", preview: record.note, badge: record.hairstyle, meta: record.outfit, imageId: record.photoAttachmentId };
      case "stocks": return { ...common, title: record.ticker, preview: record.reason, badge: record.action, meta: record.price ? `@ ${record.price}` : record.companyName, aiRating: record.aiRating };
      case "stock-tips": return { ...common, title: record.title, preview: record.content, badge: record.category, meta: record.importance ? `Importance ${record.importance}/5` : null };
      case "game": return { ...common, title: `${record.gameName}${record.hero ? ` · ${record.hero}` : ""}`, preview: record.summary || record.nextReminder, badge: record.result, meta: [record.kills, record.deaths, record.assists].every((n) => n !== null) ? `${record.kills}/${record.deaths}/${record.assists}` : record.role };
      case "data-feed": return { ...common, title: record.title, preview: record.aiSummary || record.extractedText || record.rawText, badge: record.dataType, meta: record.source };
      default: return { ...common, title: "Record", preview: null };
    }
  });
}

export async function getModuleRecord(slug: string, id: string): Promise<any | null> {
  switch (slug) {
    case "diary": return prisma.diaryEntry.findUnique({ where: { id }, include: { tags: true, attachments: true } });
    case "questions": return prisma.dailyQuestion.findUnique({ where: { id }, include: { tags: true } });
    case "appearance": return prisma.appearanceRecord.findUnique({ where: { id }, include: { tags: true, photoAttachment: true } });
    case "stocks": return prisma.stockRecord.findUnique({ where: { id }, include: { manualChecks: { orderBy: { checkDate: "desc" } } } });
    case "stock-tips": return prisma.stockTip.findUnique({ where: { id }, include: { tags: true } });
    case "game": return prisma.gameReflection.findUnique({ where: { id }, include: { tags: true } });
    case "data-feed": return prisma.dataFeedItem.findUnique({ where: { id }, include: { tags: true, attachment: true } });
    default: return null;
  }
}

export async function moduleCount(slug: string) {
  switch (slug) {
    case "diary": return prisma.diaryEntry.count();
    case "questions": return prisma.dailyQuestion.count();
    case "appearance": return prisma.appearanceRecord.count();
    case "stocks": return prisma.stockRecord.count();
    case "stock-tips": return prisma.stockTip.count();
    case "game": return prisma.gameReflection.count();
    case "data-feed": return prisma.dataFeedItem.count();
    default: return 0;
  }
}
