import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  // Prevent background scroll when dialog is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10050]">
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative flex min-h-full items-start justify-center overflow-y-auto p-4 md:items-center md:p-6">
        <div
          role="dialog"
          aria-modal="true"
          className={clsx(
            "relative z-10 my-auto flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-scale-in dark:border-slate-800 dark:bg-slate-900 max-h-[calc(100vh-2rem)] overflow-hidden md:p-6",
            !className?.includes("max-w-") && "max-w-lg",
            className,
          )}
        >
          {(title || typeof onClose === "function") && (
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800/60">
              {title ? (
                <h3 className="min-w-0 break-words text-base font-bold tracking-wide text-slate-800 dark:text-slate-100">
                  {title}
                </h3>
              ) : <div />}
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex-shrink-0 rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100 transition-all duration-150 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          <div className="min-h-0 flex-grow overflow-y-auto px-4 py-1">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
