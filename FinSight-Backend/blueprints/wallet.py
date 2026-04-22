"""
blueprints/wallet.py
─────────────────────────────────────────────────────────────────────────────
Virtual Wallet Service

Endpoints:
  GET  /api/wallet            → Fetch balance + locked_balance
  POST /api/wallet/credit     → Add funds
  POST /api/wallet/debit      → Deduct funds (e.g. for investment)
"""
import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from database import get_connection

wallet_bp = Blueprint('wallet', __name__)


def _ensure_wallet(conn, user_id: str):
    conn.execute(
        "INSERT OR IGNORE INTO wallets (user_id, wallet_balance, locked_balance) VALUES (?, 0, 0)",
        (user_id,)
    )


@wallet_bp.route('/api/wallet', methods=['GET'])
def get_wallet():
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    conn = get_connection()
    _ensure_wallet(conn, user_id)
    conn.commit()
    row = conn.execute(
        "SELECT wallet_balance, locked_balance FROM wallets WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()

    return jsonify({
        "wallet_balance": row['wallet_balance'],
        "locked_balance": row['locked_balance'],
        "available":      round(row['wallet_balance'] - row['locked_balance'], 2),
    })


@wallet_bp.route('/api/wallet/credit', methods=['POST'])
def credit_wallet():
    body    = request.get_json(force=True, silent=True) or {}
    user_id = body.get('user_id', '').strip()
    amount  = float(body.get('amount', 0))

    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    if amount <= 0:
        return jsonify({"error": "amount must be > 0"}), 400

    txn_id = str(uuid.uuid4())
    now    = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    try:
        _ensure_wallet(conn, user_id)
        conn.execute(
            "UPDATE wallets SET wallet_balance = wallet_balance + ? WHERE user_id = ?",
            (amount, user_id)
        )
        conn.execute(
            """INSERT INTO transaction_ledger
               (transaction_id, user_id, type, amount, asset_id, status, timestamp)
               VALUES (?, ?, 'CREDIT', ?, NULL, 'COMPLETED', ?)""",
            (txn_id, user_id, amount, now)
        )
        conn.commit()

        row = conn.execute(
            "SELECT wallet_balance, locked_balance FROM wallets WHERE user_id = ?", (user_id,)
        ).fetchone()
        return jsonify({
            "message":        "Wallet credited successfully",
            "credited":       amount,
            "wallet_balance": row['wallet_balance'],
            "locked_balance": row['locked_balance'],
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@wallet_bp.route('/api/wallet/debit', methods=['POST'])
def debit_wallet():
    body    = request.get_json(force=True, silent=True) or {}
    user_id = body.get('user_id', '').strip()
    amount  = float(body.get('amount', 0))
    reason  = body.get('reason', 'DEBIT')

    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    if amount <= 0:
        return jsonify({"error": "amount must be > 0"}), 400

    txn_id = str(uuid.uuid4())
    now    = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    try:
        _ensure_wallet(conn, user_id)
        row = conn.execute(
            "SELECT wallet_balance FROM wallets WHERE user_id = ?", (user_id,)
        ).fetchone()
        balance = row['wallet_balance'] if row else 0

        if balance < amount:
            return jsonify({
                "error": f"Insufficient balance. Have ₹{balance:.2f}, need ₹{amount:.2f}"
            }), 400

        conn.execute(
            "UPDATE wallets SET wallet_balance = wallet_balance - ? WHERE user_id = ?",
            (amount, user_id)
        )
        conn.execute(
            """INSERT INTO transaction_ledger
               (transaction_id, user_id, type, amount, asset_id, status, timestamp)
               VALUES (?, ?, ?, ?, NULL, 'COMPLETED', ?)""",
            (txn_id, user_id, reason, amount, now)
        )
        conn.commit()

        row = conn.execute(
            "SELECT wallet_balance, locked_balance FROM wallets WHERE user_id = ?", (user_id,)
        ).fetchone()
        return jsonify({
            "message":        "Wallet debited successfully",
            "debited":        amount,
            "wallet_balance": row['wallet_balance'],
            "locked_balance": row['locked_balance'],
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
