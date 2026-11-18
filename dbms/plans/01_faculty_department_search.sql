-- P01: Faculty search by department and availability
-- Set department_id to an existing department_id in this database.
\set department_id 1

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, SUMMARY, FORMAT TEXT)
SELECT
    f.faculty_id,
    f.employee_code,
    f.full_name,
    f.email,
    f.designation,
    d.department_code,
    d.department_name,
    f.max_teams
FROM faculty AS f
JOIN department AS d
  ON d.department_id = f.department_id
WHERE f.department_id = :department_id
  AND f.is_available = TRUE
ORDER BY f.full_name;
