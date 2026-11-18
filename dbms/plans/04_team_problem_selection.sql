-- P04: Team's selected problem, hackathon and domain
-- Set team_id to an existing team.team_id.
\set team_id 1

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, SUMMARY, FORMAT TEXT)
SELECT
    t.team_id,
    t.team_name,
    h.hackathon_name,
    h.edition_year,
    ps.problem_id,
    ps.ps_code,
    ps.title AS problem_title,
    d.domain_name,
    s.selected_at
FROM team AS t
JOIN hackathon AS h
  ON h.hackathon_id = t.hackathon_id
LEFT JOIN team_problem_selection AS s
  ON s.team_id = t.team_id
LEFT JOIN problem_statement AS ps
  ON ps.problem_id = s.problem_id
LEFT JOIN domain AS d
  ON d.domain_id = ps.domain_id
WHERE t.team_id = :team_id;
