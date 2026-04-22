/**
 * brokerageSlice.ts — Redux slice for mock brokerage engine
 * Manages: asset prices, orders, portfolio holdings
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    fetchPrices, placeOrder, fetchOrders, fetchPortfolio,
    AssetPrice, Order, Portfolio, PlaceOrderParams,
} from '../../services/brokerageService';
import type { RootState } from '../store';

interface BrokerageState {
    prices: AssetPrice[];
    orders: Order[];
    portfolio: Portfolio | null;
    loading: boolean;
    orderLoading: boolean;
    error: string | null;
    lastPriceUpdate: string | null;
}

const initialState: BrokerageState = {
    prices: [],
    orders: [],
    portfolio: null,
    loading: false,
    orderLoading: false,
    error: null,
    lastPriceUpdate: null,
};

// ── Thunks ────────────────────────────────────────────────────────────────

export const loadPrices = createAsyncThunk(
    'brokerage/loadPrices',
    async (_, { rejectWithValue }) => {
        try {
            return await fetchPrices();
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

export const loadOrders = createAsyncThunk(
    'brokerage/loadOrders',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('Not authenticated');
            return await fetchOrders(userId);
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

export const loadPortfolio = createAsyncThunk(
    'brokerage/loadPortfolio',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('Not authenticated');
            return await fetchPortfolio(userId);
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

export const submitOrder = createAsyncThunk(
    'brokerage/submitOrder',
    async (
        params: { asset_id: string; quantity: number; order_type: 'BUY' | 'SELL' },
        { rejectWithValue, getState }
    ) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('Not authenticated');
            const order = await placeOrder({ ...params, user_id: userId });
            return order;
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

// ── Slice ─────────────────────────────────────────────────────────────────

const brokerageSlice = createSlice({
    name: 'brokerage',
    initialState,
    reducers: {
        clearError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Prices
        builder
            .addCase(loadPrices.pending, (state) => { state.loading = true; })
            .addCase(loadPrices.fulfilled, (state, action) => {
                state.prices = action.payload;
                state.loading = false;
                state.lastPriceUpdate = new Date().toISOString();
            })
            .addCase(loadPrices.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Orders
        builder
            .addCase(loadOrders.fulfilled, (state, action) => {
                state.orders = action.payload;
            });

        // Portfolio
        builder
            .addCase(loadPortfolio.pending, (state) => { state.loading = true; })
            .addCase(loadPortfolio.fulfilled, (state, action) => {
                state.portfolio = action.payload;
                state.loading = false;
            })
            .addCase(loadPortfolio.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Submit Order
        builder
            .addCase(submitOrder.pending, (state) => {
                state.orderLoading = true;
                state.error = null;
            })
            .addCase(submitOrder.fulfilled, (state, action) => {
                state.orderLoading = false;
                state.orders.unshift(action.payload);
            })
            .addCase(submitOrder.rejected, (state, action) => {
                state.orderLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearError } = brokerageSlice.actions;
export default brokerageSlice.reducer;
