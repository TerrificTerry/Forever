"use client";

import { useMemo, useState } from "react";
import { emptyRepeatableItem, normalizeRepeatableItems, type RepeatableItem, type RepeatableSubField } from "@/lib/repeatable";

type RepeatableFieldProps = {
  name: string;
  label: string;
  initialItems: unknown;
  itemLabel: string;
  addLabel: string;
  fields: RepeatableSubField[];
  minItems?: number;
  help?: string;
};

export function RepeatableField({ name, label, initialItems, itemLabel, addLabel, fields, minItems = 1, help }: RepeatableFieldProps) {
  const firstItem = useMemo(() => emptyRepeatableItem(fields), [fields]);
  const [items, setItems] = useState<RepeatableItem[]>(() => {
    const normalized = normalizeRepeatableItems(initialItems, fields);
    return normalized.length ? normalized : [firstItem];
  });

  function updateItem(index: number, fieldName: string, value: string) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [fieldName]: value } : item));
  }

  function addItem() {
    setItems((current) => [...current, emptyRepeatableItem(fields)]);
  }

  function removeItem(index: number) {
    setItems((current) => current.length <= minItems ? current : current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="field-label mb-0">{label}</div>
          {help && <p className="mt-1 text-xs leading-5 text-stone-500">{help}</p>}
        </div>
        <button type="button" className="button-secondary min-h-9 px-4 text-xs" onClick={addItem}>{addLabel}</button>
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <section key={index} className="rounded-2xl border border-line bg-[#fcfbf8] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold">{itemLabel} {index + 1}</h3>
              {items.length > minItems && (
                <button type="button" className="text-xs font-bold text-red-700 hover:underline" onClick={() => removeItem(index)}>
                  Remove
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.name} className={field.wide || field.type === "textarea" ? "sm:col-span-2" : ""}>
                  <label className="field-label" htmlFor={`${name}-${index}-${field.name}`}>{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      id={`${name}-${index}-${field.name}`}
                      className="textarea min-h-32"
                      value={item[field.name] || ""}
                      placeholder={field.placeholder}
                      onChange={(event) => updateItem(index, field.name, event.target.value)}
                    />
                  ) : (
                    <input
                      id={`${name}-${index}-${field.name}`}
                      className="field"
                      value={item[field.name] || ""}
                      placeholder={field.placeholder}
                      onChange={(event) => updateItem(index, field.name, event.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
