-- =============================================================================
-- MentorMatchr: Database Schema
-- -----------------------------------------------------------------------------
-- Database   : PostgreSQL 15 or newer
-- Purpose    : Stores faculty, their expertise/domains/keywords, hackathons,
--              problem statements (with domain and keywords), teams, and
--              mentor assignments, so that mentors can be matched to teams.
-- Tables     : 15
-- Normal form: Every table is designed to be in BCNF (see 01_normalization.md).
--
-- Run:  psql -d mentormatchr -f dbms/schema.sql
-- =============================================================================

BEGIN;

-- Drop in reverse dependency order so the script can be re-run safely.
DROP TABLE IF EXISTS mentor_assignment       CASCADE;
DROP TABLE IF EXISTS team_problem_selection  CASCADE;
DROP TABLE IF EXISTS team                    CASCADE;
DROP FUNCTION IF EXISTS trg_selection_same_hackathon() CASCADE;
DROP FUNCTION IF EXISTS trg_hackathon_id_immutable()   CASCADE;
DROP TABLE IF EXISTS problem_keyword    CASCADE;
DROP TABLE IF EXISTS problem_statement  CASCADE;
DROP TABLE IF EXISTS coordinator        CASCADE;
DROP TABLE IF EXISTS hackathon          CASCADE;
DROP TABLE IF EXISTS faculty_keyword    CASCADE;
DROP TABLE IF EXISTS faculty_domain     CASCADE;
DROP TABLE IF EXISTS faculty_expertise  CASCADE;
DROP TABLE IF EXISTS expertise_area     CASCADE;
DROP TABLE IF EXISTS keyword            CASCADE;
DROP TABLE IF EXISTS domain             CASCADE;
DROP TABLE IF EXISTS faculty            CASCADE;
DROP TABLE IF EXISTS department         CASCADE;


-- =============================================================================
-- 1. MASTER (LOOKUP) TABLES
-- =============================================================================

-- Academic departments that faculty belong to.
CREATE TABLE department (
    department_id    INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    department_code  VARCHAR(10)  NOT NULL UNIQUE,          -- e.g. 'CSE'
    department_name  VARCHAR(100) NOT NULL UNIQUE           -- e.g. 'Computer Science and Engineering'
);

-- Broad technical domains shared by faculty and problem statements.
CREATE TABLE domain (
    domain_id    INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    domain_name  VARCHAR(80)  NOT NULL UNIQUE,              -- e.g. 'Artificial Intelligence'
    description  TEXT
);

-- Technical keywords shared by faculty and problem statements.
CREATE TABLE keyword (
    keyword_id    INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    keyword_name  VARCHAR(60)  NOT NULL UNIQUE              -- e.g. 'Python', 'React', 'NLP'
);

-- Named areas of expertise / specialisation (e.g. 'Computer Vision').
CREATE TABLE expertise_area (
    expertise_id    INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    expertise_name  VARCHAR(100)  NOT NULL UNIQUE
);


-- =============================================================================
-- 2. FACULTY AND FACULTY PROFILE TABLES
-- =============================================================================

CREATE TABLE faculty (
    faculty_id     INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_code  VARCHAR(20)   NOT NULL UNIQUE,           -- institute-issued staff ID
    full_name      VARCHAR(100)  NOT NULL,
    email          VARCHAR(120)  NOT NULL UNIQUE,
    phone          VARCHAR(15),
    designation    VARCHAR(30)   NOT NULL
                   CHECK (designation IN ('Professor', 'Associate Professor',
                                          'Assistant Professor', 'Lecturer')),
    department_id  INTEGER       NOT NULL
                   REFERENCES department (department_id) ON DELETE RESTRICT,
    max_teams      SMALLINT      NOT NULL DEFAULT 3
                   CHECK (max_teams BETWEEN 1 AND 10),      -- mentoring capacity
    is_available   BOOLEAN       NOT NULL DEFAULT TRUE
);

-- Faculty  M:N  expertise areas.
CREATE TABLE faculty_expertise (
    faculty_id           INTEGER   NOT NULL
                         REFERENCES faculty (faculty_id) ON DELETE CASCADE,
    expertise_id         INTEGER   NOT NULL
                         REFERENCES expertise_area (expertise_id) ON DELETE RESTRICT,
    years_of_experience  SMALLINT  NOT NULL DEFAULT 0
                         CHECK (years_of_experience BETWEEN 0 AND 60),
    PRIMARY KEY (faculty_id, expertise_id)
);

-- Faculty  M:N  domains.
CREATE TABLE faculty_domain (
    faculty_id  INTEGER  NOT NULL
                REFERENCES faculty (faculty_id) ON DELETE CASCADE,
    domain_id   INTEGER  NOT NULL
                REFERENCES domain (domain_id) ON DELETE RESTRICT,
    is_primary  BOOLEAN  NOT NULL DEFAULT FALSE,
    PRIMARY KEY (faculty_id, domain_id)
);

-- Business rule: a faculty member has at most ONE primary domain.
CREATE UNIQUE INDEX uq_faculty_one_primary_domain
    ON faculty_domain (faculty_id)
    WHERE is_primary;

-- Faculty  M:N  technical keywords.
CREATE TABLE faculty_keyword (
    faculty_id  INTEGER  NOT NULL
                REFERENCES faculty (faculty_id) ON DELETE CASCADE,
    keyword_id  INTEGER  NOT NULL
                REFERENCES keyword (keyword_id) ON DELETE RESTRICT,
    PRIMARY KEY (faculty_id, keyword_id)
);


-- =============================================================================
-- 3. HACKATHON, COORDINATOR AND PROBLEM STATEMENT TABLES
-- =============================================================================

CREATE TABLE hackathon (
    hackathon_id    INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hackathon_name  VARCHAR(100)  NOT NULL,
    edition_year    SMALLINT      NOT NULL CHECK (edition_year BETWEEN 2000 AND 2100),
    start_date      DATE          NOT NULL,
    end_date        DATE          NOT NULL,
    venue           VARCHAR(120),
    CONSTRAINT uq_hackathon_name_year UNIQUE (hackathon_name, edition_year),
    CONSTRAINT chk_hackathon_dates    CHECK (end_date >= start_date)
);

-- Coordinators who manage the platform and make mentor assignments.
CREATE TABLE coordinator (
    coordinator_id  INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name       VARCHAR(100)  NOT NULL,
    email           VARCHAR(120)  NOT NULL UNIQUE,
    phone           VARCHAR(15)
);

CREATE TABLE problem_statement (
    problem_id    INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hackathon_id  INTEGER       NOT NULL
                  REFERENCES hackathon (hackathon_id) ON DELETE CASCADE,
    ps_code       VARCHAR(20)   NOT NULL,                   -- e.g. 'PS-07', unique within a hackathon
    title         VARCHAR(200)  NOT NULL,
    description   TEXT          NOT NULL,
    domain_id     INTEGER       NOT NULL
                  REFERENCES domain (domain_id) ON DELETE RESTRICT,
    difficulty    VARCHAR(10)   NOT NULL
                  CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    CONSTRAINT uq_ps_code_per_hackathon UNIQUE (hackathon_id, ps_code)
);

-- Problem statement  M:N  technical keywords.
CREATE TABLE problem_keyword (
    problem_id  INTEGER  NOT NULL
                REFERENCES problem_statement (problem_id) ON DELETE CASCADE,
    keyword_id  INTEGER  NOT NULL
                REFERENCES keyword (keyword_id) ON DELETE RESTRICT,
    PRIMARY KEY (problem_id, keyword_id)
);


-- =============================================================================
-- 4. TEAM AND MENTOR ASSIGNMENT TABLES
-- =============================================================================

CREATE TABLE team (
    team_id        INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hackathon_id   INTEGER       NOT NULL
                   REFERENCES hackathon (hackathon_id) ON DELETE CASCADE,
    team_name      VARCHAR(80)   NOT NULL,
    team_size      SMALLINT      NOT NULL CHECK (team_size BETWEEN 1 AND 6),
    contact_email  VARCHAR(120)  NOT NULL,
    registered_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_team_name_per_hackathon UNIQUE (hackathon_id, team_name)
);

-- The problem statement a team has selected (at most one per team).
-- Kept separate from team so that team stays in BCNF: if problem_id were a
-- column of team, the dependency problem_id -> hackathon_id would hold inside
-- team with problem_id not being a superkey (see 01_normalization.md, BCNF).
CREATE TABLE team_problem_selection (
    team_id      INTEGER      PRIMARY KEY
                 REFERENCES team (team_id) ON DELETE CASCADE,
    -- Checked at COMMIT (deferred), not immediately: deleting a selected
    -- problem on its own is still refused, but deleting a whole hackathon
    -- works, because by commit time the cascade from hackathon -> team has
    -- also removed the teams' selections. An immediate check (RESTRICT or
    -- NO ACTION) fires part-way through that cascade and blocks it.
    problem_id   INTEGER      NOT NULL
                 REFERENCES problem_statement (problem_id)
                 ON DELETE NO ACTION
                 DEFERRABLE INITIALLY DEFERRED,
    selected_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE mentor_assignment (
    assignment_id   INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id         INTEGER       NOT NULL
                    REFERENCES team (team_id) ON DELETE CASCADE,
    faculty_id      INTEGER       NOT NULL
                    REFERENCES faculty (faculty_id) ON DELETE RESTRICT,
    assigned_by     INTEGER       NOT NULL
                    REFERENCES coordinator (coordinator_id) ON DELETE RESTRICT,
    assigned_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    match_score     NUMERIC(5,2)  CHECK (match_score BETWEEN 0 AND 100),  -- score recorded when assigned
    status          VARCHAR(10)   NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'REPLACED', 'WITHDRAWN')),
    -- The same faculty member is never recorded twice for the same team.
    CONSTRAINT uq_assignment_team_faculty UNIQUE (team_id, faculty_id)
);

-- Business rule: a team has at most ONE active mentor at any time.
CREATE UNIQUE INDEX uq_team_one_active_mentor
    ON mentor_assignment (team_id)
    WHERE status = 'ACTIVE';


-- =============================================================================
-- 5. SUPPORTING INDEXES ON FOREIGN KEYS (used by the matching queries)
-- =============================================================================

CREATE INDEX idx_faculty_department     ON faculty (department_id);
CREATE INDEX idx_faculty_expertise_exp  ON faculty_expertise (expertise_id);
CREATE INDEX idx_faculty_domain_domain  ON faculty_domain (domain_id);
CREATE INDEX idx_faculty_keyword_kw     ON faculty_keyword (keyword_id);
CREATE INDEX idx_problem_domain         ON problem_statement (domain_id);
CREATE INDEX idx_problem_keyword_kw     ON problem_keyword (keyword_id);
CREATE INDEX idx_selection_problem      ON team_problem_selection (problem_id);
CREATE INDEX idx_assignment_faculty     ON mentor_assignment (faculty_id);
CREATE INDEX idx_assignment_coordinator ON mentor_assignment (assigned_by);


-- =============================================================================
-- 6. TRIGGERS FOR INTER-TABLE BUSINESS RULES
-- -----------------------------------------------------------------------------
-- Rule: a team may only select a problem statement from its OWN hackathon.
-- This rule spans team, problem_statement and team_problem_selection, so a
-- single-table constraint cannot express it once the tables are in BCNF.
-- =============================================================================

-- 6a. Check the rule whenever a selection is inserted or changed.
CREATE FUNCTION trg_selection_same_hackathon() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF (SELECT hackathon_id FROM team WHERE team_id = NEW.team_id)
       IS DISTINCT FROM
       (SELECT hackathon_id FROM problem_statement WHERE problem_id = NEW.problem_id)
    THEN
        RAISE EXCEPTION 'Team % cannot select problem %: they belong to different hackathons',
                        NEW.team_id, NEW.problem_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER selection_same_hackathon
    BEFORE INSERT OR UPDATE ON team_problem_selection
    FOR EACH ROW EXECUTE FUNCTION trg_selection_same_hackathon();

-- 6b. A team or problem statement never moves to another hackathon, so the
--     check above cannot be bypassed later by changing hackathon_id.
CREATE FUNCTION trg_hackathon_id_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.hackathon_id IS DISTINCT FROM OLD.hackathon_id THEN
        RAISE EXCEPTION '%.hackathon_id cannot be changed once created', TG_TABLE_NAME;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER team_hackathon_immutable
    BEFORE UPDATE OF hackathon_id ON team
    FOR EACH ROW EXECUTE FUNCTION trg_hackathon_id_immutable();

CREATE TRIGGER problem_hackathon_immutable
    BEFORE UPDATE OF hackathon_id ON problem_statement
    FOR EACH ROW EXECUTE FUNCTION trg_hackathon_id_immutable();

COMMIT;