import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatNumber } from "@/lib/formatters";

interface PaginationBarProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  pageSize,
  totalItems,
  totalPages,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  isLoading = false,
}) => {
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        Showing {formatNumber(startItem)}-{formatNumber(endItem)} of {formatNumber(totalItems)} {itemLabel}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Rows</span>
            <Select
              size="sm"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
              options={pageSizeOptions.map((option) => ({
                value: option,
                label: String(option),
              }))}
              className="w-18"
            />
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || isLoading}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Page {formatNumber(page)} of {formatNumber(Math.max(totalPages, 1))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || totalPages === 0 || isLoading}
            className="gap-1.5"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaginationBar;
