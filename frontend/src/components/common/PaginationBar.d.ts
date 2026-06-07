import React from "react";
interface PaginationBarProps {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    itemLabel: string;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
    isLoading?: boolean;
}
export declare const PaginationBar: React.FC<PaginationBarProps>;
export default PaginationBar;
