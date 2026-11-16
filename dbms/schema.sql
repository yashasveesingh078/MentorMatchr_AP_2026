-- MentorMatchr
-- PostgreSQL schema for the initial hackathon mentor-allocation system.
-- Run this file in a new/empty database.
-- This schema models faculty expertise, hackathon problem statements,
-- teams, and mentor assignment history.

BEGIN;

CREATE TABLE faculty (
    faculty_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    department VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (availability_status IN ('available', 'unavailable')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE domains (
    domain_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    domain_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE keywords (
    keyword_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    keyword_name VARCHAR(100) NOT NULL UNIQUE
);

-- A faculty member may belong to multiple domains; a domain may describe
-- multiple faculty members.
CREATE TABLE faculty_domains (
    faculty_id BIGINT NOT NULL
        REFERENCES faculty(faculty_id) ON DELETE CASCADE,
    domain_id BIGINT NOT NULL
        REFERENCES domains(domain_id) ON DELETE RESTRICT,
    PRIMARY KEY (faculty_id, domain_id)
);

-- A faculty member may have multiple technical keywords.
CREATE TABLE faculty_keywords (
    faculty_id BIGINT NOT NULL
        REFERENCES faculty(faculty_id) ON DELETE CASCADE,
    keyword_id BIGINT NOT NULL
        REFERENCES keywords(keyword_id) ON DELETE RESTRICT,
    PRIMARY KEY (faculty_id, keyword_id)
);

CREATE TABLE hackathons (
    hackathon_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hackathon_name VARCHAR(180) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE problem_statements (
    problem_statement_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hackathon_id BIGINT NOT NULL
        REFERENCES hackathons(hackathon_id) ON DELETE CASCADE,
    external_code VARCHAR(60),
    title VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,
    organization VARCHAR(180),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Supports a composite FK from teams to ensure the selected problem
    -- statement belongs to the same hackathon as the team.
    UNIQUE (problem_statement_id, hackathon_id),
    -- External codes are unique within a hackathon when supplied.
    UNIQUE (hackathon_id, external_code)
);

CREATE TABLE problem_statement_domains (
    problem_statement_id BIGINT NOT NULL
        REFERENCES problem_statements(problem_statement_id) ON DELETE CASCADE,
    domain_id BIGINT NOT NULL
        REFERENCES domains(domain_id) ON DELETE RESTRICT,
    PRIMARY KEY (problem_statement_id, domain_id)
);

CREATE TABLE problem_statement_keywords (
    problem_statement_id BIGINT NOT NULL
        REFERENCES problem_statements(problem_statement_id) ON DELETE CASCADE,
    keyword_id BIGINT NOT NULL
        REFERENCES keywords(keyword_id) ON DELETE RESTRICT,
    PRIMARY KEY (problem_statement_id, keyword_id)
);

CREATE TABLE teams (
    team_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hackathon_id BIGINT NOT NULL
        REFERENCES hackathons(hackathon_id) ON DELETE CASCADE,
    problem_statement_id BIGINT NOT NULL,
    team_name VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'registered'
        CHECK (status IN ('registered', 'active', 'completed', 'withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (hackathon_id, team_name),
    UNIQUE (team_id, hackathon_id),
    FOREIGN KEY (problem_statement_id, hackathon_id)
        REFERENCES problem_statements(problem_statement_id, hackathon_id)
        ON DELETE RESTRICT
);

CREATE TABLE team_members (
    member_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id BIGINT NOT NULL
        REFERENCES teams(team_id) ON DELETE CASCADE,
    member_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    member_role VARCHAR(60),
    UNIQUE (team_id, email)
);

CREATE TABLE mentor_assignments (
    assignment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id BIGINT NOT NULL
        REFERENCES teams(team_id) ON DELETE CASCADE,
    faculty_id BIGINT NOT NULL
        REFERENCES faculty(faculty_id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'ended', 'cancelled'))
);

-- Permit assignment history, but prevent more than one active mentor
-- assignment for the same team at a time.
CREATE UNIQUE INDEX uq_one_active_mentor_per_team
    ON mentor_assignments(team_id)
    WHERE status = 'active';

-- Indexes useful for common lookups and matching joins.
CREATE INDEX idx_faculty_domains_domain ON faculty_domains(domain_id);
CREATE INDEX idx_faculty_keywords_keyword ON faculty_keywords(keyword_id);
CREATE INDEX idx_ps_domains_domain ON problem_statement_domains(domain_id);
CREATE INDEX idx_ps_keywords_keyword ON problem_statement_keywords(keyword_id);
CREATE INDEX idx_teams_hackathon ON teams(hackathon_id);
CREATE INDEX idx_assignments_faculty ON mentor_assignments(faculty_id);

COMMIT;
