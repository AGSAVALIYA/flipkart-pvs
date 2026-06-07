import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { clsx } from "clsx";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBg?: string;
  description?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  icon: Icon,
  iconColor = "text-blue-600 dark:text-blue-400",
  iconBg = "bg-blue-50 dark:bg-blue-950/40",
  description,
}) => {
  return (
    <Card hoverEffect>
      <CardContent className="flex items-center gap-4.5 p-6">
        {/* Icon wrapper */}
        <div className={clsx("h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-100 dark:border-slate-800", iconBg)}>
          <Icon className={clsx("h-5.5 w-5.5", iconColor)} />
        </div>

        {/* Stats text info */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {label}
          </span>
          <h3 className="text-2xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight mt-0.5 font-technical">
            {value}
          </h3>
          {description && (
            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold tracking-wide mt-1 truncate">
              {description}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
export default StatsCard;
