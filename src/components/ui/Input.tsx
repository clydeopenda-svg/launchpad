import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label. Every input has one, for accessibility. */
  label: string;
  /** Hide the label visually but keep it for screen readers. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
}

export function Input({ label, hideLabel, hint, error, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={cn("text-sm font-medium", hideLabel && "sr-only")}>
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={cn(
          "min-h-11 w-full rounded-card border bg-surface px-3 text-base placeholder:text-muted",
          "focus:outline-2 focus:outline-offset-1 focus:outline-primary",
          error ? "border-danger" : "border-border",
          className,
        )}
        {...props}
      />
      {/* Errors only appear after a submit (wrong staff PIN, unknown check-in
          code), while focus is still on the submit button. role="alert" makes
          screen readers announce the message instead of leaving the user
          unaware that anything went wrong. The forms clear the error before
          each submit, so a repeated failure re-mounts it and is announced again. */}
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
