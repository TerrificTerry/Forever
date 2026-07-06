import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { toggleTaskAction } from "@/app/actions/modules";
import { hasSecondaryAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, truncate } from "@/lib/utils";

export const metadata = { title: "Home" };

type Snapshot = { title: string; preview: string | null; date: Date; href: string; newHref?: string; label: string; locked?: boolean };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const query = await searchParams;
  const [diaryOpen, privateOpen] = await Promise.all([hasSecondaryAccess("diary"), hasSecondaryAccess("private")]);
  const [tasks, diary, question, appearance, stock, tip, game, data, ai] = await Promise.all([
    prisma.task.findMany({ where: { status: { not: "DONE" } }, include: { tags: true }, orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }], take: 8 }),
    diaryOpen ? prisma.diaryEntry.findFirst({ orderBy: { date: "desc" } }) : null,
    prisma.dailyQuestion.findFirst({ orderBy: { date: "desc" } }),
    prisma.appearanceRecord.findFirst({ orderBy: { date: "desc" } }),
    prisma.stockRecord.findFirst({ orderBy: { date: "desc" } }),
    prisma.stockTip.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.gameReflection.findFirst({ orderBy: { date: "desc" } }),
    privateOpen ? prisma.dataFeedItem.findFirst({ orderBy: { createdAt: "desc" } }) : null,
    privateOpen ? prisma.aIMemoryItem.findFirst({ orderBy: { createdAt: "desc" } }) : null,
  ]);
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
  return (
    <>
      <PageHeading eyebrow={formatDate(new Date())} title={greeting} description="A quiet overview of what you have been thinking, choosing, noticing, and learning." actions={<><Link href="/game/quick-add" className="button-secondary">Quick game note</Link><Link href="/tasks/new" className="button">New task</Link></>} />
      <Flash notice={query.notice} />
      <section className="card mb-8 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-moss-soft/40 px-5 py-4 sm:px-6">
          <div><div className="eyebrow">First things first</div><h2 className="mt-1 font-serif text-2xl">Tasks</h2></div>
          <div className="flex items-center gap-3"><Link className="text-xs font-bold text-moss" href="/tasks">View all</Link><Link className="button-secondary min-h-9 px-4 text-xs" href="/tasks/new">Add task</Link></div>
        </div>
        {tasks.length ? <div className="divide-y divide-line">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 px-5 py-4 sm:px-6">
              <form action={toggleTaskAction.bind(null, task.id)}><SubmitButton className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 bg-white text-xs text-moss hover:border-moss" pending="...">✓</SubmitButton></form>
              <div className="min-w-0 flex-1">
                <Link className="font-bold leading-6 hover:text-moss" href={`/tasks/${task.id}`}>{task.title}</Link>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                  {task.listName && <span>{task.listName}</span>}
                  {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
                  {task.priority && <span>Priority {task.priority}/5</span>}
                  {task.status === "IN_PROGRESS" && <span className="font-bold text-moss">In progress</span>}
                </div>
              </div>
            </div>
          ))}
        </div> : <div className="px-5 py-8 text-center sm:px-6"><p className="text-sm text-stone-500">Nothing waiting. Enjoy the suspicious calm.</p><Link className="mt-3 inline-block text-sm font-bold text-moss" href="/tasks/new">Add your first task</Link></div>}
      </section>
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
    </>
  );
}
