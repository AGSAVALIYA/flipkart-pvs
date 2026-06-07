import React from "react";
import { ValidationStatus } from "@/api/types";
interface StatusBadgeProps {
    status: string | ValidationStatus;
}
export declare const StatusBadge: React.FC<StatusBadgeProps>;
export {};
