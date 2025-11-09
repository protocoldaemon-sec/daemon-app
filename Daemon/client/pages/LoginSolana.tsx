import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import bs58 from "bs58";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Wallet, Chrome, Smartphone } from "lucide-react";
import { openPhantomApp, openSolflareApp, openBackpackApp, isMobileDevice } from "@/utils/walletDeepLink";
import Sphere from "@/components/Sphere"; 
import DaemonLogoGif from "@/assets/logo/daemon-logo-blink.gif";
import DaemonLogo from "@/assets/logo/daemon-logo-black.svg";

const API = "https://daemonprotocol-be-production.up.railway.app";

export default function LoginSolana() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [address, setAddress] = useState("");
  const [nonce, setNonce] = useState("");
  const [signature, setSignature] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const message = nonce ? `Sign in to Daemon Protocol\nNonce: ${nonce}` : "";

  // Check if user is already authenticated and redirect
  useEffect(() => {
    const walletAddress = localStorage.getItem('wallet_address');
    const walletType = localStorage.getItem('wallet_type');
    const daemonToken = localStorage.getItem('daemon_token');

    if ((walletAddress && walletType) || daemonToken) {
      // User is already authenticated, redirect to intended destination or chat
      const from = (location.state as any)?.from || '/chat';
      navigate(from, { replace: true });
    }
  }, [navigate, location.state]);

  const connectWallet = async () => {
    try {
      // Cek apakah di mobile device atau desktop
      if (isMobileDevice()) {
        // Untuk mobile, buka Phantom APK
        const success = await openPhantomApp("Connect to Daemon Protocol");
        if (success) {
          alert("Phantom app opened. Please connect your wallet and return to this app.");
        } else {
          alert("Failed to open Phantom app. Please install Phantom from Play Store.");
        }
      } else {
        // Untuk desktop, gunakan browser extension
        const provider = window.solana;
        if (!provider) {
          alert("Phantom wallet not found. Please install Phantom extension.");
          return;
        }
        const res = await provider.connect();
        const pk =
          (res?.publicKey as any)?.toBase58?.() ??
          (provider.publicKey as any)?.toBase58?.();
        if (pk) {
          setAddress(pk);
          localStorage.setItem("wallet_address", pk);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Wallet connection failed");
    }
  };

  const getNonce = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain: "solana", address }),
      });
      const data = await res.json();
      setNonce(String(data.nonce ?? ""));
    } catch (e) {
      console.error(e);
      alert("Failed to fetch nonce");
    } finally {
      setLoading(false);
    }
  };

  const signWithWallet = async () => {
    try {
      const provider = window.solana;
      if (!provider || !nonce) return;
      const encoded = new TextEncoder().encode(message);
      const { signature: sigBytes } = await provider.signMessage(
        encoded,
        "utf8",
      );
      const b58 = bs58.encode(sigBytes);
      setSignature(b58);
      await verify(b58);
    } catch (e) {
      console.error(e);
      alert("Signing failed");
    }
  };

  const verify = async (sig?: string) => {
    const finalSig = sig ?? signature;
    if (!address || !nonce || !finalSig) {
      alert("Address, nonce and signature are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain: "solana",
          address,
          nonce,
          message,
          signature: finalSig,
        }),
      });
      const data = await res.json();
      if (data?.token) {
        setToken(data.token);
        localStorage.setItem("daemon_token", data.token);
        navigate("/chat");
      } else {
        alert("Verification failed");
      }
    } catch (e) {
      console.error(e);
      alert("Verification error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      {/* <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80')"
        }}
      /> */}
      <Sphere className="absolute inset-0 z-0" />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />
      

      {/* Header Branding */}
      <div className="relative z-10 flex flex-col items-center pt-8">
        {/* Logo */}
        <div className="w-26 h-26 flex items-center justify-center mb-2">
          {/* <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg transform rotate-12" /> */}
          <img src={DaemonLogoGif} alt="Daemon Logo Gif" width={255} height={255} />
        </div>
        
        {/* App Name */}
        <h1 className="text-2xl -mt-12 font-bold text-white-900 mb-2">DAEMON PROTOCOL</h1>
        
        {/* Welcome Message */}
        <p className="text-white-700 text-sm">Nice to see you again!</p>
      </div>

      {/* Login Form Card */}
      <div className="relative z-10 flex justify-center px-4 pt-8">
        <div className="w-full max-w-sm">
          <div className="bg-gray-900/25 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
            
            {/* Email Field */}
            <div className="mb-4">
              <Label htmlFor="email" className="text-white text-sm font-medium mb-2 block">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 rounded-xl h-12"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="password" className="text-white text-sm font-medium">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 rounded-xl h-12"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>


            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-gray-600"
                />
                <Label htmlFor="remember" className="text-gray-300 text-sm">
                  Remember me
                </Label>
              </div>
              <button className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
                Forgot Password ?
              </button>
            </div>

            {/* Sign In Button */}
            <Button
              onClick={() => {
                if (email && password) {
                  // Handle email/password login
                  navigate("/chat");
                } else if (address && nonce && signature) {
                  verify();
                }
              }}
              disabled={loading}
              className="w-full bg-gray-800 text-white hover:bg-gray-700 rounded-xl h-12 font-medium"
            >
              {loading ? "Signing in..." : "Sign in"}
              </Button>

            {/* Sign Up Link */}
            <div className="text-center mt-6">
              <span className="text-gray-400 text-sm">Don't have an account? </span>
              <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                Sign Up
              </button>
            </div>

            {/* Separator */}
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-gray-600" />
              <span className="px-4 text-gray-400 text-sm">Or login with</span>
              <div className="flex-1 h-px bg-gray-600" />
            </div>

            {/* Alternative Login Buttons */}
            <div className="space-y-3 mb-6">
              <Button
                onClick={() => navigate("/wallet-connection")}
                className="w-full bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/50 rounded-xl h-12 flex items-center justify-center gap-3"
              >
                <Wallet className="w-5 h-5" />
                Connect Wallet
              </Button>
              
              {/* Mobile Wallet Button */}
              {/* {isMobileDevice() && (
                <Button
                  onClick={async () => {
                    const success = await openPhantomApp("Connect to Daemon Protocol");
                    if (success) {
                      alert("Phantom app opened. Please connect your wallet and return to this app.");
                    } else {
                      alert("Failed to open Phantom app. Please install Phantom from Play Store.");
                    }
                  }}
                  className="w-full bg-green-600/50 border-green-500 text-white hover:bg-green-500/50 rounded-xl h-12 flex items-center justify-center gap-3"
                >
                  <Smartphone className="w-5 h-5" />
                  Open Phantom App
                </Button>
              )} */}
              
              <Button
                className="w-full bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/50 rounded-xl h-12 flex items-center justify-center gap-3"
              >
                <Chrome className="w-5 h-5" />
                Sign in with Google
              </Button>
            </div>

            
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
            <img src={DaemonLogo} className="text-black" width={25} height={25} />
          </div>
          <span className="text-white text-sm">@DaemonProtocol</span>
        </div>
        <span className="text-white text-sm">© All right reserved 2025</span>
      </div>

      {/* Hidden Wallet Connection for Development */}
      {!address && (
        <div className="hidden">
          <Button onClick={connectWallet}>Connect Phantom</Button>
              {address && (
                <span className="truncate text-xs text-muted-foreground">
                  {address}
                </span>
              )}
            </div>
      )}

      {/* Hidden Nonce and Signature Flow */}
      {address && !nonce && (
        <div className="hidden">
              <Button onClick={getNonce} disabled={!address || loading}>
                Get Nonce
              </Button>
              {nonce && (
                <span className="text-xs text-muted-foreground">
                  nonce: {nonce}
                </span>
              )}
            </div>
      )}

            {nonce && (
        <div className="hidden">
                  <Button onClick={signWithWallet} variant="default">
                    Sign with Wallet
                  </Button>
                <input
                  className="mb-4 w-full rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Paste signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                />
                <Button
                  onClick={() => verify()}
                  disabled={loading || !signature}
                >
                  Verify
                </Button>
              </div>
            )}

            {token && (
        <div className="hidden">
                Authenticated. Token saved. Redirecting to Home…
              </div>
            )}
    </div>
  );
}
