import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { KeyRound, User, PackageCheck } from "lucide-react";
import { getErrorMessage } from "@/api/client";
export const LoginPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { login, isAuthenticated, role } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // If already authenticated, redirect immediately
    useEffect(() => {
        if (isAuthenticated) {
            if (role === "admin" || role === "super_admin") {
                navigate("/upload");
            }
            else {
                navigate("/operator");
            }
        }
    }, [isAuthenticated, role, navigate]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setError("Please fill in all credentials fields.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await login({ username, password });
            toast("Welcome back! Session authorized.", "success");
        }
        catch (err) {
            const msg = getErrorMessage(err);
            setError(msg);
            toast(msg, "error");
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs("div", { className: "flex h-screen w-screen items-center justify-center bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900 px-4", children: [_jsx("div", { className: "absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" }), _jsx("div", { className: "absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" }), _jsxs(Card, { glass: true, className: "max-w-md w-full animate-fade-in border-slate-700/30", children: [_jsxs(CardHeader, { className: "flex flex-col items-center justify-center py-6 border-b border-slate-700/20 bg-slate-950/20 select-none", children: [_jsx("div", { className: "h-11 w-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-3", children: _jsx(PackageCheck, { className: "h-6 w-6" }) }), _jsx("h1", { className: "text-lg font-black tracking-tight text-white uppercase", children: "Flipkart PVS" }), _jsx("p", { className: "text-[10px] text-slate-400 font-semibold tracking-wider mt-1 uppercase", children: "Digital Product Verification System" })] }), _jsx(CardContent, { className: "p-6", children: _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [error && (_jsx("div", { className: "text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-4 py-3 rounded-lg tracking-wide", children: error })), _jsx(Input, { label: "USERNAME", type: "text", id: "username", placeholder: "Enter your username", value: username, onChange: (e) => setUsername(e.target.value), icon: _jsx(User, { className: "h-4.5 w-4.5" }), className: "border-slate-700 focus:border-indigo-400 text-white dark:bg-slate-900/50", disabled: isLoading }), _jsx(Input, { label: "PASSWORD", type: "password", id: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: password, onChange: (e) => setPassword(e.target.value), icon: _jsx(KeyRound, { className: "h-4.5 w-4.5" }), className: "border-slate-700 focus:border-indigo-400 text-white dark:bg-slate-900/50", disabled: isLoading }), _jsx(Button, { type: "submit", variant: "primary", isLoading: isLoading, className: "mt-2.5 py-3 font-bold tracking-wider uppercase text-xs", children: "Sign In" })] }) })] })] }));
};
export default LoginPage;
