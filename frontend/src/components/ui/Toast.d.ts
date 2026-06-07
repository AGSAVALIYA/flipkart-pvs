import React from "react";
export type ToastVariant = "success" | "error" | "warning" | "info";
export interface ToastItem {
    id: string;
    message: string;
    variant: ToastVariant;
    duration?: number;
}
interface ToastContextType {
    toast: (message: string, variant?: ToastVariant, duration?: number) => void;
    toasts: ToastItem[];
    dismiss: (id: string) => void;
}
export declare const ToastProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare function useToast(): ToastContextType;
export {};
