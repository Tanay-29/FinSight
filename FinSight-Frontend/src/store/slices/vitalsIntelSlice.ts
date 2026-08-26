/**
 * vitalsIntelSlice.ts - Redux slice for Intelligence Layer
 * Manages: burn rate, savings engine, 50/30/20 analysis
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    fetchBurnRate, fetchSavingsEngine, fetchRule503020,
    BurnRateResult, SavingsEngineResult, Rule503020Result,
} from '../../services/vitalsIntelService';
import type { RootState } from '../store';

interface VitalsIntelState {
    burnRate: BurnRateResult | null;
    savingsEngine: SavingsEngineResult | null;
    rule503020: Rule503020Result | null;
    loading: boolean;
    error: string | null;
}

const initialState: VitalsIntelState = {
    burnRate: null,
    savingsEngine: null,
    rule503020: null,
    loading: false,
    error: null,
};

// ── Thunks ────────────────────────────────────────────────────────────────

export const loadBurnRate = createAsyncThunk(
    'vitalsIntel/burnRate',
    async (total_budget: number, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const transactions = state.transactions.items;
            return await fetchBurnRate(transactions, total_budget);
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

export const loadSavingsEngine = createAsyncThunk(
    'vitalsIntel/savingsEngine',
    async (income: number, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const transactions = state.transactions.items;
            const budgets      = state.budgets.items;
            return await fetchSavingsEngine(transactions, budgets, income);
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

export const loadRule503020 = createAsyncThunk(
    'vitalsIntel/rule503020',
    async (income: number, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const transactions = state.transactions.items;
            return await fetchRule503020(transactions, income);
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

// ── Slice ─────────────────────────────────────────────────────────────────

const vitalsIntelSlice = createSlice({
    name: 'vitalsIntel',
    initialState,
    reducers: {
        clearVitalsError(state) { state.error = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadBurnRate.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(loadBurnRate.fulfilled, (state, action) => {
                state.burnRate = action.payload;
                state.loading = false;
            })
            .addCase(loadBurnRate.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        builder
            .addCase(loadSavingsEngine.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(loadSavingsEngine.fulfilled, (state, action) => {
                state.savingsEngine = action.payload;
                state.loading = false;
            })
            .addCase(loadSavingsEngine.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        builder
            .addCase(loadRule503020.pending, (state) => { state.loading = true; })
            .addCase(loadRule503020.fulfilled, (state, action) => {
                state.rule503020 = action.payload;
                state.loading = false;
            })
            .addCase(loadRule503020.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearVitalsError } = vitalsIntelSlice.actions;
export default vitalsIntelSlice.reducer;
