import React from "react";

import { AIProcessingStatus, type ValidationResponse } from "@/api/types";
import { Badge } from "@/components/ui/Badge";

interface AIStatusBadgeProps {
  processingStatus?: ValidationResponse["ai_processing_status"];
  matchResult?: ValidationResponse["ai_match_result"];
}

export const AIStatusBadge: React.FC<AIStatusBadgeProps> = ({
  processingStatus,
  matchResult,
}) => {
  if (!processingStatus) {
    if (matchResult === "MATCH") {
      return <Badge variant="success">AI match</Badge>;
    }
    if (matchResult === "INCONCLUSIVE") {
      return <Badge variant="warning">AI inconclusive</Badge>;
    }
    if (matchResult === "MISMATCH") {
      return <Badge variant="error">AI mismatch</Badge>;
    }
    return <Badge variant="neutral">Not processed</Badge>;
  }

  switch (processingStatus) {
    case AIProcessingStatus.QUEUED:
      return <Badge variant="info">AI queued</Badge>;
    case AIProcessingStatus.PROCESSING:
      return <Badge variant="info">AI processing</Badge>;
    case AIProcessingStatus.FAILED:
      return <Badge variant="error">AI failed</Badge>;
    case AIProcessingStatus.NOT_REQUESTED:
      return <Badge variant="neutral">Manual AI</Badge>;
    case AIProcessingStatus.NOT_ALLOWED:
      return <Badge variant="neutral">AI disabled</Badge>;
    case AIProcessingStatus.COMPLETED:
      if (matchResult === "MATCH") {
        return <Badge variant="success">AI match</Badge>;
      }
      if (matchResult === "INCONCLUSIVE") {
        return <Badge variant="warning">AI inconclusive</Badge>;
      }
      if (matchResult === "MISMATCH") {
        return <Badge variant="error">AI mismatch</Badge>;
      }
      return <Badge variant="success">AI completed</Badge>;
    default:
      return <Badge variant="neutral">AI pending</Badge>;
  }
};