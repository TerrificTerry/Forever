"use client";

import { useEffect, useState } from "react";

type Performance = { label: string; value: number | null; pending: boolean };

export function StockPerformance({ id, provider, predictions }: { id: string; provider: string; predictions: { oneWeek?: string | null; oneMonth?: string | null; threeMonths?: string | null } }) {
  const [data, setData] = useState<Performance[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (provider === "manual") return;
    let active = true;
    fetch(`/api/stocks/${id}/performance`, { credentials: "same-origin" })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Market data failed."); return body.performance as Performance[]; })
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Market data failed."); });
    return () => { active = false; };
  }, [id, provider]);
  if (provider === "manual") return null;
  return (
    <section className="card mt-6 p-5 sm:p-6">
      <div className="flex items-center justify-between"><div><div className="eyebrow">Since decision</div><h2 className="mt-2 font-serif text-2xl">Market performance</h2></div><span className="pill">{provider}</span></div>
      {!data && !error && <p className="mt-5 text-sm text-stone-500">Loading prices from the configured provider…</p>}
      {error && <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{error} Manual checks remain available below.</p>}
      {data && <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">{data.map((item) => <div className="rounded-xl border border-line bg-white px-3 py-3 text-center" key={item.label}><div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{item.label}</div><div className={`mt-1 text-sm font-bold ${(item.value || 0) > 0 ? "text-emerald-700" : (item.value || 0) < 0 ? "text-red-700" : "text-stone-500"}`}>{item.pending ? "Pending" : item.value === null ? "N/A" : `${item.value >= 0 ? "+" : ""}${item.value.toFixed(1)}%`}</div></div>)}</div>}
      {data && <PredictionResults data={data} predictions={predictions} />}
    </section>
  );
}

function PredictionResults({ data, predictions }: { data: Performance[]; predictions: { oneWeek?: string | null; oneMonth?: string | null; threeMonths?: string | null } }) {
  const rows = [["1W", predictions.oneWeek], ["1M", predictions.oneMonth], ["3M", predictions.threeMonths]] as const;
  const completed = rows.map(([period, prediction]) => ({ period, prediction, result: data.find((item) => item.label === period) })).filter((row) => row.prediction && row.prediction !== "UNKNOWN" && row.result?.value !== null && !row.result?.pending);
  if (!completed.length) return null;
  return <div className="mt-5 border-t border-line pt-4"><div className="field-label">Prediction check</div><div className="space-y-2">{completed.map(({ period, prediction, result }) => { const value = result!.value!; const actual = Math.abs(value) < 0.5 ? "FLAT" : value > 0 ? "UP" : "DOWN"; const correct = actual === prediction; return <div className="flex items-center gap-2 text-sm" key={period}><strong>{period}</strong><span className="text-stone-500">Predicted {prediction}, actual {actual}</span><span className={`ml-auto font-bold ${correct ? "text-emerald-700" : "text-red-700"}`}>{correct ? "Correct" : "Incorrect"}</span></div>; })}</div></div>;
}
