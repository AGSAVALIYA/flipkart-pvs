import React from "react";
import { clsx } from "clsx";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "error" | "warning" | "info" | "neutral";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  children,
  ...props
}) => {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors duration-150 select-none",
        {
          "bg-green-50 text-green-700 border-green-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30":
            variant === "success",
          "bg-red-50 text-red-700 border-red-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30":
            variant === "error",
          "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30":
            variant === "warning",
          "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30":
            variant === "info",
          "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700/50":
            variant === "neutral",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
export default Badge;
