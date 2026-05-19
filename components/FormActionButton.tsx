"use client";

import { useFormStatus } from "react-dom";

type FormActionButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className: string;
};

export function FormActionButton({ idleLabel, pendingLabel, className }: FormActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
