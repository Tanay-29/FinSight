import os
from dotenv import load_dotenv
import json
import yfinance as yf
from flask import Flask, jsonify
from flask_cors import CORS
from google import genai

# Load the hidden variables from the .env file
load_dotenv()

app = Flask(__name__)
# This allows your React Native app to talk to Flask safely
CORS(app) 

# --- AI CONFIGURATION ---
# The new client automatically picks up GEMINI_API_KEY from your .env file
client = genai.Client()

# Yahoo Finance Tickers mapped to your UI
TICKERS = {
    "^NSEI": "NIFTY 50",
    "^BSESN": "SENSEX",
    "GC=F": "GOLD (Futures)",
    "INR=X": "USD/INR"
}

# --- 1. MARKET PULSE ROUTE (Kept exactly as you had it!) ---
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
        return jsonify({"error": f"Failed to fetch market data: {str(e)}"}), 500


# --- 2. THE NEW GEMINI AI INSIGHTS ROUTE ---
@app.route('/api/market-insight', methods=['GET'])
def get_market_insight():
    try:
        # Step A: Fetch current market data to feed the AI context
        tickers_str = " ".join(TICKERS.keys())
        data = yf.Tickers(tickers_str)
        
        market_summary = []
        for symbol, name in TICKERS.items():
            info = data.tickers[symbol].fast_info
            change_percent = ((info.last_price - info.previous_close) / info.previous_close) * 100
            direction = "up" if change_percent >= 0 else "down"
            market_summary.append(f"{name} is {direction} by {abs(change_percent):.2f}%")
            
        summary_str = ", ".join(market_summary)

        # Step B: Give Gemini the live data and strict instructions
        prompt = f"""
        You are 'FinSight AI', a friendly financial mentor for Indian college students.
        Here is today's live market data: {summary_str}.

        Pick the 2 most interesting market movements from that list and write a short, engaging insight for each.
        Return ONLY a valid JSON array containing exactly 2 objects.
        Each object MUST have exactly these two keys:
        1. "title": A short question or statement (e.g., "Why is NIFTY 50 up today?")
        2. "text": 2-3 sentences explaining the movement in simple Hinglish (a mix of Hindi and English), plus a quick takeaway for a beginner investor.

        Do NOT wrap the output in ```json markdown blocks. Return only the raw JSON array.
        """

        # Step C: Generate content using the new client syntax
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        ai_response_text = response.text.strip()
        
        # Step D: Clean up formatting just in case Gemini tries to add markdown
        if ai_response_text.startswith("```json"):
            ai_response_text = ai_response_text[7:-3].strip()
        elif ai_response_text.startswith("```"):
            ai_response_text = ai_response_text[3:-3].strip()

        # Step E: Send it to the React Native app!
        insight_data = json.loads(ai_response_text)
        return jsonify(insight_data)

    except Exception as e:
        print(f"Error generating AI insight: {e}")
        # If API limit is reached or internet drops, send a polite fallback array
        return jsonify([{
            "title": "AI is taking a nap 💤",
            "text": "Market data process nahi ho pa raha hai. Please check your connection or try again in a minute!"
        }])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)