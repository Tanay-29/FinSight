import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { signUp, signIn, logOut } from '../../services/authService';
import { getUserProfile, updateUserProfile, UserProfile } from '../../services/firestoreService';

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
            return rejectWithValue(error.message || 'Sign up failed');
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
            return rejectWithValue(error.message || 'Sign in failed');
        }
    }
);

export const logOutUser = createAsyncThunk(
    'auth/logOut',
    async (_, { rejectWithValue }) => {
        try {
            await logOut();
        } catch (error: any) {
            return rejectWithValue(error.message || 'Logout failed');
        }
    }
);

/** Fetch Firestore profile — called after auth state confirms user is logged in */
export const fetchUserProfile = createAsyncThunk(
    'auth/fetchUserProfile',
    async (uid: string, { rejectWithValue }) => {
        try {
            return await getUserProfile(uid);
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to load profile');
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
            return rejectWithValue(error.message || 'Failed to save onboarding data');
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
                // Non-fatal — fall through to onboarding
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
    },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer;
