import React from "react";
import { format, subDays, startOfMonth } from "date-fns";
import { Calendar } from "lucide-react";
import { toISODate } from "@/lib/formatters";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
}) => {
  const handlePreset = (preset: "today" | "last7" | "last30" | "thisMonth") => {
    const end = new Date();
    let start = new Date();

    switch (preset) {
      case "today":
        start = new Date();
        break;
      case "last7":
        start = subDays(end, 6);
        break;
      case "last30":
        start = subDays(end, 29);
        break;
      case "thisMonth":
        start = startOfMonth(end);
        break;
    }

    onChange(toISODate(start), toISODate(end));
  };

  return (
    <div className="flex flex-col gap-3.5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-2">
          PRESETS:
        </span>
        {(["today", "last7", "last30", "thisMonth"] as const).map((preset) => (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200/40 dark:border-slate-800/40"
          >
            {preset === "today" && "Today"}
            {preset === "last7" && "Last 7 Days"}
            {preset === "last30" && "Last 30 Days"}
            {preset === "thisMonth" && "This Month"}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Start Date */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-lg px-3 py-2 w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-slate-400" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              START DATE
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChange(e.target.value, endDate)}
              className="bg-transparent border-0 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none p-0 mt-0.5"
            />
          </div>
        </div>

        <span className="text-slate-400 font-bold self-center hidden sm:inline">—</span>

        {/* End Date */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-lg px-3 py-2 w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-slate-400" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              END DATE
            </span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => onChange(startDate, e.target.value)}
              className="bg-transparent border-0 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none p-0 mt-0.5"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
