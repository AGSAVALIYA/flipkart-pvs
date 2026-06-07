import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
export const StatusBadge = ({ status }) => {
    const cleanStatus = String(status).toUpperCase();
    switch (cleanStatus) {
        case "VERIFIED":
        case "MATCH":
            return (_jsxs(Badge, { variant: "success", className: "gap-1.5 px-2 py-0.75", children: [_jsx(CheckCircle, { className: "h-3.5 w-3.5" }), "Verified"] }));
        case "MISMATCH":
            return (_jsxs(Badge, { variant: "error", className: "gap-1.5 px-2 py-0.75", children: [_jsx(XCircle, { className: "h-3.5 w-3.5" }), "Mismatch"] }));
        case "PENDING":
        default:
            return (_jsxs(Badge, { variant: "warning", className: "gap-1.5 px-2 py-0.75", children: [_jsx(Clock, { className: "h-3.5 w-3.5" }), "Pending"] }));
    }
};
