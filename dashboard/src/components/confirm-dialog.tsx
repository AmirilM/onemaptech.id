"use client";

import { useCallback } from "react";
import type { KeyboardEvent } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  onConfirm,
  onCancel,
  destructive = false,
}: Props) {
  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    },
    [onConfirm, onCancel]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 [padding-bottom:env(safe-area-inset-bottom)]"
      onClick={onCancel}
    >
      {/* Backdrop: click outside cancels. */}
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
        onClick={(e) => {
          if (e.target === e.currentTarget) onCancel();
        }}
      />
      <div
        className="card-surface-strong max-w-md rounded-2xl border border-line p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        onKeyDown={handleKey}
        tabIndex={-1}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={20}
            aria-hidden
            className={`shrink-0 mt-0.5 ${
              destructive ? "text-danger" : "text-warning"
            }`}
          />
          <div className="min-w-0 flex-1">
            <h3
              id="confirm-dialog-title"
              className="text-lg font-bold text-ink"
            >
              {title}
            </h3>
            <p id="confirm-dialog-desc" className="mt-1 text-sm text-muted">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-lg border border-line px-4 py-2 text-sm text-soft hover:bg-violet-50 active:bg-violet-100"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              destructive
                ? "bg-danger hover:bg-danger/90"
                : "bg-primary hover:bg-primary-hover"
            } disabled:opacity-60`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
