"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, Activity, Newspaper, Building2, BarChart2 } from "lucide-react";

// Dynamically import ApexCharts so it doesn't crash Next.js SSR
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface StockDetails {
  symbol: string;
  profile: {
    name: string;
    sector: string;
    summary: string;
    market_cap: number;
  };
  candlestick_data: { x: number; y: number[] }[];
  news: {
    title: string;
    publisher: string;
    link: string;
    timestamp: number;
  }[];
}

const TIMEFRAMES = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '1Y', value: '1y' },
  { label: '5Y', value: '5y' }
];

export default function StockPage() {
  const { symbol } = useParams();
  const router = useRouter();
  
  const [data, setData] = useState<StockDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState("1y"); // Default to 1 Year

  useEffect(() => {
    const fetchStockData = async () => {
      setLoading(true);
      try {
        // Now passing the selected period to the backend
        const res = await fetch(`http://localhost:8000/finance/stock/${symbol}?period=${activePeriod}`);
        if (!res.ok) throw new Error("Failed to fetch market data");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, [symbol, activePeriod]); // Re-fetch whenever the active period changes

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D0D1A] text-white">
        <p className="text-[#EF4444] mb-4 uppercase tracking-widest text-[12px]">{error}</p>
        <button onClick={() => router.back()} className="text-[#9CA3AF] hover:text-[#FFFFFF] uppercase text-[10px] font-bold">
          Return to Dashboard
        </button>
      </div>
    );
  }

  // ApexCharts Configuration for the Japanese Candlesticks
  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'candlestick',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false }
    },
    theme: { mode: 'dark' },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#10B981', // Green for positive
          downward: '#EF4444' // Red for negative
        }
      }
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#9CA3AF' } },
      axisBorder: { color: '#2A2A3D' },
      axisTicks: { color: '#2A2A3D' }
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: { 
        style: { colors: '#9CA3AF' },
        formatter: (value) => value.toFixed(2)
      }
    },
    grid: { borderColor: '#2A2A3D', strokeDashArray: 4 },
    tooltip: { theme: 'dark' }
  };

  return (
    <main className="min-h-screen bg-[#0D0D1A] text-[#FFFFFF] font-sans selection:bg-[#7C3AED] pb-24">
      {/* HEADER */}
      <header className="h-[72px] px-6 flex items-center border-b border-[#2A2A3D]/50 bg-[#0D0D1A] sticky top-0 z-40">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[#9CA3AF] hover:text-[#FFFFFF] transition-colors uppercase tracking-widest text-[11px] font-bold">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </header>

      {loading && !data ? (
        <div className="flex justify-center items-center h-[60vh]">
          <Activity className="w-10 h-10 text-[#7C3AED] animate-pulse" />
        </div>
      ) : data && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
          
          {/* HERO / PROFILE SECTION */}
          <div className="bg-[#161625] rounded-[12px] border border-[#2A2A3D] p-[32px] md:p-[40px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
              <div>
                <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#FFFFFF] leading-tight tracking-tight">
                  {data.profile.name}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="bg-[#7C3AED]/20 text-[#7C3AED] px-3 py-1 rounded text-[12px] font-bold uppercase tracking-widest border border-[#7C3AED]/30">
                    {data.symbol}
                  </span>
                  <span className="text-[#9CA3AF] uppercase tracking-widest text-[12px] flex items-center gap-1">
                    <Building2 className="w-4 h-4" /> {data.profile.sector}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[#D1D5DB] text-[14px] leading-relaxed max-w-4xl">
              {data.profile.summary}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: CANDLESTICK CHART */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <BarChart2 className="w-5 h-5 text-[#10B981] mr-3" />
                  <h2 className="text-[16px] font-bold uppercase text-[#FFFFFF] tracking-wide">Price Action</h2>
                </div>
                
                {/* TIMEFRAME SELECTOR */}
                <div className="flex bg-[#0D0D1A] border border-[#2A2A3D] rounded-[6px] overflow-hidden">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => setActivePeriod(tf.value)}
                      className={`px-3 py-1.5 text-[10px] font-bold tracking-widest transition-colors ${
                        activePeriod === tf.value 
                          ? 'bg-[#7C3AED] text-[#FFFFFF]' 
                          : 'text-[#9CA3AF] hover:text-[#FFFFFF] hover:bg-[#2A2A3D]/50'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-[#161625] border border-[#2A2A3D] rounded-[12px] p-4 shadow-lg min-h-[400px] relative">
                {loading && (
                   <div className="absolute inset-0 z-10 bg-[#161625]/80 flex items-center justify-center rounded-[12px]">
                     <Activity className="w-8 h-8 text-[#7C3AED] animate-pulse" />
                   </div>
                )}
                {/* @ts-ignore */}
                <ReactApexChart 
                  options={chartOptions} 
                  series={[{ name: "Market Price", data: data.candlestick_data }]} 
                  type="candlestick" 
                  height={400} 
                />
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE NEWS FEED */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center mb-4">
                <Newspaper className="w-5 h-5 text-[#3B82F6] mr-3" />
                <h2 className="text-[16px] font-bold uppercase text-[#FFFFFF] tracking-wide">Market Intelligence</h2>
              </div>

              {data.news.length === 0 ? (
                 <div className="bg-[#161625] border border-[#2A2A3D] border-dashed rounded-[8px] p-8 text-center">
                   <p className="text-[12px] text-[#4B5563] uppercase tracking-widest">No recent news found.</p>
                 </div>
              ) : (
                <div className="space-y-3">
                  {data.news.map((item, i) => (
                    <a 
                      key={i} 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block bg-[#161625] border border-[#2A2A3D] rounded-[8px] p-4 shadow-sm hover:border-[#7C3AED] transition-colors group"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-[#7C3AED] font-bold uppercase truncate max-w-[60%]">
                          {item.publisher}
                        </span>
                        <span className="text-[9px] text-[#9CA3AF] font-medium uppercase">
                          {new Date(item.timestamp * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-[13px] text-[#D1D5DB] font-semibold leading-snug group-hover:text-[#FFFFFF] transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                    </a>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </main>
  );
}