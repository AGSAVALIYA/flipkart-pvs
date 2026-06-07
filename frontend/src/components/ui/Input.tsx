import React from "react";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, icon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col w-full gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-slate-450 dark:text-slate-500">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={clsx(
              "w-full rounded-xl border text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100",
              icon ? "pl-10 pr-4 py-2.5" : "px-4 py-2.5",
              error
                ? "border-red-500 focus:ring-red-500/30 focus:border-red-500"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider animate-fade-in">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
