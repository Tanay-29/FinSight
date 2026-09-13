import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCardResults, recordCardResult, CardResult } from '../../services/lessonService';
import { scheduleNext, toDateKey } from '../../services/reviewService';
import type { RootState } from '../store';
import { friendlyError } from '../../utils/errors';

/**
 * Lesson state: the mistake bank and whether today's session is done.
 *
 * Card results are keyed by lessonId__cardId. The daily-session flag lives in
 * AsyncStorage rather than Firestore because it only has to survive a restart
 * on this device; the streak, which is the thing that matters across devices,
 * is written by markModuleComplete when the session's lesson finishes.
 */
interface LessonsState {
    cards: Record<string, CardResult>;
    loaded: boolean;
    loading: boolean;
    /** 'YYYY-MM-DD' of the last finished daily session on this device. */
    sessionDoneDate: string | null;
    error: string | null;
}

const initialState: LessonsState = {
    cards: {},
    loaded: false,
    loading: false,
    sessionDoneDate: null,
    error: null,
};

const SESSION_KEY = 'finsight:lesson-session-date';

export const fetchCardResults = createAsyncThunk(
    'lessons/fetchCards',
    async (_, { getState, rejectWithValue }) => {
        const userId = (getState() as RootState).auth.user?.uid;
        if (!userId) return rejectWithValue('Not signed in');
        try {
            const [cards, sessionDate] = await Promise.all([
                getCardResults(userId),
                AsyncStorage.getItem(SESSION_KEY).catch(() => null),
            ]);
            return { cards, sessionDate };
        } catch (error: any) {
            return rejectWithValue(friendlyError(error, 'Could not load your lesson history.'));
        }
    }
);

/**
 * Save one answer. The reducer applies the schedule optimistically in
 * `pending`, so a slow or lost write never stalls the deck the learner is
 * moving through.
 */
export const answerLessonCard = createAsyncThunk(
    'lessons/answer',
    async (
        input: { key: string; trackId: string; lessonId: string; correct: boolean },
        { getState, rejectWithValue }
    ) => {
        const userId = (getState() as RootState).auth.user?.uid;
        if (!userId) return rejectWithValue('Not signed in');
        try {
            return await recordCardResult(userId, input, input.correct);
        } catch (error: any) {
            return rejectWithValue(friendlyError(error, 'Could not save that answer.'));
        }
    }
);

export const markSessionDone = createAsyncThunk(
    'lessons/sessionDone',
    async () => {
        const today = toDateKey();
        await AsyncStorage.setItem(SESSION_KEY, today).catch(() => { });
        return today;
    }
);

const lessonsSlice = createSlice({
    name: 'lessons',
    initialState,
    reducers: {
        clearLessonError(state) { state.error = null; },
        setSessionDoneDate(state, action: PayloadAction<string | null>) {
            state.sessionDoneDate = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCardResults.pending, (state) => { state.loading = true; })
            .addCase(fetchCardResults.fulfilled, (state, action) => {
                state.loading = false;
                state.loaded = true;
                state.cards = action.payload.cards;
                state.sessionDoneDate = action.payload.sessionDate;
            })
            .addCase(fetchCardResults.rejected, (state, action) => {
                state.loading = false;
                state.loaded = true;
                state.error = action.payload as string;
            });

        builder
            .addCase(answerLessonCard.pending, (state, action) => {
                const { key, trackId, lessonId, correct } = action.meta.arg;
                const existing = state.cards[key] ?? { box: 1, timesCorrect: 0, timesWrong: 0 };
                state.cards[key] = {
                    key, trackId, lessonId,
                    ...scheduleNext(existing as CardResult, correct),
                };
            })
            .addCase(answerLessonCard.fulfilled, (state, action) => {
                state.cards[action.payload.key] = action.payload;
            })
            .addCase(answerLessonCard.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        builder.addCase(markSessionDone.fulfilled, (state, action) => {
            state.sessionDoneDate = action.payload;
        });
    },
});

export const { clearLessonError, setSessionDoneDate } = lessonsSlice.actions;
export default lessonsSlice.reducer;

// ─── Selectors ───────────────────────────────────────────────

export const selectCardResults = (s: RootState) => s.lessons.cards;
export const selectSessionDoneToday = (s: RootState) => s.lessons.sessionDoneDate === toDateKey();
