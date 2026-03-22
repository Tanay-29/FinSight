<div align="center">

# 💰 FinSight

### Your Daily Money Mentor

A full-stack financial literacy and personal finance app built for Indian college students. FinSight combines real-time market data, AI-powered Hinglish insights, budget tracking, and gamified learning — all in one app.

[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo)](https://expo.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.x-black?logo=flask)](https://flask.palletsprojects.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12.x-FFCA28?logo=firebase)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google)](https://ai.google.dev/)

</div>

---

## 📖 Table of Contents

1. [Features](#-features)
2. [Architecture](#️-architecture)
3. [Project Structure](#-project-structure)
4. [Tech Stack](#-tech-stack)
5. [Prerequisites](#-prerequisites)
6. [Setup: Backend](#-setup-backend)
7. [Setup: Frontend](#-setup-frontend)
8. [Environment Variables Reference](#-environment-variables-reference)
9. [API Reference](#-api-reference)
10. [Firebase Schema](#-firebase-schema)
11. [Redux State](#-redux-state)
12. [Known Issues](#⚠️-known-issues)
13. [Roadmap](#-roadmap)

---

## ✨ Features

| Feature | Description | Status |
|---|---|---|
| 🏠 **Feed / Dashboard** | Market Pulse widget + AI Insights + Recent Transactions | ✅ Live |
| 📊 **Financial Vitals** | Spend charts, category breakdown, weekly trend | ✅ Live |
| 🎯 **Savings Goals** | Create & track personal savings milestones | ✅ Live |
| 🎓 **Learn Hub** | Structured learning paths with progress & badges | ✅ Live |
| 👤 **Profile** | User settings, risk profile, data management | ✅ Live |
| ➕ **Add Transaction** | Manual debit/credit entry with categories | ✅ Live |
| 🤖 **AI Insights (EITM)** | Gemini-powered Hinglish market commentary cards | ✅ Live |
| 📈 **Market Pulse** | NIFTY 50, SENSEX, GOLD, USD/INR live tracking | ✅ Live |
| 🔔 **Budget Nudges** | Alerts when 80% / 100% of budget category is hit | 🔄 In Progress |
| 📱 **Notification Parsing** | Auto-extract transactions from payment app notifications | 🔄 In Progress |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    React Native App (Expo)                  │
│                                                             │
│  ┌───────────┐  ┌────────────┐  ┌──────────┐  ┌────────┐  │
│  │   Feed    │  │  Vitals    │  │  Goals   │  │ Learn  │  │
│  │ Dashboard │  │ & Charts   │  │ Tracker  │  │  Hub   │  │
│  └─────┬─────┘  └─────┬──────┘  └────┬─────┘  └───┬────┘  │
│        │              │              │              │       │
│  ┌─────▼──────────────▼──────────────▼──────────────▼────┐ │
│  │              Redux Toolkit (State Management)          │ │
│  │   authSlice · marketSlice · transactionsSlice ·       │ │
│  │   budgetsSlice · goalsSlice · learningSlice · feed    │ │
│  └───────┬──────────────────────────┬────────────────────┘ │
└──────────┼──────────────────────────┼──────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐   ┌───────────────────────┐
│   Flask Backend     │   │   Firebase Services    │
│  (Python 3.x)       │   │                        │
│                     │   │  ┌──────────────────┐  │
│  /api/market-pulse  │   │  │  Firebase Auth   │  │
│  ↳ yfinance data    │   │  │  (Google OAuth)  │  │
│                     │   │  └──────────────────┘  │
│  /api/market-insight│   │  ┌──────────────────┐  │
│  ↳ Gemini 2.5 Flash │   │  │    Firestore     │  │
│    generates AI     │   │  │ users/{uid}/     │  │
│    Hinglish cards   │   │  │  transactions    │  │
└─────────────────────┘   │  │  budgets         │  │
                          │  │  goals           │  │
 ┌────────────────────┐   │  └──────────────────┘  │
 │  External APIs     │   └───────────────────────-─┘
 │  yfinance (NSE/    │
 │  BSE/Futures data) │
 └────────────────────┘
```

### Data Flow Summary

1. **Auth**: Firebase Auth handles sign-in. `RootNavigator` listens to auth-state changes and renders `BottomTabs` (authenticated) or `LoginScreen` (unauthenticated).
2. **Market Data**: On app load, `FeedScreen` dispatches `fetchMarketData()` and `fetchMarketInsight()` → hits the Flask backend → returns live prices from Yahoo Finance and AI commentary from Gemini.
3. **Personal Finance**: Transactions and Budgets are stored in Firestore (`users/{uid}/transactions`, `users/{uid}/budgets`) and synced into Redux state via `firestoreService.ts`.
4. **Learning**: Learning paths come from the `learning_paths` Firestore collection and are displayed in `LearnScreen`.

---

## 📁 Project Structure

```
FinSight/
├── FinSight-Backend/          # Flask Python API server
│   ├── main.py                # All route definitions + entry point
│   ├── .env                   # Secret keys (NOT committed to git)
│   ├── .gitignore
│   └── venv/                  # Python virtual environment
│
└── FinSight-Frontend/
    ├── README.md              # Product overview & design spec
    └── app/                   # Expo React Native app
        ├── App.tsx            # Root component (fonts, Redux Provider, NavigationContainer)
        ├── index.ts           # Entry point
        ├── app.json           # Expo config
        ├── package.json       # NPM dependencies
        ├── tailwind.config.js # NativeWind/Tailwind theme
        ├── babel.config.js
        ├── .env               # Firebase keys (NOT committed to git)
        ├── .env.example       # Template for .env file
        └── src/
            ├── components/            # Reusable UI components
            │   ├── MarketPulseWidget.tsx
            │   ├── EITMCard.tsx       # AI insight cards
            │   ├── FinancialVitals.tsx
            │   ├── TransactionRow.tsx
            │   ├── BudgetBar.tsx
            │   └── LearningPathCard.tsx
            ├── screens/               # Full-page views
            │   ├── FeedScreen.tsx     # Main dashboard
            │   ├── VitalsScreen.tsx   # Finance analytics
            │   ├── GoalsScreen.tsx    # Savings goals
            │   ├── LearnScreen.tsx    # Learning hub
            │   ├── ProfileScreen.tsx  # User profile
            │   ├── LoginScreen.tsx    # Auth screen
            │   ├── AddTransactionScreen.tsx
            │   └── LearnPathDetailScreen.tsx
            ├── navigation/
            │   ├── RootNavigator.tsx  # Auth gate + Stack navigator
            │   └── BottomTabs.tsx     # 5-tab bottom navigation
            ├── store/
            │   ├── store.ts           # Redux store config
            │   ├── hooks.ts           # Typed useAppSelector / useAppDispatch
            │   └── slices/
            │       ├── authSlice.ts
            │       ├── marketSlice.ts
            │       ├── transactionsSlice.ts
            │       ├── budgetsSlice.ts
            │       ├── goalsSlice.ts
            │       ├── learningSlice.ts
            │       └── feedSlice.ts
            ├── services/
            │   ├── authService.ts        # Firebase Auth wrappers
            │   ├── firestoreService.ts   # All Firestore CRUD operations
            │   ├── marketService.ts      # External market data fallback
            │   └── notificationParser.ts # Parses payment notifications
            ├── config/
            │   └── firebase.ts           # Firebase app initialization
            ├── data/
            │   └── mockData.ts           # Type definitions & fallback data
            ├── theme/
            │   └── tokens.ts             # Color tokens & design system
            └── global.css                # NativeWind global styles
```

---

## 🛠 Tech Stack

### Frontend
| Tool | Version | Purpose |
|---|---|---|
| Expo | SDK 54 | React Native toolchain & OTA updates |
| React Native | 0.81.5 | Cross-platform mobile framework |
| TypeScript | 5.9.x | Static typing |
| NativeWind | 4.x | Tailwind CSS for React Native |
| React Navigation | 7.x | Screen routing & navigation |
| Redux Toolkit | 2.x | Global state management |
| redux-persist | 6.x | Persist Redux state across sessions |
| Firebase | 12.x | Auth + Firestore database |
| react-hook-form | 7.x | Form validation |
| Zod | 4.x | Schema validation |
| lucide-react-native | 0.5x | Icon library |
| date-fns | 4.x | Date formatting utilities |
| Inter Font | — | Typography (via expo-google-fonts) |

### Backend
| Tool | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Runtime |
| Flask | 3.x | HTTP API framework |
| Flask-CORS | — | Cross-origin request support |
| yfinance | — | Yahoo Finance market data |
| google-genai | — | Google Gemini AI client |
| python-dotenv | — | Load environment variables |

---

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18+ and **npm** v9+
- **Python** 3.10+
- **pip** (Python package manager)
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go** app on your Android/iOS device, OR an Android emulator
- A **Firebase project** (free tier is sufficient)
- A **Google Gemini API key** (free at [aistudio.google.com](https://aistudio.google.com/))

---

## 🐍 Setup: Backend

### 1. Navigate to the backend directory

```bash
cd FinSight/FinSight-Backend
```

### 2. Create and activate a virtual environment

```bash
# Create venv
python -m venv venv

# Activate — Windows
venv\Scripts\activate

# Activate — macOS/Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install flask flask-cors yfinance google-genai python-dotenv
```

### 4. Configure environment variables

Create a `.env` file in the `FinSight-Backend/` directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> Get your free Gemini API key at [aistudio.google.com](https://aistudio.google.com/).

### 5. Run the backend server

```bash
python main.py
```

The server starts on `http://0.0.0.0:5000`. You should see:
```
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
```

> **Tip:** Note your machine's local IP address (e.g., `192.168.x.x`). You'll need it to configure the frontend.

---

## 📱 Setup: Frontend

### 1. Navigate to the app directory

```bash
cd FinSight/FinSight-Frontend/app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Firebase

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (or use an existing one).
2. Enable the following services:
   - **Authentication** → Sign-in method: **Google**
   - **Firestore Database** → Start in production mode
3. Go to **Project Settings → Your Apps → Add App → Web App**.
4. Copy the Firebase config values.

### 4. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Point the frontend to your backend

Open `src/store/slices/marketSlice.ts` and update the IP address to match your machine's local IP and the port your Flask server is running on:

```typescript
// Replace with your machine's local IP and Flask port (default: 5000)
const response = await fetch('http://YOUR_LOCAL_IP:5000/api/market-pulse');
```

> ⚠️ Use your machine's **LAN IP** (e.g., `192.168.1.10`), not `localhost`, so that your phone can reach it over the network. You can find this by running `ipconfig` on Windows or `ifconfig` on macOS/Linux.

### 6. Start the Expo development server

```bash
npm start
```

Scan the QR code with the **Expo Go** app on your device. The app should load and connect to your local backend.

---

## 🔑 Environment Variables Reference

### Backend (`FinSight-Backend/.env`)

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for AI insights | ✅ Yes |

### Frontend (`FinSight-Frontend/app/.env`)

| Variable | Description | Required |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase project API key | ✅ Yes |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | ✅ Yes |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | ✅ Yes |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | ✅ Yes |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | ✅ Yes |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase web app ID | ✅ Yes |

---

## 📡 API Reference

Base URL: `http://<YOUR_IP>:5000`

### `GET /api/market-pulse`

Returns current price, previous close, and percentage change for NIfTY 50, SENSEX, Gold and USD/INR.

**Response:**
```json
[
  { "id": "1", "name": "NIFTY 50", "price": "24,500.00", "change": "0.42", "isUp": true },
  { "id": "2", "name": "SENSEX",   "price": "80,500.00", "change": "0.38", "isUp": true },
  { "id": "3", "name": "GOLD (Futures)", "price": "7,150.00", "change": "0.15", "isUp": false },
  { "id": "4", "name": "USD/INR",  "price": "83.56",    "change": "0.10", "isUp": false }
]
```

---

### `GET /api/market-insight`

Fetches live market data and sends it to Gemini 2.5 Flash, which returns 2 engaging insight cards in Hinglish.

**Response:**
```json
[
  {
    "title": "Why is NIFTY 50 up today?",
    "text": "Aaj IT sector mein buying dikhi, jisse market oopar gayi. Beginners ke liye: index up hona generally positive sentiment dikhata hai."
  },
  {
    "title": "Gold prices dip — should you buy?",
    "text": "Dollar strong hone ki wajah se Gold temporarily neeche aaya. Long-term investors ke liye yeh ek entry opportunity ho sakti hai."
  }
]
```

**Error Fallback (if Gemini fails):**
```json
[{ "title": "AI is taking a nap 💤", "text": "..." }]
```

---

## 🔥 Firebase Schema

```
Firestore (Root)
│
├── users/
│   └── {userId}/
│       ├── name, email, riskProfile, primaryGoal, createdAt
│       │
│       ├── transactions/
│       │   └── {txnId}: { amount, type, category, merchant, date, source, notes }
│       │
│       ├── budgets/
│       │   └── {budgetId}: { category, monthlyLimit, currentSpend, month }
│       │
│       └── goals/
│           └── {goalId}: { title, emoji, targetAmount, savedAmount, deadline, color, createdAt }
│
├── learning_paths/
│   └── {pathId}: { title, description, overview, progress, nextModule, badgeEarned, modules[] }
│
└── glossary/
    └── {termId}: { term, definition }
```

---

## 🧠 Redux State

The app uses Redux Toolkit. Here is a snapshot of the full state tree:

```typescript
{
  auth: {
    user: { uid, email, displayName } | null,
    isLoading: boolean
  },
  market: {
    data: MarketPulseItem[],     // From /api/market-pulse
    insights: InsightItem[],     // From /api/market-insight (Gemini)
    loading: boolean,
    error: string | null
  },
  transactions: {
    items: Transaction[],
    loading: boolean,
    error: string | null
  },
  budgets: {
    items: Budget[],
    loading: boolean,
    error: string | null
  },
  goals: {
    items: Goal[],
    loading: boolean,
    error: string | null
  },
  learning: { ... },
  feed: { ... }
}
```

---

## ⚠️ Known Issues

| Issue | Description | Workaround |
|---|---|---|
| **Port mismatch** | `main.py` runs on port `5000`, but `marketSlice.ts` is hardcoded to `8000`. | Update `marketSlice.ts` URLs to use port `5000`. |
| **Hardcoded IP** | Backend URL is hardcoded directly in `marketSlice.ts` instead of using a `.env` variable. | Move `http://192.168.x.x:5000` to `EXPO_PUBLIC_BACKEND_URL` in `.env`. |
| **Redundant service** | `marketService.ts` calls an external Koyeb-hosted API, while `marketSlice.ts` calls the local Flask backend. The two are not connected. | `marketService.ts` is unused by Redux; it can be removed or refactored. |

---

## 🚀 Roadmap

- [ ] Move backend URL to an environment variable in the frontend
- [ ] Add SMS/Notification-based auto transaction parsing (Android)
- [ ] Add budget alert push notifications at 80% / 100% thresholds  
- [ ] Implement Account Aggregator (AA) integration via Setu/Sahamati
- [ ] On-device AI using Llama 3.2 (1B) for zero-latency, private queries
- [ ] Add Vernacular support (Hindi, Marathi, Tamil, Telugu)
- [ ] Robo-advisory: portfolio allocation recommendations based on risk profile
- [ ] Credit Score integration (CIBIL/Experian)

---

<div align="center">

Built with ❤️ for Indian college students

</div>
