import { getModule } from "@/lib/modules";
import { PageHeading } from "@/components/page-heading";
import { ModuleForm } from "@/components/module-form";
import { Flash } from "@/components/flash";

export default async function QuickAddGamePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const config = getModule("game")!;
  const quick = { ...config, singular: "Game reflection", fields: config.fields.filter((field) => ["date", "gameName", "hero", "role", "result", "kills", "deaths", "assists", "summary", "winningMove", "badMove", "nextReminder"].includes(field.name)) };
  const query = await searchParams;
  return (
    <>
      <PageHeading eyebrow="30-second review" title="Before the next match." description="Capture the result, one useful truth, and the reminder you want fresh in your head." />
      <Flash error={query.error} />
      <ModuleForm config={quick} />
    </>
  );
}
