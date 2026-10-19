import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistReducer, persistStore, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer, { logOutUser, deleteUserAccount, setUser } from './slices/authSlice';
import premiumReducer from './slices/premiumSlice';
import transactionsReducer from './slices/transactionsSlice';
import budgetsReducer from './slices/budgetsSlice';
import learningReducer from './slices/learningSlice';
import goalsReducer from './slices/goalsSlice';
import iqReducer from './slices/iqSlice';
import reviewsReducer from './slices/reviewsSlice';
import lessonsReducer from './slices/lessonsSlice';
import checkInsReducer from './slices/checkInsSlice';
// Phase 1: Execution + Intelligence Layer
import vitalsIntelReducer from './slices/vitalsIntelSlice';

const appReducer = combineReducers({
    auth: authReducer,
    premium: premiumReducer,
    transactions: transactionsReducer,
    budgets: budgetsReducer,
    learning: learningReducer,
    goals: goalsReducer,
    iq: iqReducer,
    reviews: reviewsReducer,
    lessons: lessonsReducer,
    checkIns: checkInsReducer,
    vitalsIntel: vitalsIntelReducer,
});

type AppState = ReturnType<typeof appReducer>;

/**
 * Everything but auth goes back to its initial state when nobody is signed in.
 *
 * Five of these slices are persisted to the phone, and nothing used to clear
 * them, so after one person signed out the next account to sign in on the same
 * phone was shown the first one's transactions, budgets and goals until a
 * fetch replaced them, and for good if that fetch failed offline. Auth is left
 * alone because its own reducer already handles these actions.
 */
const rootReducer = (state: AppState | undefined, action: Parameters<typeof appReducer>[1]): AppState => {
    const signedOut =
        logOutUser.fulfilled.match(action) ||
        deleteUserAccount.fulfilled.match(action) ||
        (setUser.match(action) && action.payload === null);
    if (signedOut && state) {
        return appReducer({ auth: state.auth } as AppState, action);
    }
    return appReducer(state, action);
};

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
    whitelist: ['transactions', 'budgets', 'goals', 'learning', 'lessons', 'checkIns'],
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