import Link from "next/link";
import type { ModuleRow } from "@/lib/module-data";
import { formatDate, truncate } from "@/lib/utils";

export function ModuleCard({ slug, row }: { slug: string; row: ModuleRow }) {
  const completedTask = slug === "tasks" && row.completed;
  return (
    <Link href={`/${slug}/${row.id}`} className={`card group block overflow-hidden transition hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-soft ${completedTask ? "border-ink bg-ink text-stone-100" : ""}`}>
      {row.imageId && <img src={`/api/files/${row.imageId}`} alt="Appearance record" className="aspect-[4/3] w-full border-b border-line object-cover" />}
      <article className="p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {row.badge && <span className={completedTask ? "rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-stone-200" : "pill"}>{row.badge}</span>}
          {row.aiRating && <span className={`pill rating-${row.aiRating}`}>{row.aiRating}</span>}
          <time className={`ml-auto text-xs ${completedTask ? "text-stone-400" : "text-stone-500"}`}>{formatDate(row.date)}</time>
        </div>
        <h2 className={`font-serif text-xl leading-snug tracking-[-.02em] transition ${completedTask ? "line-through decoration-stone-500 group-hover:text-white" : "group-hover:text-moss"}`}>{row.title}</h2>
        {row.meta && <div className={`mt-1.5 text-xs font-bold uppercase tracking-wider ${completedTask ? "text-stone-400" : "text-stone-500"}`}>{row.meta}</div>}
        <p className={`mt-3 text-sm leading-6 ${completedTask ? "text-stone-300" : "text-stone-600"}`}>{truncate(row.preview, 175)}</p>
        {!!row.tags.length && <div className="mt-4 flex flex-wrap gap-1.5">{row.tags.slice(0, 5).map((tag) => <span key={tag.id} className={`text-xs ${completedTask ? "text-stone-300" : "text-moss"}`}>#{tag.name}</span>)}</div>}
      </article>
    </Link>
  );
}
