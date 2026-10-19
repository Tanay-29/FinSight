/**
 * The daily money check-in: one tap a day instead of logging every spend.
 *
 * Tracking that depends on entering every transaction falls apart the day
 * someone stops, and everything built on it starts reporting wrong numbers
 * with full confidence. The check-in asks one question a day, "spent anything
 * today?", so a day with nothing logged is either a real no-spend day (said
 * so, and counted as a win) or a known gap, never a silent one.
 *
 * Kept on the device through redux-persist. It is a habit marker, not a
 * ledger, so it does not need to follow the account to another phone.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { toDateKey } from '../../services/reviewService';
import type { RootState } from '../store';

export type CheckInKind = 'none' | 'spent';

interface CheckInsState {
    /** 'YYYY-MM-DD' (local) to what the person said about that day. */
    days: Record<string, CheckInKind>;
}

const initialState: CheckInsState = { days: {} };

/** Ninety days is the longest window anything in the app looks back over. */
const KEEP_DAYS = 90;

const checkInsSlice = createSlice({
    name: 'checkIns',
    initialState,
    reducers: {
        recordCheckIn(state, action: PayloadAction<{ kind: CheckInKind; date?: string }>) {
            const date = action.payload.date ?? toDateKey();
            state.days[date] = action.payload.kind;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
            const oldest = toDateKey(cutoff);
            for (const key of Object.keys(state.days)) {
                if (key < oldest) delete state.days[key];
            }
        },
    },
});

export const { recordCheckIn } = checkInsSlice.actions;
export const selectTodayCheckIn = (s: RootState): CheckInKind | undefined => s.checkIns.days[toDateKey()];
export default checkInsSlice.reducer;
