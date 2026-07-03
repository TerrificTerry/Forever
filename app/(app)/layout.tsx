import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <AppShell>{children}</AppShell>;
}
