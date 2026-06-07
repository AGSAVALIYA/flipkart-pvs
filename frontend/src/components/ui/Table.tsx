import React from "react";
import { clsx } from "clsx";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}

export const Table: React.FC<TableProps> = ({ className, children, ...props }) => {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table
        className={clsx(
          "w-full text-left border-collapse text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900",
          className
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <thead
    className={clsx(
      "bg-slate-50 dark:bg-slate-800/40 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800",
      className
    )}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <tbody className={clsx("divide-y divide-slate-100 dark:divide-slate-800/50", className)} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  children,
  ...props
}) => (
  <tr
    className={clsx(
      "hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors duration-150",
      className
    )}
    {...props}
  >
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <th className={clsx("px-5 py-3.5 font-bold text-left", className)} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <td className={clsx("px-5 py-3.5 font-medium align-middle", className)} {...props}>
    {children}
  </td>
);
