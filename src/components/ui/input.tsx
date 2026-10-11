import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = Omit<React.ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  /** Mensaje de error; activa el estado de error. */
  error?: string;
  hint?: string;
};

export function Input({ id, label, error, hint, className, ...props }: InputProps) {
  const describedBy = [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "min-h-12 w-full rounded-lg border-2 bg-surface-2 px-4 text-lg text-foreground placeholder:text-muted",
          error ? "border-primary-text" : "border-border-strong",
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-primary-text">
          Error: {error}
        </p>
      ) : null}
    </div>
  );
}
