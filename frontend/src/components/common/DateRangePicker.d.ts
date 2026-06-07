import React from "react";
interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onChange: (start: string, end: string) => void;
}
export declare const DateRangePicker: React.FC<DateRangePickerProps>;
export {};
