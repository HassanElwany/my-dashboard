from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import yfinance as yf
import time
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from .. import models
from ..auth import get_current_user

router = APIRouter(prefix="/finance", tags=["Finance"])

import math

def safe_float(val, ndigits: int = 2):
    """Convert a float to rounded value, or None if it's nan/inf (not JSON serializable)."""
    try:
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else round(f, ndigits)
    except (TypeError, ValueError):
        return None

# --- IN-MEMORY CACHE ---
FINANCE_CACHE = {}
CACHE_TTL = 300  

def get_cached_data(key: str):
    if key in FINANCE_CACHE and time.time() - FINANCE_CACHE[key]['timestamp'] < CACHE_TTL:
        print(f"⚡ FINANCE CACHE HIT: {key}")
        return FINANCE_CACHE[key]['data']
    return None

def set_cached_data(key: str, data):
    print(f"🌐 FINANCE API CALL: {key}")
    FINANCE_CACHE[key] = {
        'timestamp': time.time(),
        'data': data
    }

@router.get("/quotes")
def get_stock_quotes(current_user: models.User = Depends(get_current_user)):
    try:
        symbols = current_user.tracked_stocks or "AAPL,MSFT,NVDA,COMI.CA"
        cache_key = f"quotes_{symbols}"
        cached = get_cached_data(cache_key)
        if cached: return cached

        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        tickers = yf.Tickers(" ".join(symbol_list))
        market_data = []
        
        for sym in symbol_list:
            try:
                ticker = tickers.tickers.get(sym)
                if not ticker: continue
                hist = ticker.history(period="2d")
                if hist.empty: continue
                
                current_price = safe_float(hist['Close'].iloc[-1])
                if current_price is None: continue  # skip stocks with no valid price
                
                if len(hist) >= 2:
                    prev_close = safe_float(hist['Close'].iloc[-2])
                    if prev_close:
                        change_amount = safe_float(current_price - prev_close)
                        change_percent = safe_float((current_price - prev_close) / prev_close * 100)
                    else:
                        change_amount, change_percent = 0.0, 0.0
                else:
                    change_amount, change_percent = 0.0, 0.0

                currency = "E£" if ticker.info.get("currency") == "EGP" else "$"
                
                market_data.append({
                    "symbol": sym,
                    "short_name": str(ticker.info.get("shortName", sym)),
                    "current_price": current_price,
                    "change_amount": change_amount,
                    "change_percent": change_percent,
                    "currency": currency,
                    "is_positive": bool((change_amount or 0) >= 0)
                })
            except Exception as e:
                print(f"Error processing {sym}: {e}")
                continue
                
        result = {"quotes": market_data}
        set_cached_data(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stock/{symbol}")
def get_stock_details(symbol: str, period: str = "1y"):
    """Fetches Candlestick data tailored to the requested timeframe."""
    try:
        symbol = symbol.upper()
        cache_key = f"details_{symbol}_{period}"
        cached = get_cached_data(cache_key)
        if cached: return cached

        ticker = yf.Ticker(symbol)
        
        # 1. Map UI periods to yfinance parameters
        period_mapping = {
            "1d": {"p": "1d", "i": "5m"},   # 1 Day -> 5 min intervals
            "1w": {"p": "5d", "i": "1h"},   # 1 Week (5 trading days) -> 1 hour intervals
            "1m": {"p": "1mo", "i": "1d"},  # 1 Month -> Daily intervals
            "1y": {"p": "1y", "i": "1d"},   # 1 Year -> Daily intervals
            "5y": {"p": "5y", "i": "1wk"}   # 5 Years -> Weekly intervals
        }
        
        config = period_mapping.get(period, {"p": "1y", "i": "1d"})
        
        # Get Historical Data
        hist = ticker.history(period=config["p"], interval=config["i"])
        candlestick_data = []
        
        if not hist.empty:
            for date, row in hist.iterrows():
                o = safe_float(row['Open'])
                h = safe_float(row['High'])
                l = safe_float(row['Low'])
                c = safe_float(row['Close'])
                if None in (o, h, l, c): continue  # skip candles with missing data
                candlestick_data.append({
                    "x": int(date.timestamp() * 1000),
                    "y": [o, h, l, c]
                })

        # 2. Get Latest News (RSS)
        formatted_news = []
        try:
            rss_url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={symbol}&region=US&lang=en-US"
            req = urllib.request.Request(rss_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                root = ET.fromstring(response.read())
                for item in root.findall('.//item')[:5]:
                    try:
                        timestamp = int(parsedate_to_datetime(item.findtext('pubDate')).timestamp())
                    except:
                        timestamp = int(time.time())
                    formatted_news.append({
                        "title": item.findtext('title') or "Market Update",
                        "publisher": "Yahoo Finance",
                        "link": item.findtext('link') or "#",
                        "timestamp": timestamp
                    })
        except Exception as e:
            print(f"Failed to fetch RSS news for {symbol}: {e}")
            
        # 3. Get basic profile
        info = ticker.info
        profile = {
            "name": info.get("longName", symbol),
            "sector": info.get("sector", "Unknown Sector"),
            "summary": info.get("longBusinessSummary", "No summary available.")[:250] + "...",
            "market_cap": info.get("marketCap", 0)
        }

        result = {
            "symbol": symbol,
            "profile": profile,
            "candlestick_data": candlestick_data,
            "news": formatted_news,
            "current_period": period
        }
        
        set_cached_data(cache_key, result)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))