import Link from "next/link";
import { createNewsTopicAction, deleteNewsTopicAction, updateNewsTopicAction } from "@/app/actions/news";
import { Flash } from "@/components/flash";
import { PageHeading } from "@/components/page-heading";
import { SubmitButton } from "@/components/submit-button";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "News" };

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const query = await searchParams;
  const topics = await prisma.newsTopic.findMany({
    include: { items: { orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], take: 3 } },
    orderBy: [{ lastFetchedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
  });
  return (
    <>
      <PageHeading
        eyebrow="News"
        title="Topics worth tracking"
        description="Add custom themes, then let AI turn the latest search results into three compact, linked news cards."
      />
      <Flash error={query.error} notice={query.notice} />
      <section className="card mb-8 p-5 sm:p-6">
        <div className="mb-4">
          <div className="text-sm font-bold">Add a news topic</div>
          <p className="mt-1 text-xs leading-5 text-stone-500">The title is what you see. The search query can be more specific, like “OpenAI model safety” or “NVDA earnings”.</p>
        </div>
        <form action={createNewsTopicAction} className="grid gap-3 lg:grid-cols-[1fr_1fr_1.5fr_auto] lg:items-end">
          <div>
            <label className="field-label" htmlFor="title">Topic title *</label>
            <input className="field" id="title" name="title" placeholder="AI agents" required />
          </div>
          <div>
            <label className="field-label" htmlFor="query">Search query</label>
            <input className="field" id="query" name="query" placeholder="AI agents startup funding" />
          </div>
          <div>
            <label className="field-label" htmlFor="description">Notes</label>
            <input className="field" id="description" name="description" placeholder="Why this matters to me" />
          </div>
          <SubmitButton pending="Adding...">Add topic</SubmitButton>
        </form>
      </section>
      {topics.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {topics.map((topic) => (
            <section key={topic.id} className="card overflow-hidden">
              <div className="border-b border-line bg-moss-soft/35 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="eyebrow">Topic</div>
                    <h2 className="mt-1 font-serif text-2xl">{topic.title}</h2>
                    <p className="mt-1 text-xs text-stone-500">Query: {topic.query}</p>
                    {topic.description && <p className="mt-2 text-sm leading-6 text-stone-600">{topic.description}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={updateNewsTopicAction.bind(null, topic.id)}>
                      <SubmitButton className="button-secondary min-h-9 px-4 text-xs" pending="Updating...">AI update 3</SubmitButton>
                    </form>
                    <form action={deleteNewsTopicAction.bind(null, topic.id)}>
                      <SubmitButton className="min-h-9 rounded-full border border-red-200 bg-white px-4 text-xs font-bold text-red-700 hover:bg-red-50" pending="Deleting...">Delete</SubmitButton>
                    </form>
                  </div>
                </div>
                <div className="mt-3 text-xs text-stone-500">{topic.lastFetchedAt ? `Updated ${formatDate(topic.lastFetchedAt, true)}` : "Not updated yet"}</div>
              </div>
              {topic.items.length ? (
                <div className="divide-y divide-line">
                  {topic.items.map((item) => (
                    <article key={item.id} className="px-5 py-5">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                        {item.source && <span className="pill">{item.source}</span>}
                        {item.publishedAt && <time>{formatDate(item.publishedAt, true)}</time>}
                      </div>
                      <h3 className="font-serif text-xl leading-snug">{item.headline}</h3>
                      <p className="mt-2 text-sm leading-6 text-stone-600">{item.aiSummary}</p>
                      <Link className="mt-3 inline-block text-sm font-bold text-moss underline underline-offset-4" href={item.url} target="_blank" rel="noreferrer">Open source</Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-stone-500">No saved news yet. Press AI update 3 to fetch the latest results.</p>
                </div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="card flex min-h-64 flex-col items-center justify-center px-6 text-center">
          <div className="font-serif text-2xl">No topics yet.</div>
          <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">Add a theme above, then update it whenever you want a small fresh briefing.</p>
        </div>
      )}
    </>
  );
}
