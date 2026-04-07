"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // OAuth2 strictly requires URLSearchParams (Form Data), NOT standard JSON
    const formData = new URLSearchParams();
    formData.append("username", email); // OAuth2 expects the key to be "username"
    formData.append("password", password);

    try {
      // Pointing to the correct /token endpoint
      const res = await fetch("http://localhost:8000/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to login. Please check your credentials.");
      }

      const data = await res.json();
      
      // Save the JWT token and redirect to the dashboard
      localStorage.setItem("token", data.access_token);
      router.push("/");
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0D0D1A] text-[#FFFFFF] font-sans selection:bg-[#7C3AED] p-4">
      <div className="w-full max-w-md bg-[#161625] rounded-[12px] border border-[#2A2A3D] p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-[24px] font-bold tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] mb-2">
            LUMINA
          </h1>
          <p className="text-[#9CA3AF] text-[12px] uppercase tracking-widest">
            Authenticate to access your command center.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0D0D1A] border border-[#2A2A3D] rounded-[8px] px-4 py-3 text-[#FFFFFF] text-[14px] focus:outline-none focus:border-[#7C3AED] transition-colors"
              placeholder="Enter your email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0D0D1A] border border-[#2A2A3D] rounded-[8px] px-4 py-3 text-[#FFFFFF] text-[14px] focus:outline-none focus:border-[#7C3AED] transition-colors"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 rounded-[8px] p-3 text-center">
              <p className="text-[#EF4444] text-[11px] font-bold uppercase tracking-wider">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] hover:opacity-90 disabled:opacity-50 text-white text-[12px] font-bold uppercase tracking-widest py-4 rounded-[8px] transition-all flex justify-center items-center gap-2"
          >
            {loading ? <Activity className="w-4 h-4 animate-spin" /> : null}
            {loading ? "AUTHENTICATING..." : "INITIALIZE SESSION"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[#9CA3AF] text-[11px] uppercase tracking-wider">
            No active clearance?{" "}
            <Link href="/register" className="text-[#06B6D4] hover:text-[#FFFFFF] font-bold transition-colors">
              REGISTER HERE
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}