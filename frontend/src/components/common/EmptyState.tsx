import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = AlertCircle,
  title = "No Data Found",
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/30 dark:bg-slate-900/10">
      <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 border border-slate-200/40 dark:border-slate-800/40">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
export default EmptyState;
