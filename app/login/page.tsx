import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  if ((await getSession())) redirect("/home");
  if ((await prisma.user.count()) === 0) redirect("/setup");
  const query = await searchParams;
  return (
    <AuthShell eyebrow="Private access" title="Welcome back." description="Open the archive and pick up where you left off." footer="No registration. No social feed. Just your own record.">
      <Flash error={query.error} />
      <form action={loginAction} className="space-y-5">
        <input type="hidden" name="next" value={query.next || "/home"} />
        <div><label className="field-label" htmlFor="email">Email</label><input className="field" id="email" name="email" type="email" autoComplete="username" required autoFocus /></div>
        <div><label className="field-label" htmlFor="password">Password</label><input className="field" id="password" name="password" type="password" autoComplete="current-password" required /></div>
        <SubmitButton className="button w-full" pending="Opening archive…">Log in</SubmitButton>
      </form>
    </AuthShell>
  );
}
