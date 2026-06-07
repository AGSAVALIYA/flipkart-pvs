import React from "react";
import { clsx } from "clsx";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  light?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  className,
  light = false,
}) => {
  return (
    <div
      className={clsx(
        "animate-spin rounded-full border-t-transparent",
        {
          "h-4 w-4 border-2": size === "sm",
          "h-8 w-8 border-3": size === "md",
          "h-12 w-12 border-4": size === "lg",
          "h-16 w-16 border-4": size === "xl",
        },
        light
          ? "border-white"
          : "border-indigo-600 dark:border-indigo-400",
        className
      )}
    />
  );
};
