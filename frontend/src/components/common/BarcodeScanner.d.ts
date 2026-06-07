import React from "react";
interface BarcodeScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onCancel: () => void;
}
export declare const BarcodeScanner: React.FC<BarcodeScannerProps>;
export default BarcodeScanner;
