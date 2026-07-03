import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Compare appearance" };

export default async function AppearanceComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const query = await searchParams;
  const records = await prisma.appearanceRecord.findMany({ orderBy: { date: "desc" }, take: 100 });
  const a = records.find((record) => record.id === query.a) || records[1] || records[0];
  const b = records.find((record) => record.id === query.b) || records[0];
  return (
    <>
      <PageHeading eyebrow="Side by side" title="Appearance comparison" description="Compare context and change without turning either photo into a score." actions={<Link href="/appearance" className="button-secondary">Back to timeline</Link>} />
      {records.length < 2 ? <div className="card px-6 py-14 text-center"><h2 className="font-serif text-2xl">Two photos make a comparison.</h2><p className="mt-2 text-sm text-stone-500">Add another appearance record, then return here.</p><Link href="/appearance/new" className="button mt-5">Add photo</Link></div> : <>
        <form className="card mb-6 grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Picker name="a" label="Earlier / A" records={records} selected={a?.id} />
          <Picker name="b" label="Later / B" records={records} selected={b?.id} />
          <button className="button-secondary" type="submit">Compare</button>
        </form>
        <div className="grid gap-5 md:grid-cols-2">{[a, b].map((record, index) => record && <article className="card overflow-hidden" key={`${record.id}-${index}`}><img src={`/api/files/${record.photoAttachmentId}`} alt={`Appearance record ${index ? "B" : "A"}`} className="aspect-[4/5] w-full bg-stone-100 object-contain" /><div className="p-5"><div className="eyebrow">Photo {index ? "B" : "A"} · {formatDate(record.date)}</div><h2 className="mt-2 font-serif text-xl">{record.context || "Appearance record"}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{record.note || "No notes for this photo."}</p><div className="mt-3 text-xs text-stone-500">{[record.hairstyle, record.outfit].filter(Boolean).join(" · ")}</div></div></article>)}</div>
      </>}
    </>
  );
}

function Picker({ name, label, records, selected }: { name: string; label: string; records: Array<{ id: string; date: Date; context: string | null }>; selected?: string }) {
  return <div><label className="field-label" htmlFor={name}>{label}</label><select className="field" id={name} name={name} defaultValue={selected}>{records.map((record) => <option key={record.id} value={record.id}>{formatDate(record.date)} · {record.context || "Untitled"}</option>)}</select></div>;
}
