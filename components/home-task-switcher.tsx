"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { saveTodayBoardAction, toggleTaskAction } from "@/app/actions/modules";
import { SubmitButton } from "@/components/submit-button";
import { formatDate } from "@/lib/utils";

type HomeTask = {
  id: string;
  title: string;
  dueDate: string | null;
  listName: string | null;
  priority: number | null;
  status: string;
};

const TODO_STORAGE_KEY = "forever-home-today-board";
const MODE_STORAGE_KEY = "forever-home-task-mode";

export function HomeTaskSwitcher({ tasks, taskCount, initialBoard = "" }: { tasks: HomeTask[]; taskCount: number; initialBoard?: string }) {
  const [mode, setMode] = useState<"tasks" | "board">("tasks");
  const [boardText, setBoardText] = useState(initialBoard);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!initialBoard) {
      const legacyDraft = localStorage.getItem(TODO_STORAGE_KEY) || "";
      if (legacyDraft) setBoardText(legacyDraft);
    }
    localStorage.removeItem(TODO_STORAGE_KEY);
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (savedMode === "tasks" || savedMode === "board") setMode(savedMode);
    setHydrated(true);
  }, [initialBoard]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [hydrated, mode]);

  const lineCount = boardText.trim() ? boardText.trim().split(/\n+/).filter(Boolean).length : 0;

  return (
    <section className="card mb-8 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-moss-soft/40 px-5 py-4 sm:px-6">
        <div>
          <div className="eyebrow">First things first</div>
          <h2 className="mt-1 font-serif text-2xl">{mode === "tasks" ? "Tasks" : "Todolist"}</h2>
          <div className="mt-1 text-xs text-stone-500">{mode === "tasks" ? `${taskCount} ${taskCount === 1 ? "task" : "tasks"} in view` : "Saved to your archive when you press Save."}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link className="text-xs font-bold text-moss" href="/tasks">View all</Link>
          <Link className="button-secondary min-h-9 px-4 text-xs" href="/tasks/new">Add task</Link>
          <button
            type="button"
            className="button-secondary min-h-9 px-4 text-xs"
            onClick={() => setMode((current) => current === "tasks" ? "board" : "tasks")}
            aria-pressed={mode === "board"}
          >
            {mode === "tasks" ? "Switch to board" : "Switch to tasks"}
          </button>
        </div>
      </div>

      {mode === "tasks" ? (
        tasks.length ? (
          <div className="divide-y divide-line">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 px-5 py-4 sm:px-6">
                <form action={toggleTaskAction.bind(null, task.id)}>
                  <SubmitButton aria-label={`Mark ${task.title} done`} title="Mark done" className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 bg-white text-xs text-moss hover:border-moss" pending="...">✓</SubmitButton>
                </form>
                <div className="min-w-0 flex-1">
                  <Link className="font-bold leading-6 hover:text-moss" href={`/tasks/${task.id}`}>{task.title}</Link>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                    {task.listName && <span>{task.listName}</span>}
                    {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
                    {task.priority && <span>Priority {task.priority}/5</span>}
                    {task.status === "IN_PROGRESS" && <span className="font-bold text-moss">In progress</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center sm:px-6">
            <p className="text-sm text-stone-500">Nothing waiting. Enjoy the suspicious calm.</p>
            <Link className="mt-3 inline-block text-sm font-bold text-moss" href="/tasks/new">Add your first task</Link>
          </div>
        )
      ) : (
        <form action={saveTodayBoardAction} className="bg-[#fcfbf8] px-5 py-5 sm:px-6 sm:py-6">
          <label className="mb-3 block text-xs font-bold uppercase tracking-[.18em] text-stone-500" htmlFor="home-todo-board">Todolist</label>
          <textarea
            id="home-todo-board"
            name="boardText"
            className="min-h-80 w-full resize-y rounded-2xl border border-line bg-paper px-4 py-4 font-mono text-sm leading-6 text-ink placeholder:text-stone-400 focus:border-moss focus:outline-none"
            placeholder="One line per thing. Put today’s loose plan here, or keep the same small rituals you repeat every day."
            value={boardText}
            onChange={(event) => setBoardText(event.target.value)}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
            <span>{lineCount ? `${lineCount} line${lineCount === 1 ? "" : "s"}` : "Empty board"}</span>
            <SubmitButton className="button-secondary min-h-9 px-4 text-xs" pending="Saving...">Save todolist</SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}
