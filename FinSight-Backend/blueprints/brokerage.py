"""
blueprints/brokerage.py
─────────────────────────────────────────────────────────────────────────────
Mock Brokerage Engine — OMS, Portfolio Service, Price Engine, Transaction Ledger

Endpoints:
  GET  /api/prices          → All mock asset prices
  POST /api/orders          → Place BUY / SELL order
  GET  /api/orders          → Order history for a user
  GET  /api/portfolio       → Holdings + unrealised P&L + allocation
  GET  /api/ledger          → Transaction ledger entries
"""
import uuid
import random
import threading
from datetime import datetime, timezone
from math import ceil

from flask import Blueprint, jsonify, request
from database import get_connection

brokerage_bp = Blueprint('brokerage', __name__)

# ── Mock Asset Catalogue ────────────────────────────────────────────────────

ASSETS = {
    "NIFTY_BEES": {"name": "Nippon Nifty BeES ETF",   "type": "ETF",   "seed": 280.0},
    "GOLDBEES":   {"name": "Nippon Gold BeES ETF",     "type": "ETF",   "seed": 62.0},
    "INFY":       {"name": "Infosys",                  "type": "Stock", "seed": 1680.0},
    "TCS":        {"name": "TCS",                      "type": "Stock", "seed": 4020.0},
    "HDFC_MF":    {"name": "HDFC Flexi Cap MF",        "type": "MF",    "seed": 1450.0},
    "AXIS_MF":    {"name": "Axis Bluechip MF",         "type": "MF",    "seed": 58.0},
}

# ── In-Memory Price Cache (seeded, updated by scheduler) ───────────────────

_price_lock = threading.Lock()
_prices: dict[str, dict] = {}


def _init_prices():
    global _prices
    with _price_lock:
        for symbol, meta in ASSETS.items():
            _prices[symbol] = {
                "current": meta["seed"],
                "open":    meta["seed"],
                "prev":    meta["seed"],
            }


def tick_prices():
    """Random-walk: each asset moves ±2% per tick. Called by APScheduler."""
    with _price_lock:
        for symbol in _prices:
            change_pct = random.uniform(-0.02, 0.02)
            prev = _prices[symbol]["current"]
            new_price = round(prev * (1 + change_pct), 2)
            _prices[symbol]["prev"]    = prev
            _prices[symbol]["current"] = new_price


def _get_prices_snapshot():
    with _price_lock:
        return dict(_prices)


# ── Helper: ensure wallet row exists ───────────────────────────────────────

def _ensure_wallet(conn, user_id: str):
    conn.execute(
        "INSERT OR IGNORE INTO wallets (user_id, wallet_balance, locked_balance) VALUES (?, 0, 0)",
        (user_id,)
    )


# ── Routes ─────────────────────────────────────────────────────────────────

@brokerage_bp.route('/api/prices', methods=['GET'])
def get_prices():
    snapshot = _get_prices_snapshot()
    result = []
    for symbol, price_data in snapshot.items():
        meta = ASSETS[symbol]
        current = price_data["current"]
        prev    = price_data["prev"]
        change_pct = ((current - prev) / prev * 100) if prev else 0
        result.append({
            "symbol":      symbol,
            "name":        meta["name"],
            "type":        meta["type"],
            "price":       round(current, 2),
            "change_pct":  round(change_pct, 2),
            "is_up":       change_pct >= 0,
        })
    return jsonify(result)


@brokerage_bp.route('/api/orders', methods=['POST'])
def place_order():
    body       = request.get_json(force=True, silent=True) or {}
    user_id    = body.get('user_id', '').strip()
    asset_id   = body.get('asset_id', '').strip().upper()
    order_type = body.get('order_type', 'BUY').strip().upper()
    quantity   = float(body.get('quantity', 0))

    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    if asset_id not in ASSETS:
        return jsonify({"error": f"Unknown asset: {asset_id}"}), 400
    if quantity <= 0:
        return jsonify({"error": "quantity must be > 0"}), 400
    if order_type not in ('BUY', 'SELL'):
        return jsonify({"error": "order_type must be BUY or SELL"}), 400

    snapshot   = _get_prices_snapshot()
    exec_price = snapshot[asset_id]["current"]
    total_cost = round(exec_price * quantity, 2)

    order_id   = str(uuid.uuid4())
    txn_id     = str(uuid.uuid4())
    now        = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    try:
        _ensure_wallet(conn, user_id)

        # ── Validate wallet balance for BUY ────────────────────────────────
        if order_type == 'BUY':
            row = conn.execute(
                "SELECT wallet_balance FROM wallets WHERE user_id = ?", (user_id,)
            ).fetchone()
            balance = row['wallet_balance'] if row else 0
            if balance < total_cost:
                return jsonify({
                    "error": f"Insufficient wallet balance. Need ₹{total_cost:.2f}, have ₹{balance:.2f}"
                }), 400

        # ── Validate holdings for SELL ─────────────────────────────────────
        if order_type == 'SELL':
            row = conn.execute(
                "SELECT quantity FROM holdings WHERE user_id = ? AND asset_id = ?",
                (user_id, asset_id)
            ).fetchone()
            held_qty = row['quantity'] if row else 0
            if held_qty < quantity:
                return jsonify({
                    "error": f"Not enough units to sell. Have {held_qty}, requested {quantity}"
                }), 400

        # ── Insert Order ───────────────────────────────────────────────────
        conn.execute(
            """INSERT INTO orders
               (order_id, user_id, asset_type, asset_id, quantity, price, order_type, status, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'EXECUTED', ?)""",
            (order_id, user_id, ASSETS[asset_id]["type"], asset_id,
             quantity, exec_price, order_type, now)
        )

        # ── Update Holdings ────────────────────────────────────────────────
        if order_type == 'BUY':
            existing = conn.execute(
                "SELECT quantity, avg_buy_price FROM holdings WHERE user_id=? AND asset_id=?",
                (user_id, asset_id)
            ).fetchone()
            if existing:
                old_qty   = existing['quantity']
                old_avg   = existing['avg_buy_price']
                new_qty   = old_qty + quantity
                new_avg   = ((old_avg * old_qty) + (exec_price * quantity)) / new_qty
                conn.execute(
                    "UPDATE holdings SET quantity=?, avg_buy_price=? WHERE user_id=? AND asset_id=?",
                    (round(new_qty, 4), round(new_avg, 4), user_id, asset_id)
                )
            else:
                conn.execute(
                    "INSERT INTO holdings (user_id, asset_id, quantity, avg_buy_price) VALUES (?,?,?,?)",
                    (user_id, asset_id, round(quantity, 4), round(exec_price, 4))
                )
            # Deduct from wallet
            conn.execute(
                "UPDATE wallets SET wallet_balance = wallet_balance - ? WHERE user_id = ?",
                (total_cost, user_id)
            )

        elif order_type == 'SELL':
            existing = conn.execute(
                "SELECT quantity FROM holdings WHERE user_id=? AND asset_id=?",
                (user_id, asset_id)
            ).fetchone()
            new_qty = existing['quantity'] - quantity
            if new_qty <= 0.0001:
                conn.execute(
                    "DELETE FROM holdings WHERE user_id=? AND asset_id=?",
                    (user_id, asset_id)
                )
            else:
                conn.execute(
                    "UPDATE holdings SET quantity=? WHERE user_id=? AND asset_id=?",
                    (round(new_qty, 4), user_id, asset_id)
                )
            # Credit wallet
            conn.execute(
                "UPDATE wallets SET wallet_balance = wallet_balance + ? WHERE user_id = ?",
                (total_cost, user_id)
            )

        # ── Ledger Entry ───────────────────────────────────────────────────
        conn.execute(
            """INSERT INTO transaction_ledger
               (transaction_id, user_id, type, amount, asset_id, status, timestamp)
               VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)""",
            (txn_id, user_id, order_type, total_cost, asset_id, now)
        )

        conn.commit()
        return jsonify({
            "order_id":   order_id,
            "status":     "EXECUTED",
            "asset_id":   asset_id,
            "order_type": order_type,
            "quantity":   quantity,
            "price":      exec_price,
            "total":      total_cost,
            "timestamp":  now,
        }), 201

    except Exception as e:
        conn.rollback()
        print(f"[orders] Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@brokerage_bp.route('/api/orders', methods=['GET'])
def get_orders():
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM orders WHERE user_id=? ORDER BY timestamp DESC LIMIT 50",
        (user_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@brokerage_bp.route('/api/portfolio', methods=['GET'])
def get_portfolio():
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    conn = get_connection()
    holdings_rows = conn.execute(
        "SELECT * FROM holdings WHERE user_id=?", (user_id,)
    ).fetchall()
    conn.close()

    snapshot = _get_prices_snapshot()
    holdings = []
    total_invested = 0.0
    total_current  = 0.0

    for row in holdings_rows:
        asset_id   = row['asset_id']
        qty        = row['quantity']
        avg_price  = row['avg_buy_price']
        cur_price  = snapshot.get(asset_id, {}).get("current", avg_price)
        invested   = round(avg_price * qty, 2)
        cur_value  = round(cur_price * qty, 2)
        pnl        = round(cur_value - invested, 2)
        pnl_pct    = round((pnl / invested * 100) if invested else 0, 2)

        total_invested += invested
        total_current  += cur_value

        holdings.append({
            "asset_id":      asset_id,
            "name":          ASSETS.get(asset_id, {}).get("name", asset_id),
            "type":          ASSETS.get(asset_id, {}).get("type", "Unknown"),
            "quantity":      qty,
            "avg_buy_price": avg_price,
            "current_price": cur_price,
            "invested":      invested,
            "current_value": cur_value,
            "unrealised_pnl":     pnl,
            "unrealised_pnl_pct": pnl_pct,
        })

    # Add allocation %
    for h in holdings:
        h["allocation_pct"] = round(
            (h["current_value"] / total_current * 100) if total_current else 0, 2
        )

    total_pnl     = round(total_current - total_invested, 2)
    total_pnl_pct = round((total_pnl / total_invested * 100) if total_invested else 0, 2)

    return jsonify({
        "holdings":         holdings,
        "total_invested":   round(total_invested, 2),
        "total_value":      round(total_current, 2),
        "total_pnl":        total_pnl,
        "total_pnl_pct":    total_pnl_pct,
    })


@brokerage_bp.route('/api/ledger', methods=['GET'])
def get_ledger():
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM transaction_ledger WHERE user_id=? ORDER BY timestamp DESC LIMIT 50",
        (user_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ── Initialise price cache on module load ───────────────────────────────────
_init_prices()
