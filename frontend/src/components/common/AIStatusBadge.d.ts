import React from "react";
import { type ValidationResponse } from "@/api/types";
interface AIStatusBadgeProps {
    processingStatus?: ValidationResponse["ai_processing_status"];
    matchResult?: ValidationResponse["ai_match_result"];
}
export declare const AIStatusBadge: React.FC<AIStatusBadgeProps>;
export {};
