import { saveModuleAction } from "@/app/actions/modules";
import type { ModuleConfig, ModuleField } from "@/lib/modules";
import { dateInputValue } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";

function initialValue(record: any, field: ModuleField) {
  if (!record) return field.type === "date" ? dateInputValue() : "";
  const value = record[field.name];
  if (field.type === "date") return dateInputValue(value);
  if (field.type === "tags") return (record.tags || []).map((tag: { name: string }) => tag.name).join(", ");
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

export function ModuleForm({ config, record }: { config: ModuleConfig; record?: any }) {
  const action = saveModuleAction.bind(null, config.slug, record?.id || null);
  return (
    <form action={action} className="card p-5 sm:p-7" encType="multipart/form-data">
      <div className="grid gap-5 sm:grid-cols-2">
        {config.fields.map((field) => {
          if (record && field.newOnly) return null;
          const value = initialValue(record, field);
          const required = !!field.required && !(record && field.type === "file");
          return (
            <div key={field.name} className={field.wide ? "sm:col-span-2" : ""}>
              {field.type === "checkbox" ? (
                <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-white px-4">
                  <input name={field.name} type="checkbox" defaultChecked={Boolean(record?.[field.name])} className="h-4 w-4 accent-moss" />
                  <span className="text-sm font-bold">{field.label}</span>
                </label>
              ) : (
                <>
                  <label className="field-label" htmlFor={field.name}>{field.label}{required ? " *" : ""}</label>
                  {field.type === "textarea" ? (
                    <textarea id={field.name} name={field.name} className="textarea" defaultValue={String(value)} placeholder={field.placeholder} required={required} />
                  ) : field.type === "select" ? (
                    <select id={field.name} name={field.name} className="field" defaultValue={String(value || field.options?.[0] || "")} required={required}>
                      {!required && <option value="">Not set</option>}
                      {field.options?.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
                    </select>
                  ) : field.type === "file" ? (
                    <input id={field.name} name={field.name} type="file" className="field py-2.5 file:mr-4 file:rounded-full file:border-0 file:bg-stone-100 file:px-3 file:py-1 file:text-xs file:font-bold" accept={field.accept} required={required} />
                  ) : (
                    <input id={field.name} name={field.name} type={field.type === "tags" ? "text" : field.type} step={field.type === "number" ? "any" : undefined} className="field" defaultValue={String(value)} placeholder={field.placeholder} required={required} />
                  )}
                </>
              )}
              {field.help && <p className="mt-2 text-xs leading-5 text-stone-500">{field.help}</p>}
            </div>
          );
        })}
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <SubmitButton pending="Saving…">Save {config.singular.toLowerCase()}</SubmitButton>
        <a href={`/${config.slug}`} className="button-secondary">Cancel</a>
        <span className="ml-auto hidden text-xs text-stone-400 sm:block">Stored privately in your archive</span>
      </div>
    </form>
  );
}
