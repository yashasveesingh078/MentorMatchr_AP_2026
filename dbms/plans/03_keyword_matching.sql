-- P03: Faculty/problem keyword overlap
-- Set problem_id to an existing problem_statement.problem_id.
\set problem_id 1

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, SUMMARY, FORMAT TEXT)
SELECT
    f.faculty_id,
    f.full_name AS suggested_mentor,
    COUNT(DISTINCT fk.keyword_id) AS matched_keyword_count,
    STRING_AGG(DISTINCT k.keyword_name, ', ' ORDER BY k.keyword_name)
        AS matching_keywords
FROM problem_keyword AS pk
JOIN faculty_keyword AS fk
  ON fk.keyword_id = pk.keyword_id
JOIN faculty AS f
  ON f.faculty_id = fk.faculty_id
JOIN keyword AS k
  ON k.keyword_id = pk.keyword_id
WHERE pk.problem_id = :problem_id
  AND f.is_available = TRUE
GROUP BY f.faculty_id, f.full_name
ORDER BY matched_keyword_count DESC, f.full_name;
