"""
database.py — SQLite setup for FinSight Phase 1 Execution Layer
All brokerage, wallet, and round-up data persisted in brokerage.db
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'brokerage.db')


def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Create all tables if they don't exist."""
    conn = get_connection()
    cur = conn.cursor()

    # ── Orders ───────────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            order_id    TEXT PRIMARY KEY,
            user_id     TEXT NOT NULL,
            asset_type  TEXT NOT NULL,
            asset_id    TEXT NOT NULL,
            quantity    REAL NOT NULL,
            price       REAL NOT NULL,
            order_type  TEXT NOT NULL,   -- BUY / SELL
            status      TEXT NOT NULL,   -- PENDING / EXECUTED / FAILED
            timestamp   TEXT NOT NULL
        )
    """)

    # ── Holdings ─────────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS holdings (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       TEXT NOT NULL,
            asset_id      TEXT NOT NULL,
            quantity      REAL NOT NULL DEFAULT 0,
            avg_buy_price REAL NOT NULL DEFAULT 0,
            UNIQUE(user_id, asset_id)
        )
    """)

    # ── Transaction Ledger ───────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS transaction_ledger (
            transaction_id TEXT PRIMARY KEY,
            user_id        TEXT NOT NULL,
            type           TEXT NOT NULL,   -- BUY / SELL / ROUND-UP INVEST / CREDIT / DEBIT
            amount         REAL NOT NULL,
            asset_id       TEXT,
            status         TEXT NOT NULL,
            timestamp      TEXT NOT NULL
        )
    """)

    # ── Virtual Wallet ───────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS wallets (
            user_id         TEXT PRIMARY KEY,
            wallet_balance  REAL NOT NULL DEFAULT 0,
            locked_balance  REAL NOT NULL DEFAULT 0
        )
    """)

    # ── Round-Up Transactions ────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS roundup_transactions (
            txn_id          TEXT PRIMARY KEY,
            user_id         TEXT NOT NULL,
            original_amount REAL NOT NULL,
            rounded_amount  REAL NOT NULL,
            delta           REAL NOT NULL,
            status          TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING / INVESTED
            timestamp       TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print("[DB] SQLite schema initialised at", DB_PATH)
