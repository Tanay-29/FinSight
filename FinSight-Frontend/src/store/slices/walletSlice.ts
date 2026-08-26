/**
 * walletSlice.ts - Redux slice for Virtual Wallet + Round-Up mechanism
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    fetchWallet, creditWallet, debitWallet,
    fetchRoundupBalance, fetchRoundupHistory, triggerRoundupInvest,
    addRoundup,
    WalletState, RoundupBalance, RoundupTransaction,
} from '../../services/walletService';
import type { RootState } from '../store';

interface WalletReduxState {
    balance: number;
    lockedBalance: number;
    available: number;
    roundup: RoundupBalance | null;
    roundupHistory: RoundupTransaction[];
    loading: boolean;
    roundupLoading: boolean;
    error: string | null;
    lastInvestResult: any | null;
}

const initialState: WalletReduxState = {
    balance: 0,
    lockedBalance: 0,
    available: 0,
    roundup: null,
    roundupHistory: [],
    loading: false,
    roundupLoading: false,
    error: null,
    lastInvestResult: null,
};

// ── Thunks ────────────────────────────────────────────────────────────────

export const loadWallet = createAsyncThunk(
    'wallet/load',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('Not authenticated');
            return await fetchWallet();
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

export const addFunds = createAsyncThunk(
    'wallet/credit',
    async (amount: number, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('Not authenticated');
            return await creditWallet(amount);
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

export const removeFunds = createAsyncThunk(
    'wallet/debit',
    async ({ amount, reason }: { amount: number; reason?: string }, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('Not authenticated');
            return await debitWallet(amount, reason);
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

export const recordRoundup = createAsyncThunk(
    'wallet/addRoundup',
    async (original_amount: number, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('Not authenticated');
            return await addRoundup(original_amount);
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

export const loadRoundupBalance = createAsyncThunk(
    'wallet/loadRoundupBalance',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('Not authenticated');
            return await fetchRoundupBalance();
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

export const loadRoundupHistory = createAsyncThunk(
    'wallet/loadRoundupHistory',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('Not authenticated');
            return await fetchRoundupHistory();
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

export const investRoundups = createAsyncThunk(
    'wallet/investRoundups',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('Not authenticated');
            return await triggerRoundupInvest();
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

// ── Slice ─────────────────────────────────────────────────────────────────

const walletSlice = createSlice({
    name: 'wallet',
    initialState,
    reducers: {
        clearWalletError(state) { state.error = null; },
        clearInvestResult(state) { state.lastInvestResult = null; },
    },
    extraReducers: (builder) => {
        const setWalletFromPayload = (state: WalletReduxState, payload: WalletState) => {
            state.balance       = payload.wallet_balance;
            state.lockedBalance = payload.locked_balance;
            state.available     = payload.available;
            state.loading       = false;
        };

        builder
            .addCase(loadWallet.pending, (state) => { state.loading = true; })
            .addCase(loadWallet.fulfilled, (state, action) => setWalletFromPayload(state, action.payload))
            .addCase(loadWallet.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

        builder
            .addCase(addFunds.fulfilled, (state, action) => setWalletFromPayload(state, action.payload))
            .addCase(addFunds.rejected, (state, action) => { state.error = action.payload as string; });

        builder
            .addCase(removeFunds.fulfilled, (state, action) => setWalletFromPayload(state, action.payload))
            .addCase(removeFunds.rejected, (state, action) => { state.error = action.payload as string; });

        builder
            .addCase(loadRoundupBalance.fulfilled, (state, action) => { state.roundup = action.payload; })
            .addCase(loadRoundupBalance.rejected, (state, action) => { state.error = action.payload as string; });

        builder
            .addCase(loadRoundupHistory.fulfilled, (state, action) => { state.roundupHistory = action.payload; });

        builder
            .addCase(investRoundups.pending, (state) => { state.roundupLoading = true; state.error = null; })
            .addCase(investRoundups.fulfilled, (state, action) => {
                state.roundupLoading = false;
                state.lastInvestResult = action.payload;
                // Reset roundup balance locally
                if (state.roundup) {
                    state.roundup.roundup_balance = 0;
                    state.roundup.pending_count = 0;
                    state.roundup.progress_pct = 0;
                    state.roundup.ready_to_invest = false;
                }
            })
            .addCase(investRoundups.rejected, (state, action) => {
                state.roundupLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearWalletError, clearInvestResult } = walletSlice.actions;
export default walletSlice.reducer;
