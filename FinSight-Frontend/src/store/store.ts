import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import transactionsReducer from './slices/transactionsSlice';
import budgetsReducer from './slices/budgetsSlice';
import learningReducer from './slices/learningSlice';
import goalsReducer from './slices/goalsSlice';
import iqReducer from './slices/iqSlice';
import reviewsReducer from './slices/reviewsSlice';
// Phase 1: Execution + Intelligence Layer
import vitalsIntelReducer from './slices/vitalsIntelSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        transactions: transactionsReducer,
        budgets: budgetsReducer,
        learning: learningReducer,
        goals: goalsReducer,
        iq: iqReducer,
        reviews: reviewsReducer,
        vitalsIntel: vitalsIntelReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;