"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    age: "",
    gender: "",
    height: "",
    country: "",
    preferred_cuisine: "",
    medical_conditions: "",
    dietary_preference: "",
    food_dislikes: "",
    // --- NEW FOOTBALL FIELDS ---
    national_team: "",
    local_team: "",
    international_team: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          age: formData.age ? parseInt(formData.age) : null,
          gender: formData.gender || null,
          height: formData.height ? parseFloat(formData.height) : null,
          country: formData.country || null,
          preferred_cuisine: formData.preferred_cuisine || null,
          medical_conditions: formData.medical_conditions || null,
          dietary_preference: formData.dietary_preference || null,
          food_dislikes: formData.food_dislikes || null,
          national_team: formData.national_team || null,
          local_team: formData.local_team || null,
          international_team: formData.international_team || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Registration failed");
      }

      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // UI Helper for Section Headers
  const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center mb-4 mt-8">
      <div className="w-[3px] h-[16px] bg-[#7C3AED] mr-2 rounded-full"></div>
      <h3 className="text-[12px] font-bold uppercase text-[#9CA3AF] tracking-widest">{title}</h3>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D1A] py-12 px-4 font-sans selection:bg-[#7C3AED] selection:text-white">
      <div className="bg-[#161625] w-full max-w-2xl rounded-[12px] border border-[#2A2A3D] p-[30px] shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[24px] font-bold tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] mb-2">
            LUMINA
          </h1>
          <p className="text-[#9CA3AF] text-[14px]">Initialize your personalized command center.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* Section 1: Core Credentials */}
          <SectionHeader title="Core Credentials" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">Email *</label>
              <input id="email" type="email" required onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#7C3AED] transition-colors" />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">Password *</label>
              <input id="password" type="password" required onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#7C3AED] transition-colors" />
            </div>
          </div>

          {/* Section 2: Biometrics & Location */}
          <SectionHeader title="Biometrics & Location" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label htmlFor="age" className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">Age</label>
              <input id="age" type="number" placeholder="e.g. 39" onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#7C3AED] placeholder-[#4B5563]" />
            </div>
            <div className="space-y-1">
              <label htmlFor="gender" className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">Gender</label>
              <select id="gender" onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#7C3AED]">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="height" className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">Height (cm)</label>
              <input id="height" type="number" placeholder="e.g. 180" onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#7C3AED] placeholder-[#4B5563]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="country" className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">Country</label>
              <input id="country" placeholder="e.g. Saudi Arabia" onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#7C3AED] placeholder-[#4B5563]" />
            </div>
            <div className="space-y-1">
              <label htmlFor="preferred_cuisine" className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">Preferred Cuisine</label>
              <input id="preferred_cuisine" placeholder="e.g. Egyptian" onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#7C3AED] placeholder-[#4B5563]" />
            </div>
          </div>

          {/* Section 3: Dietary Constraints */}
          <SectionHeader title="Health Constraints" />
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="medical_conditions" className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">Medical Conditions</label>
              <input id="medical_conditions" placeholder="e.g. SIBO, Diabetes" onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#7C3AED] placeholder-[#4B5563]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="dietary_preference" className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">Dietary Style</label>
                <input id="dietary_preference" placeholder="e.g. Keto, Vegetarian" onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#7C3AED] placeholder-[#4B5563]" />
              </div>
              <div className="space-y-1">
                <label htmlFor="food_dislikes" className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">Allergies / Dislikes</label>
                <input id="food_dislikes" placeholder="e.g. Peanuts, Gluten" onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#7C3AED] placeholder-[#4B5563]" />
              </div>
            </div>
          </div>

          {/* --- NEW: Section 4: Football Analytics --- */}
          <SectionHeader title="Sports Analytics Hub" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
            <div className="space-y-1">
              <label htmlFor="national_team" className="text-[11px] uppercase tracking-wider text-[#3B82F6]">National Team</label>
              <input id="national_team" placeholder="e.g. Egypt" onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#3B82F6] placeholder-[#4B5563]" />
            </div>
            <div className="space-y-1">
              <label htmlFor="local_team" className="text-[11px] uppercase tracking-wider text-[#10B981]">Local Club</label>
              <input id="local_team" placeholder="e.g. Al Ahly" onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#10B981] placeholder-[#4B5563]" />
            </div>
            <div className="space-y-1">
              <label htmlFor="international_team" className="text-[11px] uppercase tracking-wider text-[#F59E0B]">International Club</label>
              <input id="international_team" placeholder="e.g. Liverpool" onChange={handleChange} className="w-full bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[14px] rounded-md px-3 py-2 outline-none focus:border-[#F59E0B] placeholder-[#4B5563]" />
            </div>
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-md"><p className="text-[12px] text-[#EF4444] font-bold tracking-wide uppercase">{error}</p></div>}

          {/* Submit Action */}
          <div className="pt-4 border-t border-[#2A2A3D] flex flex-col space-y-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] hover:opacity-90 disabled:opacity-50 text-white text-[14px] font-bold uppercase tracking-wider py-3 rounded-[8px] transition-all flex justify-center items-center gap-2"
            >
              {loading ? <Activity className="w-4 h-4 animate-spin" /> : null}
              {loading ? "INITIALIZING..." : "INITIALIZE ACCOUNT"}
            </button>
            <p className="text-[12px] text-[#9CA3AF] text-center uppercase tracking-wider">
              ALREADY ACTIVE? <Link href="/login" className="text-[#06B6D4] hover:text-[#FFFFFF] font-bold transition-colors">AUTHENTICATE HERE</Link>
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}