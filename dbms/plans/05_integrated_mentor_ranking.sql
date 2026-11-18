-- P05: Integrated mentor ranking for a team with a selected problem.
--
-- This is a read-only shortlist query. It:
--   * requires the team to have selected a problem;
--   * requires the faculty member to be marked available;
--   * counts matched problem/faculty keywords;
--   * checks whether the faculty member has the problem's domain;
--   * counts ACTIVE assignments and excludes faculty at max_teams capacity;
--   * excludes any faculty member already recorded for this team, because
--     uq_assignment_team_faculty prevents a duplicate team/faculty pair.
--
-- The schema does NOT enforce availability or capacity during assignment.
-- Re-check these rules transactionally at the time an assignment is inserted.
--
-- Set team_id to an existing team that has selected a problem.
\set team_id 1

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, SUMMARY, FORMAT TEXT)
WITH target_problem AS (
    SELECT
        t.team_id,
        ps.problem_id,
        ps.domain_id
    FROM team AS t
    JOIN team_problem_selection AS s
      ON s.team_id = t.team_id
    JOIN problem_statement AS ps
      ON ps.problem_id = s.problem_id
    WHERE t.team_id = :team_id
),
active_load AS (
    SELECT
        ma.faculty_id,
        COUNT(*) FILTER (WHERE ma.status = 'ACTIVE') AS active_teams
    FROM mentor_assignment AS ma
    GROUP BY ma.faculty_id
),
keyword_matches AS (
    SELECT
        fk.faculty_id,
        COUNT(DISTINCT fk.keyword_id) AS matched_keywords
    FROM target_problem AS tp
    JOIN problem_keyword AS pk
      ON pk.problem_id = tp.problem_id
    JOIN faculty_keyword AS fk
      ON fk.keyword_id = pk.keyword_id
    GROUP BY fk.faculty_id
)
SELECT
    f.faculty_id,
    f.full_name AS suggested_mentor,
    f.email,
    (fd.faculty_id IS NOT NULL) AS domain_match,
    COALESCE(km.matched_keywords, 0) AS matched_keywords,
    f.max_teams,
    COALESCE(al.active_teams, 0) AS active_teams,
    f.max_teams - COALESCE(al.active_teams, 0) AS remaining_capacity
FROM target_problem AS tp
JOIN faculty AS f
  ON f.is_available = TRUE
LEFT JOIN faculty_domain AS fd
  ON fd.faculty_id = f.faculty_id
 AND fd.domain_id = tp.domain_id
LEFT JOIN keyword_matches AS km
  ON km.faculty_id = f.faculty_id
LEFT JOIN active_load AS al
  ON al.faculty_id = f.faculty_id
WHERE f.max_teams > COALESCE(al.active_teams, 0)
  AND NOT EXISTS (
      SELECT 1
      FROM mentor_assignment AS existing
      WHERE existing.team_id = tp.team_id
        AND existing.faculty_id = f.faculty_id
  )
ORDER BY
    (fd.faculty_id IS NOT NULL) DESC,
    COALESCE(km.matched_keywords, 0) DESC,
    (f.max_teams - COALESCE(al.active_teams, 0)) DESC,
    f.full_name;
