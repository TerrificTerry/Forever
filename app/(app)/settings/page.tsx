import Link from "next/link";
import { changePasswordAction, changeSecondaryAction } from "@/app/actions/auth";
import { testAIAction, testStockAction } from "@/app/actions/settings";
import { PageHeading } from "@/components/page-heading";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Settings" };

function Status({ yes }: { yes: boolean }) { return <span className={`pill ${yes ? "rating-GREEN" : "rating-YELLOW"}`}>{yes ? "Configured" : "Not configured"}</span>; }

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const query = await searchParams;
  const aiReady = !!process.env.OPENAI_API_KEY;
  const stockProvider = process.env.STOCK_API_PROVIDER || "manual";
  const stockReady = stockProvider === "manual" || !!(process.env.ALPHA_VANTAGE_API_KEY || process.env.FINNHUB_API_KEY || process.env.TWELVE_DATA_API_KEY);
  return (
    <>
      <PageHeading eyebrow="Control room" title="Settings" description="Passwords can change here. Service keys stay in the server environment, where browser JavaScript cannot read them." actions={<Link className="button-secondary" href="/export">Export center</Link>} />
      <Flash error={query.error} notice={query.notice} />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="eyebrow">AI provider</div><h2 className="mt-2 font-serif text-2xl">OpenAI-compatible API</h2></div><Status yes={aiReady} /></div><dl className="mt-5 space-y-3 border-y border-line py-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-stone-500">Model</dt><dd className="font-bold">{process.env.OPENAI_MODEL || "gpt-4.1-mini"}</dd></div><div className="flex justify-between gap-4"><dt className="text-stone-500">Base URL</dt><dd className="max-w-[65%] truncate font-bold">{process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}</dd></div><div className="flex justify-between gap-4"><dt className="text-stone-500">API key</dt><dd className="font-bold">{aiReady ? "••••••••" : "Missing"}</dd></div></dl><p className="mt-4 text-xs leading-5 text-stone-500">Update OPENAI_API_KEY, OPENAI_BASE_URL, or OPENAI_MODEL in .env, then restart the app.</p><form action={testAIAction} className="mt-4"><SubmitButton className="button-secondary" pending="Testing…">Test AI connection</SubmitButton></form></section>
        <section className="card p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="eyebrow">Market data</div><h2 className="mt-2 font-serif text-2xl">Stock provider</h2></div><Status yes={stockReady} /></div><dl className="mt-5 space-y-3 border-y border-line py-4 text-sm"><div className="flex justify-between"><dt className="text-stone-500">Provider</dt><dd className="font-bold">{stockProvider}</dd></div><div className="flex justify-between"><dt className="text-stone-500">Fallback</dt><dd className="font-bold">Manual price checks</dd></div></dl><p className="mt-4 text-xs leading-5 text-stone-500">Set STOCK_API_PROVIDER and its matching key in .env. Manual mode is always available.</p><form action={testStockAction} className="mt-4 flex gap-2"><input className="field max-w-32" name="ticker" defaultValue="AAPL" /><SubmitButton className="button-secondary" pending="Testing…">Test provider</SubmitButton></form></section>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <PasswordCard title="Main password" action={changePasswordAction} />
        <PasswordCard title="Diary password" scope="diary" action={changeSecondaryAction} />
        <PasswordCard title="Private data password" scope="private" action={changeSecondaryAction} />
      </div>
      <section className="card mt-8 p-5 sm:p-7"><div className="eyebrow">Environment health</div><h2 className="mt-2 font-serif text-2xl">Production checklist</h2><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><Check ok={!!process.env.DATABASE_URL}>Database URL</Check><Check ok={!!process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 24}>Long auth secret</Check><Check ok={!!process.env.SETUP_TOKEN}>Setup token</Check><Check ok={process.env.NODE_ENV === "production"}>Production mode</Check></div></section>
    </>
  );
}

function PasswordCard({ title, scope, action }: { title: string; scope?: string; action: (formData: FormData) => Promise<void> }) {
  return <section className="card p-5"><h2 className="font-serif text-xl">{title}</h2><form action={action} className="mt-5 space-y-4">{scope && <input type="hidden" name="scope" value={scope} />}<div><label className="field-label">Current main password</label><input className="field" type="password" name="currentPassword" required /></div><div><label className="field-label">New password</label><input className="field" type="password" name="newPassword" minLength={8} required /></div><SubmitButton className="button-secondary" pending="Updating…">Update</SubmitButton></form></section>;
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) { return <div className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3"><span>{children}</span><span className={ok ? "text-emerald-700" : "text-amber-700"}>{ok ? "Ready" : "Review"}</span></div>; }
