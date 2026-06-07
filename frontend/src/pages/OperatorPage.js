import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getProduct } from "@/api/products";
import { submitVerification } from "@/api/validation";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/common/PageHeader";
import { CameraCapture } from "@/components/common/CameraCapture";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/api/client";
import { formatDate } from "@/lib/formatters";
import { Search, Camera, QrCode, CheckCircle, XCircle, ShieldCheck, ShieldAlert } from "lucide-react";
export const OperatorPage = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [step, setStep] = useState(1); // 1: WID Search, 2: Camera Capture, 3: Compare & Submit
    const [widInput, setWidInput] = useState("");
    const [loadingProduct, setLoadingProduct] = useState(false);
    const [productData, setProductData] = useState(null);
    const [imageBlob, setImageBlob] = useState(null);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);
    // 1. Look up Warehouse ID
    const handleSearchProduct = async (e) => {
        if (e)
            e.preventDefault();
        if (!widInput.trim())
            return;
        setLoadingProduct(true);
        setProductData(null);
        try {
            const res = await getProduct(widInput.trim());
            if (res.found && res.product) {
                setProductData(res.product);
                setStep(2); // Move to camera capture
                toast("Product lookup success. Align package label.", "info");
            }
            else {
                toast("Product WID not found in inventory.", "error");
            }
        }
        catch (err) {
            toast(getErrorMessage(err), "error");
        }
        finally {
            setLoadingProduct(false);
        }
    };
    // 2. Camera Snapshot Callback
    const handlePhotoCapture = (blob) => {
        setImageBlob(blob);
        setStep(3); // Move to comparisons & validation
    };
    // 3. Submit Validation (VERIFIED or MISMATCH)
    const submitMutation = useMutation({
        mutationFn: async (statusVal) => {
            if (!productData || !imageBlob)
                return;
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
    const handleVerifySubmit = (statusVal) => {
        submitMutation.mutate(statusVal);
    };
    const resetTerminal = () => {
        setStep(1);
        setWidInput("");
        setProductData(null);
        setImageBlob(null);
        setNotes("");
        setVerificationResult(null);
    };
    return (_jsxs("div", { className: "flex flex-col gap-5 max-w-lg mx-auto animate-fade-in select-none px-2 py-1", children: [_jsx(PageHeader, { title: "Verification Terminal", subtitle: "Operator physical check terminal with Vision-AI OCR cross-validation." }), step === 1 && (_jsxs(Card, { className: "shadow-lg", children: [_jsx(CardHeader, { className: "bg-slate-50/50 dark:bg-slate-900/10", children: _jsxs("h2", { className: "text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2", children: [_jsx(QrCode, { className: "h-4 w-4 text-indigo-500" }), "Step 1: Scan / Enter Product WID"] }) }), _jsx(CardContent, { className: "p-6 flex flex-col gap-4", children: _jsxs("form", { onSubmit: handleSearchProduct, className: "flex gap-2.5", children: [_jsx(Input, { placeholder: "Enter WID (e.g. WID10001)", value: widInput, onChange: (e) => setWidInput(e.target.value), icon: _jsx(Search, { className: "h-4.5 w-4.5" }), className: "py-3 font-semibold dark:bg-slate-900/50 text-base", disabled: loadingProduct, autoFocus: true }), _jsx(Button, { type: "submit", variant: "primary", isLoading: loadingProduct, className: "px-5 py-3 text-sm font-bold uppercase tracking-wider", children: "Next" })] }) })] })), step === 2 && productData && (_jsxs(Card, { className: "shadow-lg", children: [_jsxs(CardHeader, { className: "bg-slate-50/50 dark:bg-slate-900/10 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Camera, { className: "h-4 w-4 text-indigo-500" }), _jsx("h2", { className: "text-sm font-bold text-slate-800 dark:text-slate-100", children: "Step 2: Capture Label Photograph" })] }), _jsxs("span", { className: "text-xs font-bold text-slate-400", children: ["WID: ", productData.wid] })] }), _jsxs(CardContent, { className: "p-5 flex flex-col items-center gap-4", children: [_jsx(CameraCapture, { onCapture: handlePhotoCapture, onCancel: () => setStep(1) }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => setStep(1), className: "w-full", children: "Cancel Lookup" })] })] })), step === 3 && productData && (_jsx("div", { className: "flex flex-col gap-4", children: !verificationResult ? (_jsxs(_Fragment, { children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-widest", children: "Database Inventory Reference" }) }), _jsxs(CardContent, { className: "p-4 grid grid-cols-3 gap-2.5 text-center text-xs", children: [_jsxs("div", { className: "flex flex-col bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/50", children: [_jsx("span", { className: "text-[9px] font-bold text-slate-400 tracking-wide uppercase", children: "EAN" }), _jsx("span", { className: "font-extrabold text-slate-800 dark:text-slate-200 mt-1", children: productData.ean })] }), _jsxs("div", { className: "flex flex-col bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/50", children: [_jsx("span", { className: "text-[9px] font-bold text-slate-400 tracking-wide uppercase", children: "MFG Date" }), _jsx("span", { className: "font-extrabold text-slate-800 dark:text-slate-200 mt-1", children: formatDate(productData.manufacturing_date) })] }), _jsxs("div", { className: "flex flex-col bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/50", children: [_jsx("span", { className: "text-[9px] font-bold text-slate-400 tracking-wide uppercase", children: "EXP Date" }), _jsx("span", { className: "font-extrabold text-slate-800 dark:text-slate-200 mt-1", children: formatDate(productData.expiry_date) })] })] })] }), submitMutation.isPending ? (_jsx(Card, { className: "border-indigo-200 bg-indigo-50/10", children: _jsxs(CardContent, { className: "flex flex-col items-center justify-center p-6 gap-3", children: [_jsx("div", { className: "h-8 w-8 rounded-full border-3 border-indigo-500 animate-spin border-t-transparent" }), _jsx("span", { className: "text-xs font-semibold text-slate-500", children: "Vision-AI analysis in progress..." })] }) })) : null, _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-widest", children: "Verification Decision" }) }), _jsxs(CardContent, { className: "p-5 flex flex-col gap-4", children: [_jsx(Input, { label: "OPERATOR NOTES", placeholder: "Enter package remarks (e.g. damaged box, wrong date)...", value: notes, onChange: (e) => setNotes(e.target.value), className: "dark:bg-slate-900/50 text-sm font-medium", disabled: submitMutation.isPending }), _jsxs("div", { className: "grid grid-cols-2 gap-3.5 mt-2", children: [_jsxs("button", { onClick: () => handleVerifySubmit("MISMATCH"), disabled: submitMutation.isPending, className: "flex items-center justify-center gap-2 py-3.5 rounded-xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-sm font-bold tracking-wide transition-all duration-150 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 focus:outline-none", children: [_jsx(XCircle, { className: "h-4.5 w-4.5" }), "Mismatch \u2717"] }), _jsxs("button", { onClick: () => handleVerifySubmit("VERIFIED"), disabled: submitMutation.isPending, className: "flex items-center justify-center gap-2 py-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-sm font-bold tracking-wide transition-all duration-150 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 focus:outline-none", children: [_jsx(CheckCircle, { className: "h-4.5 w-4.5" }), "Verify \u2713"] })] })] })] })] })) : (
                /* VERIFICATION RESULT SUMMARY */
                _jsx(Card, { className: "shadow-lg animate-fade-in", children: _jsxs(CardContent, { className: "flex flex-col items-center text-center p-6 gap-4", children: [verificationResult.validation.validation_status === "VERIFIED" ? (_jsx("div", { className: "h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200", children: _jsx(ShieldCheck, { className: "h-8 w-8" }) })) : (_jsx("div", { className: "h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-200", children: _jsx(ShieldAlert, { className: "h-8 w-8" }) })), _jsxs("div", { children: [_jsx("h2", { className: "text-base font-extrabold text-slate-800 dark:text-slate-100", children: "Verification Submitted" }), _jsxs("p", { className: "text-xs text-slate-400 mt-1", children: ["WID: ", verificationResult.product.wid] })] }), verificationResult.validation.ai_match_result && (_jsx("div", { className: "flex flex-col gap-1 w-full bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 text-xs", children: _jsxs("div", { className: "flex items-center justify-between text-slate-400 tracking-wide font-semibold", children: [_jsx("span", { children: "Vision-AI Result" }), _jsx("span", { className: `font-bold ${verificationResult.validation.ai_match_result === "MATCH" ? "text-emerald-500" : "text-rose-500"}`, children: verificationResult.validation.ai_match_result })] }) })), _jsx(Button, { variant: "primary", size: "md", onClick: resetTerminal, className: "w-full py-3 mt-2 font-bold tracking-wider uppercase text-xs", children: "Verify Next Product" })] }) })) }))] }));
};
export default OperatorPage;
