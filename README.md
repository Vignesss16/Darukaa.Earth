# Darukaa.Earth — Carbon & Biodiversity Ops Console

> **Full-Stack Geospatial Analytics Platform for Carbon Credit & Biodiversity Project Operations**  
> Designed & Built for the **Darukaa.Earth Full-Stack Developer Hackathon Challenge**.

---

## 🌟 Executive Overview

**Darukaa.Earth** is an enterprise-grade, high-density geospatial analytics and management console for carbon offset and biodiversity conservation projects. Built with **React 18**, **Mapbox GL JS v3**, **Highcharts**, **FastAPI**, and **PostgreSQL with PostGIS extensions**, it enables asset managers, field analysts, and auditors to map land boundaries, track real-time canopy density, monitor telemetry metrics over time, and detect vegetation degradation.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client["React 18 Single Page App<br/>(Mapbox GL JS, Highcharts, Lucide)"]
    
    subgraph "FastAPI Application Backend"
        Auth["JWT Authentication & RBAC Router<br/>(/api/auth)"]
        Projects["Project & Site Management Router<br/>(/api/projects, /api/sites)"]
        Spatial["Geospatial Spatial Engine<br/>(PostGIS ST_Area, ST_AsGeoJSON)"]
        Telemetry["Telemetry & Alerts Engine<br/>(/api/metrics, /api/alerts)"]
    end
    
    subgraph "Database & Storage Layer"
        PostgreSQL[("PostgreSQL 16 + PostGIS 3.4<br/>(Spatial Geometries EPSG:4326)")]
    end
    
    Client -->|REST API + Bearer Token| Auth
    Client -->|GeoJSON Boundaries| Projects
    Projects --> Spatial
    Spatial -->|ST_GeomFromGeoJSON| PostgreSQL
    Telemetry -->|Time-series metrics| PostgreSQL
```

### Technology Stack
- **Frontend Framework**: React 18, TypeScript, Vite, Vanilla CSS with CSS Custom Properties (Stitch Design System).
- **Mapping & GIS Engine**: Mapbox GL JS v3 (Satellite Streets, Vector Light & Outdoors tilesets), `@mapbox/mapbox-gl-draw`.
- **Data Visualization**: Highcharts & Highcharts React (Telemetry & canopy density timeline charts).
- **Backend API**: Python 3.11, FastAPI, SQLAlchemy 2.0 (Async ORM), GeoAlchemy2, Pydantic v2.
- **Database**: PostgreSQL 16 with PostGIS 3.4 spatial extensions (`geometry(Polygon, 4326)`).
- **Authentication**: OAuth2 Password Flow with JWT Bearer Tokens & Role-Based Access Control (Admin, Analyst, Viewer).
- **CI/CD & DevEx**: GitHub Actions, Husky pre-commit hooks, `lint-staged`, ESLint, Prettier, Black, Ruff.

---

## 🗄️ Database Schema & Models

```mermaid
erDiagram
    USERS {
        int id PK
        string email UK
        string hashed_password
        string full_name
        string role "admin | analyst | viewer"
        datetime created_at
    }

    PROJECTS {
        int id PK
        string name
        string description
        string status "active | archived | pending"
        int created_by_id FK
        datetime created_at
    }

    SITES {
        int id PK
        int project_id FK
        string name
        string site_type "carbon | biodiversity | mixed"
        geometry polygon_geometry "Geometry(Polygon, 4326)"
        float area_hectares
        datetime created_at
    }

    SITE_METRICS {
        int id PK
        int site_id FK
        date record_date
        float canopy_cover_pct
        float estimated_carbon_tonnes
        float ndvi_index
        float degradation_risk_pct
    }

    DEGRADATION_ALERTS {
        int id PK
        int site_id FK
        string severity "critical | warning | info"
        string message
        float drop_percentage
        datetime created_at
    }

    USERS ||--o{ PROJECTS : "creates"
    PROJECTS ||--o{ SITES : "contains"
    SITES ||--o{ SITE_METRICS : "tracks telemetry"
    SITES ||--o{ DEGRADATION_ALERTS : "triggers alerts"
```

---

## ⚡ Quick Start & Local Setup

### Option 1: One-Command Setup with Docker Compose (Recommended)

Make sure Docker and Docker Compose are installed:

```bash
# Clone the repository
git clone https://github.com/Vignesss16/Darukaa.Earth.git
cd Darukaa.Earth

# Start PostgreSQL/PostGIS database, FastAPI backend, and React frontend
docker-compose up --build
```

The application will be accessible at:
- **Frontend Dashboard**: `http://localhost:5173`
- **FastAPI OpenAPI Documentation**: `http://localhost:8000/docs`

---

### Option 2: Manual Development Setup

#### 1. Backend Setup (FastAPI + PostgreSQL PostGIS)

```bash
cd backend

# Create and activate Python virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Create .env configuration file
cp .env.example .env

# Run database migrations / initialization & start dev server
python -m app.main
# Or run with uvicorn:
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup (React 18 + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Create environment file with Mapbox token (optional fallback provided)
echo "VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token_here" > .env

# Start Vite development server
npm run dev
```

---

## 📊 Telemetry Metrics, CSV Ingestion & INPE Brazilian Amazon Dataset

### 1. Extended Telemetry Metrics Schema
The PostgreSQL native `metrictype` enum and SQLAlchemy models support 6 telemetry metric types:
- `ndvi`: Normalized Difference Vegetation Index (0.0 to 1.0)
- `canopy_cover`: Percentage tree canopy cover (0% to 100%)
- `carbon_tons`: Estimated carbon biomass stock (metric tonnes CO₂e)
- `biodiversity_index`: Ecological species diversity index (0.0 to 1.0)
- `deforestation_area_km2`: Annual tree loss area in square kilometers
- `fire_incidents`: Thermal anomaly and wildfire count

All metric migrations are handled safely via Alembic migration `002_add_metric_types.py` with zero data loss to existing sites and records.

### 2. Generic CSV Import Feature (UI)
Admins and Analysts can import arbitrary historical or sensor time-series data for any site:
1. Open any conservation site and navigate to the **Analytics** tab.
2. Click **Import CSV** next to the telemetry action buttons.
3. Upload any `.csv` file. The parser dynamically reads headers and displays a flexible column mapping interface:
   - **Metric Type**: Map from a CSV column (e.g. `metric_type`) or select a fixed type for all rows (e.g., `deforestation_area_km2` or `fire_incidents`).
   - **Recorded Date**: Maps ISO dates, `YYYY-MM-DD`, `YYYY/MM/DD`, or bare `YYYY` years.
   - **Metric Value**: Numeric parser supporting both comma and dot decimal separators.
   - **Source**: Optional telemetry source tag.
4. **Validation & Preview**: The modal validates every row, highlights invalid rows with line numbers, displays a 5-row preview table, and bulk-inserts validated rows via `POST /api/v1/sites/{site_id}/metrics/bulk`.

### 3. Kaggle INPE Brazilian Amazon Dataset Integration
The platform includes an automated ingestion pipeline for the official Brazilian National Institute for Space Research (INPE) Amazon deforestation and fire incident dataset:
- **Project**: Automatically creates/attaches to `Brazilian Legal Amazon (INPE dataset)`.
- **9 State Sites**: Acre (AC), Amazonas (AM), Amapá (AP), Maranhão (MA), Mato Grosso (MT), Pará (PA), Rondônia (RO), Roraima (RR), and Tocantins (TO). Each site features a ~1-degree bounding box centered on the state's geographic coordinates.
- **Data Files**:
  - `def_area_2004_2019.csv` (PRODES annual deforestation area in km²)
  - `inpe_brazilian_amazon_fires_1999_2019.csv` (BDQueimadas annual wildfire incident counts)

#### Running the Ingestion Script:
1. Place the CSV files into `backend/data/kaggle/`:
   ```bash
   backend/data/kaggle/def_area_2004_2019.csv
   backend/data/kaggle/inpe_brazilian_amazon_fires_1999_2019.csv
   ```
2. Run the automated ingestion script:
   ```bash
   # Via Docker:
   docker exec -it darukaa_backend python scripts/import_kaggle_data.py

   # Or locally:
   cd backend && python scripts/import_kaggle_data.py
   ```
3. The script will automatically create the project and 9 state polygons, parse both datasets, and bulk-insert the time-series metrics.

---

## 🔑 Pre-seeded Demo Credentials

The backend automatically seeds demo accounts on initial startup:

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@darukaa.earth` | `Admin123!` | Create/delete projects & sites, draw boundaries, seed telemetry data |
| **Analyst** | `analyst@darukaa.earth` | `Analyst123!` | Draw sites, view analytics, inspect alerts, export PDF reports |
| **Viewer** | `viewer@darukaa.earth` | `Viewer123!` | Read-only inspection of projects, sites, and telemetry charts |

---

## 🚀 CI/CD Pipeline & Code Quality Controls

### Automated GitHub Actions Workflow (`.github/workflows/ci.yml`)

The repository includes an automated CI/CD pipeline triggered on every `push` and `pull_request` to `main`:
1. **Frontend Pipeline**: Runs TypeScript check (`tsc`), ESLint checks, and builds production bundles (`vite build`).
2. **Backend Pipeline**: Installs Python dependencies, executes `ruff` & `black` code quality checks, and executes `pytest` suite.

### Local Pre-Commit Hooks (Husky + lint-staged)

To ensure code stability and maintain strict style compliance before every commit:
- **Husky** intercepts `git commit`.
- **lint-staged** automatically runs `prettier --write` and `eslint --fix` on modified React components, and `black` / `ruff` on Python scripts.

---

## 🤝 Reviewer Repository Access

Access invitations have been granted to the Darukaa hiring team GitHub accounts:
- `ankita.dasgupta@darukaa.com`
- `harsh.kumar@darukaa.com`
- `utkarsh.gauniyal@darukaa.com`
- `guneet.mutreja@darukaa.com`
