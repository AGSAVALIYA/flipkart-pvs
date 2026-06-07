import { jsx as _jsx } from "react/jsx-runtime";
import { clsx } from "clsx";
export const Spinner = ({ size = "md", className, light = false, }) => {
    return (_jsx("div", { className: clsx("animate-spin rounded-full border-t-transparent", {
            "h-4 w-4 border-2": size === "sm",
            "h-8 w-8 border-3": size === "md",
            "h-12 w-12 border-4": size === "lg",
            "h-16 w-16 border-4": size === "xl",
        }, light
            ? "border-white"
            : "border-indigo-600 dark:border-indigo-400", className) }));
};
