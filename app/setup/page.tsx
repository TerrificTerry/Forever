import { redirect } from "next/navigation";
import { setupAction } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Create archive" };
export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await prisma.user.count()) > 0) redirect("/login");
  const { error } = await searchParams;
  const missing = ["DATABASE_URL", "AUTH_SECRET", "SETUP_TOKEN"].filter((key) => !process.env[key]);
  return (
    <AuthShell eyebrow="First-time setup" title="Create your archive." description="One account, three layers of privacy. You can change every password later." footer="Your OpenAI and stock API keys belong in .env, never in this browser form.">
      <Flash error={error || (missing.length ? `Missing environment variables: ${missing.join(", ")}` : undefined)} />
      <form action={setupAction} className="space-y-5">
        <div><label className="field-label" htmlFor="setupToken">Setup token</label><input className="field" id="setupToken" name="setupToken" type="password" required autoFocus /><p className="mt-2 text-xs text-stone-500">The SETUP_TOKEN value from your .env file.</p></div>
        <div><label className="field-label" htmlFor="email">Login email</label><input className="field" id="email" name="email" type="email" defaultValue={process.env.ADMIN_EMAIL || ""} required /></div>
        <div><label className="field-label" htmlFor="password">Main password</label><input className="field" id="password" name="password" type="password" minLength={8} required /></div>
        <div className="border-t border-line pt-5"><label className="field-label" htmlFor="diaryPassword">Diary secondary password</label><input className="field" id="diaryPassword" name="diaryPassword" type="password" minLength={8} required /></div>
        <div><label className="field-label" htmlFor="privatePassword">Private data secondary password</label><input className="field" id="privatePassword" name="privatePassword" type="password" minLength={8} required /><p className="mt-2 text-xs leading-5 text-stone-500">Protects Data Feed and My AI. Each unlock lasts {process.env.SECONDARY_UNLOCK_MINUTES || 30} minutes.</p></div>
        <SubmitButton className="button w-full" pending="Creating archive…">Create Spirit Archive</SubmitButton>
      </form>
    </AuthShell>
  );
}
