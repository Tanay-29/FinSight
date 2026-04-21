import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import feedReducer from './slices/feedSlice';
import transactionsReducer from './slices/transactionsSlice';
import budgetsReducer from './slices/budgetsSlice';
import learningReducer from './slices/learningSlice';
import goalsReducer from './slices/goalsSlice';
import marketReducer from './slices/marketSlice';
import smsReducer from './slices/smsSlice';
import iqReducer from './slices/iqSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        feed: feedReducer,
        transactions: transactionsReducer,
        budgets: budgetsReducer,
        learning: learningReducer,
        goals: goalsReducer,
        market: marketReducer,
        sms: smsReducer,
        iq: iqReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;