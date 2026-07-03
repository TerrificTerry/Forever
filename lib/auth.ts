import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "spirit_session";

function digest(value: string) {
  return createHmac("sha256", process.env.AUTH_SECRET || "spirit-archive-development-only").update(value).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const days = Math.max(1, Number(process.env.SESSION_DAYS || 30));
  const expiresAt = new Date(Date.now() + days * 86_400_000);
  await prisma.session.create({ data: { userId, tokenHash: digest(token), expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: digest(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session;
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function hasSecondaryAccess(scope: "diary" | "private") {
  const session = await getSession();
  if (!session) return false;
  const until = scope === "diary" ? session.diaryUnlockedUntil : session.privateUnlockedUntil;
  return !!until && until > new Date();
}

export async function requireSecondary(scope: "diary" | "private", next: string) {
  await requireUser();
  if (!(await hasSecondaryAccess(scope))) {
    redirect(`/unlock?scope=${scope}&next=${encodeURIComponent(next)}`);
  }
}

export async function verifyPassword(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}

export async function hashPassword(value: string) {
  return bcrypt.hash(value, 12);
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete(SESSION_COOKIE);
}
