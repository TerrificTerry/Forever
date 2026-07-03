import { dateInputValue } from "@/lib/utils";
import { diaryRangeSummaryAction, gameStyleSummaryAction, generateQuestionsAction } from "@/app/actions/modules";
import { SubmitButton } from "@/components/submit-button";

export function ModuleTools({ slug, latestReview }: { slug: string; latestReview?: { title: string; content: string; createdAt: Date } | null }) {
  if (slug === "questions") {
    return (
      <section className="card mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="text-sm font-bold">Need a useful question?</div><p className="mt-1 text-xs leading-5 text-stone-500">AI reads a small set of recent records and adds three ideas. You remain the editor.</p></div>
        <form action={generateQuestionsAction}><SubmitButton className="button-secondary" pending="Thinking…">AI generate ideas</SubmitButton></form>
      </section>
    );
  }
  if (slug === "diary") {
    const start = new Date(); start.setDate(start.getDate() - 30);
    return (
      <>
        <section className="card mb-8 p-5 sm:p-6">
          <div className="mb-4"><div className="text-sm font-bold">AI summary for a date range</div><p className="mt-1 text-xs text-stone-500">Turn a stretch of entries into patterns and details worth keeping.</p></div>
          <form action={diaryRangeSummaryAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
            <div><label className="field-label" htmlFor="start">From</label><input className="field" id="start" name="start" type="date" defaultValue={dateInputValue(start)} /></div>
            <div><label className="field-label" htmlFor="end">To</label><input className="field" id="end" name="end" type="date" defaultValue={dateInputValue()} /></div>
            <div><label className="field-label" htmlFor="style">Style</label><select className="field" id="style" name="style"><option>concise</option><option>detailed</option><option>emotional timeline</option><option>future self letter</option><option>key events only</option></select></div>
            <SubmitButton className="button-secondary" pending="Summarizing…">Summarize</SubmitButton>
          </form>
        </section>
        {latestReview && <ReviewCard review={latestReview} />}
      </>
    );
  }
  if (slug === "game") {
    return (
      <>
        <section className="card mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="text-sm font-bold">AI game style review</div><p className="mt-1 text-xs leading-5 text-stone-500">Find repeated wins, losses, and the next training focus.</p></div>
          <form action={gameStyleSummaryAction} className="flex gap-2"><select className="field min-w-32" name="count" defaultValue="10"><option value="5">Last 5</option><option value="10">Last 10</option><option value="20">Last 20</option></select><SubmitButton className="button-secondary" pending="Reviewing…">Analyze</SubmitButton></form>
        </section>
        {latestReview && <ReviewCard review={latestReview} />}
      </>
    );
  }
  return null;
}

function ReviewCard({ review }: { review: { title: string; content: string; createdAt: Date } }) {
  return (
    <details className="card mb-8 overflow-hidden" open>
      <summary className="cursor-pointer px-5 py-4 text-sm font-bold">Latest review · {review.title}</summary>
      <div className="border-t border-line bg-[#fcfbf8] px-5 py-5 prose-private">{review.content}</div>
    </details>
  );
}
