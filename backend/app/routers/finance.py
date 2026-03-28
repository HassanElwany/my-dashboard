from fastapi import APIRouter, HTTPException
import yfinance as yf

router = APIRouter(prefix="/finance", tags=["Finance"])

@router.get("/quotes")
def get_stock_quotes(symbols: str):
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        tickers = yf.Tickers(" ".join(symbol_list))
        market_data = []
        
        for sym in symbol_list:
            try:
                ticker = tickers.tickers.get(sym)
                if not ticker: continue
                hist = ticker.history(period="2d")
                if hist.empty: continue
                
                # We wrap these in float() to strip away the NumPy wrappers
                current_price = float(hist['Close'].iloc[-1])
                
                if len(hist) >= 2:
                    prev_close = float(hist['Close'].iloc[-2])
                    change_amount = float(current_price - prev_close)
                    change_percent = float((change_amount / prev_close) * 100)
                else:
                    change_amount, change_percent = 0.0, 0.0

                currency = "E£" if ticker.info.get("currency") == "EGP" else "$"
                
                market_data.append({
                    "symbol": sym,
                    "short_name": str(ticker.info.get("shortName", sym)),
                    "current_price": round(current_price, 2),
                    "change_amount": round(change_amount, 2),
                    "change_percent": round(change_percent, 2),
                    "currency": currency,
                    # We wrap this in bool() to fix the numpy.bool_ crash!
                    "is_positive": bool(change_amount >= 0) 
                })
            except Exception as e:
                print(f"Error processing {sym}: {e}")
                continue
                
        return {"quotes": market_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))