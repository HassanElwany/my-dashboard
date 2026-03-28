"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Activity, Calendar, Users, AlertTriangle } from "lucide-react";
import { TeamData } from "@/types";

interface Fixture { date: string; competition: string; home_team: string; home_logo: string; away_team: string; away_logo: string; }
interface Player { id: number; name: string; age: number; number: number | null; position: string; photo: string; }

export default function TeamPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [team, setTeam] = useState<TeamData | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [squad, setSquad] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamDetails = async () => {
      try {
        const [overviewRes, fixturesRes, squadRes] = await Promise.all([
          fetch(`http://localhost:8000/football/team/${id}/overview`),
          fetch(`http://localhost:8000/football/team/${id}/fixtures`),
          fetch(`http://localhost:8000/football/team/${id}/squad`)
        ]);

        if (!overviewRes.ok) throw new Error((await overviewRes.json()).detail);
        setTeam(await overviewRes.json());

        if (!fixturesRes.ok) throw new Error((await fixturesRes.json()).detail);
        setFixtures((await fixturesRes.json()).fixtures);

        if (!squadRes.ok) throw new Error((await squadRes.json()).detail);
        setSquad((await squadRes.json()).squad);

      } catch (error: any) {
        setApiError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamDetails();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0D0D1A]"><Activity className="w-10 h-10 text-[#7C3AED] animate-pulse" /></div>;
  }

  return (
    <main className="min-h-screen bg-[#0D0D1A] text-[#FFFFFF] font-sans selection:bg-[#7C3AED] pb-24">
      <header className="h-[72px] px-6 flex items-center border-b border-[#2A2A3D]/50 bg-[#0D0D1A] sticky top-0 z-40">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[#9CA3AF] hover:text-[#FFFFFF] transition-colors uppercase tracking-widest text-[11px] font-bold">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        
        {/* --- CRITICAL ERROR DISPLAY --- */}
        {apiError && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444] rounded-[12px] p-8 flex flex-col items-center justify-center text-center shadow-lg">
            <AlertTriangle className="w-12 h-12 text-[#EF4444] mb-4" />
            <h2 className="text-[20px] font-bold text-[#FFFFFF] mb-2 uppercase tracking-wide">Data Feed Offline</h2>
            <p className="text-[#EF4444] font-mono text-[14px] bg-[#0D0D1A] p-4 rounded border border-[#EF4444]/30">
              {apiError}
            </p>
            <p className="text-[#9CA3AF] text-[12px] mt-4 max-w-lg">
              If this says "Rate limit exceeded" or "daily limit of 100 requests", your free API tier has been exhausted for the day. It will reset at midnight!
            </p>
          </div>
        )}

        {team && !apiError && (
          <>
            <div className="flex flex-col md:flex-row items-center gap-8 bg-[#161625] rounded-[12px] border border-[#2A2A3D] p-[40px]">
              <img src={team.logo} alt={team.name} className="w-32 h-32 object-contain drop-shadow-2xl" />
              <div className="text-center md:text-left">
                <h1 className="text-[40px] font-extrabold text-[#FFFFFF] leading-tight tracking-tight">{team.name}</h1>
                <p className="text-[#9CA3AF] uppercase tracking-widest text-[12px] mt-2">Verified API-Football Database Entry</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              
              <div className="md:col-span-1 space-y-4">
                <div className="flex items-center mb-6">
                  <Calendar className="w-5 h-5 text-[#7C3AED] mr-3" />
                  <h2 className="text-[16px] font-bold uppercase text-[#FFFFFF] tracking-wide">Next 5 Matches</h2>
                </div>

                {fixtures.length === 0 ? (
                  <div className="bg-[#161625] border border-[#2A2A3D] border-dashed rounded-[8px] p-6 text-center">
                    <p className="text-[12px] text-[#4B5563] uppercase tracking-widest">No scheduled fixtures</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fixtures.map((match, i) => (
                      <div key={i} className="bg-[#161625] border border-[#2A2A3D] rounded-[8px] p-4 flex flex-col gap-3 shadow-sm hover:border-[#4B5563] transition-colors">
                        <div className="flex justify-between items-center border-b border-[#2A2A3D]/50 pb-2">
                          <span className="text-[10px] text-[#7C3AED] font-bold uppercase truncate max-w-[65%]">{match.competition}</span>
                          <span className="text-[10px] text-[#9CA3AF] font-medium">
                            {new Date(match.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col items-center gap-1 w-[40%] text-center">
                            <img src={match.home_logo} className="w-8 h-8 object-contain" />
                            <span className="text-[11px] text-[#D1D5DB] font-bold truncate w-full">{match.home_team}</span>
                          </div>
                          <span className="text-[11px] text-[#4B5563] font-black">VS</span>
                          <div className="flex flex-col items-center gap-1 w-[40%] text-center">
                            <img src={match.away_logo} className="w-8 h-8 object-contain" />
                            <span className="text-[11px] text-[#D1D5DB] font-bold truncate w-full">{match.away_team}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center mb-6">
                  <Users className="w-5 h-5 text-[#3B82F6] mr-3" />
                  <h2 className="text-[16px] font-bold uppercase text-[#FFFFFF] tracking-wide">Active Roster</h2>
                </div>

                {squad.length === 0 ? (
                   <div className="bg-[#161625] border border-[#2A2A3D] border-dashed rounded-[8px] p-8 text-center">
                     <p className="text-[12px] text-[#4B5563] uppercase tracking-widest">API Data Unavailable for this team's roster.</p>
                   </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {squad.map((player, i) => (
                      <div key={i} className="bg-[#161625] border border-[#2A2A3D] rounded-[8px] p-3 flex items-center gap-3 hover:bg-[#2A2A3D]/30 transition-colors">
                        <img src={player.photo} className="w-12 h-12 rounded-full border border-[#2A2A3D] object-cover bg-[#0D0D1A]" />
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[13px] font-bold text-[#FFFFFF] truncate">{player.name}</span>
                          <div className="flex gap-2 text-[10px] uppercase font-semibold text-[#9CA3AF] mt-1">
                            <span className="text-[#3B82F6]">{player.position}</span>
                            {player.number && <span>#{player.number}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>
    </main>
  );
}