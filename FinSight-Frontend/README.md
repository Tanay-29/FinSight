# FinSight: Your Daily Money Mentor

**FinSight** is a unified mobile financial mentor designed for Indian Millennials and Gen Z. It transforms how young adults engage with money by bridging the gap between high fintech adoption and low financial literacy. By combining automated expense intelligence, real-time market awareness, and AI-powered "just-in-time" learning, FinSight eliminates app-switching and builds genuine financial wellness through contextual micro-learning moments.

## 🌟 What is FinSight?

Unlike traditional budgeting apps that depend on manual entry, or standalone news apps that cause information overload, FinSight delivers educational content *at the exact moment* you make a financial decision or experience a market event.

**Core Philosophy:**
*   **Glanceability First:** Critical information (Market Pulse, Budget Status) is scannable in under 5 seconds.
*   **Just-in-Time Intervention:** Educational content appears logically when you need it, avoiding overwhelming menus.
*   **Trust Through Transparency:** AI-generated insights are clearly labeled, with privacy-first data masking.
*   **Design for Loss Aversion:** Behavioral nudges help you course-correct spending proactively.

---

## 🏗️ Architecture

FinSight uses a modern, privacy-first technical architecture to manage sensitive financial data while delivering rapid ML and AI-driven insights:

1.  **Mobile Client:** Built on **React Native (Expo)** with local background services for SMS/Notification parsing and offline data capability.
2.  **API Gateway & Core Services (Future State):** Designed to transition to a microservices architecture using **NestJS** to handle user profiles, transactions, and budget events asynchronously via message queues (BullMQ).
3.  **Privacy & AI Gateway:** A dedicated **Python (FastAPI)** layer integrates with Microsoft Presidio to redact Personally Identifiable Information (PII) *before* data interacts with any Cloud LLM (OpenAI/Claude).
4.  **Database Layer:** **Firebase (MVP)** handling Auth and Firestore databases. Future migration designed for **MongoDB** (NoSQL) for schema flexibility and **Redis** for high-speed caching of market data.

---

## ⚙️ Tech Stack

### Frontend (Mobile App)
*   **Framework:** React Native (Expo SDK 52+)
*   **Language:** TypeScript
*   **Styling:** NativeWind (Tailwind CSS for React Native)
*   **State Management:** Redux Toolkit + RTK Query
*   **Navigation:** React Navigation 7.x
*   **Charts:** Victory Native
*   **Local AI Inference (Future):** `react-native-executorch` (Llama 3.2 1B)

### Backend & Database (MVP)
*   **Authentication:** Firebase Auth (Phone OTP + Google)
*   **Database:** Firebase Firestore (Users, Transactions, Budgets, Learning Progress)
*   **Cloud Functions:** Server-side logic and aggregation

### AI & Third-Party Integrations
*   **Generative AI:** OpenAI GPT-4o-mini / Anthropic Claude (via backend)
*   **Market Data:** Alpha Vantage / NSE APIs
*   **Analytics:** Mixpanel & Firebase Analytics
*   **Notification Parsing:** `react-native-android-notification-listener`

---

## ✨ Features (Current & Upcoming)

### 📊 1. Automated Expense Tracking (Live/MVP)
*   **Notification Listener (Android):** Extracts transaction metadata (amount, merchant, date) straight from payment app push notifications (GPay, PhonePe, SBI, HDFC) without reading full SMS logs for maximum privacy.
*   **ML Auto-Categorization:** Maps merchants to 14 predefined categories accurately (e.g., Swiggy -> Dining).
*   **Manual Entry Fallback:** Quick-add UI for cash transactions or iOS users.

### 🧠 2. "Explain It To Me" (EITM) Cards (Live/MVP)
*   **Contextual AI Education:** If the market shifts by >2% or if your transaction category spikes, an EITM card triggers.
*   **Personalized Impact:** Uses a cloud-based LLM to generate easy-to-understand (ELI15, Hinglish) explanations covering *why* an event happened and *how* it directly impacts your portfolio/budget.

### 📈 3. "Today's Feed" & Market Pulse (Live/MVP)
*   **Market Pulse Widget:** Scannable (<5 sec) index tracking (NIFTY 50, SENSEX, GOLD) with live sparklines and color-coded trends.
*   **Financial Vitals Dashboard:** Shows total monthly spend, top 3 categories, and remaining budget limits alongside a 7-day spending trend chart.

### 🔔 4. Budget Nudges & Behavioral Alerts (Live/MVP)
*   **Real-Time Alerts:** Push notifications trigger when you hit 80%, 100%, and 120% of your category budget limits, utilizing color psychology (Amber -> Red) to prompt behavior changes.
*   **Weekly Summaries:** Automated summaries comparing week-over-week spending.

### 📚 5. Gamified Learning Hub (Live/MVP)
*   **Structured Learning Paths:** Bite-sized (3-5 min) modules on "Investing 101", "Budgeting Basics", and "Tax Simplified".
*   **Gamification:** Earn streaks, progress rings, and achievement badges for quiz completions.
*   **FinVocab Glossary:** Contextual glossary linked dynamically to terms used within the app (e.g., CAGR, Repo Rate).

### 🚀 6. Future Enhancements (Roadmap)
*   **Account Aggregator (AA) Integration:** Official banking API consent sharing (via Setu/Sahamati) for 100% transaction precision.
*   **On-Device AI Output:** Implementation of Llama 3.2 (1B) directly on the device ensuring zero-latency, complete privacy queries (No data leaves the phone).
*   **Vernacular Support:** Native interface and AI responses in Hindi, Marathi, Tamil, and Telugu.
*   **Robo-Advisory:** Automated portfolio recommendations and tax-loss harvesting suggestions based on risk profiles.
*   **Credit Score Integration:** Live linking to CIBIL/Experian logic.
