from flask import Flask, jsonify
from flask_cors import CORS
import yfinance as yf

app = Flask(__name__)
# This allows your React Native app to talk to Flask safely
CORS(app) 

# Yahoo Finance Tickers mapped to your UI
TICKERS = {
    "^NSEI": "NIFTY 50",
    "^BSESN": "SENSEX",
    "GC=F": "GOLD (Futures)",
    "INR=X": "USD/INR"
}

# --- HINGLISH INSIGHT DATABASE ---
INSIGHT_TEMPLATES = {
    "NIFTY 50": {
        "up": {
            "title": "Why is NIFTY 50 up today?",
            "text": "Market sentiment positive hai! Jab top 50 companies grow karti hain, index upar jata hai. Think of it like a school's average grade going up because the top students scored well. Great day for equity investors!"
        },
        "down": {
            "title": "Why did NIFTY 50 dip?",
            "text": "Market mein thodi profit booking ho rahi hai. Log apne profits nikal rahe hain. Ghabrane ki baat nahi, for long-term investors, market dips are often good buying opportunities."
        }
    },
    "GOLD (Futures)": {
        "up": {
            "title": "Why did gold prices jump today?",
            "text": "Gold prices surged! Jab equity market volatile hota hai, gold becomes a safe haven. Think of it like this: if your savings account gives less interest, you prefer buying gold instead. Global uncertainty bhi gold demand push karti hai."
        },
        "down": {
            "title": "Why is gold falling?",
            "text": "Gold prices dipped slightly. Jab stock markets strong perform karte hain, investors gold se paisa nikal kar companies mein invest karte hain for better returns."
        }
    },
    "SENSEX": {
         "up": {
            "title": "Sensex is in the green!",
            "text": "BSE Sensex upar hai! Major sectors like IT and Banking acha perform kar rahe hain. Economy ke liye yeh ek strong positive signal hai."
        },
        "down": {
            "title": "Sensex is seeing a correction",
            "text": "Market thoda thanda pad raha hai aaj. Sometimes markets need to cool down after a rally. Consistency is key, keep your SIPs running!"
        }
    },
    "USD/INR": {
         "up": {
            "title": "Why is the Dollar getting stronger?",
            "text": "Rupee thoda weak hua hai against the Dollar. Imports mehange ho sakte hain, but our IT and pharma exports will actually benefit from this!"
        },
        "down": {
            "title": "Rupee is gaining strength!",
            "text": "Dollar ke mukable Rupee strong hua hai. Good news for the Indian economy as importing oil and electronics becomes slightly cheaper."
        }
    }
}

@app.route('/api/market-pulse', methods=['GET'])
def get_market_pulse():
    try:
        tickers_str = " ".join(TICKERS.keys())
        data = yf.Tickers(tickers_str)
        
        market_data = []
        id_counter = 1
        
        for symbol, name in TICKERS.items():
            info = data.tickers[symbol].fast_info
            
            current_price = info.last_price
            prev_close = info.previous_close
            change_percent = ((current_price - prev_close) / prev_close) * 100
            
            market_data.append({
                "id": str(id_counter),
                "name": name,
                "price": f"{current_price:,.2f}",
                "change": f"{abs(change_percent):.2f}",
                "isUp": change_percent >= 0
            })
            id_counter += 1
            
        return jsonify(market_data)

    except Exception as e:
        # Returns a 500 error code if Yahoo Finance is down
        return jsonify({"error": f"Failed to fetch market data: {str(e)}"}), 500

@app.route('/api/market-insight', methods=['GET'])
def get_market_insight():
    try:
        tickers_str = " ".join(TICKERS.keys())
        data = yf.Tickers(tickers_str)
        
        insights_list = []
        
        for symbol, name in TICKERS.items():
            info = data.tickers[symbol].fast_info
            current_price = info.last_price
            prev_close = info.previous_close
            change_percent = ((current_price - prev_close) / prev_close) * 100
            
            trend = "up" if change_percent >= 0 else "down"
            
            # Fetch the corresponding Hinglish explanation
            insight_data = INSIGHT_TEMPLATES.get(name, {}).get(trend, {
                "title": f"Movement in {name}",
                "text": f"{name} is seeing significant movement today at {abs(change_percent):.2f}%. Keep an eye on market trends!"
            })
            
            # Attach an absolute change value so we can sort them mathematically
            insight_data['abs_change'] = abs(change_percent)
            insights_list.append(insight_data)
            
        # Sort the list from biggest movers to smallest movers (Descending order)
        insights_list.sort(key=lambda x: x['abs_change'], reverse=True)
        
        # Clean up the extra math variable and grab the top 3
        top_3_insights = []
        for item in insights_list[:3]:
            del item['abs_change']
            top_3_insights.append(item)
            
        # Return the LIST of top 3 insights
        return jsonify(top_3_insights)

    except Exception as e:
        return jsonify({"error": f"Failed to generate insight: {str(e)}"}), 500
    
if __name__ == '__main__':
    # 0.0.0.0 allows your phone to connect over Wi-Fi
    app.run(host='0.0.0.0', port=8000)