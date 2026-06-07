import React from "react";
import { clsx } from "clsx";

interface ProgressBarProps {
  value: number; // 0 to 100
  className?: string;
  showText?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  className,
  showText = false,
  label,
}) => {
  const percent = Math.min(100, Math.max(0, value));

  return (
    <div className={clsx("w-full flex flex-col gap-1.5", className)}>
      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/10">
        <div
          className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
      {showText && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 tracking-wider">
          <span>{label || "PROGRESS"}</span>
          <span>{percent.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
};
