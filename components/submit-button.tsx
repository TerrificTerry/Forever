"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pending?: string;
};

export function SubmitButton({ children, className = "button", pending = "Working…", disabled, type, ...props }: SubmitButtonProps) {
  const { pending: isPending } = useFormStatus();
  return <button {...props} className={className} type={type || "submit"} disabled={disabled || isPending}>{isPending ? pending : children}</button>;
}
