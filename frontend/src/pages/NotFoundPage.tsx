import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center p-6 gap-5 animate-fade-in select-none">
      <div className="h-16 w-16 rounded-full bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 flex items-center justify-center text-rose-600 mb-2">
        <AlertCircle className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 max-w-xs leading-relaxed">
          The requested URL path was not found on this verification client.
        </p>
      </div>
      <Button
        variant="primary"
        onClick={() => {
          navigate("/");
        }}
        className="font-bold tracking-wider uppercase text-xs px-6 py-2.5"
      >
        Go Home
      </Button>
    </div>
  );
};
export default NotFoundPage;
