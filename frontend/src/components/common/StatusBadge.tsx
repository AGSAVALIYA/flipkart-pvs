import React from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ValidationStatus } from "@/api/types";

interface StatusBadgeProps {
  status: string | ValidationStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const cleanStatus = String(status).toUpperCase();

  switch (cleanStatus) {
    case "VERIFIED":
    case "MATCH":
      return (
        <Badge variant="success" className="gap-1.5 px-2 py-0.75">
          <CheckCircle className="h-3.5 w-3.5" />
          Verified
        </Badge>
      );
    case "MISMATCH":
      return (
        <Badge variant="error" className="gap-1.5 px-2 py-0.75">
          <XCircle className="h-3.5 w-3.5" />
          Mismatch
        </Badge>
      );
    case "PENDING":
    default:
      return (
        <Badge variant="warning" className="gap-1.5 px-2 py-0.75">
          <Clock className="h-3.5 w-3.5" />
          Pending
        </Badge>
      );
  }
};
