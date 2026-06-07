import React from "react";
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    glass?: boolean;
    hoverEffect?: boolean;
}
export declare const Card: React.FC<CardProps>;
export declare const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export declare const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export declare const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export {};
