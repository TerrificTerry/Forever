import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteModuleAction, runRecordAIAction, addManualCheckAction, summarizeDiaryEntryAction, toggleTaskAction } from "@/app/actions/modules";
import { getModule } from "@/lib/modules";
import { getModuleRecord, normalizeRows } from "@/lib/module-data";
import { requireSecondary } from "@/lib/auth";
import { formatDate, truncate } from "@/lib/utils";
import { normalizeRepeatableItems } from "@/lib/repeatable";
import type { ModuleField } from "@/lib/modules";
import { PageHeading } from "@/components/page-heading";
import { ModuleForm } from "@/components/module-form";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { DeleteButton } from "@/components/delete-button";
import { StockPerformance } from "@/components/stock-performance";

function valueFor(record: any, name: string) {
  const value = record[name];
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return formatDate(value);
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).replaceAll("_", " ");
}

function AIResults({ slug, record }: { slug: string; record: any }) {
  const sections: Array<[string, string | null | undefined]> = slug === "diary" ? [["AI summary", record.aiSummary], ["AI evaluation", record.aiComment]]
    : slug === "leetcode" ? [["AI evaluation", record.aiEvaluation]]
    : slug === "interview-practice" ? [["AI evaluation", record.aiEvaluation]]
    : slug === "questions" ? [["AI follow-up", record.aiFollowUp], ["Answer summary", record.aiSummary]]
    : slug === "appearance" ? [["AI observation", record.aiComment]]
    : slug === "stocks" ? [["Conclusion", record.aiComment], ["Reasonable points", record.aiStrengths], ["Risks", record.aiRisks], ["Watch next", record.aiWatchlist]]
    : slug === "data-feed" ? [["AI analysis", record.aiSummary], ["Key ideas", record.aiKeyIdeas], ["People", record.aiPeople], ["Events", record.aiEvents]] : [];
  if (!sections.some(([, value]) => value)) return null;
  return (
    <section className="card mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-moss-soft/50 px-5 py-4">
        <h2 className="text-sm font-bold">AI review</h2>
        {record.aiRating && <span className={`pill rating-${record.aiRating}`}>{record.aiRating}</span>}
      </div>
      <div className="divide-y divide-line">
        {sections.filter(([, value]) => value).map(([label, value]) => <div key={label} className="px-5 py-5"><div className="field-label">{label}</div><div className="prose-private">{value}</div></div>)}
      </div>
    </section>
  );
}

function RepeatableDisplay({ field, value }: { field: ModuleField; value: unknown }) {
  if (!field.repeatable) return null;
  const items = normalizeRepeatableItems(value);
  if (!items.length) return null;
  return (
    <div className="px-5 py-5">
      <div className="field-label mb-3">{field.label}</div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <section key={index} className="rounded-2xl border border-line bg-[#fcfbf8] p-4">
            <h3 className="mb-4 text-sm font-bold">{field.repeatable!.itemLabel} {index + 1}{item.name ? ` · ${item.name}` : ""}</h3>
            <div className="space-y-4">
              {field.repeatable!.fields.filter((subfield) => subfield.name !== "name" && item[subfield.name]).map((subfield) => (
                <div key={subfield.name}>
                  <div className="field-label">{subfield.label}</div>
                  {subfield.name === "code" ? (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-ink px-4 py-3 text-xs leading-6 text-stone-100">{item[subfield.name]}</pre>
                  ) : (
                    <div className="prose-private mt-1 whitespace-pre-wrap">{item[subfield.name]}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function StockChecks({ record }: { record: any }) {
  if (!record.manualChecks) return null;
  return (
    <section className="card mt-6 p-5 sm:p-6">
      <h2 className="font-serif text-2xl">Price checks</h2>
      {record.manualChecks.length ? <div className="mt-4 divide-y divide-line border-y border-line">{record.manualChecks.map((check: any) => {
        const performance = record.price ? ((check.price - record.price) / record.price) * 100 : null;
        return <div key={check.id} className="flex items-center gap-4 py-3 text-sm"><time className="text-stone-500">{formatDate(check.checkDate)}</time><strong>{check.price}</strong>{performance !== null && <span className={performance >= 0 ? "text-emerald-700" : "text-red-700"}>{performance >= 0 ? "+" : ""}{performance.toFixed(1)}%</span>}<span className="ml-auto text-stone-500">{check.note}</span></div>;
      })}</div> : <p className="mt-2 text-sm text-stone-500">No later prices recorded. Manual tracking works even without a stock API.</p>}
      <form action={addManualCheckAction.bind(null, record.id)} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
        <div><label className="field-label">Check date</label><input className="field" name="checkDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
        <div><label className="field-label">Price</label><input className="field" name="price" type="number" step="any" required /></div>
        <div><label className="field-label">Note</label><input className="field" name="note" type="text" /></div>
        <SubmitButton className="button-secondary" pending="Adding…">Add</SubmitButton>
      </form>
    </section>
  );
}

export default async function ModuleDetailPage({ params, searchParams }: { params: Promise<{ module: string; id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { module: slug, id } = await params;
  const config = getModule(slug);
  if (!config) notFound();
  if (config.secondary) await requireSecondary(config.secondary, `/${slug}/${id}`);
  const record = await getModuleRecord(slug, id);
  if (!record) notFound();
  const query = await searchParams;
  const row = normalizeRows(slug, [record])[0];
  const aiAction = config.aiLabel ? runRecordAIAction.bind(null, slug, id) : null;
  const diarySummaryAction = slug === "diary" ? summarizeDiaryEntryAction.bind(null, id) : null;
  const taskToggleAction = slug === "tasks" ? toggleTaskAction.bind(null, id) : null;
  const deleteAction = deleteModuleAction.bind(null, slug, id);
  return (
    <>
      <PageHeading eyebrow={`${config.singular} · ${formatDate(row.date)}`} title={truncate(row.title, 70)} description={row.meta || config.description} actions={
        <>
          <Link className="button-secondary" href={`/${slug}`}>Back</Link>
          {slug === "diary" && <a className="button-secondary" href={`/api/diary/export?format=markdown&id=${id}`}>Export</a>}
          {taskToggleAction && <form action={taskToggleAction}><SubmitButton className="button-secondary" pending="Updating...">{record.status === "DONE" ? "Reopen" : "Mark done"}</SubmitButton></form>}
          {diarySummaryAction && <form action={diarySummaryAction}><SubmitButton className="button-secondary" pending="Summarizing...">AI summarize</SubmitButton></form>}
          {aiAction && <form action={aiAction}><SubmitButton pending="Asking AI...">{config.aiLabel}</SubmitButton></form>}
        </>
      } />
      <Flash error={query.error} notice={query.notice} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {record.photoAttachmentId && <div className="card mb-6 overflow-hidden"><img src={`/api/files/${record.photoAttachmentId}`} alt={`Appearance record from ${formatDate(record.date)}`} className="max-h-[70vh] w-full object-contain" /></div>}
          <section className="card overflow-hidden">
            <div className="divide-y divide-line">
              {config.fields.filter((field) => !["file", "tags"].includes(field.type)).map((field) => {
                if (field.type === "repeatable") return <RepeatableDisplay key={field.name} field={field} value={record[field.name]} />;
                const value = valueFor(record, field.name);
                if (!value) return null;
                return (
                  <div key={field.name} className={`px-5 py-5 ${field.wide ? "" : "sm:grid sm:grid-cols-[170px_1fr] sm:gap-5"}`}>
                    <div className="field-label mb-2 sm:mb-0">{field.label}</div>
                    <div className="prose-private whitespace-pre-wrap">{value}</div>
                  </div>
                );
              })}
              {!!record.tags?.length && <div className="px-5 py-5"><div className="field-label">Tags</div><div className="flex flex-wrap gap-2">{record.tags.map((tag: any) => <span className="pill" key={tag.id}>#{tag.name}</span>)}</div></div>}
              {record.attachment && <div className="px-5 py-5 sm:grid sm:grid-cols-[170px_1fr] sm:gap-5"><div className="field-label">Original file</div><a className="text-sm font-bold text-moss underline underline-offset-4" href={`/api/files/${record.attachment.id}`}>{record.attachment.originalName}</a></div>}
              {record.parseError && <div className="px-5 py-4 text-sm text-amber-800">File kept safely, but text extraction failed: {record.parseError}</div>}
            </div>
          </section>
          <AIResults slug={slug} record={record} />
          {slug === "stocks" && <StockPerformance id={record.id} provider={process.env.STOCK_API_PROVIDER || "manual"} predictions={{ oneWeek: record.predictionOneWeek, oneMonth: record.predictionOneMonth, threeMonths: record.predictionThreeMonths }} />}
          {slug === "stocks" && <StockChecks record={record} />}
        </div>
        <aside className="space-y-4">
          <div className="card p-5"><div className="field-label">Record history</div><div className="space-y-2 text-sm text-stone-600"><div>Created {formatDate(record.createdAt, true)}</div><div>Updated {formatDate(record.updatedAt, true)}</div></div></div>
          {slug === "stocks" && record.predictionEnabled && <div className="card p-5"><div className="field-label">Prediction</div><div className="space-y-2 text-sm"><div>1 week: <strong>{record.predictionOneWeek}</strong></div><div>1 month: <strong>{record.predictionOneMonth}</strong></div><div>3 months: <strong>{record.predictionThreeMonths}</strong></div>{record.confidence && <div>Confidence: <strong>{record.confidence}%</strong></div>}</div></div>}
        </aside>
      </div>
      <details className="card mt-8 overflow-hidden">
        <summary className="cursor-pointer px-5 py-5 text-sm font-bold">Edit this {config.singular.toLowerCase()}</summary>
        <div className="border-t border-line p-3 sm:p-5"><ModuleForm config={config} record={record} /></div>
      </details>
      <div className="mt-6 flex justify-end"><form action={deleteAction}><DeleteButton /></form></div>
    </>
  );
}
