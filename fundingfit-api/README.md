# FundingFit API

A FastAPI backend that matches UK small businesses to relevant funding schemes using the Anthropic Claude API. Built for a hackathon — the Companies House and HMRC integrations are mocked, but the matching and summarisation logic uses real AI.

---

## What it does

A user enters their Companies House ID. The API pulls their business profile (sector, trading status, location, revenue, headcount) from mock CH + HMRC data, creates a session, and then:

- **Matches** them against a pre-scraped database of grant schemes, scoring each one as `strong_match`, `possible`, or `not_suitable` based on eligibility criteria and their stated goals
- **Explains** any individual grant in plain English, personalised to their specific business
- **Plans** their applications by identifying shared documents across multiple schemes and what's unique to each one
- **Remembers** returning users and surfaces their last match results

---

## Tech stack

- **Python 3.12** with [uv](https://docs.astral.sh/uv/) for package management
- **FastAPI** — async REST API
- **SQLite** (stdlib `sqlite3`) — no ORM, sessions and history stored as JSON
- **Anthropic Claude** (`claude-sonnet-4-0`) — matching, summarisation, and planning
- **Pydantic v2** — request/response validation

---

## Project structure

```
fundingfit-api/
│
├── main.py                      # App entry point — registers routers, runs DB init on startup
├── database.py                  # All SQLite logic (no ORM)
├── pyproject.toml               # Dependencies managed by uv
│
├── data/
│   ├── schemes.json             # Pre-scraped grant schemes (the matching database)
│   └── mock_companies.json      # Mock Companies House + HMRC data for 5 demo businesses
│
├── models/
│   ├── business.py              # BusinessProfile, BusinessProfileUpdate
│   └── scheme.py                # SchemeResult, SchemeDetail, SchemeSummary, PlanItem, PlanResponse
│
├── routers/
│   ├── identify.py              # POST /api/identify
│   ├── business.py              # GET /PATCH /api/business/me
│   ├── schemes.py               # GET /api/schemes, GET /api/schemes/{id}
│   ├── match.py                 # POST /api/match
│   ├── plan.py                  # POST /api/plan
│   └── history.py               # GET /api/history, GET /api/history/{id}
│
└── services/
    ├── claude_service.py        # All Anthropic API calls
    ├── identity_service.py      # X-Session-ID header dependency (FastAPI Depends)
    ├── schemes_service.py       # Loads and filters schemes.json by region
    └── companies_house_service.py  # Loads mock_companies.json
```

---

## Setup

**1. Install dependencies**

```bash
uv sync
```

**2. Add your Anthropic API key**

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

**3. Run the server**

```bash
uv run uvicorn main:app --reload
```

The API is now running at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive Swagger UI.

---

## Database

SQLite is used with no ORM. The database file (`fundingfit.db`) is created automatically on first startup. There are two tables:

**`sessions`** — one row per company
| Column | Type | Notes |
|---|---|---|
| `companies_house_id` | TEXT (PK) | Also used as the session token |
| `profile_data` | TEXT | Full `BusinessProfile` stored as JSON |
| `first_seen` | TIMESTAMP | When this company first identified |
| `last_seen` | TIMESTAMP | Updated on every identify call |

**`interaction_history`** — one row per match or plan run
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER (PK) | Auto-incremented |
| `companies_house_id` | TEXT | Which session this belongs to |
| `action` | TEXT | `"match"` or `"plan"` |
| `input_data` | TEXT | Request payload as JSON |
| `output_data` | TEXT | Claude's full response as JSON |
| `created_at` | TIMESTAMP | |

---

## Authentication

There are no passwords or JWT tokens. Authentication is header-based using the Companies House ID as the session key.

After calling `POST /api/identify`, include the returned `session_id` on all subsequent requests:

```
X-Session-ID: 12345678
```

Endpoints marked **required** return `422` if the header is missing and `401` if the ID has no session. Endpoints marked **optional** work without the header but may return personalised results when it is present.

---

## API reference

### `POST /api/identify`
**No auth required**

Starts or resumes a session. Looks up the Companies House ID in the mock data, upserts a session row, and returns the business profile.

```json
// Request
{ "companies_house_id": "12345678" }

// Response
{
  "session_id": "12345678",
  "is_returning": false,
  "last_match": null,
  "profile": {
    "business_name": "Northlight Studio",
    "trading_status": "sole_trader",
    "sector": "Creative services",
    "postcode": "LS1 4AP",
    "employee_count": 1,
    "annual_revenue": 28400.0,
    "goals": []
  }
}
```

On a returning visit, `is_returning` is `true` and `last_match` contains a summary of their most recent match run:

```json
"last_match": {
  "total": 6,
  "strong_match": 3,
  "possible": 1,
  "not_suitable": 2
}
```

**Available demo company IDs:** `12345678`, `OC987654`, `LP556677`, `SC112233`, `AB334455`

---

### `GET /api/business/me`
**Auth required**

Returns the stored business profile for the current session.

---

### `PATCH /api/business/me`
**Auth required**

Updates manually-provided fields. Goals should be set here after registration — they are used by the matching engine to personalise results.

```json
// Request (all fields optional)
{
  "goals": ["buy equipment", "hire first employee"],
  "employee_count": 3,
  "annual_revenue": 45000
}
```

---

### `GET /api/schemes`
**No auth required**

Returns a lightweight list of all grant schemes in the database. No Claude call.

```json
[
  {
    "scheme_id": "adventure-grant",
    "name": "AD:VENTURE Grant",
    "funder": "West Yorkshire Combined Authority",
    "region": "west_yorkshire",
    "amount_display": "Up to £5,000",
    "effort_hours": 2,
    "source_url": "https://ad-venture.org.uk"
  }
]
```

---

### `GET /api/schemes/{scheme_id}`
**Auth optional**

Returns full scheme detail including eligibility rules and a Claude-generated plain English summary. If an `X-Session-ID` header is present, the summary is personalised to that business.

```json
{
  "scheme_id": "adventure-grant",
  "name": "AD:VENTURE Grant",
  "eligibility": {
    "max_trading_years": 3,
    "required_regions": ["west_yorkshire"]
  },
  "plain_english_summary": "This grant is for early-stage creative businesses in West Yorkshire trading for less than three years. The most important thing to know is that you must be based in the West Yorkshire region and the funds can cover equipment, marketing, or other growth costs.",
  "max_amount": 5000,
  "effort_hours": 2,
  "source_url": "https://ad-venture.org.uk"
}
```

---

### `POST /api/match`
**Auth required** (or append `?mock=true` for a hardcoded response without an API key)

Filters schemes by the business's postcode region, then calls Claude to score each one against the profile and goals. Results are sorted strong matches first, then local before national at equal fit level.

```json
// Response — array of SchemeResult
[
  {
    "scheme_id": "adventure-grant",
    "name": "AD:VENTURE Grant",
    "fit": "strong_match",
    "fit_reason": "Trading under 3 years in West Yorkshire in an eligible creative sector, and the goal of buying equipment aligns directly with what this grant funds.",
    "eligibility_met": ["Based in West Yorkshire", "Trading under 3 years", "Eligible sector"],
    "eligibility_unmet": [],
    "plain_english_summary": "...",
    "amount_display": "Up to £5,000",
    "effort_hours": 2
  }
]
```

The result is saved to `interaction_history`.

---

### `POST /api/plan`
**Auth required** (or append `?mock=true`)

Takes a list of scheme IDs the user wants to apply for and returns a consolidated action plan. Claude identifies which documents are needed across multiple schemes (so the user only gathers them once) and what is specific to each.

```json
// Request
{ "scheme_ids": ["adventure-grant", "startup-loan"] }

// Response
{
  "shared_requirements": [
    "Last 6 months bank statements",
    "A short description of your business (150 words)"
  ],
  "schemes": [
    {
      "scheme_id": "adventure-grant",
      "name": "AD:VENTURE Grant",
      "scheme_specific_requirements": [
        "Evidence of West Yorkshire location (e.g. utility bill or lease)",
        "Description of how the grant funds will be used"
      ]
    }
  ]
}
```

The result is saved to `interaction_history`.

---

### `GET /api/history`
**Auth required**

Returns all past interactions for the current session, newest first. Each entry includes a summary (for match: counts of strong/possible/not_suitable; for plan: number of schemes).

---

### `GET /api/history/{interaction_id}`
**Auth required**

Returns the full input and output of a single past interaction.

---

## Adding more grant schemes

Edit `data/schemes.json`. Each scheme needs:

```json
{
  "id": "unique-kebab-case-id",
  "name": "Human Readable Name",
  "funder": "Organisation Name",
  "region": "national | leeds | west_yorkshire",
  "amount_display": "Up to £10,000",
  "max_amount": 10000,
  "effort_hours": 3,
  "source_url": "https://...",
  "last_synced": "2025-01-01",
  "eligibility": {
    "max_trading_years": 5,
    "min_trading_years": 0,
    "max_employees": 50,
    "required_regions": ["national"],
    "eligible_sectors": [],
    "excluded_sectors": [],
    "required_trading_status": [],
    "notes": "Any other eligibility details Claude should know about"
  }
}
```

Claude reads the `eligibility` object directly when scoring fit — the more detail in `notes`, the better the matching quality.

---

## Adding more demo companies

Edit `data/mock_companies.json`. The key is the Companies House ID:

```json
"99887766": {
  "business_name": "Example Ltd",
  "trading_status": "limited_company",
  "registration_date": "2021-06-01",
  "sector": "Technology",
  "postcode": "LS1 1AA",
  "employee_count": 5,
  "annual_revenue": 120000.0,
  "goals": [],
  "data_sources": ["Companies House", "HMRC"],
  "companies_house_id": "99887766"
}
```

Postcodes determine which regional schemes appear in matching:
- `LS` → Leeds + West Yorkshire + national
- `BD`, `HX`, `HD`, `WF` → West Yorkshire + national
- Anything else → national only
