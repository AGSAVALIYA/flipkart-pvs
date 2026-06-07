import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProduct } from "@/api/products";
import {
  getValidationLog,
  requestValidationAIProcessing,
  submitVerification,
} from "@/api/validation";
import { AIStatusBadge } from "@/components/common/AIStatusBadge";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/common/PageHeader";
import { CameraCapture } from "@/components/common/CameraCapture";
import { BarcodeScanner } from "@/components/common/BarcodeScanner";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/api/client";
import { formatDate } from "@/lib/formatters";
import {
  AIProcessingMode,
  AIProcessingStatus,
  type ProductResponse,
  type ValidationResponse,
  type ValidationWithProductResponse,
} from "@/api/types";
import { Search, Camera, QrCode, CheckCircle, XCircle, ShieldCheck, ShieldAlert } from "lucide-react";
 
export const OperatorPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
 
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: WID Search, 2: Camera Capture, 3: Compare & Submit
  const [widInput, setWidInput] = useState("");
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [productData, setProductData] = useState<ProductResponse | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [notes, setNotes] = useState("");
  const [verificationResult, setVerificationResult] = useState<ValidationWithProductResponse | null>(null);
  const [isScanningWID, setIsScanningWID] = useState(false);
 
  // Hook layout-header actions
  useEffect(() => {
    const handlePrimary = () => {
      // Trigger barcode scanner
      resetTerminal();
      setIsScanningWID(true);
    };
    const handleSecondary = () => {
      resetTerminal();
      toast("Verification terminal reset.", "info");
    };
 
    window.addEventListener("header-primary-click", handlePrimary);
    window.addEventListener("header-secondary-click", handleSecondary);
    return () => {
      window.removeEventListener("header-primary-click", handlePrimary);
      window.removeEventListener("header-secondary-click", handleSecondary);
    };
  }, [toast]);

  // 1. Look up Warehouse ID
  const handleSearchProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!widInput.trim()) return;

    setLoadingProduct(true);
    setProductData(null);
    try {
      const res = await getProduct(widInput.trim());
      if (res.found && res.product) {
        setProductData(res.product);
        setStep(2); // Move to camera capture
        toast("Product lookup success. Align package label.", "info");
      } else {
        toast("Product WID not found in inventory.", "error");
      }
    } catch (err: any) {
      toast(getErrorMessage(err), "error");
    } finally {
      setLoadingProduct(false);
    }
  };

  // 2. Camera Snapshot Callback
  const handlePhotoCapture = (blob: Blob) => {
    setImageBlob(blob);
    setStep(3); // Move to comparisons & validation
  };

  // 3. Submit Validation (VERIFIED or MISMATCH)
  const submitMutation = useMutation({
    mutationFn: async (statusVal: "VERIFIED" | "MISMATCH") => {
      if (!productData || !imageBlob) {
        throw new Error("Missing product lookup or captured image.");
      }

      const formData = new FormData();
      formData.append("wid", productData.wid);
      formData.append("validation_status", statusVal);
      formData.append("file", imageBlob, "verification.jpg");
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }
      return await submitVerification(formData);
    },
    onSuccess: (data) => {
      setVerificationResult(data);
      toast("Verification log successfully submitted.", "success");
      // Reset after brief display or direct reset
    },
    onError: (err) => {
      toast(getErrorMessage(err), "error");
    },
  });

  const validationLogQuery = useQuery({
    queryKey: ["validation-log-detail", verificationResult?.validation.id],
    queryFn: () => getValidationLog(verificationResult!.validation.id),
    enabled: Boolean(verificationResult?.validation.id),
    refetchInterval: (query) => {
      const status = query.state.data?.ai_processing_status;
      return status === AIProcessingStatus.QUEUED || status === AIProcessingStatus.PROCESSING ? 2000 : false;
    },
  });

  const manualAiMutation = useMutation({
    mutationFn: (logId: number) => requestValidationAIProcessing(logId),
    onSuccess: (data) => {
      queryClient.setQueryData(["validation-log-detail", data.id], data);
      setVerificationResult((current) =>
        current ? { ...current, validation: data } : current,
      );
      toast("AI analysis queued in the background.", "info");
    },
    onError: (err) => {
      toast(getErrorMessage(err), "error");
    },
  });

  const currentValidation: ValidationResponse | null =
    validationLogQuery.data ?? verificationResult?.validation ?? null;

  const handleVerifySubmit = (statusVal: "VERIFIED" | "MISMATCH") => {
    submitMutation.mutate(statusVal);
  };

  const handleBarcodeScanSuccess = React.useCallback(async (scannedWID: string) => {
    setIsScanningWID(false);
    setWidInput(scannedWID);

    setLoadingProduct(true);
    setProductData(null);
    try {
      const res = await getProduct(scannedWID.trim());
      if (res.found && res.product) {
        setProductData(res.product);
        setStep(2); // Move to camera capture
        toast("Product lookup success. Align package label.", "info");
      } else {
        toast(`Scanned WID "${scannedWID}" not found in inventory.`, "error");
      }
    } catch (err: any) {
      toast(getErrorMessage(err), "error");
    } finally {
      setLoadingProduct(false);
    }
  }, [toast]);

  const resetTerminal = () => {
    setStep(1);
    setWidInput("");
    setProductData(null);
    setImageBlob(null);
    setNotes("");
    setVerificationResult(null);
    setIsScanningWID(false);
  };

  const canTriggerManualAI = Boolean(
    currentValidation &&
      currentValidation.ai_processing_mode === AIProcessingMode.MANUAL &&
      (currentValidation.ai_processing_status === AIProcessingStatus.NOT_REQUESTED ||
        currentValidation.ai_processing_status === AIProcessingStatus.FAILED),
  );

  return (
    <div className="flex flex-col gap-5 max-w-lg mx-auto animate-fade-in select-none px-3.5 py-2 sm:py-4">
      <PageHeader
        title="Verification Terminal"
        subtitle="Operator physical check terminal with queued Vision-AI verification support."
      />

      {/* STEP 1: WID SEARCH */}
      {step === 1 && (
        <Card className="shadow-lg">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 px-4 sm:px-6 py-3.5 sm:py-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <QrCode className="h-4 w-4 text-indigo-500" />
              Step 1: Scan / Enter Product WID
            </h2>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
            {isScanningWID ? (
              <BarcodeScanner
                onScanSuccess={handleBarcodeScanSuccess}
                onCancel={() => setIsScanningWID(false)}
              />
            ) : (
              <form onSubmit={handleSearchProduct} className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1 flex gap-2 w-full">
                  <Input
                    placeholder="Enter WID (e.g. WID10001)"
                    value={widInput}
                    onChange={(e) => setWidInput(e.target.value)}
                    icon={<Search className="h-4.5 w-4.5" />}
                    className="py-3 font-semibold dark:bg-slate-900/50 text-base flex-1 w-full"
                    disabled={loadingProduct}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsScanningWID(true)}
                    disabled={loadingProduct}
                    className="px-3.5 py-3 border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50 shrink-0"
                    title="Scan Barcode/QR Code"
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={loadingProduct}
                  className="w-full sm:w-auto px-5 py-3 text-sm font-bold uppercase tracking-wider justify-center"
                >
                  Next
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 2: CAMERA PHOTO CAPTURE */}
      {step === 2 && productData && (
        <Card className="shadow-lg">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Step 2: Capture Label Photograph
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400 self-start sm:self-auto">
              WID: {productData.wid}
            </span>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 flex flex-col items-center gap-4">
            <CameraCapture
              onCapture={handlePhotoCapture}
              onCancel={() => setStep(1)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(1)}
              className="w-full"
            >
              Cancel Lookup
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: COMPARISON AND SUBMISSION */}
      {step === 3 && productData && (
        <div className="flex flex-col gap-4">
          {/* Ingestion results detail */}
          {!verificationResult ? (
            <>
              {/* Product Reference Card */}
              <Card>
                <CardHeader className="px-4 sm:px-6 py-3 sm:py-3.5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Database Inventory Reference
                  </h3>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 grid grid-cols-3 gap-2 text-center text-[11px] sm:text-xs">
                  <div className="flex flex-col bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/50">
                    <span className="text-[9px] font-bold text-slate-400 tracking-wide uppercase">EAN</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-1">{productData.ean}</span>
                  </div>
                  <div className="flex flex-col bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/50">
                    <span className="text-[9px] font-bold text-slate-400 tracking-wide uppercase">MFG Date</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-1">{formatDate(productData.manufacturing_date)}</span>
                  </div>
                  <div className="flex flex-col bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/50">
                    <span className="text-[9px] font-bold text-slate-400 tracking-wide uppercase">EXP Date</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-1">{formatDate(productData.expiry_date)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Submission feedback while the verification record is created */}
              {submitMutation.isPending ? (
                <Card className="border-indigo-200 bg-indigo-50/10">
                  <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                    <div className="h-8 w-8 rounded-full border-3 border-indigo-500 animate-spin border-t-transparent" />
                    <span className="text-xs font-semibold text-slate-500">Saving verification record...</span>
                  </CardContent>
                </Card>
              ) : null}

              {/* Controls and Submission Form */}
              <Card>
                <CardHeader className="px-4 sm:px-6 py-3 sm:py-3.5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Verification Decision
                  </h3>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
                  <Input
                    label="OPERATOR NOTES"
                    placeholder="Enter package remarks (e.g. damaged box, wrong date)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="dark:bg-slate-900/50 text-sm font-medium"
                    disabled={submitMutation.isPending}
                  />

                  <div className="grid grid-cols-2 gap-3.5 mt-2">
                    <button
                      onClick={() => handleVerifySubmit("MISMATCH")}
                      disabled={submitMutation.isPending}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-sm font-bold tracking-wide transition-all duration-150 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 focus:outline-none"
                    >
                      <XCircle className="h-4.5 w-4.5" />
                      Mismatch ✗
                    </button>
                    <button
                      onClick={() => handleVerifySubmit("VERIFIED")}
                      disabled={submitMutation.isPending}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-sm font-bold tracking-wide transition-all duration-150 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 focus:outline-none"
                    >
                      <CheckCircle className="h-4.5 w-4.5" />
                      Verify ✓
                    </button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* VERIFICATION RESULT SUMMARY */
            <Card className="shadow-lg animate-fade-in">
              <CardContent className="flex flex-col items-center text-center p-4 sm:p-6 gap-4">
                {verificationResult.validation.validation_status === "VERIFIED" ? (
                  <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-200">
                    <ShieldAlert className="h-8 w-8" />
                  </div>
                )}

                <div>
                  <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    Verification Submitted
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    WID: {verificationResult.product.wid}
                  </p>
                </div>

                {currentValidation ? (
                  <div className="flex w-full flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/90 p-3 sm:p-4 text-left dark:border-slate-800/80 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <span>AI processing</span>
                      <AIStatusBadge
                        processingStatus={currentValidation.ai_processing_status}
                        matchResult={currentValidation.ai_match_result}
                      />
                    </div>

                    <div className="text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
                      {currentValidation.ai_processing_status === AIProcessingStatus.COMPLETED
                        ? "AI review is complete."
                        : currentValidation.ai_processing_status === AIProcessingStatus.FAILED
                          ? "AI review failed."
                          : currentValidation.ai_processing_status === AIProcessingStatus.QUEUED ||
                            currentValidation.ai_processing_status === AIProcessingStatus.PROCESSING
                            ? "AI review is running in the background and this panel will refresh automatically."
                            : currentValidation.ai_processing_mode === AIProcessingMode.MANUAL
                              ? "AI review is manual for your role. Trigger it when you need an OCR cross-check."
                              : currentValidation.ai_processing_mode === AIProcessingMode.AUTOMATIC
                                ? "AI review has not started yet."
                                : "AI review is disabled for this verification."}
                    </div>

                    {currentValidation.ai_match_result ? (
                      <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                        Match result: {currentValidation.ai_match_result}
                      </div>
                    ) : null}

                    {currentValidation.ai_error_message ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-950/40 dark:bg-rose-950/20 dark:text-rose-300">
                        {currentValidation.ai_error_message}
                      </div>
                    ) : null}

                    {canTriggerManualAI ? (
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={manualAiMutation.isPending}
                        onClick={() => manualAiMutation.mutate(currentValidation.id)}
                        className="w-full"
                      >
                        Run AI Cross-Check
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                <Button
                  variant="primary"
                  size="md"
                  onClick={resetTerminal}
                  className="w-full py-3 mt-2 font-bold tracking-wider uppercase text-xs"
                >
                  Verify Next Product
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
export default OperatorPage;
