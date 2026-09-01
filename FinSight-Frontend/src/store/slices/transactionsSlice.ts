import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    FirestoreTransaction,
    addTransactionToFirestore,
    deleteTransaction,
    getRecentTransactions,
    getBudgets,
    updateBudgetSpend,
    correctTransactionCategory,
    getCategoryCorrections,
} from '../../services/firestoreService';
import { RootState } from '../store';
import { format } from 'date-fns';
import { friendlyError } from '../../utils/errors';

// ─── Types ───────────────────────────────────────────────────

interface TransactionsState {
    items: FirestoreTransaction[];
    loading: boolean;
    error: string | null;
    syncStatus: 'idle' | 'syncing' | 'error';
    /** Merchant to category, learned from the user's own corrections. */
    corrections: Record<string, string>;
    /**
     * True once a fetch has settled, whether it found anything or not.
     *
     * `loading` alone cannot answer "is this account empty", because it starts
     * false: between mount and the first pending action an existing user looks
     * momentarily identical to a new one, which flashed the first-run screen at
     * everybody on every launch.
     */
    loaded: boolean;
}

const initialState: TransactionsState = {
    items: [],
    loading: false,
    error: null,
    syncStatus: 'idle',
    corrections: {},
    loaded: false,
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
            return rejectWithValue(friendlyError(error, 'Could not load your transactions.'));
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
            }

            return { id, ...transaction };
        } catch (error: any) {
            return rejectWithValue(friendlyError(error, 'Could not add that transaction.'));
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
            return rejectWithValue(friendlyError(error, 'Could not update that category.'));
        }
    }
);

/**
 * Load every category the user has corrected by hand, so the parser can get it
 * right first time next time. Failing quietly is deliberate: without these the
 * built-in rules still work, so a read error should not block adding an
 * expense.
 */
export const fetchCategoryCorrections = createAsyncThunk(
    'transactions/fetchCorrections',
    async (_, { getState, rejectWithValue }) => {
        const userId = (getState() as RootState).auth.user?.uid;
        if (!userId) return rejectWithValue('Not signed in');
        try {
            return await getCategoryCorrections(userId);
        } catch (error: any) {
            return rejectWithValue(friendlyError(error, 'Could not load your saved corrections.'));
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
            return rejectWithValue(friendlyError(error, 'Could not delete that transaction.'));
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
                state.loaded = true;
                state.items = action.payload;
                state.syncStatus = 'idle';
            })
            .addCase(fetchTransactions.rejected, (state, action) => {
                state.loading = false;
                // Settled, but with nothing to say about whether the account is
                // empty. The screens check `error` as well before claiming it
                // is, so an offline user with a full ledger is not told they
                // have never spent anything.
                state.loaded = true;
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
            })
            // Without this a delete that failed left the row on screen with no
            // explanation, which reads as the tap not registering.
            .addCase(removeTransaction.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Category correction, applied optimistically so the deck stays snappy
        builder
            .addCase(updateTransactionCategory.pending, (state, action) => {
                const item = state.items.find((t) => t.id === action.meta.arg.transactionId);
                if (item) item.category = action.meta.arg.category;

                // Learn it now rather than on the next load, so a merchant the
                // user just fixed is already right for the next paste in this
                // session.
                const merchant = action.meta.arg.merchant.trim().toLowerCase();
                if (merchant) state.corrections[merchant] = action.meta.arg.category;
            })
            .addCase(updateTransactionCategory.rejected, (state, action) => {
                state.error = action.payload as string;
            })
            .addCase(fetchCategoryCorrections.fulfilled, (state, action) => {
                state.corrections = action.payload;
            });
    },
});

export const { setTransactions } = transactionsSlice.actions;
export default transactionsSlice.reducer;
