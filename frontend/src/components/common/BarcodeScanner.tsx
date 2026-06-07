import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, LoaderCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onCancel: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScanSuccess,
  onCancel,
}) => {
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const elementId = "barcode-scanner-viewport";
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Use the latest-ref pattern for the success callback to prevent
  // the scanner from restarting when the reference changes.
  const scanSuccessRef = useRef(onScanSuccess);
  useEffect(() => {
    scanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  // Lock to ensure we only process the first successful scan
  const hasScannedRef = useRef(false);

  useEffect(() => {
    // Reset scan state on mount
    hasScannedRef.current = false;

    // Instantiate scanner
    const html5Qrcode = new Html5Qrcode(elementId);
    qrCodeRef.current = html5Qrcode;

    const startScanner = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // Start scanning with facingMode: environment (back camera)
        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 15,
            // Custom scanning frame aspect ratio/size
            qrbox: (width, height) => {
              const size = Math.min(width, height);
              // Make a box that is wider for barcodes (e.g. 260px width x 160px height)
              return {
                width: Math.min(width * 0.85, 280),
                height: Math.min(height * 0.45, 160),
              };
            },
          },
          (decodedText) => {
            // Check scan lock to prevent multiple detections on subsequent frames
            if (hasScannedRef.current) {
              return;
            }
            hasScannedRef.current = true;

            // Successful scan! Stop camera stream and trigger callback
            if (qrCodeRef.current && qrCodeRef.current.isScanning) {
              qrCodeRef.current
                .stop()
                .then(() => {
                  scanSuccessRef.current(decodedText);
                })
                .catch((err) => {
                  console.error("Error stopping scanner after success:", err);
                  scanSuccessRef.current(decodedText);
                });
            } else {
              scanSuccessRef.current(decodedText);
            }
          },
          () => {
            // Quietly ignore verbose frame-by-frame read errors
          }
        );
        setIsInitializing(false);
      } catch (err: any) {
        console.error("Failed to start html5-qrcode scanner:", err);
        setError(
          err?.message ||
            "Camera permission denied or camera not available on this device."
        );
        setIsInitializing(false);
      }
    };

    void startScanner();

    // Cleanup on unmount
    return () => {
      if (qrCodeRef.current && qrCodeRef.current.isScanning) {
        void qrCodeRef.current.stop().catch((err) => {
          console.error("Error stopping scanner on unmount:", err);
        });
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full items-center select-none animate-fade-in">
      {/* Scanner Viewfinder Box */}
      <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800">
        
        {/* html5-qrcode renders its video inside this div */}
        <div id={elementId} className="w-full h-full object-cover [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

        {/* Viewfinder Target HUD (Only show when active and no error) */}
        {!isInitializing && !error && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Viewfinder bounding box overlay */}
            <div className="relative w-[280px] h-[160px] border-2 border-dashed border-indigo-400/60 rounded-xl bg-slate-950/20 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] flex flex-col items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-3 border-l-3 border-indigo-400 rounded-tl-md" />
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-3 border-r-3 border-indigo-400 rounded-tr-md" />
              <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-3 border-l-3 border-indigo-400 rounded-bl-md" />
              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-3 border-r-3 border-indigo-400 rounded-br-md" />

              {/* Animated Scan Line */}
              <div className="w-[90%] h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_8px_rgba(129,140,248,0.8)] animate-pulse" />
            </div>
            
            <div className="absolute bottom-5 text-white/70 text-[10px] font-black tracking-widest uppercase bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800/40">
              Align Barcode / QR Code inside box
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-center text-slate-200">
            <LoaderCircle className="h-7 w-7 animate-spin text-indigo-500" />
            <p className="text-sm font-semibold">Initializing camera scan...</p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3 bg-slate-950/95">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
            <p className="text-xs font-semibold text-slate-300 max-w-xs leading-relaxed">
              {error}
            </p>
            <div className="flex gap-2.5 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="border-slate-800 text-white hover:bg-slate-900"
              >
                Go Back
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="w-full max-w-xs mt-1">
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full gap-2 py-2.5 font-bold tracking-wide border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50"
        >
          <X className="h-4 w-4" />
          Cancel Scan
        </Button>
      </div>
    </div>
  );
};
export default BarcodeScanner;
