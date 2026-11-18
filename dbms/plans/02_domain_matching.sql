-- P02: Domain-based faculty matching
-- Set problem_id to an existing problem_statement.problem_id.
\set problem_id 1

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, SUMMARY, FORMAT TEXT)
SELECT
    f.faculty_id,
    f.full_name AS suggested_mentor,
    f.email,
    d.domain_name,
    f.max_teams
FROM problem_statement AS ps
JOIN faculty_domain AS fd
  ON fd.domain_id = ps.domain_id
JOIN faculty AS f
  ON f.faculty_id = fd.faculty_id
JOIN domain AS d
  ON d.domain_id = ps.domain_id
WHERE ps.problem_id = :problem_id
  AND f.is_available = TRUE
ORDER BY f.full_name;
