import React from "react";
interface StatsCardProps {
    label: string;
    value: string | number;
    icon: React.ComponentType<{
        className?: string;
    }>;
    iconColor?: string;
    iconBg?: string;
    description?: string;
}
export declare const StatsCard: React.FC<StatsCardProps>;
export default StatsCard;
