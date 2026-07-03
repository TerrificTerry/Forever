import Link from "next/link";
import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import { listModuleRecords, normalizeRows } from "@/lib/module-data";
import { requireSecondary } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeading } from "@/components/page-heading";
import { ModuleCard } from "@/components/module-card";
import { ModuleTools } from "@/components/module-tools";
import { Flash } from "@/components/flash";

export default async function ModulePage({ params, searchParams }: { params: Promise<{ module: string }>; searchParams: Promise<{ q?: string; error?: string; notice?: string }> }) {
  const { module: slug } = await params;
  const config = getModule(slug);
  if (!config) notFound();
  if (config.secondary) await requireSecondary(config.secondary, `/${slug}`);
  const query = await searchParams;
  const records = await listModuleRecords(slug, query.q || "");
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex w-full max-w-md gap-2" action={`/${slug}`}>
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
