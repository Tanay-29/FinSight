import os
from dotenv import load_dotenv
import json
import yfinance as yf
from flask import Flask, jsonify, request
from flask_cors import CORS
from google import genai
from apscheduler.schedulers.background import BackgroundScheduler

# ── Phase 1: Execution Layer imports ────────────────────────────────────────
from database import init_db
from blueprints.brokerage import brokerage_bp, tick_prices
from blueprints.wallet import wallet_bp
from blueprints.roundup import roundup_bp
from blueprints.vitals_intel import vitals_intel_bp
from cache import (
    cache, make_key,
    TTL_MARKET_PULSE, TTL_MARKET_INSIGHT, TTL_FLASHCARDS, TTL_AI_ADVISOR,
)

load_dotenv()

app = Flask(__name__)
CORS(app)
client = genai.Client()

# ── Register Blueprints ──────────────────────────────────────────────────────
app.register_blueprint(brokerage_bp)
app.register_blueprint(wallet_bp)
app.register_blueprint(roundup_bp)
app.register_blueprint(vitals_intel_bp)

# ── Initialise SQLite DB ─────────────────────────────────────────────────────
init_db()

# ── Start Price Tick Scheduler (every 60 seconds) ────────────────────────────
scheduler = BackgroundScheduler()
scheduler.add_job(tick_prices, 'interval', seconds=60, id='price_tick')
scheduler.start()
print("[Scheduler] Price tick job started (every 60s)")

TICKERS = {
    "^NSEI": "NIFTY 50",
    "^BSESN": "SENSEX",
    "GC=F": "GOLD (Futures)",
    "INR=X": "USD/INR"
}


def cached_json(payload, hit: bool):
    """Return a JSON response tagged so you can see whether it was cached."""
    response = jsonify(payload)
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return response


def _fetch_market_quotes():
    """
    Live quotes for every ticker, cached briefly.

    Both /api/market-pulse and /api/market-insight need this, so sharing it
    halves the number of Yahoo requests.
    """
    cached = cache.get("market:quotes")
    if cached is not None:
        return cached, True

    data = yf.Tickers(" ".join(TICKERS.keys()))
    quotes = []
    for symbol, name in TICKERS.items():
        info = data.tickers[symbol].fast_info
        current_price = info.last_price
        prev_close = info.previous_close
        quotes.append({
            "symbol": symbol,
            "name": name,
            "price": current_price,
            "prev_close": prev_close,
            "change_percent": ((current_price - prev_close) / prev_close) * 100,
        })

    cache.set("market:quotes", quotes, TTL_MARKET_PULSE)
    return quotes, False

# Appended to every Gemini prompt. The app renders icons, not glyphs, and its
# copy uses no em dashes, so generated text must not reintroduce either.
STYLE_RULES = """
- Write in English only. No Hindi, no Hinglish.
- Do NOT use emojis or any pictographic characters.
- Do NOT use em dashes. Use a comma, colon, or semicolon instead."""


# --- 0. FLASHCARD GENERATOR ROUTE (POST) ---
@app.route('/api/generate-flashcards', methods=['POST'])
def generate_flashcards():
    try:
        body = request.get_json(force=True, silent=True) or {}
        title      = body.get('title', 'Finance Module')
        content    = body.get('content', '')
        key_points = body.get('keyPoints', [])

        # Cards are a pure function of the module text, so the same module
        # serves every user from one generation.
        cache_key = make_key("flashcards", title, content, key_points)
        hit = cache.get(cache_key)
        if hit is not None:
            return cached_json(hit, True)

        key_points_str = "\n".join(f"- {p}" for p in key_points) if key_points else "None provided."

        prompt = f"""You are a financial education assistant creating study flashcards for Indian students.

Based on the following module content, generate exactly 5 flashcards.

MODULE TITLE: {title}

MODULE CONTENT:
{content[:2000]}

KEY TAKEAWAYS:
{key_points_str}

Return ONLY a valid raw JSON array (no markdown, no code blocks) containing exactly 5 objects.
Each object must have exactly these two string keys:
- "question": A clear, specific question about a concept from this module (max 15 words)
- "answer": A concise but complete answer (2-3 sentences max, use Indian rupee examples where relevant)

Rules:{STYLE_RULES}
- Questions must test understanding, not just recall (e.g., "Why does..." "What happens when..." "How would you...")
- Answers must be simple enough for a college student with no finance background.
- Use Indian financial context where possible (SIP, NIFTY, EPF, etc.).
- Return ONLY the raw JSON array. No extra text."""

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        raw = response.text.strip()
        if raw.startswith("```json"): raw = raw[7:]
        if raw.startswith("```"):     raw = raw[3:]
        if raw.endswith("```"):       raw = raw[:-3]
        cards = json.loads(raw.strip())

        # Validate structure
        if not isinstance(cards, list):
            raise ValueError("Response is not a list")
        cards = [
            {"question": str(c.get("question", "")), "answer": str(c.get("answer", ""))}
            for c in cards[:5]
            if c.get("question") and c.get("answer")
        ]
        if len(cards) < 3:
            raise ValueError("Not enough valid cards")

        cache.set(cache_key, cards, TTL_FLASHCARDS)
        return cached_json(cards, False)

    except Exception as e:
        # Deliberately not cached: a transient failure must not serve generic
        # cards for the next day.
        print(f"[flashcards] Error: {e}")
        title_safe = body.get('title', 'Finance') if 'body' in dir() else 'Finance'
        return jsonify([
            {"question": f"What is the main concept covered in '{title_safe}'?",
             "answer": "This module covers a core financial concept. Re-read the content and key takeaways to solidify your understanding."},
            {"question": "Why is financial planning important for young Indians?",
             "answer": "Early financial planning allows you to leverage compound interest, build an emergency fund, and reach life goals faster with smaller monthly contributions."},
            {"question": "What is the difference between saving and investing?",
             "answer": "Saving is keeping money safely (e.g., in a bank) with low returns. Investing is putting money into assets like stocks or mutual funds for higher long-term growth but with some risk."},
        ])


# --- 1. MARKET PULSE ROUTE ---
@app.route('/api/market-pulse', methods=['GET'])
def get_market_pulse():
    try:
        quotes, hit = _fetch_market_quotes()

        market_data = [
            {
                "id": str(i),
                "name": q["name"],
                "price": f"{q['price']:,.2f}",
                "change": f"{abs(q['change_percent']):.2f}",
                "isUp": q["change_percent"] >= 0,
            }
            for i, q in enumerate(quotes, start=1)
        ]

        return cached_json(market_data, hit)

    except Exception as e:
        return jsonify({"error": f"Failed to fetch market data: {str(e)}"}), 500


# --- 2. GEMINI AI MARKET INSIGHTS ROUTE ---
@app.route('/api/market-insight', methods=['GET'])
def get_market_insight():
    try:
        # This commentary is identical for every user, so it is cached globally.
        # Without this, every Feed open by every user is one Gemini call.
        cached_insight = cache.get("market:insight")
        if cached_insight is not None:
            return cached_json(cached_insight, True)

        quotes, _ = _fetch_market_quotes()

        market_summary = [
            f"{q['name']} is {'up' if q['change_percent'] >= 0 else 'down'} "
            f"by {abs(q['change_percent']):.2f}%"
            for q in quotes
        ]
        summary_str = ", ".join(market_summary)

        prompt = f"""
        You are 'FinSight AI', a friendly financial mentor for Indian college students.
        Here is today's live market data: {summary_str}.

        Pick the 2 most interesting market movements from that list and write a short, engaging insight for each.
        Return ONLY a valid JSON array containing exactly 2 objects.
        Each object MUST have exactly these two keys:
        1. "title": A short question or statement (e.g., "Why is NIFTY 50 up today?")
        2. "text": 2-3 sentences explaining the movement in simple English, plus a quick takeaway for a beginner investor.

        Rules:{STYLE_RULES}
        - Do NOT wrap the output in ```json markdown blocks. Return only the raw JSON array.
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
        cache.set("market:insight", insight_data, TTL_MARKET_INSIGHT)
        return cached_json(insight_data, False)

    except Exception as e:
        # Not cached, so the next request retries rather than serving this
        # placeholder for the next 15 minutes.
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
                f"  - {g.get('title','?')}: "
                f"{pct}% saved (Rs{g.get('savedAmount',0)} of Rs{g.get('targetAmount',0)})"
            )
        goal_summary = "\n".join(goal_lines) if goal_lines else "  No goals set."

        # These summaries plus the score fully determine the prompt, so they
        # make the cache key. Advice is regenerated when the user's finances
        # actually change, and not when they simply reopen the app.
        cache_key = make_key("advisor", score, streak, tx_summary, budget_summary, goal_summary)
        hit = cache.get(cache_key)
        if hit is not None:
            return cached_json(hit, True)

        prompt = f"""You are 'FinSight Sensei', a sharp, encouraging financial coach for Indian students and young professionals.
You speak ONLY in English. Do not use any Hindi or Hinglish words whatsoever.
Your tone is direct, motivating, and data-driven - like a personal CFO.

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

Rules:{STYLE_RULES}
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
        cache.set(cache_key, advice, TTL_AI_ADVISOR)
        return cached_json(advice, False)

    except Exception as e:
        # Not cached: the fallback is a placeholder, not real coaching.
        print(f"[ai-advisor] Error: {e}")
        return jsonify({
            "mood": "Your finances are a work in progress - and that is perfectly fine.",
            "explanation": "We could not analyze your data right now. Keep tracking your transactions and check back shortly.",
            "quests": [
                {"title": "Track a Transaction", "description": "Add at least one transaction today to help personalize your coaching and earn +10 IQ.", "points": 10},
                {"title": "Set a Budget", "description": "Create a budget for your top spending category to build discipline and earn +20 IQ.", "points": 20},
                {"title": "Complete a Module", "description": "Finish any learning module in the Learn tab to boost your financial knowledge and earn +20 IQ.", "points": 20}
            ]
        })


# --- 4. CACHE STATS (for checking the cache is doing its job) ---
@app.route('/api/cache-stats', methods=['GET'])
def get_cache_stats():
    return jsonify(cache.stats())


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)