import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { signUp, signIn, logOut } from '../../services/authService';

// ─── Types ───────────────────────────────────────────────────

interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
}

interface AuthState {
    user: AuthUser | null;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
}

const initialState: AuthState = {
    user: null,
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
        builder
            .addCase(logOutUser.fulfilled, (state) => {
                state.user = null;
                state.isAuthenticated = false;
                state.isLoading = false;
            });
    },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer;
