import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { clsx } from "clsx";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info", duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, message, variant, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
      {/* Toast Portal Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastCardProps {
  toast: ToastItem;
  onClose: () => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onClose }) => {
  const { message, variant } = toast;

  return (
    <div
      className={clsx(
        "pointer-events-auto flex items-start gap-3.5 px-4 py-3.5 rounded-xl border shadow-xl animate-slide-up bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 transition-all duration-300",
        {
          "border-l-4 border-l-emerald-500": variant === "success",
          "border-l-4 border-l-rose-500": variant === "error",
          "border-l-4 border-l-amber-500": variant === "warning",
          "border-l-4 border-l-cyan-500": variant === "info",
        }
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {variant === "success" && <CheckCircle className="h-5 w-5 text-emerald-500" />}
        {variant === "error" && <XCircle className="h-5 w-5 text-rose-500" />}
        {variant === "warning" && <AlertCircle className="h-5 w-5 text-amber-500" />}
        {variant === "info" && <Info className="h-5 w-5 text-cyan-500" />}
      </div>
      <div className="flex-grow text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-wide select-none">
        {message}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
