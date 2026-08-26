/**
 * walletService.ts
 * Communicates with the Flask Virtual Wallet + Round-Up endpoints
 *
 * None of these take a user_id: the backend derives the account from the
 * Firebase ID token that authedFetch attaches.
 */
import { authedFetch } from '../config/api';

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

export const fetchWallet = async (): Promise<WalletState> => {
    const res = await authedFetch('/api/wallet');
    if (!res.ok) throw new Error('Failed to fetch wallet');
    return res.json();
};

export const creditWallet = async (amount: number): Promise<WalletState> => {
    const res = await authedFetch('/api/wallet/credit', {
        method: 'POST',
        body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credit failed');
    return data;
};

export const debitWallet = async (amount: number, reason = 'DEBIT'): Promise<WalletState> => {
    const res = await authedFetch('/api/wallet/debit', {
        method: 'POST',
        body: JSON.stringify({ amount, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Debit failed');
    return data;
};

export const addRoundup = async (original_amount: number) => {
    const res = await authedFetch('/api/roundup/add', {
        method: 'POST',
        body: JSON.stringify({ original_amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Round-up add failed');
    return data;
};

export const fetchRoundupBalance = async (): Promise<RoundupBalance> => {
    const res = await authedFetch('/api/roundup/balance');
    if (!res.ok) throw new Error('Failed to fetch round-up balance');
    return res.json();
};

export const fetchRoundupHistory = async (): Promise<RoundupTransaction[]> => {
    const res = await authedFetch('/api/roundup/history');
    if (!res.ok) throw new Error('Failed to fetch round-up history');
    return res.json();
};

export const triggerRoundupInvest = async () => {
    const res = await authedFetch('/api/roundup/invest', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Round-up invest failed');
    return data;
};
