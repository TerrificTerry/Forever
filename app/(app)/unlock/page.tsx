import { redirect } from "next/navigation";
import { unlockAction } from "@/app/actions/auth";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { hasSecondaryAccess } from "@/lib/auth";

export const metadata = { title: "Unlock private area" };

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ scope?: string; next?: string; error?: string }> }) {
  const query = await searchParams;
  const scope = query.scope === "diary" ? "diary" : "private";
  const next = query.next || (scope === "diary" ? "/diary" : "/data-feed");
  if (await hasSecondaryAccess(scope)) redirect(next);
  return (
    <div className="mx-auto max-w-lg py-8 sm:py-16">
      <div className="eyebrow">Secondary lock</div>
      <h1 className="page-title">A little more privacy.</h1>
      <p className="page-lede">{scope === "diary" ? "Your diary has its own lock." : "Personal datasets and AI memories share a second private lock."} Unlocking lasts {process.env.SECONDARY_UNLOCK_MINUTES || 30} minutes on this session.</p>
      <div className="mt-8 card p-6 sm:p-8">
        <Flash error={query.error} />
        <form action={unlockAction}>
          <input type="hidden" name="scope" value={scope} /><input type="hidden" name="next" value={next} />
          <label className="field-label" htmlFor="password">{scope === "diary" ? "Diary" : "Private data"} password</label>
          <input className="field" id="password" name="password" type="password" autoFocus required />
          <div className="mt-5"><SubmitButton pending="Unlocking…">Unlock</SubmitButton></div>
        </form>
      </div>
    </div>
  );
}
