# ⚡ FinVault — Personal Finance Management System

FinVault is a production-grade, highly interactive, and visually stunning personal finance dashboard. It features a fast, secure FastAPI backend and a clean, responsive vanilla HTML/JS frontend utilizing glassmorphic aesthetics.

---

## 🚀 Key Features

*   **Secure Authentication**: JWT-based session management, secure storage, and automatic token refresh.
*   **Transaction Tracker**: CRUD transactions, attach receipt images, search description and notes, and filter dynamically by date, category, type, and amount.
*   **Visual Budgets**: Set category budget limits, track progress with interactive visual rings, and receive smart visual warning alerts.
*   **Bill Reminders**: Manage recurring bills with dynamic tracking states (Paid, Overdue, Due Soon).
*   **Financial Goals**: Target long-term goals with progress percentage indicators.
*   **Advanced Reports**: Dynamic monthly and yearly statement previews with download capabilities for **PDF**, **Excel**, and **CSV**.
*   **Dynamic Analytics**: Beautiful charts using Chart.js to breakdown income/expense flows and category structures.
*   **Responsive & Snappy UI**: Hardware-accelerated transitions optimized for both high-resolution desktop viewports and mobile screens.

---

## 📂 Project Architecture

```text
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/v1/           # API routes (auth, transactions, budgets, etc.)
│   │   ├── config/           # App settings & configurations
│   │   ├── database/         # Session manager, Base models, DB migrations
│   │   ├── models/           # SQLAlchemy DB Models
│   │   └── schemas/          # Pydantic schemas (validations)
│   ├── migrations/           # Alembic Database Migration files
│   ├── requirements.txt      # Python backend packages
│   └── main.py               # Backend startup script
│
├── frontend/                 # Static Frontend Application
│   ├── assets/               # CSS modules, Fonts, Static assets
│   ├── components/           # HTML templates (nav sidebar, topbar, modal wrappers)
│   ├── js/                   # Javascript app modules (services, pages, router, state store)
│   └── index.html            # Main SPA entrypoint
```

---

## 🛠️ Local Development Setup

### 1. Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```

2.  Create and activate a python virtual environment:
    ```bash
    python -m venv venv
    # Windows:
    .\venv\Scripts\activate
    # macOS/Linux:
    source venv/bin/activate
    ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Configure Environment Variables:
    Create a `.env` file in the `backend/` root directory (refer to `.env.example`):
    ```env
    PROJECT_NAME="FinVault"
    DATABASE_URL="sqlite:///./finvault.db" # Or postgresql://...
    SECRET_KEY="YOUR_SUPER_SECRET_JWT_KEY"
    ALGORITHM="HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    REFRESH_TOKEN_EXPIRE_DAYS=7
    CORS_ORIGINS="http://localhost:5500,http://127.0.0.1:5500,http://localhost:8000"
    ```

5.  Run database migrations (or auto-generate tables on start):
    ```bash
    alembic upgrade head
    ```

6.  Start the FastAPI Server:
    ```bash
    uvicorn main:app --reload --port 8000
    ```
    The API documentation will be available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup

The frontend is a lightweight Single Page Application (SPA) built with vanilla JS and ES6 modules.

1.  Open the `frontend` folder using any static web server (e.g. VS Code **Live Server** plugin or `python -m http.server 5500`).
2.  Open `http://localhost:5500` in your web browser.
3.  The frontend is pre-configured to dynamically route API requests to `http://localhost:8000/api/v1` during local dev, and switches automatically to your production Render backend URL when deployed!

---

## 🌐 Production Deployment

*   **Backend Hosting**: Render (`https://finvault-zsby.onrender.com`) running on Gunicorn.
*   **Database Hosting**: Neon Postgres Database.
*   **Frontend Hosting**: Vercel (`https://fin-vault-ten.vercel.app`).
