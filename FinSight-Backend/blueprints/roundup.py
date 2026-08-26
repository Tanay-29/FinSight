"""
blueprints/roundup.py
─────────────────────────────────────────────────────────────────────────────
Round-Up & Invest Mechanism

Formula: rounded_amount = ceil(original / 10) * 10
         delta          = rounded_amount - original

Endpoints:
  POST /api/roundup/add     → Record a round-up delta from a transaction
  GET  /api/roundup/balance → Accumulated pending round-up balance
  GET  /api/roundup/history → List round-up transactions
  POST /api/roundup/invest  → Manually trigger auto-invest when >= THRESHOLD
"""
import uuid
import math
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request
from database import get_connection
from auth import require_auth

roundup_bp = Blueprint('roundup', __name__)

ROUNDUP_THRESHOLD = 500.0   # ₹500 threshold to trigger auto-invest
ROUNDUP_ASSET     = "NIFTY_BEES"  # Default asset for round-up investment


def _ensure_wallet(conn, user_id: str):
    conn.execute(
        "INSERT OR IGNORE INTO wallets (user_id, wallet_balance, locked_balance) VALUES (?, 0, 0)",
        (user_id,)
    )


@roundup_bp.route('/api/roundup/add', methods=['POST'])
@require_auth
def add_roundup():
    """
    Record a round-up delta for an expense transaction.
    Body: { user_id, original_amount }
    """
    body            = request.get_json(force=True, silent=True) or {}
    user_id         = g.uid
    original_amount = float(body.get('original_amount', 0))

    if original_amount <= 0:
        return jsonify({"error": "original_amount must be > 0"}), 400

    # Round-up to the nearest ₹10 ceiling
    rounded_amount = math.ceil(original_amount / 10) * 10
    delta          = round(rounded_amount - original_amount, 2)

    if delta == 0:
        return jsonify({
            "message":         "No round-up needed (already a round number)",
            "original_amount": original_amount,
            "rounded_amount":  rounded_amount,
            "delta":           0,
        })

    txn_id = str(uuid.uuid4())
    now    = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO roundup_transactions
               (txn_id, user_id, original_amount, rounded_amount, delta, status, timestamp)
               VALUES (?, ?, ?, ?, ?, 'PENDING', ?)""",
            (txn_id, user_id, original_amount, rounded_amount, delta, now)
        )
        conn.commit()
        return jsonify({
            "txn_id":          txn_id,
            "original_amount": original_amount,
            "rounded_amount":  rounded_amount,
            "delta":           delta,
            "status":          "PENDING",
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@roundup_bp.route('/api/roundup/balance', methods=['GET'])
@require_auth
def get_roundup_balance():
    user_id = g.uid

    conn = get_connection()
    row = conn.execute(
        "SELECT COALESCE(SUM(delta), 0) AS balance FROM roundup_transactions WHERE user_id=? AND status='PENDING'",
        (user_id,)
    ).fetchone()
    count_row = conn.execute(
        "SELECT COUNT(*) AS cnt FROM roundup_transactions WHERE user_id=? AND status='PENDING'",
        (user_id,)
    ).fetchone()
    conn.close()

    balance = round(row['balance'], 2)
    return jsonify({
        "roundup_balance":  balance,
        "pending_count":    count_row['cnt'],
        "threshold":        ROUNDUP_THRESHOLD,
        "ready_to_invest":  balance >= ROUNDUP_THRESHOLD,
        "progress_pct":     round(min(balance / ROUNDUP_THRESHOLD * 100, 100), 1),
    })


@roundup_bp.route('/api/roundup/history', methods=['GET'])
@require_auth
def get_roundup_history():
    user_id = g.uid

    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM roundup_transactions WHERE user_id=? ORDER BY timestamp DESC LIMIT 30",
        (user_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@roundup_bp.route('/api/roundup/invest', methods=['POST'])
@require_auth
def trigger_roundup_invest():
    """
    Manually triggered: sweeps all PENDING round-up deltas and places a BUY
    order for NIFTY_BEES using the accumulated balance.
    """
    user_id = g.uid

    conn = get_connection()
    try:
        # Get total pending round-up balance
        row = conn.execute(
            "SELECT COALESCE(SUM(delta), 0) AS balance FROM roundup_transactions WHERE user_id=? AND status='PENDING'",
            (user_id,)
        ).fetchone()
        balance = round(row['balance'], 2)

        if balance < ROUNDUP_THRESHOLD:
            return jsonify({
                "error": f"Balance ₹{balance:.2f} is below threshold ₹{ROUNDUP_THRESHOLD:.2f}. Keep saving!"
            }), 400

        # Import price engine lazily to avoid circular imports
        from blueprints.brokerage import _get_prices_snapshot, ASSETS
        snapshot   = _get_prices_snapshot()
        exec_price = snapshot[ROUNDUP_ASSET]["current"]
        quantity   = round(balance / exec_price, 4)

        if quantity < 0.0001:
            return jsonify({"error": "Balance too small to buy even a fraction of a unit"}), 400

        order_id = str(uuid.uuid4())
        txn_id   = str(uuid.uuid4())
        now      = datetime.now(timezone.utc).isoformat()

        # Mark all pending roundups as INVESTED
        conn.execute(
            "UPDATE roundup_transactions SET status='INVESTED' WHERE user_id=? AND status='PENDING'",
            (user_id,)
        )

        # Insert order
        conn.execute(
            """INSERT INTO orders
               (order_id, user_id, asset_type, asset_id, quantity, price, order_type, status, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, 'BUY', 'EXECUTED', ?)""",
            (order_id, user_id, ASSETS[ROUNDUP_ASSET]["type"],
             ROUNDUP_ASSET, quantity, exec_price, now)
        )

        # Update holdings
        _ensure_wallet(conn, user_id)
        existing = conn.execute(
            "SELECT quantity, avg_buy_price FROM holdings WHERE user_id=? AND asset_id=?",
            (user_id, ROUNDUP_ASSET)
        ).fetchone()
        if existing:
            old_qty  = existing['quantity']
            old_avg  = existing['avg_buy_price']
            new_qty  = old_qty + quantity
            new_avg  = ((old_avg * old_qty) + (exec_price * quantity)) / new_qty
            conn.execute(
                "UPDATE holdings SET quantity=?, avg_buy_price=? WHERE user_id=? AND asset_id=?",
                (round(new_qty, 4), round(new_avg, 4), user_id, ROUNDUP_ASSET)
            )
        else:
            conn.execute(
                "INSERT INTO holdings (user_id, asset_id, quantity, avg_buy_price) VALUES (?,?,?,?)",
                (user_id, ROUNDUP_ASSET, round(quantity, 4), round(exec_price, 4))
            )

        # Ledger entry
        conn.execute(
            """INSERT INTO transaction_ledger
               (transaction_id, user_id, type, amount, asset_id, status, timestamp)
               VALUES (?, ?, 'ROUND-UP INVEST', ?, ?, 'COMPLETED', ?)""",
            (txn_id, user_id, balance, ROUNDUP_ASSET, now)
        )

        conn.commit()
        return jsonify({
            "message":     "Round-up investment successful!",
            "order_id":    order_id,
            "asset":       ROUNDUP_ASSET,
            "quantity":    quantity,
            "price":       exec_price,
            "invested":    balance,
            "timestamp":   now,
        })

    except Exception as e:
        conn.rollback()
        print(f"[roundup/invest] Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
