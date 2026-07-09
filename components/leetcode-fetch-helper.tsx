"use client";

import { useState } from "react";
import type { MouseEvent } from "react";

type FetchState = "idle" | "loading" | "success" | "error";

function setFormValue(form: HTMLFormElement, name: string, value: string | string[] | null | undefined) {
  const element = form.elements.namedItem(name);
  if (!element) return;
  const normalized = Array.isArray(value) ? value.join(", ") : value || "";
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    element.value = normalized;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function LeetCodeFetchHelper() {
  const [state, setState] = useState<FetchState>("idle");
  const [message, setMessage] = useState("Enter a problem number, then fetch the public LeetCode prompt.");

  async function fetchProblem(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const formData = new FormData(form);
    const problemNumber = String(formData.get("problemNumber") || "").trim();
    if (!problemNumber) {
      setState("error");
      setMessage("Add a LeetCode problem number first.");
      return;
    }
    setState("loading");
    setMessage("Fetching from LeetCode...");
    try {
      const response = await fetch(`/api/leetcode/problem?number=${encodeURIComponent(problemNumber)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not fetch that problem.");
      setFormValue(form, "title", payload.title);
      setFormValue(form, "difficulty", payload.difficulty);
      setFormValue(form, "topics", payload.topics);
      setFormValue(form, "sourceUrl", payload.sourceUrl);
      setFormValue(form, "problemDescription", payload.problemDescription);
      setState("success");
      setMessage(`Filled #${payload.problemNumber} ${payload.title}.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not fetch that problem.");
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-line bg-moss-soft/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-bold">LeetCode auto-fill</div>
          <p className={`mt-1 text-xs leading-5 ${state === "error" ? "text-red-700" : state === "success" ? "text-emerald-700" : "text-stone-500"}`}>{message}</p>
        </div>
        <button type="button" className="button-secondary min-h-9 px-4 text-xs" onClick={fetchProblem} disabled={state === "loading"}>
          {state === "loading" ? "Fetching..." : "Fetch problem"}
        </button>
      </div>
    </section>
  );
}
