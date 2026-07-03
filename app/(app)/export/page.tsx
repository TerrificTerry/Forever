import { PageHeading } from "@/components/page-heading";

export const metadata = { title: "Export" };

export default function ExportPage() {
  return (
    <>
      <PageHeading eyebrow="Your data, portable" title="Export center" description="Download human-readable diary files or a complete machine-readable archive whenever you want." />
      <div className="grid gap-5 md:grid-cols-3">
        <ExportCard title="Diary · Markdown" text="A readable document with dates, tags, and full reflections." href="/api/diary/export?format=markdown" />
        <ExportCard title="Diary · JSON" text="Structured diary data for backup or migration." href="/api/diary/export?format=json" />
        <ExportCard title="Full archive · JSON" text="All record modules and tags in one dated export." href="/api/export/all" />
      </div>
      <section className="card mt-8 p-6"><h2 className="font-serif text-2xl">A complete backup has three parts.</h2><ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-stone-600"><li>PostgreSQL database dump</li><li>The uploads directory</li><li>Your .env file, stored separately and encrypted</li></ol><p className="mt-4 text-sm text-stone-600">Exact backup and restore commands are in the project README.</p></section>
    </>
  );
}

function ExportCard({ title, text, href }: { title: string; text: string; href: string }) { return <article className="card flex flex-col p-6"><h2 className="font-serif text-xl">{title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-stone-500">{text}</p><a className="button-secondary mt-6" href={href}>Download</a></article>; }
