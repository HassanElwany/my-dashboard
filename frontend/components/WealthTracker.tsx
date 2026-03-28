"use client";

import { useEffect, useState } from "react";
import { Activity, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { StockQuote } from "../types";
import SectionHeader from "./SectionHeader";

export default function WealthTracker() {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default watchlist: Mix of US Tech and EGX (Egyptian Stock Exchange)
  const defaultTickers = "AAPL,MSFT,NVDA,COMI.CA,HRHO.CA";

  const fetchMarketData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/finance/quotes?symbols=${defaultTickers}`);
      if (!res.ok) throw new Error("Market data feed offline.");
      const data = await res.json();
      setQuotes(data.quotes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    // Auto-refresh market data every 5 minutes
    const interval = setInterval(fetchMarketData, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section>
      <div className="flex justify-between items-center">
        <SectionHeader title="Wealth & Market Terminal" />
        <button 
          onClick={fetchMarketData}
          disabled={loading}
          className="text-[10px] uppercase font-bold text-[#7C3AED] hover:text-[#FFFFFF] tracking-widest transition-colors flex items-center gap-2"
        >
          {loading ? <Activity className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
          {loading ? "Syncing..." : "Sync Market Data"}
        </button>
      </div>

      {error ? (
        <div className="bg-[#161625] rounded-[12px] border border-[#EF4444]/30 p-[20px] text-center">
          <p className="text-[#EF4444] text-[12px] uppercase tracking-widest">{error}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {quotes.map((quote) => (
            <div 
              key={quote.symbol} 
              className={`bg-[#161625] rounded-[12px] border-b-4 ${quote.is_positive ? 'border-b-[#10B981]' : 'border-b-[#EF4444]'} border border-[#2A2A3D] p-[16px] flex flex-col justify-between shadow-lg transition-transform duration-300 hover:-translate-y-1`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[14px] font-black text-[#FFFFFF] tracking-wider">{quote.symbol.replace('.CA', '')}</span>
                  <span className="text-[9px] uppercase tracking-widest text-[#9CA3AF] truncate max-w-[100px]" title={quote.short_name}>
                    {quote.short_name}
                  </span>
                </div>
                {quote.is_positive ? (
                  <TrendingUp className="w-4 h-4 text-[#10B981]" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-[#EF4444]" />
                )}
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[12px] font-bold text-[#9CA3AF]">{quote.currency}</span>
                  <span className="text-[24px] font-extrabold text-[#FFFFFF] leading-none">
                    {quote.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className={`flex items-center gap-2 mt-2 text-[11px] font-bold uppercase tracking-wider ${quote.is_positive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  <span>{quote.is_positive ? '+' : ''}{quote.change_amount.toFixed(2)}</span>
                  <span className="bg-[#0D0D1A] px-1.5 py-0.5 rounded border border-[#2A2A3D]">
                    {quote.is_positive ? '+' : ''}{quote.change_percent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {/* Skeleton Loaders for initial load */}
          {loading && quotes.length === 0 && Array.from({ length: 5 }).map((_, i) => (
             <div key={i} className="bg-[#161625] rounded-[12px] border border-[#2A2A3D] p-[16px] h-[120px] animate-pulse">
               <div className="h-4 bg-[#2A2A3D] rounded w-1/2 mb-2"></div>
               <div className="h-2 bg-[#2A2A3D] rounded w-3/4 mb-6"></div>
               <div className="h-6 bg-[#2A2A3D] rounded w-full"></div>
             </div>
          ))}
        </div>
      )}
    </section>
  );
}