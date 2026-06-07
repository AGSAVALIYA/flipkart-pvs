import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { KeyRound, User, PackageCheck } from "lucide-react";
import { getErrorMessage } from "@/api/client";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isAuthenticated, role } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      if (role === "admin" || role === "super_admin") {
        navigate("/upload");
      } else {
        navigate("/operator");
      }
    }
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-tr from-slate-50 via-blue-50/50 to-slate-100 px-4">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-blue-600/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-blue-600/5 blur-3xl" />

      <Card className="max-w-md w-full animate-fade-in border-slate-200 shadow-xl">
        <CardHeader className="flex flex-col items-center justify-center py-6 border-b border-slate-100 bg-slate-50/50 select-none">
          <div className="h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-3">
            <PackageCheck className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-black tracking-tight text-slate-800 uppercase">Flipkart PVS</h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1 uppercase">
            Digital Product Verification System
          </p>
        </CardHeader>
        <CardContent className="p-6 bg-white">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="text-xs font-semibold text-rose-650 bg-rose-50 border border-rose-100 px-4 py-3 rounded-xl tracking-wide">
                {error}
              </div>
            )}

            <Input
              label="USERNAME"
              type="text"
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={<User className="h-4.5 w-4.5" />}
              className="border-slate-200 focus:border-blue-500 text-slate-800 bg-white"
              disabled={isLoading}
            />

            <Input
              label="PASSWORD"
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<KeyRound className="h-4.5 w-4.5" />}
              className="border-slate-200 focus:border-blue-500 text-slate-800 bg-white"
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="mt-2.5 py-3 font-bold tracking-wider uppercase text-xs shadow-md shadow-blue-500/20"
            >
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
export default LoginPage;
