import React, { useState, useRef } from "react";
import { FileUp, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatFileSize } from "@/lib/formatters";
import { clsx } from "clsx";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelect,
  isLoading = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSelectFile = (file: File | null) => {
    setError(null);
    if (!file) return;

    // Validate type (CSV only)
    const isCsv = file.name.endsWith(".csv") || file.type === "text/csv";
    if (!isCsv) {
      setError("Invalid file format. Please upload a CSV sheet (.csv).");
      setSelectedFile(null);
      return;
    }

    // Validate size (e.g. max 600MB)
    const maxSize = 600 * 1024 * 1024; // 600MB
    if (file.size > maxSize) {
      setError("File size exceeds the 600MB maximum boundary.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-4.5 w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInput}
        className={clsx(
          "w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 min-h-[200px] select-none",
          dragActive
            ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10"
            : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900/30"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          accept=".csv"
          className="hidden"
          disabled={isLoading}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              <FileSpreadsheet className="h-6 w-6 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide truncate max-w-sm">
                {selectedFile.name}
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-wider uppercase">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={triggerInput}
              disabled={isLoading}
              className="mt-1"
            >
              Choose Another File
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
            <div className="h-11 w-11 rounded-full bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200/40 dark:border-slate-800/40">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide">
                Drag and drop your inventory sheet
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed max-w-xs">
                Supports CSV spreadsheets up to 600MB.
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-rose-200 bg-rose-50/30 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 text-xs font-semibold tracking-wide animate-fade-in">
          <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};
export default FileDropzone;
