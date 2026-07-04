"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { clearSession, createSession, getSession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { safeNext } from "@/lib/utils";
import { sendSecondaryResetEmail } from "@/lib/email";

function message(path: string, key: "error" | "notice", value: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(value)}`);
}

export async function setupAction(formData: FormData) {
  if (await prisma.user.count()) redirect("/login");
  const token = String(formData.get("setupToken") || "");
  if (!process.env.SETUP_TOKEN || token !== process.env.SETUP_TOKEN) {
    message("/setup", "error", "The setup token is not correct.");
  }
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const diaryPassword = String(formData.get("diaryPassword") || "");
  const privatePassword = String(formData.get("privatePassword") || "");
  if (!email || !email.includes("@")) message("/setup", "error", "Enter a valid email address.");
  if ([password, diaryPassword, privatePassword].some((value) => value.length < 8)) {
    message("/setup", "error", "Each password must be at least 8 characters.");
  }
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      diaryPasswordHash: await hashPassword(diaryPassword),
      privatePasswordHash: await hashPassword(privatePassword),
    },
  });
  await createSession(user.id);
  redirect("/home?notice=Archive%20created");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = safeNext(formData.get("next"));
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    message("/login", "error", "Email or password is incorrect.");
  }
  await createSession(user.id);
  redirect(next);
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function unlockAction(formData: FormData) {
  const session = await requireUser();
  const scope = formData.get("scope") === "diary" ? "diary" : "private";
  const next = safeNext(formData.get("next"), scope === "diary" ? "/diary" : "/data-feed");
  const password = String(formData.get("password") || "");
  const hash = scope === "diary" ? session.user.diaryPasswordHash : session.user.privatePasswordHash;
  if (!(await verifyPassword(password, hash))) {
    redirect(`/unlock?scope=${scope}&next=${encodeURIComponent(next)}&error=${encodeURIComponent("That secondary password is incorrect.")}`);
  }
  const minutes = Math.max(1, Number(process.env.SECONDARY_UNLOCK_MINUTES || 30));
  const until = new Date(Date.now() + minutes * 60_000);
  await prisma.session.update({
    where: { id: session.id },
    data: scope === "diary" ? { diaryUnlockedUntil: until } : { privateUnlockedUntil: until },
  });
  redirect(next);
}

export async function changePasswordAction(formData: FormData) {
  const session = await requireUser();
  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  if (!(await verifyPassword(current, session.user.passwordHash))) {
    message("/settings", "error", "Current password is incorrect.");
  }
  if (next.length < 8) message("/settings", "error", "New password must be at least 8 characters.");
  await prisma.user.update({ where: { id: session.userId }, data: { passwordHash: await hashPassword(next) } });
  revalidatePath("/settings");
  message("/settings", "notice", "Main password updated.");
}

export async function changeSecondaryAction(formData: FormData) {
  const session = await requireUser();
  const current = String(formData.get("currentSecondaryPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const scope = formData.get("scope") === "diary" ? "diary" : "private";
  const currentHash = scope === "diary" ? session.user.diaryPasswordHash : session.user.privatePasswordHash;
  if (!(await verifyPassword(current, currentHash))) {
    message("/settings", "error", `Current ${scope === "diary" ? "Diary" : "Private data"} password is incorrect.`);
  }
  if (next.length < 8) message("/settings", "error", "New secondary password must be at least 8 characters.");
  const hash = await hashPassword(next);
  await prisma.user.update({
    where: { id: session.userId },
    data: scope === "diary" ? { diaryPasswordHash: hash } : { privatePasswordHash: hash },
  });
  await prisma.session.updateMany({
    where: { userId: session.userId },
    data: scope === "diary" ? { diaryUnlockedUntil: null } : { privateUnlockedUntil: null },
  });
  message("/settings", "notice", `${scope === "diary" ? "Diary" : "Private data"} password updated.`);
}

function resetTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestSecondaryResetAction(formData: FormData) {
  const session = await requireUser();
  const scope = formData.get("scope") === "diary" ? "diary" : "private";
  const dbScope = scope === "diary" ? "DIARY" : "PRIVATE";
  const recent = await prisma.secondaryResetToken.findFirst({
    where: { userId: session.userId, scope: dbScope, createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
  if (recent) message("/settings", "error", "Please wait one minute before requesting another reset email.");
  const token = randomBytes(32).toString("base64url");
  const minutes = Math.max(5, Number(process.env.SECONDARY_RESET_MINUTES || 15));
  const reset = await prisma.secondaryResetToken.create({
    data: { userId: session.userId, scope: dbScope, tokenHash: resetTokenHash(token), expiresAt: new Date(Date.now() + minutes * 60_000) },
  });
  const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  try {
    await sendSecondaryResetEmail({ to: session.user.email, scope, link: `${baseUrl}/secondary-reset/${token}` });
  } catch (error) {
    await prisma.secondaryResetToken.delete({ where: { id: reset.id } });
    message("/settings", "error", error instanceof Error ? error.message : "Recovery email could not be sent.");
  }
  message("/settings", "notice", `A one-time ${scope === "diary" ? "Diary" : "Private data"} reset link was sent to your account email.`);
}

export async function resetSecondaryWithTokenAction(token: string, formData: FormData) {
  const session = await requireUser();
  const next = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");
  const path = `/secondary-reset/${encodeURIComponent(token)}`;
  if (next.length < 8) message(path, "error", "New password must be at least 8 characters.");
  if (next !== confirm) message(path, "error", "The two passwords do not match.");
  const reset = await prisma.secondaryResetToken.findUnique({ where: { tokenHash: resetTokenHash(token) } });
  if (!reset || reset.userId !== session.userId || reset.usedAt || reset.expiresAt <= new Date()) {
    message(path, "error", "This reset link is invalid, expired, or already used.");
  }
  const hash = await hashPassword(next);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: reset.scope === "DIARY" ? { diaryPasswordHash: hash } : { privatePasswordHash: hash },
    }),
    prisma.secondaryResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.session.updateMany({
      where: { userId: session.userId },
      data: reset.scope === "DIARY" ? { diaryUnlockedUntil: null } : { privateUnlockedUntil: null },
    }),
  ]);
  message("/settings", "notice", `${reset.scope === "DIARY" ? "Diary" : "Private data"} password reset. The email link cannot be used again.`);
}
