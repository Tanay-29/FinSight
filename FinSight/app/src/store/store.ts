import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import feedReducer from './slices/feedSlice';
import transactionsReducer from './slices/transactionsSlice';
import budgetsReducer from './slices/budgetsSlice';
import learningReducer from './slices/learningSlice';
import goalsReducer from './slices/goalsSlice';
import marketReducer from './slices/marketSlice'; // ← 1. IMPORT THE NEW MARKET REDUCER

export const store = configureStore({
    reducer: {
        auth: authReducer,
        feed: feedReducer,
        transactions: transactionsReducer,
        budgets: budgetsReducer,
        learning: learningReducer,
        goals: goalsReducer,
        market: marketReducer, // ← 2. ADD IT TO YOUR REDUCER LIST
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;