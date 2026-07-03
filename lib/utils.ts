export function formatDate(value: Date | string | null | undefined, withTime = false) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function dateInputValue(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date();
  return date.toISOString().slice(0, 10);
}

export function truncate(value: string | null | undefined, length = 180) {
  if (!value) return "No notes yet.";
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > length ? `${compact.slice(0, length).trim()}…` : compact;
}

export function safeNext(value: FormDataEntryValue | null, fallback = "/home") {
  const next = typeof value === "string" ? value : fallback;
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function csv(value: FormDataEntryValue | null) {
  return typeof value === "string"
    ? value.split(",").map((item) => item.trim()).filter(Boolean)
    : [];
}

export function optionalString(value: FormDataEntryValue | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

export function optionalNumber(value: FormDataEntryValue | null) {
  const normalized = optionalString(value);
  if (normalized === null) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function asDate(value: FormDataEntryValue | null) {
  const normalized = optionalString(value);
  const date = normalized ? new Date(`${normalized}T12:00:00`) : new Date();
  return Number.isNaN(date.valueOf()) ? new Date() : date;
}
