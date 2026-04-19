import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { MarketIndex, EITMCardData, MOCK_MARKET_DATA } from '../../data/mockData';
import { fetchMarketIndices } from '../../services/marketService';

interface FeedState {
    marketPulse: MarketIndex[];
    eitmCards: EITMCardData[];
    marketInsight: string;
    lastUpdated: string | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: FeedState = {
    marketPulse: [],
    eitmCards: [],
    marketInsight: '',
    lastUpdated: null,
    isLoading: false,
    error: null,
};

export const fetchMarketPulse = createAsyncThunk<
    MarketIndex[],
    void,
    { rejectValue: string }
>('feed/fetchMarketPulse', async (_, { rejectWithValue }) => {
    try {
        const indices = await fetchMarketIndices();
        return indices;
    } catch (error: any) {
        // Swallow network/provider errors and fall back to mocks silently.
        return rejectWithValue(error?.message || 'Failed to fetch market data');
    }
});

const feedSlice = createSlice({
    name: 'feed',
    initialState,
    reducers: {
        setMarketPulse(state, action: PayloadAction<MarketIndex[]>) {
            state.marketPulse = action.payload;
        },
        setEITMCards(state, action: PayloadAction<EITMCardData[]>) {
            state.eitmCards = action.payload;
        },
        setMarketInsight(state, action: PayloadAction<string>) {
            state.marketInsight = action.payload;
        },
        setLastUpdated(state, action: PayloadAction<string>) {
            state.lastUpdated = action.payload;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMarketPulse.pending, (state) => {
                state.isLoading = true;
                state.error = null;

                // If nothing is loaded yet, show mocks as a fast fallback.
                if (state.marketPulse.length === 0) {
                    state.marketPulse = MOCK_MARKET_DATA;
                }
            })
            .addCase(fetchMarketPulse.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;
                state.marketPulse = action.payload;
                state.lastUpdated = new Date().toISOString();

                const main = action.payload[0];
                if (main) {
                    const direction = main.change >= 0 ? 'up' : 'down';
                    state.marketInsight = `Markets ${direction} — ${main.name} at ${main.value.toFixed(
                        2
                    )} (${main.change >= 0 ? '+' : ''}${main.change.toFixed(2)}%)`;
                }
            })
            .addCase(fetchMarketPulse.rejected, (state, action) => {
                state.isLoading = false;
                state.error = (action.payload as string) ?? 'Failed to fetch market data';
                state.lastUpdated = new Date().toISOString();

                // Keep whatever is already in marketPulse (likely mocks from pending state).
                if (!state.marketInsight) {
                    state.marketInsight = 'Showing sample market data';
                }
            });
    },
});

export const { setMarketPulse, setEITMCards, setMarketInsight, setLastUpdated, setLoading } =
    feedSlice.actions;
export default feedSlice.reducer;
