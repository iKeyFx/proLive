"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  pendingLabel?: string;
  /** "danger" renders the confirm button in the market-down red. */
  tone?: "default" | "danger";
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Confirmation modal on the native <dialog> element — showModal() gives focus
 * trapping, Escape-to-cancel, and a ::backdrop for free. Focus lands on Cancel
 * first, so an accidental double-press can never confirm a destructive action.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  pendingLabel,
  tone = "default",
  pending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        // Escape key: block while pending, otherwise close through state.
        e.preventDefault();
        if (!pending) onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself, not its children).
        if (!pending && e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(92vw,24rem)] rounded-lg border border-line bg-ink-800 p-0 text-text-hi shadow-xl backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-2 p-5">
        <h2 id="confirm-title" className="font-display text-base font-medium">
          {title}
        </h2>
        <p className="text-sm text-text-lo">{body}</p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-line px-3 py-2 text-sm text-text-hi hover:bg-ink-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-md px-3 py-2 text-sm font-medium text-ink-900 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
              tone === "danger" ? "bg-down" : "bg-signal"
            }`}
          >
            {pending ? pendingLabel ?? confirmLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
