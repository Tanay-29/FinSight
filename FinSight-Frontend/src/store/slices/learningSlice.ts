import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { MOCK_GLOSSARY, MOCK_LEARNING_PATHS } from '../../data/mockData';
import {
    getGlossaryTerms,
    seedGlossary,
    FirestoreGlossaryTerm,
    getLearningPaths,
    seedLearningPaths,
    FirestoreLearningPath,
    getUserProgress,
    markModuleComplete as firestoreMarkModuleComplete,
    UserProgress,
} from '../../services/firestoreService';

// ─── State ───────────────────────────────────────────────────

interface LearningState {
    paths: FirestoreLearningPath[];
    glossary: FirestoreGlossaryTerm[];
    /** Per-path progress map: { [pathId]: UserProgress } */
    progress: Record<string, UserProgress>;
    streak: number;
    currentPath: string | null;
    loading: boolean;
    progressLoading: boolean;
    error: string | null;
}

const initialState: LearningState = {
    paths: [],
    glossary: [],
    progress: {},
    streak: 0,
    currentPath: null,
    loading: false,
    progressLoading: false,
    error: null,
};

// ─── Async Thunks ────────────────────────────────────────────

export const fetchGlossary = createAsyncThunk(
    'learning/fetchGlossary',
    async (_, { rejectWithValue }) => {
        try {
            let terms = await getGlossaryTerms();
            if (terms.length === 0) {
                await seedGlossary(MOCK_GLOSSARY);
                terms = await getGlossaryTerms();
            }
            return terms;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

/**
 * Fetch global learning paths from Firestore.
 * Seeds from mockData if the collection is empty.
 * Deduplicates by checking for existing path IDs to prevent re-seeding.
 */
export const fetchLearningPaths = createAsyncThunk(
    'learning/fetchPaths',
    async (_, { rejectWithValue }) => {
        try {
            // Always seed with stable IDs (setDoc is idempotent — no duplicates)
            // This ensures mockData quiz questions are always in Firestore
            await seedLearningPaths(MOCK_LEARNING_PATHS as any);
            const paths = await getLearningPaths();
            return paths;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

/** Fetch all user-specific progress from the Firestore subcollection */
export const fetchUserProgress = createAsyncThunk(
    'learning/fetchUserProgress',
    async (userId: string, { rejectWithValue }) => {
        try {
            const progressMap = await getUserProgress(userId);
            return progressMap;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

/**
 * Mark a module as complete for the current user.
 * Writes to Firestore (handles streak update server-side), then refreshes progress.
 */
export const completeModule = createAsyncThunk(
    'learning/completeModule',
    async (
        {
            userId,
            pathId,
            moduleId,
            totalModules,
        }: { userId: string; pathId: string; moduleId: string; totalModules: number },
        { dispatch, rejectWithValue }
    ) => {
        try {
            await firestoreMarkModuleComplete(userId, pathId, moduleId, totalModules);
            // Refresh progress in Redux after writing
            dispatch(fetchUserProgress(userId));
            return { pathId, moduleId };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// ─── Slice ───────────────────────────────────────────────────

const learningSlice = createSlice({
    name: 'learning',
    initialState,
    reducers: {
        setCurrentPath(state, action: PayloadAction<string | null>) {
            state.currentPath = action.payload;
        },
        /** Sync streak from auth profile into learning state */
        setStreak(state, action: PayloadAction<number>) {
            state.streak = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Fetch Glossary
        builder
            .addCase(fetchGlossary.pending, (state) => { state.loading = true; })
            .addCase(fetchGlossary.fulfilled, (state, action) => {
                state.loading = false;
                state.glossary = action.payload;
            })
            .addCase(fetchGlossary.rejected, (state) => { state.loading = false; });

        // Fetch Learning Paths
        builder
            .addCase(fetchLearningPaths.pending, (state) => { state.loading = true; })
            .addCase(fetchLearningPaths.fulfilled, (state, action) => {
                state.loading = false;
                state.paths = action.payload;
            })
            .addCase(fetchLearningPaths.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Fetch User Progress
        builder
            .addCase(fetchUserProgress.pending, (state) => { state.progressLoading = true; })
            .addCase(fetchUserProgress.fulfilled, (state, action) => {
                state.progressLoading = false;
                state.progress = action.payload;
                // Sync streak from the progress fetch (highest streak across any path)
                const progressValues = Object.values(action.payload);
                if (progressValues.length > 0) {
                    // Streak is on the user profile, not per-path. It's loaded via fetchUserProfile.
                    // This is a no-op here but kept for clarity.
                }
            })
            .addCase(fetchUserProgress.rejected, (state) => {
                state.progressLoading = false;
            });

        // Complete Module — optimistic local update while Firestore write is in flight
        builder.addCase(completeModule.pending, (state, action) => {
            const { pathId, moduleId } = action.meta.arg;
            const existing = state.progress[pathId];
            if (existing && !existing.completedModules.includes(moduleId)) {
                existing.completedModules = [...existing.completedModules, moduleId];
                existing.lastModuleId = moduleId;
                existing.updatedAt = new Date().toISOString();
            } else if (!existing) {
                state.progress[pathId] = {
                    pathId,
                    completedModules: [moduleId],
                    lastModuleId: moduleId,
                    percentage: 0, // will be recalculated on fetchUserProgress refresh
                    badgeEarned: false,
                    updatedAt: new Date().toISOString(),
                };
            }
        });
    },
});

export const { setCurrentPath, setStreak } = learningSlice.actions;
export default learningSlice.reducer;
