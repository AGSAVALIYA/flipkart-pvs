import React from "react";
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "text" | "circle" | "rectangle";
}
export declare const Skeleton: React.FC<SkeletonProps>;
export {};
