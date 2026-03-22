// app/src/store/slices/goalsSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    FirestoreGoal,
    addGoal,
    getGoals,
    updateGoalSaved,
    deleteGoal,
} from '../../services/firestoreService';
import { RootState } from '../store';

// ─── Types ───────────────────────────────────────────────────

interface GoalsState {
    items: FirestoreGoal[];
    loading: boolean;
    error: string | null;
}

const initialState: GoalsState = {
    items: [],
    loading: false,
    error: null,
};

// ─── Async Thunks ────────────────────────────────────────────

export const fetchGoals = createAsyncThunk(
    'goals/fetch',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('User not authenticated');
            return await getGoals(userId);
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createGoal = createAsyncThunk(
    'goals/create',
    async (goal: Omit<FirestoreGoal, 'id'>, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('User not authenticated');
            const id = await addGoal(userId, goal);
            return { id, ...goal };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const depositToGoal = createAsyncThunk(
    'goals/deposit',
    async (
        { goalId, amount }: { goalId: string; amount: number },
        { rejectWithValue, getState }
    ) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('User not authenticated');

            const goal = (state as any).goals.items.find(
                (g: FirestoreGoal) => g.id === goalId
            );
            if (!goal) throw new Error('Goal not found');

            const newSaved = Math.min(goal.savedAmount + amount, goal.targetAmount);
            await updateGoalSaved(userId, goalId, newSaved);
            return { goalId, savedAmount: newSaved };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const removeGoal = createAsyncThunk(
    'goals/remove',
    async (goalId: string, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;
            if (!userId) throw new Error('User not authenticated');
            await deleteGoal(userId, goalId);
            return goalId;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// ─── Slice ───────────────────────────────────────────────────

const goalsSlice = createSlice({
    name: 'goals',
    initialState,
    reducers: {
        setGoals(state, action: PayloadAction<FirestoreGoal[]>) {
            state.items = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Fetch
        builder
            .addCase(fetchGoals.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchGoals.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(fetchGoals.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Create
        builder.addCase(createGoal.fulfilled, (state, action) => {
            state.items.unshift(action.payload);
        });

        // Deposit
        builder.addCase(depositToGoal.fulfilled, (state, action) => {
            const idx = state.items.findIndex((g) => g.id === action.payload.goalId);
            if (idx !== -1) {
                state.items[idx].savedAmount = action.payload.savedAmount;
            }
        });

        // Remove
        builder.addCase(removeGoal.fulfilled, (state, action) => {
            state.items = state.items.filter((g) => g.id !== action.payload);
        });
    },
});

export const { setGoals } = goalsSlice.actions;
export default goalsSlice.reducer;