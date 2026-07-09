export type RepeatableItem = Record<string, string>;
export type RepeatableSubField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select";
  options?: string[];
  defaultValue?: string;
  placeholder?: string;
  wide?: boolean;
};

export function emptyRepeatableItem(fields: RepeatableSubField[]) {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue || ""]));
}

export function normalizeRepeatableItems(value: unknown, fields?: RepeatableSubField[]) {
  let raw = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      raw = [];
    }
  }
  if (!Array.isArray(raw)) return fields ? [emptyRepeatableItem(fields)] : [];
  const items = raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const entries = fields?.length ? fields.map((field) => [field.name, item[field.name] ?? field.defaultValue ?? ""]) : Object.entries(item);
      return Object.fromEntries(entries.map(([key, itemValue]) => [key, typeof itemValue === "string" ? itemValue : itemValue == null ? "" : String(itemValue)])) as RepeatableItem;
    })
    .filter((item) => Object.values(item).some((itemValue) => itemValue.trim()));
  return items.length ? items : fields ? [emptyRepeatableItem(fields)] : [];
}

export function compactRepeatableItems(value: unknown) {
  return normalizeRepeatableItems(value)
    .map((item) => Object.fromEntries(Object.entries(item).map(([key, itemValue]) => [key, itemValue.trim()])))
    .filter((item) => Object.entries(item).some(([key, itemValue]) => key !== "language" && Boolean(itemValue)));
}
