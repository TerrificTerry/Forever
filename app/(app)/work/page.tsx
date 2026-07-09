import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Work" };

const workModules = [
  {
    href: "/leetcode",
    newHref: "/leetcode/new",
    label: "LeetCode reflections",
    description: "Problem prompt, concepts, multiple solutions, reflections, annotations, and AI critique.",
    countKey: "leetcode" as const,
  },
  {
    href: "/interview-practice",
    newHref: "/interview-practice/new",
    label: "Interview practice",
    description: "Questions, concepts, multiple answer attempts, reflection, and AI rehearsal feedback.",
    countKey: "interview" as const,
  },
];

export default async function WorkPage() {
  const [leetcode, interview] = await Promise.all([
    prisma.leetCodeReflection.count(),
    prisma.interviewPractice.count(),
  ]);
  const counts = { leetcode, interview };
  return (
    <>
      <PageHeading
        eyebrow="Work"
        title="Practice that compounds"
        description="A focused corner for interview prep: solve, explain, reflect, then let AI poke the weak spots."
        actions={<><Link className="button-secondary" href="/leetcode/new">New LeetCode</Link><Link className="button" href="/interview-practice/new">New interview practice</Link></>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {workModules.map((item) => (
          <section key={item.href} className="card flex min-h-56 flex-col p-5 sm:p-6">
            <div className="eyebrow">{item.label}</div>
            <h2 className="mt-4 font-serif text-2xl leading-snug tracking-[-.025em]">{counts[item.countKey]} records</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">{item.description}</p>
            <div className="mt-5 flex gap-2">
              <Link className="button-secondary min-h-9 px-4 text-xs" href={item.href}>Open</Link>
              <Link className="min-h-9 px-3 py-2 text-xs font-bold text-moss" href={item.newHref}>New</Link>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
