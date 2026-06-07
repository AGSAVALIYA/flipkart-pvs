import React from "react";
import { clsx } from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  glass = false,
  hoverEffect = false,
  children,
  ...props
}) => {
  return (
    <div
      className={clsx(
        "rounded-2xl border transition-all duration-200 ease-in-out overflow-hidden",
        {
          "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-card": !glass,
          "bg-white/70 dark:bg-slate-900/65 backdrop-blur-md border-white/20 dark:border-slate-800/30 shadow-glass":
            glass,
          "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800/60 hover:-translate-y-0.5": hoverEffect,
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={clsx(
      "px-6 py-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4 bg-slate-50/20 dark:bg-slate-900/20",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={clsx("p-6", className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={clsx(
      "px-6 py-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-900/10 flex items-center justify-end gap-3",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
