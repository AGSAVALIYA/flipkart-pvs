import React from "react";
interface SelectOption {
    value: string | number;
    label: string;
}
interface SelectProps {
    label?: string;
    error?: string;
    helperText?: string;
    options: SelectOption[];
    value?: any;
    onChange?: (e: {
        target: {
            name?: string;
            value: any;
        };
    }) => void;
    name?: string;
    multiple?: boolean;
    enableSearch?: boolean;
    disabled?: boolean;
    placeholder?: string;
    size?: "sm" | "md";
    className?: string;
}
export declare const Select: React.FC<SelectProps>;
export {};
