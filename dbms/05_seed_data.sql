-- =============================================================================
-- MentorMatchr: Seed Data
-- -----------------------------------------------------------------------------
-- Database : PostgreSQL 15 or newer
-- Schema   : dbms/03_schema.sql
-- Purpose  : Populates realistic academic hackathon data for CodeFest 2026,
--            including faculty, departments, domains, expertise areas, keywords,
--            problem statements, teams, selections, and assignments.
--
-- Run:
--   psql -d mentormatchr -f dbms/05_seed_data.sql
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. MASTER TABLES
-- -----------------------------------------------------------------------------

INSERT INTO department (department_code, department_name) VALUES
    ('CSE', 'Computer Science and Engineering'),
    ('ECE', 'Electronics and Communication Engineering'),
    ('BME', 'Biomedical Engineering'),
    ('IT', 'Information Technology'),
    ('MECH', 'Mechanical and Mechatronics Engineering')
ON CONFLICT (department_code) DO NOTHING;

INSERT INTO domain (domain_name, description) VALUES
    ('AI & Machine Learning', 'Artificial Intelligence, Deep Learning, Computer Vision, and NLP'),
    ('Healthcare Tech', 'Biomedical devices, clinical informatics, and health diagnostics'),
    ('Cybersecurity', 'Network security, applied cryptography, and threat analysis'),
    ('Web & Cloud Systems', 'Scalable web architecture, distributed systems, and microservices'),
    ('FinTech & Blockchain', 'Decentralized ledgers, smart contracts, and computational finance'),
    ('IoT & Smart Systems', 'Embedded hardware, sensor telemetry, and edge intelligence'),
    ('Data Science & Analytics', 'Big data engineering, predictive modeling, and statistical analytics')
ON CONFLICT (domain_name) DO NOTHING;

INSERT INTO keyword (keyword_name) VALUES
    ('Python'),
    ('PyTorch'),
    ('TensorFlow'),
    ('OpenCV'),
    ('Transformers'),
    ('Medical Imaging'),
    ('DICOM'),
    ('Bio-Signals'),
    ('React'),
    ('Node.js'),
    ('PostgreSQL'),
    ('FastAPI'),
    ('Solidity'),
    ('Smart Contracts'),
    ('Zero-Knowledge'),
    ('Docker'),
    ('Kubernetes'),
    ('Edge AI'),
    ('MQTT'),
    ('Sensor Networks'),
    ('Rust'),
    ('Next.js'),
    ('Bioinformatics')
ON CONFLICT (keyword_name) DO NOTHING;

INSERT INTO expertise_area (expertise_name) VALUES
    ('Computer Vision'),
    ('Deep Learning'),
    ('Medical Image Processing'),
    ('Bio-Signals Analysis'),
    ('Full-Stack Web Development'),
    ('Cloud Architecture'),
    ('Blockchain & Cryptography'),
    ('Network Security & Forensics'),
    ('Embedded Edge Computing'),
    ('Natural Language Processing')
ON CONFLICT (expertise_name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. FACULTY & PROFILES
-- -----------------------------------------------------------------------------

INSERT INTO faculty (employee_code, full_name, email, phone, designation, department_id, max_teams, is_available) VALUES
    ('FAC101', 'Dr. Arun Sharma', 'arun.sharma@inst.edu', '+91 98765 11001', 'Professor', 1, 2, TRUE),
    ('FAC102', 'Dr. Sanjay Bhattacharya', 'sanjay.b@inst.edu', '+91 98765 11002', 'Associate Professor', 3, 2, TRUE),
    ('FAC103', 'Dr. Radhika Sharma', 'rsharma@inst.edu', '+91 98765 11003', 'Professor', 1, 3, TRUE),
    ('FAC104', 'Dr. Karthik Iyer', 'kiyer@inst.edu', '+91 98765 11004', 'Associate Professor', 4, 3, TRUE),
    ('FAC105', 'Dr. Meera Nambiar', 'meera.n@inst.edu', '+91 98765 11005', 'Associate Professor', 2, 3, TRUE),
    ('FAC106', 'Dr. Vikramaditya Sen', 'vsen@inst.edu', '+91 98765 11006', 'Assistant Professor', 2, 2, TRUE),
    ('FAC107', 'Dr. Ananya Mukherjee', 'ananya.m@inst.edu', '+91 98765 11007', 'Assistant Professor', 1, 3, TRUE)
ON CONFLICT (employee_code) DO NOTHING;

-- Faculty Domains (is_primary enforced: at most 1 primary per faculty)
INSERT INTO faculty_domain (faculty_id, domain_id, is_primary) VALUES
    (1, 1, TRUE),   -- Dr. Arun Sharma: Primary AI & Machine Learning
    (1, 2, FALSE),  -- Dr. Arun Sharma: Secondary Healthcare Tech
    (2, 2, TRUE),   -- Dr. Sanjay Bhattacharya: Primary Healthcare Tech
    (2, 1, FALSE),  -- Dr. Sanjay Bhattacharya: Secondary AI & Machine Learning
    (3, 1, TRUE),   -- Dr. Radhika Sharma: Primary AI & Machine Learning
    (3, 7, FALSE),  -- Dr. Radhika Sharma: Secondary Data Science
    (4, 4, TRUE),   -- Dr. Karthik Iyer: Primary Web & Cloud
    (4, 5, FALSE),  -- Dr. Karthik Iyer: Secondary FinTech
    (5, 3, TRUE),   -- Dr. Meera Nambiar: Primary Cybersecurity
    (5, 5, FALSE),  -- Dr. Meera Nambiar: Secondary FinTech
    (6, 6, TRUE),   -- Dr. Vikramaditya Sen: Primary IoT
    (6, 1, FALSE),  -- Dr. Vikramaditya Sen: Secondary AI & Machine Learning
    (7, 7, TRUE),   -- Dr. Ananya Mukherjee: Primary Data Science
    (7, 2, FALSE)   -- Dr. Ananya Mukherjee: Secondary Healthcare Tech
ON CONFLICT (faculty_id, domain_id) DO NOTHING;

-- Faculty Expertise Areas (with years of experience)
INSERT INTO faculty_expertise (faculty_id, expertise_id, years_of_experience) VALUES
    (1, 1, 8),  -- Dr. Arun: Computer Vision (8 yrs)
    (1, 2, 6),  -- Dr. Arun: Deep Learning (6 yrs)
    (1, 3, 5),  -- Dr. Arun: Medical Image Processing (5 yrs)
    (2, 3, 10), -- Dr. Sanjay: Medical Image Processing (10 yrs)
    (2, 4, 7),  -- Dr. Sanjay: Bio-Signals Analysis (7 yrs)
    (3, 2, 9),  -- Dr. Radhika: Deep Learning (9 yrs)
    (3, 10, 6), -- Dr. Radhika: NLP (6 yrs)
    (4, 5, 8),  -- Dr. Karthik: Full-Stack (8 yrs)
    (4, 6, 5),  -- Dr. Karthik: Cloud Architecture (5 yrs)
    (5, 7, 7),  -- Dr. Meera: Blockchain & Crypto (7 yrs)
    (5, 8, 5),  -- Dr. Meera: Network Security (5 yrs)
    (6, 9, 6),  -- Dr. Vikramaditya: Embedded Edge (6 yrs)
    (6, 1, 4),  -- Dr. Vikramaditya: Computer Vision (4 yrs)
    (7, 2, 5),  -- Dr. Ananya: Deep Learning (5 yrs)
    (7, 4, 4)   -- Dr. Ananya: Bio-Signals (4 yrs)
ON CONFLICT (faculty_id, expertise_id) DO NOTHING;

-- Faculty Technical Keywords
INSERT INTO faculty_keyword (faculty_id, keyword_id) VALUES
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7),     -- Dr. Arun: Python, PyTorch, TF, OpenCV, Transformers, Medical Imaging, DICOM
    (2, 6), (2, 7), (2, 8), (2, 1), (2, 23),                   -- Dr. Sanjay: Medical Imaging, DICOM, Bio-Signals, Python, Bioinformatics
    (3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 11),           -- Dr. Radhika: Python, PyTorch, TF, OpenCV, Transformers, PostgreSQL
    (4, 9), (4, 10), (4, 11), (4, 12), (4, 16), (4, 17), (4, 22), -- Dr. Karthik: React, Node, Postgres, FastAPI, Docker, K8s, Next.js
    (5, 13), (5, 14), (5, 15), (5, 21), (5, 1), (5, 11),        -- Dr. Meera: Solidity, Smart Contracts, ZK, Rust, Python, Postgres
    (6, 18), (6, 19), (6, 20), (6, 1), (6, 4), (6, 16),        -- Dr. Vikramaditya: Edge AI, MQTT, Sensor Networks, Python, OpenCV, Docker
    (7, 1), (7, 2), (7, 6), (7, 8), (7, 11), (7, 23)           -- Dr. Ananya: Python, PyTorch, Medical Imaging, Bio-Signals, Postgres, Bioinformatics
ON CONFLICT (faculty_id, keyword_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. HACKATHON, COORDINATORS, AND PROBLEM STATEMENTS
-- -----------------------------------------------------------------------------

INSERT INTO hackathon (hackathon_name, edition_year, start_date, end_date, venue) VALUES
    ('CodeFest', 2026, '2026-11-20', '2026-11-22', 'Campus Innovation Pavilion & Main Auditorium')
ON CONFLICT (hackathon_name, edition_year) DO NOTHING;

INSERT INTO coordinator (full_name, email, phone) VALUES
    ('Priya Nair', 'p.nair@codefest.edu', '+91 98765 43210'),
    ('Amitav Sen', 'a.sen@codefest.edu', '+91 98765 43211')
ON CONFLICT (email) DO NOTHING;

INSERT INTO problem_statement (hackathon_id, ps_code, title, description, domain_id, difficulty) VALUES
    (1, 'PS-04', 'Automated Medical Imaging Diagnostics Using Transformer Ensembles', 'Develop high-throughput vision transformer pipelines for early lesion detection in multi-slice DICOM scans.', 1, 'Hard'),
    (1, 'PS-07', 'SecureLedger: Decentralized Settlement with Zero-Knowledge Auditing', 'Design smart contracts and ZK proof verifiers for cross-institution asset reconciliation without privacy leakage.', 5, 'Hard'),
    (1, 'PS-02', 'AgriSense: Autonomous Crop Stress Detection via Edge-AI Drone Vision', 'Deploy lightweight computer vision models onto edge drone companion computers for real-time crop moisture and pest stress analysis.', 6, 'Medium'),
    (1, 'PS-05', 'CampusPulse: Real-Time Event Portal & Dynamic Micro-Credential Engine', 'Scalable web portal for hackathon submissions, live scoring broadcasts, and cryptographically verified digital credentials.', 4, 'Medium'),
    (1, 'PS-09', 'BioShield: Multi-Modal Sepsis Warning Engine via Sensor Telemetry', 'Continuous patient vital sign and bio-signal processing for early shock prediction in intensive care units.', 2, 'Hard')
ON CONFLICT (hackathon_id, ps_code) DO NOTHING;

-- Problem Statement Keywords
INSERT INTO problem_keyword (problem_id, keyword_id) VALUES
    (1, 1), (1, 2), (1, 5), (1, 6), (1, 7),                    -- PS-04: Python, PyTorch, Transformers, Medical Imaging, DICOM
    (2, 13), (2, 14), (2, 15), (2, 21), (2, 11),               -- PS-07: Solidity, Smart Contracts, Zero-Knowledge, Rust, PostgreSQL
    (3, 1), (3, 4), (3, 18), (3, 19), (3, 20),                 -- PS-02: Python, OpenCV, Edge AI, MQTT, Sensor Networks
    (4, 9), (4, 10), (4, 11), (4, 12), (4, 16), (4, 22),       -- PS-05: React, Node.js, PostgreSQL, FastAPI, Docker, Next.js
    (5, 1), (5, 2), (5, 6), (5, 7), (5, 8), (5, 23)            -- PS-09: Python, PyTorch, Medical Imaging, DICOM, Bio-Signals, Bioinformatics
ON CONFLICT (problem_id, keyword_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. TEAMS, SELECTIONS, AND ASSIGNMENTS
-- -----------------------------------------------------------------------------

INSERT INTO team (hackathon_id, team_name, team_size, contact_email) VALUES
    (1, 'CareSync AI', 4, 'lead@caresync.ai'),
    (1, 'SecureLedger', 4, 'team@secureledger.dev'),
    (1, 'AgriSense IoT', 3, 'contact@agrisense.io'),
    (1, 'ByteBuilders', 4, 'bytebuilders@codefest.edu'),
    (1, 'NeuralNomads', 4, 'nomads@codefest.edu')
ON CONFLICT (hackathon_id, team_name) DO NOTHING;

INSERT INTO team_problem_selection (team_id, problem_id) VALUES
    (1, 1), -- CareSync AI -> PS-04
    (2, 2), -- SecureLedger -> PS-07
    (3, 3), -- AgriSense IoT -> PS-02
    (4, 4), -- ByteBuilders -> PS-05
    (5, 1)  -- NeuralNomads -> PS-04
ON CONFLICT (team_id) DO NOTHING;

-- Initial Assignment Seed (to demonstrate audit trail & capacity tracking)
-- Team 4 (ByteBuilders) assigned to Dr. Karthik Iyer
INSERT INTO mentor_assignment (team_id, faculty_id, assigned_by, match_score, status) VALUES
    (4, 4, 1, 91.00, 'ACTIVE')
ON CONFLICT (team_id, faculty_id) DO NOTHING;

COMMIT;
