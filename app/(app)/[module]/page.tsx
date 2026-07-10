import Link from "next/link";
import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import { listModuleRecords, normalizeRows } from "@/lib/module-data";
import type { TaskSort } from "@/lib/module-data";
import { requireSecondary } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeading } from "@/components/page-heading";
import { ModuleCard } from "@/components/module-card";
import { ModuleTools } from "@/components/module-tools";
import { Flash } from "@/components/flash";

function taskListHref(query: { q?: string; sort?: string; completed?: string }, overrides: { sort?: TaskSort; completed?: boolean }) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  params.set("sort", overrides.sort || (query.sort === "priority" || query.sort === "created" ? query.sort : "urgency"));
  if (overrides.completed ?? query.completed === "1") params.set("completed", "1");
  const value = params.toString();
  return value ? `/tasks?${value}` : "/tasks";
}

export default async function ModulePage({ params, searchParams }: { params: Promise<{ module: string }>; searchParams: Promise<{ q?: string; error?: string; notice?: string; completed?: string; sort?: string }> }) {
  const { module: slug } = await params;
  const config = getModule(slug);
  if (!config) notFound();
  if (config.secondary) await requireSecondary(config.secondary, `/${slug}`);
  const query = await searchParams;
  const taskSort: TaskSort = query.sort === "priority" || query.sort === "created" ? query.sort : "urgency";
  const showCompleted = query.completed === "1";
  const records = await listModuleRecords(slug, query.q || "", slug === "tasks" ? { includeCompleted: showCompleted, taskSort } : {});
  const rows = normalizeRows(slug, records);
  const latestReview = ["diary", "game"].includes(slug)
    ? await prisma.aIReview.findFirst({ where: { module: slug }, orderBy: { createdAt: "desc" }, select: { title: true, content: true, createdAt: true } })
    : null;
  return (
    <>
      <PageHeading eyebrow={config.eyebrow} title={config.title} description={config.description} actions={
        <>
          {slug === "diary" && <><a className="button-secondary" href="/api/diary/export?format=markdown">Export MD</a><a className="button-secondary" href="/api/diary/export?format=json">Export JSON</a></>}
          {slug === "appearance" && <Link className="button-secondary" href="/appearance/compare">Compare</Link>}
          {config.fastPath && <Link className="button" href={config.fastPath}>Quick add</Link>}
          <Link className={config.fastPath ? "button-secondary" : "button"} href={`/${slug}/new`}>{config.newLabel}</Link>
        </>
      } />
      <Flash error={query.error} notice={query.notice} />
      <ModuleTools slug={slug} latestReview={latestReview} />
      {slug === "tasks" && (
        <section className="card mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold">Task view</div>
            <p className="mt-1 text-xs text-stone-500">{showCompleted ? "Completed tasks are visible in dark cards." : "Completed tasks are hidden by default."}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form action="/tasks" className="flex items-center gap-2">
              {query.q && <input type="hidden" name="q" value={query.q} />}
              {showCompleted && <input type="hidden" name="completed" value="1" />}
              <label className="field-label mb-0" htmlFor="task-sort">Sort</label>
              <select id="task-sort" name="sort" className="field min-w-44" defaultValue={taskSort}>
                <option value="urgency">Time urgency</option>
                <option value="priority">Importance</option>
                <option value="created">Newest added</option>
              </select>
              <button className="button-secondary" type="submit">Apply</button>
            </form>
            <Link className="button-secondary" href={taskListHref(query, { sort: taskSort, completed: !showCompleted })}>{showCompleted ? "Hide completed" : "Show completed"}</Link>
          </div>
        </section>
      )}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex w-full max-w-md gap-2" action={`/${slug}`}>
          {slug === "tasks" && <input type="hidden" name="sort" value={taskSort} />}
          {slug === "tasks" && showCompleted && <input type="hidden" name="completed" value="1" />}
          <input className="field" name="q" type="search" defaultValue={query.q || ""} placeholder={`Search ${config.title.toLowerCase()}…`} />
          <button className="button-secondary" type="submit">Search</button>
        </form>
        <div className="text-xs font-bold uppercase tracking-wider text-stone-500">{rows.length} {rows.length === 1 ? "record" : "records"}</div>
      </div>
      {rows.length ? (
        <div className={`grid gap-4 ${slug === "appearance" ? "sm:grid-cols-2 lg:grid-cols-3" : "lg:grid-cols-2"}`}>
          {rows.map((row) => <ModuleCard key={row.id} slug={slug} row={row} />)}
        </div>
      ) : (
        <div className="card flex min-h-64 flex-col items-center justify-center px-6 text-center">
          <div className="font-serif text-2xl">{query.q ? "Nothing matched." : "A blank page, on purpose."}</div>
          <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">{query.q ? "Try a broader phrase or clear the search." : `Your first ${config.singular.toLowerCase()} can be as short as it needs to be.`}</p>
          <Link className="button mt-5" href={`/${slug}/new`}>{config.newLabel}</Link>
        </div>
      )}
    </>
  );
}
