import os
from dotenv import load_dotenv
import json
import yfinance as yf
from flask import Flask, jsonify, request
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

# --- 1. MARKET PULSE ROUTE ---
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


# --- 2. GEMINI AI MARKET INSIGHTS ROUTE ---
@app.route('/api/market-insight', methods=['GET'])
def get_market_insight():
    try:
        tickers_str = " ".join(TICKERS.keys())
        data = yf.Tickers(tickers_str)
        
        market_summary = []
        for symbol, name in TICKERS.items():
            info = data.tickers[symbol].fast_info
            change_percent = ((info.last_price - info.previous_close) / info.previous_close) * 100
            direction = "up" if change_percent >= 0 else "down"
            market_summary.append(f"{name} is {direction} by {abs(change_percent):.2f}%")
            
        summary_str = ", ".join(market_summary)

        prompt = f"""
        You are 'FinSight AI', a friendly financial mentor for Indian college students.
        Here is today's live market data: {summary_str}.

        Pick the 2 most interesting market movements from that list and write a short, engaging insight for each.
        Return ONLY a valid JSON array containing exactly 2 objects.
        Each object MUST have exactly these two keys:
        1. "title": A short question or statement (e.g., "Why is NIFTY 50 up today?")
        2. "text": 2-3 sentences explaining the movement in simple English, plus a quick takeaway for a beginner investor.

        Do NOT use Hindi or Hinglish. Write in English only.
        Do NOT wrap the output in ```json markdown blocks. Return only the raw JSON array.
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        ai_response_text = response.text.strip()
        
        if ai_response_text.startswith("```json"):
            ai_response_text = ai_response_text[7:-3].strip()
        elif ai_response_text.startswith("```"):
            ai_response_text = ai_response_text[3:-3].strip()

        insight_data = json.loads(ai_response_text)
        return jsonify(insight_data)

    except Exception as e:
        print(f"Error generating AI insight: {e}")
        return jsonify([{
            "title": "AI is taking a break",
            "text": "Market data could not be processed right now. Please check your connection or try again in a minute."
        }])


# --- 3. FINSIGHT IQ AI ADVISOR ROUTE (POST) ---
@app.route('/api/ai-advisor', methods=['POST'])
def get_ai_advisor():
    try:
        body = request.get_json(force=True, silent=True) or {}

        transactions = body.get('transactions', [])
        budgets      = body.get('budgets', [])
        goals        = body.get('goals', [])
        score        = body.get('score', 400)
        streak       = body.get('streak', 0)

        # Build concise text summaries for Gemini
        tx_lines = []
        for t in transactions[:15]:
            tx_lines.append(
                f"  - {t.get('date','?')}: {t.get('type','debit')} "
                f"Rs{t.get('amount',0)} on {t.get('category','other')} "
                f"({t.get('merchant','unknown')})"
            )
        tx_summary = "\n".join(tx_lines) if tx_lines else "  No transactions recorded."

        budget_lines = []
        for b in budgets:
            pct = round((b.get('currentSpend', 0) / max(b.get('monthlyLimit', 1), 1)) * 100)
            budget_lines.append(
                f"  - {b.get('category','?')}: "
                f"Rs{b.get('currentSpend',0)} / Rs{b.get('monthlyLimit',0)} ({pct}% used)"
            )
        budget_summary = "\n".join(budget_lines) if budget_lines else "  No budgets set."

        goal_lines = []
        for g in goals[:3]:
            pct = round((g.get('savedAmount', 0) / max(g.get('targetAmount', 1), 1)) * 100)
            goal_lines.append(
                f"  - {g.get('title','?')} {g.get('emoji','')} - "
                f"{pct}% saved (Rs{g.get('savedAmount',0)} of Rs{g.get('targetAmount',0)})"
            )
        goal_summary = "\n".join(goal_lines) if goal_lines else "  No goals set."

        prompt = f"""You are 'FinSight Sensei', a sharp, encouraging financial coach for Indian students and young professionals.
You speak ONLY in English. Do not use any Hindi or Hinglish words whatsoever.
Your tone is direct, motivating, and data-driven — like a personal CFO.

FINSIGHT IQ SCORE: {score} / 1000
LEARNING STREAK: {streak} days

RECENT TRANSACTIONS:
{tx_summary}

BUDGET USAGE THIS MONTH:
{budget_summary}

SAVINGS GOALS:
{goal_summary}

Respond with ONLY a valid raw JSON object (no markdown, no code blocks) with exactly these keys:
{{
  "mood": "<One punchy sentence max 12 words summarising their financial situation right now>",
  "explanation": "<2-3 sentences explaining WHY their IQ score is at {score}. Reference specific data points.>",
  "quests": [
    {{"title": "<Short action title>", "description": "<One sentence: exactly what to do and the IQ reward>", "points": <integer 10-100>}},
    {{"title": "<Short action title>", "description": "<One sentence: exactly what to do and the IQ reward>", "points": <integer 10-100>}},
    {{"title": "<Short action title>", "description": "<One sentence: exactly what to do and the IQ reward>", "points": <integer 10-100>}}
  ]
}}

Rules:
- All text MUST be English only. No Hindi, no Hinglish.
- Quests must target REAL weaknesses visible in the user data (e.g., over-budget category, missing goals, broken streak).
- If finances look healthy, quests should focus on wealth growth (investing, increasing goals, completing modules).
- Return ONLY the raw JSON. No extra text, no markdown."""

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        raw = response.text.strip()
        if raw.startswith("```json"): raw = raw[7:]
        if raw.startswith("```"): raw = raw[3:]
        if raw.endswith("```"): raw = raw[:-3]
        advice = json.loads(raw.strip())
        return jsonify(advice)

    except Exception as e:
        print(f"[ai-advisor] Error: {e}")
        return jsonify({
            "mood": "Your finances are a work in progress — and that is perfectly fine.",
            "explanation": "We could not analyze your data right now. Keep tracking your transactions and check back shortly.",
            "quests": [
                {"title": "Track a Transaction", "description": "Add at least one transaction today to help personalize your coaching and earn +10 IQ.", "points": 10},
                {"title": "Set a Budget", "description": "Create a budget for your top spending category to build discipline and earn +20 IQ.", "points": 20},
                {"title": "Complete a Module", "description": "Finish any learning module in the Learn tab to boost your financial knowledge and earn +20 IQ.", "points": 20}
            ]
        })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)