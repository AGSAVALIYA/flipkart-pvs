import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-200/50 dark:border-slate-800/50 mb-6 select-none">
      <div className="flex flex-col">
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
};
