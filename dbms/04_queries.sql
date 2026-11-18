-- =============================================================================
-- MentorMatchr: SQL Queries
-- -----------------------------------------------------------------------------
-- Database : PostgreSQL 15 or newer
-- Schema   : dbms/schema.sql
-- Purpose  : Demonstrate retrieval, joins, aggregation, subqueries, and the
--            mentor-matching operations supported by the MentorMatchr schema.
--
-- IMPORTANT:
--   1. Run dbms/schema.sql first.
--   2. These SELECT queries are read-only and can be run in order.
--   3. Results depend on the data present in your database. Empty result sets
--      are normal when sample data has not yet been inserted.
--   4. INSERT / UPDATE / DELETE examples at the end are commented templates.
--      Replace the sample values/IDs with valid records before running them.
--
-- Run:
--   psql -d mentormatchr -f dbms/04_queries.sql
-- =============================================================================


-- =============================================================================
-- SECTION 1: BASIC RETRIEVAL QUERIES
-- =============================================================================

-- Q1. Display all faculty members.
SELECT
    faculty_id,
    employee_code,
    full_name,
    email,
    phone,
    designation,
    department_id,
    max_teams,
    is_available
FROM faculty
ORDER BY faculty_id;


-- Q2. Display faculty members who are currently available for mentoring.
SELECT faculty_id, employee_code, full_name, email, designation, max_teams
FROM faculty
WHERE is_available = TRUE
ORDER BY full_name;


-- Q3. Display all departments in alphabetical order.
SELECT department_id, department_code, department_name
FROM department
ORDER BY department_name;


-- Q4. Display all hackathons scheduled for the current date or a future date.
SELECT hackathon_id, hackathon_name, edition_year, start_date, end_date, venue
FROM hackathon
WHERE end_date >= CURRENT_DATE
ORDER BY start_date;


-- Q5. Display problem statements classified as Hard.
SELECT problem_id, ps_code, title, difficulty, hackathon_id
FROM problem_statement
WHERE difficulty = 'Hard'
ORDER BY title;


-- Q6. Display the distinct designations available among faculty members.
SELECT DISTINCT designation
FROM faculty
ORDER BY designation;


-- Q7. Search for faculty members whose names contain the word 'an' (case-insensitive).
SELECT faculty_id, full_name, email, designation
FROM faculty
WHERE full_name ILIKE '%an%'
ORDER BY full_name;


-- Q8. Display teams containing more than three members.
SELECT team_id, team_name, team_size, contact_email, hackathon_id
FROM team
WHERE team_size > 3
ORDER BY team_size DESC, team_name;


-- =============================================================================
-- SECTION 2: JOIN QUERIES
-- =============================================================================

-- Q9. Display each faculty member with their department name.
SELECT
    f.faculty_id,
    f.employee_code,
    f.full_name AS faculty_name,
    f.designation,
    d.department_code,
    d.department_name
FROM faculty AS f
INNER JOIN department AS d
    ON d.department_id = f.department_id
ORDER BY d.department_name, f.full_name;


-- Q10. Display faculty members and the technical domains associated with them.
SELECT
    f.faculty_id,
    f.full_name AS faculty_name,
    d.domain_name,
    fd.is_primary
FROM faculty AS f
INNER JOIN faculty_domain AS fd
    ON fd.faculty_id = f.faculty_id
INNER JOIN domain AS d
    ON d.domain_id = fd.domain_id
ORDER BY f.full_name, fd.is_primary DESC, d.domain_name;


-- Q11. Display faculty members and their areas of expertise, including experience.
SELECT
    f.full_name AS faculty_name,
    ea.expertise_name,
    fe.years_of_experience
FROM faculty AS f
INNER JOIN faculty_expertise AS fe
    ON fe.faculty_id = f.faculty_id
INNER JOIN expertise_area AS ea
    ON ea.expertise_id = fe.expertise_id
ORDER BY f.full_name, fe.years_of_experience DESC;


-- Q12. Display every problem statement with its hackathon and domain.
SELECT
    h.hackathon_name,
    h.edition_year,
    ps.ps_code,
    ps.title AS problem_title,
    d.domain_name,
    ps.difficulty
FROM problem_statement AS ps
INNER JOIN hackathon AS h
    ON h.hackathon_id = ps.hackathon_id
INNER JOIN domain AS d
    ON d.domain_id = ps.domain_id
ORDER BY h.edition_year DESC, h.hackathon_name, ps.ps_code;


-- Q13. Display problem statements with their associated keywords.
SELECT
    ps.problem_id,
    ps.ps_code,
    ps.title AS problem_title,
    k.keyword_name
FROM problem_statement AS ps
INNER JOIN problem_keyword AS pk
    ON pk.problem_id = ps.problem_id
INNER JOIN keyword AS k
    ON k.keyword_id = pk.keyword_id
ORDER BY ps.problem_id, k.keyword_name;


-- Q14. Display each team with its hackathon and selected problem, if any.
SELECT
    t.team_id,
    t.team_name,
    h.hackathon_name,
    h.edition_year,
    ps.ps_code,
    ps.title AS selected_problem,
    s.selected_at
FROM team AS t
INNER JOIN hackathon AS h
    ON h.hackathon_id = t.hackathon_id
LEFT JOIN team_problem_selection AS s
    ON s.team_id = t.team_id
LEFT JOIN problem_statement AS ps
    ON ps.problem_id = s.problem_id
ORDER BY h.hackathon_name, t.team_name;


-- Q15. Display mentor assignment details with team, faculty, and coordinator names.
SELECT
    ma.assignment_id,
    t.team_name,
    f.full_name AS mentor_name,
    c.full_name AS assigned_by_coordinator,
    ma.assigned_at,
    ma.match_score,
    ma.status
FROM mentor_assignment AS ma
INNER JOIN team AS t
    ON t.team_id = ma.team_id
INNER JOIN faculty AS f
    ON f.faculty_id = ma.faculty_id
INNER JOIN coordinator AS c
    ON c.coordinator_id = ma.assigned_by
ORDER BY ma.assigned_at DESC;


-- =============================================================================
-- SECTION 3: AGGREGATE FUNCTIONS, GROUP BY AND HAVING
-- =============================================================================

-- Q16. Count the total number of faculty members.
SELECT COUNT(*) AS total_faculty
FROM faculty;


-- Q17. Count the number of faculty members in each department.
SELECT
    d.department_name,
    COUNT(f.faculty_id) AS faculty_count
FROM department AS d
LEFT JOIN faculty AS f
    ON f.department_id = d.department_id
GROUP BY d.department_id, d.department_name
ORDER BY faculty_count DESC, d.department_name;


-- Q18. Count the number of problem statements in each hackathon.
SELECT
    h.hackathon_name,
    h.edition_year,
    COUNT(ps.problem_id) AS problem_count
FROM hackathon AS h
LEFT JOIN problem_statement AS ps
    ON ps.hackathon_id = h.hackathon_id
GROUP BY h.hackathon_id, h.hackathon_name, h.edition_year
ORDER BY h.edition_year DESC, h.hackathon_name;


-- Q19. Show the average mentor match score for each faculty member.
-- Only assignments with a non-NULL match_score contribute to AVG.
SELECT
    f.faculty_id,
    f.full_name AS mentor_name,
    ROUND(AVG(ma.match_score), 2) AS average_match_score,
    COUNT(ma.match_score) AS scored_assignments
FROM faculty AS f
INNER JOIN mentor_assignment AS ma
    ON ma.faculty_id = f.faculty_id
GROUP BY f.faculty_id, f.full_name
ORDER BY average_match_score DESC NULLS LAST;


-- Q20. Display domains that are associated with more than one faculty member.
SELECT
    d.domain_name,
    COUNT(fd.faculty_id) AS faculty_count
FROM domain AS d
INNER JOIN faculty_domain AS fd
    ON fd.domain_id = d.domain_id
GROUP BY d.domain_id, d.domain_name
HAVING COUNT(fd.faculty_id) > 1
ORDER BY faculty_count DESC, d.domain_name;


-- Q21. Find the highest, lowest, and average match score across all assignments.
SELECT
    MAX(match_score) AS highest_match_score,
    MIN(match_score) AS lowest_match_score,
    ROUND(AVG(match_score), 2) AS average_match_score
FROM mentor_assignment;


-- Q22. Count teams in each hackathon.
SELECT
    h.hackathon_name,
    h.edition_year,
    COUNT(t.team_id) AS total_teams
FROM hackathon AS h
LEFT JOIN team AS t
    ON t.hackathon_id = h.hackathon_id
GROUP BY h.hackathon_id, h.hackathon_name, h.edition_year
ORDER BY total_teams DESC, h.hackathon_name;


-- =============================================================================
-- SECTION 4: SUBQUERIES
-- =============================================================================

-- Q23. Find faculty members whose max_teams value is greater than the
--      average mentoring capacity of all faculty members.
SELECT faculty_id, full_name, max_teams
FROM faculty
WHERE max_teams > (
    SELECT AVG(max_teams)
    FROM faculty
)
ORDER BY max_teams DESC;


-- Q24. Find problem statements whose difficulty is the same as the
--      difficulty of at least one problem in the 'Hard' category.
--      This demonstrates IN with a subquery.
SELECT problem_id, ps_code, title, difficulty
FROM problem_statement
WHERE difficulty IN (
    SELECT DISTINCT difficulty
    FROM problem_statement
    WHERE difficulty = 'Hard'
)
ORDER BY title;


-- Q25. Find faculty members who have at least one active mentor assignment.
SELECT faculty_id, full_name, email
FROM faculty AS f
WHERE EXISTS (
    SELECT 1
    FROM mentor_assignment AS ma
    WHERE ma.faculty_id = f.faculty_id
      AND ma.status = 'ACTIVE'
)
ORDER BY full_name;


-- Q26. Find teams that have not selected a problem statement.
SELECT team_id, team_name, hackathon_id
FROM team AS t
WHERE NOT EXISTS (
    SELECT 1
    FROM team_problem_selection AS s
    WHERE s.team_id = t.team_id
)
ORDER BY team_name;


-- Q27. Find faculty members who have no mentor assignments recorded.
SELECT faculty_id, full_name, email
FROM faculty AS f
WHERE NOT EXISTS (
    SELECT 1
    FROM mentor_assignment AS ma
    WHERE ma.faculty_id = f.faculty_id
)
ORDER BY full_name;


-- =============================================================================
-- SECTION 5: MENTORMATCHR-SPECIFIC MATCHING AND WORKLOAD QUERIES
-- =============================================================================

-- Q28. Find available faculty members whose domain matches a problem statement's
--      domain. Supply the required problem ID in the WHERE clause.
--      Replace 1 with an existing problem_id before running.
SELECT DISTINCT
    f.faculty_id,
    f.full_name AS suggested_mentor,
    f.email,
    d.domain_name,
    f.max_teams
FROM problem_statement AS ps
INNER JOIN faculty_domain AS fd
    ON fd.domain_id = ps.domain_id
INNER JOIN faculty AS f
    ON f.faculty_id = fd.faculty_id
INNER JOIN domain AS d
    ON d.domain_id = ps.domain_id
WHERE ps.problem_id = 1
  AND f.is_available = TRUE
ORDER BY f.full_name;


-- Q29. Find available faculty members who share at least one keyword with a
--      selected problem statement. Replace 1 with an existing problem_id.
SELECT
    f.faculty_id,
    f.full_name AS suggested_mentor,
    k.keyword_name AS matching_keyword
FROM problem_statement AS ps
INNER JOIN problem_keyword AS pk
    ON pk.problem_id = ps.problem_id
INNER JOIN faculty_keyword AS fk
    ON fk.keyword_id = pk.keyword_id
INNER JOIN faculty AS f
    ON f.faculty_id = fk.faculty_id
INNER JOIN keyword AS k
    ON k.keyword_id = pk.keyword_id
WHERE ps.problem_id = 1
  AND f.is_available = TRUE
ORDER BY f.full_name, k.keyword_name;


-- Q30. Calculate the number of currently active teams assigned to each faculty
--      member and compare it with their mentoring capacity.
SELECT
    f.faculty_id,
    f.full_name AS mentor_name,
    f.max_teams,
    COUNT(ma.assignment_id) FILTER (WHERE ma.status = 'ACTIVE') AS active_teams,
    f.max_teams
      - COUNT(ma.assignment_id) FILTER (WHERE ma.status = 'ACTIVE') AS remaining_capacity
FROM faculty AS f
LEFT JOIN mentor_assignment AS ma
    ON ma.faculty_id = f.faculty_id
GROUP BY f.faculty_id, f.full_name, f.max_teams
ORDER BY remaining_capacity DESC, f.full_name;


-- Q31. Find available faculty members who have not reached their mentoring
--      capacity. This is a useful shortlist before assigning a new team.
SELECT
    f.faculty_id,
    f.full_name,
    f.max_teams,
    COUNT(ma.assignment_id) FILTER (WHERE ma.status = 'ACTIVE') AS active_teams
FROM faculty AS f
LEFT JOIN mentor_assignment AS ma
    ON ma.faculty_id = f.faculty_id
WHERE f.is_available = TRUE
GROUP BY f.faculty_id, f.full_name, f.max_teams
HAVING COUNT(ma.assignment_id) FILTER (WHERE ma.status = 'ACTIVE') < f.max_teams
ORDER BY active_teams, f.full_name;


-- Q32. Display the complete assignment history for each team, including
--      replaced and withdrawn mentors.
SELECT
    t.team_name,
    f.full_name AS mentor_name,
    ma.status,
    ma.assigned_at,
    ma.match_score,
    c.full_name AS assigned_by
FROM mentor_assignment AS ma
INNER JOIN team AS t
    ON t.team_id = ma.team_id
INNER JOIN faculty AS f
    ON f.faculty_id = ma.faculty_id
INNER JOIN coordinator AS c
    ON c.coordinator_id = ma.assigned_by
ORDER BY t.team_name, ma.assigned_at;


-- =============================================================================
-- SECTION 6: DATA MANIPULATION LANGUAGE (DML) EXAMPLES
-- -----------------------------------------------------------------------------
-- The following are templates, not automatically executed queries.
-- Uncomment only after replacing the values with valid project data.
-- Always verify the WHERE condition before running UPDATE or DELETE.
-- =============================================================================

-- Q33. INSERT: Add a new keyword to the shared keyword list.
-- INSERT INTO keyword (keyword_name)
-- VALUES ('Python');


-- Q34. UPDATE: Mark a faculty member as unavailable.
-- Replace 1 with the required faculty_id.
-- UPDATE faculty
-- SET is_available = FALSE
-- WHERE faculty_id = 1;


-- Q35. UPDATE: Change a team's contact email.
-- Replace 1 and the email with valid project values.
-- UPDATE team
-- SET contact_email = 'new-team-contact@example.com'
-- WHERE team_id = 1;


-- Q36. DELETE: Remove a faculty-keyword association.
-- This deletes only the association, not the faculty member or keyword.
-- Replace both IDs with an existing faculty_id and keyword_id.
-- DELETE FROM faculty_keyword
-- WHERE faculty_id = 1
--   AND keyword_id = 1;


-- =============================================================================
-- END OF MentorMatchr SQL QUERIES
-- =============================================================================
