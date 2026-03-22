import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Existing Thunk for Market Data
export const fetchMarketData = createAsyncThunk(
  'market/fetchMarketPulse',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('http://192.168.0.208:8000/api/market-pulse');
      if (!response.ok) throw new Error('Failed to fetch from backend');
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Thunk for the Insight Engine (Now expects a list of 3 from Flask)
export const fetchMarketInsight = createAsyncThunk(
  'market/fetchMarketInsight',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('http://192.168.0.208:8000/api/market-insight');
      if (!response.ok) throw new Error('Failed to fetch insight');
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const marketSlice = createSlice({
  name: 'market',
  initialState: {
    data: [],
    insights: [] as Array<{ title: string; text: string }>, // ← UPDATED: Now an array to hold multiple cards
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Handle Market Pulse (Data)
      .addCase(fetchMarketData.pending, (state) => { state.loading = true; })
      .addCase(fetchMarketData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchMarketData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Handle Market Insight (AI Text)
      .addCase(fetchMarketInsight.fulfilled, (state, action) => {
        state.insights = action.payload; // ← UPDATED: Saves the array of 3 insights
      });
  },
});

export default marketSlice.reducer;