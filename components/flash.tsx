export function Flash({ error, notice }: { error?: string; notice?: string }) {
  if (!error && !notice) return null;
  return (
    <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`} role="status">
      {error || notice}
    </div>
  );
}
