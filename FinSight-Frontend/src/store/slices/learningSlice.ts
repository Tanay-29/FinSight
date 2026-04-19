import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { LearningPath, MOCK_GLOSSARY, MOCK_LEARNING_PATHS } from '../../data/mockData';
import {
    getGlossaryTerms,
    seedGlossary,
    FirestoreGlossaryTerm,
    getLearningPaths,
    seedLearningPaths,
    FirestoreLearningPath,
} from '../../services/firestoreService';

interface LearningState {
    paths: FirestoreLearningPath[];
    glossary: FirestoreGlossaryTerm[];
    currentPath: string | null;
    loading: boolean;
}

const initialState: LearningState = {
    paths: [],
    glossary: [],
    currentPath: null,
    loading: false,
};

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

export const fetchLearningPaths = createAsyncThunk(
    'learning/fetchPaths',
    async (_, { rejectWithValue }) => {
        try {
            let paths = await getLearningPaths();
            if (paths.length === 0) {
                await seedLearningPaths(MOCK_LEARNING_PATHS);
                paths = await getLearningPaths();
            }
            return paths;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const learningSlice = createSlice({
    name: 'learning',
    initialState,
    reducers: {
        setLearningPaths(state, action: PayloadAction<LearningPath[]>) {
            state.paths = action.payload;
        },
        setCurrentPath(state, action: PayloadAction<string | null>) {
            state.currentPath = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchGlossary.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchGlossary.fulfilled, (state, action) => {
                state.loading = false;
                state.glossary = action.payload;
            })
            .addCase(fetchGlossary.rejected, (state) => {
                state.loading = false;
            })
            .addCase(fetchLearningPaths.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchLearningPaths.fulfilled, (state, action) => {
                state.loading = false;
                state.paths = action.payload;
            })
            .addCase(fetchLearningPaths.rejected, (state) => {
                state.loading = false;
            });
    },
});

export const { setLearningPaths, setCurrentPath } = learningSlice.actions;
export default learningSlice.reducer;
