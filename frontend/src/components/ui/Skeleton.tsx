import React from "react";
import { clsx } from "clsx";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circle" | "rectangle";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "rectangle",
  ...props
}) => {
  return (
    <div
      className={clsx(
        "animate-pulse bg-slate-200 dark:bg-slate-800",
        {
          "rounded-md h-4 w-full": variant === "text",
          "rounded-full h-10 w-10": variant === "circle",
          "rounded-lg h-24 w-full": variant === "rectangle",
        },
        className
      )}
      {...props}
    />
  );
};
