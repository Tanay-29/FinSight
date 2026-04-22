/**
 * walletService.ts
 * Communicates with the Flask Virtual Wallet + Round-Up endpoints
 */
import { BACKEND_URL } from '../config/api';

export interface WalletState {
    wallet_balance: number;
    locked_balance: number;
    available: number;
}

export interface RoundupBalance {
    roundup_balance: number;
    pending_count: number;
    threshold: number;
    ready_to_invest: boolean;
    progress_pct: number;
}

export interface RoundupTransaction {
    txn_id: string;
    user_id: string;
    original_amount: number;
    rounded_amount: number;
    delta: number;
    status: 'PENDING' | 'INVESTED';
    timestamp: string;
}

export const fetchWallet = async (user_id: string): Promise<WalletState> => {
    const res = await fetch(`${BACKEND_URL}/api/wallet?user_id=${encodeURIComponent(user_id)}`);
    if (!res.ok) throw new Error('Failed to fetch wallet');
    return res.json();
};

export const creditWallet = async (user_id: string, amount: number): Promise<WalletState> => {
    const res = await fetch(`${BACKEND_URL}/api/wallet/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credit failed');
    return data;
};

export const debitWallet = async (user_id: string, amount: number, reason = 'DEBIT'): Promise<WalletState> => {
    const res = await fetch(`${BACKEND_URL}/api/wallet/debit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, amount, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Debit failed');
    return data;
};

export const addRoundup = async (user_id: string, original_amount: number) => {
    const res = await fetch(`${BACKEND_URL}/api/roundup/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, original_amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Round-up add failed');
    return data;
};

export const fetchRoundupBalance = async (user_id: string): Promise<RoundupBalance> => {
    const res = await fetch(`${BACKEND_URL}/api/roundup/balance?user_id=${encodeURIComponent(user_id)}`);
    if (!res.ok) throw new Error('Failed to fetch round-up balance');
    return res.json();
};

export const fetchRoundupHistory = async (user_id: string): Promise<RoundupTransaction[]> => {
    const res = await fetch(`${BACKEND_URL}/api/roundup/history?user_id=${encodeURIComponent(user_id)}`);
    if (!res.ok) throw new Error('Failed to fetch round-up history');
    return res.json();
};

export const triggerRoundupInvest = async (user_id: string) => {
    const res = await fetch(`${BACKEND_URL}/api/roundup/invest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Round-up invest failed');
    return data;
};
