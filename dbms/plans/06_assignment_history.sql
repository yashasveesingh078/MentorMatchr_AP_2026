-- P06: Complete mentor-assignment history for one team
-- Set team_id to an existing team.team_id.
\set team_id 1

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, SUMMARY, FORMAT TEXT)
SELECT
    t.team_id,
    t.team_name,
    f.faculty_id,
    f.full_name AS mentor_name,
    ma.status,
    ma.assigned_at,
    ma.match_score,
    c.coordinator_id,
    c.full_name AS assigned_by
FROM mentor_assignment AS ma
JOIN team AS t
  ON t.team_id = ma.team_id
JOIN faculty AS f
  ON f.faculty_id = ma.faculty_id
JOIN coordinator AS c
  ON c.coordinator_id = ma.assigned_by
WHERE ma.team_id = :team_id
ORDER BY ma.assigned_at DESC, ma.assignment_id DESC;
