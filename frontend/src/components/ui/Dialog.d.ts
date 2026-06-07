import React from "react";
interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}
export declare const Dialog: React.FC<DialogProps>;
export {};
