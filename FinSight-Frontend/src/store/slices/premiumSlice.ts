/**
 * The FinSight Plus entitlement, and a simulated purchase.
 *
 * There is no payment here and no card details are collected anywhere in the
 * app. `startPurchase` waits, then writes a flag to the user's own profile in
 * Firestore. It exists so the gates, the paywall and the restored state can be
 * demonstrated end to end without pretending to take money.
 *
 * Replacing this with a real store means swapping the body of `startPurchase`
 * for a StoreKit or Play Billing call, usually via RevenueCat, and reading the
 * entitlement from the receipt rather than from the profile. The rest of the
 * app talks to `selectIsPremium`, so nothing else has to change.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { updateUserProfile } from '../../services/firestoreService';
import { friendlyError } from '../../utils/errors';
import { PlanId, TRIAL_DAYS } from '../../config/premium';
import type { RootState } from '../store';

export interface Entitlement {
    active: boolean;
    plan: PlanId | null;
    /** ISO date the trial or period ends. */
    renewsAt: string | null;
    /** Always true here. A real build would not carry this at all. */
    simulated: boolean;
}

interface PremiumState {
    entitlement: Entitlement | null;
    purchasing: boolean;
    error: string | null;
}

const initialState: PremiumState = {
    entitlement: null,
    purchasing: false,
    error: null,
};

/** How long the fake network call takes, so the button has something to say. */
const SIMULATED_LATENCY_MS = 1400;

export const startPurchase = createAsyncThunk(
    'premium/startPurchase',
    async ({ uid, plan }: { uid: string; plan: PlanId }, { rejectWithValue }) => {
        try {
            await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

            const renews = new Date();
            renews.setDate(renews.getDate() + TRIAL_DAYS);

            const entitlement: Entitlement = {
                active: true,
                plan,
                renewsAt: renews.toISOString(),
                simulated: true,
            };

            await updateUserProfile(uid, { premium: entitlement });
            return entitlement;
        } catch (error) {
            return rejectWithValue(friendlyError(error, 'Could not start your trial. Try again.'));
        }
    }
);

export const cancelPremium = createAsyncThunk(
    'premium/cancel',
    async ({ uid }: { uid: string }, { rejectWithValue }) => {
        try {
            const entitlement: Entitlement = {
                active: false,
                plan: null,
                renewsAt: null,
                simulated: true,
            };
            await updateUserProfile(uid, { premium: entitlement });
            return entitlement;
        } catch (error) {
            return rejectWithValue(friendlyError(error, 'Could not cancel. Try again.'));
        }
    }
);

const premiumSlice = createSlice({
    name: 'premium',
    initialState,
    reducers: {
        /** Seeded from the profile once it loads, so state survives a restart. */
        setEntitlement(state, action: { payload: Entitlement | null }) {
            state.entitlement = action.payload;
        },
        clearPremiumError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(startPurchase.pending, (state) => {
                state.purchasing = true;
                state.error = null;
            })
            .addCase(startPurchase.fulfilled, (state, action) => {
                state.purchasing = false;
                state.entitlement = action.payload;
            })
            .addCase(startPurchase.rejected, (state, action) => {
                state.purchasing = false;
                state.error = action.payload as string;
            })
            .addCase(cancelPremium.fulfilled, (state, action) => {
                state.entitlement = action.payload;
            })
            .addCase(cancelPremium.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

export const { setEntitlement, clearPremiumError } = premiumSlice.actions;

/**
 * The one question the rest of the app asks.
 *
 * Reads the slice first so a purchase takes effect immediately, and falls back
 * to the profile so a restart or a second device still knows.
 */
export const selectIsPremium = (state: RootState): boolean => {
    const live = state.premium.entitlement;
    if (live) return live.active;
    return Boolean((state.auth.profile as { premium?: Entitlement } | null)?.premium?.active);
};

export const selectEntitlement = (state: RootState): Entitlement | null =>
    state.premium.entitlement
    ?? ((state.auth.profile as { premium?: Entitlement } | null)?.premium ?? null);

export default premiumSlice.reducer;
