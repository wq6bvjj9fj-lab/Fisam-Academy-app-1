import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Eye, EyeOff } from "lucide-react";

const LOGO_URL = "/logo_fisam.png";

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
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#F5A623]/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-72 h-72 sm:w-80 sm:h-80 mx-auto rounded-full bg-white mb-4 shadow-[0_0_40px_rgba(245,166,35,0.3)] overflow-hidden" data-testid="login-logo">
            <img
              src={`${LOGO_URL}?v=5`}
              alt="FISAM Academy"
              className="w-full h-full object-cover"
            />
          </div>
          <h1
            className="text-3xl md:text-4xl font-bold tracking-wider text-white uppercase"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            FISAM ACADEMY
          </h1>
          <p className="text-[#A1A1AA] text-sm tracking-widest uppercase mt-1">Palermo</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
          <div className="space-y-2">
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

          <div className="space-y-2">
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

        <p className="text-center text-white/20 text-xs mt-8 tracking-wider uppercase">
          Federazione Istituti Superiori Arti Marziali
        </p>
      </div>
    </div>
  );
}
