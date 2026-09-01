/**
 * The AI-written market notes shown on the Feed.
 *
 * This used to carry a second thunk for /api/market-pulse, feeding a ticker of
 * NIFTY, SENSEX, gold and USD/INR. That ticker was cut: it served a student who
 * has not logged their first expense a row of index levels they cannot act on,
 * and it cost a Yahoo dependency and a rate limit to do it. The insights that
 * read those same numbers and say something about them stayed.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { BACKEND_URL, fetchWithTimeout } from '../../config/api';
import { friendlyError } from '../../utils/errors';

export interface MarketInsight {
    title: string;
    text: string;
}

interface MarketState {
    insights: MarketInsight[];
    loading: boolean;
    error: string | null;
}

const initialState: MarketState = {
    insights: [],
    loading: false,
    error: null,
};

export const fetchMarketInsight = createAsyncThunk(
    'market/fetchMarketInsight',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetchWithTimeout(`${BACKEND_URL}/api/market-insight`);
            if (!response.ok) throw new Error('Failed to fetch insight');
            return (await response.json()) as MarketInsight[];
        } catch (error) {
            return rejectWithValue(friendlyError(error, 'Could not load market insights.'));
        }
    }
);

const marketSlice = createSlice({
    name: 'market',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchMarketInsight.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMarketInsight.fulfilled, (state, action) => {
                state.loading = false;
                state.insights = action.payload;
            })
            .addCase(fetchMarketInsight.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export default marketSlice.reducer;
