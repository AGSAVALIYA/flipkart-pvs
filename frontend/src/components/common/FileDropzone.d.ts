import React from "react";
interface FileDropzoneProps {
    onFileSelect: (file: File) => void;
    isLoading?: boolean;
}
export declare const FileDropzone: React.FC<FileDropzoneProps>;
export default FileDropzone;
