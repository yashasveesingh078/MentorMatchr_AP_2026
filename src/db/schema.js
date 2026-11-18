// =============================================================================
// MentorMatchr: Relational SQLite Schema
// Directly mirrors the 15 BCNF tables in dbms/03_schema.sql
// =============================================================================

export function initSchema(db) {
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    -- 1. MASTER TABLES
    CREATE TABLE IF NOT EXISTS department (
        department_id    INTEGER PRIMARY KEY AUTOINCREMENT,
        department_code  TEXT NOT NULL UNIQUE,
        department_name  TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS domain (
        domain_id    INTEGER PRIMARY KEY AUTOINCREMENT,
        domain_name  TEXT NOT NULL UNIQUE,
        description  TEXT
    );

    CREATE TABLE IF NOT EXISTS keyword (
        keyword_id    INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword_name  TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS expertise_area (
        expertise_id    INTEGER PRIMARY KEY AUTOINCREMENT,
        expertise_name  TEXT NOT NULL UNIQUE
    );

    -- 2. FACULTY & FACULTY PROFILE TABLES
    CREATE TABLE IF NOT EXISTS faculty (
        faculty_id     INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_code  TEXT NOT NULL UNIQUE,
        full_name      TEXT NOT NULL,
        email          TEXT NOT NULL UNIQUE,
        phone          TEXT,
        designation    TEXT NOT NULL CHECK (designation IN ('Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer')),
        department_id  INTEGER NOT NULL REFERENCES department (department_id) ON DELETE RESTRICT,
        max_teams      INTEGER NOT NULL DEFAULT 3 CHECK (max_teams BETWEEN 1 AND 10),
        is_available   INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS faculty_expertise (
        faculty_id           INTEGER NOT NULL REFERENCES faculty (faculty_id) ON DELETE CASCADE,
        expertise_id         INTEGER NOT NULL REFERENCES expertise_area (expertise_id) ON DELETE RESTRICT,
        years_of_experience  INTEGER NOT NULL DEFAULT 0 CHECK (years_of_experience BETWEEN 0 AND 60),
        PRIMARY KEY (faculty_id, expertise_id)
    );

    CREATE TABLE IF NOT EXISTS faculty_domain (
        faculty_id  INTEGER NOT NULL REFERENCES faculty (faculty_id) ON DELETE CASCADE,
        domain_id   INTEGER NOT NULL REFERENCES domain (domain_id) ON DELETE RESTRICT,
        is_primary  INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
        PRIMARY KEY (faculty_id, domain_id)
    );

    -- Business Rule R8: At most ONE primary domain per faculty
    CREATE UNIQUE INDEX IF NOT EXISTS uq_faculty_one_primary_domain
        ON faculty_domain (faculty_id)
        WHERE is_primary = 1;

    CREATE TABLE IF NOT EXISTS faculty_keyword (
        faculty_id  INTEGER NOT NULL REFERENCES faculty (faculty_id) ON DELETE CASCADE,
        keyword_id  INTEGER NOT NULL REFERENCES keyword (keyword_id) ON DELETE RESTRICT,
        PRIMARY KEY (faculty_id, keyword_id)
    );

    -- 3. HACKATHON, COORDINATOR AND PROBLEM STATEMENT TABLES
    CREATE TABLE IF NOT EXISTS hackathon (
        hackathon_id    INTEGER PRIMARY KEY AUTOINCREMENT,
        hackathon_name  TEXT NOT NULL,
        edition_year    INTEGER NOT NULL CHECK (edition_year BETWEEN 2000 AND 2100),
        start_date      TEXT NOT NULL,
        end_date        TEXT NOT NULL,
        venue           TEXT,
        CONSTRAINT uq_hackathon_name_year UNIQUE (hackathon_name, edition_year),
        CONSTRAINT chk_hackathon_dates CHECK (end_date >= start_date)
    );

    CREATE TABLE IF NOT EXISTS coordinator (
        coordinator_id  INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name       TEXT NOT NULL,
        email           TEXT NOT NULL UNIQUE,
        phone           TEXT
    );

    CREATE TABLE IF NOT EXISTS problem_statement (
        problem_id    INTEGER PRIMARY KEY AUTOINCREMENT,
        hackathon_id  INTEGER NOT NULL REFERENCES hackathon (hackathon_id) ON DELETE CASCADE,
        ps_code       TEXT NOT NULL,
        title         TEXT NOT NULL,
        description   TEXT NOT NULL,
        domain_id     INTEGER NOT NULL REFERENCES domain (domain_id) ON DELETE RESTRICT,
        difficulty    TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
        CONSTRAINT uq_ps_code_per_hackathon UNIQUE (hackathon_id, ps_code)
    );

    CREATE TABLE IF NOT EXISTS problem_keyword (
        problem_id  INTEGER NOT NULL REFERENCES problem_statement (problem_id) ON DELETE CASCADE,
        keyword_id  INTEGER NOT NULL REFERENCES keyword (keyword_id) ON DELETE RESTRICT,
        PRIMARY KEY (problem_id, keyword_id)
    );

    -- 4. TEAM AND MENTOR ASSIGNMENT TABLES
    CREATE TABLE IF NOT EXISTS team (
        team_id        INTEGER PRIMARY KEY AUTOINCREMENT,
        hackathon_id   INTEGER NOT NULL REFERENCES hackathon (hackathon_id) ON DELETE CASCADE,
        team_name      TEXT NOT NULL,
        team_size      INTEGER NOT NULL CHECK (team_size BETWEEN 1 AND 6),
        contact_email  TEXT NOT NULL,
        registered_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_team_name_per_hackathon UNIQUE (hackathon_id, team_name)
    );

    -- Separate team_problem_selection to maintain BCNF (Section 6.3 in 01_normalization.md)
    CREATE TABLE IF NOT EXISTS team_problem_selection (
        team_id      INTEGER PRIMARY KEY REFERENCES team (team_id) ON DELETE CASCADE,
        problem_id   INTEGER NOT NULL REFERENCES problem_statement (problem_id) ON DELETE NO ACTION,
        selected_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentor_assignment (
        assignment_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id         INTEGER NOT NULL REFERENCES team (team_id) ON DELETE CASCADE,
        faculty_id      INTEGER NOT NULL REFERENCES faculty (faculty_id) ON DELETE RESTRICT,
        assigned_by     INTEGER NOT NULL REFERENCES coordinator (coordinator_id) ON DELETE RESTRICT,
        assigned_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        match_score     REAL CHECK (match_score BETWEEN 0 AND 100),
        status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REPLACED', 'WITHDRAWN')),
        CONSTRAINT uq_assignment_team_faculty UNIQUE (team_id, faculty_id)
    );

    -- Business Rule R9: At most ONE active mentor per team
    CREATE UNIQUE INDEX IF NOT EXISTS uq_team_one_active_mentor
        ON mentor_assignment (team_id)
        WHERE status = 'ACTIVE';

    -- 5. MENTORSHIP REVIEW & GUIDANCE REQUESTS (Student <-> Faculty Interaction)
    CREATE TABLE IF NOT EXISTS mentorship_request (
        request_id    INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id       INTEGER NOT NULL REFERENCES team (team_id) ON DELETE CASCADE,
        faculty_id    INTEGER NOT NULL REFERENCES faculty (faculty_id) ON DELETE CASCADE,
        milestone_title TEXT NOT NULL,
        description   TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
        mentor_notes  TEXT,
        created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. SUPPORTING INDEXES
    CREATE INDEX IF NOT EXISTS idx_faculty_department ON faculty (department_id);
    CREATE INDEX IF NOT EXISTS idx_faculty_expertise_exp ON faculty_expertise (expertise_id);
    CREATE INDEX IF NOT EXISTS idx_faculty_domain_domain ON faculty_domain (domain_id);
    CREATE INDEX IF NOT EXISTS idx_faculty_keyword_kw ON faculty_keyword (keyword_id);
    CREATE INDEX IF NOT EXISTS idx_problem_domain ON problem_statement (domain_id);
    CREATE INDEX IF NOT EXISTS idx_problem_keyword_kw ON problem_keyword (keyword_id);
    CREATE INDEX IF NOT EXISTS idx_selection_problem ON team_problem_selection (problem_id);
    CREATE INDEX IF NOT EXISTS idx_assignment_faculty ON mentor_assignment (faculty_id);
    CREATE INDEX IF NOT EXISTS idx_assignment_coordinator ON mentor_assignment (assigned_by);
  `);
}
