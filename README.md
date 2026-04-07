# Global Disaster & Humanitarian Response Tracker

A full-stack web application that aggregates, normalizes, and visualizes 65,000+ U.S. disaster declarations from FEMA (1953-present). Built as a course project for **D532 - Applied Database Technologies, Spring 2026** at Indiana University Bloomington, Luddy School of Informatics.

**Team:** Prajwal Manohar, Aditya Dhumal, Tanmay Kulkarni

---

## Features

- **Interactive Dashboard** - Geographic heat map, time-series charts, pie charts, seasonal patterns, and federal assistance program breakdowns
- **CRUD Operations** - Create, read, update, and soft-delete disaster records with role-based access control
- **Advanced Search & Filtering** - Filter by disaster type, state, date range, declaration type with full-text search
- **User Authentication** - JWT-based auth with three roles: viewer, editor, admin
- **Incident Reports** - Users can submit and manage disaster incident reports
- **CSV Export** - Export filtered disaster data for external analysis
- **Responsive Design** - Mobile-friendly UI built with Tailwind CSS

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Database** | PostgreSQL (Supabase) | Hosted relational database with 8 normalized tables |
| **Backend** | Node.js + Express.js | RESTful API with 17 endpoints |
| **Frontend** | React 19 + Vite | Single-page application with route-based navigation |
| **Charts** | Recharts | Line, pie, and bar chart visualizations |
| **Maps** | Leaflet.js | Interactive U.S. geographic heat map |
| **Styling** | Tailwind CSS | Utility-first responsive styling |
| **Auth** | JWT + bcrypt | Stateless token authentication with password hashing |
| **ETL** | Python (pandas) | Data pipeline to download, clean, and load FEMA data |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│   React + Vite  │────>│  Express.js API  │────>│ PostgreSQL/Supabase │
│   (Port 5173)   │<────│   (Port 5000)    │<────│    (Port 5432)      │
└─────────────────┘     └─────────────────┘     └─────────────────────┘
   Presentation             Application                 Data
      Tier                    Tier                      Tier
```

## Database Schema

The flat FEMA CSV is normalized into a relational schema (3NF):

```
states ──────────────┐
                     ├──> disaster_areas <──┐
declaration_types ───┤                      │
                     ├──> disasters ────────┘
incident_types ──────┘        │
                              │
users ──────────> user_reports ┘
```

**Tables:** `states` (56 entries), `declaration_types` (3), `incident_types` (27), `disasters` (5,163), `disaster_areas` (69,684), `users`, `user_reports`

## Project Structure

```
├── database/                   # SQL schema and seed files
│   ├── schema.sql              # 8 tables, indexes, triggers
│   └── seed_states.sql         # 56 U.S. states/territories
├── etl/                        # Python ETL pipeline
│   ├── load_fema_data.py       # Download, clean, and load FEMA data
│   └── requirements.txt        # pandas, psycopg2, requests
├── backend/                    # Node.js + Express API server
│   ├── package.json
│   └── src/
│       ├── server.js           # App setup, middleware, route mounting
│       ├── config/
│       │   └── db.js           # PostgreSQL connection pool
│       ├── middleware/
│       │   └── auth.js         # JWT verification & role authorization
│       └── routes/
│           ├── disasters.js    # CRUD: list, detail, create, update, delete
│           ├── analytics.js    # Dashboard aggregation queries
│           ├── auth.js         # Register, login, profile
│           ├── reports.js      # User incident reports
│           ├── export.js       # CSV export
│           └── lookup.js       # Dropdown reference data
├── frontend/                   # React + Vite SPA
│   ├── package.json
│   ├── vite.config.js          # Dev proxy to backend
│   └── src/
│       ├── App.jsx             # Routes & protected route wrapper
│       ├── main.jsx            # Entry point
│       ├── api/
│       │   └── client.js       # Axios instance with JWT interceptor
│       ├── context/
│       │   └── AuthContext.jsx  # Auth state management
│       ├── components/
│       │   ├── Navbar.jsx      # Navigation with role-based links
│       │   ├── USMap.jsx       # Leaflet choropleth map
│       │   ├── StatCard.jsx    # Reusable metric card
│       │   └── LoadingSpinner.jsx
│       └── pages/
│           ├── Dashboard.jsx   # Analytics dashboard (6 visualizations)
│           ├── DisasterList.jsx# Searchable, filterable table
│           ├── DisasterDetail.jsx # Single record view
│           ├── DisasterForm.jsx# Create/edit form
│           ├── Login.jsx       # Sign in
│           ├── Register.jsx    # Sign up
│           └── Reports.jsx     # Incident report management
├── .env.example                # Environment variable template
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **Supabase** account (free tier) - [supabase.com](https://supabase.com)

### 1. Clone the Repository

```bash
git clone https://github.com/PrajwalManohar/Global-Disaster-Humanitarian-Response-Tracker.git
cd disaster-tracker
```

### 2. Set Up the Database

1. Create a new project on [Supabase](https://supabase.com)
2. Go to **SQL Editor** and run the following files in order:
   ```
   database/schema.sql
   database/seed_states.sql
   ```
3. Note your database credentials from **Settings > Database**

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Fill in your Supabase credentials in `.env`:

```env
DB_HOST=db.<your-project-id>.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<your-database-password>
JWT_SECRET=<a-random-string-at-least-32-chars>
PORT=5000
NODE_ENV=development
```

### 4. Load FEMA Data (ETL Pipeline)

```bash
cd etl
pip install -r requirements.txt
python load_fema_data.py
```

This downloads ~65,000 disaster records from the [FEMA API](https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries.csv), cleans and normalizes the data, and loads it into the database. Takes about 2-3 minutes.

### 5. Start the Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs at **http://localhost:5000**. Verify with: `http://localhost:5000/api/health`

### 6. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

### Default Test Account

Register a new account through the UI, or use the API:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@test.com","password":"password123"}'
```

To grant admin access, run in SQL Editor:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@test.com';
```

## API Reference

### Disasters

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/disasters` | - | List with pagination, sorting, and filtering |
| `GET` | `/api/disasters/:id` | - | Single disaster with all affected areas |
| `POST` | `/api/disasters` | Editor+ | Create new disaster record |
| `PUT` | `/api/disasters/:id` | Editor+ | Update existing disaster |
| `DELETE` | `/api/disasters/:id` | Admin | Soft-delete disaster record |

**Query Parameters** for `GET /api/disasters`:
- `page` (default: 1), `limit` (default: 25)
- `sort` - `declaration_date`, `disaster_number`, `declaration_title`
- `order` - `asc`, `desc`
- `incident_type`, `state`, `declaration_type` - filter values
- `start_date`, `end_date` - date range filter
- `search` - text search on declaration title

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/summary` | Total disasters, types, states, date range |
| `GET` | `/api/analytics/by-type` | Disaster count by incident type (pie chart) |
| `GET` | `/api/analytics/by-state` | Disaster count by state (heat map) |
| `GET` | `/api/analytics/by-year` | Yearly disaster count (line chart) |
| `GET` | `/api/analytics/by-month` | Monthly distribution (seasonal pattern) |
| `GET` | `/api/analytics/programs` | Federal assistance program statistics |
| `GET` | `/api/analytics/by-decade` | Decade grouping |
| `GET` | `/api/analytics/top-states` | Top N states with most common type |

### Auth & Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account (returns JWT) |
| `POST` | `/api/auth/login` | Login (returns JWT) |
| `GET` | `/api/auth/me` | Get current user profile |
| `POST` | `/api/reports` | Submit incident report |
| `GET` | `/api/reports` | List reports (own or all for admin) |
| `PUT` | `/api/reports/:id/status` | Update report status (admin) |
| `DELETE` | `/api/reports/:id` | Delete report |
| `GET` | `/api/export/csv` | Export filtered data as CSV |

### Lookups

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/lookup/incident-types` | All incident types with categories |
| `GET` | `/api/lookup/states` | All states and territories |
| `GET` | `/api/lookup/declaration-types` | Declaration types (DR, EM, FM) |

## Sample SQL Queries

**Disasters by Type (Pie Chart):**
```sql
SELECT it.incident_type_name, COUNT(*) as total
FROM disasters d
JOIN incident_types it ON d.incident_type_id = it.incident_type_id
WHERE d.is_deleted = false
GROUP BY it.incident_type_name
ORDER BY total DESC LIMIT 10;
```

**State Heat Map Data:**
```sql
SELECT s.state_abbrev, s.state_name, COUNT(DISTINCT da.disaster_number) as disaster_count
FROM disaster_areas da
JOIN states s ON da.state_code = s.state_code
GROUP BY s.state_abbrev, s.state_name
ORDER BY disaster_count DESC;
```

**Yearly Trend:**
```sql
SELECT EXTRACT(YEAR FROM declaration_date) as year, COUNT(*) as total
FROM disasters WHERE is_deleted = false
GROUP BY year ORDER BY year;
```

## User Roles

| Role | Permissions |
|------|------------|
| **Viewer** | Browse disasters, view dashboard, search, export CSV |
| **Editor** | All viewer permissions + create and update disasters |
| **Admin** | All editor permissions + delete disasters, manage report statuses |

## Data Source

- **Dataset:** [FEMA Disaster Declarations Summaries v2](https://www.fema.gov/openfema-data-page/disaster-declarations-summaries-v2)
- **Records:** 65,000+ rows spanning 1953 to present
- **License:** U.S. Public Domain (17 U.S.C. 105)
- **API:** `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries.csv`

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | Auto-deploys from `main` branch |
| Backend | Render | Node.js web service |
| Database | Supabase | Hosted PostgreSQL (free tier) |


