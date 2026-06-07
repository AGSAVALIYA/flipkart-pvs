import React from "react";
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: "success" | "error" | "warning" | "info" | "neutral";
}
export declare const Badge: React.FC<BadgeProps>;
export default Badge;
