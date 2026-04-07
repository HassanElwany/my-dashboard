# ✨ Lumina — Personal Lifestyle Dashboard

> One place that actually knows you. Your nutrition. Your teams. Your portfolio.

I got tired of jumping between 5 different apps every morning — checking calories in one tab, football scores in another, and stock prices in a third. So I built **Lumina**: a unified personal dashboard that pulls all of that into one clean interface, powered by AI.

This is a full-stack project I built from scratch for fun (and learning). It's not a startup, it's not a SaaS — it's just something I genuinely use and wanted to do properly.

---

## 🖼️ What It Looks Like

The dashboard has 4 main sections:

- 🥗 **Telemetry & Logs** — log your daily meals and track macros
- 🤖 **Diet Architect** — AI-generated weekly meal plans using Gemini
- ⚽ **Sports Hub** — live data for your football teams
- 📈 **Wealth Tracker** — stock quotes and news for your watchlist

---

## 🧠 How It Works

You register with your profile (age, dietary preferences, health conditions, football teams you follow, stocks you track). Then everything is personalized — the AI knows you can't eat gluten, the sports hub shows your specific clubs, and the stock tracker shows your watchlist.

### The AI stuff
When you log your meals, you can hit **"Run AI Analysis"** and Gemini 2.5 Flash will look at what you ate and suggest your next meal based on your goals, health conditions, food dislikes, and even your preferred cuisine. It's weirdly good.

You can also generate a full **7-day meal plan** — it respects your dietary restrictions, language preference (English or Arabic), and calorie goals. Rate-limited to 2 plans per week so I don't burn through the API.

---

## 🛠️ Tech Stack

### Backend
| What | Tech |
|------|------|
| Language | Python 3.x |
| Framework | FastAPI + Uvicorn |
| Database | PostgreSQL 15 (Docker) |
| ORM | SQLAlchemy |
| Auth | JWT (HS256) + bcrypt |
| AI | Google Gemini 2.5 Flash |
| Sports Data | API-Football v3 |
| Finance Data | yfinance + Yahoo RSS |
| Config | python-dotenv |

### Frontend
| What | Tech |
|------|------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |

---

## 🚀 Running It Locally

### Prerequisites
- Python 3.x
- Node.js 18+
- Docker (for PostgreSQL)

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/lumina-dashboard.git
cd lumina-dashboard
```

### 2. Start the database
```bash
docker-compose up -d
```

### 3. Set up the backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:
```env
DATABASE_URL=postgresql://admin:secretpassword@localhost:5432/dashboard
SECRET_KEY=your-secret-key-change-this
GEMINI_API_KEY=your-gemini-api-key
API_FOOTBALL_KEY=your-api-football-key
```

Then run the server:
```bash
uvicorn app.main:app --reload
```

API will be live at `http://localhost:8000`
Auto-generated docs at `http://localhost:8000/docs` ← very useful

### 4. Set up the frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend will be live at `http://localhost:3000`

---

## 📁 Project Structure

```
lumina-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py          # App entry point, CORS, router registration
│   │   ├── database.py      # SQLAlchemy engine & session setup
│   │   ├── models.py        # DB tables: users, daily_logs, meals, diet_plans
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── auth.py          # JWT verification, password hashing
│   │   └── routers/
│   │       ├── users.py     # Register, login, profile
│   │       ├── diet.py      # Meal logging + AI analysis
│   │       ├── sports.py    # Football data
│   │       └── finance.py   # Stock quotes & news
│   ├── requirements.txt
│   └── .env                 # ← never commit this
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main dashboard
│   │   ├── login/           # Login page
│   │   └── register/        # Registration page
│   └── components/
│       ├── TelemetryLogs.tsx
│       ├── DietArchitect.tsx
│       ├── SportsHub.tsx
│       ├── WealthTracker.tsx
│       ├── AddMealModal.tsx
│       └── CreateLogModal.tsx
│
└── docker-compose.yml       # PostgreSQL container
```

---

## 🔐 API Endpoints (Quick Reference)

| Method | Endpoint | Auth | What it does |
|--------|----------|------|--------------|
| POST | `/users/` | ❌ | Register |
| POST | `/token` | ❌ | Login → get JWT |
| GET | `/users/me` | ✅ | Your profile |
| POST | `/logs/` | ✅ | Start a new day log |
| GET | `/logs/` | ✅ | All your logs + meals |
| POST | `/logs/{id}/meals/` | ✅ | Add a meal |
| GET | `/logs/{id}/analyze` | ✅ | AI meal analysis |
| POST | `/plans/generate` | ✅ | Generate 7-day plan |
| GET | `/plans/` | ✅ | Your saved plans |
| GET | `/football/hub` | ✅ | All your teams' data |
| GET | `/finance/quotes` | ✅ | Your stock watchlist |

---

## 🔑 Getting API Keys

- **Google Gemini** → [aistudio.google.com](https://aistudio.google.com) (free tier available)
- **API-Football** → [api-sports.io](https://api-sports.io) (free tier: 100 req/day)
- **Yahoo Finance** → No key needed ✅

---

## ⚠️ Things to Know

- **Don't commit `.env`** — it has your secret keys. It's already in `.gitignore` but just double check.
- The frontend expects the backend at `http://localhost:8000` — if you change ports, update the fetch URLs in `frontend/`.
- The AI plan generator is rate-limited to **2 plans per 7 days** per user (to protect the API quota).
- `GET /logs/` returns full nested meals — if you're extending the backend, make sure to keep `response_model=list[schemas.DailyLogResponse]` on that route or meals won't show up on the frontend.

---

## 💡 What I Learned Building This

- FastAPI's dependency injection is genuinely elegant once it clicks
- SQLAlchemy lazy loading can silently break your API if you forget `response_model`
- JWT auth isn't scary — it's like a signed sticky note
- Gemini's context window makes it surprisingly easy to personalize AI responses with user data
- Docker for just the DB is a sweet spot — no overhead, just runs

---

## 📄 License

MIT — do whatever you want with it.

---

*Built with too much coffee and genuine curiosity. — Hasan*
