"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Activity } from "lucide-react";
import { UserProfile, DailyLog, DietPlan, FootballHubData } from "../types";

// Our modular components
import CreateLogModal from "../components/CreateLogModal";
import WealthTracker from "../components/WealthTracker";
import SportsHub from "../components/SportsHub";
import DietArchitect from "../components/DietArchitect";
import TelemetryLogs from "../components/TelemetryLogs";

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [footballData, setFootballData] = useState<FootballHubData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();

  const fetchDashboardData = useCallback(async (token: string) => {
    try {
      const logsRes = await fetch("http://localhost:8000/logs/", { headers: { Authorization: `Bearer ${token}` }});
      if (logsRes.ok) setLogs(await logsRes.json());

      const plansRes = await fetch("http://localhost:8000/plans/", { headers: { Authorization: `Bearer ${token}` }});
      if (plansRes.ok) setPlans(await plansRes.json());

      const footballRes = await fetch("http://localhost:8000/football/hub", { headers: { Authorization: `Bearer ${token}` }});
      if (footballRes.ok) setFootballData(await footballRes.json());
    } catch (error) { 
      console.error("Failed to fetch data", error); 
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");

    const init = async () => {
      try {
        const userRes = await fetch("http://localhost:8000/users/me", { headers: { Authorization: `Bearer ${token}` }});
        if (!userRes.ok) throw new Error();
        setUser(await userRes.json());
        await fetchDashboardData(token);
      } catch (err) {
        localStorage.removeItem("token");
        router.push("/login");
      } finally { 
        setLoading(false); 
      }
    };
    init();
  }, [router, fetchDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D1A]">
        <Activity className="w-10 h-10 text-[#7C3AED] animate-pulse" />
      </div>
    );
  }

  const refreshData = () => {
    const token = localStorage.getItem("token");
    if (token) fetchDashboardData(token);
  };

  return (
    <main className="min-h-screen bg-[#0D0D1A] text-[#FFFFFF] pb-24 font-sans selection:bg-[#7C3AED]">
      {/* HEADER */}
      <header className="h-[56px] px-6 flex justify-between items-center border-b border-[#2A2A3D]/50 bg-[#0D0D1A] sticky top-0 z-40">
        <h1 className="text-[20px] font-bold tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] to-[#5B21B6]">
          LUMINA
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-[11px] uppercase text-[#9CA3AF] tracking-wider hidden md:block">
            {user?.email}
          </span>
          <button 
            onClick={() => { localStorage.removeItem("token"); router.push("/login"); }} 
            className="text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-12">
        
        {/* Component Modules */}
        <DietArchitect plans={plans} onPlanGenerated={refreshData} />
        <WealthTracker />
        <SportsHub data={footballData} />
        <TelemetryLogs logs={logs} onLogUpdate={refreshData} />

      </div>

      <div className="fixed bottom-8 right-8 z-50">
        <CreateLogModal onLogCreated={refreshData} />
      </div>
    </main>
  );
}