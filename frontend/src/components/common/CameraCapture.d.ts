import React from "react";
interface CameraCaptureProps {
    onCapture: (imageBlob: Blob) => void;
    onCancel?: () => void;
}
export declare const CameraCapture: React.FC<CameraCaptureProps>;
export default CameraCapture;
