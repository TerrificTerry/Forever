import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import { requireSecondary } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import { ModuleForm } from "@/components/module-form";
import { Flash } from "@/components/flash";

export default async function NewModuleRecordPage({ params, searchParams }: { params: Promise<{ module: string }>; searchParams: Promise<{ error?: string }> }) {
  const { module: slug } = await params;
  const config = getModule(slug);
  if (!config) notFound();
  if (config.secondary) await requireSecondary(config.secondary, `/${slug}/new`);
  const query = await searchParams;
  return (
    <>
      <PageHeading eyebrow={config.eyebrow} title={config.newLabel} description={`Add a new ${config.singular.toLowerCase()} to your private archive.`} />
      <Flash error={query.error} />
      <ModuleForm config={config} />
    </>
  );
}
