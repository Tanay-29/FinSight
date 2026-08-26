import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    FirestoreTransaction,
    addTransactionToFirestore,
    deleteTransaction,
    getRecentTransactions,
    getBudgets,
    updateBudgetSpend,
    correctTransactionCategory,
} from '../../services/firestoreService';
import { addRoundup } from '../../services/walletService';
import { RootState } from '../store';
import { format } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────

interface TransactionsState {
    items: FirestoreTransaction[];
    loading: boolean;
    error: string | null;
    syncStatus: 'idle' | 'syncing' | 'error';
}

const initialState: TransactionsState = {
    items: [],
    loading: false,
    error: null,
    syncStatus: 'idle',
};

// ─── Async Thunks ────────────────────────────────────────────

export const fetchTransactions = createAsyncThunk(
    'transactions/fetchRecent',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;

            if (!userId) throw new Error('User not authenticated');

            const transactions = await getRecentTransactions(userId);
            return transactions;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch transactions');
        }
    }
);

export const addTransaction = createAsyncThunk(
    'transactions/add',
    async (transaction: Omit<FirestoreTransaction, 'id'>, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;

            if (!userId) throw new Error('User not authenticated');

            // 1. Add Transaction
            const id = await addTransactionToFirestore(userId, transaction);

            // 2. Find and Update Budget - ONLY for debit transactions
            if (transaction.type === 'debit') {
                const transactionDate = new Date(transaction.date);
                const month = format(transactionDate, 'yyyy-MM');

                const budgets = await getBudgets(userId, month);
                const budget = budgets.find(
                    (b) => b.category.toLowerCase() === transaction.category.toLowerCase()
                );

                if (budget && budget.id) {
                    const newSpend = budget.currentSpend + transaction.amount;
                    await updateBudgetSpend(userId, budget.id, newSpend);
                }

                // 3. Record Round-Up for Execution Layer
                try {
                    await addRoundup(transaction.amount);
                } catch (err) {
                    console.log('Failed to record round-up:', err);
                }
            }

            return { id, ...transaction };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to add transaction');
        }
    }
);

/**
 * Recategorise a transaction from the Tidy Up deck.
 * The reducer applies the change immediately so the card can fly away without
 * waiting on the network.
 */
export const updateTransactionCategory = createAsyncThunk(
    'transactions/updateCategory',
    async (
        { transactionId, category, merchant }:
            { transactionId: string; category: string; merchant: string },
        { getState, rejectWithValue }
    ) => {
        const userId = (getState() as RootState).auth.user?.uid;
        if (!userId) return rejectWithValue('Not signed in');
        try {
            await correctTransactionCategory(userId, transactionId, category, merchant);
            return { transactionId, category };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Could not update that category');
        }
    }
);

export const removeTransaction = createAsyncThunk(
    'transactions/remove',
    async (id: string, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const userId = state.auth.user?.uid;

            if (!userId) throw new Error('User not authenticated');

            await deleteTransaction(userId, id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to delete transaction');
        }
    }
);

// ─── Slice ───────────────────────────────────────────────────

const transactionsSlice = createSlice({
    name: 'transactions',
    initialState,
    reducers: {
        setTransactions(state, action: PayloadAction<FirestoreTransaction[]>) {
            state.items = action.payload;
            state.syncStatus = 'idle';
        },
    },
    extraReducers: (builder) => {
        // Fetch
        builder
            .addCase(fetchTransactions.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.syncStatus = 'syncing';
            })
            .addCase(fetchTransactions.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
                state.syncStatus = 'idle';
            })
            .addCase(fetchTransactions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.syncStatus = 'error';
            });

        // Add
        builder
            .addCase(addTransaction.pending, (state) => {
                state.syncStatus = 'syncing';
            })
            .addCase(addTransaction.fulfilled, (state, action) => {
                state.items.unshift(action.payload);
                state.syncStatus = 'idle';
            })
            .addCase(addTransaction.rejected, (state, action) => {
                state.error = action.payload as string;
                state.syncStatus = 'error';
            });

        // Remove
        builder
            .addCase(removeTransaction.fulfilled, (state, action) => {
                state.items = state.items.filter((item) => item.id !== action.payload);
            });

        // Category correction, applied optimistically so the deck stays snappy
        builder
            .addCase(updateTransactionCategory.pending, (state, action) => {
                const item = state.items.find((t) => t.id === action.meta.arg.transactionId);
                if (item) item.category = action.meta.arg.category;
            })
            .addCase(updateTransactionCategory.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

export const { setTransactions } = transactionsSlice.actions;
export default transactionsSlice.reducer;
