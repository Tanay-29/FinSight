<div align="center">

# 💰 FinSight

### Your Daily Money Mentor

A full-stack financial literacy and personal finance **super-app** built for Indian college students and young professionals. FinSight combines real-time market data, AI-powered insights, budget tracking, mock brokerage with round-up investing, gamified learning with flashcards, a behavioral financial IQ score, and intelligent spend analytics — all in one cross-platform mobile app.

[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo)](https://expo.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.1-black?logo=flask)](https://flask.palletsprojects.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12.x-FFCA28?logo=firebase)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google)](https://ai.google.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://www.sqlite.org/)

</div>

---

## 📋 Summary

FinSight is organized as a monorepo with two main directories:

| Layer | Directory | Stack | Description |
|---|---|---|---|
| **Backend** | `FinSight-Backend/` | Python · Flask · SQLite · Gemini AI · yfinance | REST API server providing market data, AI-powered insights, a mock brokerage engine, virtual wallet, round-up investing, and financial intelligence analytics |
| **Frontend** | `FinSight-Frontend/` | React Native · Expo SDK 54 · TypeScript · Redux Toolkit · Firebase | 19-screen mobile app with 4-tab navigation, onboarding flow, gamified learning with flashcards, real-time financial tracking, investment simulation, and AI-driven coaching |

**Key capabilities at a glance:**
- 🏦 **Mock Brokerage** — Buy/sell ETFs, Stocks & MFs with a virtual wallet and real-time price simulation
- 🪙 **Round-Up Investing** — Spare change from every transaction auto-accumulated and invested into NIFTY BeES ETF
- 🧠 **FinSight IQ** — Behavioral financial score (0–1000) with Gemini AI coaching & personalized quests
- 📊 **Vitals Intelligence** — Predictive burn rate, savings engine, and 50/30/20 rule analysis
- 🎓 **Learn Hub** — Structured learning paths with module reader, AI-generated flashcards, and streak tracking
- 📈 **Live Market Pulse** — NIFTY 50, SENSEX, Gold Futures, USD/INR via Yahoo Finance
- 🤖 **AI Insights** — Gemini 2.5 Flash generates market commentary and personalized financial advice
- 🎯 **Goal Acceleration** — Savings goals with curated investment baskets and subscription tracking
- 🔔 **Smart Categorization** — Auto-detect transaction categories from bank SMS / UPI notifications

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
10. [Database Schema](#-database-schema)
11. [Redux State](#-redux-state)
12. [FinSight IQ Algorithm](#-finsight-iq-algorithm)
13. [Deployment](#-deployment)
14. [Known Issues](#️-known-issues)
15. [Roadmap](#-roadmap)

---

## ✨ Features

| Feature | Description | Status |
|---|---|---|
| 🏠 **Feed / Dashboard** | Market Pulse widget + AI Insights + FinSight IQ card + Recent Transactions | ✅ Live |
| 📊 **Financial Vitals** | Spend charts, category breakdown, weekly trend, budget management | ✅ Live |
| 🔥 **Burn Rate Analyzer** | Predictive monthly spend projection, daily avg, category breakdown, budget variance alerts | ✅ Live |
| 🎯 **Savings Goals** | Create & track personal savings milestones with emoji, color & deadline | ✅ Live |
| 🚀 **Goal Acceleration** | Investment-linked goal acceleration with curated baskets | ✅ Live |
| 🎓 **Learn Hub** | Structured learning paths with progress tracking, badges & streak system | ✅ Live |
| 📖 **Module Reader** | Full-screen module content viewer with completion tracking | ✅ Live |
| 🃏 **AI Flashcards** | Gemini-generated study flashcards per learning module | ✅ Live |
| 👤 **Profile** | User settings, risk profile, onboarding data, data management | ✅ Live |
| ➕ **Add Transaction** | Manual debit/credit entry with smart paste (SMS parsing) & category auto-detection | ✅ Live |
| 🤖 **AI Insights** | Gemini-powered market commentary cards on the Feed | ✅ Live |
| 🧠 **FinSight IQ** | Behavioral financial score (0–1000) with AI coach, quests & mood analysis | ✅ Live |
| 📈 **Market Pulse** | NIFTY 50, SENSEX, GOLD, USD/INR live tracking via yfinance | ✅ Live |
| 🏦 **Mock Brokerage** | Buy/sell ETFs, Stocks & Mutual Funds with simulated price engine | ✅ Live |
| 💼 **Portfolio Tracker** | Holdings view with unrealised P&L, allocation %, total value | ✅ Live |
| 💰 **Virtual Wallet** | Credit/debit wallet for brokerage operations with balance tracking | ✅ Live |
| 🪙 **Round-Up Investing** | Spare change accumulation with auto-invest into NIFTY BeES at ₹500 threshold | ✅ Live |
| 💸 **Money Manager** | Comprehensive budget + spending management screen | ✅ Live |
| 📑 **Subscription Tracker** | Track recurring subscriptions and optimize spending | ✅ Live |
| 🧺 **Curated Baskets** | Pre-built investment baskets for specific goals (travel, emergency, etc.) | ✅ Live |
| 🎓 **Onboarding Flow** | Multi-step onboarding capturing age, experience, goals, income range, risk profile | ✅ Live |
| 📱 **Notification Parsing** | Parse UPI/banking app notifications to extract transaction data | ✅ Live |
| 📊 **50/30/20 Rule** | Real-time Needs/Wants/Savings ratio analysis with threshold alerts | ✅ Live |
| 💡 **Savings Engine** | Category surplus detection with invest/save/reallocate recommendations | ✅ Live |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    React Native App (Expo SDK 54)                     │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   Feed   │  │  Vitals  │  │  Goals   │  │  Learn   │  4 Tabs     │
│  │Dashboard │  │& Charts  │  │ Tracker  │  │   Hub    │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │              │             │              │                   │
│  ┌────▼──────────────▼─────────────▼──────────────▼──────────────┐   │
│  │              Redux Toolkit (11 Slices)                         │   │
│  │  auth · market · transactions · budgets · goals · learning    │   │
│  │  feed · iq · brokerage · wallet · vitalsIntel                 │   │
│  └──────┬────────────────────────────┬───────────────────────────┘   │
│         │                            │                               │
│  ┌──────▼──────┐            ┌────────▼────────┐                     │
│  │  7 Services │            │  2 Utils        │                     │
│  │  (API/CRUD) │            │  (insights,     │                     │
│  └──────┬──────┘            │  categorizer)   │                     │
│         │                   └─────────────────┘                     │
└─────────┼────────────────────────────────────────────────────────────┘
          │
          │  HTTP (REST)
          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       Flask Backend (Python)                          │
│                                                                       │
│  ┌──────────────────────┐    ┌─────────────────────────────────────┐ │
│  │    main.py Routes    │    │     Blueprint Modules               │ │
│  │                      │    │                                     │ │
│  │  /api/market-pulse   │    │  brokerage.py (OMS, Portfolio,     │ │
│  │  /api/market-insight │    │    Price Engine, Ledger)            │ │
│  │  /api/ai-advisor     │    │  wallet.py (Credit, Debit,         │ │
│  │  /api/generate-      │    │    Balance)                        │ │
│  │    flashcards        │    │  roundup.py (Add, Balance,         │ │
│  └──────────────────────┘    │    History, Auto-Invest)           │ │
│                              │  vitals_intel.py (Burn Rate,       │ │
│  ┌─────────────────────┐    │    Savings Engine, 50/30/20)       │ │
│  │  database.py        │    └─────────────────────────────────────┘ │
│  │  (SQLite ORM)       │                                            │
│  └──────────┬──────────┘                                            │
│             │                                                        │
│  ┌──────────▼──────────┐    ┌───────────────────┐                   │
│  │   brokerage.db      │    │  APScheduler      │                   │
│  │   (SQLite)          │    │  Price Tick (60s)  │                   │
│  └─────────────────────┘    └───────────────────┘                   │
└──────────────────────────────────────────────────────────────────────┘
          │
          ▼                          ▼
┌─────────────────────┐   ┌───────────────────────┐
│  External APIs      │   │   Firebase Services    │
│                     │   │                        │
│  yfinance (Yahoo    │   │  ┌──────────────────┐  │
│   Finance: NSE/BSE/ │   │  │  Firebase Auth   │  │
│   Gold/Forex)       │   │  │  (Google OAuth)  │  │
│                     │   │  └──────────────────┘  │
│  Gemini 2.5 Flash   │   │  ┌──────────────────┐  │
│  (AI commentary,    │   │  │    Firestore     │  │
│   advisor, flash-   │   │  │  users · budgets │  │
│   cards)            │   │  │  transactions    │  │
└─────────────────────┘   │  │  goals · learning│  │
                          │  │  glossary        │  │
                          │  └──────────────────┘  │
                          └────────────────────────┘
```

### Data Flow Summary

1. **Auth**: Firebase Auth handles Google sign-in. `RootNavigator` listens to auth-state changes and renders `LoginScreen` → `OnboardingScreen` → `BottomTabs` based on auth + onboarding status.
2. **Market Data**: On app load, `FeedScreen` dispatches `fetchMarketData()` and `fetchMarketInsight()` → hits the Flask backend → returns live prices from Yahoo Finance and AI commentary from Gemini 2.5 Flash.
3. **Personal Finance**: Transactions and Budgets are stored in Firestore (`users/{uid}/transactions`, `users/{uid}/budgets`) and synced into Redux state via `firestoreService.ts`. Real-time listeners (`onSnapshot`) keep data up-to-date.
4. **Learning**: Learning paths come from the `learning_paths` Firestore collection, with per-user progress tracked in `users/{uid}/learning_progress`. Module completion triggers streak updates and IQ score recalculation.
5. **FinSight IQ**: The behavioral score is calculated on the frontend using transactions, budgets, goals, learning progress, and streak data. The score + context is sent to `/api/ai-advisor` for Gemini-powered coaching.
6. **Brokerage**: Mock price engine runs on APScheduler (every 60s, ±2% random walk). Orders execute immediately against the virtual wallet, with holdings and P&L tracked in SQLite.
7. **Round-Up**: When a transaction is added, the spare change (rounded up to nearest ₹10) is accumulated. When the balance hits ₹500, it can be swept into a NIFTY BeES ETF purchase.
8. **Vitals Intelligence**: Transaction data is sent to `/api/vitals/*` endpoints for server-side analytics — predictive burn rate, savings surplus detection, and 50/30/20 ratio analysis.

---

## 📁 Project Structure

```
FinSight/
├── README.md                      # ← This file
│
├── FinSight-Backend/              # Flask Python API server
│   ├── main.py                    # Core routes: market-pulse, market-insight, ai-advisor, flashcards
│   ├── database.py                # SQLite schema init (orders, holdings, wallets, ledger, roundups)
│   ├── blueprints/                # Modular API blueprint system
│   │   ├── __init__.py
│   │   ├── brokerage.py           # Mock OMS, portfolio, price engine, ledger (5 endpoints)
│   │   ├── wallet.py              # Virtual wallet: credit, debit, balance (3 endpoints)
│   │   ├── roundup.py             # Round-up & invest mechanism (4 endpoints)
│   │   └── vitals_intel.py        # Burn rate, savings engine, 50/30/20 analysis (3 endpoints)
│   ├── brokerage.db               # SQLite database file (auto-created)
│   ├── requirements.txt           # Pinned Python dependencies
│   ├── Procfile                   # Heroku/Render process definition
│   ├── render.yaml                # Render.com deployment config
│   ├── .env                       # Secret keys (NOT committed)
│   └── .gitignore
│
└── FinSight-Frontend/             # Expo React Native app
    ├── App.tsx                    # Root component (fonts, Redux Provider, NavigationContainer)
    ├── index.ts                   # Entry point (registerRootComponent)
    ├── app.json                   # Expo config (name, slug, splash, icons)
    ├── eas.json                   # EAS Build profiles (preview APK, production AAB)
    ├── package.json               # NPM dependencies
    ├── tailwind.config.js         # NativeWind/Tailwind theme extensions
    ├── tsconfig.json              # TypeScript configuration
    ├── babel.config.js            # Babel config (module-resolver aliases)
    ├── metro.config.js            # Metro bundler config (NativeWind CSS)
    ├── nativewind-env.d.ts        # NativeWind type declarations
    ├── .env                       # Firebase keys + backend URL (NOT committed)
    ├── .env.example               # Template for .env file
    ├── .gitignore
    └── src/
        ├── components/                    # Reusable UI components (7)
        │   ├── MarketPulseWidget.tsx       # Horizontal scrolling market ticker
        │   ├── EITMCard.tsx               # "Everything Important To Me" AI insight cards
        │   ├── FinSightIQCard.tsx          # IQ score card with AI advisor, quests & mood
        │   ├── FinancialVitals.tsx         # Spend summary widget for Feed
        │   ├── TransactionRow.tsx          # Single transaction list item
        │   ├── BudgetBar.tsx              # Budget progress bar with category
        │   └── LearningPathCard.tsx        # Learning path card with progress
        ├── screens/                       # Full-page views (19)
        │   ├── FeedScreen.tsx             # Main dashboard (tab 1)
        │   ├── VitalsScreen.tsx           # Financial analytics (tab 2)
        │   ├── GoalsScreen.tsx            # Savings goals manager (tab 3)
        │   ├── LearnScreen.tsx            # Learning hub (tab 4)
        │   ├── LoginScreen.tsx            # Google OAuth sign-in
        │   ├── OnboardingScreen.tsx        # Multi-step onboarding wizard
        │   ├── ProfileScreen.tsx          # User settings & data management
        │   ├── AddTransactionScreen.tsx    # Transaction entry with smart paste
        │   ├── LearnPathDetailScreen.tsx   # Learning path detail + modules
        │   ├── ModuleReaderScreen.tsx      # Full-screen module content reader
        │   ├── FlashcardScreen.tsx         # AI-generated study flashcards
        │   ├── MoneyManagerScreen.tsx      # Budget + spending management
        │   ├── SubscriptionTrackerScreen.tsx # Recurring subscription tracker
        │   ├── CuratedBasketScreen.tsx     # Pre-built investment baskets
        │   ├── GoalAccelerationScreen.tsx  # Goal-linked investment acceleration
        │   ├── InvestScreen.tsx            # Brokerage: browse & buy/sell assets
        │   ├── PortfolioScreen.tsx         # Portfolio holdings & P&L
        │   ├── RoundUpScreen.tsx           # Round-up balance & auto-invest
        │   └── BurnRateScreen.tsx          # Predictive burn rate dashboard
        ├── navigation/
        │   ├── RootNavigator.tsx           # Auth gate → Onboarding → MainTabs + stack screens
        │   └── BottomTabs.tsx             # 4-tab bottom navigation (Feed, Vitals, Goals, Learn)
        ├── store/
        │   ├── store.ts                   # Redux store config (11 reducers)
        │   ├── hooks.ts                   # Typed useAppSelector / useAppDispatch
        │   └── slices/
        │       ├── authSlice.ts           # User auth state + profile + onboarding
        │       ├── marketSlice.ts         # Market pulse data + AI insights
        │       ├── transactionsSlice.ts   # Transaction CRUD + Firestore sync
        │       ├── budgetsSlice.ts        # Budget management + Firestore sync
        │       ├── goalsSlice.ts          # Savings goals CRUD
        │       ├── learningSlice.ts       # Learning paths, progress, streak
        │       ├── feedSlice.ts           # Feed-specific state
        │       ├── iqSlice.ts             # FinSight IQ score + AI advisor
        │       ├── brokerageSlice.ts      # Prices, orders, portfolio
        │       ├── walletSlice.ts         # Virtual wallet + round-up state
        │       └── vitalsIntelSlice.ts    # Burn rate + savings engine + 50/30/20
        ├── services/
        │   ├── authService.ts             # Firebase Auth wrappers (Google sign-in/out)
        │   ├── firestoreService.ts        # All Firestore CRUD (users, txns, budgets, goals, learning, glossary)
        │   ├── marketService.ts           # External market data fallback (Koyeb-hosted)
        │   ├── brokerageService.ts        # Flask brokerage API client (prices, orders, portfolio, ledger)
        │   ├── walletService.ts           # Flask wallet + round-up API client
        │   ├── vitalsIntelService.ts       # Flask vitals intelligence API client
        │   └── notificationParser.ts      # Parses UPI/banking notifications to extract transactions
        ├── utils/
        │   ├── insights.ts                # EITM insight card generator (budget alerts, spending analysis)
        │   └── smartCategorizer.ts        # Bank SMS parser (amount, merchant, category extraction)
        ├── config/
        │   ├── firebase.ts                # Firebase app initialization
        │   └── api.ts                     # BACKEND_URL config from env
        ├── data/
        │   └── mockData.ts               # Type definitions, fallback data & learning content (63KB)
        ├── theme/
        │   └── tokens.ts                 # Design system: colors, typography, spacing, shadows, z-index
        └── global.css                     # NativeWind global styles
```

---

## 🛠 Tech Stack

### Frontend

| Tool | Version | Purpose |
|---|---|---|
| Expo | SDK 54 | React Native toolchain & OTA updates |
| React Native | 0.81.5 | Cross-platform mobile framework |
| React | 19.1.0 | UI component library |
| TypeScript | 5.9.x | Static typing |
| NativeWind | 4.x | Tailwind CSS for React Native |
| Tailwind CSS | 3.4.x | Utility-first CSS framework (dev) |
| React Navigation | 7.x | Screen routing & navigation (Stack + Bottom Tabs) |
| Redux Toolkit | 2.x | Global state management (11 slices) |
| Firebase | 12.9.x | Auth (Google OAuth) + Firestore database |
| react-hook-form | 7.x | Form validation (Add Transaction, Onboarding) |
| Zod | 4.x | Schema validation |
| react-native-reanimated | 4.x | Animations |
| react-native-svg | 15.x | SVG rendering |
| lucide-react-native | 0.563 | Icon library |
| date-fns | 4.x | Date formatting utilities |
| Inter Font | — | Typography (via @expo-google-fonts) |
| expo-splash-screen | 31.x | Splash screen management |
| Async Storage | 2.x | Local persistence |

### Backend

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Runtime |
| Flask | 3.1.3 | HTTP API framework |
| Flask-CORS | 6.0.2 | Cross-origin request support |
| yfinance | 1.2.0 | Yahoo Finance market data (NSE, BSE, Gold, Forex) |
| google-genai | 1.68.0 | Google Gemini 2.5 Flash AI client |
| google-auth | 2.49.1 | Google authentication library |
| APScheduler | 3.10.4 | Background job scheduler (price tick every 60s) |
| SQLite | 3 | Embedded database for brokerage, wallet, round-ups |
| python-dotenv | 1.1.0 | Load environment variables |
| gunicorn | 23.0.0 | Production WSGI server |

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
pip install -r requirements.txt
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
[DB] SQLite schema initialised at .../brokerage.db
[Scheduler] Price tick job started (every 60s)
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
```

> **Tip:** Note your machine's local IP address (e.g., `192.168.x.x`). You'll need it to configure the frontend.

---

## 📱 Setup: Frontend

### 1. Navigate to the frontend directory

```bash
cd FinSight/FinSight-Frontend
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

# Flask backend URL (your laptop's local IP + port)
EXPO_PUBLIC_BACKEND_URL=http://YOUR_LOCAL_IP:5000
```

> ⚠️ Use your machine's **LAN IP** (e.g., `192.168.1.10`), not `localhost`, so that your phone can reach it over the network. You can find this by running `ipconfig` on Windows or `ifconfig` on macOS/Linux.

### 5. Start the Expo development server

```bash
npm start
```

Scan the QR code with the **Expo Go** app on your device. The app should load and connect to your local backend.

### 6. Build a standalone APK (optional)

```bash
npx eas build --profile preview --platform android
```

---

## 🔑 Environment Variables Reference

### Backend (`FinSight-Backend/.env`)

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for AI insights, advisor & flashcards | ✅ Yes |

### Frontend (`FinSight-Frontend/.env`)

| Variable | Description | Required |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase project API key | ✅ Yes |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | ✅ Yes |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | ✅ Yes |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | ✅ Yes |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | ✅ Yes |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase web app ID | ✅ Yes |
| `EXPO_PUBLIC_BACKEND_URL` | Flask backend base URL (e.g., `http://192.168.1.10:5000`) | ✅ Yes |

---

## 📡 API Reference

Base URL: `http://<YOUR_IP>:5000`

### Core Routes (`main.py`)

---

#### `GET /api/market-pulse`

Returns current price, previous close, and percentage change for 4 Indian market indicators.

**Response:**
```json
[
  { "id": "1", "name": "NIFTY 50", "price": "24,500.00", "change": "0.42", "isUp": true },
  { "id": "2", "name": "SENSEX", "price": "80,500.00", "change": "0.38", "isUp": true },
  { "id": "3", "name": "GOLD (Futures)", "price": "7,150.00", "change": "0.15", "isUp": false },
  { "id": "4", "name": "USD/INR", "price": "83.56", "change": "0.10", "isUp": false }
]
```

---

#### `GET /api/market-insight`

Fetches live market data and sends it to Gemini 2.5 Flash, which returns 2 insight cards in English.

**Response:**
```json
[
  {
    "title": "Why is NIFTY 50 up today?",
    "text": "IT sector buying pushed the index higher. For beginners, an up index generally signals positive market sentiment."
  },
  {
    "title": "Gold prices dip — should you buy?",
    "text": "A strong dollar temporarily pulled gold lower. Long-term investors may see this as an entry opportunity."
  }
]
```

---

#### `POST /api/ai-advisor`

FinSight IQ AI Coach — sends user financial context to Gemini, returns mood + explanation + 3 personalized quests.

**Request Body:**
```json
{
  "score": 520,
  "streak": 5,
  "transactions": [{ "date": "2026-06-01", "type": "debit", "amount": 450, "category": "dining", "merchant": "Swiggy" }],
  "budgets": [{ "category": "dining", "monthlyLimit": 3000, "currentSpend": 1200 }],
  "goals": [{ "title": "Emergency Fund", "emoji": "🛡️", "targetAmount": 50000, "savedAmount": 15000 }]
}
```

**Response:**
```json
{
  "mood": "Your spending is steady but savings need a boost.",
  "explanation": "Your IQ score of 520 reflects good tracking habits. However, your dining spend is at 40% of budget with 20 days remaining, and your emergency fund is only 30% funded.",
  "quests": [
    { "title": "Cut Dining Spend", "description": "Cook 3 meals at home this week to save ₹500 and earn +15 IQ.", "points": 15 },
    { "title": "Boost Emergency Fund", "description": "Add ₹2000 to your emergency fund goal and earn +25 IQ.", "points": 25 },
    { "title": "Complete a Module", "description": "Finish any learning module to extend your streak and earn +20 IQ.", "points": 20 }
  ]
}
```

---

#### `POST /api/generate-flashcards`

Generates 5 study flashcards for a learning module using Gemini.

**Request Body:**
```json
{
  "title": "What is a Mutual Fund?",
  "content": "A mutual fund pools money from many investors to invest in stocks, bonds...",
  "keyPoints": ["Diversification reduces risk", "SIP is a disciplined approach"]
}
```

**Response:**
```json
[
  { "question": "Why does diversification reduce investment risk?", "answer": "By spreading investments across many assets, losses in one are offset by gains in others." },
  { "question": "What makes SIP a good strategy for beginners?", "answer": "SIP invests a fixed amount regularly, averaging out market ups and downs." }
]
```

---

### Brokerage Blueprint (`blueprints/brokerage.py`)

**Mock Asset Catalogue:** NIFTY_BEES, GOLDBEES, INFY, TCS, HDFC_MF, AXIS_MF

---

#### `GET /api/prices`

Returns simulated prices for all 6 assets (updated every 60s via APScheduler).

**Response:**
```json
[
  { "symbol": "NIFTY_BEES", "name": "Nippon Nifty BeES ETF", "type": "ETF", "price": 282.45, "change_pct": 0.87, "is_up": true },
  { "symbol": "INFY", "name": "Infosys", "type": "Stock", "price": 1695.30, "change_pct": -0.43, "is_up": false }
]
```

---

#### `POST /api/orders`

Place a BUY or SELL order. Validates wallet balance (BUY) or holdings quantity (SELL).

**Request Body:**
```json
{ "user_id": "abc123", "asset_id": "NIFTY_BEES", "quantity": 5, "order_type": "BUY" }
```

**Response (201):**
```json
{ "order_id": "uuid", "status": "EXECUTED", "asset_id": "NIFTY_BEES", "order_type": "BUY", "quantity": 5, "price": 280.50, "total": 1402.50, "timestamp": "2026-06-09T..." }
```

---

#### `GET /api/orders?user_id=abc123`

Returns order history (last 50 orders).

---

#### `GET /api/portfolio?user_id=abc123`

Returns holdings with unrealised P&L and allocation percentages.

**Response:**
```json
{
  "holdings": [
    { "asset_id": "NIFTY_BEES", "name": "Nippon Nifty BeES ETF", "type": "ETF", "quantity": 10, "avg_buy_price": 278.50, "current_price": 282.45, "invested": 2785.00, "current_value": 2824.50, "unrealised_pnl": 39.50, "unrealised_pnl_pct": 1.42, "allocation_pct": 65.3 }
  ],
  "total_invested": 4270.00,
  "total_value": 4325.50,
  "total_pnl": 55.50,
  "total_pnl_pct": 1.30
}
```

---

#### `GET /api/ledger?user_id=abc123`

Returns transaction ledger entries (BUY, SELL, CREDIT, DEBIT, ROUND-UP INVEST).

---

### Wallet Blueprint (`blueprints/wallet.py`)

---

#### `GET /api/wallet?user_id=abc123`

Returns wallet balance, locked balance, and available funds.

---

#### `POST /api/wallet/credit`

Add funds to the virtual wallet.

**Request Body:** `{ "user_id": "abc123", "amount": 5000 }`

---

#### `POST /api/wallet/debit`

Deduct funds from the wallet.

**Request Body:** `{ "user_id": "abc123", "amount": 1000, "reason": "DEBIT" }`

---

### Round-Up Blueprint (`blueprints/roundup.py`)

Formula: `rounded_amount = ceil(original / 10) * 10` → `delta = rounded_amount - original`

Threshold: ₹500 accumulated → auto-invest into NIFTY_BEES

---

#### `POST /api/roundup/add`

Record a round-up delta from a transaction.

**Request Body:** `{ "user_id": "abc123", "original_amount": 247 }`

**Response (201):**
```json
{ "txn_id": "uuid", "original_amount": 247, "rounded_amount": 250, "delta": 3.0, "status": "PENDING" }
```

---

#### `GET /api/roundup/balance?user_id=abc123`

Returns accumulated pending round-up balance and investment readiness.

```json
{ "roundup_balance": 487.50, "pending_count": 42, "threshold": 500, "ready_to_invest": false, "progress_pct": 97.5 }
```

---

#### `GET /api/roundup/history?user_id=abc123`

Returns last 30 round-up transactions.

---

#### `POST /api/roundup/invest`

Sweep all pending round-ups and buy NIFTY_BEES.

**Request Body:** `{ "user_id": "abc123" }`

---

### Vitals Intelligence Blueprint (`blueprints/vitals_intel.py`)

---

#### `POST /api/vitals/burn-rate`

Predictive burn rate analysis with linear projection.

**Request Body:**
```json
{ "transactions": [...], "total_budget": 30000 }
```

**Response:**
```json
{
  "current_month_spend": 12500.00,
  "days_elapsed": 15,
  "days_remaining": 15,
  "daily_avg": 833.33,
  "projected_monthly": 25000.00,
  "budget_variance": -5000.00,
  "status": "ON_TRACK",
  "alert": "Great! Your spending is within a healthy range.",
  "top_categories": [{ "category": "dining", "amount": 4500.00 }]
}
```

---

#### `POST /api/vitals/savings-engine`

Category surplus detection with invest/save/reallocate recommendations.

**Request Body:**
```json
{ "transactions": [...], "budgets": [...], "income": 50000 }
```

---

#### `POST /api/vitals/503020`

Real-time 50/30/20 Needs/Wants/Savings ratio analysis.

**Request Body:**
```json
{ "transactions": [...], "income": 50000 }
```

**Response:**
```json
{
  "total_spend": 35000,
  "income": 50000,
  "implicit_savings": 15000,
  "buckets": {
    "needs": { "amount": 18000, "pct_of_spend": 51.4, "target_pct": 50, "delta": 1.4, "status": "ON_TRACK" },
    "wants": { "amount": 12000, "pct_of_spend": 34.3, "target_pct": 30, "delta": 4.3, "status": "ON_TRACK" },
    "savings": { "amount": 5000, "pct_of_spend": 14.3, "target_pct": 20, "delta": -5.7, "status": "UNDER" }
  },
  "alerts": [{ "type": "INFO", "bucket": "savings", "message": "Savings is 5.7% below the 20% target." }],
  "is_golden_ratio": false
}
```

---

## 🔥 Database Schema

### Firebase Firestore

```
Firestore (Root)
│
├── users/
│   └── {userId}/
│       ├── name, email, riskProfile, primaryGoal, createdAt
│       ├── age, experienceLevel, appGoals[], incomeRange        ← Onboarding profile
│       ├── onboardingComplete: boolean                          ← Onboarding gate flag
│       ├── streak: number, lastStudiedDate: string              ← Learning streak
│       ├── preferences: { notifications, language }
│       │
│       ├── transactions/
│       │   └── {txnId}: { amount, type, category, merchant, date, source, notes }
│       │
│       ├── budgets/
│       │   └── {budgetId}: { category, monthlyLimit, currentSpend, month }
│       │
│       ├── goals/
│       │   └── {goalId}: { title, emoji, targetAmount, savedAmount, deadline, color, createdAt }
│       │
│       └── learning_progress/
│           └── {pathId}: { completedModules[], lastModuleId, percentage, badgeEarned, updatedAt }
│
├── learning_paths/
│   └── {pathId}: { title, description, overview, progress, nextModule, badgeEarned, modules[] }
│
└── glossary/
    └── {termId}: { term, definition }
```

### SQLite (`brokerage.db`)

```
SQLite Database
│
├── orders
│   └── order_id (PK), user_id, asset_type, asset_id, quantity, price, order_type, status, timestamp
│
├── holdings
│   └── id (PK), user_id, asset_id (UNIQUE per user), quantity, avg_buy_price
│
├── transaction_ledger
│   └── transaction_id (PK), user_id, type, amount, asset_id, status, timestamp
│
├── wallets
│   └── user_id (PK), wallet_balance, locked_balance
│
└── roundup_transactions
    └── txn_id (PK), user_id, original_amount, rounded_amount, delta, status, timestamp
```

---

## 🧠 Redux State

The app uses Redux Toolkit with 11 slices. Full state tree:

```typescript
{
  auth: {
    user: { uid, email, displayName } | null,
    isLoading: boolean,
    profile: UserProfile | null,     // Firestore user doc (includes onboarding data)
    profileLoading: boolean
  },
  market: {
    data: MarketPulseItem[],         // From /api/market-pulse (NIFTY, SENSEX, GOLD, USD/INR)
    insights: InsightItem[],         // From /api/market-insight (Gemini-generated)
    loading: boolean,
    error: string | null
  },
  transactions: {
    items: FirestoreTransaction[],   // Firestore: users/{uid}/transactions
    loading: boolean,
    error: string | null
  },
  budgets: {
    items: FirestoreBudget[],        // Firestore: users/{uid}/budgets
    loading: boolean,
    error: string | null
  },
  goals: {
    items: FirestoreGoal[],          // Firestore: users/{uid}/goals
    loading: boolean,
    error: string | null
  },
  learning: {
    paths: FirestoreLearningPath[],  // Firestore: learning_paths collection
    userProgress: Record<string, UserProgress>,  // users/{uid}/learning_progress
    loading: boolean,
    error: string | null
  },
  feed: {
    insightCards: EITMCardData[],    // Generated from transactions + budgets
    loading: boolean
  },
  iq: {
    score: number,                   // 0–1000 behavioral financial score
    advice: AIAdvice | null,         // From /api/ai-advisor (mood, explanation, quests)
    adviceLoading: boolean,
    adviceError: string | null,
    lastFetchedAt: string | null
  },
  brokerage: {
    prices: AssetPrice[],            // From /api/prices (6 mock assets)
    orders: Order[],                 // From /api/orders
    portfolio: Portfolio | null,     // From /api/portfolio
    loading: boolean,
    error: string | null
  },
  wallet: {
    balance: WalletState | null,     // From /api/wallet
    roundupBalance: RoundupBalance | null,  // From /api/roundup/balance
    roundupHistory: RoundupTransaction[],   // From /api/roundup/history
    loading: boolean,
    error: string | null
  },
  vitalsIntel: {
    burnRate: BurnRateResult | null,       // From /api/vitals/burn-rate
    savingsEngine: SavingsEngineResult | null,  // From /api/vitals/savings-engine
    rule503020: Rule503020Result | null,   // From /api/vitals/503020
    loading: boolean,
    error: string | null
  }
}
```

---

## 🏆 FinSight IQ Algorithm

The FinSight IQ is a behavioral financial score ranging from **0 to 1000**, calculated entirely on the frontend based on the user's actual financial behavior:

| Factor | Points | Cap |
|---|---|---|
| Base score | 400 | — |
| +5 per debit transaction tracked this month | +5 each | +100 (20 txns) |
| +10 per budget category under 80% spent | +10 each | No cap |
| −20 per budget category over 100% (busted) | −20 each | No cap |
| +50 per 25% milestone on any savings goal | +50/milestone | Up to +200/goal |
| +20 per learning module completed | +20 each | +200 (10 modules) |
| +5 per consecutive streak day | +5 each | +100 (20 days) |

The calculated score is sent to `/api/ai-advisor` along with the user's transaction, budget, and goal context. Gemini returns a personalized mood summary, explanation, and 3 actionable quests.

---

## 🚀 Deployment

### Backend (Render.com)

The backend is configured for deployment on [Render](https://render.com/) via `render.yaml`:

```yaml
services:
  - type: web
    name: finsight-backend
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn main:app
    envVars:
      - key: GEMINI_API_KEY
        sync: false   # Set manually in Render dashboard
```

A `Procfile` is also included for Heroku-compatible platforms:
```
web: gunicorn main:app
```

### Frontend (EAS Build)

The frontend is configured for EAS Build via `eas.json`:

| Profile | Platform | Output |
|---|---|---|
| `preview` | Android | APK (for testing) |
| `production` | Android | AAB (for Play Store) |

Build commands:
```bash
# Preview APK
npx eas build --profile preview --platform android

# Production AAB
npx eas build --profile production --platform android
```

---

## ⚠️ Known Issues

| Issue | Description | Workaround |
|---|---|---|
| **Redundant service** | `marketService.ts` calls an external Koyeb-hosted API, while `marketSlice.ts` calls the local Flask backend. The two are not connected. | `marketService.ts` is a legacy fallback; it can be removed or unified. |
| **SQLite in production** | `brokerage.db` is an embedded SQLite file. On Render's ephemeral filesystem, data resets on redeploy. | Migrate to PostgreSQL or a managed database for production. |
| **SMS permission removed** | Android SMS background listener is disabled (native permissions removed from `app.json`). | Smart Paste in `AddTransactionScreen` handles clipboard-based SMS parsing instead. |

---

## 🚀 Roadmap

- [ ] Migrate brokerage database to PostgreSQL for persistent production deployment
- [ ] Add push notifications for budget alerts at 80% / 100% thresholds
- [ ] Implement Account Aggregator (AA) integration via Setu/Sahamati
- [ ] On-device AI using Llama 3.2 (1B) for zero-latency, private queries
- [ ] Add Vernacular support (Hindi, Marathi, Tamil, Telugu)
- [ ] Robo-advisory: portfolio allocation recommendations based on risk profile
- [ ] Credit Score integration (CIBIL/Experian)
- [ ] Real brokerage API integration (Zerodha Kite / Groww / Dhan)
- [ ] Social features: compare FinSight IQ with friends
- [ ] Dark mode support

---

<div align="center">

Built with ❤️ for Indian college students and young professionals

</div>
