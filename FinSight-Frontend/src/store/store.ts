import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import feedReducer from './slices/feedSlice';
import transactionsReducer from './slices/transactionsSlice';
import budgetsReducer from './slices/budgetsSlice';
import learningReducer from './slices/learningSlice';
import goalsReducer from './slices/goalsSlice';
import marketReducer from './slices/marketSlice';
import iqReducer from './slices/iqSlice';
// Phase 1: Execution + Intelligence Layer
import brokerageReducer from './slices/brokerageSlice';
import walletReducer from './slices/walletSlice';
import vitalsIntelReducer from './slices/vitalsIntelSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        feed: feedReducer,
        transactions: transactionsReducer,
        budgets: budgetsReducer,
        learning: learningReducer,
        goals: goalsReducer,
        market: marketReducer,
        iq: iqReducer,
        // Phase 1
        brokerage: brokerageReducer,
        wallet: walletReducer,
        vitalsIntel: vitalsIntelReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;