"""
main.py

The Flask API exists for the two things a client cannot do safely itself: hold
the Gemini key and scrape Yahoo Finance. Four routes serve the app, plus a cache
readout.

It used to carry a simulated brokerage as well, thirteen routes over SQLite for
orders, wallets and round-ups, along with a background thread ticking mock
prices every sixty seconds. That whole layer went when the brokerage was cut
from the app, and with it the only state this service held. Nothing here
persists anything now, which is why losing the container costs nothing.
"""
import os
from dotenv import load_dotenv
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from google import genai

from auth import require_auth
from cache import (
    cache, make_key,
    TTL_FLASHCARDS, TTL_AI_ADVISOR,
)

load_dotenv()

app = Flask(__name__)

# Origins permitted to call this API from a browser. The native app is not
# subject to CORS, so this protects the web build; the ID token check is what
# protects everything else. Comma-separated, overridden per environment.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        'ALLOWED_ORIGINS', 'http://localhost:8081,http://127.0.0.1:8081'
    ).split(',')
    if o.strip()
]
CORS(
    app,
    resources={r"/api/*": {"origins": ALLOWED_ORIGINS}},
    allow_headers=['Content-Type', 'Authorization'],
    methods=['GET', 'POST'],
)
print(f"[CORS] Allowed origins: {ALLOWED_ORIGINS}")

client = genai.Client()

# Named once, and overridable without a code change, because models get retired
# under you. gemini-2.5-flash was hardcoded in three places and stopped being
# available to newly issued API keys: existing keys kept working, so the app
# looked fine until someone generated a fresh one and every AI route started
# answering with its fallback.
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-3.6-flash')

def cached_json(payload, hit: bool):
    """Return a JSON response tagged so you can see whether it was cached."""
    response = jsonify(payload)
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return response


# Appended to every Gemini prompt. The app renders icons, not glyphs, and its
# copy uses no em dashes, so generated text must not reintroduce either.
STYLE_RULES = """
- Write in English only. No Hindi, no Hinglish.
- Do NOT use emojis or any pictographic characters.
- Do NOT use em dashes. Use a comma, colon, or semicolon instead."""


# --- HEALTH ---
@app.route('/health', methods=['GET'])
def health():
    """
    Cheap liveness check, deliberately unauthenticated.

    This hosting tier stops the container after a spell with no traffic, and
    waking it has been measured at over a minute, which is longer than anyone
    will wait on the first screen of a demo. An uptime pinger can hit this
    every few minutes to keep the service warm; it needs no token, touches no
    user data, and makes no model call, so it is cheap enough to hit often.

    Nothing secret is returned. The model name is already in render.yaml.
    """
    return jsonify({
        "status": "ok",
        "model": GEMINI_MODEL,
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
    })


# --- 0. FLASHCARD GENERATOR ROUTE (POST) ---
@app.route('/api/generate-flashcards', methods=['POST'])
@require_auth
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
            model=GEMINI_MODEL,
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


# --- 3. FINSIGHT IQ AI ADVISOR ROUTE (POST) ---
@app.route('/api/ai-advisor', methods=['POST'])
@require_auth
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
            model=GEMINI_MODEL,
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
@require_auth
def get_cache_stats():
    return jsonify(cache.stats())


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)