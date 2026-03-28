"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { DietPlan } from "@/types";
import SectionHeader from "./SectionHeader";

export default function DietArchitect({ plans, onPlanGenerated }: { plans: DietPlan[], onPlanGenerated: () => void }) {
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [showPlan, setShowPlan] = useState(false); 
  const [planLanguage, setPlanLanguage] = useState("en");

  useEffect(() => {
    if (plans.length > 0 && !activePlanId) setActivePlanId(plans[0].id);
  }, [plans, activePlanId]);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentPlans = plans.filter(p => new Date(p.created_at) >= sevenDaysAgo);
  const isRateLimited = recentPlans.length >= 2;
  
  let unlockDateStr = "";
  if (isRateLimited && recentPlans.length > 0) {
    const unlockDate = new Date(new Date(recentPlans[0].created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
    unlockDateStr = unlockDate.toLocaleDateString() + " at " + unlockDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  const handleGenerate = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setPlanLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/plans/generate?language=${planLanguage}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(res.status === 429 ? "Limit reached." : "Generation failed");
      const data = await res.json();
      onPlanGenerated();
      setActivePlanId(data.id);
      setShowPlan(true); 
    } catch (err: any) { alert(err.message); } 
    finally { setPlanLoading(false); }
  };

  const activeContent = plans.find(p => p.id === activePlanId)?.content;

  return (
    <section>
      <SectionHeader title="AI Nutrition Architect" />
      <div className="bg-[#161625] rounded-[12px] border border-[#2A2A3D] p-[20px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#2A2A3D] pb-4 mb-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">Weekly Generation Limit</span>
            {isRateLimited 
              ? <span className="text-[12px] font-bold text-[#EF4444]">LIMIT REACHED // UNLOCKS {unlockDateStr.toUpperCase()}</span>
              : <span className="text-[12px] font-bold text-[#10B981]">{recentPlans.length}/2 PLANS USED // READY</span>
            }
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select className="bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[11px] uppercase rounded-md px-3 py-2 outline-none" value={planLanguage} onChange={e => setPlanLanguage(e.target.value)} disabled={planLoading || isRateLimited}>
              <option value="en">ENG</option><option value="ar">ARA</option>
            </select>
            <button onClick={handleGenerate} disabled={planLoading || isRateLimited} className="bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] hover:opacity-90 disabled:opacity-50 text-white text-[11px] font-bold uppercase px-6 py-2 rounded-md w-full md:w-auto transition-all">
              {planLoading ? "GENERATING..." : "NEW PLAN"}
            </button>
          </div>
        </div>

        {plans.length === 0 ? <p className="text-[14px] text-[#9CA3AF]">No architectural blueprints found.</p> : (
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <span className="text-[11px] uppercase text-[#9CA3AF]">Version History</span>
                 <select className="bg-[#0D0D1A] border border-[#2A2A3D] text-[#FFFFFF] text-[12px] rounded-md px-2 py-1 outline-none" value={activePlanId || ""} onChange={e => { setActivePlanId(parseInt(e.target.value)); setShowPlan(true); }}>
                   {plans.map((p, i) => <option key={p.id} value={p.id}>{new Date(p.created_at).toLocaleDateString()} {i === 0 ? "[ACTIVE]" : `[ARCHIVE-${i}]`}</option>)}
                 </select>
               </div>
               <button onClick={() => setShowPlan(!showPlan)} className="text-[11px] uppercase font-bold text-[#7C3AED] hover:text-[#5B21B6] transition-colors">{showPlan ? "COLLAPSE PLAN" : "EXPAND PLAN"}</button>
             </div>
             {showPlan && (
               <div dir="auto" className="bg-[#0D0D1A] border border-[#2A2A3D] rounded-[8px] p-[20px] text-[14px] text-[#D1D5DB] max-h-[500px] overflow-y-auto custom-scrollbar">
                 <ReactMarkdown components={{ h3: props => <h3 className="text-[#06B6D4] font-bold text-[16px] uppercase mt-6 mb-3" {...props} />, h2: props => <h2 className="text-[#7C3AED] font-bold text-[18px] uppercase mt-6 mb-3" {...props} />, strong: props => <strong className="text-[#FFFFFF]" {...props} /> }}>
                   {activeContent || ""}
                 </ReactMarkdown>
               </div>
             )}
           </div>
        )}
      </div>
    </section>
  );
}