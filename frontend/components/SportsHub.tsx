"use client";

import Link from "next/link";
import { FootballHubData } from "../types";
import SectionHeader from "./SectionHeader";
import { ArrowRight, AlertTriangle } from "lucide-react";

export default function SportsHub({ data }: { data: FootballHubData | null }) {
  const cards = [
    { title: "NATIONAL TEAM", team: data?.national_team, color: "text-[#3B82F6]", border: "border-t-[#3B82F6]" },
    { title: "LOCAL CLUB", team: data?.local_team, color: "text-[#10B981]", border: "border-t-[#10B981]" },
    { title: "INTERNATIONAL", team: data?.international_team, color: "text-[#F59E0B]", border: "border-t-[#F59E0B]" }
  ];

  return (
    <section>
      <SectionHeader title="Sports Analytics Hub" />
      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((card, idx) => (
          <div key={idx} className={`bg-[#161625] rounded-[12px] border border-[#2A2A3D] border-t-4 ${card.border} flex flex-col overflow-hidden shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:border-[#4B5563]`}>
            {/* Header */}
            <div className="p-[20px] bg-gradient-to-b from-[#2A2A3D]/30 to-transparent border-b border-[#2A2A3D] flex-grow">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${card.color} block mb-4`}>{card.title}</span>
              
              {/* --- NEW: Error Handling --- */}
              {card.team?.error ? (
                <div className="flex flex-col items-center justify-center text-center gap-2 py-6">
                  <AlertTriangle className="w-8 h-8 text-[#EF4444] mb-2" />
                  <p className="text-[#EF4444] text-[10px] font-bold uppercase tracking-widest bg-[#EF4444]/10 px-3 py-1 rounded">API Rate Limit</p>
                  <p className="text-[#9CA3AF] text-[10px] mt-1">Please wait 60 seconds.</p>
                </div>
              ) : card.team?.name ? (
                <div className="flex flex-col items-center justify-center text-center gap-4 py-4">
                  {card.team.logo && <img src={card.team.logo} alt="logo" className="w-20 h-20 object-contain drop-shadow-lg" />}
                  <h3 className="text-[20px] font-bold text-[#FFFFFF] leading-tight">{card.team.name}</h3>
                </div>
              ) : (
                <p className="text-[#9CA3AF] text-[12px] uppercase tracking-wider text-center py-8">No team configured</p>
              )}
            </div>

            {/* Link to Dedicated Page */}
            {card.team?.id && !card.team?.error && (
              <Link href={`/team/${card.team.id}`} className="block w-full">
                <div className="p-[16px] bg-[#0D0D1A] flex justify-between items-center group cursor-pointer hover:bg-[#2A2A3D]/50 transition-colors">
                  <span className="text-[11px] uppercase font-bold text-[#9CA3AF] group-hover:text-[#FFFFFF] tracking-widest transition-colors">View Full Team Data</span>
                  <ArrowRight className="w-4 h-4 text-[#7C3AED] group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}