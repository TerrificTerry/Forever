import { askMyAIAction, deleteMemoryAction } from "@/app/actions/my-ai";
import { requireSecondary } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeading } from "@/components/page-heading";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My AI" };

export default async function MyAIPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await requireSecondary("private", "/my-ai");
  const query = await searchParams;
  const memories = await prisma.aIMemoryItem.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  const examples = ["Have I been making emotional investment decisions recently?", "What pattern appears in my recent game losses?", "What have I been most focused on in the last 30 days?"];
  return (
    <>
      <PageHeading eyebrow="Evidence, then interpretation" title="My AI" description="Ask across your stored history. Answers cite the records they used and admit when the archive is too thin." />
      <Flash error={query.error} notice={query.notice} />
      <form action={askMyAIAction} className="card p-5 sm:p-7">
        <label className="field-label" htmlFor="question">Question about your records</label>
        <textarea className="textarea min-h-28" id="question" name="question" required placeholder={examples[0]} />
        <div className="mt-4 flex flex-wrap gap-2">{examples.map((example) => <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-600" key={example}>{example}</span>)}</div>
        <div className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
          <div><div className="field-label">Sources</div><div className="grid grid-cols-2 gap-2">{[["diary", "Diary"], ["questions", "Questions"], ["stocks", "Stocks"], ["games", "Games"], ["data-feed", "Data feed"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm"><input className="accent-moss" type="checkbox" name="sources" value={value} defaultChecked />{label}</label>)}</div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="field-label">From (optional)</label><input className="field" name="start" type="date" /></div><div><label className="field-label">To (optional)</label><input className="field" name="end" type="date" /></div></div>
        </div>
        <div className="mt-6"><SubmitButton pending="Searching your archive…">Ask my archive</SubmitButton></div>
      </form>
      <div className="mt-10 flex items-end justify-between"><div><div className="eyebrow">Saved answers</div><h2 className="mt-2 font-serif text-3xl">Memory shelf</h2></div><span className="text-xs text-stone-500">{memories.length} saved</span></div>
      <div className="mt-5 space-y-4">
        {memories.map((memory) => <article className="card p-5 sm:p-7" key={memory.id}><div className="flex items-start gap-4"><div className="flex-1"><time className="text-xs text-stone-500">{formatDate(memory.createdAt, true)}</time><h3 className="mt-2 font-serif text-xl">{memory.question}</h3></div><form action={deleteMemoryAction.bind(null, memory.id)}><button className="text-xs font-bold text-stone-400 hover:text-red-700">Remove</button></form></div><div className="prose-private mt-5 border-t border-line pt-5">{memory.answer}</div><div className="mt-5"><div className="field-label">Sources used</div><div className="flex flex-wrap gap-2">{memory.sourcesUsed.map((source) => { const [module, id] = source.split(":"); const route = module === "games" ? "game" : module; return <a className="pill hover:border-moss hover:text-moss" href={`/${route}/${id}`} key={source}>{module} · {id.slice(0, 8)}</a>; })}{!memory.sourcesUsed.length && <span className="text-xs text-stone-500">No source records were available.</span>}</div></div></article>)}
        {!memories.length && <div className="card px-6 py-14 text-center text-sm text-stone-500">Questions and saved answers will collect here over time.</div>}
      </div>
    </>
  );
}
