import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getDueCards,
    getAllReviewCards,
    recordAnswer,
    ReviewCard,
    MAX_BOX,
} from '../../services/reviewService';
import type { RootState } from '../store';

interface ReviewsState {
    /** Cards scheduled for today or earlier. */
    due: ReviewCard[];
    /** Every card the user has ever answered. */
    all: ReviewCard[];
    loading: boolean;
    error: string | null;
}

const initialState: ReviewsState = {
    due: [],
    all: [],
    loading: false,
    error: null,
};

export const fetchDueCards = createAsyncThunk(
    'reviews/fetchDue',
    async (_, { getState, rejectWithValue }) => {
        const userId = (getState() as RootState).auth.user?.uid;
        if (!userId) return rejectWithValue('Not signed in');
        try {
            const [due, all] = await Promise.all([
                getDueCards(userId),
                getAllReviewCards(userId),
            ]);
            return { due, all };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Could not load your review cards');
        }
    }
);

/**
 * Save one answer and reschedule the card.
 * Failures are swallowed into `error` so a lost write never blocks the review
 * session the learner is in the middle of.
 */
export const answerCard = createAsyncThunk(
    'reviews/answer',
    async (
        {
            card,
            correct,
        }: {
            card: {
                moduleId: string;
                moduleTitle: string;
                pathId: string;
                question: string;
                answer: string;
            };
            correct: boolean;
        },
        { getState, rejectWithValue }
    ) => {
        const userId = (getState() as RootState).auth.user?.uid;
        if (!userId) return rejectWithValue('Not signed in');
        try {
            return await recordAnswer(userId, card, correct);
        } catch (error: any) {
            return rejectWithValue(error.message || 'Could not save that answer');
        }
    }
);

const reviewsSlice = createSlice({
    name: 'reviews',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchDueCards.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDueCards.fulfilled, (state, action) => {
                state.loading = false;
                state.due = action.payload.due;
                state.all = action.payload.all;
            })
            .addCase(fetchDueCards.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        builder
            .addCase(answerCard.fulfilled, (state, action) => {
                const card = action.payload;
                const idx = state.all.findIndex((c) => c.id === card.id);
                if (idx === -1) state.all.push(card);
                else state.all[idx] = card;
                // It was just answered, so it is no longer due today.
                state.due = state.due.filter((c) => c.id !== card.id);
            })
            .addCase(answerCard.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

// ─── Selectors ───────────────────────────────────────────────

export const selectDueCount = (state: RootState) => state.reviews.due.length;

/** Cards sitting in the top box: the learner reliably remembers these. */
export const selectMasteredCount = (state: RootState) =>
    state.reviews.all.filter((c) => c.box >= MAX_BOX).length;

export const selectTrackedCount = (state: RootState) => state.reviews.all.length;

export default reviewsSlice.reducer;
