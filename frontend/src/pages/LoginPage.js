import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Eye, EyeOff } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_dojo-connect-app/artifacts/08fmkafm_IMG_3569.png";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate("/lessons", { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Inserisci email e password");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Accesso effettuato");
      navigate("/lessons", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Errore di accesso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in px-2">
        <div className="flex flex-col items-center mb-1">
          <div className="w-[98vw] h-[98vw] max-w-[460px] max-h-[460px] mx-auto" data-testid="login-logo">
            <img
              src={LOGO_URL}
              alt="FISAM Academy"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" data-testid="login-form">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-white/70 text-sm tracking-wider uppercase">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@fisam.it"
              className="bg-[#0A0A0A] border-white/20 focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623] text-white h-12 rounded-sm placeholder:text-white/30"
              data-testid="login-email-input"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password" className="text-white/70 text-sm tracking-wider uppercase">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="bg-[#0A0A0A] border-white/20 focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623] text-white h-12 rounded-sm pr-10 placeholder:text-white/30"
                data-testid="login-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                data-testid="toggle-password-visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F5A623] text-black hover:bg-[#E0961F] font-bold uppercase tracking-wider rounded-sm px-6 py-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-12"
            data-testid="login-submit-button"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Accedi
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
