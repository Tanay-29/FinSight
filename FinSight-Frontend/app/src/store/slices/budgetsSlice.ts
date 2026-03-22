import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { FirestoreBudget, getBudgets, setBudget as setBudgetInFirestore, updateBudgetLimit as setBudgetLimitInFirestore } from '../../services/firestoreService';
import { RootState } from '../store';
import { format } from 'date-fns';

interface BudgetsState {
    items: FirestoreBudget[];
    loading: boolean;
    error: string | null;
}

const initialState: BudgetsState = {
    items: [],
    loading: false,
    error: null,
};

export const fetchBudgets = createAsyncThunk(
    'budgets/fetch',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('User not authenticated');

            const currentMonth = format(new Date(), 'yyyy-MM');
            const budgets = await getBudgets(userId, currentMonth);
            return budgets;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createBudget = createAsyncThunk(
    'budgets/create',
    async (budget: Omit<FirestoreBudget, 'id'>, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('User not authenticated');

            const id = await setBudgetInFirestore(userId, budget);
            return { id, ...budget };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateBudgetLimit = createAsyncThunk(
    'budgets/updateLimit',
    async ({ id, limit }: { id: string; limit: number }, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('User not authenticated');

            await setBudgetLimitInFirestore(userId, id, limit);
            return { id, limit };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const budgetsSlice = createSlice({
    name: 'budgets',
    initialState,
    reducers: {
        setBudgets(state, action: PayloadAction<FirestoreBudget[]>) {
            state.items = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBudgets.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBudgets.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(fetchBudgets.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createBudget.fulfilled, (state, action) => {
                state.items.push(action.payload);
            })
            .addCase(updateBudgetLimit.fulfilled, (state, action) => {
                const index = state.items.findIndex(b => b.id === action.payload.id);
                if (index !== -1) {
                    state.items[index].monthlyLimit = action.payload.limit;
                }
            });
    },
});

export const { setBudgets } = budgetsSlice.actions;
export default budgetsSlice.reducer;
