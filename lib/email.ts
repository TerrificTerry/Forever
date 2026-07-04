type SecondaryScope = "diary" | "private";

export function emailRecoveryConfigured() {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export async function sendSecondaryResetEmail({ to, link, scope }: { to: string; link: string; scope: SecondaryScope }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Email recovery is not configured. Add RESEND_API_KEY and EMAIL_FROM to .env, then restart the app.");
  }
  const label = scope === "diary" ? "Diary" : "Private data";
  const minutes = Math.max(5, Number(process.env.SECONDARY_RESET_MINUTES || 15));
  const appName = process.env.APP_NAME || "Spirit Archive";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${appName}: reset your ${label} password`,
      text: `A reset was requested for your ${label} password. Open this one-time link within ${minutes} minutes:\n\n${link}\n\nIf you did not request this, ignore this email. Your password has not changed.`,
      html: `<p>A reset was requested for your <strong>${label}</strong> password.</p><p><a href="${link}">Reset secondary password</a></p><p>This one-time link expires in ${minutes} minutes. If you did not request it, ignore this email.</p>`,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email provider returned ${response.status}: ${detail.slice(0, 200)}`);
  }
}
