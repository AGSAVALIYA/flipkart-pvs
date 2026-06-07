import React from "react";
interface EmptyStateProps {
    icon?: React.ComponentType<{
        className?: string;
    }>;
    title?: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}
export declare const EmptyState: React.FC<EmptyStateProps>;
export default EmptyState;
