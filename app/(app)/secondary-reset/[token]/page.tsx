import Link from "next/link";
import { createHash } from "crypto";
import { notFound } from "next/navigation";
import { resetSecondaryWithTokenAction } from "@/app/actions/auth";
import { Flash } from "@/components/flash";
import { PageHeading } from "@/components/page-heading";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Reset secondary password" };

export default async function SecondaryResetPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const session = await requireUser();
  const { token } = await params;
  const query = await searchParams;
  const reset = await prisma.secondaryResetToken.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") } });
  if (!reset || reset.userId !== session.userId) notFound();
  const valid = !reset.usedAt && reset.expiresAt > new Date();
  const label = reset.scope === "DIARY" ? "Diary" : "Private data";
  return (
    <>
      <PageHeading eyebrow="Email recovery" title={`Reset ${label} password`} description="This link is tied to your account, expires quickly, and can only be used once." />
      <Flash error={query.error} />
      {valid ? <form action={resetSecondaryWithTokenAction.bind(null, token)} className="card mx-auto max-w-xl space-y-5 p-6 sm:p-8">
        <div><label className="field-label" htmlFor="newPassword">New {label} password</label><input className="field" id="newPassword" name="newPassword" type="password" minLength={8} required autoFocus /></div>
        <div><label className="field-label" htmlFor="confirmPassword">Confirm new password</label><input className="field" id="confirmPassword" name="confirmPassword" type="password" minLength={8} required /></div>
        <SubmitButton pending="Resetting…">Reset secondary password</SubmitButton>
      </form> : <div className="card mx-auto max-w-xl p-8 text-center"><h2 className="font-serif text-2xl">This link is no longer valid.</h2><p className="mt-2 text-sm text-stone-500">It has expired or was already used. Request another link from Settings.</p><Link className="button-secondary mt-5" href="/settings">Return to Settings</Link></div>}
    </>
  );
}
