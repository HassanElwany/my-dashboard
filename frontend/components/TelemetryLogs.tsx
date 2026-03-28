"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { DailyLog, AIInsight } from "../types";
import SectionHeader from "./SectionHeader";
import AddMealModal from "./AddMealModal";

export default function TelemetryLogs({ logs, onLogUpdate }: { logs: DailyLog[], onLogUpdate: () => void }) {
  const [aiInsights, setAiInsights] = useState<Record<number, AIInsight>>({});

  const handleGetInsight = async (logId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setAiInsights((prev) => ({ ...prev, [logId]: { loading: true, text: null } }));
    try {
      const res = await fetch(`http://localhost:8000/logs/${logId}/analyze`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to get AI insight");
      const data = await res.json();
      setAiInsights((prev) => ({ ...prev, [logId]: { loading: false, text: data.analysis } }));
    } catch (error) {
      setAiInsights((prev) => ({ ...prev, [logId]: { loading: false, text: "Failed to load AI advice." } }));
    }
  };

  const mealBorderColors = ["border-l-[#3B82F6]", "border-l-[#10B981]", "border-l-[#F59E0B]", "border-l-[#7C3AED]"];

  return (
    <section>
      <SectionHeader title="Telemetry & Logs" />

      {logs.length === 0 ? (
        <div className="bg-[#161625] rounded-[12px] border border-[#2A2A3D] p-[40px] text-center shadow-lg">
          <p className="text-[#9CA3AF] text-[14px] uppercase tracking-widest">NO DATA INGESTED FOR CURRENT CYCLE</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {logs.map((log) => {
            const totalCalories = log.meals.reduce((sum, meal) => sum + meal.calories, 0);
            const totalProtein = log.meals.reduce((sum, meal) => sum + meal.protein, 0);
            const totalCarbs = log.meals.reduce((sum, meal) => sum + meal.carbs, 0);
            const totalFats = log.meals.reduce((sum, meal) => sum + meal.fats, 0);
            const insight = aiInsights[log.id];

            return (
              <div key={log.id} className="bg-[#161625] rounded-[12px] border border-[#2A2A3D] p-[20px] flex flex-col shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:border-[#4B5563]">
                
                {/* Log Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#9CA3AF] block mb-1">DATE CYCLE</span>
                    <h3 className="text-[20px] font-bold text-[#FFFFFF]">{log.date}</h3>
                  </div>
                  {log.current_weight && (
                    <div className="text-right">
                      <span className="text-[11px] uppercase tracking-wider text-[#9CA3AF] block mb-1">METRIC</span>
                      <span className="text-[16px] font-bold text-[#06B6D4]">{log.current_weight} KG</span>
                    </div>
                  )}
                </div>
                
                {/* Hero Stats (Calories & Macros) */}
                <div className="space-y-4 mb-6">
                  <div className="bg-[#0D0D1A] rounded-[8px] p-4 border border-[#2A2A3D] flex justify-between items-center">
                    <span className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">DAILY CALORIES</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[28px] font-extrabold text-[#06B6D4] leading-none">{totalCalories}</span>
                      <span className="text-[11px] text-[#9CA3AF] uppercase">KCAL</span>
                    </div>
                  </div>

                  <div className="bg-[#0D0D1A] rounded-[8px] p-4 border border-[#2A2A3D] space-y-3">
                    <span className="text-[11px] uppercase tracking-wider text-[#9CA3AF] block mb-2">MACRO BALANCE</span>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] uppercase tracking-wider text-[#9CA3AF]">
                        <span>Protein</span><span className="text-[#FFFFFF] font-bold">{totalProtein}g</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#161625] rounded-full overflow-hidden">
                        <div className="h-full bg-[#3B82F6] transition-all duration-1000" style={{ width: `${Math.min((totalProtein/150)*100, 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] uppercase tracking-wider text-[#9CA3AF]">
                        <span>Carbs</span><span className="text-[#FFFFFF] font-bold">{totalCarbs}g</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#161625] rounded-full overflow-hidden">
                        <div className="h-full bg-[#7C3AED] transition-all duration-1000" style={{ width: `${Math.min((totalCarbs/300)*100, 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] uppercase tracking-wider text-[#9CA3AF]">
                        <span>Fats</span><span className="text-[#FFFFFF] font-bold">{totalFats}g</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#161625] rounded-full overflow-hidden">
                        <div className="h-full bg-[#F59E0B] transition-all duration-1000" style={{ width: `${Math.min((totalFats/75)*100, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meal Cards */}
                <div className="space-y-[10px] mb-6 flex-grow">
                  {log.meals.map((meal, index) => {
                    const borderColor = mealBorderColors[index % mealBorderColors.length];
                    return (
                      <div key={meal.id} className={`w-full bg-[#0D0D1A] rounded-[8px] border-l-[4px] ${borderColor} border-y border-r border-[#2A2A3D] p-3 flex justify-between items-center`}>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-semibold text-[#FFFFFF]">{meal.name}</span>
                          <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mt-1">
                            P {meal.protein}G · C {meal.carbs}G · F {meal.fats}G
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[18px] font-extrabold text-[#06B6D4]">{meal.calories}</span>
                          <span className="text-[9px] text-[#9CA3AF] uppercase">KCAL</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions & AI Insight */}
                <div className="space-y-3 mt-auto pt-4 border-t border-[#2A2A3D]">
                  {insight?.text ? (
                    <div className="bg-[#0D0D1A] border border-[#7C3AED]/30 p-3 rounded-[8px]">
                      <span className="text-[10px] uppercase font-bold text-[#7C3AED] tracking-widest flex items-center gap-1 mb-2">
                        <Activity className="w-3 h-3" /> SYSTEM ANALYSIS
                      </span>
                      <p className="text-[13px] text-[#D1D5DB] leading-relaxed">{insight.text}</p>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleGetInsight(log.id)}
                      disabled={insight?.loading}
                      className="w-full bg-transparent border border-[#2A2A3D] text-[#9CA3AF] hover:text-[#FFFFFF] hover:border-[#7C3AED] text-[11px] uppercase tracking-widest font-bold py-3 rounded-[8px] transition-colors"
                    >
                      {insight?.loading ? "ANALYZING..." : "RUN AI ANALYSIS"}
                    </button>
                  )}
                  
                  <div className="pt-2">
                     <AddMealModal logId={log.id} onMealAdded={onLogUpdate} />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}