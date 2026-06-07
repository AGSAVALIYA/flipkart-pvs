import { jsx as _jsx } from "react/jsx-runtime";
import { clsx } from "clsx";
export const Skeleton = ({ className, variant = "rectangle", ...props }) => {
    return (_jsx("div", { className: clsx("animate-pulse bg-slate-200 dark:bg-slate-800", {
            "rounded-md h-4 w-full": variant === "text",
            "rounded-full h-10 w-10": variant === "circle",
            "rounded-lg h-24 w-full": variant === "rectangle",
        }, className), ...props }));
};
