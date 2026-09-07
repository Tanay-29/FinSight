import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistReducer, persistStore, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import premiumReducer from './slices/premiumSlice';
import transactionsReducer from './slices/transactionsSlice';
import budgetsReducer from './slices/budgetsSlice';
import learningReducer from './slices/learningSlice';
import goalsReducer from './slices/goalsSlice';
import iqReducer from './slices/iqSlice';
import reviewsReducer from './slices/reviewsSlice';
// Phase 1: Execution + Intelligence Layer
import vitalsIntelReducer from './slices/vitalsIntelSlice';

const rootReducer = combineReducers({
    auth: authReducer,
    premium: premiumReducer,
    transactions: transactionsReducer,
    budgets: budgetsReducer,
    learning: learningReducer,
    goals: goalsReducer,
    iq: iqReducer,
    reviews: reviewsReducer,
    vitalsIntel: vitalsIntelReducer,
});

/**
 * `redux-persist` was a dependency doing nothing: listed in package.json,
 * never imported. Firestore's own offline persistence is not available to the
 * Firebase JS SDK on React Native (there is no IndexedDB, so the SDK falls
 * back to an in-memory cache that does not survive a restart), so without
 * this a cold launch with no signal showed every screen's error state rather
 * than the last thing it knew.
 *
 * Whitelisted to the four slices a screen still has something to say about
 * offline: what was logged, what was budgeted, what is being saved for, and
 * how far along the courses someone is. `auth` is deliberately excluded,
 * Firebase already restores the session on its own and persisting a second
 * copy risks the two disagreeing about who is signed in.
 */
const persistConfig = {
    key: 'finsight-root',
    storage: AsyncStorage,
    whitelist: ['transactions', 'budgets', 'goals', 'learning'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            // serializableCheck is off already for the app's own action
            // payloads; these are the actions redux-persist itself dispatches
            // and would otherwise trip the same check if it were on.
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;