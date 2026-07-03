import Link from "next/link";

export function AuthShell({ eyebrow, title, description, children, footer }: { eyebrow: string; title: string; description: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full border border-moss/10 bg-moss/5" />
      <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-stone-300/40" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 block text-center font-serif text-xl tracking-tight">Spirit Archive</Link>
        <section className="card bg-white/90 p-6 shadow-soft sm:p-9">
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.035em]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
          <div className="mt-7">{children}</div>
        </section>
        {footer && <div className="mt-5 text-center text-xs leading-5 text-stone-500">{footer}</div>}
      </div>
    </main>
  );
}
