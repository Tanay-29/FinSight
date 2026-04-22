"""
blueprints/vitals_intel.py
─────────────────────────────────────────────────────────────────────────────
Intelligence Layer — Predictive Burn Rate, Actionable Savings Engine, 50/30/20

All endpoints accept user financial data from the request body (transactions,
budgets, income) — no Firestore coupling on the backend.

Endpoints:
  POST /api/vitals/burn-rate      → Projected monthly spend + variance
  POST /api/vitals/savings-engine → Category surplus detection + recommendations
  POST /api/vitals/503020         → Real-time 50/30/20 ratios + alerts
"""
from datetime import datetime, timezone
import calendar

from flask import Blueprint, jsonify, request

vitals_intel_bp = Blueprint('vitals_intel', __name__)

# Category → bucket mapping (mirrors frontend BUCKET_MAP)
BUCKET_MAP = {
    'groceries':     'needs',
    'utilities':     'needs',
    'transport':     'needs',
    'health':        'needs',
    'healthcare':    'needs',
    'housing':       'needs',
    'rent':          'needs',
    'dining':        'wants',
    'shopping':      'wants',
    'entertainment': 'wants',
    'education':     'wants',
    'miscellaneous': 'wants',
    'other':         'wants',
    'investments':   'savings',
}


def _bucket_of(category: str) -> str:
    return BUCKET_MAP.get(category.lower(), 'wants')


# ── /api/vitals/burn-rate ────────────────────────────────────────────────────

@vitals_intel_bp.route('/api/vitals/burn-rate', methods=['POST'])
def burn_rate():
    """
    Body:
      {
        "transactions": [...],   // same schema as Firestore transactions
        "total_budget": 30000,   // monthly budget ceiling (optional)
      }
    """
    body          = request.get_json(force=True, silent=True) or {}
    transactions  = body.get('transactions', [])
    total_budget  = float(body.get('total_budget', 0))

    now           = datetime.now(timezone.utc)
    current_month = now.strftime('%Y-%m')
    days_elapsed  = now.day
    days_in_month = calendar.monthrange(now.year, now.month)[1]

    # Filter current month debit transactions
    monthly_debits = [
        t for t in transactions
        if t.get('type') == 'debit'
        and (t.get('date') or '')[:7] == current_month
    ]

    current_month_spend = sum(float(t.get('amount', 0)) for t in monthly_debits)

    # Linear projection
    daily_avg             = current_month_spend / days_elapsed if days_elapsed else 0
    projected_monthly     = round(daily_avg * days_in_month, 2)
    budget_variance       = round(projected_monthly - total_budget, 2) if total_budget else None
    days_remaining        = days_in_month - days_elapsed

    # Category breakdown for current month
    cat_spend: dict[str, float] = {}
    for t in monthly_debits:
        cat = (t.get('category') or 'other').lower()
        cat_spend[cat] = cat_spend.get(cat, 0) + float(t.get('amount', 0))

    # Top spending categories
    top_categories = sorted(
        [{"category": k, "amount": round(v, 2)} for k, v in cat_spend.items()],
        key=lambda x: -x["amount"]
    )[:5]

    # Burn rate status
    if total_budget and projected_monthly > total_budget:
        status = "OVER_BUDGET"
        alert  = f"At this rate you'll overspend by ₹{abs(budget_variance):,.0f} this month."
    elif total_budget and projected_monthly > total_budget * 0.85:
        status = "WARNING"
        alert  = f"You're on track to use {round(projected_monthly/total_budget*100)}% of budget."
    else:
        status = "ON_TRACK"
        alert  = "Great! Your spending is within a healthy range."

    return jsonify({
        "current_month_spend":   round(current_month_spend, 2),
        "days_elapsed":          days_elapsed,
        "days_remaining":        days_remaining,
        "days_in_month":         days_in_month,
        "daily_avg":             round(daily_avg, 2),
        "projected_monthly":     projected_monthly,
        "total_budget":          total_budget,
        "budget_variance":       budget_variance,
        "status":                status,
        "alert":                 alert,
        "top_categories":        top_categories,
    })


# ── /api/vitals/savings-engine ───────────────────────────────────────────────

@vitals_intel_bp.route('/api/vitals/savings-engine', methods=['POST'])
def savings_engine():
    """
    Body:
      {
        "transactions": [...],
        "budgets": [{ "category": "dining", "monthlyLimit": 3000, "currentSpend": 1200 }, ...],
        "income": 50000
      }
    Detects surplus and emits SAVINGS_DETECTED events with recommendations.
    """
    body         = request.get_json(force=True, silent=True) or {}
    transactions = body.get('transactions', [])
    budgets      = body.get('budgets', [])
    income       = float(body.get('income', 0))

    now           = datetime.now(timezone.utc)
    current_month = now.strftime('%Y-%m')

    # Compute actual spend per category this month
    cat_spend: dict[str, float] = {}
    for t in transactions:
        if t.get('type') == 'debit' and (t.get('date') or '')[:7] == current_month:
            cat = (t.get('category') or 'other').lower()
            cat_spend[cat] = cat_spend.get(cat, 0) + float(t.get('amount', 0))

    total_spend = sum(cat_spend.values())

    # Detect surpluses
    events = []
    for b in budgets:
        cat   = (b.get('category') or '').lower()
        limit = float(b.get('monthlyLimit') or b.get('monthly_limit') or 0)
        actual = cat_spend.get(cat, 0)

        if limit > 0 and actual < limit:
            surplus = round(limit - actual, 2)
            surplus_pct = round(surplus / limit * 100, 1)

            # Determine recommendation
            bucket = _bucket_of(cat)
            if bucket == 'wants':
                recommendation = "INVEST"
                action_text    = f"Redirect ₹{surplus:,.0f} surplus to a SIP or ETF investment."
            elif bucket == 'needs' and surplus > 500:
                recommendation = "SAVE"
                action_text    = f"Move ₹{surplus:,.0f} to your emergency fund."
            else:
                recommendation = "REALLOCATE"
                action_text    = f"Reallocate ₹{surplus:,.0f} toward a savings goal."

            events.append({
                "event":          "SAVINGS_DETECTED",
                "category":       cat,
                "planned_budget": limit,
                "actual_spend":   round(actual, 2),
                "surplus":        surplus,
                "surplus_pct":    surplus_pct,
                "recommendation": recommendation,
                "action_text":    action_text,
            })

    # Sort by surplus descending
    events.sort(key=lambda e: -e["surplus"])

    total_surplus = round(sum(e["surplus"] for e in events), 2)

    return jsonify({
        "total_spend":   round(total_spend, 2),
        "total_surplus": total_surplus,
        "events":        events,
        "income":        income,
        "savings_rate":  round((income - total_spend) / income * 100, 1) if income else None,
    })


# ── /api/vitals/503020 ───────────────────────────────────────────────────────

@vitals_intel_bp.route('/api/vitals/503020', methods=['POST'])
def rule_503020():
    """
    Body:
      {
        "transactions": [...],
        "income": 50000
      }
    Returns real-time Needs / Wants / Savings ratios with threshold alerts.
    """
    body         = request.get_json(force=True, silent=True) or {}
    transactions = body.get('transactions', [])
    income       = float(body.get('income', 0))

    now           = datetime.now(timezone.utc)
    current_month = now.strftime('%Y-%m')

    buckets: dict[str, float] = {"needs": 0, "wants": 0, "savings": 0}
    cat_detail: dict[str, dict] = {"needs": {}, "wants": {}, "savings": {}}

    for t in transactions:
        if t.get('type') == 'debit' and (t.get('date') or '')[:7] == current_month:
            cat    = (t.get('category') or 'other').lower()
            amt    = float(t.get('amount', 0))
            bucket = _bucket_of(cat)
            buckets[bucket] += amt
            cat_detail[bucket][cat] = cat_detail[bucket].get(cat, 0) + amt

    total_spend = sum(buckets.values())

    targets = {"needs": 50, "wants": 30, "savings": 20}

    result_buckets = {}
    alerts = []

    for bucket, spend in buckets.items():
        pct_of_spend  = round(spend / total_spend * 100, 1) if total_spend else 0
        pct_of_income = round(spend / income * 100, 1) if income else 0
        target        = targets[bucket]
        delta         = round(pct_of_spend - target, 1)

        result_buckets[bucket] = {
            "amount":        round(spend, 2),
            "pct_of_spend":  pct_of_spend,
            "pct_of_income": pct_of_income,
            "target_pct":    target,
            "delta":         delta,
            "status":        "ON_TRACK" if abs(delta) <= 5 else ("OVER" if delta > 0 else "UNDER"),
            "categories":    {k: round(v, 2) for k, v in cat_detail[bucket].items()},
        }

        # Generate alerts for significant deviations
        if abs(delta) > 5:
            if bucket == 'wants' and delta > 0:
                alerts.append({
                    "type":    "WARNING",
                    "bucket":  "wants",
                    "message": f"Wants spending is {delta:.1f}% above the 30% target.",
                })
            if bucket == 'savings' and spend == 0:
                alerts.append({
                    "type":    "CRITICAL",
                    "bucket":  "savings",
                    "message": "No savings recorded this month. Start a SIP today!",
                })
            elif bucket == 'savings' and delta < -5:
                alerts.append({
                    "type":    "INFO",
                    "bucket":  "savings",
                    "message": f"Savings is {abs(delta):.1f}% below the 20% target.",
                })

    # Implicit savings = income - spend (if income provided)
    implicit_savings = round(income - total_spend, 2) if income else None

    return jsonify({
        "total_spend":       round(total_spend, 2),
        "income":            income,
        "implicit_savings":  implicit_savings,
        "buckets":           result_buckets,
        "alerts":            alerts,
        "is_golden_ratio":   all(
            abs(result_buckets[b]["delta"]) <= 5
            for b in result_buckets
        ),
    })
