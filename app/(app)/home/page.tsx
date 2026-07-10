import Link from "next/link";
import { chatRecentStatusAction, summarizeRecentStatusAction } from "@/app/actions/home-ai";
import { PageHeading } from "@/components/page-heading";
import { Flash } from "@/components/flash";
import { HomeTaskSwitcher } from "@/components/home-task-switcher";
import { SubmitButton } from "@/components/submit-button";
import { hasSecondaryAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateInputValue, formatDate, truncate } from "@/lib/utils";

export const metadata = { title: "Home" };

type Snapshot = { title: string; preview: string | null; date: Date; href: string; newHref?: string; label: string; locked?: boolean };
type HomeTaskRow = {
  id: string;
  title: string;
  dueDate: string | null;
  listName: string | null;
  priority: number | null;
  status: string;
};
type HomeNewsTopic = {
  id: string;
  title: string;
  lastFetchedAt: Date | null;
  items: Array<{ id: string; headline: string; aiSummary: string; url: string; source: string | null; publishedAt: Date | null }>;
};

function HomeNewsHighlights({ topics }: { topics: HomeNewsTopic[] }) {
  return (
    <section className="card mb-8 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-moss-soft/35 px-5 py-4 sm:px-6">
        <div>
          <div className="eyebrow">News briefing</div>
          <h2 className="mt-1 font-serif text-2xl">Latest tracked topics</h2>
          <p className="mt-1 text-xs text-stone-500">The freshest AI-generated summary from up to three recently updated topics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link className="text-xs font-bold text-moss" href="/news">View all</Link>
          <Link className="button-secondary min-h-9 px-4 text-xs" href="/news">Add topic</Link>
        </div>
      </div>
      {topics.length ? (
        <div className="grid gap-4 p-5 md:grid-cols-3 sm:p-6">
          {topics.map((topic) => {
            const item = topic.items[0];
            return (
              <article key={topic.id} className="rounded-2xl border border-line bg-[#fcfbf8] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="eyebrow">{topic.title}</div>
                  {topic.lastFetchedAt && <time className="text-[11px] text-stone-500">{formatDate(topic.lastFetchedAt)}</time>}
                </div>
                <h3 className="font-serif text-xl leading-snug">{item.headline}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{truncate(item.aiSummary, 130)}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {item.source && <span className="pill">{item.source}</span>}
                  <Link className="font-bold text-moss underline underline-offset-4" href={item.url} target="_blank" rel="noreferrer">Open</Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="px-5 py-8 text-center sm:px-6">
          <p className="text-sm text-stone-500">No news briefings yet. Add a topic, then press AI update 3.</p>
          <Link className="mt-3 inline-block text-sm font-bold text-moss" href="/news">Open news module</Link>
        </div>
      )}
    </section>
  );
}

function HomeRecentAI({ summary, chats }: { summary: { id: string; title: string; content: string; dateStart: Date | null; dateEnd: Date | null; createdAt: Date } | null; chats: Array<{ id: string; title: string; content: string; createdAt: Date }> }) {
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);
  return (
    <section id="recent-ai" className="card mt-8 overflow-hidden">
      <div className="border-b border-line bg-moss-soft/35 px-5 py-5 sm:px-6">
        <div className="eyebrow">Recent status AI</div>
        <h2 className="mt-1 font-serif text-2xl">Summarize where you are</h2>
        <p className="mt-1 text-sm leading-6 text-stone-600">Choose a date range, generate a grounded summary, then chat with AI using that summary as context.</p>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[0.9fr_1.1fr] sm:p-6">
        <div>
          <form action={summarizeRecentStatusAction} className="rounded-2xl border border-line bg-[#fcfbf8] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="recent-start">From</label>
                <input className="field" id="recent-start" name="start" type="date" defaultValue={dateInputValue(defaultStart)} required />
              </div>
              <div>
                <label className="field-label" htmlFor="recent-end">To</label>
                <input className="field" id="recent-end" name="end" type="date" defaultValue={dateInputValue()} required />
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-stone-500">Diary/private data is included only when those secondary locks are currently unlocked.</p>
            <div className="mt-4">
              <SubmitButton pending="Summarizing...">AI summarize recent status</SubmitButton>
            </div>
          </form>
          <div className="mt-4 rounded-2xl border border-line bg-paper p-4">
            <div className="field-label">Chat with this summary</div>
            {summary ? (
              <form action={chatRecentStatusAction} className="mt-3">
                <input type="hidden" name="summaryId" value={summary.id} />
                <textarea className="textarea min-h-28" name="message" placeholder="Ask about patterns, next steps, relationships, work, mood, or anything else on your mind." required />
                <div className="mt-3 flex justify-end">
                  <SubmitButton className="button-secondary" pending="Thinking...">Send to AI</SubmitButton>
                </div>
              </form>
            ) : (
              <p className="mt-2 text-sm leading-6 text-stone-500">Generate a recent-status summary first, then this becomes a small chat box.</p>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {summary ? (
            <article className="rounded-2xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="field-label">{summary.title}</div>
                <time className="text-xs text-stone-500">{formatDate(summary.createdAt, true)}</time>
              </div>
              <div className="prose-private mt-3 whitespace-pre-wrap">{summary.content}</div>
            </article>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-stone-500">No recent-status summary yet.</div>
          )}
          {!!chats.length && (
            <div className="space-y-3">
              <div className="field-label">Recent conversation</div>
              {chats.map((chat) => (
                <article key={chat.id} className="rounded-2xl border border-line bg-[#fcfbf8] p-4">
                  <time className="text-xs text-stone-500">{formatDate(chat.createdAt, true)}</time>
                  <div className="prose-private mt-2 whitespace-pre-wrap">{chat.content}</div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const query = await searchParams;
  const [diaryOpen, privateOpen] = await Promise.all([hasSecondaryAccess("diary"), hasSecondaryAccess("private")]);
  const [tasks, todayBoardSetting, newsTopics, latestRecentSummary, diary, question, appearance, stock, tip, game, data, ai] = await Promise.all([
    prisma.task.findMany({ where: { status: { not: "DONE" } }, include: { tags: true }, orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }], take: 8 }),
    prisma.appSetting.findUnique({ where: { key: "home.todayBoard" }, select: { value: true } }),
    prisma.newsTopic.findMany({
      where: { items: { some: {} } },
      include: { items: { orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], take: 1 } },
      orderBy: [{ lastFetchedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
      take: 3,
    }),
    prisma.aIReview.findFirst({ where: { module: "home", reviewType: "recent-status" }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, content: true, dateStart: true, dateEnd: true, createdAt: true } }),
    diaryOpen ? prisma.diaryEntry.findFirst({ orderBy: { date: "desc" } }) : null,
    prisma.dailyQuestion.findFirst({ orderBy: { date: "desc" } }),
    prisma.appearanceRecord.findFirst({ orderBy: { date: "desc" } }),
    prisma.stockRecord.findFirst({ orderBy: { date: "desc" } }),
    prisma.stockTip.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.gameReflection.findFirst({ orderBy: { date: "desc" } }),
    privateOpen ? prisma.dataFeedItem.findFirst({ orderBy: { createdAt: "desc" } }) : null,
    privateOpen ? prisma.aIMemoryItem.findFirst({ orderBy: { createdAt: "desc" } }) : null,
  ]);
  const recentStatusChats = latestRecentSummary ? await prisma.aIReview.findMany({
    where: { module: "home", reviewType: "recent-chat", sourceIds: { has: latestRecentSummary.id } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, content: true, createdAt: true },
  }) : [];
  const snapshots: Snapshot[] = [
    diaryOpen ? { label: "Diary", title: diary?.title || "No diary entries yet", preview: diary?.body || null, date: diary?.date || new Date(), href: diary ? `/diary/${diary.id}` : "/diary", newHref: "/diary/new" } : { label: "Diary", title: "Secondary lock active", preview: "Unlock your diary to show its latest entry here.", date: new Date(), href: "/unlock?scope=diary&next=/home", locked: true },
    { label: "Daily question", title: question?.question || "No question yet", preview: question?.answer || null, date: question?.date || new Date(), href: question ? `/questions/${question.id}` : "/questions", newHref: "/questions/new" },
    { label: "Appearance", title: appearance?.context || "No appearance records yet", preview: appearance?.note || null, date: appearance?.date || new Date(), href: appearance ? `/appearance/${appearance.id}` : "/appearance", newHref: "/appearance/new" },
    { label: "Stock decision", title: stock ? `${stock.ticker} · ${stock.action}` : "No stock records yet", preview: stock?.reason || null, date: stock?.date || new Date(), href: stock ? `/stocks/${stock.id}` : "/stocks", newHref: "/stocks/new" },
    { label: "Stock tip", title: tip?.title || "No stock tips yet", preview: tip?.content || null, date: tip?.createdAt || new Date(), href: tip ? `/stock-tips/${tip.id}` : "/stock-tips", newHref: "/stock-tips/new" },
    { label: "Game reflection", title: game ? `${game.gameName}${game.hero ? ` · ${game.hero}` : ""}` : "No games reflected yet", preview: game?.nextReminder || game?.summary || null, date: game?.date || new Date(), href: game ? `/game/${game.id}` : "/game", newHref: "/game/quick-add" },
    privateOpen ? { label: "Data feed", title: data?.title || "No materials yet", preview: data?.aiSummary || data?.rawText || null, date: data?.createdAt || new Date(), href: data ? `/data-feed/${data.id}` : "/data-feed", newHref: "/data-feed/new" } : { label: "Data feed", title: "Secondary lock active", preview: "Unlock private data to show the latest material.", date: new Date(), href: "/unlock?scope=private&next=/home", locked: true },
    privateOpen ? { label: "My AI", title: ai?.question || "No AI memories yet", preview: ai?.answer || null, date: ai?.createdAt || new Date(), href: "/my-ai" } : { label: "My AI", title: "Secondary lock active", preview: "Unlock private data to show recent AI memory.", date: new Date(), href: "/unlock?scope=private&next=/home", locked: true },
  ];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  const taskItems: HomeTaskRow[] = tasks.map((task: { id: string; title: string; dueDate: Date | null; listName: string | null; priority: number | null; status: string }) => ({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    listName: task.listName,
    priority: task.priority,
    status: task.status,
  }));
  return (
    <>
      <PageHeading eyebrow={formatDate(new Date())} title={greeting} description="A quiet overview of what you have been thinking, choosing, noticing, and learning." actions={<><Link href="/game/quick-add" className="button-secondary">Quick game note</Link><Link href="/tasks/new" className="button">New task</Link></>} />
      <Flash error={query.error} notice={query.notice} />
      <HomeTaskSwitcher tasks={taskItems} taskCount={tasks.length} initialBoard={todayBoardSetting?.value || ""} />
      <HomeNewsHighlights topics={newsTopics} />
      <div className="grid gap-4 md:grid-cols-2">
        {snapshots.map((item) => (
          <section key={item.label} className="card flex min-h-56 flex-col p-5 sm:p-6">
            <div className="flex items-center justify-between"><div className="eyebrow">{item.label}</div>{!item.locked && <time className="text-xs text-stone-500">{formatDate(item.date)}</time>}</div>
            <h2 className="mt-4 font-serif text-2xl leading-snug tracking-[-.025em]">{item.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">{truncate(item.preview, 150)}</p>
            <div className="mt-5 flex gap-2"><Link className="button-secondary min-h-9 px-4 text-xs" href={item.href}>{item.locked ? "Unlock" : "Open"}</Link>{item.newHref && <Link className="min-h-9 px-3 py-2 text-xs font-bold text-moss" href={item.newHref}>New</Link>}</div>
          </section>
        ))}
      </div>
      <HomeRecentAI summary={latestRecentSummary} chats={recentStatusChats} />
    </>
  );
}
