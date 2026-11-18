# MentorMatchr (AP 2026) – Hackathon Mentor Allocation Portal

> **Smarter Hackathons. Better Mentorship.**  
> A centralized, database-driven platform for allocating faculty mentors to hackathon teams using explainable domain and technical keyword matching.

---

## 1. Overview & Alignment with DBMS Architecture

In hackathons, teams select diverse problem statements across AI & ML, Healthcare Tech, Cybersecurity, FinTech, IoT, and Web Systems. **MentorMatchr** replaces manual spreadsheet matching with an airtight relational database architecture:

* **Boyce-Codd Normal Form (BCNF):** All 15 relational tables in [`dbms/03_schema.sql`](dbms/03_schema.sql) strictly eliminate insertion, update, and deletion anomalies.
* **Controlled Taxonomy:** Master tables for departments, domains, expertise areas, and keywords eliminate vocabulary drift and typos.
* **Relational Explainability:** 100% transparent matching formula combining domain affinity (60%) and keyword tag intersection (40%).
* **Workload & Integrity Guards:** Enforces single active mentor per team via partial unique indexes and guarantees faculty never exceed their configured maximum team capacity (`max_teams`).

---

## 2. Design System & Aesthetics (Reference Match)

The frontend interface is crafted with a royal, minimal, and sophisticated academic aesthetic strictly matching the uploaded design reference:

* **Background Canvas:** Warm Ivory / Linen (`#FAF8F5`).
* **Typography:** Clean geometric modern sans (`Plus Jakarta Sans`) paired with high-end editorial italic serif (`Newsreader`) for accents like *"The Right Mentor for Every Idea."*
* **Cards & Surfaces:** Crisp white (`#FFFFFF`) with delicate hairline borders (`#EBE6DE`) and diffused ambient shadows.
* **Badges & Accents:**
  * **Primary Domain:** Obsidian dark badge (`#171615`) with crisp white typography.
  * **Top Match Badge:** Organic sage green pill (`#E6ECE5` background with `#344837` forest text).
  * **Tags & Keywords:** Soft warm pills with `#` prefix (e.g., `#PyTorch`, `#Transformers`, `#DICOM`).

---

## 3. Features Implemented

### 1. Live Match Simulator (Hero Replica)
* Directly replicates the live match card from the reference image.
* Allows switching between real hackathon teams (`CareSync AI`, `SecureLedger`, `AgriSense IoT`).
* Displays problem statement code (e.g. `#PS-04`), title, and technical tags.
* Displays **Dr. Arun Sharma** as the **TOP MATCH** (86.7% compatibility, `0/2 Available`, `✓ Direct Primary Domain Match + 4 Overlapping Tags`) with 1-click **Assign Mentor** action.
* Displays secondary matches (e.g. **Dr. Sanjay Bhattacharya**, 73.3%, `Load: 0/2`).

### 2. Interactive Keyword & Domain Matching Workspace
* **Keyword Filter:** Type custom keywords (e.g., `PyTorch`, `React`, `DICOM`, `Solidity`) or toggle preset chips.
* **Domain & Expertise Filter:** Dropdown selection for technical domains and specialized expertise areas.
* **Experience & Availability:** Minimum experience slider and capacity filter (`Available Only`).
* **Real-Time Faculty Grid:** Displays faculty cards with highlighted matching tags, domain badges, experience years, and live workload indicators (`X/Y Teams`).

### 3. Team & Mentor Allocations Dashboard
* Table of all registered teams with their selected problem statement, difficulty, and assigned mentor.
* Action button to assign or replace mentors with conflict resolution.
* Audit trail of recent allocations tracking timestamps, coordinators, match scores, and status history (`ACTIVE`, `REPLACED`, `WITHDRAWN`).

### 4. Authentication & Role Switcher
* Sign In modal supporting **Coordinator** and **Faculty Member** roles.
* 1-Click demo logins for **Priya Nair** (Head Coordinator), **Dr. Arun Sharma** (Faculty Top Match), and **Dr. Sanjay Bhattacharya**.
* Navigation bar profile badge reflecting the currently signed-in user.

---

## 4. Running the Application

### Quick Start (Zero External Dependencies)
MentorMatchr runs out of the box on Node.js using native ES Modules and built-in SQLite:

```bash
# 1. Start the portal
npm start
# or
node server.js
```

Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

### Running with PostgreSQL (DBMS Layer)
If you wish to run the raw PostgreSQL schema and test queries directly:

```bash
# 1. Create database and load the 15 BCNF tables
psql -d mentormatchr -f dbms/03_schema.sql

# 2. Populate realistic seed data
psql -d mentormatchr -f dbms/05_seed_data.sql

# 3. Run the comprehensive query suite
psql -d mentormatchr -f dbms/04_queries.sql
```

---

## 5. File Structure

```
MentorMatchr_AP_2026/
├── dbms/
│   ├── 01_normalization.md       # Full BCNF normalization documentation
│   ├── 02_er_diagram.mmd         # Mermaid ER diagram source
│   ├── 02_er_diagram.png         # Visual ER diagram graphic
│   ├── 03_schema.sql             # PostgreSQL DDL (15 BCNF tables + triggers)
│   ├── 04_queries.sql            # 36 SQL queries (retrieval, joins, matching)
│   └── 05_seed_data.sql          # PostgreSQL seed script
├── src/
│   ├── db/
│   │   ├── schema.js             # Relational SQLite schema mirroring schema.sql
│   │   ├── seed.js               # Initial database seeder
│   │   └── database.js           # Database adapter using Node.js DatabaseSync
│   ├── api/
│   │   ├── matchingEngine.js     # Explainable 60/40 Domain & Keyword matcher
│   │   └── routes.js             # REST API endpoints
│   └── public/
│       ├── index.html            # Semantic HTML with editorial typography
│       ├── css/
│       │   └── style.css         # Royal minimal palette (Ivory, Obsidian, Sage)
│       └── js/
│           ├── auth.js           # Authentication & session switcher
│           ├── simulator.js      # Live Match Simulator component
│           ├── filter.js         # Keyword, domain & expertise workspace
│           └── app.js            # Main coordinator & team management
├── server.js                     # High-performance zero-dependency web server
├── package.json
└── README.md
```
