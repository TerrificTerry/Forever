"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "button", pending = "Working…" }: { children: React.ReactNode; className?: string; pending?: string }) {
  const { pending: isPending } = useFormStatus();
  return <button className={className} type="submit" disabled={isPending}>{isPending ? pending : children}</button>;
}
