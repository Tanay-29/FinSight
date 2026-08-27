import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { signUp, signIn, logOut, deleteAccount } from '../../services/authService';
import { getUserProfile, updateUserProfile, UserProfile } from '../../services/firestoreService';
import { friendlyError } from '../../utils/errors';

type Preferences = UserProfile['preferences'];

// ─── Types ───────────────────────────────────────────────────

interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
}

interface AuthState {
    user: AuthUser | null;
    profile: UserProfile | null;
    profileLoading: boolean;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
}

const initialState: AuthState = {
    user: null,
    profile: null,
    profileLoading: false,
    isLoading: false,
    error: null,
    isAuthenticated: false,
};

// ─── Async Thunks ────────────────────────────────────────────

export const signUpUser = createAsyncThunk(
    'auth/signUp',
    async (
        { email, password, name }: { email: string; password: string; name: string },
        { rejectWithValue }
    ) => {
        try {
            const user = await signUp(email, password, name);
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
            } as AuthUser;
        } catch (error: any) {
            return rejectWithValue(friendlyError(error, 'Could not create your account. Try again.'));
        }
    }
);

export const signInUser = createAsyncThunk(
    'auth/signIn',
    async (
        { email, password }: { email: string; password: string },
        { rejectWithValue }
    ) => {
        try {
            const user = await signIn(email, password);
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
            } as AuthUser;
        } catch (error: any) {
            return rejectWithValue(friendlyError(error, 'Could not sign you in. Try again.'));
        }
    }
);

export const logOutUser = createAsyncThunk(
    'auth/logOut',
    async (_, { rejectWithValue }) => {
        try {
            await logOut();
        } catch (error: any) {
            return rejectWithValue(friendlyError(error, 'Could not sign you out. Try again.'));
        }
    }
);

/** Fetch Firestore profile - called after auth state confirms user is logged in */
export const fetchUserProfile = createAsyncThunk(
    'auth/fetchUserProfile',
    async (uid: string, { rejectWithValue }) => {
        try {
            return await getUserProfile(uid);
        } catch (error: any) {
            return rejectWithValue(friendlyError(error, 'Could not load your profile.'));
        }
    }
);

/** Persist onboarding data to Firestore + update Redux profile */
export const completeOnboarding = createAsyncThunk(
    'auth/completeOnboarding',
    async (
        { uid, data }: { uid: string; data: Partial<UserProfile> },
        { rejectWithValue }
    ) => {
        try {
            await updateUserProfile(uid, { ...data, onboardingComplete: true });
            return { ...data, onboardingComplete: true } as Partial<UserProfile>;
        } catch (error: any) {
            return rejectWithValue(friendlyError(error, 'Could not save your answers. Try again.'));
        }
    }
);

/**
 * Persist a preference change. The reducer applies it optimistically so the
 * switch does not lag behind the tap, and reverts if the write fails.
 */
export const updatePreferences = createAsyncThunk(
    'auth/updatePreferences',
    async (
        { uid, changes }: { uid: string; changes: Partial<Preferences> },
        { getState, rejectWithValue }
    ) => {
        const previous: Preferences = {
            notifications: true,
            language: 'en-IN',
            autoTracking: true,
            ...(getState() as { auth: AuthState }).auth.profile?.preferences,
        };
        const merged: Preferences = { ...previous, ...changes };
        try {
            await updateUserProfile(uid, { preferences: merged });
            return merged;
        } catch (error: any) {
            // Hand back the pre-change values so the reducer can restore them.
            return rejectWithValue({
                message: error.message || 'Could not save that setting',
                previous,
            });
        }
    }
);

/** Permanently delete the account and every document belonging to it. */
export const deleteUserAccount = createAsyncThunk(
    'auth/deleteAccount',
    async (_, { rejectWithValue }) => {
        try {
            await deleteAccount();
        } catch (error: any) {
            return rejectWithValue(friendlyError(error, 'Could not delete your account.'));
        }
    }
);

/**
 * Persist any subset of profile fields and merge the result into Redux.
 * Used by the Wave 2 features, which all write small patches to the profile
 * rather than needing a thunk each.
 */
export const patchProfile = createAsyncThunk(
    'auth/patchProfile',
    async (
        { uid, patch }: { uid: string; patch: Partial<UserProfile> },
        { rejectWithValue }
    ) => {
        try {
            await updateUserProfile(uid, patch);
            return patch;
        } catch (error: any) {
            return rejectWithValue(friendlyError(error, 'Could not save that change.'));
        }
    }
);

// ─── Slice ───────────────────────────────────────────────────

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        /** Called by onAuthStateChanged listener */
        setUser(state, action: PayloadAction<AuthUser | null>) {
            state.user = action.payload;
            state.isAuthenticated = action.payload !== null;
            state.isLoading = false;
            state.error = null;
            // Reset profile when user logs out
            if (!action.payload) {
                state.profile = null;
                state.profileLoading = false;
            }
        },
        clearError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Sign Up
        builder
            .addCase(signUpUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(signUpUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(signUpUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Sign In
        builder
            .addCase(signInUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(signInUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(signInUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Logout
        builder.addCase(logOutUser.fulfilled, (state) => {
            state.user = null;
            state.profile = null;
            state.isAuthenticated = false;
            state.isLoading = false;
        });

        // Fetch Profile
        builder
            .addCase(fetchUserProfile.pending, (state) => {
                state.profileLoading = true;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.profileLoading = false;
                state.profile = action.payload;
            })
            .addCase(fetchUserProfile.rejected, (state) => {
                state.profileLoading = false;
                // Non-fatal - fall through to onboarding
            });

        // Complete Onboarding
        builder
            .addCase(completeOnboarding.fulfilled, (state, action) => {
                if (state.profile) {
                    state.profile = { ...state.profile, ...action.payload };
                } else {
                    state.profile = action.payload as UserProfile;
                }
            });

        // Profile patches from the engagement features
        builder
            .addCase(patchProfile.fulfilled, (state, action) => {
                if (state.profile) {
                    state.profile = { ...state.profile, ...action.payload };
                }
            })
            .addCase(patchProfile.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Preferences: apply optimistically, revert on failure
        builder
            .addCase(updatePreferences.pending, (state, action) => {
                if (state.profile) {
                    state.profile.preferences = {
                        ...state.profile.preferences,
                        ...action.meta.arg.changes,
                    };
                }
            })
            .addCase(updatePreferences.fulfilled, (state, action) => {
                if (state.profile) state.profile.preferences = action.payload;
            })
            .addCase(updatePreferences.rejected, (state, action) => {
                const payload = action.payload as { message: string; previous: Preferences };
                // Restore the pre-change values so the switch matches reality.
                if (state.profile && payload?.previous) {
                    state.profile.preferences = payload.previous;
                }
                state.error = payload?.message ?? 'Could not save that setting';
            });

        // Account deletion: the auth listener also fires, this keeps state clean
        builder
            .addCase(deleteUserAccount.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deleteUserAccount.fulfilled, (state) => {
                state.user = null;
                state.profile = null;
                state.isAuthenticated = false;
                state.isLoading = false;
            })
            .addCase(deleteUserAccount.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer;
